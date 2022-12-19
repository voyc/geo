/** 
	class World
	singleton
	represents the output display, multiple layered canvas elements
	@constructor 
*/
voyc.World = function() {
	this.elem = {};
	this.co = [];    // center [lng,lat]  E and N are positive
	this.gamma = 0;  // degrees rotation around the z-axis
	this.w = 0;
	this.h = 0;

	this.projection = {};
	this.layer = [];  // array of layer objects, layer is a canvas

	this.moved = true;
	this.dragging = false;
	
	this.scale = {}
//	this.scale = {
//		min = halfwid * this.defaultScale.minScaleFactor   // small number, zoomed out
//		max = halfwid * this.defaultScale.maxScaleFactor   // large number, zoomed in
//		factor = scalefactor
//		now = Math.round(halfwid * scalefactor)
//	}

	this.defaultScale = {
		minScaleFactor: .5,
		maxScaleFactor: 6,
		scaleStepPct: .14,  // percentage of scale
		spinStep: 6,  // degrees
	};
}

voyc.World.prototype.setup = function(elem, co, w, h, scalefactor) {
	this.elem = elem;
	this.w = w;
	this.h = h;
	this.co = JSON.parse(localStorage.getItem('co')) || co
	this.gamma = localStorage.getItem('gamma') || 0
	var scalefactor = localStorage.getItem('scalefactor') || scalefactor 

	this.setupScale(w,h,scalefactor)
	this.setupData()
	this.setupIterators()
	this.setupPalette()
	this.setupLayers()
	this.setupAnimation()
	
	this.projection = new voyc.DualProjection();
	this.projection.mix = localStorage.getItem('pro') || voyc.Projection.orthographic;

	this.projection.rotate([0-this.co[0], 0-this.co[1], 0-this.gamma]);
	this.projection.translate([this.w/2, this.h/2]);  // position the circle within the canvas (centered) in pixels
	this.projection.scale(this.scale.now);                  // size of the circle in pixels
}

// --------  public options

voyc.World.prototype.showHiRes = function(boo) {}

voyc.World.prototype.mercator = function() {
	this.projection.mix = voyc.Projection.mercator
	this.moved = true
	voyc.geosketch.render(0);
	this.stoPro()
}

voyc.World.prototype.orthographic = function() {
	this.projection.mix = voyc.Projection.orthographic
	this.moved = true
	voyc.geosketch.render(0);
	this.stoPro()
}

// --------  localStorage

voyc.World.prototype.stoPro = function() {
	localStorage.setItem('pro',this.projection.mix)
}
voyc.World.prototype.stoCo = function() {
	localStorage.setItem('co', JSON.stringify(this.co))
	localStorage.setItem('gamma',this.gamma)
	voyc.geosketch.hud.setCo(this.co,this.gamma)
}
voyc.World.prototype.stoScale = function() {
	localStorage.setItem('scalefactor',this.scale.factor)
}

// --------  scale

// called at startup
voyc.World.prototype.setupScale = function(w,h,scalefactor) {
	// scale = number of pixels to display the radius of the globe
	var halfwid = Math.round(Math.min(w, h) / 2)
	this.scale = {}
	this.scale.min = halfwid * this.defaultScale.minScaleFactor   // small number, zoomed out
	this.scale.max = halfwid * this.defaultScale.maxScaleFactor   // large number, zoomed in
	this.scale.factor = scalefactor
	this.scale.now = Math.round(halfwid * scalefactor)
}

// public zoom by increment, as with key arrow or mouse wheel
voyc.World.prototype.zoom = function(dir,pt) {
	pt = pt || false // if mousewheel, zoom centered on the mouse point
	var coOld = (pt) ? this.projection.invert(pt) : false
	var x = 0;
	switch(dir) {
		case voyc.Spin.IN: x = 1; break;
		case voyc.Spin.OUT: x = -1; break;
	}
	var newscale = Math.round(this.scale.now + (this.scale.now * x * this.defaultScale.scaleStepPct))
	newscale = voyc.clamp(newscale, this.scale.min, this.scale.max);
	this.setScale(newscale);
	if (pt) {
		var coNew = this.projection.invert(pt) // same point, new coord
		var rotation = voyc.subtractArray(coNew,coOld)
		this.co = voyc.subtractArray(this.co, rotation)
		this.co = this.clampCoord(this.co)
		this.moveToCoord(this.co)
	}
}

