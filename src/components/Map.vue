<script setup>
'use strict';

/**
 * @author Boris Steiner
 */

// import { RUN1DATA } from './coords.js';
// import { RUN2DATA } from './coords.js';
// import {WRUN1DATA} from './coords.js';
// import {WRUN2DATA} from './coords.js';
// import {WRUN3DATA} from './coords.js';
import { FLIGHT1DATA, FLIGHT2DATA, MAPS1DATA, MAPS2DATA, MAPS3DATA } from './coords.js';
const dataSets = {
  FLIGHT1DATA,
  FLIGHT2DATA,
  MAPS1DATA,
  MAPS2DATA,
  MAPS3DATA
};

import 'mapbox-gl/dist/mapbox-gl.css';

import mapboxgl from 'mapbox-gl';
//import LegendControl from 'mapboxgl-legend';
//import '../../node_modules/mapboxgl-legend/dist/style.css';

import chroma from 'chroma-js';
import {onMounted, watch, onBeforeMount, ref} from "vue";

import create3dModelLayer from "./3dModelLayer.js";
import {state, stateKeys} from './showModelState.js';

document.addEventListener('DOMContentLoaded', async function () {
  // Dynamically load the windowToggle3d.js script
  await import('./windowToggle3d.js');
});

const pathData = [
  /*{
    name: 'maps1',
    coordinates: MAPS1DATA,
    timestamp: parseDateTimeString('2023-5-20 15:00:00'), 
  },
  {
    name: 'maps2',
    coordinates: MAPS2DATA,
    timestamp: parseDateTimeString('2023-10-10 09:00:00'),
  },
  {
    name: 'maps3',
    coordinates: MAPS3DATA,
    timestamp: parseDateTimeString('2023-2-24 08:30:00'),
  },
  {
    name: 'FLIGHT1DATA',
    coordinates: FLIGHT1DATA,
    timestamp: parseDateTimeString('2023-11-13 22:00:00'),
  },
  {
    name: 'FLIGHT2DATA',
    coordinates: FLIGHT2DATA,
    timestamp: parseDateTimeString('2023-10-24 10:00:00'),
  }*/
];

let isTerrainEnabled = ref(false);

function toggleTerrain() {
  isTerrainEnabled.value = !isTerrainEnabled.value;
}

let isSatelliteView = ref(false);

const toggleMapView = () => {
  isSatelliteView.value = !isSatelliteView.value;
}

