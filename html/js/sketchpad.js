/**
	class Sketch
	@constructor
	derived from www.williammalone.com
	@param {Element|null} canvas - A canvas element in the html.
	@param {Object} [options=null] - An object of option values.
*/
voyc.Sketch = function (canvas, options, touchpad) {
	this.canvas = canvas;
	this.touchpad = touchpad || canvas;
	this.buttons = [0,1,2]  // left, middle, right

	// options
	this.penColor = getComputedStyle(this.canvas).color;
	this.brushSize = 5;
	this.hasGrid = false;
	this.gridColor = 'blue';
	this.gridSize = 12;
	if (options) {
		this.setOptions(options);
	}

	// working variables
	
/*	
	rewrite with an array of stroke objects
	stroke = {
		c:0,
		w:0,
		p:[]
	}
	add "back" capability to remove only the most recent stroke object
*/	
	this.clickX = [];
	this.clickY = [];
	this.clickDrag = [];
	this.color = [];
	this.lineWidth = [];

	this.paint = false;

	this.attach(this.touchpad);
}

voyc.Sketch.prototype = {
	setOptions: function(options) {
		this.penColor = (options.penColor) ? options.penColor : this.penColor;
		this.brushSize = (options.brushSize) ? options.brushSize : this.brushSize;
		this.hasGrid = (options.hasGrid) ? options.hasGrid : this.hasGrid;
		this.gridColor = (options.gridColor) ? options.gridColor : this.gridColor;
		this.gridSize = (options.gridSize) ? options.gridSize : this.gridSize;
	},
	
	clear: function () {
		this.clickX = [];
		this.clickY = [];
		this.clickDrag = [];
		this.color = [];
		this.lineWidth = [];
		this.draw();
	},

	clearCanvas: function (ctx) {
		ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	},

	// Redraws the canvas.
	draw: function () {
		this.canvas.width = parseInt(getComputedStyle(this.canvas).width,10);
		this.canvas.height = parseInt(getComputedStyle(this.canvas).height,10);

		var locX,
			locY,
			radius = 5,
			i,
			selected;

		var ctx = this.canvas.getContext('2d');
		this.clearCanvas(ctx);
		if (this.hasGrid) {
			ctx.lineWidth = .07;
			ctx.strokeStyle = this.gridColor;
			this.drawGrid(ctx, this.canvas.width, this.canvas.height, this.gridSize);
		}
		
		ctx.lineCap = "round";
		ctx.lineJoin = "round";

		// For each point drawn
		for (i = 0; i < this.clickX.length; i += 1) {
			// If dragging then draw a line between the two points
			if (this.clickDrag[i] && i) {
				ctx.moveTo(this.clickX[i - 1], this.clickY[i - 1]);
			} else {
				// The x position is moved over one pixel so a circle even if not dragging
				ctx.moveTo(this.clickX[i] - 1, this.clickY[i]);
			}
			ctx.lineTo(this.clickX[i], this.clickY[i]);
			if (this.color[i] != this.color[i -1]) {
				ctx.strokeStyle = this.color[i-1];
				ctx.lineWidth = this.lineWidth[i-1];
				ctx.stroke();
				ctx.beginPath();
			}
		}
		ctx.strokeStyle = this.color[i-1];
		ctx.lineWidth = this.lineWidth[i-1];
		ctx.stroke();
	},

	// Adds a point to the drawing array.
	addClick: function (x, y, dragging) {
		this.clickX.push(x);
		this.clickY.push(y);
		this.clickDrag.push(dragging);
		this.color.push(this.penColor);
		this.lineWidth.push(this.brushSize);
	},

	// mouse and touch event handlers
	press: function (e) {
		if (!this.buttons.includes( e.button))
			return

		// Mouse down location
		var sizeHotspotStartX,
			mouseX = e.pageX - e.target.offsetLeft,
			mouseY = e.pageY - e.target.offsetTop;

		if (e.targetTouches) {
			mouseX = e.targetTouches[0].pageX - e.target.offsetLeft;
			mouseY = e.targetTouches[0].pageY - e.target.offsetTop;
		}	
		this.paint = true;
		this.addClick(mouseX, mouseY, false);
		this.draw();
	},

	drag: function (e) {
		if (this.paint) {
			if (e.type.substr(0,5) == 'touch') {
				this.addClick(e.targetTouches[0].pageX - e.target.offsetLeft, e.targetTouches[0].pageY - e.target.offsetTop, true);
			}
			else {
				this.addClick(e.pageX - e.target.offsetLeft, e.pageY - e.target.offsetTop, true);
			}

			this.draw();
		}
		// Prevent the whole page from dragging if on mobile
		e.preventDefault();
	},

	release: function (e) {
		this.paint = false;
		this.draw();
	},

	cancel: function (e) {
		this.paint = false;
	},

	attach: function (elem) {
		// Add mouse event listeners
		var self = this;
		elem.addEventListener('mousedown', function(e) {self.press(e)}, false);
		elem.addEventListener('mousemove', function(e) {self.drag(e)}, false);
		elem.addEventListener('mouseup',   function(e) {self.release(e)}, false);
		elem.addEventListener('mouseout',  function(e) {self.cancel(e)}, false);

		// Add touch event listeners
		elem.addEventListener('touchstart',  function(e) {self.press(e)}, false);
		elem.addEventListener('touchmove',   function(e) {self.drag(e)}, false);
		elem.addEventListener('touchend',    function(e) {self.release(e)}, false);
		elem.addEventListener('touchcancel', function(e) {self.cancel(e)}, false);

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
}