// public zoom to a specific scale, as with slider or setup
voyc.World.prototype.setScale = function(newscale) {
	this.scale.now = newscale || this.scale.now
	this.projection.scale(this.scale.now);
	
	//this.scale.factor = Math.round(this.scale.now / (Math.min(this.w,this.h) /2))
	this.scale.factor = parseFloat((this.scale.now / (Math.min(this.w,this.h) /2)).toFixed(2))

	voyc.geosketch.hud.setZoom(this.scale.now, this.scale.factor)
	this.stoScale()
	this.moved = true;
	voyc.geosketch.render(0);
}

// --------  public move

voyc.World.prototype.clampCoord = function(newco, oldco) {
	var lng = newco[0]
	var lat = newco[1]
	if (lng > 180) lng -= 360
	if (lng < -180) lng += 360 

	if (lat > 90) lat = 90
	if (lat < -90) lat = -90

	return [lng,lat]
}
voyc.World.prototype.clampGamma = function(gamma) {
	var newgamma = gamma
	if (newgamma >= 360)  newgamma -= 360
	if (newgamma <= -360) newgamma += 360 
	return newgamma
}

voyc.World.prototype.spin = function(dir) {
	switch(dir) {
		case voyc.Spin.LEFT : this.co[0] += this.defaultScale.spinStep; break;
		case voyc.Spin.RIGHT: this.co[0] -= this.defaultScale.spinStep; break;
		case voyc.Spin.UP   : this.co[1] += this.defaultScale.spinStep; break;
		case voyc.Spin.DOWN : this.co[1] -= this.defaultScale.spinStep; break;
		case voyc.Spin.CW   : this.gamma += this.defaultScale.spinStep; break;
		case voyc.Spin.CCW  : this.gamma -= this.defaultScale.spinStep; break;
	}
	this.co = this.clampCoord(this.co)
	this.gamma = this.clampGamma(this.gamma)
	this.moved = true;
	this.projection.rotate([0-this.co[0], 0-this.co[1], 0-this.gamma]);
	voyc.geosketch.render(0);
	this.stoCo()
}

voyc.World.prototype.grab = function(pt,prev) {
	this.dragging = true
	for (var id of ['empire','rivers','lakes','feature'].values())
		this.show(this.layer[id].e, false)
	this.animate(false)
}
voyc.World.prototype.drag = function(pt,prev) {
	var coNew = this.projection.invert(pt);
	var coOld = this.projection.invert(prev);
	var rotation = voyc.subtractArray(coNew,coOld)
	this.co = voyc.subtractArray(this.co, rotation)
	this.co = this.clampCoord(this.co)
	this.moveToCoord(this.co)
}
voyc.World.prototype.drop = function() {
	this.dragging = false
	this.moved = true
	//for (var id of ['empire','rivers','anima','feature'].values())
	for (var id of ['empire','rivers','lakes','feature'].values())
		this.show(this.layer[id].e, true)
	voyc.geosketch.render(0)  // more detailed drawing
	//this.animate(true)
}

//voyc.World.prototype.flipLat = function(co) {
//	// in projection, S is positive. Everywhere else, N is positive.
//	return [co[0], 0-co[1]]
//}

voyc.World.prototype.moveToPoint = function(pt) {
	var co = this.projection.invert(pt)
	this.moveToCoord(co)
}
voyc.World.prototype.moveToCoord = function(co) {
	this.co = co
	this.projection.rotate([0-co[0], 0-co[1]])
	this.moved = true;
	voyc.geosketch.render(0);
	this.stoCo()
}
//voyc.World.prototype.moveByVector = function(rotation) {
//	this.projection.rotateIncr(rotation)
//	this.moved = true
//	voyc.geosketch.render(0);
//	this.co = this.flipLat(this.projection.co)
//	this.stoCo()
//}

voyc.World.prototype.getCenterPoint = function() {
	return ([Math.round(this.w/2), Math.round(this.h/2)]);
}

// --------  setup data, iterators, and layers


