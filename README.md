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
5. If you want you can uncomment chopped choords to limit the amount of coordinates and comment the original coords section:
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
6. You will get a new .txt file either in **./coord-extraction/** or in the specified output folder with the extracted coordinates which can be copy-pasted directly to a new const in **./src/components/coords.js**.

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
  [..., ..., ...]
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
4. In **./src/components/Map.vue** add to pathData
```javascript
const pathData = [
  {
    ...
  },
  {
    name: 'NEWDATANAME',
    coordinates: NEWDATANAME,
//                                ('2023-10-10 09:00:00')
    timestamp: parseDateTimeString('date where data was recorded'),
  }
];
```

# Add a new 3D model to the map
In **./src/components/Map.vue** if there is a 3D model for the data add it to **/public/3d/NEWDATANAME.glb** and in the watch() function add an offset default is 0
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

                // if offset is needed
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

# Authors
Aaron Bandion, Boris Steiner, Michael Plasser