const loadCsvFile = async (filePath) => {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to load CSV file: ${response.statusText}`);
    }

    const csvText = await response.text();

    const csvRows = csvText.split('\n');
    const headers = csvRows[0].split(',');

    const csvData = csvRows.slice(1)
      .map(row => row.split(','))
      .filter(rowValues => {
        const latitude = parseFloat(rowValues[headers.indexOf('latitude')]);
        const longitude = parseFloat(rowValues[headers.indexOf('longitude')]);
        return !isNaN(latitude) && !isNaN(longitude);
      })
      .map(rowValues => {
        return headers.reduce((acc, header, index) => {
          acc[header] = rowValues[index];
          return acc;
        }, {});
      });

    return csvData;
  } catch (error) {
    throw new Error(`Error loading CSV file: ${error.message}`);
  }
}

function parseDateTimeString(dateTimeString) {
  const [datePart, timePart] = dateTimeString.split(' ');

  const [day, month, year] = datePart.split('-').map(Number);
  const [hours, minutes, seconds] = timePart.split(':').map(Number);

  // Months are 0-indexed in JavaScript Date objects, so subtract 1 from the month
  const jsMonth = month - 1;

  const parsedDate = new Date(year, jsMonth, day, hours, minutes, seconds);

  return parsedDate;
}

async function loadAnnotationsFile(pathName) {
  try {
    const response = await fetch(`src/components/data/annotations_${pathName.split('_').pop()}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load annotations file: ${response.statusText}`);
    }

    const annotationsData = await response.json();
    return annotationsData;
  } catch (error) {
    throw new Error(`Error loading annotations file: ${error.message}`);
  }
}

// Function to get annotations data for a specific path
async function getAnnotationsData(pathId) {
  const annotationsFileName = `annotations_${pathId.split('_').pop()}.json`;
  const annotationsFilePath = `src/components/data/${annotationsFileName}`;

  // Check if the file exists before trying to fetch and parse
  if (await checkFileExists(annotationsFilePath)) {
    try {
      const response = await fetch(annotationsFilePath);
      if (!response.ok) {
        throw new Error(`Failed to load annotations data for ${pathId}: ${response.statusText}`);
      }

      const annotationsData = await response.json();
      return annotationsData;
    } catch (error) {
      console.error(`Error loading annotations data for ${pathId}:`, error);
      return null;
    }
  } else {
    console.warn(`Annotations data file not found for ${pathId}`);
    return null;
  }
}

// Function to check if a file exists
async function checkFileExists(url) {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
    });

    return response.status === 200;
  } catch (error) {
    console.error('An error occurred while checking if the file exists:', error);
    return false;
  }
}

let markers = {};

// Add markers for the specified path
async function addMarkers(map, pathId) {
  // Get annotations data for the path
  const annotationsData = await getAnnotationsData(pathId);

  // Check if annotationsData is null or undefined
  if (!annotationsData) {
    console.warn(`Annotations data not available for ${pathId}`);
    return;
  }

  // Check if annotations array is present and has at least one element
  if (annotationsData.annotations && annotationsData.annotations.length > 0) {
    // Iterate through each annotation object
    annotationsData.annotations.forEach((annotation, index) => {
      // Check if lonlat array is present and not empty
      if (annotation.states[0].lonlat && annotation.states[0].lonlat.length > 0) {
        const lonLat = annotation.states[0].lonlat[0];
        const marker = new mapboxgl.Marker()
          .setLngLat([lonLat.x, lonLat.y])
          .addTo(map)
          .setPopup(new mapboxgl.Popup().setHTML(`Class: ${annotation.className}`));;

        // Add the marker to the markers object using a unique key based on the index
        markers[`${pathId}_marker_${index}`] = marker;

        // Show popup on marker mouseenter
        marker.getElement().addEventListener('mouseenter', () => {
          marker.togglePopup();
        });

        // Hide popup on marker mouseleave
        marker.getElement().addEventListener('mouseleave', () => {
          marker.togglePopup();
        });
      } else {
        console.warn(`Missing or empty lonlat array in annotation ${index} for ${pathId}`);
      }
    });
  } else {
    console.warn(`Annotations array not present or empty for ${pathId}`);
  }
}

// Function to remove markers for a specific path
function removeMarkers() {
  Object.keys(markers).forEach((markerKey) => {
    markers[markerKey].remove();
  });

  // Clear the markers object
  markers = {};
}

onMounted(async () => {

// allData = allData.concat(RUN1DATA, RUN2DATA, MAPS1DATA, MAPS2DATA, MAPS3DATA, FLIGHT1DATA);
// allData = allData.concat(WRUN1DATA, WRUN2DATA);

// Boris's token
mapboxgl.accessToken = 'pk.eyJ1IjoidGhlb2xjaGkiLCJhIjoiY2xudzRicjhyMDZpeDJ0bzZoMmp5MHFqZSJ9.hsNF-iGKdszPYr1b0TXTcA';

const map = new mapboxgl.Map({
  container: 'map',
  // style: 'mapbox://styles/theolchi/clnw50m2r003z01pg94do2adn', // satellite
  // style: 'mapbox://styles/theolchi/clorauxl600nc01qy4goi6wes', // streets
  // style: 'mapbox://styles/mapbox/satellite-streets-v12', // no idea
  style: 'mapbox://styles/mapbox/outdoors-v11', // different streets
  //center: [calculateMeanValues(pathData[0].coordinates)[0], calculateMeanValues(pathData[0].coordinates)[1]],
  center: [14.5118463798673, 48.3680606170131],
  zoom: 15,
  antialias: true // create the gl context with MSAA antialiasing, so custom layers are antialiased
});

//const legend = new LegendControl();
//map.addControl(legend, 'bottom-left');

let usedColors = new Set();

function getRandomUniqueHexColorWithInterval(interval) {
  let hue;
  do {
    hue = Math.floor(Math.random() * 360);
  } while (usedColors.has(hue));

  usedColors.add(hue);

  // Adjust hue to ensure visual distinction
  const adjustedHue = (hue + interval) % 360;
  const adjustedColor = chroma.hsl(adjustedHue, 1, 0.5).hex();

  return adjustedColor;
}

function hslToRgb(hslColor) {
  let [h, s, l] = hslColor.match(/\d+/g).map(Number);
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;

  let r, g, b;

  if (0 <= h && h < 60) {
    [r, g, b] = [c, x, 0];
  } else if (60 <= h && h < 120) {
    [r, g, b] = [x, c, 0];
  } else if (120 <= h && h < 180) {
    [r, g, b] = [0, c, x];
  } else if (180 <= h && h < 240) {
    [r, g, b] = [0, x, c];
  } else if (240 <= h && h < 300) {
    [r, g, b] = [x, 0, c];
  } else {
    [r, g, b] = [c, 0, x];
  }

  r = Math.floor((r + m) * 255);
  g = Math.floor((g + m) * 255);
  b = Math.floor((b + m) * 255);

  return [r, g, b];
}

function rgbToHex(rgbColor) {
  return `#${rgbColor.map(component => component.toString(16).padStart(2, '0')).join('')}`;
}

