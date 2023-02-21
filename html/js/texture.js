/** 
	class Texture
	singleton
	represents a hidden background canvas containing a texture map

	to test local, start browser from command line
		brave-browser --allow-file-access-from-files  

	two methods to load a texture map: whole and tiled

	to create tiles of an image, see python/renametiles.py
*/

var log = false 

voyc.Texture = function() {
	// input constants
	this.method = '' // whole, tiled
	this.filename = ''
	this.w = 0
	this.h = 0
	this.tilesize = 0
	this.co = [0,0]  // centerpoint on screen, tile loading spirals out from here
	this.cb = function(){}
	
	// outputs
	this.ready = false

	// working variables
	this.imgdata = {}  // this is the texture map

	// used to load whole image
	this.image = {}
	this.canvas = {}
	this.ctx = {}

	// used to load square tiles
	this.list = []
	this.numLoaded = 0
	this.numTiles = 0

	this.projection = {
		w:	this.w,
		h:	this.h,
		project: function(co) {
			// in stored data, N is positive
			// in the raster texture map tiles, N is negative
			// in the projection object, N is negative
			// in xy screen points, y values go down the screen starting at 0

			//var lng = co[0]
			//var lat = 0-co[1]  // flip latitude

			//var imin = -180
			//var imax = +180
			//var omin = 0
			//var omax = this.w
			//var x = (((lng-imin)/(imax-imin)) * (omax-omin)) + omin
			var x = ((co[0]+180)/360) * this.w
		
			//imin = -90
			//imax = +90
			//omin = 0
			//omax = this.h
			//var y = (((lat-imin)/(imax-imin)) * (omax-omin)) + omin
			var y = (((90-co[1]))/180) * this.h
		
			return [Math.round(x),Math.round(y)]
		}
	}
}

voyc.Texture.prototype.load = function(method, co, cb) {
	this.method = method
	this.co = co
	this.cb = cb

	if (this.method == 'tiled') {
		this.filename = 'assets/texture/tiles/'
		this.projection.w = this.w = 10800
		this.projection.h = this.h =  5400
		this.tilesize = 300
		this.numTiles = (this.w * this.h) / (this.tilesize**2)
		this.loadTiles(this.co)
	}
	else if (this.method == 'whole') {
		this.filename = 'assets/texture/NE2_LR_SR_W.png'
		this.projection.w = this.w = 2700
		this.projection.h = this.h = 1350
		this.loadImage()
	}
}

// -------- whole image

voyc.Texture.prototype.loadImage = function() {
	this.image = new Image()
	var self = this
	this.image.onload = function() {self.onImageLoaded()}
	this.image.crossOrigin = 'Anonymous'
	this.image.src = this.filename
	console.log(voyc.timer()+'whole image load start')
}
voyc.Texture.prototype.onImageLoaded = function() {
	console.log(voyc.timer()+'whole image load complete')
	//this.w = this.image.width
	//this.h = this.image.height
	//this.projection.w = this.w
	//this.projection.h = this.h

	// create canvas
	this.canvas = document.createElement('canvas')
	this.canvas.width = this.w
	this.canvas.height = this.h
	this.canvas.style.width  = this.w + 'px'
	this.canvas.style.height = this.h + 'px'
	this.ctx = this.canvas.getContext("2d")

	// copy the image onto the canvas
	this.ctx.drawImage(this.image, 0, 0)
	console.log(voyc.timer()+'whole image drawn')
	this.imgdata = this.ctx.getImageData(0, 0, this.w, this.h)
	console.log(voyc.timer()+'whole image imgdata acquired')
	this.ready = true
	if (this.cb)
		this.cb({
			distance: 0,
			lng: 0,
			lat: 0,
			state: 'loaded',
			fname: this.filename,
			pct:100,
		})
}

// -------- tiled

// alternative: Loading Images with Web Workers
// https://dev.to/trezy/loading-images-with-web-workers-49ap
// this.ctx.putImageData(imageData, dx, dy, dirtyX, dirtyY, dirtyWidth, dirtyHeight)

voyc.Texture.prototype.composeTilename = function(lng, lat) {
	function lzf(n,flen) {
		var s = n.toFixed()
		while (s.length < flen) 
			s = '0'+s
		return s
	}
	var slng = (lng < 0) ? 'm' : 'p'
	var slat = (lat < 0) ? 'm' : 'p'
	var alat = Math.abs(lat)
	var alng = Math.abs(lng)
	var name = `${slng}${lzf(alng,3)}${slat}${lzf(alat,2)}.png`
	return name
}

voyc.Texture.prototype.listTiles = function(co) {
	var cc = co[0]
	var rr = co[1]
	var distance = 0
	var list = []
	for (var r=+90; r>-90; r-=10) {
		for (var c=-180; c<+180; c+=10) {
			distance = Math.pow((((c-cc)**2) + ((r-rr)**2)),.5)
			list.push({
				distance: voyc.round(distance,2),
				lng: c,
				lat: r,
				state: 'queued',
				fname: this.composeTilename(c,r),
			})
		}
	}
	list.sort(function(a,b) { return a.distance - b.distance }) 
	return list
}

voyc.Texture.prototype.loadTiles = function(co) {
	console.log(voyc.timer()+'tiled image load started')
	this.imgdata = new ImageData(this.w,this.h)
	this.ready = true
	this.list = this.listTiles(co)
	this.path = this.filename
	this.loadGroup(10)
}

