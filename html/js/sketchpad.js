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
		this.observer = new voyc.Observer()
		var self = this
		this.observer.subscribe('saveshape-submitted','sketchpad' ,function(note) { 
			self.onSave(note)
		})
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

	onSave: function(w) {
		// get inputs from modal save dialog
		var layer = w.payload.inputs.layer.value
		var name = w.payload.inputs.name.value

		// find active layer
		if (typeof(voyc.data[layer]) == 'undefined') {
			voyc.data[layer] = {
				name: layer,
				type: 'GeometryCollection',
				geometries: []
			}
			voyc.geo.world.createLayerCanvas(
				layer,		// id
				layer,		// menulabel
				layer,		// dataid
				false,		// useImageData
				'custom',	// iterator
				false,		// container
				0		// offset
			)
			voyc.geo.world.layer[layer].palette = voyc.geo.world.palette['custom']

			voyc.geo.hud.populateLayerMenu()
		}

		// set name, begin, end into geom object
		// mark the new shape as dirty

		// move current shape to active layer and redraw the layer
		var movegeom = voyc.clone(this.geom)
		voyc.data[layer].geometries.push(movegeom)
		voyc.geo.world.drawLayer(layer)

		// create a new empty sketch object and redraw the sketch layer
		this.newGeom()
		this.draw()

		// close the modal save dialog
		voyc.geo.hud.closeModal()
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