let currentlyVisiblePath = null;

let endMarker = null;
/*let randomMarkers = [];

function generateRandomCoordinatesNearPath(coords) {
  const randomCoordinates = [];
  for (let i = 0; i < 20; i++) {
    const randomIndex = Math.floor(Math.random() * (coords.length - 1));
    const randomOffset = 0.001; // Adjust this value for a smaller offset
    const randomCoord = [
      coords[randomIndex][0] + (Math.random() - 0.5) * randomOffset,
      coords[randomIndex][1] + (Math.random() - 0.5) * randomOffset,
    ];
    randomCoordinates.push(randomCoord);
  }
  return randomCoordinates;
}

function addRandomMarkers(coords) {
  randomMarkers = [];
  const randomCoordinates = generateRandomCoordinatesNearPath(coords);
  randomCoordinates.forEach((coord, index) => {
    const marker = new mapboxgl.Marker({color: 'blue'})
        .setLngLat(coord)
        .addTo(map)
        .setPopup(new mapboxgl.Popup().setHTML(index % 2 === 0 ? 'Deer' : 'Goat'));

    // Show popup on marker mouseenter
    marker.getElement().addEventListener('mouseenter', () => {
      marker.togglePopup();
    });

    // Hide popup on marker mouseleave
    marker.getElement().addEventListener('mouseleave', () => {
      marker.togglePopup();
    });

    randomMarkers.push(marker);
  });
}

function removeRandomMarkers() {
  randomMarkers.forEach(marker => marker.remove());
  randomMarkers = [];
}*/

