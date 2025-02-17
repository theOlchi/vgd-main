# vgd

Semester Project For Visualizing Geospatial Data

# Install dependencies if not already installed

Run in command line:

```
npm install
```

# Run

Run in command line:

```
npm run dev
```

# Deploy

Run in command line:

```
npm run deploy
```

The deployed site is avialable here: <https://theolchi.github.io/vgd/>

For changes in the deploy pipeline see:
[Deploying Vite App](https://medium.com/@aishwaryaparab1/deploying-vite-deploying-vite-app-to-github-pages-166fff40ffd3)

# Extract coordinates from GPX

1. Add GPX file in ./coord-extraction/new.gpx
2. ```python
   # add filename here
   gpx_file = open('new.gpx', 'r')
   ```
3. ```python
   # if you want to output to a folder
   # default is './'
   save_path = 'output-folder-name/'
   ```
4. ```python
   # add your output filename
   doc_name = 'output-name'
   ```
5. If you want you can uncomment chopped choords to limit the amount of coordinates and comment the original coords
   section:
   ```python
   # original coords
   doc_name = 'flight1'
   save_path = 'hgb-txt/'
   doc_name_path = os.path.join(save_path, doc_name + ".txt")
   # with open(doc_name_path, 'w') as f:
   #     for element in coords:
   #         formatted_item = f"{element},\n"  # Add a line break after each element
   #         f.write(formatted_item)
   
   # chopped coords
   chopped_coords = coords[::1000]
   with open(doc_name_path, 'w') as f:
       for element in chopped_coords:
           formatted_item = f"{element},\n"  # Add a line break after each element
           f.write(formatted_item)
   ```
6. You will get a new .txt file either in **./coord-extraction/** or in the specified output folder with the extracted
   coordinates which can be copy-pasted directly to a new const in **./src/components/coords.js**.

# Create 3D model

See AR Branch README for the creation of 3D models. Important node: Export as **glTF 2.0**
<https://github.com/theTscheZ/Visualizing-Geospatial-Data-AR-Unity>

# Add a new Path to the map

1. Add a new const NEWDATANAME to **./src/components/coords.js** and insert coordinates

```javascript
export const NEWDATANAME = [
//[longitude,      latitude,         elevation]
    [14.5118463798673, 48.3680606170131, 477.0581177],
    [14.5118463354845, 48.368060663751, 477.1581177],
    [14.5118462989415, 48.3680606737051, 477.1581177],
    [..., ..., ...
]
]
```

2. In **./src/components/Map.vue** add NEWDATANAME to imports

```javascript
import {FLIGHT1DATA, FLIGHT2DATA, MAPS1DATA, MAPS2DATA, NEWDATANAME} from './coords.js';
```

3. In **./src/components/Map.vue** add NEWDATANAME to dataSets

```javascript
const dataSets = {
    FLIGHT1DATA,
    FLIGHT2DATA,
    MAPS1DATA,
    MAPS2DATA,
    MAPS3DATA,
    NEWDATANAME
};
```

4. In **./src/components/Map.vue** add pathData of NEWDATANAME
```javascript
const pathData = [
   {
    name: 'FLIGHT1DATA',
    coordinates: FLIGHT1DATA,
    timestamp: parseDateTimeString('2023-11-13 22:00:00'),
   },
   {
    name: 'NEWDATANAME',
    coordinates: NEWDATANAME,
    timestamp: parseDateTimeString('YYYY-MM-DD hh:mm:ss'),
   }
];

```
5. In **./src/components/Map.vue** add NEWDATANAME to the map after the style has been loaded
```javascript
watch(
        () => isSatelliteView.value,
        (newValue) => {
           if (newValue) {
              map.setStyle('mapbox://styles/theolchi/clnw50m2r003z01pg94do2adn');
           } else {
              map.setStyle('mapbox://styles/mapbox/outdoors-v11');
           }

           // Re-add paths and terrain after the style has been loaded
           map.once('style.load', () => {
              addPath(map, 'FLIGHT1DATA', FLIGHT1DATA);
              addPath(map, 'FLIGHT2DATA', FLIGHT2DATA);

              // add NEWDATANAME to the map after the style has been loaded
              addPath(map, 'NEWDATANAME', NEWDATANAME);

              // Re-add terrain if it was enabled before
              if (isTerrainEnabled.value) {
                 map.addSource('mapbox-dem', {
                    'type': 'raster-dem',
                    'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
                    'tileSize': 512,
                    'maxzoom': 14,
                 });

                 map.setTerrain({'source': 'mapbox-dem', 'exaggeration': 1.5});
              }
           });
        }
);
```

# Add a new 3D model to the map

1. Add the 3D model for the data to **/public/3d/NEWDATANAME.glb**
2. In **./src/components/showModelState.js** add NEWDATANAME to stateKeys
   ```javascript
   export const state = reactive({
      FLIGHT1DATA: false,
      FLIGHT2DATA: false,
      maps1: false,
      maps2: false,
      maps3: false,
      NEWDATANAME: false
   });
   ```
3. In **./src/components/Map.vue** in the watch() function add an offset default is 0
   ```javascript
     watch(
         () => stateKeys.map(key => state[key]),
         (newValues, oldValues) => {
           newValues.forEach((newValue, index) => {
             if (newValue !== oldValues[index]) {
               // const filePath = `@/assets/3d/${stateKeys[index]}.glb`;
               const filePath = `../src/assets/3d/${stateKeys[index]}.glb`;
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
   
                   // add specific offset for 3D model
                   if (stateKeyName === 'NEWDATANAME') {
                     // needed offset
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
   ```

# Problem with 3D model on main branch

Unfortunately, there is currently an error when trying to display the 3D model in the main branch. If you click the
FLIGHT1DATA e.g. and then press on the Toggle3D button you see nothing or the model is popping up for a short moment and
disappearing in the next. If you then tild the map you will see the model but errors are thrown in the console, saying
Uncaught TypeError: 'get' on proxy: property 'modelViewMatrix'. This is probably related to the globalMap
reactive-element in **./src/components/Map.vue** and the way Vue handles reactive-elements. A solution for that could be
to move every function which uses the map in the same scope. On
the [performant3d](https://github.com/theOlchi/vgd/tree/performant3d) branch it is working as expected and the methods
are used similarly on main. Currently this branch is deployed on <https://theolchi.github.io/vgd/>.

# Authors

Aaron Bandion, Boris Steiner, Michael Plasser