voyc.World.prototype.setupData = function() {
	// topojson converts the arc format to the geometries format
	var worldtopo = voyc.data.worldtopo
	voyc.data.countries = topojson.object(worldtopo, worldtopo['objects']['countries']);
	voyc.data.land = {
		'name':'land',
		'type':'GeometryCollection',
		'geometries':[topojson.object(worldtopo, worldtopo['objects']['land'])]
	}

	// highlight
	voyc.data.hilite = {
		'name': 'hilite',
		'type': 'GeometryCollection',
		'geometries': []
	}

	// graticule
	voyc.data.grid = {
		'name': 'grid',
		'type': 'GeometryCollection',
		'geometries': [
			{ 'type': "LineString", 'scalerank': 2, 'featureclass': "Parallel", 'name': "Arctic Circle",  'coordinates': voyc.Geo.drawParallel([66.55772])},
			{ 'type': "LineString", 'scalerank': 2, 'featureclass': "Parallel", 'name': "Antarctic Circle",  'coordinates': voyc.Geo.drawParallel([-66.55772])},
			{ 'type': "LineString", 'scalerank': 2, 'featureclass': "Parallel", 'name': "Tropic of Cancer",  'coordinates': voyc.Geo.drawParallel([23.43715])},
			{ 'type': "LineString", 'scalerank': 2, 'featureclass': "Parallel", 'name': "Tropic of Capricorn",  'coordinates': voyc.Geo.drawParallel([-23.43715])},
			{ 'type': "LineString", 'scalerank': 2, 'featureclass': "Meridian", 'name': "90°E", 'coordinates': voyc.Geo.drawMeridian([90],true)},
			{ 'type': "LineString", 'scalerank': 2, 'featureclass': "Meridian", 'name': "90°W", 'coordinates': voyc.Geo.drawMeridian([-90],true)},
			
			{ 'type': "LineString", 'scalerank': 1, 'featureclass': "Parallel", 'name': "Equator",        'coordinates': voyc.Geo.drawParallel([0])},
			{ 'type': "LineString", 'scalerank': 1, 'featureclass': "Meridian", 'name': "Prime Meridian", 'coordinates': voyc.Geo.drawMeridian([0],true)},
			{ 'type': "LineString", 'scalerank': 1, 'featureclass': "Meridian", 'name': "Anti Meridian",  'coordinates': voyc.Geo.drawMeridian([180],true)},

		]
	}

	var geomlist = voyc.data.grid.geometries
	for (var lat=-80; lat<=80; lat+=10)
		if (lat != 0)
			geomlist.unshift( { 
				'type': "LineString", 'scalerank': 3, 
				'featureclass': "Parallel",
				'name': '', //String(Math.abs(lat)) + '°' + ((lat>0)?'N':'S'),
				'coordinates': voyc.Geo.drawParallel(lat),
			})
	for (var lng=-170; lng<=170; lng+=10)
		if (lng != 90 && lng != -90 && lng != 0)
			geomlist.unshift( { 
				'type': "LineString", 'scalerank': 3, 
				'featureclass': "Meridian",
				'name': '', //String(Math.abs(lng)) + '°' + ((lng>0)?'E':'W'),
				'coordinates': voyc.Geo.drawMeridian(lng),
			})
}

voyc.World.prototype.setupIterators = function() {
	this.iterator = {}
	this.iterator['count']   = new voyc.GeoIteratorCount()
	this.iterator['draw']    = new voyc.GeoIteratorDraw()
	this.iterator['animate'] = new voyc.GeoIteratorAnimate()
	this.iterator['hittest'] = new voyc.GeoIteratorHitTest()
}

voyc.World.prototype.setupLayers = function() {
	createLayerCanvas = function(id, dataid, useImageData, iterator, container) {
		var e = document.createElement('canvas')
		e.id = id
		e.classList.add('layer') 
		e.width  = self.w
		e.height = self.h
		e.style.width =  self.w + 'px'
		e.style.height = self.h + 'px'
		var cont = (container) ? self.layer[container].e : self.elem 
		cont.appendChild(e)

		var a = {}
		a.isOn = true
		a.type = 'canvas'
		a.e = e
		a.enabled = true
		a.iterator = self.iterator[iterator]
		a.data = voyc.data[dataid]
		a.palette = self.palette[dataid]  //[0]
		a.ctx = a.e.getContext("2d")
		if (useImageData) a.ctx.createImageData(self.w, self.h)
		self.layer[id] = a
	}

	createLayerDiv = function(id, container) {
		var e = document.createElement('div');
		e.id = id;
		e.classList.add('layer');
		e.style.width =  self.w + 'px';
		e.style.height = self.h + 'px';
		var cont = (container) ? self.layer[container].e : self.elem 
		cont.appendChild(e);
	
		var a = {};
		a.type = 'div'
		a.e = e
		a.enabled = true
		self.layer[id] = a
	}

	// layers are in created in display order from bottom to top
	// each layer can be turned on or off
	this.layer = {}
	var self = this
	createLayerDiv('background')  // static solid black style
	createLayerCanvas('water'           ,'water'           ,false ,'draw')
	createLayerCanvas('land'            ,'land'            ,false ,'draw')

	createLayerDiv('feature')
	createLayerCanvas('deserts'         ,'deserts'         ,false ,'draw', 'feature')
	createLayerCanvas('mountains'       ,'mountains'       ,false ,'draw', 'feature')

	createLayerCanvas('rivers'          ,'rivers'          ,false ,'draw')
	createLayerCanvas('lakes'            ,'lakes'          ,false ,'draw')

	//createLayerDiv('anima')
	//createLayerCanvas('anim1'           ,'rivers'          ,false ,'animate', 'anima')
	//createLayerCanvas('anim2'           ,'rivers'          ,false ,'animate', 'anima')
	//createLayerCanvas('anim3'           ,'rivers'          ,false ,'animate', 'anima')

	createLayerCanvas('empire'          ,'empire'          ,false ,'draw')
	createLayerCanvas('sketch'          ,'sketch'          ,false ,'draw')
	createLayerCanvas('grid'            ,'grid'            ,false ,'draw')
	createLayerCanvas('hilite'          ,'hilite'          ,false ,'draw')
}