async function addPath(map, id, coords) {
  // Generate a unique color for the path
  let pathColor = getRandomUniqueHexColorWithInterval(50);

  // Add a marker at the beginning of the path
  const startMarker = new mapboxgl.Marker().setLngLat(coords[0]).addTo(map);

  // Add a marker at the end of the path (initially hidden)
  endMarker = new mapboxgl.Marker({color: 'red'}).setLngLat(coords[coords.length - 1]).addTo(map);
  endMarker.getElement().style.display = 'none';

  // Add the path
  let path = {
    'type': 'geojson',
    'data': {
      'type': 'Feature',
      'properties': {
        'description': id,
      },
      'geometry': {
        'type': 'LineString',
        'coordinates': coords,
      },
    },
  };
  map.addSource(id, path);
  map.addLayer({
    'id': id,
    'type': 'line',
    'source': id,
    'layout': {
      'line-join': 'round',
      'line-cap': 'round',
    },
    'paint': {
      'line-color': pathColor,
      'line-width': 8,
      'line-opacity': 0, // Set initial opacity to 0
    },
  });

  // Set up pop-up and mouse events only for the start marker
  startMarker.setPopup(new mapboxgl.Popup().setHTML(id + '<br>' + `<button onclick="window.toggle3d('${id}')">Toggle 3D</button>`));
  startMarker.getElement().addEventListener('click', () => {
    togglePath(id, coords); // Pass coords to togglePath
    startMarker.togglePopup();
  });
}

function togglePath(id, coords) {
  // for toggling visibility of the path if different path is clicked
  if (currentlyVisiblePath !== null && currentlyVisiblePath !== id) {
    // Hide the currently visible path
    map.setPaintProperty(currentlyVisiblePath, 'line-opacity', 0);
    // Remove markers from the previous path
    removeMarkers();
  }

  const lineOpacity = map.getPaintProperty(id, 'line-opacity');
  const newOpacity = lineOpacity === 0 ? 1 : 0;

  // Toggle the opacity of the path
  map.setPaintProperty(id, 'line-opacity', newOpacity);

  // Update the coordinates of the end marker to the new path's end coordinates
  endMarker.setLngLat(coords[coords.length - 1]);

  // Toggle the visibility of the end marker
  if (newOpacity === 1) {
    endMarker.getElement().style.display = 'block';
    // Add markers for the current path
    addMarkers(map, id);
  } else {
    endMarker.getElement().style.display = 'none';
    // Remove markers from the current path
    removeMarkers();
  }

  // Fly to the beginning of the path when the button is clicked
  if (newOpacity === 1) {
    const flyToOptions = {
      center: coords[0],
      essential: true,
      speed: 1.5,
      curve: 1.42,
      easing(t) {
        return t;
      },
    };

    // Adjust zoom level if necessary
    if (map.getZoom() < 17) {
      flyToOptions.zoom = 17;
    }

    map.flyTo(flyToOptions);
  }

  // Update the currently visible path
  currentlyVisiblePath = newOpacity === 1 ? id : null;

  if (currentlyVisiblePath === null) {
    // Remove markers from the previous path
    removeMarkers();
  }
}

// extrusion with fixed height
function addExtrudedPath(map, id, coords, groundHeight) {
const elevation = coords[2];

const lineString = {
  'type': 'Feature',
  'geometry': {
    'type': 'LineString',
    'coordinates': coords,
  },
  'properties': {
    'elevation': elevation,
  },
};

map.addSource(id, {
  'type': 'geojson',
  'data': {
    'type': 'FeatureCollection',
    'features': [lineString],
  },
});

const color = getRandomHexColorWithInterval(20);

map.addLayer({
  'id': id,
  'type': 'line',
  'source': id,
  'layout': {
    'line-join': 'round',
    'line-cap': 'round',
  },
  'paint': {
    'line-color': color,
    'line-width': 8,
  },
});

map.addLayer({
  'id': id + 'extrusion',
  'type': 'fill-extrusion',
  'source': id,
  'paint': {
    'fill-extrusion-color': color,
    'fill-extrusion-height': 2,
    'fill-extrusion-base': groundHeight - 477.0581177,
    'fill-extrusion-opacity': 1,
  },
});
}

