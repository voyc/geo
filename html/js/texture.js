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


//// load tiles
//voyc.Texture.prototype.loadTiles = function(pass,cb) {
//	this.cb = cb;
//	var self = this;
//	if (pass == 'initial') {
//		this.list = this.makeList();
//		this.asset = new voyc.Asset();
//		//log&&console.log(voyc.timer()+'texture tile asset load start');
//		setTimeout(function() {
//			self.asset.load(self.list['initial'], function(success, key) { self.assetLoaded(success, key)});
//		}, 50);
//	}
//	else if (pass == 'remainder') {
//		//log&&console.log(voyc.timer()+'texture tile asset load start');
//		setTimeout(function() {
//			self.asset.load(self.list['remainder'], function(success, key) { self.assetLoaded(success, key)});
//		}, 50);
//	}
//}
//
//voyc.Texture.prototype.assetLoaded = function(isSuccess, key) {
//	if (!isSuccess) {
//		this.cb(false, key);
//		return;
//	}
//	if (!key) {
//		//log&&console.log(voyc.timer()+'texture get imagedata start');
//		this.imageData = this.ctx.getImageData(0, 0, this.w, this.h);
//		//log&&console.log(voyc.timer()+'texture get imagedata complete');
//		//log&&console.log(voyc.timer()+'texture tile asset load complete');
//		this.cb(true, '');
//		return;
//	}
//
//	//this.cb(true, key);  //for counting loaded assets
//
//	var keypattern = /c(.*)_r(.*)/;
//	var a = keypattern.exec(key);
//	var col = a[1];
//	var row = a[2];
//
//	var tilesize = 300;
//	var x = col * tilesize;
//	var y = row * tilesize;
//	image = this.asset.get(key);
//	this.ctx.drawImage(image, 
//		0, 0, tilesize, tilesize, // source
//		x, y, tilesize, tilesize  // dest
//	);
//}
//
///*
//	make two lists of tiles to load, 
//	in order, 
//	spiraling around the starting point
//*/
//voyc.Texture.prototype.makeList = function() {
//	// given
//	var rows = 18;
//	var cols = 36;
//	var tilesize = 300;
//	var keypattern = 'c$x_r$y';
//	var pathpattern = 'assets/tiles/ne2_$key.png';
//	
//	var list = {      // build and return two lists
//		initial: [],
//		remainder: []
//	};
//	var whichlist = 'initial';
//	var n = 0;
//	var j = 0;
//	var m = rows*cols;
//	var keys={};
//
//	// local function to add key/path to list
//	function pokeList(col,row) {
//		var key = keypattern.replace('$x', col).replace('$y', row);
//		j++;
//		if (!(key in keys)) {
//			keys[key] = 1;
//			var path = pathpattern.replace('$key', key);
//			list[whichlist].push({key:key, path:path});
//			n++;
//		}
//	}
//
//	// calculate the four corners on screen
//	var ptNW = [0,0];
//	var ptSE = [voyc.plunder.world.w, voyc.plunder.world.h];
//	var coNW = voyc.plunder.world.projection.invert(ptNW);
//	var coSE = voyc.plunder.world.projection.invert(ptSE);
//	var ptTL = this.projection.project(coNW);
//	var ptBR = this.projection.project(coSE);
//	var collo = Math.floor(ptTL[0] / tilesize);
//	var colhi = Math.floor(ptBR[0] / tilesize);
//	var rowlo = Math.floor(ptTL[1] / tilesize);
//	var rowhi = Math.floor(ptBR[1] / tilesize);
//
//	// first list, initially visible tiles
//	for (var c=collo; c<=colhi; c++) {
//		for (var r=rowlo; r<=rowhi; r++) {
//			pokeList(c,r);
//		}
//	}
//
//	// now the second list, continue spiraling outward
//	whichlist = 'remainder';
//	while (n < m) {
//		rowlo = Math.max(rowlo-1,0);
//		rowhi = Math.min(rowhi+1,rows-1);
//		collo = Math.max(collo-1,0);
//		colhi = Math.min(colhi+1,cols-1);
//
//		for (var c=collo; c<=colhi; c++) {
//			pokeList(c,rowlo);
//			pokeList(c,rowhi);
//		}
//		for (var r=rowlo; r<=rowhi; r++) {
//			pokeList(collo,r);
//			pokeList(colhi,r);
//		}
//	}
//	return list;
//}
//
//	var nrows = 18
//	var ncols = 36
//	var tot = nrows * ncols
//	cnt = 0
//	list = []
//
//	// start at center tile
//	ctr = w/2, h/2
//	co = projection.invert(ctr)
//	lng = ((co[1] / 10) * 10)
//	lat = (co[1] / 10) * 10 + 10
//	list.push({
//		cnt: cnt+=1,
//		lng: lng,
//		lat: lat,
//		state: 'queued',
//	})
//
//	// spiral outward
//	while (cnt < tot
//	for (var i in [1,3,5,7,9,11,13,15,17]
//
//		left
//			xy, x+1,y x-1,y
//			y+1
//		right
//		top
//		bottom
//
//		lng
//		lat
//
//		list.push({
//			cnt: cnt+=1,
//			lng: lng,
//			lat: lat,
//			state: 'queued',
//		})
//	}
//
//	// acol = [-180,-170,-160,-150,-140,-130,-120 ...
//
//	acol[]
//	for (var i=-180; i<+180; i+=10) acol.push(i)
//	arow[]
//	for (var i=90; i<-90; i-=10) arow.push(i)
//
//	cc = 80
//	rc = 30
//
//	distance = Math.pow((((c-cc)**2) + ((r-rr)**2)),.5)
//
//
//	cd[]
//	ccol
//	ctrco = [80,30]
//	ctrpt = [x,y]
//	ctrcol, ctrrow
//	ctrcol = 8
//	ctrrow = 3
//
//	col = 1 thru 36
//
//	for (var c=ctrcol;col
//	cd.push(coldegr[c]
//
//
//
//
//	while (n < m) {
//		rowlo = Math.max(rowlo-1,0);
//		rowhi = Math.min(rowhi+1,rows-1);
//		collo = Math.max(collo-1,0);
//		colhi = Math.min(colhi+1,cols-1);
//
//		for (var c=collo; c<=colhi; c++) {
//			pokeList(c,rowlo);
//			pokeList(c,rowhi);
//		}
//		for (var r=rowlo; r<=rowhi; r++) {
//			pokeList(collo,r);
//			pokeList(colhi,r);
//		}
//	}
//	return list;

//voyc.Texture.prototype.listTiles = function(co) {
var listTiles = function(co) {
	var cc = co[0]
	var rr = co[1]
	var distance = 0
	var list = []
	for (var c=-180; c<+180; c+=10) {
		for (var r=90; r<-90; r-=10) {
			distance = Math.pow((((c-cc)**2) + ((r-rr)**2)),.5)
			list.push({
				distance: distance,
				lng: c,
				lat: r,
				state: 'queued',
			})
		}
	}
	return list
}

//Loading Images with Web Workers
//https://dev.to/trezy/loading-images-with-web-workers-49ap


