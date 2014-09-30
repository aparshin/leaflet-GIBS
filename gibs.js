(function() {
    var NASA_URL_PREFIX = 'https://map1a.vis.earthdata.nasa.gov/wmts-webmerc/',
        NASA_LAYERS = {
            MODIS_Terra_CorrectedReflectance_TrueColor: [9, 'jpg', 'MODIS_Terra_Data_No_Data'],
            MODIS_Terra_CorrectedReflectance_Bands721:  [9, 'jpg', 'MODIS_Terra_Data_No_Data'],
            MODIS_Terra_CorrectedReflectance_Bands367:  [9, 'jpg', 'MODIS_Terra_Data_No_Data'],
            MODIS_Aqua_CorrectedReflectance_TrueColor:  [9, 'jpg', 'MODIS_Aqua_Data_No_Data'],
            MODIS_Aqua_CorrectedReflectance_Bands721:   [9, 'jpg', 'MODIS_Aqua_Data_No_Data'],
            
            MODIS_Terra_SurfaceReflectance_Bands143: [8, 'jpg', 'MODIS_Terra_Data_No_Data'],
            MODIS_Terra_SurfaceReflectance_Bands721: [8, 'jpg', 'MODIS_Terra_Data_No_Data'],
            MODIS_Terra_SurfaceReflectance_Bands121: [9, 'jpg', 'MODIS_Terra_Data_No_Data'],
            MODIS_Aqua_SurfaceReflectance_Bands143:  [8, 'jpg', 'MODIS_Aqua_Data_No_Data'],
            MODIS_Aqua_SurfaceReflectance_Bands721:  [8, 'jpg', 'MODIS_Aqua_Data_No_Data'],
            MODIS_Aqua_SurfaceReflectance_Bands121:  [9, 'jpg', 'MODIS_Aqua_Data_No_Data'],
            
            VIIRS_CityLights_2012: [8, 'jpg'],
            
            MODIS_Aqua_Data_No_Data: [9, 'png'],
            MODIS_Terra_Data_No_Data: [9, 'png']
        },
        getGibsURL = function(layerName, date, x, y, z) {
            var layerParams = NASA_LAYERS[layerName] || [7, 'jpg'],
                layerZoom = NASA_LAYERS[layerName][0],
                tileExt = NASA_LAYERS[layerName][1];
                
            var s2 = function(num) { return num < 10 ? '0' + num : num; };
            var dateStr = date.getFullYear() + '-' + s2(date.getMonth() + 1) + '-' + s2(date.getDate());
                
            return NASA_URL_PREFIX + layerName + '/default/' + dateStr + '/GoogleMapsCompatible_Level' + layerZoom + '/' +
                      z + '/' + y + '/' + x + '.' + tileExt;
        };

    L.GIBSLayer = L.TileLayer.Canvas.extend({
        options: {
            hideBlackAreas: false
        },
        
        initialize: function(layerName, options) {
            
            L.Util.setOptions(this, {async: true});
            L.Util.setOptions(this, options);
            
            this._date = this.options.date || null;
            this._layerName = layerName;
        },
        
        setDate: function(newDate) {
            this._date = newDate;
            this.redraw();
        },
        
        hideBlackAreas: function(hide) {
            this.options.hideBlackAreas = hide;
            this.redraw();
        },
        
        _loadImage: function(url, onLoaded, onError) {
            var img = new Image();
            img.onload = onLoaded.bind(null, img);
            img.onerror = onError;
            img.crossOrigin = "anonymous";
            img.src = url;
        },
                
        drawTile: function(canvas, tilePoint, zoom) {
            var mainImg,
                maskImg,
                _this = this;
            
            if (!this._date) {
                return;
            }
            
            var tryToProcess = function() {
                if (mainImg && maskImg) {
                    if (mainImg.width !== 256 || maskImg.width !== 256) {
                        _this.tileDrawn(canvas);
                        return;
                    }
                    
                    var mainCtx = canvas.getContext('2d');
                    mainCtx.drawImage(mainImg, 0, 0);
                    
                    var mainData = mainCtx.getImageData(0, 0, 256, 256);
                    
                    var maskCanvas = document.createElement('canvas');
                    maskCanvas.width = maskCanvas.height = 256;
                    
                    var maskCtx = maskCanvas.getContext('2d');
                    maskCtx.drawImage(maskImg, 0, 0);
                    
                    var maskPixels = maskCtx.getImageData(0, 0, 256, 256).data,
                        pixels = mainData.data;
                    for (var p = 0; p < maskPixels.length; p += 4) {
                        if (maskPixels[p+3]) {
                            pixels[p+3] = 0;
                        } else if (_this.options.hideBlackAreas) {
                            //Because of some problems in no-data layer, sometimes some black blocks are still visible
                            //Try to detect that areas and hide them.
                            //Concrete detection is very simple: black pixel is inside the area, 
                            //if one of its neighbour pixels is also black
                            var isBlack = !pixels[p] && !pixels[p+1] && !pixels[p+2];
                            var isPrevBlack = p > 0 && !pixels[p-4] && !pixels[p-3] && !pixels[p-2];
                            var isNextBlack = p < maskPixels.length - 4 && !pixels[p+4] && !pixels[p+5] && !pixels[p+6];
                            if (isBlack && (isPrevBlack || isNextBlack)) {
                                pixels[p+3] = 0;
                            }
                        }
                    }
                    
                    mainCtx.putImageData(mainData, 0, 0);
                    
                    _this.tileDrawn(canvas);
                }
            }
            
            this._adjustTilePoint(tilePoint);
            
            var maskLayerName = NASA_LAYERS[this._layerName][2];
            
            var mainSrc = getGibsURL(this._layerName, this._date, tilePoint.x, tilePoint.y, zoom);
            var maskSrc = getGibsURL(maskLayerName, this._date, tilePoint.x, tilePoint.y, zoom);
            
            this._loadImage(mainSrc, function(img) {
                mainImg = img;
                tryToProcess();
            }, this.tileDrawn.bind(this, canvas));
            
            this._loadImage(maskSrc, function(img) {
                maskImg = img;
                tryToProcess();
            }, this.tileDrawn.bind(this, canvas));
            
            
        }
        
    })
})();