// extrusion which would iterate
/*function addExtrudedPath(map, id, coordinatesWithElevations) {
  const geojsonFeature = {
    'type': 'Feature',
    'geometry': {
      'type': 'LineString',
      'coordinates': coordinatesWithElevations.map(coordWithElevation => [coordWithElevation[0], coordWithElevation[1]]),
    },
    'properties': {
      'elevation': coordinatesWithElevations.map(coordWithElevation => coordWithElevation[2]),
    },
  };

  map.addSource(id, {
    'type': 'geojson',
    'data': geojsonFeature,
  });

  const color = getRandomHexColorWithInterval(20);

  map.addLayer({
    'id': id,
    'type': 'line',
    'source': id,
    'layout': {
      'line-join': 'round',
      'line-cap': 'round',
    },
    'paint': {
      'line-color': color,
      'line-width': 8,
    },
  });

  map.addLayer({
    'id': id + 'extrusion',
    'type': 'fill-extrusion',
    'source': id,
    'paint': {
      'fill-extrusion-color': color,
      'fill-extrusion-height': ['get', 'elevation'],
      'fill-extrusion-base': 0,
      'fill-extrusion-opacity': 0.6,
    },
  });
}*/

// 3D workaround but points are on ground
/*function add3DPath(map, id, coordinatesWithElevations) {
  const features = coordinatesWithElevations.map(coordWithElevation => {
    return {
      'type': 'Feature',
      'geometry': {
        'type': 'Point',
        'coordinates': [coordWithElevation[0], coordWithElevation[1], coordWithElevation[2]],
      },
      'properties': {
        'elevation': coordWithElevation[2],
      },
    };
  });

  const lineString = {
    'type': 'Feature',
    'geometry': {
      'type': 'LineString',
      'coordinates': coordinatesWithElevations.map(coordWithElevation => [coordWithElevation[0], coordWithElevation[1], coordWithElevation[2]]),
    },
  };

  map.addSource(id, {
    'type': 'geojson',
    'data': {
      'type': 'FeatureCollection',
      'features': features,
    },
  });

  const color = getRandomHexColorWithInterval(20);

  map.addLayer({
    'id': id + 'lines',
    'type': 'line',
    'source': id,
    'layout': {
      'line-join': 'round',
      'line-cap': 'round',
    },
    'paint': {
      'line-color': color,
      'line-width': 8,
    },
  });

  map.addLayer({
    'id': id + 'points',
    'type': 'circle',
    'source': id,
    'paint': {
      'circle-color': color,
      'circle-radius': 5,
    },
  });
}*/

function popUp(id) {
  // When a click event occurs on a feature in the places layer, open a popup at the
  // location of the feature, with description HTML from its properties.
  map.on('click', id, (e) => {
    // get the coordinates from the click event
    let coordinates = e.lngLat.toArray();
    const description = e.features[0].properties.description;

    // Ensure that if the map is zoomed out such that multiple
    // copies of the feature are visible, the popup appears
    // over the copy being pointed to.
    while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
      coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
    }

    new mapboxgl.Popup()
        .setLngLat(coordinates)
        .setHTML(description)
        .addTo(map);
  });

  // Change the cursor to a pointer when the mouse is over the places layer.
  map.on('mouseenter', id, () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', id, () => {
    map.getCanvas().style.cursor = '';
  });
}

const fileNames = ['/src/components/data/air_data_tierpark.csv', '/src/components/data/air_data_parkplatz.csv'];
for (const fileName of fileNames) {
  const filePath = `./${fileName}`;
  
  try {
    const csvData = await loadCsvFile(filePath);

    const latitudeColumn = csvData.map(row => parseFloat(row.latitude));
    const longitudeColumn = csvData.map(row => parseFloat(row.longitude));
    const coordinates = latitudeColumn.map((lat, index) => [longitudeColumn[index], lat]);
    const timestamp = parseDateTimeString(csvData[0]['datetime(utc)']);

    pathData.push({
    name: filePath.split('/').pop().split('.')[0], 
    coordinates: coordinates,
    timestamp: timestamp, 
  });
  } catch (error) {
    console.error(`Error loading or processing CSV file ${fileName}:`, error);
  }
}