voyc.Texture.prototype.loadGroup = function(groupsize) {
	var num = 0
	this.numLoading = 0
	var self = this
	for (tile of this.list) {
		if (tile.state == 'queued') {
			tile = this.list[num]
			tile.img = new Image()
			tile.img.id = num+1
			tile.img.onload = function(evt) {self.onTileLoaded(evt)}
			tile.img.src = this.path + tile.fname
			tile.state = 'loading'
			this.numLoading += 1
			if (this.numLoading >= groupsize) 
				break
		}
		num += 1
	}
	console.log(voyc.timer()+`${this.numLoaded} tiles loaded`)
}
	
voyc.Texture.prototype.onTileLoaded = function(evt) {
	var tile = this.list[parseInt(evt.target.id)-1]
	log&&console.log(voyc.timer()+`tile ${evt.target.id} ${tile.lng} ${tile.lat} loaded`)
	tile.state = 'loaded'
	this.numLoaded += 1
	tile.pct = Math.floor((this.numLoaded / this.numTiles) * 100)

	// copy the image onto the canvas
	tile.pt = this.projection.project([tile.lng,tile.lat])  // hello

	// evidently, the only way to get the data out of an image is to draw it onto a canvas,
	// 	and then do a getImageData from the canvas
	tile.cvs = document.createElement('canvas')
	tile.cvs.width = this.tilesize
	tile.cvs.height= this.tilesize
	tile.ctx = tile.cvs.getContext('2d')
	tile.ctx.drawImage(tile.img, 0,0, this.tilesize,this.tilesize, 0,0, this.tilesize,this.tilesize)
	tile.imgdata = tile.ctx.getImageData(0,0, this.tilesize, this.tilesize)

	// copy directly onto the ImageData 
	this.copyTile(tile.imgdata, this.imgdata, tile.pt, this.tilesize)
	if (tile.pct == 100)
		console.log(voyc.timer()+`tiled image load complete`)
	if (this.cb)
		this.cb(tile)
	this.numLoading -= 1
	if (this.numLoading == 0 && (this.numLoaded < this.numTiles))
		this.loadGroup(20)
}

// -------- draw texturemap onto a destination canvas

voyc.Texture.prototype.draw = function(dst) {
	if (!this.ready)
		return
	// loop thru every pixel in the destination dst
	// dst is a layer object with these properties: projection, imageData, ctx, w, h
	var co = [];
	var pt = [];
	var wn = 0;
	var tn = 0;
	//console.log(voyc.timer()+'texture data copy start')  // 0027ms
	for (var y=0; y<(dst.h); y++) {
		for (var x=0; x<(dst.w); x++) {
			co = dst.projection.invert([x,y]);
			//if (!(isNaN(co[0]) || isNaN(co[1]))) {
			if (co[2]) {
				pt = this.projection.project(co)   // hello
				wn = (y * dst.w + x) * 4;
				tn = (Math.floor(pt[1]) * this.w + Math.floor(pt[0])) * 4;
				dst.imageData.data[wn + 0] = this.imgdata.data[tn + 0];
				dst.imageData.data[wn + 1] = this.imgdata.data[tn + 1];
				dst.imageData.data[wn + 2] = this.imgdata.data[tn + 2];
				if (!(this.imgdata.data[tn]+this.imgdata.data[tn+1]+this.imgdata.data[tn+3])) {
					//dst.imageData.data[wn + 3] = 0
					dst.imageData.data[wn + 0] = 255
					dst.imageData.data[wn + 1] = 0
					dst.imageData.data[wn + 2] = 0
					dst.imageData.data[wn + 3] = 255
				}
				else
					dst.imageData.data[wn + 3] = 255
			}
			else {
				wn = (y * dst.w + x) * 4;
				dst.imageData.data[wn + 3] = 0
			}
		}
	}
	//console.log(voyc.timer()+'texture data copy complete');  // 0015ms
	dst.ctx.putImageData(dst.imageData, 0, 0);
	//console.log(voyc.timer()+'texture data put complete');   // 0001ms
}

// copy a square tile imageData to a point in a destination imageData
voyc.Texture.prototype.copyTile = function(tile, dst, pt, sz) {
	var tn, dn, lng, lat
	for (var y=0; y<sz; y++) {
		lat = pt[1] + y
		for (var x=0; x<sz; x++) {
			lng = pt[0] + x
			dn = ((lat * this.w) + lng) * 4

			tn = ((y * sz) + x) * 4
			dst.data[dn+0] = tile.data[tn+0]
			dst.data[dn+1] = tile.data[tn+1]
			dst.data[dn+2] = tile.data[tn+2]
			dst.data[dn+3] = tile.data[tn+2]
		}
	}
}

// usage: console.log(voyc.timer()+'thing happened');
voyc.timer = function() {
	var leftfill = function(s,n) {
		var t = s.toString();
		while (t.length < n) {
			t = '0'+t;
		}
		return t;
	}
	if (!voyc.timer.starttime) {
		voyc.timer.timestamp = new Date();
		voyc.timer.starttime = voyc.timer.timestamp;
	}
	var tm = new Date();
	var elapsed = tm - voyc.timer.timestamp;
	voyc.timer.timestamp = tm;
	return voyc.timer.timestamp - voyc.timer.starttime + 'ms, ' + leftfill(elapsed,4) + 'ms ';
}
voyc.timer.starttime = 0
voyc.timer.timestamp = 0
