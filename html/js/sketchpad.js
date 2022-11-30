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
	//this.options.penColor = getComputedStyle(this.canvas).color;
	this.options.brushSize = 5;
	this.options.hasGrid = false;
	if (options)
		voyc.utils.merge(this.options.options)

	this.strokes = []
	this.what = 'poly'   // point, line, poly
	this.downOnHud = false;

	this.pointImage = document.getElementById('yellow-dot')
}


voyc.data.sketch = {"name":"sketch", "type": "GeometryCollection","geometries":[
{"type":"Polygon", id:1,"name":"Mesopotamia","b":-4000,"e":-1950,"fb":0,"c":5,
"coordinates":[[[41.904411,27.702338],[41.805987,29.078789],[43.001109,29.761618],[44.359202,29.393941],[45.174058,28.606062],[44.956763,27.555557],[44.087583,26.820204],[42.512195,26.662628],[41.904411,27.702338]]], },

{ "type":"Polygon", id:14780,"name":"Kush","b":-1600,"e":600,"fb":0,"c":4,
"coordinates":[[[25.839112,20.653834],[25.721175,20.823401],[25.721175,21.845919],[26.076763,22.229363],[27.676909,22.740621],[27.676909,22.868436],[28.388084,23.124065],[29.09926,23.25188],[30.343818,23.25188],[31.054993,22.996251],[32.655139,22.229363],[33.366315,21.718104],[33.899697,20.951216],[33.899697,20.567772],[34.077491,20.312143],[34.433078,20.056513],[34.788666,20.056513],[35.499842,19.545255],[35.85543,19.033996],[35.85543,18.650552],[36.7444,16.349888],[36.7444,15.455185],[36.033224,14.688297],[34.96646,14.304853],[34.255284,14.177038],[32.477345,14.177038],[32.121757,14.304853],[31.232787,14.816112],[30.8772,15.199556],[30.343818,15.32737],[29.632642,16.094258],[28.388084,16.861146],[27.854702,18.011479],[27.854702,19.161811],[25.839112,20.653834]]], },

{"type":"MultiPolygon",id:18843,"name":"Egypt","b":-1560,"e":-1070,"fb":3,"c":2,
"coordinates":[[[[26.502052,29.016168],[26.502052,31.136625],[28.955884,30.82472],[32.11083,31.130038],[32.92501,29.705223],[32.92501,28.992816],[33.840962,27.873319],[34.451597,26.143187],[35.475377,24.143486],[34.179207,23.993073],[33.549932,23.390302],[33.298222,22.78753],[33.235295,21.314089],[32.794802,20.175521],[32.731875,18.501156],[32.35431,17.697461],[31.85089,17.362588],[29.963065,17.295613],[29.145007,18.501156],[29.145007,22.385683],[29.33379,22.92148],[29.207935,24.260971],[27.005472,27.073904],[26.502052,29.016168]]],[[[32.57655,30.841031],[32.799517,31.119739],[33.356934,31.286965],[34.025835,31.119739],[34.360286,31.286965],[34.896775,32.136976],[34.997264,32.030024],[35.154583,31.360278],[35.060192,30.958431],[33.073997,29.497922],[32.57655,30.841031]]]],},

{type:"Point",coordinates:[72.868,30.631],b:-2600,e:-1900,score:1000,cap:0,id:1447774,name:"Harappa",msg:""},
{type:"Point",coordinates:[68.136,27.324],b:-2500,e:-1900,score:1000,cap:0,id:1447773,name:"Mohenjo Daro",msg:""},
{type:"Point",coordinates:[31.222,25.886],b:-3250,e:-3250,score:1000,cap:0,id:3,name:"Egypt",msg:""},
{type:"Point",coordinates:[31.255,29.849],b:-3100,e:-3100,score:1000,cap:0,id:14421,name:"King Menes",msg:""},
{type:"Point",coordinates:[45.830,32.057],b:-3000,e:-2300,score:1000,cap:0,id:13332,name:"Sumer",msg:""},
{type:"Point",coordinates:[45.514,36.513],b:-2750,e:-810,score:1000,cap:0,id:14440,name:"Guti",msg:""},
{type:"Point",coordinates:[45.705,32.352],b:-2750,e:-770,score:1000,cap:0,id:13335,name:"Kassites",msg:""},
{type:"Point",coordinates:[48.605,30.583],b:-2750,e:-550,score:1000,cap:0,id:13336,name:"Elamites",msg:""},
{type:"Point",coordinates:[31.134,29.979],b:-2560,e:-2560,score:1000,cap:0,id:14444,name:"Great Pyramid of Giza",msg:""},

{"type":"MultiLineString","coordinates":[[[32.015855,3.613656],[31.935343,3.528002],[31.885114,3.508391],[31.838501,3.526271],[31.784655,3.522989],[31.72378,3.498598],[31.623838,3.363283],[31.484828,3.117019],[31.404316,2.950725],[31.382095,2.864322],[31.387573,2.804015],[31.420646,2.769702],[31.433772,2.718749],[31.42695,2.651208],[31.449895,2.588318],[31.502501,2.530078],[31.515317,2.475922],[31.474803,2.400732]]],id:109,"name":"Albert Nile"},
{"type":"MultiLineString","coordinates":[[[126.689663,72.294399],[126.656952,72.42266],[126.673746,72.48493],[126.729247,72.523997],[126.984115,72.515161],[127.665831,72.43005],[127.726085,72.413203]]],id:142,"name":"Bykovskaya Protoka"},
{"type":"MultiLineString","coordinates":[[[32.015855,3.613656],[31.711222,3.944488],[31.587767,4.101352],[31.543946,4.194499],[31.517177,4.326041],[31.507462,4.495953],[31.525239,4.606024],[31.570404,4.656331],[31.635206,4.816606],[31.719439,5.086873],[31.770289,5.29978],[31.787652,5.455275],[31.788995,5.589478],[31.774319,5.702391],[31.743417,5.80161],[31.672827,5.929974],[31.460437,6.356615],[31.329282,6.581511],[31.148311,6.829661]]],id:126,"name":"Bahr el Jebel  (Mountain Nile)"},
{"type":"MultiLineString","coordinates":[[[31.163297,30.151261],[31.078134,30.324764],[31.107332,30.418919],[31.210374,30.507699],[31.249804,30.623247],[31.225722,30.765693],[31.223965,30.868555],[31.244739,30.931911],[31.310007,31.01852],[31.419871,31.128385],[31.509426,31.186365],[31.578776,31.192412],[31.671225,31.277936],[31.839225,31.526319]]],id:166,"name":"Damietta Branch"},
{"type":"MultiLineString","coordinates":[[[31.237608,30.120694],[31.211821,30.139349],[31.163297,30.151261],[31.052503,30.192395],[30.972456,30.245441],[30.935352,30.305877],[30.89582,30.335487],[30.854789,30.354375],[30.858096,30.384141],[30.848174,30.470673],[30.785956,30.666449],[30.770195,30.780034],[30.785336,30.810781],[30.772107,30.843854],[30.762081,30.866127],[30.763012,30.944365],[30.747354,31.010614],[30.715211,31.064874],[30.655628,31.118101],[30.568708,31.170242],[30.52344,31.229257],[30.519822,31.295093],[30.488196,31.356846],[30.395075,31.457615]]],id:344,"name":"Rosetta Branch"},
{"type":"MultiLineString","coordinates":[[[126.689663,72.294399],[126.474637,72.352587],[126.336144,72.350494],[126.202509,72.307525],[126.019109,72.304217],[125.786049,72.340443],[125.423745,72.436044],[124.932302,72.59097],[124.614182,72.664557],[124.469385,72.656806],[124.221493,72.690886],[123.870507,72.766799],[123.606698,72.792508],[123.430068,72.76791],[123.18936,72.773388],[122.751919,72.906506]]],id:311,"name":"Olenekskaya Protoka"},
{"type":"MultiLineString","coordinates":[[[90.794696,34.300413],[91.151574,34.320903],[91.646582,34.28137],[91.853081,34.235275],[91.936073,34.169439],[92.037256,34.164892],[92.156628,34.221632],[92.308609,34.240081],[92.493094,34.220237],[92.619701,34.179568],[92.688224,34.118021],[92.79013,34.090529],[92.992805,34.100296]]],id:411,"name":"Tuotuo"},
{"type":"MultiLineString","coordinates":[[[32.893114,1.311445],[33.011246,0.809408],[33.084782,0.588543],[33.187256,0.428191]],[[32.475362,1.551637],[32.544712,1.521845]],[[31.365765,2.192864],[31.387366,2.200228],[31.750651,2.323631],[31.948366,2.333295],[32.087272,2.265495],[32.186697,2.235988],[32.246642,2.244773],[32.295321,2.199427],[32.332631,2.100001],[32.348858,2.004684],[32.344,1.913527],[32.282195,1.829837],[32.163546,1.753614],[32.104222,1.698605],[32.104222,1.664757],[32.138431,1.652354],[32.240957,1.665842]]],id:421,"name":"Victoria Nile"},
]}

voyc.SketchPad.prototype = {

	// ---- public

	drawWhat: function(w) {
		this.what = w
		this.finish()
	},

	clear: function () {
		this.strokes = []
		this.draw()
	},

	undo: function() {
		// erase the current or most recent stroke
		if (this.strokes.length > 0)
			this.strokes.pop()
		this.draw()
	},

	finish: function() {
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
		var ndx = this.strokes.length-1
		var firstPoint = this.strokes[ndx].points[0]
		this.addPoint(firstPoint)
	},

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
}

