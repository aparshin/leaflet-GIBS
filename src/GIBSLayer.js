(function() {
    var s2 = function(num) { return num < 10 ? '0' + num : num; },
        gibsAttribution = '<a href="https://earthdata.nasa.gov/gibs">NASA EOSDIS GIBS</a>';
    
    var getGibsURL = function(info, date, x, y, z) {
        if (info.date && !date) {
            return L.Util.emptyImageUrl;
        }
        
        var dateStr = info.date ? date.getUTCFullYear() + '-' + s2(date.getUTCMonth() + 1) + '-' + s2(date.getUTCDate()) : "0";
        
        return L.Util.template(info.template, {
            Time: dateStr,
            TileMatrixSet: 'GoogleMapsCompatible_Level' + info.zoom,
            TileMatrix: z,
            TileRow: y,
            TileCol: x
        });
    };
    
    var GIBSLayerImage = L.TileLayer.extend({
        initialize: function(gibsID, options) {
            this._layerInfo = L.GIBS_LAYERS[gibsID];
            options = options || {};
            options.maxZoom = this._layerInfo.zoom;
            options.attribution = gibsAttribution;
            this._date = options.date || null;
            
            L.Util.setOptions(this, options);
            
            L.TileLayer.prototype.initialize.call(this, this._layerInfo.template, options);
        },
        
        getTileUrl: function(tilePoint){
            return getGibsURL(this._layerInfo, this._date, tilePoint.x, tilePoint.y, tilePoint.z);
        },
        
        setDate: function(newDate) {
            if (this._layerInfo.date) {
                this._date = newDate;
                this._map && this.redraw();
            }
            return this;
        },
        
        isTemporal: function() {
            return this._layerInfo.date;
        }
        
        //setTransparent: function(isTransparent) { return this; } //to ensure the same methods for both classes
    });

    var GIBSLayerCanvas = L.TileLayer.Canvas.extend({
        initialize: function(layerName, options) {
        
            L.Util.setOptions(this, {
                async: true,
                attribution: gibsAttribution
            });
            L.Util.setOptions(this, options);
            
            this._date = this.options.date || null;
            this._layerInfo = L.GIBS_LAYERS[layerName];
            
            if (!this._layerInfo) {
                throw "Unknown GIBS layer name";
            }
            
            L.Util.setOptions(this, {maxZoom: this._layerInfo.zoom});
            
            this._maskInfo = null;
            if (layerName.indexOf('Terra') !== -1) {
                this._maskInfo = L.GIBS_MASKS['MODIS_Terra_Data_No_Data'];
            } else if (layerName.indexOf('Aqua') !== -1) {
                this._maskInfo = L.GIBS_MASKS['MODIS_Aqua_Data_No_Data'];
            }
        },
        
        setDate: function(newDate) {
            if (this._layerInfo.date) {
                this._date = newDate;
                this._map && this.redraw();
            }
            return this;
        },
        
        setTransparent: function(isTransparent) {
            this.options.transparent = isTransparent;
            this._map && this.redraw();
            return this;
        },
        
        _loadImage: function(url, onLoaded, onError) {
            var img = new Image();
            img.onload = onLoaded.bind(null, img);
            img.onerror = onError;
            img.crossOrigin = "anonymous";
            img.src = url;
        },
                
        drawTile: function(canvas, tilePoint, zoom) {
            var hasMask = this._maskInfo && this.options.transparent,
                mainImg,
                maskImg,
                _this = this;
            
            if (!this._date) {
                return;
            }
            
            
            var tryToProcess = function() {
                if (mainImg && (maskImg || !hasMask)) {
                    if (mainImg.width !== 256 || (hasMask && maskImg.width !== 256)) {
                        _this.tileDrawn(canvas);
                        return;
                    }
                    
                    var mainCtx = canvas.getContext('2d');
                    mainCtx.drawImage(mainImg, 0, 0);
                    
                    if (hasMask) {
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
            
            var mainSrc = getGibsURL(this._layerInfo, this._date, tilePoint.x, tilePoint.y, zoom);
            
            this._loadImage(mainSrc, function(img) {
                mainImg = img;
                tryToProcess();
            }, this.tileDrawn.bind(this, canvas));
            
            if (hasMask) {
                var maskSrc = getGibsURL(this._maskInfo, this._date, tilePoint.x, tilePoint.y, zoom);
                this._loadImage(maskSrc, function(img) {
                    maskImg = img;
                    tryToProcess();
                }, this.tileDrawn.bind(this, canvas));
            }
        },
        
        isTemporal: function() {
            return this._layerInfo.date;
        }
    })
    
    L.GIBSLayer = function(gibsID, options) {
        var layerInfo = L.GIBS_LAYERS[gibsID];
            
        if (!layerInfo) {
            throw "Unknown GIBS layer name";
        }
        
        options = options || {};
        var needMask = layerInfo.date && 'transparent' in options && /jpg$/.test(layerInfo.template) && 
                (gibsID.indexOf('Terra') !== -1 || gibsID.indexOf('Aqua') !== -1);
                
        return needMask ? new GIBSLayerCanvas(gibsID, options) : new GIBSLayerImage(gibsID, options);
    }
})();