voyc.World.prototype.enableLayer = function(layerid, boo) {
	var layer = this.layer[layerid]
	if (!layer)
		var x = 'debug me'
	layer.enabled = boo
	voyc.show(layer.e, boo)
	//this.moved = true
	//voyc.geosketch.render(0)
}

// --------  animation

voyc.World.prototype.setupAnimation = function() {
	this.animationlayer = []
	this.animationlayer[0] = this.layer['anim1']
	this.animationlayer[1] = this.layer['anim2']
	this.animationlayer[2] = this.layer['anim3']

	this.offset = 3
	this.skip = 3
	this.timer = false
	this.fps = 8
}

voyc.World.prototype.frameShift = function() {
	this.offset--
	if (this.offset <= 0)
		this.offset = this.skip
	var e = false
	for (var n=this.skip; n>0; n--) { 
		e = document.getElementById('anim'+n)
		if (n == this.offset) 
			this.show(e,true)
		else 	
			this.show(e,false)
	}
}
voyc.World.prototype.animate = function(boo) {
	return
	if (boo) {
		if (this.timer) {
			console.log(['attempting reanimate'])
			clearInterval(this.timer)
			this.timer = false
		}
		var self = this
		this.timer = setInterval(function() {
			self.frameShift()
		}, (1000/this.fps))
	}
	else {
		clearInterval(this.timer)
		this.timer = false
	}
}

// -------- ?

voyc.World.prototype.show = function(e,boo) {
	if (boo)
		e.classList.remove('hidden');
	else
		e.classList.add('hidden');
}

voyc.World.prototype.clearLayer = function(id) {
	this.layer[id].ctx.clearRect(0,0,this.w,this.h)
}

voyc.World.prototype.clearLayers = function() {
	for (var lay in this.layer) 
		this.layer[lay].ctx.clearRect(0,0,this.w,this.h)
}

voyc.World.prototype.testHit = function(pt) {
	var ret = false
	var geom =  this.iterator['hittest'].iterateCollection(voyc.data.grid, this.projection, pt);
	if (!geom)
		geom =  this.iterator['hittest'].iterateCollection(voyc.data.rivers, this.projection, pt);
	if (!geom)
		geom =  this.iterator['hittest'].iterateCollection(voyc.data.lakes, this.projection, pt);
	if (!geom)
		geom =  this.iterator['hittest'].iterateCollection(voyc.data.mountains, this.projection, pt);
	if (geom)
		this.drawHilite(geom)
		ret = geom.name
		if (voyc.geosketch.getOption('showid') && geom.id)
			ret += ' ('+geom.id+')'
	return ret
}

// --------  drawing

voyc.World.prototype.resize = function(w, h) {
	this.w = w;
	this.h = h;
	this.projection.translate([this.w/2, this.h/2]);
	var newscale = Math.round(this.scale.factor * (Math.min(this.w,this.h) /2))
	this.setScale(newscale)

	for (var id in this.layer) {
		a = this.layer[id];
		if (a.type == 'canvas') {
			a.ctx.canvas.width  = this.w;
			a.ctx.canvas.height = this.h;
			a.ctx.canvas.style.width =  this.w + 'px';
			a.ctx.canvas.style.height = this.h + 'px';
			//if (useImageData)
			//	a.imageData = a.ctx.createImageData(this.w, this.h);
		}
		else if (a.type == 'div') {
			a.e.style.width =  this.w + 'px';
			a.e.style.height = this.h + 'px';
		}
	}
}

