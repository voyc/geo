/** 
	class Texture
	singleton
	represents a hidden background canvas containing a texture map
	@constructor 
*/
voyc.Texture = function() {
	this.filename = '';
	this.image = {};
	this.w = 0;   // dimensions of texturemap image
	this.h = 0;
	this.canvas = {};
	this.ctx = {};
	this.projection = {}
	this.ready = false
}

voyc.Texture.prototype.setup = function(filename) {
	this.filename = filename;
	this.loadImage()
	this.projection = {
		w:	0,
		h:	0,
		project: function(co) {
			var lng = co[0]
			var lat = 0 - co[1]
		
			var imin = -180
			var imax = +180
			var omin = 0
			var omax = this.w
			var x = (((lng-imin)/(imax-imin)) * (omax-omin)) + omin
		
		
			imin = -90
			imax = +90
			omin = 0
			omax = this.h
			var y = (((lat-imin)/(imax-imin)) * (omax-omin)) + omin
		
			return [x,y]
		}
	}
}

voyc.Texture.prototype.loadImage = function() {
	this.image = new Image()
	var self = this
	this.image.onload = function() {self.onImageLoaded()}
	this.image.crossOrigin = 'Anonymous'
	this.image.src = this.filename
	console.log('texture file load start')
}
voyc.Texture.prototype.onImageLoaded = function() {
	console.log('texture file load complete')
	this.w = this.image.width
	this.h = this.image.height
	this.projection.w = this.w
	this.projection.h = this.h

	// create canvas
	this.canvas = document.createElement('canvas')
	this.canvas.width = this.w
	this.canvas.height = this.h
	this.canvas.style.width  = this.w + 'px'
	this.canvas.style.height = this.h + 'px'
	this.ctx = this.canvas.getContext("2d")

	// copy the image onto the canvas
	this.ctx.drawImage(this.image, 0, 0)
	this.imageData = this.ctx.getImageData(0, 0, this.w, this.h)
	this.ready = true
	console.log('image data acquired')
}


/** 
	draw a bitmap from src to dst
	each of src and dst is an object with these properties:
		projection
		imageData
		ctx
		w
		h
		
dst is a layer
src is this here
*/
voyc.Texture.prototype.draw = function(dst) {
	if (!this.ready)
		return
	// loop thru every pixel in the dst
	var co = [];
	var pt = [];
	var wn = 0;
	var tn = 0;
	var src = this
//	src.projection.w = this.w
//	src.projection.h = this.h
	console.log('texture data copy start')
	for (var x=0; x<(dst.w); x++) {
		for (var y=0; y<(dst.h); y++) {
			co = dst.projection.invert([x,y]);
			if (!(isNaN(co[0]) || isNaN(co[1]))) {
				pt = src.projection.project(co);
				//pt = [300,300]; 
				
				// copy 4 bytes for each pixel
				wn = (y * dst.w + x) * 4;
				tn = (Math.floor(pt[1]) * src.w + Math.floor(pt[0])) * 4;
				dst.imageData.data[wn + 0] = src.imageData.data[tn + 0];
				dst.imageData.data[wn + 1] = src.imageData.data[tn + 1];
				dst.imageData.data[wn + 2] = src.imageData.data[tn + 2];
				//if (src.imageData[wn + 0] + src.imageData[wn + 1] + src.imageData[wn + 2]) {
					dst.imageData.data[wn + 3] = 255;
				//}
			}
			else {
				// copy 4 bytes for each pixel
				wn = (y * dst.w + x) * 4;
				dst.imageData.data[wn + 0] = 0
				dst.imageData.data[wn + 1] = 0
				dst.imageData.data[wn + 2] = 0
				//if (src.imageData[wn + 0] + src.imageData[wn + 1] + src.imageData[wn + 2]) {
					dst.imageData.data[wn + 3] = 255;
				//}
			}
		}
	}
	console.log('texture data copy complete');
	console.log('texture data put start');
	dst.ctx.putImageData(dst.imageData, 0, 0);
	console.log('texture data put complete');
}

