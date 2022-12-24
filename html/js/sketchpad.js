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
	//this.resize()
	//this.attach(this.touchpad);

//	// options
//	this.options = {}
//	//this.options.penColor = getComputedStyle(this.canvas).color;
//	this.options.brushSize = 5;
//	this.options.hasGrid = false;
//	if (options)
//		voyc.utils.merge(this.options.options)

	this.ptPrev = false

	this.pointImage = document.getElementById('yellow-dot')

	this.newGeom()
}


voyc.SketchPad.prototype = {

	// ---- public

	drawWhat: function(w) {
		this.geom.type = w
		this.finish()
	},

	//clear: function () {
	//	this.geom = []
	//	this.draw()
	//},

	undo: function() {
		// erase the current or most recent point 
		if (this.geom.coordinates[0][0].length > 0)
			this.coordinates[0][0].pop()
		this.draw()
	},

	trim: function() {
		console.log('trim sketch')
	},

	finish: function() {
		console.log('finish line')
		this.newGeom()
	},

	save: function(w) {
		// popup a dialog to get name of object
		console.log('save sketch')
	},

	cancel: function() {
		console.log('cancel sketch')
		this.newGeom()
		this.draw()
	},

	newGeom: function() {
		//this.geom = voyc.defaultGeom
		this.geom = voyc.clone(voyc.defaultGeom)
		this.geom.coordinates.push(Array())
		this.geom.coordinates[0].push(Array())
		//voyc.data.sketch.geometries.push(this.geom)
		voyc.data.sketch.geometries[0] = this.geom
		this.ptPrev = false
	},

	addPoint: function (pt) {
		var distance = voyc.length(pt,this.ptPrev)
		if ((distance > 20) || !this.ptPrev) {
			var co = voyc.geosketch.world.projection.invert(pt)
			this.geom.coordinates[0][0].push(co)
			this.draw()
			this.ptPrev = pt
		}
	},

	mousemove: function(pt) {
		this.draw(pt)
	},

	closePoly: function() {
		// close the polygon by duplicating the first point as the last point
		// note: there is no need to close point or line objects
		var firstCo = this.geom.coordinates[0][0][0]
		this.geom.coordinates[0][0].push(firstCo)
	},

	draw: function (pt) {
		voyc.geosketch.world.drawSketch(pt)
	}
/*
	// ---- drawing

	resize: function(w,h) {
		//this.canvas.width = parseInt(getComputedStyle(this.canvas).width,10);
		//this.canvas.height = parseInt(getComputedStyle(this.canvas).height,10);
	},

	clearCanvas: function (ctx) {
		ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	},

	draw: function () {
		return
		var ctx = this.canvas.getContext('2d');
		this.clearCanvas(ctx);

		for (var i=0; i<this.strokes.length; i++) {
			var stroke = this.strokes[i]
			if (stroke.type == 'point') {
				for (var j=0; j<stroke.points.length; j++) {
					pt = stroke.points[j]
					ctx.drawImage( this.pointImage,0,0,22,22, pt[0]-11, pt[1]-11,22,22)
				}
			}
			else {  // poly or line
				ctx.lineCap = "round";
				ctx.lineJoin = "round";
				ctx.strokeStyle = stroke.penColor;
				ctx.lineWidth = stroke.brushSize;

				ctx.beginPath();
				ctx.moveTo(stroke.points[0][0], stroke.points[0][1]);
				for (var j=1; j<stroke.points.length; j++) {
					ctx.lineTo(stroke.points[j][0], stroke.points[j][1]);
				}
				// if only one point, make a mark
				if (stroke.points.length == 1) 
					ctx.lineTo(stroke.points[0][0]-1, stroke.points[0][1]);
				ctx.stroke();
			}
		}
	},

	// ---- event handlers

	attach: function (elem) {
		// Add mouse event listeners
		var self = this;
		elem.addEventListener('mousedown', function(e) {self.down('mouse',e)}, false);
		elem.addEventListener('mousemove', function(e) {self.move('mouse',e)}, false);
		elem.addEventListener('mouseup',   function(e) {self.up('mouse',e)}, false);
		//elem.addEventListener('mouseout',  function(e) {self.hold(e)}, false);

		// Add touch event listeners
//		elem.addEventListener('touchstart',  function(e) {self.down('touch',e)}, false);
//		elem.addEventListener('touchmove',   function(e) {self.move('touch',e)}, false);
//		elem.addEventListener('touchend',    function(e) {self.up('touch',e)}, false);
		//elem.addEventListener('touchcancel', function(e) {self.hold(e)}, false);

		//debugEventBubbling('mousemove', 'touchpad', 4)
	},

	down: function (ptr,e) {
		
		if ((this.options.supportedButtons.includes( e.button) ||
			ptr == 'touch') &&
			e.currentTarget == e.target &&
			e.currentTarget == this.touchpad) ;
		else return

		this.downOnHud = true

		if ((this.what == 'poly') || (this.strokes.length < 1))
			this.newStroke();
			this.addPoint(ptr,e)

		this.draw();
	},

	move: function (ptr,e) {
		e.preventDefault(); // Prevent drag of other stuff, like the whole page on mobile

		if ((this.downOnHud && e.currentTarget == this.touchpad)) ;// continue
		else return

		var x,y
		if (e.type.substr(0,5) == 'touch') {  // TouchEvent
			x = e.targetTouches[0].pageX - e.target.offsetLeft
			y = e.targetTouches[0].pageY - e.target.offsetTop
		}
		else {
			x = e.pageX - e.currentTarget.offsetLeft
			y = e.pageY - e.currentTarget.offsetTop
		}

		this.addPoint(ptr,e)
		this.draw();
	},

	up: function (ptr, e) {
		this.downOnHud = false;
		if (this.what == 'poly')
			this.addPoint(ptr,e)
		this.draw();
	},
*/
}

voyc.defaultGeom = {
	type:"MultiPolygon", 
	id:0,
	name:"unnamed",
	b:-4000,
	e:-1950,
	fb:0,
	c:5, 
	coordinates:[], 
}