voyc.World.prototype.draw = function() {
	if (this.moved) {
		this.drawWater();
		this.drawLayer('land')
		this.drawLayer('grid')
		this.drawLayer('sketch')
		this.drawLayer('hilite')
		if (!this.dragging) {
			//this.drawEmpire();
			this.drawFeatures();
			this.drawRiver();
			this.animate(true)
		}
	}
}

voyc.World.prototype.drawLayer = function(id) {
	var layer = this.layer[id]
	if (!layer.enabled) return

	var zoomScaleRank = this.calcRank(id) 

	layer.iterator.iterateCollection(
		layer.data, 
		this.projection, 
		layer.ctx, 
		layer.palette,
		zoomScaleRank)
}

voyc.World.prototype.calcRank = function(id) {
	// https://curriculum.voyc.com/doku.php?id=geosketch_design_notes#scale
	var table = this.palette[id]
	var scale = this.scale.now 
	var rank = table.length
	for (var r=0; r<table.length; r++) {
		if (scale < table[r].scale) {
			rank = r+1
			break
		}
	}
	return rank
}

voyc.World.prototype.drawWater = function() {
	var layer = this.layer['water']
	if (!layer.enabled) return
	var ctx = layer.ctx
	var palette = this.palette['water'][0]
	ctx.clearRect(0,0,ctx.canvas.width, ctx.canvas.height)
	ctx.beginPath();
	if (this.projection.mix == voyc.Projection.orthographic) // sphere
		ctx.arc(this.w/2, this.h/2, this.projection.k, 0*Math.PI, 2*Math.PI);
	else { // mercator rectangle
		nw = this.projection.project([-180,85])
		se = this.projection.project([180,-85])
		ctx.rect(nw[0], nw[1], se[0]-nw[0], se[1]-nw[1])
	}
	ctx.fillStyle = palette.fill
	ctx.fill()
}

voyc.World.prototype.drawRiver = function() {

	this.drawLayer('rivers')
	this.drawLayer('lakes')
	return

	var data = this.layer['rivers'].data
	var ctx  = this.layer['rivers'].ctx
	var palette = this.palette['animation'][0]
	iterator = this.animationlayer[0].iterator
	ctx = this.animationlayer[0].ctx
	iterator.iterateCollection(data, this.projection, ctx, palette, 1, 3);
	ctx = this.animationlayer[1].ctx
	iterator.iterateCollection(data, this.projection, ctx, palette, 2, 3);
	ctx = this.animationlayer[2].ctx
	iterator.iterateCollection(data, this.projection, ctx, palette, 3, 3);
	// rivers scale 0-6
}

voyc.World.prototype.drawHilite = function(geom) {
	this.enableLayer('hilite', true)
	voyc.data.hilite.geometries = [geom]
	this.drawLayer('hilite')
}
voyc.World.prototype.clearHilite = function() {
	this.enableLayer('hilite', false)
}

voyc.World.prototype.drawFeatures = function() {
	for (var id of ['deserts','mountains'].values())
		this.drawLayer(id)
}

voyc.World.prototype.setupPalette = function() {
	this.palette = voyc.defaultPalette
	for (var id in this.palette) {
		for (var palette of this.palette[id]) {
			palette.fill = voyc.prepString('rgb($1,$2,$3)', palette.fill)
			palette.stroke = voyc.prepString('rgb($1,$2,$3)', palette.stroke)
			if (palette.patfile)
				palette.pat = this.makePattern(voyc.geosketch.asset.get(palette.patfile), palette.fill)
		}
	}
}
voyc.World.prototype.makePattern = function( img, color) {
	// make a pattern in a hidden canvas from an image and a color
	// https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation#operations
	var canvas = document.createElement('canvas')
	canvas.width = img.width
	canvas.height = img.height
	var ctx = canvas.getContext('2d')

	// start with image
	var pat = ctx.createPattern(img, 'repeat')
	ctx.fillStyle =pat 
	ctx.fillRect(0,0,canvas.width,canvas.height)

	// mask in the color
	ctx.globalCompositeOperation = 'source-in'
	ctx.fillStyle = color
	ctx.fillRect(0,0,canvas.width,canvas.height)

	var pat = ctx.createPattern(canvas, 'repeat')
	return pat
}

