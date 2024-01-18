<script setup>
'use strict';

/**
 * @author Boris Steiner
 */

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
import chroma from 'chroma-js';
import {onMounted, watch, onBeforeMount, ref} from "vue";
import create3dModelLayer from "./3dModelLayer.js";
import {state, stateKeys} from './showModelState.js';

document.addEventListener('DOMContentLoaded', async function () {
  // Dynamically load the windowToggle3d.js script
  await import('./windowToggle3d.js');
});

const pathData = [
  {
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
  }
];

const globalMap = ref(null);

const isTerrainEnabled = ref(false);
const isSatelliteView = ref(false);
const usedColors = new Set();

const currentMode = ref("paths");
const currentlyVisiblePath = ref(null);
const currentStartMarker = ref({ id: null, coords: null });
const endMarker = ref(null);

const showAnimalTypeForm = ref(false);
const showTimeForm = ref(false);

const startDate = ref('');
const endDate = ref('');
const hoursDay1 = ref(0);
const minutesDay1 = ref(0);
const hoursDay2 = ref(0);
const minutesDay2 = ref(0);

const animalTypeFilter = ref('');
const animalTypes = ref([]);
const selectedTypes = ref([]);
const availableAnimalTypes = ref([]);
const animalTypesInUse = ref([]);
const timeFilterOn = ref(false);
const animalFilterOn = ref(false);

let startMarkers = {};
let startMarkersData = [];
let animalMarkers = {};
let animalMarkersData = [];

function moveButton() {
  var satelliteButton = document.querySelector('.satellite-button');
  var terrainButton = document.querySelector('.terrain-button');
  var pathsAnimalsButton = document.querySelector('.paths-animals-button');

  if (satelliteButton.style.left == '20px' || satelliteButton.style.left == '') {
    satelliteButton.style.left = '320px';
    terrainButton.style.left = '410px';
    pathsAnimalsButton.style.left = '500px';
  } else {
    satelliteButton.style.left = '20px';
    terrainButton.style.left = '110px';
    pathsAnimalsButton.style.left = '200px';
  }
}

function updateResetButtonState() {
  var resetButton = document.getElementById('resetFiltersButton');
  
  var filtersApplied = selectedTypes.value.length != 0 || timeFilterOn.value;
  console.log("Are filters applied: " + filtersApplied);
  console.log(selectedTypes.value.length != 0 || timeFilterOn.value);
  console.log(selectedTypes.value.length);
  console.log(timeFilterOn.value);

  if (filtersApplied) {
    resetButton.classList.remove('greyed-out-reset');
    resetButton.classList.add('menu__item');
    resetButton.removeAttribute('disabled');
  } else {
    resetButton.classList.add('greyed-out-reset');
    resetButton.classList.remove('menu__item');
    resetButton.setAttribute('disabled', 'disabled');
  }
}

function toggleTerrain() {
  isTerrainEnabled.value = !isTerrainEnabled.value;
}

const toggleMapView = () => {
  isSatelliteView.value = !isSatelliteView.value;
}

function getRandomUniqueHexColorWithInterval(interval) {
  let hue;
  do {
    hue = Math.floor(Math.random() * 360);
  } while (usedColors.has(hue));

  usedColors.add(hue);

  const adjustedHue = (hue + interval) % 360;
  const adjustedColor = chroma.hsl(adjustedHue, 1, 0.5).hex();

  return adjustedColor;
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

  const parsedDate = new Date(day, jsMonth, year, hours, minutes, seconds);

  return parsedDate;
}

