'use strict';

/**
 * @author Boris Steiner
 */

// import { RUN1DATA } from './coords.js';
// import { RUN2DATA } from './coords.js';
// import { MAPS1DATA } from './coords.js';
// import { MAPS2DATA } from './coords.js';
// import { MAPS3DATA } from './coords.js';
// import { FLIGHT1DATA } from './coords.js';
// import { FLIGHT2DATA } from './coords.js';
import { WRUN1DATA } from './coords.js';
import { WRUN2DATA } from './coords.js';
import { WRUN3DATA } from './coords.js';

import '../style.css';
import 'mapbox-gl/dist/mapbox-gl.css';

import mapboxgl from 'mapbox-gl';
import LegendControl from 'mapboxgl-legend';
import '../node_modules/mapboxgl-legend/dist/style.css';

let allData = [];
// allData = allData.concat(RUN1DATA, RUN2DATA, MAPS1DATA, MAPS2DATA, MAPS3DATA, FLIGHT1DATA);
allData = allData.concat(WRUN1DATA, WRUN2DATA);
// allData = allData.concat(FLIGHT1DATA);

mapboxgl.accessToken = 'pk.eyJ1IjoidGhlb2xjaGkiLCJhIjoiY2xudzRicjhyMDZpeDJ0bzZoMmp5MHFqZSJ9.hsNF-iGKdszPYr1b0TXTcA';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/theolchi/clnw50m2r003z01pg94do2adn', // satellite
    // style: 'mapbox://styles/theolchi/clorauxl600nc01qy4goi6wes', // streets
    // style: 'mapbox://styles/mapbox/satellite-streets-v12', // no idea
    // style: 'mapbox://styles/mapbox/outdoors-v11', // different streets
    center: [calculateMeanValues(allData)[0], calculateMeanValues(allData)[1]],
    zoom: 16,
});

const legend = new LegendControl();
map.addControl(legend, 'bottom-left');

function getRandomHexColorWithInterval(interval) {
    const hue = Math.floor(Math.random() * 360); // Generate a random hue value (0-359)
    const modifiedHue = (hue + interval) % 360; // Add the interval and ensure it stays within the 0-359 range
    const hslColor = `hsl(${modifiedHue}, 100%, 50%)`; // Create an HSL color with fixed saturation and lightness
    const rgbColor = hslToRgb(hslColor); // Convert HSL to RGB
    return rgbToHex(rgbColor); // Convert RGB to hex
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

function addPath(map, id, data) {
    let path = {
        'type': 'geojson',
        'data': {
            'type': 'Feature',
            'properties': {},
            'geometry': {
                'type': 'LineString',
                'coordinates': data,
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
            'line-color': getRandomHexColorWithInterval(50),
            'line-width': 8,
        },
    });
}

// extrusion with fixed height
function addExtrudedPath(map, id, data, groundHeight) {
    const elevation = data[2];

    const lineString = {
        'type': 'Feature',
        'geometry': {
            'type': 'LineString',
            'coordinates': data,
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


map.on('load', () => {
    // addPath(map, 'maps1', MAPS1DATA);
    // addPath(map, 'maps2', MAPS2DATA);
    // addPath(map, 'maps3', MAPS3DATA);
    // addPath(map, 'run1', RUN1DATA);
    // addPath(map, 'run2', RUN2DATA);
    // addPath(map, 'flight1', FLIGHT1DATA);

    // [14.5118463798673, 48.3680606170131, 477.0581177],
    /*const specialCoord = [14.5118463798673, 48.3680606170131];
    const specialElevation = map.queryTerrainElevation(specialCoord);
    console.log(specialElevation);
    addExtrudedPath(map, 'flight1', FLIGHT1DATA, specialElevation);*/
    // addPath(map, 'flight2', FLIGHT2DATA);
    addPath(map, 'wrun1', WRUN1DATA);
    addPath(map, 'wrun2', WRUN2DATA);
    // add3DPath(map, 'wrun3', WRUN3DATA);
});

map.on('style.load', () => {
    map.addSource('mapbox-dem', {
        'type': 'raster-dem',
        'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
        'tileSize': 512,
        'maxzoom': 14,
    });
// add the DEM source as a terrain layer with exaggerated height
    map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
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