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
	this.mercwidth = 0

	this.projection = {};
	this.layer = [];  // array of layer objects, layer is a canvas

	this.moved = true;
	this.dragging = false;
	this.nodraglayers = ['empire','rivers','lakes','deserts', 'mountains','countries','cities','hires','lores']
	this.hitlayers = ['cities','custom01','rivers','lakes','deserts','mountains','empire','countries']

	this.zoom = voyc.defaultZoom

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

	this.texlo = {}
	this.texhi = {}
}

voyc.World.prototype.setup = function(elem, co, w, h, zoom) {
	this.elem = elem;
	this.w = w;
	this.h = h;
	this.co = JSON.parse(localStorage.getItem('co')) || co
	this.gamma = localStorage.getItem('gamma') || 0
	this.time.now = localStorage.getItem('timenow') || this.time.now 

	var startzoom = localStorage.getItem('zoom') 
	if (startzoom === 'null')
		startzoom = zoom
	startzoom = Number(startzoom)
	this.setupZoom(startzoom)

	this.palette = JSON.parse(localStorage.getItem('palette'))
	if (!this.palette) {
		this.palette = voyc.clone(voyc.defaultPalette)
		this.stoPal() // palette is stored in string form, before pattern creation
	}
	this.setupPalette()

	this.setupData()
	this.setupIterators()

	this.setupLayers()

	this.projection = new voyc.DualProjection()
	this.projection.projtype = localStorage.getItem('pro') || 'orthographic'

	this.projection.rotate([0-this.co[0], 0-this.co[1], 0-this.gamma]);
	this.projection.translate([this.w/2, this.h/2]);  // position the circle within the canvas (centered) in pixels
	this.projection.scale(this.zoom.now)              // zoom level, .25-6 (corresponding to google's 0-20)

	this.texhi = new voyc.Texture()
	this.texlo = new voyc.Texture()
	var self = this
	this.texlo.load('whole', this.co, function(row) {
		if (voyc.geosketch.options.hires) {
			self.texhi.load('tiled', this.co, function(row) {
				voyc.$('loadpct').innerHTML = `${row.pct}`
				if (!(self.texhi.numLoaded % 10) || row.pct == 100) {
					self.moved = true
					voyc.geosketch.render(0)
				}
			})
		}
	})
}

// --------  public options

voyc.World.prototype.showHiRes = function(boo) {}

voyc.World.prototype.setProjType = function(projtype) {
	this.projection.setProjType(projtype)
	this.moved = true
	voyc.geosketch.render(0)
	this.stoPro()
}

// --------  localStorage

