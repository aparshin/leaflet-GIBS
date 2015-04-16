(function() {
    var s2 = function(num) { return num < 10 ? '0' + num : num; };
                
    var //NASA_URL_PREFIX = 'https://map1a.vis.earthdata.nasa.gov/wmts-webmerc/',
        /*NASA_LAYERS = {
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
        },*/
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
        initialize: function(layerName, options) {
        
            L.Util.setOptions(this, {async: true});
            L.Util.setOptions(this, options);
            
            this._date = this.options.date || null;
            this._layerInfo = L.GIBS_LAYERS[layerName];
            
            if (!this._layerInfo) {
                throw "Unknown GIBS layer name";
            }
            
            L.Util.setOptions(this, {maxZoom: this._layerInfo.zoom});
            
            this._maskInfo = null;
            if (layerName.indexOf('Terra') !== -1) {
                this._maskInfo = L.GIBS_LAYERS['MODIS_Terra_Data_No_Data'];
            } else if (layerName.indexOf('Aqua') !== -1) {
                this._maskInfo = L.GIBS_LAYERS['MODIS_Aqua_Data_No_Data'];
            }
        },
        
        setDate: function(newDate) {
            this._date = newDate;
            this.redraw();
        },
        
        _getGibsURL: function(info, x, y, z) {
            var date = this._date,
                dateStr = date.getFullYear() + '-' + s2(date.getMonth() + 1) + '-' + s2(date.getDate());
            
            return L.Util.template(info.template, {
                Time: dateStr,
                TileMatrixSet: 'GoogleMapsCompatible_Level' + info.zoom,
                TileMatrix: z,
                TileRow: y,
                TileCol: x
            });
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
                if (mainImg && (maskImg || !_this._maskInfo)) {
                    if (mainImg.width !== 256 || (_this._maskInfo && maskImg.width !== 256)) {
                        _this.tileDrawn(canvas);
                        return;
                    }
                    
                    var mainCtx = canvas.getContext('2d');
                    mainCtx.drawImage(mainImg, 0, 0);
                    
                    if (_this._maskInfo) {
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
                            }
                        }
                        
                        mainCtx.putImageData(mainData, 0, 0);
                    }
                    
                    _this.tileDrawn(canvas);
                }
            }
            
            this._adjustTilePoint(tilePoint);
            
            var mainSrc = this._getGibsURL(this._layerInfo, tilePoint.x, tilePoint.y, zoom);
            
            this._loadImage(mainSrc, function(img) {
                mainImg = img;
                tryToProcess();
            }, this.tileDrawn.bind(this, canvas));
            
            if (this._maskInfo) {
                var maskSrc = this._getGibsURL(this._maskInfo, tilePoint.x, tilePoint.y, zoom);
                this._loadImage(maskSrc, function(img) {
                    maskImg = img;
                    tryToProcess();
                }, this.tileDrawn.bind(this, canvas));
            }
        }
    })
})();