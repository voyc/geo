/* 
	class World
	singleton
	manages the map display, multiple layered canvas elements
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
	this.nodraglayers = ['empire','rivers','lakes','deserts', 'mountains']
	
	this.scale = {}

	this.animation = []
	this.counter = 0

	this.time = {
		begin: -3000,
		end: 2023,  // current year
		now: 2023,  // current year
		step: 10,
		moved: false,
		sliding: false,
		speed: 10 // years per second	
	}
}

voyc.World.prototype.setup = function(elem, co, w, h, scalefactor) {
	this.elem = elem;
	this.w = w;
	this.h = h;
	this.co = JSON.parse(localStorage.getItem('co')) || co
	this.gamma = localStorage.getItem('gamma') || 0
	var scalefactor = localStorage.getItem('scalefactor') || scalefactor 
	this.time.now = localStorage.getItem('timenow') || this.time.now 

	this.palette = JSON.parse(localStorage.getItem('palette'))
	if (!this.palette) {
		this.palette = voyc.clone(voyc.defaultPalette)
		this.stoPal() // palette is stored in string form, before pattern creation
	}
	this.setupPalette()

	this.setupScale(w,h,scalefactor)
	this.setupData()
	this.setupIterators()

	this.setupLayers()

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
	voyc.geosketch.render(0)
	this.stoPro()
}

voyc.World.prototype.orthographic = function() {
	this.projection.mix = voyc.Projection.orthographic
	this.moved = true
	voyc.geosketch.render(0)
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
voyc.World.prototype.stoTime = function() {
	localStorage.setItem('timenow',this.time.now)
}
voyc.World.prototype.stoPal = function() {
	localStorage.setItem('palette', JSON.stringify(this.palette))
}
voyc.World.prototype.stoLay = function() {
	var stolay = {}
	for (key of Object.keys(this.layer))
		stolay[key] = this.layer[key].enabled
	localStorage.setItem('layers', JSON.stringify(stolay))
}

// --------  time

voyc.World.prototype.setTime = function(newtime) {
	this.time.now = newtime
	voyc.geosketch.hud.setTime(this.time.now)
	this.time.moved = true
	voyc.geosketch.render(0)
	this.stoTime()	
}

voyc.World.prototype.stepTime = function(boo) {
	var incr = (boo) ? this.time.step : 0-this.time.step
	var newtime = this.time.now + incr
	this.setTime(newtime)
}

voyc.World.prototype.grabTime = function(evt) {
	this.time.sliding = true
}

//voyc.World.prototype.moveTime = function(evt) {
//	this.time.sliding = true
//}

voyc.World.prototype.dropTime = function(evt) {
	this.time.sliding = false 
}

// --------  scale

// called at startup
voyc.World.prototype.setupScale = function(w,h,scalefactor) {
	// scale = number of pixels to display the radius of the globe
	var halfwid = Math.round(Math.min(w, h) / 2)
	this.scale = {}
	this.scale.min = halfwid * voyc.defaultScale.minScaleFactor   // small number, zoomed out
	this.scale.max = halfwid * voyc.defaultScale.maxScaleFactor   // large number, zoomed in
	this.scale.factor = scalefactor
	this.scale.now = Math.round(halfwid * scalefactor)
}

// public zoom by increment, as with key arrow or mouse wheel
voyc.World.prototype.zoom = function(dir,pt) {
	pt = pt || false // if mousewheel, zoom centered on the mouse point
	var coOld = (pt) ? this.projection.invert(pt) : false
	var x = 0;
	switch(dir) {
		case voyc.spin.IN: x = 1; break;
		case voyc.spin.OUT: x = -1; break;
	}
	var newscale = Math.round(this.scale.now + (this.scale.now * x * voyc.defaultScale.scaleStepPct))
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
	voyc.geosketch.render(0)
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
		case voyc.spin.LEFT : this.co[0] += voyc.defaultScale.spinStep; break;
		case voyc.spin.RIGHT: this.co[0] -= voyc.defaultScale.spinStep; break;
		case voyc.spin.UP   : this.co[1] += voyc.defaultScale.spinStep; break;
		case voyc.spin.DOWN : this.co[1] -= voyc.defaultScale.spinStep; break;
		case voyc.spin.CW   : this.gamma += voyc.defaultScale.spinStep; break;
		case voyc.spin.CCW  : this.gamma -= voyc.defaultScale.spinStep; break;
	}
	this.co = this.clampCoord(this.co)
	this.gamma = this.clampGamma(this.gamma)
	this.projection.rotate([0-this.co[0], 0-this.co[1], 0-this.gamma]);
	this.moved = true;
	voyc.geosketch.render(0)
	this.stoCo()
}

voyc.World.prototype.grab = function(pt,prev) {
	this.dragging = true
	for (var id of this.nodraglayers.values())
		this.showLayer(this.layer[id].e, false)
	//this.animate(false)
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
	for (var id of this.nodraglayers.values())
		if (this.layer[id].enabled)
			this.showLayer(this.layer[id].e, true)
	this.moved = true
	voyc.geosketch.render(0)  // more detailed drawing
}

voyc.World.prototype.moveToPoint = function(pt) {
	var co = this.projection.invert(pt)
	this.moveToCoord(co)
}
voyc.World.prototype.moveToCoord = function(co) {
	this.co = co
	this.projection.rotate([0-co[0], 0-co[1]])
	this.moved = true
	voyc.geosketch.render(0)
	this.stoCo()
}

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

	voyc.data.custom01 = {"name":"custom01", "type": "GeometryCollection","geometries":[
		{type:'Point',b:-2560,e:-2560,score:1000,cap:0,id:14444,name:'Great Pyramid of Giza',coordinates:[31.134,29.979]},
		{type:'MultiPoint',b:-2600,e:-1900,score:1000,cap:0,id:1447774,name:'Harappa, Mohenjo Daro',coordinates:[[72.868,30.631],[68.136,27.324]]},
		{type:'LineString',scalerank:1,featureclass:'Parallel',name:'Equator',coordinates:[[-180,0],[-170,0],[-160,0],[-150,0],[-140,0],[-130,0],[-120,0],[-110,0],[-100,0],[-90,0],[-80,0],[-70,0],[-60,0],[-50,0],[-40,0],[-30,0],[-20,0],[-10,0],[0,0],[10,0],[20,0],[30,0],[40,0],[50,0],[60,0],[70,0],[80,0],[90,0],[100,0],[110,0],[120,0],[130,0],[140,0],[150,0],[160,0],[170,0],[180,0]]},
		{type:'MultiLineString',id:109,name:'Albert Nile',coordinates:[[[32.015855,3.613656],[31.935343,3.528002],[31.885114,3.508391],[31.838501,3.526271],[31.784655,3.522989],[31.72378,3.498598],[31.623838,3.363283],[31.484828,3.117019],[31.404316,2.950725],[31.382095,2.864322],[31.387573,2.804015],[31.420646,2.769702],[31.433772,2.718749],[31.42695,2.651208],[31.449895,2.588318],[31.502501,2.530078],[31.515317,2.475922],[31.474803,2.400732]]]},
		{type:'Polygon',id:1,name:'Mesopotamia',b:-4000,e:-1950,fb:0,c:5,coordinates:[[[41.904411,27.702338],[41.805987,29.078789],[43.001109,29.761618],[44.359202,29.393941],[45.174058,28.606062],[44.956763,27.555557],[44.087583,26.820204],[42.512195,26.662628],[41.904411,27.702338]]], },
	//	{type:'MultiPolygon',id:18843,name:'Egypt',b:-1560,e:-1070,fb:3,c:2,coordinates:[[[[26.502052,29.016168],[26.502052,31.136625],[28.955884,30.82472],[32.11083,31.130038],[32.92501,29.705223],[32.92501,28.992816],[33.840962,27.873319],[34.451597,26.143187],[35.475377,24.143486],[34.179207,23.993073],[33.549932,23.390302],[33.298222,22.78753],[33.235295,21.314089],[32.794802,20.175521],[32.731875,18.501156],[32.35431,17.697461],[31.85089,17.362588],[29.963065,17.295613],[29.145007,18.501156],[29.145007,22.385683],[29.33379,22.92148],[29.207935,24.260971],[27.005472,27.073904],[26.502052,29.016168]]],[[[32.57655,30.841031],[32.799517,31.119739],[33.356934,31.286965],[34.025835,31.119739],[34.360286,31.286965],[34.896775,32.136976],[34.997264,32.030024],[35.154583,31.360278],[35.060192,30.958431],[33.073997,29.497922],[32.57655,30.841031]]]],},
	]}

	// highlight
	voyc.data.hilite = {
		'name': 'hilite',
		'type': 'GeometryCollection',
		'geometries': []
	}

	// sketch
	voyc.data.sketch = {
		'name': 'sketch',
		'type': 'GeometryCollection',
		'geometries': []
	}
}

voyc.World.prototype.setupIterators = function() {
	this.iterator = {}
	this.iterator['count']   = new voyc.GeoIteratorCount()
	this.iterator['clip']    = new voyc.GeoIteratorClip()
	this.iterator['scale']   = new voyc.GeoIteratorScale()
	this.iterator['animate'] = new voyc.GeoIteratorAnimate()
	this.iterator['hittest'] = new voyc.GeoIteratorHitTest()
	this.iterator['empire']  = new voyc.GeoIteratorEmpire()
	this.iterator['sketch']  = new voyc.GeoIteratorSketch()
	this.iterator['custom']  = new voyc.GeoIteratorCustom()
}

voyc.World.prototype.setupLayers = function() {
	createLayerCanvas = function(id, menulabel, dataid, useImageData, iterator, container, offset) {
		// create the html element
		var e = document.createElement('canvas')
		e.id = id
		e.classList.add('layer') 
		e.width  = self.w
		e.height = self.h
		e.style.width =  self.w + 'px'
		e.style.height = self.h + 'px'
		var cont = (container) ? self.layer[container].e : self.elem 
		cont.appendChild(e)

		// create the layer array element
		var a = {}
//		a.isOn = true
		a.menulabel = menulabel
		a.offset = offset
		a.type = 'canvas'
		a.e = e
		a.enabled = true
		a.iterator = self.iterator[iterator]
		a.data = voyc.data[dataid]
		a.palette = self.palette[dataid]  //[0]
		a.ctx = a.e.getContext("2d")
		if (useImageData) a.ctx.createImageData(self.w, self.h)
		self.layer[id] = a
		if (offset) {
			a.overlays = createLayerAnimation( id, offset)
			self.animation = a.overlays
		}
	}

	createLayerAnimation = function(id, offset) {
		var e = document.createElement('div')
		e.setAttribute('group', id)
		e.classList.add('layer');
		e.style.width =  self.w + 'px';
		e.style.height = self.h + 'px';
		self.elem.appendChild(e);
		e.appendChild(document.getElementById(id))
		var container = e

		// create an array of html elements
		var a = []
		for (var i=0; i<offset; i++) {
			var e = document.createElement('canvas')
			e.setAttribute('group', id)
			e.id = id + '_' + i
			e.classList.add('layer') 
			e.width  = self.w
			e.height = self.h
			e.style.width =  self.w + 'px'
			e.style.height = self.h + 'px'
			container.appendChild(e)
			a[i] = e
		}
		return a
	}

	createLayerDiv = function(id, menulabel, container) {
		// create the html element
		var e = document.createElement('div');
		e.id = id;
		e.menulabel = menulabel
		e.classList.add('layer');
		e.style.width =  self.w + 'px';
		e.style.height = self.h + 'px';
		var cont = (container) ? self.layer[container].e : self.elem 
		cont.appendChild(e);
	
		// create the layer array element
		var a = {};
		a.type = 'div'
		a.menulabel = menulabel
		a.e = e
		a.enabled = true
		self.layer[id] = a
	}

	// layers are in created in display order from bottom to top
	// each layer can be turned on or off
	this.layer = {}
	var self = this
	//                 id         ,menulabel   ,dataid      ,img   ,iterator ,group  ,offset
	createLayerDiv   ('background',false       ,false       ,false ,false    ,false       ,0)
	createLayerCanvas('water'     ,'Oceans'    ,'water'     ,false ,'clip'   ,false       ,0)
	createLayerCanvas('land'      ,'Land'      ,'land'      ,false ,'clip'   ,false       ,0)
	createLayerCanvas('deserts'   ,'Deserts'   ,'deserts'   ,false ,'clip'   ,false       ,0)
	createLayerCanvas('mountains' ,'Mountains' ,'mountains' ,false ,'scale'  ,false       ,0)
	createLayerCanvas('lakes'     ,'Lakes'     ,'lakes'     ,false ,'clip'   ,false       ,0)
	createLayerCanvas('rivers'    ,'Rivers'    ,'rivers'    ,false ,'scale'  ,false       ,6)
	createLayerCanvas('empire'    ,'Historical','empire'    ,false ,'empire' ,false       ,0)
	createLayerCanvas('grid'      ,'Grid'      ,'grid'      ,false ,'scale'  ,false       ,0)
	createLayerCanvas('hilite'    ,false       ,'hilite'    ,false ,'clip'   ,false       ,0)
	createLayerCanvas('sketch'    ,false       ,'sketch'    ,false ,'sketch' ,false       ,0)
	createLayerCanvas('custom01'  ,'Custom 1'  ,'custom01'  ,false ,'custom' ,false       ,0)

	var stolay = JSON.parse(localStorage.getItem('layers'))
	if (stolay)
		for (key of Object.keys(stolay))
			this.layer[key].enabled = stolay[key]
	else
		this.stoLay()
}


voyc.World.prototype.enableLayer = function(layerid, boo) {
	var layer = this.layer[layerid]
	layer.enabled = boo
	this.showLayer(layer.e, boo)
	if (layer.offset) {
		var group = document.querySelectorAll(`[group=${layerid}]`)
		for (e of group)
			this.showLayer(e, boo)
	}
	this.moved = true
	voyc.geosketch.render(0)
	this.stoLay()
}

voyc.World.prototype.showLayer = function(e,boo) {
	voyc.show(e,boo)
}

voyc.World.prototype.clearLayer = function(id) {
	this.layer[id].ctx.clearRect(0,0,this.w,this.h)
}

voyc.World.prototype.clearLayers = function() {
	for (var lay in this.layer) 
		this.layer[lay].ctx.clearRect(0,0,this.w,this.h)
}

// --------  animation

voyc.World.prototype.stepFrame = function() {
	if (!this.animation.length) return
	++this.counter 
	if (this.counter >= this.animation.length)
		this.counter=0
	for (var i=0; i<this.animation.length; i++)
		this.showLayer(this.animation[i], this.counter==i)
}


// -------- hit

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
	this.moved = true
	voyc.geosketch.render(0)
}


voyc.World.prototype.drawWorld = function() {
	this.stepFrame()  // animate rivers

	if (this.moved) {
		this.drawWater();
		this.drawLayer('land')
		this.drawLayer('grid')
		this.drawSketch()
		this.drawLayer('hilite')
		this.drawCustom()
		if (!this.dragging) {
			this.drawLayer('deserts')
			this.drawLayer('mountains')
			this.drawRiver()
			this.drawLayer('lakes')
			this.drawEmpire()
		}
	}
	else if (this.time.moved)
		this.drawEmpire()

	this.moved = false
	this.time.moved = false
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

voyc.World.prototype.drawSketch = function(pt) {
	var layer = this.layer['sketch']
	var self = this
	function draw(shape,pt) {
		layer.iterator.iterateCollection(
			layer.data, 
			self.projection, 
			layer.ctx, 
			layer.palette,
			shape,
			pt)
	}
	this.clearLayer('sketch')
	//draw('polygon')
	draw('line', pt)
	draw('point', pt)
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
	var id = 'rivers'
	var layer = this.layer[id]
	if (!layer.enabled) return

	var zoomScaleRank = this.calcRank(id) 

	layer.iterator.iterateCollection(
		layer.data, 
		this.projection, 
		layer.ctx, 
		layer.palette,
		zoomScaleRank)

	for (var i=0; i<this.layer[id].offset; i++)
		this.iterator['animate'].iterateCollection(
			layer.data, 
			this.projection, 
			this.layer.rivers.overlays[i].getContext("2d"),
			layer.palette,
			zoomScaleRank,
			i)
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

voyc.World.prototype.drawEmpire = function() {
	var layer = this.layer['empire']
	if (!layer.enabled) return
	layer.iterator.iterateCollection(
		layer.data, 
		this.projection, 
		layer.ctx, 
		layer.palette,
		this.time.now)
}

voyc.World.prototype.drawCustom = function() {
	var layer = this.layer['custom01']
	if (!layer.enabled) return
	layer.iterator.iterateCollection(
		layer.data, 
		this.projection, 
		layer.ctx, 
		this.palette['custom'])
}

voyc.World.prototype.setupPalette = function() {
	//this.palette = voyc.clone(voyc.defaultPalette)
	for (var id in this.palette) {
		for (var palette of this.palette[id]) {
			if (palette.fill) palette.fill = voyc.prepString('rgb($1,$2,$3)', palette.fill)
			if (palette.ptFill) palette.ptFill = voyc.prepString('rgb($1,$2,$3)', palette.ptFill)
			if (palette.stroke) palette.stroke = voyc.prepString('rgb($1,$2,$3)', palette.stroke)
			if (palette.ptStroke) palette.ptStroke = voyc.prepString('rgb($1,$2,$3)', palette.ptStroke)
			if (palette.lnStroke) palette.lnStroke = voyc.prepString('rgb($1,$2,$3)', palette.lnStroke)
			if (palette.patfile)
				palette.pat = this.makePattern(voyc.geosketch.asset.get(palette.patfile), palette.fill)
		}
	}
}
voyc.World.prototype.makePattern = function( img, color) {
	// make a pattern in a hidden canvas from an image and a color
	// https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation#operations
	// see also ctx.scale()

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

voyc.empireColors = ['#f00', '#0f0', '#00f', '#ff0', '#0ff', '#f0f'];

voyc.sketchColors = ['#000', '#fff', '#f00', '#0f0', '#00f', '#ff0', '#0ff', '#f0f'];

voyc.spin = {
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

voyc.defaultScale = {
	minScaleFactor: .5,  // small number, zoomed out
	maxScaleFactor: 6,   // large number, zoomed in
	scaleStepPct: .14,
	spinStep: 6,
}
voyc.defaultPalette = {
	bkgrd: [{scale:5000, stroke:false,         pen:.5, fill:[  0,  0,  0], pat:false, patfile:false         ,opac: 1, lnStroke:false        , lnPen: 1, ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },],
	water: [{scale:5000, stroke:false,         pen:.5, fill:[111,166,207], pat:false, patfile:false         ,opac: 1, lnStroke:false        , lnPen: 1, ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },],
	land:  [{scale:5000, stroke:false,         pen:.5, fill:[216,218,178], pat:false, patfile:false         ,opac: 1, lnStroke:false        , lnPen: 1, ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },],
	grid:  [
		{scale: 300, stroke:[255,255,255], pen:2.5,fill:false        , pat:false, patfile:false         ,opac: 1, lnStroke:false        , lnPen: 1, ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },
		{scale: 900, stroke:[255,255,255], pen:1.5,fill:false        , pat:false, patfile:false         ,opac: 1, lnStroke:false        , lnPen: 1, ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },
		{scale:5000, stroke:[255,255,255], pen:.5, fill:false        , pat:false, patfile:false         ,opac: 1, lnStroke:false        , lnPen: 1, ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },
	],
	empire:[
		{scale:5000, stroke:false,         pen:.5, fill:[255,  0,  0], pat:false, patfile:false         ,opac: 1, lnStroke:false        , lnPen: 1, ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },
		{scale:5000, stroke:false,         pen:.5, fill:[  0,255,  0], pat:false, patfile:false         ,opac: 1, lnStroke:false        , lnPen: 1, ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },
		{scale:5000, stroke:false,         pen:.5, fill:[  0,  0,255], pat:false, patfile:false         ,opac: 1, lnStroke:false        , lnPen: 1, ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },
		{scale:5000, stroke:false,         pen:.5, fill:[255,  0,255], pat:false, patfile:false         ,opac: 1, lnStroke:false        , lnPen: 1, ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },
		{scale:5000, stroke:false,         pen:.5, fill:[255,255,  0], pat:false, patfile:false         ,opac: 1, lnStroke:false        , lnPen: 1, ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },
		{scale:5000, stroke:false,         pen:.5, fill:[  0,255,255], pat:false, patfile:false         ,opac: 1, lnStroke:false        , lnPen: 1, ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },
	],
	rivers: [
		{scale: 242, stroke:[  0,  0,255], pen:5 , fill:false        , pat:false, patfile:false         ,opac: 1, lnStroke:false        , lnPen: 1, ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },
		{scale: 531, stroke:[  0,  0,255], pen:4 , fill:false        , pat:false, patfile:false         ,opac: 1, lnStroke:false        , lnPen: 1, ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },
		{scale: 897, stroke:[  0,  0,255], pen:3 , fill:false        , pat:false, patfile:false         ,opac: 1, lnStroke:false        , lnPen: 1, ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },
		{scale:1329, stroke:[  0,  0,255], pen:2 , fill:false        , pat:false, patfile:false         ,opac: 1, lnStroke:false        , lnPen: 1, ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },
		{scale:1969, stroke:[  0,  0,255], pen:1 , fill:false        , pat:false, patfile:false         ,opac: 1, lnStroke:false        , lnPen: 1, ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },
		{scale:2904, stroke:[  0,  0,255], pen:.5, fill:false        , pat:false, patfile:false         ,opac: 1, lnStroke:false        , lnPen: 1, ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },
	],
	lakes: [{scale:5000, stroke:false,         pen:2 , fill:[  0,  0,255]},],
       deserts:[{scale:5000, stroke:false,         pen:2 , fill:[ 96, 96,  0], pat:false, patfile:'deserts'     ,opac: 1, lnStroke:false        , lnPen: 1, ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },],
	mountains:[
		{scale: 300, stroke:false,         pen:2 , fill:[ 96,  0,  0], pat:false, patfile:'mountains_1' ,opac: 1, lnStroke:false        , lnPen: 1, ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },
		{scale:1000, stroke:false,         pen:2 , fill:[ 96,  0,  0], pat:false, patfile:'mountains_2' ,opac: 1, lnStroke:false        , lnPen: 1, ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },
		{scale:5000, stroke:false,         pen:2 , fill:[ 96,  0,  0], pat:false, patfile:'mountains_3' ,opac: 1, lnStroke:false        , lnPen: 1, ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },
	],
	hilite:[{scale:5000, stroke:[255,  0,  0], pen:10, fill:false        , pat:false, patfile:false         ,opac: 1, lnStroke:[255,  0,  0], lnPen: 2, ptRadius:10,ptStroke:[255,  0,  0], ptPen: 1, ptFill:[255,  0,  0]},],
	sketch:[{scale:5000, stroke:[  0,  0,  0], pen:.5, fill:[255,  0,  0], pat:false, patfile:false         ,opac:.5, lnStroke:[  0,  0,  0], lnPen:.5, ptRadius:5, ptStroke:[  0,  0,  0], ptPen:.5, ptFill:[  0,255,  0]},],
	custom:[{scale:5000, stroke:[255,  0,255], pen:10, fill:[255,  0,  0], pat:false, patfile:false         ,opac:.5, lnStroke:[255,255,  0], lnPen: 7, ptRadius:5, ptStroke:[  0,  0,255], ptPen: 2, ptFill:[  0,255,  0]},],
}