async function getAnnotationsData(pathId) {
  const annotationsFilePath = `src/components/data/annotations_${pathId.split('_').pop().replace('Data', '')}.json`;
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

async function getClasses() {
  const filePath = `src/components/data/classes.json`;

  if (await checkFileExists(filePath)) {
    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to load classes: ${response.statusText}`);
      }

      const classesData = await response.json();
      return classesData;
    } catch (error) {
      console.error(`Error loading classes:`, error);
      return null;
    }
  } else {
    console.warn(`Classes data file not found`);
    return null;
  }
}

async function checkFileExists(url) {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
    });

    return response.status === 200;
  } catch (error) {
    return false;
  }
}

function togglePath(id, coords) {
  if (currentlyVisiblePath.value !== null && currentlyVisiblePath.value !== id) {
    globalMap.value.setPaintProperty(currentlyVisiblePath.value, 'line-opacity', 0);
    animalMarkersData = [];
    removeAnimalMarkers();
  }

  const lineOpacity = globalMap.value.getPaintProperty(id, 'line-opacity');
  const newOpacity = lineOpacity === 0 ? 1 : 0;

  globalMap.value.setPaintProperty(id, 'line-opacity', newOpacity);

  // Remove existing end marker
  endMarker.value.getElement().style.display = 'none';

  if (newOpacity === 1) {
    addAnimalMarkers(id);

    // Re-add end marker
    endMarker.value.setLngLat(coords[coords.length - 1]);
    endMarker.value.getElement().style.display = 'block';

    const flyToOptions = {
      center: coords[0],
      essential: true,
      speed: 1.5,
      curve: 1.42,
      easing(t) {
        return t;
      },
    };

    if (globalMap.value.getZoom() < 18) {
      flyToOptions.zoom = 18;
    }

    globalMap.value.flyTo(flyToOptions);
  } else {
    // Remove end marker if the path is no longer visible
    endMarker.value.getElement().style.display = 'none';
    animalMarkersData = [];
    removeAnimalMarkers();
  }

  currentlyVisiblePath.value = newOpacity === 1 ? id : null;

  if (currentlyVisiblePath.value === null) {
    animalMarkersData = [];
    removeAnimalMarkers();
  }
}

function togglePathsAnimals() {
  if(currentMode.value == "paths") {
    if(currentStartMarker.value.id !== null) {
      togglePath(currentStartMarker.value.id, currentStartMarker.value.coords);
      currentStartMarker.value.id = currentStartMarker.value.coords = null;
    }
    Object.keys(startMarkers).forEach((markerKey) => {
      addAnimalMarkers(markerKey.replace('_startMarker', ''));
      startMarkers[markerKey].remove();
    });
  
    startMarkers = {};
    currentMode.value = "animals";
  } else {
    for (const markerId in startMarkersData) {
      const marker = startMarkersData[markerId];
      const startMarker = new mapboxgl.Marker().setLngLat(marker.coords[0]).addTo(globalMap.value);

      startMarker.setPopup(new mapboxgl.Popup().setHTML(marker.id + '<br>' + `<button onclick="window.toggle3d('${marker.id}')">Toggle 3D</button>`));
      startMarker.getElement().addEventListener('click', () => {
        togglePath(marker.id, marker.coords);
        if(currentStartMarker.value.id === null) {
          currentStartMarker.value.id = marker.id;
          currentStartMarker.value.coords = marker.coords;
        } else {
          currentStartMarker.value.id = currentStartMarker.value.coords = null;
        }
        startMarker.togglePopup();
      });

      startMarkers[`${marker.id}_startMarker`] = startMarker;
    }
    animalMarkersData = [];
    removeAnimalMarkers();
    currentMode.value = "paths";
  }
}

async function addAnimalMarkers(pathId) {
  const annotationsData = await getAnnotationsData(pathId);

  if (!annotationsData) {
    console.warn(`Annotations data not available for ${pathId}`);
    return;
  }

  if (annotationsData.annotations && annotationsData.annotations.length > 0) {
    annotationsData.annotations.forEach((annotation, index) => {
      if (annotation.states[0].lonlat && annotation.states[0].lonlat.length > 0) {
        if(selectedTypes.value.includes(annotation.className) || selectedTypes.value.length === 0) {
          const lonLat = annotation.states[0].lonlat[0];
          const marker = new mapboxgl.Marker({color: 'green'})
            .setLngLat([lonLat.x, lonLat.y])
            .addTo(globalMap.value)
            .setPopup(new mapboxgl.Popup().setHTML(`Class: ${annotation.className}`));;

          animalMarkers[`${pathId}_marker_${index}`] = marker;
          animalTypesInUse.value.push(`${annotation.className}_${index}`);
          animalMarkersData[`${pathId}_marker_${index}Data`] = { id: pathId, coords: [lonLat.x, lonLat.y], timestamp: annotation.states[0].timestamp, index: index, class: annotation.className };

          marker.getElement().addEventListener('mouseenter', () => {
            marker.togglePopup();
          });

          marker.getElement().addEventListener('mouseleave', () => {
            marker.togglePopup();
          });
        }        
      } else {
        console.warn(`Missing or empty lonlat array in annotation ${index} for ${pathId}`);
      }
    });
  } else {
    console.warn(`Annotations array not present or empty for ${pathId}`);
  }
}

function removeAnimalMarkers() {
  Object.keys(animalMarkers).forEach((markerKey) => {
    animalMarkers[markerKey].remove();
  });

  animalMarkers = {};
}

const applyAnimalTypeFilter = () => {
  if (Object.keys(startMarkers).length > 0) {
    if (currentlyVisiblePath.value !== null) {
      const tempData = [currentlyVisiblePath.value, currentStartMarker.value.coords];
      togglePath(currentlyVisiblePath.value, currentStartMarker.value.coords);
      togglePath(tempData[0], tempData[1]);
    }
  } else {
    animalMarkersData = [];
    removeAnimalMarkers();

    for (const pathId in startMarkersData) {
      addAnimalMarkers(pathId.replace('_startMarker', ''));
    }
  }

  if (selectedTypes.value.length == 0 && !timeFilterOn.value) {
    updateResetButtonState();
    animalFilterOn.value = false;
  } else {
    if(!animalFilterOn.value) {
      updateResetButtonState();
      animalFilterOn.value = true;
    }
  }

  showAnimalTypeForm.value = false;
};

function applyTimeFilter() {
  timeFilterOn.value = true;

  const start = new Date(startDate.value);
  start.setHours(hoursDay1.value);
  start.setMinutes(minutesDay1.value);

  const end = new Date(endDate.value);
  end.setHours(hoursDay2.value);
  end.setMinutes(minutesDay2.value);

  if(currentMode.value == "paths") {
    Object.keys(startMarkers).forEach((markerKey) => {
      startMarkers[markerKey.replace('Data', '')].remove();
    });
    startMarkers = {};

    Object.keys(startMarkersData).forEach((markerKey) => {
      if(startMarkersData[markerKey].timestamp >= start && startMarkersData[markerKey].timestamp <= end) {
        console.log("id: " + startMarkersData[markerKey].id);
        console.log("coordinates: " + startMarkersData[markerKey].coords[0]);
        console.log("timestamp: " + startMarkersData[markerKey].timestamp);
        addPath(startMarkersData[markerKey].id, startMarkersData[markerKey].coords, startMarkersData[markerKey].timestamp);
      }
    });
  } else {
    removeAnimalMarkers();

    Object.keys(animalMarkersData).forEach((markerKey) => {

      const date = new Date(animalMarkersData[markerKey].timestamp);

      if(date >= start && date <= end) {
        console.log("id: " + animalMarkersData[markerKey].id);
        console.log("coordinates: " + animalMarkersData[markerKey].coords);
        console.log("timestamp: " + animalMarkersData[markerKey].timestamp);
        console.log("class: " + animalMarkersData[markerKey].class);
        console.log("index: " + animalMarkersData[markerKey].index);
        
        if(selectedTypes.value.includes(animalMarkersData[markerKey].class) || selectedTypes.value.length === 0) {
          const marker = new mapboxgl.Marker({color: 'green'})
            .setLngLat([animalMarkersData[markerKey].coords[0], animalMarkersData[markerKey].coords[1]])
            .addTo(globalMap.value)
            .setPopup(new mapboxgl.Popup().setHTML(`Class: ${animalMarkersData[markerKey].class}`));;

          animalMarkers[`${animalMarkersData[markerKey].id}_marker_${animalMarkersData[markerKey].index}`] = marker;
          animalTypesInUse.value.push(`${animalMarkersData[markerKey].class}_${animalMarkersData[markerKey].index}`);

          marker.getElement().addEventListener('mouseenter', () => {
            marker.togglePopup();
          });

          marker.getElement().addEventListener('mouseleave', () => {
            marker.togglePopup();
          });
        }        
      }
    });
  }

  closeTimeForm();
};

const addToList = () => {
  const selectedType = animalTypeFilter.value;
  if (selectedType && !selectedTypes.value.includes(selectedType)) {
    selectedTypes.value.push(selectedType);
  }
};

const removeFromList = (index) => {
  selectedTypes.value.splice(index, 1);
};

const closeAnimalTypeForm = () => {
  showAnimalTypeForm.value = false;
};

const closeTimeForm = () => {
  showTimeForm.value = false;
};

function resetFilters() {
    startDate.value = '';
    endDate.value = '';
    if (currentMode.value === 'paths') {
    Object.keys(startMarkers).forEach((markerKey) => {
      startMarkers[markerKey].remove();
    });

    startMarkers = {};

    for (const markerId in startMarkersData) {
      const markerData = startMarkersData[markerId];
      const startMarker = new mapboxgl.Marker().setLngLat(markerData.coords[0]).addTo(globalMap.value);

      startMarker.setPopup(new mapboxgl.Popup().setHTML(markerData.id + '<br>' + `<button onclick="window.toggle3d('${markerData.id}')">Toggle 3D</button>`));
      startMarker.getElement().addEventListener('click', () => {
        togglePath(markerData.id, markerData.coords);
        if (currentStartMarker.value.id === null) {
          currentStartMarker.value.id = markerData.id;
          currentStartMarker.value.coords = markerData.coords;
        } else {
          currentStartMarker.value.id = currentStartMarker.value.coords = null;
        }
        startMarker.togglePopup();
      });

      startMarkers[`${markerData.id}_startMarker`] = startMarker;
    }
  }

  selectedTypes.value = [];
  applyAnimalTypeFilter();
  updateResetButtonState();
}

async function addPath(id, coords, timestamp) {
  if (globalMap.value.getSource(id)) {
    if (globalMap.value.getLayer(id)) {
      globalMap.value.removeLayer(id);
    }
    globalMap.value.removeSource(id);
  }

  let pathColor = getRandomUniqueHexColorWithInterval(50);

  const startMarker = new mapboxgl.Marker().setLngLat(coords[0]).addTo(globalMap.value);

  startMarker.setPopup(new mapboxgl.Popup().setHTML(id + '<br>' + `<button onclick="window.toggle3d('${id}')">Toggle 3D</button>`));
  startMarker.getElement().addEventListener('click', () => {
    togglePath(id, coords);
    if(currentStartMarker.value.id === null) {
      currentStartMarker.value.id = id;
      currentStartMarker.value.coords = coords;
    } else {
      currentStartMarker.value.id = currentStartMarker.value.coords = null;
    }
    startMarker.togglePopup();
  });

  startMarkers[`${id}_startMarker`] = startMarker;
  startMarkersData[`${id}_startMarkerData`] = { id: id, coords: coords, timestamp: timestamp }

  endMarker.value = new mapboxgl.Marker({color: 'red'}).setLngLat(coords[coords.length - 1]).addTo(globalMap.value);
  endMarker.value.getElement().style.display = 'none';

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

  globalMap.value.addSource(id, path);
  globalMap.value.addLayer({
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
      'line-opacity': 0,
    },
  });
}

onMounted(async () => {
  mapboxgl.accessToken = 'pk.eyJ1IjoidGhlb2xjaGkiLCJhIjoiY2xudzRicjhyMDZpeDJ0bzZoMmp5MHFqZSJ9.hsNF-iGKdszPYr1b0TXTcA';

  globalMap.value = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/outdoors-v11', 
    center: [14.5501, 47.5162],
    zoom: 7,
    antialias: true
  });

  const classesData = await getClasses();
  if (classesData) {
    animalTypes.value = Object.values(classesData.classes).map(animal => animal.name);
  }

  updateResetButtonState();

  const fileNames = ['air_data_tierpark.csv', 'air_data_parkplatz.csv'];
  for (const fileName of fileNames) {
    const filePath = `./src/components/data/${fileName}`;
    
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

  globalMap.value.on('load', async () => {
    for (const path of pathData) {
      addPath(path.name, path.coordinates, path.timestamp);
    }
  });

  watch(
    () => stateKeys.map(key => state[key]),
    (newValues, oldValues) => {
      newValues.forEach((newValue, index) => {
        if (newValue !== oldValues[index]) {
          // const filePath = `@/assets/3d/${stateKeys[index]}.glb`;
          const filePath = `./src/assets/3d/${stateKeys[index]}.glb`;
          checkFileExists(filePath).then(exists => {
            if (exists) {
              if (globalMap.value.getLayer(`${stateKeys[index]}-3d`)) {
                globalMap.value.removeLayer(`${stateKeys[index]}-3d`);
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
              globalMap.value.addLayer(create3dModelLayer(dataSet[0], globalMap.value.queryTerrainElevation(dataSet[0]) + offset, [Math.PI / 2, 0, 0], `${filePath}`, `${stateKeys[index]}-3d`), 'waterway-label');
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
        globalMap.value.addSource('mapbox-dem', {
          'type': 'raster-dem',
          'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
          'tileSize': 512,
          'maxzoom': 18,
        });

        globalMap.value.setTerrain({'source': 'mapbox-dem', 'exaggeration': 1.5});
      } else {
        globalMap.value.setTerrain(null);
        globalMap.value.removeSource('mapbox-dem');
      }
    }
  );

  watch(
    () => isSatelliteView.value,
    async (newValue) => {
      // Store the currently visible path, markers, and end marker
      const currentPath = currentlyVisiblePath.value;
      const currentMarkers = Object.keys(animalMarkers);
      const currentEndMarkerVisible = endMarker.value.getElement().style.display === 'block';
      const currentModeValue = currentMode.value;

      if (newValue) {
        globalMap.value.setStyle('mapbox://styles/theolchi/clnw50m2r003z01pg94do2adn');
      } else {
        globalMap.value.setStyle('mapbox://styles/mapbox/outdoors-v11');
      }

      // Check if there's a currently visible path
      if (currentPath !== null) {
        // Store the path visibility state
        const lineOpacity = globalMap.value.getPaintProperty(currentPath, 'line-opacity');

        // Remove existing markers and end marker
        animalMarkersData = [];
        removeAnimalMarkers();
        endMarker.value.getElement().style.display = 'none';

        // Redraw the path on the new map
        globalMap.value.once('style.load', async () => {
          for (const path of pathData) {
            addPath(path.name, path.coordinates, path.timestamp);

            if (currentlyVisiblePath.value === path.name && lineOpacity === 1) {
              togglePath(currentlyVisiblePath.value, currentStartMarker.value.coords);
            }
          }

          // Re-add markers if the mode is set to show animals
          if (currentModeValue === 'animals') {
            for (const pathId in startMarkersData) {
              if (currentMarkers.includes(`${pathId}_marker_0`)) {
                await addAnimalMarkers(pathId.replace('_startMarker', ''));
              }
            }
          }

          // Re-add end marker if it was visible
          if (currentEndMarkerVisible) {
            endMarker.value.getElement().style.display = 'block';
          }
        });
      } else {
        // No active path, add start markers directly
        Object.keys(startMarkers).forEach((markerKey) => {
          startMarkers[markerKey].remove();
        });
        startMarkers = {};

        globalMap.value.once('style.load', async () => {
          if(currentModeValue === 'paths') {
            for (const path of pathData) {
              addPath(path.name, path.coordinates, path.timestamp);
            }
          } else {
            for (const pathId in startMarkersData) {
              await addAnimalMarkers(pathId.replace('_startMarker', ''));
            }
          }
        });
      }
    }
  );

  watch(() => {
    availableAnimalTypes.value = animalTypes.value.filter(type => !selectedTypes.value.includes(type));
  });
});
</script>

<template>
  <div id="map"></div>
  <div class="hamburger-menu">
    <input id="menu__toggle" type="checkbox"  @click="moveButton" />
    <label class="menu__btn" for="menu__toggle"><span></span></label>

    <ul class="menu__box">
      <li><button class="menu__item" @click="showAnimalTypeForm = !showAnimalTypeForm;">Filter (Animal Type)</button></li>
      <li><button class="menu__item" @click="showTimeForm = !showTimeForm;">Filter (Time)</button></li>
      <li><button class="menu__item" id="resetFiltersButton" @click="resetFilters">Reset Filters</button></li>
    </ul>
  </div>

  <button class="bottom-right-button satellite-button" @click="toggleMapView">
    <img src="../assets/icons/satellite.png" alt="Button Image">
  </button>

  <button class="bottom-right-button terrain-button" @click="toggleTerrain">
    <img src="../assets/icons/mountain.png" alt="Button Image">
  </button>

  <button class="bottom-right-button paths-animals-button" @click="togglePathsAnimals">
    <img src="../assets/icons/deer.png" alt="Button Image">
  </button>

  <div class="form-container" v-if="showAnimalTypeForm">
    <button class="exit-button close-button" @click="closeAnimalTypeForm">&times;</button>
    <form class="filter-form">
      <label for="animalType">Animal Type:</label>
      <select id="animalType" v-model="animalTypeFilter">
        <option v-for="(type, index) in availableAnimalTypes" :key="index" :value="type">{{ type }}</option>
      </select>
      <button @click.prevent="addToList">Add to List</button>
      <div>
        <ul>
          <li v-for="(selectedType, index) in selectedTypes" :key="index">
            {{ selectedType }}
            <button @click.prevent="removeFromList(index)">Remove</button>
          </li>
        </ul>
      </div>
      <button @click.prevent="applyAnimalTypeFilter">Apply</button>
    </form>
  </div>

  <div class="form-container" v-if="showTimeForm">
    <button class="exit-button close-button" @click="closeTimeForm">&times;</button>
    
    <form class="filter-form">
      <label for="startDate">Start Date:</label>
      <input type="date" id="startDate" name="startDate" v-model="startDate" />

      <label for="endDate">End Date:</label>
      <input type="date" id="endDate" name="endDate" v-model="endDate" />

      <div class="time-inputs">
        <label for="hoursDay1">Day 1:</label>
        <input class="hourmin" type="number" id="hoursDay1" name="hoursDay1" v-model="hoursDay1" min="0" max="23" />

        <label for="minutesDay1">:</label>
        <input class="hourmin" type="number" id="minutesDay1" name="minutesDay1" v-model="minutesDay1" min="0" max="59" />

        <label for="hoursDay2">Day 2:</label>
        <input class="hourmin" type="number" id="hoursDay2" name="hoursDay2" v-model="hoursDay2" min="0" max="23" />

        <label for="minutesDay2">:</label>
        <input class="hourmin" type="number" id="minutesDay2" name="minutesDay2" v-model="minutesDay2" min="0" max="59" />
      </div>

      <button @click.prevent="applyTimeFilter">Apply</button>
    </form>
  </div>

  <div class="overlay" :class="{ 'active': showAnimalTypeForm || showTimeForm }"></div>
</template>

<style scoped>
</style>