/** @struct */
voyc.color = {
	water:    'rgb(111,166,207)',
	land:     'rgb(216,218,178)',
	desert:   'rgb(235,220,198)',
	highmntn: 'rgb(123,139,125)',
	grid:     'rgb(  0,  0,  0)',
	sketch:   'rgb(  0,  0,  0)',
}
/** @const */
voyc.empireColors = ['#f00', '#0f0', '#00f', '#ff0', '#0ff', '#f0f'];

/** @const */
voyc.sketchColors = ['#000', '#fff', '#f00', '#0f0', '#00f', '#ff0', '#0ff', '#f0f'];

/** @enum */
voyc.Spin = {
	STOP:0,
	CW:1,
	CCW:2,
	IN:3,
	OUT:4,
	RIGHT:5,
	LEFT:6,
	UP:7,
	DOWN:8,
}		
voyc.layers = {
	water:           'Oceans',
	land:            'Land',
	grid:            'Graticule',
	sketch:          'Sketch',
	empire:          'Historical',
	rivers1:          'Rivers1',
	rivers2:          'Rivers2',
	rivers3:          'Rivers3',
	rivers4:          'Rivers4',
	rivers5:          'Rivers5',
	rivers6:          'Rivers6',
	lakes:           'Lakes', 
	animation:       'Animation',
	deserts:         'Deserts',
	highmountains:   'Mountains',
}

voyc.defaultPalette = {
	bkgrd: [{scale:5000,isStroke:0, stroke:[  0,  0,  0], pen:.5, isFill:1, fill:[  0,  0,  0]},],
	water: [{scale:5000,isStroke:0, stroke:[  0,  0,  0], pen:.5, isFill:1, fill:[111,166,207]},],
	land:  [{scale:5000,isStroke:0, stroke:[  0,  0,  0], pen:.5, isFill:1, fill:[216,218,178]},],
	grid:  [
		{scale: 300,isStroke:1, stroke:[255,255,255], pen:2.5,isFill:0, fill:[  0,  0,  0]},
		{scale: 900,isStroke:1, stroke:[255,255,255], pen:1.5,isFill:0, fill:[  0,  0,  0]},
		{scale:5000,isStroke:1, stroke:[255,255,255], pen:.5, isFill:0, fill:[  0,  0,  0]},
	],
	sketch:[{scale:5000,isStroke:1, stroke:[  0,  0,  0], pen:.5, isFill:0, fill:[  0,  0,  0]},],
	empire:[{scale:5000,isStroke:1, stroke:[128,128,  0], pen:.5, isFill:0, fill:[  0,  0,  0]},],
	rivers: [
		{scale: 242,isStroke:1, stroke:[  0,  0,255], pen:5 , isFill:0, fill:[  0,  0,  0]},
		{scale: 531,isStroke:1, stroke:[  0,  0,255], pen:4 , isFill:0, fill:[  0,  0,  0]},
		{scale: 897,isStroke:1, stroke:[  0,  0,255], pen:3 , isFill:0, fill:[  0,  0,  0]},
		{scale:1329,isStroke:1, stroke:[  0,  0,255], pen:2 , isFill:0, fill:[  0,  0,  0]},
		{scale:1969,isStroke:1, stroke:[  0,  0,255], pen:1 , isFill:0, fill:[  0,  0,  0]},
		{scale:2904,isStroke:1, stroke:[  0,  0,255], pen:.5, isFill:0, fill:[  0,  0,  0]},
	],
	lakes:           [{scale:5000,isStroke:0, stroke:[  0,  0,255], pen:2 , isFill:1, fill:[  0,  0,255]},],
	animation:       [{scale:5000,isStroke:1, stroke:[255,  0,  0], pen:.5, isFill:0, fill:[  0,  0,  0]},],
	deserts:         [{scale:5000,isStroke:0, stroke:[  0,  0,255], pen:2 , isFill:1, fill:[ 96, 96,  0], pat:false, patfile:'deserts'},],

	mountains:       [
		{scale: 300,isStroke:0, stroke:[  0,  0,255], pen:2 , isFill:1, fill:[ 96,  0,  0], pat:false, patfile:'mountains_1'},
		{scale:1000,isStroke:0, stroke:[  0,  0,255], pen:2 , isFill:1, fill:[ 96,  0,  0], pat:false, patfile:'mountains_2'},
		{scale:5000,isStroke:0, stroke:[  0,  0,255], pen:2 , isFill:1, fill:[ 96,  0,  0], pat:false, patfile:'mountains_3'},
	],
	hilite:          [{scale:5000,isStroke:1, stroke:[255,  0,  0], pen:10, isFill:0, fill:[  0,  0,  0]},],
}
