var http = require('http'),
    concat = require('concat-stream'),
    parseString = require('xml2js').parseString,
    fs = require('fs');

http.get('http://map1.vis.earthdata.nasa.gov/wmts-webmerc/1.0.0/WMTSCapabilities.xml', function(response) {
    response.pipe(concat(function(buffer) {
        parseString(buffer.toString(), function(err, res) {
            var layerHash = {};
            res.Capabilities.Contents[0].Layer.forEach(function(layer) {
                var tileMatrixSet = layer.TileMatrixSetLink[0].TileMatrixSet[0],
                    zoom = parseInt(tileMatrixSet.match(/Level(\d+)/)[1]),
                    title = layer['ows:Identifier'][0];
                layerHash[title] = {
                    title: title,
                    template: layer.ResourceURL[0].$.template,
                    zoom: zoom
                };
            });
            
            fs.writeFileSync('GIBSMetadata.js', 'L.GIBS_LAYERS = ' + JSON.stringify(layerHash));
        });
    }));
});