voyc.World.prototype.stoPro = function() {
	localStorage.setItem('pro',this.projection.projtype)
}
voyc.World.prototype.stoCo = function() {
	localStorage.setItem('co', JSON.stringify(this.co))
	localStorage.setItem('gamma',this.gamma)
	voyc.geosketch.hud.setCo(this.co,this.gamma)
}
voyc.World.prototype.stoZoom = function() {
	localStorage.setItem('zoom',this.zoom.now)
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

// --------  zoom

// called at startup
voyc.World.prototype.setupZoom = function(startzoom) {
	this.zoom.now = startzoom
	if (voyc.geosketch.options.devzoom) {
		this.zoom.min = voyc.devZoom.min
		this.zoom.max = voyc.devZoom.max
	}
}

// public zoom by increment, as with key arrow or mouse wheel
voyc.World.prototype.stepZoom = function(dir,pt,coarse) {
	coarse = coarse || false
	pt = pt || false // if mousewheel, zoom centered on the mouse point
	var coOld = (pt) ? this.projection.invert(pt) : false
	var x = 0;
	switch(dir) {
		case voyc.spin.IN: x = 1; break;
		case voyc.spin.OUT: x = -1; break;
	}
	var step = (coarse) ? this.zoom.bigstep : this.zoom.babystep
	var newzoom = this.zoom.now + (x * step)
	newzoom = voyc.clamp(newzoom, this.zoom.min, this.zoom.max)
	this.setZoom(newzoom)
	if (pt) {
		var coNew = this.projection.invert(pt) // same point, new coord
		var rotation = voyc.subtractArray(coNew,coOld)
		this.co = voyc.subtractArray(this.co, rotation)
		this.co = this.clampCoord(this.co)
		this.moveToCoord(this.co)
	}
}

// public zoom to a specific zoom level, as with slider or setup
voyc.World.prototype.setZoom = function(newzoom) {
	if (typeof(newzoom) != 'undefined')
		this.zoom.now = newzoom
	this.projection.scale(this.zoom.now)
	
	voyc.geosketch.hud.setZoomer(this.zoom.now, this.projection.uscale)
	this.stoZoom()
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
		case voyc.spin.LEFT : this.co[0] += voyc.defaultSpin.step; break;
		case voyc.spin.RIGHT: this.co[0] -= voyc.defaultSpin.step; break;
		case voyc.spin.UP   : this.co[1] += voyc.defaultSpin.step; break;
		case voyc.spin.DOWN : this.co[1] -= voyc.defaultSpin.step; break;
		case voyc.spin.CW   : this.gamma += voyc.defaultSpin.step; break;
		case voyc.spin.CCW  : this.gamma -= voyc.defaultSpin.step; break;
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
	if (co[2])
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
	voyc.data.land.geometries.push({type:'Polygon',coordinates:[[[-180,-84],[180,-84],[180,-90],[-180,-90],[-180,-84]]]})

	voyc.data.hires = {
		name: 'hires',
		type: 'GeometryCollection',
		geometries: [
			{ type: 'Polygon', sr: 2, fc: 'Tile', name: 'Himalaya', coordinates: [[[80,30],[90,30],[90,20],[80,20],[80,30]]]},
		]
	}

	// graticule
	voyc.data.grid = {
		'name': 'grid',
		'type': 'GeometryCollection',
		'geometries': [
			{ 'type': "LineString", 'scalerank': 2, 'featureclass': "Meridian", 'name': "90°E", 'coordinates': voyc.Geo.drawMeridian([90],true)},
			{ 'type': "LineString", 'scalerank': 2, 'featureclass': "Meridian", 'name': "90°W", 'coordinates': voyc.Geo.drawMeridian([-90],true)},

			{ 'type': "LineString", 'scalerank': 2, 'featureclass': "Parallel", 'name': "Arctic Circle",  'coordinates': voyc.Geo.drawParallel([66.55772])},
			{ 'type': "LineString", 'scalerank': 2, 'featureclass': "Parallel", 'name': "Antarctic Circle",  'coordinates': voyc.Geo.drawParallel([-66.55772])},
			{ 'type': "LineString", 'scalerank': 2, 'featureclass': "Parallel", 'name': "Tropic of Cancer",  'coordinates': voyc.Geo.drawParallel([23.43715])},
			{ 'type': "LineString", 'scalerank': 2, 'featureclass': "Parallel", 'name': "Tropic of Capricorn",  'coordinates': voyc.Geo.drawParallel([-23.43715])},
			
			{ 'type': "LineString", 'scalerank': 1, 'featureclass': "Parallel", 'name': "Equator",        'coordinates': voyc.Geo.drawParallel([0])},
			{ 'type': "LineString", 'scalerank': 1, 'featureclass': "Meridian", 'name': "Prime Meridian", 'coordinates': voyc.Geo.drawMeridian([0],true)},
			{ 'type': "LineString", 'scalerank': 1, 'featureclass': "Meridian", 'name': "Anti Meridian",  'coordinates': voyc.Geo.drawMeridian([180],true)},
			{ 'type': "LineString", 'scalerank': 1, 'featureclass': "Meridian", 'name': "Anti Meridian",  'coordinates': voyc.Geo.drawMeridian([-180],true)},
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
		{type:'Polygon',id:1,name:'hiibii',b:-9999,e:+9999,fb:0,c:5,coordinates:[[[41,67],[82,67],[82,29],[41,29],[41,67]]] },
		{type:'Polygon',id:1,name:'jiibii',b:-9999,e:+9999,fb:0,c:5,coordinates:[[[-41,-67],[-82,-67],[-82,-29],[-41,-29],[-41,-67]]] },
		//{type:'Polygon',id:1,name:'jaabai',b:-9999,e:+9999,fb:0,c:5,coordinates:[[[+172,+20],[-172,+20],[-172,-20],[+172,-20],[+172,+20]]] },
		{type:'Polygon',id:1,name:'jaabai',b:-9999,e:+9999,fb:0,c:5,coordinates:[[[+172,+20],[+202,+20],[+202,-20],[+172,-20],[+172,+20]]] },
	]},

	voyc.data.custom02 = {"name":"custom01", "type": "GeometryCollection","geometries":[
		{type:'Point',b:-2560,e:-2560,score:1000,cap:0,id:14444,name:'Great Pyramid of Giza',coordinates:[31.134,29.979]},
		{type:'MultiPoint',b:-2600,e:-1900,score:1000,cap:0,id:1447774,name:'Harappa, Mohenjo Daro',coordinates:[[72.868,30.631],[68.136,27.324]]},
		{type:'LineString',scalerank:1,featureclass:'Parallel',name:'Equator',coordinates:[[-180,0],[-170,0],[-160,0],[-150,0],[-140,0],[-130,0],[-120,0],[-110,0],[-100,0],[-90,0],[-80,0],[-70,0],[-60,0],[-50,0],[-40,0],[-30,0],[-20,0],[-10,0],[0,0],[10,0],[20,0],[30,0],[40,0],[50,0],[60,0],[70,0],[80,0],[90,0],[100,0],[110,0],[120,0],[130,0],[140,0],[150,0],[160,0],[170,0],[180,0]]},
		{type:'Polygon',id:1,name:'Mesopotamia',b:-4000,e:-1950,fb:0,c:5,coordinates:[[[41.904411,27.702338],[41.805987,29.078789],[43.001109,29.761618],[44.359202,29.393941],[45.174058,28.606062],[44.956763,27.555557],[44.087583,26.820204],[42.512195,26.662628],[41.904411,27.702338]]], },

{type:'LineString',scalerank:1,featureclass:'river',name:'Indus 1',coordinates:[
[67.8599719583393,23.9026756863339],[67.9251876158159,24.0007575545176]]},

{type:'LineString',scalerank:1,featureclass:'river',name:'Indus 2',coordinates:[
[67.6458248225576, 23.919883938493],
[67.7111955096651, 23.956625881879],
[67.7138310079947, 24.0008609073051],
[67.7134175959454, 24.0663866240435],
]},

{type:'LineString',scalerank:1,featureclass:'river',name:'Indus 3',coordinates:[
[67.9251876158159, 24.0007575545176],
[67.9995500017312, 24.0071137558951],
[68.0166032242594, 23.990680650092],
[68.0245097183489, 23.9336815450673],
[68.0424414409198, 23.8916686059215],
[68.0370154155291, 23.8482604027954],
]},

{type:'LineString',scalerank:1,featureclass:'river',name:'Indus 4',coordinates:[
[67.9251876158159, 24.0007575545176],
[67.9241540870415, 24.055947984412],
[67.8007507670343, 24.0585059674765],
[67.7601330909694, 24.052847398089],
[67.7134175959454, 24.0663866240435],
]},

{type:'LineString',scalerank:1,featureclass:'river',name:'Indus 5',coordinates:[
[67.7134175959454, 24.0663866240435],
[67.660759311593, 24.1048597272946],
]},

{type:'LineString',scalerank:1,featureclass:'river',name:'Indus 6',coordinates:[
[79.734595982019, 32.4439372824797],
[79.4298083841497, 32.7449783388793]
]},
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
	this.iterator['hilite']  = new voyc.GeoIteratorHilite()
	//this.iterator['hires' ]  = new voyc.GeoIteratorHires()
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
		if (useImageData) 
			a.imageData = a.ctx.createImageData(self.w, self.h);
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
	createLayerCanvas('lores'     ,'Lo Res'    ,false       ,true  ,false    ,false       ,0)
	createLayerCanvas('hires'     ,'Hi Res'    ,false       ,true  ,false    ,false       ,0)
	createLayerCanvas('deserts'   ,'Deserts'   ,'deserts'   ,false ,'clip'   ,false       ,0)
	createLayerCanvas('mountains' ,'Mountains' ,'mountains' ,false ,'scale'  ,false       ,0)
	createLayerCanvas('lakes'     ,'Lakes'     ,'lakes'     ,false ,'clip'   ,false       ,0)
	createLayerCanvas('rivers'    ,'Rivers'    ,'rivers'    ,false ,'scale'  ,false       ,6)
	createLayerCanvas('empire'    ,'Historical','empire'    ,false ,'empire' ,false       ,0)
	createLayerCanvas('grid'      ,'Grid'      ,'grid'      ,false ,'scale'  ,false       ,0)
	createLayerCanvas('cities'    ,'Cities'    ,'cities'    ,false ,'scale'  ,false       ,0)
	createLayerCanvas('countries' ,'Countries' ,'countries' ,false ,'clip'   ,false       ,0)
	createLayerCanvas('hilite'    ,false       ,'hilite'    ,false ,'hilite' ,false       ,0)
	createLayerCanvas('sketch'    ,false       ,'sketch'    ,false ,'sketch' ,false       ,0)
	createLayerCanvas('custom01'  ,'Custom 1'  ,'custom01'  ,false ,'custom' ,false       ,0)
	createLayerCanvas('viewport'  ,false       ,false       ,false ,false    ,false       ,0)

	//voyc.$('viewport').style.opacity = .5

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
//	if (layer.offset) {
//		var group = document.querySelectorAll(`[group=${layerid}]`)
//		for (e of group)
//			this.showLayer(e, boo)
//	}
	this.moved = true
	voyc.geosketch.render(0)
	this.stoLay()
}

voyc.World.prototype.showLayer = function(e,boo) {
	voyc.show(e,boo)
	var layer = this.layer[e.id]
	if (layer && layer.offset) {
		var group = document.querySelectorAll(`div[group=${e.id}]`)
		for (e of group)
			this.showLayer(e, boo)
	}
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

	//this.counterMix = 20
	//mix range -1 1
	//range 1 - -1 = 2
	//step = 2 / 20 = .1
	
}


// -------- hit

voyc.World.prototype.testHit = function(pt) {
	var ret = false
	var geom = false

	for (i=0; i<this.hitlayers.length; i++) {
		var id = this.hitlayers[i]
		var layer = this.layer[id]
		if (layer.enabled) {
			// rivers, mountains and cities have scalerank, each with a different value
			var zoomScaleRank = 6 //this.calcRank(id) 
			geom =  this.iterator['hittest'].iterateCollection(layer.data, this.projection, pt, this.time.now, zoomScaleRank)
			if (geom)
				break
		}
	}

	if (geom)
		this.drawHilite(geom, pt)
}

// --------  drawing

voyc.World.prototype.resize = function(w, h) {
	this.w = w;
	this.h = h;
	this.projection.translate([this.w/2, this.h/2]);
	voyc.geosketch.hud.showScaleGraph(this.projection.uscale)

	for (var id in this.layer) {
		a = this.layer[id];
		if (a.type == 'canvas') {
			a.ctx.canvas.width  = this.w;
			a.ctx.canvas.height = this.h;
			a.ctx.canvas.style.width =  this.w + 'px';
			a.ctx.canvas.style.height = this.h + 'px';
			if (a.imageData) {
				a.imageData = a.ctx.createImageData(this.w, this.h);
			}
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
		this.drawViewport();
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
			this.drawLayer('cities')
			this.drawLayer('countries')
			this.drawEmpire()
			this.drawTexture()
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
	if (!table)
		debugger;
	var scale = this.projection.uscale 
	var rank = table.length
	for (var r=0; r<table.length; r++) {
		if (scale > table[r].scale) {
			rank = r+1
			break
		}
	}
	return rank
}

voyc.World.prototype.drawSketch = function(pt) {
	var layer = this.layer['sketch']
	layer.iterator.iterateCollection(
		layer.data, 
		this.projection, 
		layer.ctx, 
		layer.palette,
		pt)
}

voyc.World.prototype.drawWater = function() {
	var layer = this.layer['water']
	if (!layer.enabled) return
	var ctx = layer.ctx
	var palette = this.palette['water'][0]
	ctx.clearRect(0,0,ctx.canvas.width, ctx.canvas.height)
	ctx.beginPath();
	if (this.projection.projtype == 'orthographic')
		ctx.arc(this.w/2, this.h/2, this.projection.k, 0*Math.PI, 2*Math.PI);
	else if (this.projection.projtype == 'mercator') {
		nw = this.projection.cx[0]
		se = this.projection.cx[1]
		ctx.rect(nw[0], nw[1], se[0]-nw[0], se[1]-nw[1])
		this.mercwidth = se[0] - nw[0] 
	}
	else if (this.projection.projtype == 'equirectangular') {
		nw = this.projection.cx[0]
		se = this.projection.cx[1]
		ctx.rect(nw[0], nw[1], se[0]-nw[0], se[1]-nw[1])
		this.mercwidth = se[0] - nw[0] 
	}
	ctx.fillStyle = palette.fill
	ctx.fill()
}

voyc.World.prototype.drawViewport = function() {
	var layer = this.layer['viewport']
	if (!layer.enabled) return
	var ctx = layer.ctx
	var palette = this.palette['bkgrd'][0]
	ctx.clearRect(0,0,ctx.canvas.width, ctx.canvas.height)
	if (this.projection.projtype == 'mercator') {
		ctx.beginPath()

		ctx.moveTo(0,0)
		ctx.lineTo(0,this.h)
		ctx.lineTo(this.w,this.h)
		ctx.lineTo(this.w,0)
		ctx.lineTo(0,0)

		var nw = this.projection.cx[0]
		var se = this.projection.cx[1]
		ctx.rect(nw[0], nw[1], se[0]-nw[0], se[1]-nw[1])

		ctx.fillStyle = palette.fill
		ctx.fill()
	}
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

voyc.World.prototype.drawTexture = function() {
	if (this.layer.hires.enabled && (this.zoom.now >= 2))
		this.texhi.draw({
			projection: this.projection,
			imageData: this.layer.hires.imageData, 
			ctx: this.layer.hires.ctx,
			w: this.w,
			h: this.h,
		})

	if (this.layer.lores.enabled)
		this.texlo.draw({
			projection: this.projection,
			imageData: this.layer.lores.imageData, 
			ctx: this.layer.lores.ctx,
			w: this.w,
			h: this.h,
		})
}

voyc.World.prototype.drawHilite = function(geom, pt) {
	this.enableLayer('hilite', true)
	voyc.data.hilite.geometries = [geom]
	this.drawLayer('hilite')

	var s = `${geom.name}, ${geom.fc}`
	if (voyc.geosketch.getOption('showid') && geom.id)
		s += ' ('+geom.id+')'

	var pt = pt || this.projection.project([parseFloat(geom.lng), parseFloat(geom.lat)])

	voyc.geosketch.hud.showLabel(pt, s)
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
	for (var id in this.palette) {
		for (var palette of this.palette[id]) {
			if (palette.fill) {
				if (palette.opac)
					palette.fill = voyc.prepString('rgba($1,$2,$3,$4)', 
						[palette.fill[0],palette.fill[1],palette.fill[2],palette.opac])
				else
					palette.fill = voyc.prepString('rgb($1,$2,$3)', palette.fill)
			}
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

voyc.devZoom = {
	min: -2,
	max: 7,
}
voyc.defaultZoom = {
	min: 0,  // small number, zoomed out
	max: 4,    // large number, zoomed in
	bigstep: .5,
	babystep: .1,
	now: 0,
}
voyc.defaultSpin = {
	step: 6,
}

voyc.defaultPalette = {
	bkgrd: [{scale:5000, stroke:false,         pen:.5, fill:[  0,  0,  0], pat:false, patfile:false         ,opac: 1, lnStroke:false        , lnPen: 1, lnDash:[]    ,ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },],
	water: [{scale:5000, stroke:false,         pen:.5, fill:[111,166,207], pat:false, patfile:false         ,opac: 1, lnStroke:false        , lnPen: 1, lnDash:[]    ,ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },],
	land:  [{scale:5000, stroke:false,         pen:.5, fill:[237,220,203], pat:false, patfile:false         ,opac: 1, lnStroke:false        , lnPen: 1, lnDash:[]    ,ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },],
	grid:  [
		{scale:153927470, stroke:[255,255,  0], pen:2.5,fill:false        , pat:false, patfile:false         ,opac: 1, lnStroke:false        , lnPen: 1, lnDash:[]    ,ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },
		{scale: 76963735, stroke:[255,255,  0], pen:1.5,fill:false        , pat:false, patfile:false         ,opac: 1, lnStroke:false        , lnPen: 1, lnDash:[]    ,ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },
		{scale: 38481867, stroke:[255,255,255], pen:.5, fill:false        , pat:false, patfile:false         ,opac: 1, lnStroke:false        , lnPen: 1, lnDash:[]    ,ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },
	],
	empire:[
		{scale:5000, stroke:false,         pen:.5, fill:[255,  0,  0], pat:false, patfile:false         ,opac:.4, lnStroke:false        , lnPen: 1, lnDash:[]    ,ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },
		{scale:5000, stroke:false,         pen:.5, fill:[  0,255,  0], pat:false, patfile:false         ,opac:.4, lnStroke:false        , lnPen: 1, lnDash:[]    ,ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },
		{scale:5000, stroke:false,         pen:.5, fill:[  0,  0,255], pat:false, patfile:false         ,opac:.4, lnStroke:false        , lnPen: 1, lnDash:[]    ,ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },
		{scale:5000, stroke:false,         pen:.5, fill:[255,  0,255], pat:false, patfile:false         ,opac:.4, lnStroke:false        , lnPen: 1, lnDash:[]    ,ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },
		{scale:5000, stroke:false,         pen:.5, fill:[255,255,  0], pat:false, patfile:false         ,opac:.4, lnStroke:false        , lnPen: 1, lnDash:[]    ,ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },
		{scale:5000, stroke:false,         pen:.5, fill:[  0,255,255], pat:false, patfile:false         ,opac:.4, lnStroke:false        , lnPen: 1, lnDash:[]    ,ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },
	],
	rivers: [
		{scale:307854939, stroke:[  0,  0,255], pen:5  ,fill:false        , pat:false, patfile:false         ,opac: 1, lnStroke:false        , lnPen: 1, lnDash:[]    ,ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },
		{scale:153927470, stroke:[  0,  0,255], pen:4  ,fill:false        , pat:false, patfile:false         ,opac: 1, lnStroke:false        , lnPen: 1, lnDash:[]    ,ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },
		{scale: 76963735, stroke:[  0,  0,255], pen:3.5,fill:false        , pat:false, patfile:false         ,opac: 1, lnStroke:false        , lnPen: 1, lnDash:[]    ,ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },
		{scale: 38481867, stroke:[  0,  0,255], pen:3  ,fill:false        , pat:false, patfile:false         ,opac: 1, lnStroke:false        , lnPen: 1, lnDash:[]    ,ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },
		{scale: 19240934, stroke:[  0,  0,255], pen:2.5,fill:false        , pat:false, patfile:false         ,opac: 1, lnStroke:false        , lnPen: 1, lnDash:[]    ,ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },
		{scale:  9620467, stroke:[  0,  0,255], pen:2  ,fill:false        , pat:false, patfile:false         ,opac: 1, lnStroke:false        , lnPen: 1, lnDash:[]    ,ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },
	],
	lakes: [{scale:5000, stroke:false,         pen:2 , fill:[  0,  0,255]},],
       deserts:[{scale:5000, stroke:false,         pen:2 , fill:[ 96, 96,  0], pat:false, patfile:'deserts'     ,opac: 1, lnStroke:false        , lnPen: 1, lnDash:[]    ,ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },],
	mountains:[
		{scale:153927470, stroke:false,         pen:2 , fill:[ 96,  0,  0], pat:false, patfile:'mountains_1' ,opac: 1, lnStroke:false        , lnPen: 1, lnDash:[]    ,ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },
		{scale: 76963735, stroke:false,         pen:2 , fill:[ 96,  0,  0], pat:false, patfile:'mountains_2' ,opac: 1, lnStroke:false        , lnPen: 1, lnDash:[]    ,ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },
		{scale: 38481867, stroke:false,         pen:2 , fill:[ 96,  0,  0], pat:false, patfile:'mountains_3' ,opac: 1, lnStroke:false        , lnPen: 1, lnDash:[]    ,ptRadius:0, ptStroke:false        , ptPen: 1, ptFill:false        },
	],
	hilite:[{scale:5000, stroke:[255,  0,  0], pen: 5, dash:false ,fill:false        , pat:false, patfile:false         ,opac: 1, lnStroke:[255,  0,  0], lnPen: 2, ptRadius:10,ptStroke:[255,  0,  0], ptPen: 1, ptFill:[255,  0,  0]},],
	custom:[{scale:5000, stroke:[255,  0,255], pen: 5, dash:false ,fill:[255,  0,  0], pat:false, patfile:false         ,opac:.5, lnStroke:[255,255,  0], lnPen: 7, ptRadius:5, ptStroke:[  0,  0,255], ptPen: 3, ptFill:[  0,255,  0]},],
	sketch:[{scale:5000, stroke:[  0,  0,  0], pen: 1, dash:false ,fill:[255,255,  0], pat:false, patfile:false         ,opac:.5, lnStroke:[  0,  0,  0], lnPen: 1, ptRadius:5, ptStroke:[  0,  0,  0], ptPen: 1, ptFill:[  0,  0,  0]},],
     countries:[{scale:5000, stroke:[128,128,128], pen:.5, dash:[5,5] ,fill:false        , pat:false, patfile:false         ,opac:.5, lnStroke:[255,255,  0], lnPen: 7, ptRadius:5, ptStroke:[  0,  0,255], ptPen: 3, ptFill:[  0,255,  0]},],
	cities:[
		{scale: 242, stroke:[  0,  0,  0], pen: 3, dash:false ,fill:[0,  0,128], pat:false, patfile:false         ,opac:.5, lnStroke:[255,255,  0], lnPen: 7, ptRadius:6, ptStroke:[  0,  0,  0], ptPen: 3, ptFill:[  0,  0,128]},
		{scale: 531, stroke:[  0,  0,  0], pen: 2, dash:false ,fill:[0,  0,128], pat:false, patfile:false         ,opac:.5, lnStroke:[255,255,  0], lnPen: 7, ptRadius:5, ptStroke:[  0,  0,  0], ptPen: 2, ptFill:[  0,  0,128]},
		{scale: 897, stroke:[  0,  0,  0], pen: 1, dash:false ,fill:[0,  0,128], pat:false, patfile:false         ,opac:.5, lnStroke:[255,255,  0], lnPen: 7, ptRadius:4, ptStroke:[  0,  0,  0], ptPen: 1, ptFill:[  0,  0,280]},
		{scale:1329, stroke:[  0,  0,  0], pen: 1, dash:false ,fill:[0,  0,128], pat:false, patfile:false         ,opac:.5, lnStroke:[255,255,  0], lnPen: 7, ptRadius:3, ptStroke:[  0,  0,  0], ptPen: 1, ptFill:[  0,  0,128]},
		{scale:1969, stroke:[  0,  0,  0], pen: 1, dash:false ,fill:[0,  0,128], pat:false, patfile:false         ,opac:.5, lnStroke:[255,255,  0], lnPen: 7, ptRadius:2, ptStroke:[  0,  0,  0], ptPen: 1, ptFill:[  0,  0,128]},
		{scale:2904, stroke:[  0,  0,  0], pen: 1, dash:false ,fill:[0,  0,128], pat:false, patfile:false         ,opac:.5, lnStroke:[255,255,  0], lnPen: 7, ptRadius:1, ptStroke:[  0,  0,  0], ptPen: 1, ptFill:[  0,  0,128]},
	],
	hires: [{scale:5000, stroke:[255,  0,255], pen: 5, dash:false ,fill:[255,0,  0], pat:false, patfile:false         ,opac:.5, lnStroke:[255,255,  0], lnPen: 7, ptRadius:5, ptStroke:[  0,  0,255], ptPen: 3, ptFill:[  0,255,  0]},],
	lores: [{scale:5000, stroke:[255,  0,255], pen: 5, dash:false ,fill:[255,0,  0], pat:false, patfile:false         ,opac:.5, lnStroke:[255,255,  0], lnPen: 7, ptRadius:5, ptStroke:[  0,  0,255], ptPen: 3, ptFill:[  0,255,  0]},],
}

voyc.World.prototype.getGeom = function(id,fc) {
	var layer = voyc.feature2layer[fc]
	if (!layer)
		return false
	for (var geom of voyc.data[layer].geometries)
		if (geom.id == id)
			return geom
	return false 
}

voyc.feature2layer = {
	'alkaline lake'   : 'lakes',
	'basin'           : '',
	'canal'           : 'rivers',
	'coast'           : '',
	'continent'       : '',
	'delta'           : 'lakes',
	'depression'      : '',
	'desert'          : 'deserts',
	'drangons-be-here': '',
	'empire'          : 'empire',
	'foothills'       : '',
	'geoarea'         : '',
	'gorge'           : '',
	'island'          : '',
	'island group'    : '',
	'isthmus'         : '',
	'lake'            : 'lakes',
	'lake centerline' : 'rivers',
	'lowland'         : '',
	'pen/cape'        : '',
	'peninsula'       : '',
	'plain'           : '',
	'plateau'         : '',
	'range/mtn'       : 'mountains',
	'reservoir'       : '',
	'river'           : 'rivers',
	'treasure'        : '',
	'tundra'          : '',
	'valley'          : '',
	'wetlands'        : '',
}

