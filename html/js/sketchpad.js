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
	this.attach(this.touchpad);

	// options
	this.options = {}
	this.options.supportedButtons = [0]  // 0,1,2:  left, middle, right
	this.options.penColor = getComputedStyle(this.canvas).color;
	this.options.brushSize = 5;
	this.options.hasGrid = false;
	this.options.gridColor = 'blue';
	this.options.gridSize = 12;
	if (options)
		voyc.utils.merge(this.options.options)

	this.strokes = []
	this.what = 'poly'   // point, line, poly
	this.downOnHud = false;
}

voyc.SketchPad.prototype = {

	// ---- public

	resize: function(w,h) {
		this.canvas.width = parseInt(getComputedStyle(this.canvas).width,10);
		this.canvas.height = parseInt(getComputedStyle(this.canvas).height,10);
	},

	clear: function () {
		this.strokes = []
		this.draw();  // why do this?  it might redraw the grid
	},

	// ---- data

	createStroke: function(x,y) {
		var stroke = {
			type: this.what,
			id:0,
			name:'my object',
			points:[],
			proj:1,  // 1:orthographic, 2:mercator
			coordinates:[],
			desc: 'recommendations on color and linewidth',
			color: 000,
			linewidth: 2,
		}
		this.strokes.push(stroke)
	},

	addPoint: function (ptr,e) {
		var x,y
		if (ptr == 'touch') {
			x = e.targetTouches[0].pageX - e.target.offsetLeft
			y = e.targetTouches[0].pageY - e.target.offsetTop
			//voyc.logger(['touch', e.targetTouches.length, x, y])
			//voyc.logger(voyc.dumpElement(e))
			//voyc.logger(voyc.dumpElement(e.touches[0]))
			//voyc.logger(voyc.dumpElement(e.touches[1]))
			//voyc.logger(e.touches)
			//voyc.logger(e.targetTouches)
			//voyc.logger(e.changedTouches)
		}
		else { // 'mouse'
			x = e.pageX - e.currentTarget.offsetLeft
			y = e.pageY - e.currentTarget.offsetTop
			//voyc.logger(['mouse', x, y])
			//voyc.logger(voyc.dumpElement(e))
		}


		var ndx = this.strokes.length-1
		this.strokes[ndx].points.push([x,y])
	},

	// ---- drawing

	clearCanvas: function (ctx) {
		ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	},

	draw: function () {
		var ctx = this.canvas.getContext('2d');
		this.clearCanvas(ctx);
		if (this.options.hasGrid) {
			ctx.lineWidth = .07;
			ctx.strokeStyle = this.options.gridColor;
			this.drawGrid(ctx, this.canvas.width, this.canvas.height, this.options.gridSize);      // delete
		}
		
		ctx.lineCap = "round";
		ctx.lineJoin = "round";


		// draw each point of each stroke
		for (var i=0; i<this.strokes.length; i++) {
			var stroke = this.strokes[i]
			ctx.beginPath();
			ctx.moveTo(stroke.points[0][0], stroke.points[0][1]);
			for (var j=1; j<stroke.points.length; j++) {
				ctx.lineTo(stroke.points[j][0], stroke.points[j][1]);
			}
			// if only one point, make a mark
			if (stroke.points.length == 1) 
				ctx.lineTo(stroke.points[0][0]-1, stroke.points[0][1]);

			ctx.strokeStyle = this.options.penColor;
			ctx.lineWidth = this.options.brushSize;
			ctx.stroke();
		}
	},

	drawGrid: function(ctx, w, h, g) {
		// ctx.lineWidth  set by caller
		// ctx.strokeStyle  set by caller
		ctx.beginPath();

		// verticals
		for (var x = 0.5; x < w; x += g) {
			ctx.moveTo(x, 0);
			ctx.lineTo(x, h);
		}

		// horizontals
		for (var y = 0.5; y < h; y += g) {
			ctx.moveTo(0, y);
			ctx.lineTo(w, y);
		}

		ctx.stroke();
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
			this.createStroke();
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

	hold: function (e) {
	},


	// ---- public

	drawWhat: function(w) {
		this.what = w
	},

	erase: function(w) {
		this.strokes.pop()
		this.draw();
	},

	closePoly: function(w) {
		if (this.what == 'poly') 
			this.closePoly()
		else if (this.what == 'line') 
			this.endLine()
		this.draw();
	},

	endLine: function(w) {
		this.strokes.pop()
		this.draw();
	},


	finish: function(w) {
		//this.release()
		//this.createStroke()
		//this.draw();
	},

	save: function(w) {
		// popup a dialog to get name of object
		this.draw();
	},
}
