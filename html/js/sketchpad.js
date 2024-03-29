/**
	class SketchPad
	@constructor
	derived from www.williammalone.com
	@param {Element|null} canvas - A canvas element to display the sketch.
	@param {Element|null} touchpad - A div element to receive mouse events.
	@param {Object} [options=null] - An object of option values.

	The canvas can double as touchpad if it is on top.
*/
voyc.SketchPad = function (canvas, touchpad, options) {
	this.canvas = canvas;
	this.touchpad = touchpad || canvas;
	this.ptPrev = false
	this.pointImage = document.getElementById('yellow-dot')
	this.shape = 'poly'
	this.geom = {}
	this.coords = []
	this.newGeom()
}

voyc.SketchPad.prototype = {
	setup: function() {
		this.comm = voyc.geo.comm
		this.observer = new voyc.Observer()
		var self = this
		this.observer.subscribe('saveshape-submitted','sketchpad' ,function(note) { self.onSave(note) })
	},

	// ---- public

	setShape: function(shape) {
		this.shape = shape
		this.setupGeom(this.shape, this.coords)
		this.draw()
	},

	undo: function() {
		// erase the current or most recent point 
		//if (this.geom.coordinates[0][0].length > 0)
		//	this.coordinates[0][0].pop()
		this.draw()
	},

	trim: function() {
		console.log('trim sketch')
	},

	finish: function() {
	},

	cancel: function() {
		console.log('cancel sketch')
		this.newGeom()
		this.draw()
	},

	newGeom: function() {
		this.geom = voyc.clone(voyc.defaultGeom)
		this.coords = []
		this.setupGeom(this.shape,this.coords)

		//voyc.data.sketch.geometries.push(this.geom)
		voyc.data.sketch.geometries[0] = this.geom

		this.ptPrev = false
	},

	setupGeom: function(shape,coords) {
		this.geom.type = voyc.shape[shape].type
		var depth = voyc.shape[shape].depth
		this.geom.coordinates = [] 
		if (depth==1) {
			this.geom.coordinates = coords[0]
		}
		else if (depth==2) {
			this.geom.coordinates = coords
		}
		else if (depth==3) {
			this.geom.coordinates.push(coords)
		}
		else if (depth==4) {
			this.geom.coordinates.push(Array())
			this.geom.coordinates[0].push(coords)
		}
	},

	addPoint: function (pt) {
		var distance = voyc.length(pt,this.ptPrev)
		if ((distance > 20) || !this.ptPrev) {
			var co = voyc.geo.world.projection.invert(pt)
			co.pop() // note: invert normally used by project()
			this.coords.push(co)
			this.draw()
			this.ptPrev = pt
		}
	},

	mousemove: function(pt) {
		this.draw(pt)
	},

	closePoly: function() {
		// close the polygon by duplicating the first point as the last point
		var firstCo = this.coords[0]
		this.coords.push(firstCo)
	},
	openPoly: function() {
		this.coords.pop()
	},

	draw: function (pt) {
		voyc.geo.world.drawSketch(pt)
	}
}


voyc.SketchPad.prototype.onSave = function(note) {
	// build data array of name/value pairs from user input
	var inputs = note.payload.inputs
	var data = {}
	data['si'] = voyc.getSessionId()
	data['id'] = 0 //inputs['id'].value
	data['name' ] = inputs['name' ].value
	data['layernm' ] = inputs['layer' ].value
	data['timebegin'] = inputs['begin'].value
	data['timeend'] = inputs['end'].value
	data['geom'] = JSON.stringify({
		type:this.geom.type,
		coordinates:this.geom.coordinates
	})

	// call svc
	var svcname = 'setgeo'
	var self = this;
	this.comm.request(svcname, data, function(ok, response, xhr) {
		if (!ok) response = { 'status':'system-error'};

		if (response['status'] == 'ok') {
			console.log('setgeo success')
			self.onSaved(data, response)
			voyc.geo.hud.closeModal()  // finished
		}
		else {
			console.log('setgeo failed')
			voyc.killWait()  // unfreeze the modal dialog, try again
		}
	});

	voyc.wait() // freeze the modal dialog
}

voyc.SketchPad.prototype.onSaved = function(data, response) {
	// find active layer
	var layernm = data['layernm']
	if (typeof(voyc.data[layernm]) == 'undefined') {
		voyc.data[layernm] = {
			name: layernm,
			type: 'GeometryCollection',
			geometries: []
		}
		voyc.geo.world.createLayerCanvas(
			layernm,		// id
			layernm,		// menulabel
			layernm,		// dataid
			false,		// useImageData
			'custom',	// iterator
			false,		// container
			0		// offset
		)
		voyc.geo.world.layer[layernm].palette = voyc.geo.world.palette['custom']

		voyc.geo.hud.populateLayerMenu()
	}

	// move current shape from sketch to active layer and redraw the layer
	var movegeom = voyc.clone(this.geom)
	voyc.data[layernm].geometries.push(movegeom)
	voyc.geo.world.drawLayer(layernm)

	// create a new empty sketch object and redraw the sketch layer
	this.newGeom()
	this.draw()
}

voyc.defaultGeom = {
	type:"MultiPolygon", 
	id:0,
	name:"unnamed",
	b:-7777,
	e:+7777,
	fb:0,
	c:1, 
	scalerank:1,
	coordinates:[], 
}

voyc.shape = {
	xpoint:	{type:'Point'          ,depth:1},	// this.geom.coordinates[coord]		,one coord, where a coord is a [lng,lat] array
	point:	{type:'MultiPoint'     ,depth:2},	// this.geom.coordinates[[coord]]	,array of coords
	xline:	{type:'LineString'     ,depth:2},	// this.geom.coordinates[[coord]]	,array of coords
	line:	{type:'MultiLineString',depth:3},	// this.geom.coordinates[[[coord]]]	,array of array of coords
	xpoly:	{type:'Polygon'        ,depth:3},	// this.geom.coordinates[[[coord]]]	,array of array of coords
	poly:	{type:'MultiPolygon'   ,depth:4},	// this.geom.coordinates[[[[coord]]]]	,array of array of array of coords
}
