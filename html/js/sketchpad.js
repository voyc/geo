voyc.getPointerPosition = function(e) {
	// am i touch or mouse ?
	// do i have page or nota?
	// what about current vs target ?
	// while we're here... what about double touch ?
},

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
	this.resize()
	//this.attach(this.touchpad);

	// options
	this.options = {}
	this.options.supportedButtons = [0]  // 0,1,2:  left, middle, right
	this.options.penColor = getComputedStyle(this.canvas).color;
	this.options.brushSize = 5;
	this.options.hasGrid = false;
	if (options)
		voyc.utils.merge(this.options.options)

	this.strokes = []
	this.what = 'poly'   // point, line, poly
	this.downOnHud = false;

	this.pointImage = document.getElementById('yellow-dot')
}

voyc.SketchPad.prototype = {

	// ---- public

	drawWhat: function(w) {
		voyc.logger(['drawWhat', w])
		this.what = w
		this.finish()
	},

	clear: function () {
		this.strokes = []
		this.draw()
	},

	undo: function() {
		// erase the current or most recent stroke
		voyc.logger(['undo'])
		if (this.strokes.length > 0)
			this.strokes.pop()
		this.draw()
	},

	finish: function() {
		voyc.logger(['finish'])
		this.newStroke()
	},

	save: function(w) {
		// popup a dialog to get name of object
	},

	// ---- data

	newStroke: function() {
		// if a stroke is sitting there empty, delete it
		var ndx = this.strokes.length-1
		if (ndx >= 0) {
			var numpoints = this.strokes[ndx].points.length
			if (numpoints < 1) {
				this.strokes.pop()
			}
			else {
				// if a poly stroke is in progress, close it now
				if (this.strokes[ndx].type == 'poly') {
					this.closePoly()
				}
			}
		}

		// now create the new stroke
		var stroke = {
			type: this.what,
			id:0,
			name:'my object',
			type:this.what,
			points:[],
			coordinates:[],
			desc: 'recommendations on color and linewidth',
			color: 000,
			linewidth: 2,
		}
		this.strokes.push(stroke)
	},

	addPoint: function (pt) {
		if (this.strokes.length < 1)
			this.newStroke()
		var ndx = this.strokes.length-1
		this.strokes[ndx].points.push(pt)
		this.draw()
	},

	closePoly: function() {
		// close the polygon by duplicating the first point as the last point
		// note: there is no need to close point or line objects
		voyc.logger('closePoly')
		var ndx = this.strokes.length-1
		var firstPoint = this.strokes[ndx].points[0]
		this.addPoint(firstPoint)
	},

	// ---- drawing

	resize: function(w,h) {
		this.canvas.width = parseInt(getComputedStyle(this.canvas).width,10);
		this.canvas.height = parseInt(getComputedStyle(this.canvas).height,10);
	},

	clearCanvas: function (ctx) {
		ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	},

	draw: function () {
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
}