map.on('load', async () => {
  for (const path of pathData) {
    addPath(map, path.name, path.coordinates);
  }
});

  function calculateMeanValues(data) {
    if (data.length === 0) {
      return [0, 0]; // Return [0, 0] if the array is empty to avoid division by zero
    }

    // Initialize sums for both columns to zero
    let sumX = 0;
    let sumY = 0;

    // Iterate through the array and sum up the values in each column
    for (let i = 0; i < data.length; i++) {
      sumX += data[i][0];
      sumY += data[i][1];
    }

    // Calculate the mean values by dividing the sums by the number of data points
    const meanX = sumX / data.length;
    const meanY = sumY / data.length;

    return [meanX, meanY];
  }

  watch(
      () => stateKeys.map(key => state[key]),
      (newValues, oldValues) => {
        newValues.forEach((newValue, index) => {
          if (newValue !== oldValues[index]) {
            const checkFileExists = async (url) => {
              try {
                const response = await fetch(url, {
                  method: 'HEAD', // HEAD requests only get the headers, not the body
                  mode: 'no-cors'  // This is to avoid CORS issues
                });
                if (response.status === 404) {
                  console.log('File not found:', url);
                  return false;
                }
                return response.status === 200;
              } catch (error) {
                console.error('An error occurred while checking if the file exists:', error);
                return false;
              }
            };
            // const filePath = `@/assets/3d/${stateKeys[index]}.glb`;
            const filePath = `./src/assets/3d/${stateKeys[index]}.glb`;
            checkFileExists(filePath).then(exists => {
              if (exists) {
                if (map.getLayer(`${stateKeys[index]}-3d`)) {
                  map.removeLayer(`${stateKeys[index]}-3d`);
                  return;
                }
                let stateKeyName = stateKeys[index];
                let dataSet = dataSets[stateKeyName];
                let offset = 0;
                if (stateKeyName === 'FLIGHT1DATA') {
                  offset = 30;
                }
                if (stateKeyName === 'FLIGHT2DATA') {
                  offset = 0;
                }
                map.addLayer(create3dModelLayer(dataSet[0], map.queryTerrainElevation(dataSet[0]) + offset, [Math.PI / 2, 0, 0], `${filePath}`, `${stateKeys[index]}-3d`), 'waterway-label');
              } else {
                console.log("There is no 3d model for this path.");
              }
            });
          }
        });
      },
      {deep: true}
  );

  watch(
      () => isTerrainEnabled.value,
      (newValue) => {
        if (newValue) {
          map.addSource('mapbox-dem', {
            'type': 'raster-dem',
            'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
            'tileSize': 512,
            'maxzoom': 17,
          });

          map.setTerrain({'source': 'mapbox-dem', 'exaggeration': 1.5});
        } else {
          map.setTerrain(null);
          map.removeSource('mapbox-dem');
        }
      }
  );

  watch(
      () => isSatelliteView.value,
      (newValue) => {
        if (newValue) {
          map.setStyle('mapbox://styles/theolchi/clnw50m2r003z01pg94do2adn');
        } else {
          map.setStyle('mapbox://styles/mapbox/outdoors-v11');
        }

        // Re-add paths after the style has been loaded
        map.once('style.load', () => {
          for (const path of pathData) {
            addPath(map, path.name, path.coordinates);
          }
        });
        //removeRandomMarkers();
      }
  );
});
</script>

<template>
  <div id="map"></div>
  <div class="hamburger-menu">
    <input id="menu__toggle" type="checkbox" />
    <label class="menu__btn" for="menu__toggle">
      <span></span>
    </label>

    <ul class="menu__box">
      <li><button class="menu__item">Toggle Paths/Animals</button></li>
      <li><button class="menu__item">Filters (Animal Type)</button></li>
      <li><button class="menu__item">Filters (Time)</button></li>
      <li><button @click="toggleTerrain()" class="menu__item">Toggle Terrain</button></li>
			<li><button @click="toggleMapView()" class="menu__item">Toggle Map View</button></li>
    </ul>
  </div>
</template>

<style scoped>
</style>
