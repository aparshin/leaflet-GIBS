## Leaflet-GIBS

Leaflet plugin for [NASA EOSDIS GIBS](https://earthdata.nasa.gov/gibs) imagery integration. [154 products](https://wiki.earthdata.nasa.gov/display/GIBS/GIBS+Available+Imagery+Products) are available. Date can be set dynamically for multi-temporal products. No-data pixels of MODIS Multiband Imagery can be made transparent.

Works with both Leaflet 0.7.x and 1.0.x!

### Example
First, include list of GIBS products and the plugin itself:
```html
<script src="src/GIBSMetadata.js"></script>
<script src="src/GIBSLayer.js"></script>
```
Then create a GIBS layer:
```javascript
var layer = new L.GIBSLayer('MODIS_Aqua_SurfaceReflectance_Bands721', {
    date: new Date('2015/04/01'),
    transparent: true
}).addTo(map);
```
[Check the Demo!](http://aparshin.github.io/leaflet-GIBS/examples/)

###API
The main class `L.GIBSLayer` extends `L.TileLayer`.
```
new L.GIBSLayer(GIBSLayerID, options)
```
`GIBSLayerID` is GIBS Imagery Layer Identifier, see [list of available products](https://wiki.earthdata.nasa.gov/display/GIBS/GIBS+Available+Imagery+Products).

The following options can be set:

|Option|Type |Description|
|---|---|---|
|`date`|`Date`|Date for multi-temporal products|
|`transparent`|`Boolean`|Make no-data pixels of MODIS Multiband Imagery transparent|

**Note about `transparent` option.** GIBS Multiband Imagery layers use JPEG tiles without transparency (all no-data pixels are black). HTML Canvas and corresponding no-data layers are used to make no-data pixels transparent. It leads to additional requests to server and more computations in browser. So, use this option if you really need it!

The following additional methods are available.

|Method|Description|
|---|---|
|`setDate(date: Date)`|Set new date for multi-temporal layers|
|`setTransparent(isTransparent: Boolean)`|Switch on/off transparency for no-data pixels. Works only if `transparent` option was explicitly set in constructor|
|`isTemporal(): Boolean`| Returns true for multi-temporal layers|

###Layers Metadata
The list of all available GIBS Layers is available as `L.GIBS_LAYERS` hash. Keys are layer's IDs, values are the following objects:
  * `title` - layer's title
  * `template` - template of layer tiles
  * `zoom` - max zoom of the layer
  * `date` (Boolean) - is the layer multi-temporal