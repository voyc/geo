/** 
	this.co = JSON.parse(localStorage.getItem('options')) || {};
	class World
	singleton
	represents the output canvas
	@constructor 
*/
voyc.World = function() {
	this.elem = {};
	this.co = [];    // center [lng,lat]  E and N are positive
	this.gamma = 0;  // degrees rotation around the z-axis
	this.w = 0;
	this.h = 0;

	this.projection = {};
	this.globe = {};
	this.layer = [];  // array of layer objects, layer is a canvas

	this.moved = true;
	this.dragging = false;
	
	this.option = {
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
	this.fixupPalette()
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

// --------  scale

// called at startup
voyc.World.prototype.setupScale = function(w,h,scalefactor) {
	// scale = number of pixels to display the radius of the globe
	var halfwid = Math.round(Math.min(w, h) / 2)
	this.scale = {}
	this.scale.min = halfwid * this.option.minScaleFactor   // .5, small number, zoomed out
	this.scale.max = halfwid * this.option.maxScaleFactor   // 6, large number, zoomed in
	this.scale.step = Math.round((this.scale.max - this.scale.min) * this.option.scaleStepPct) // .14
	this.scale.now = halfwid * scalefactor
}

voyc.World.prototype.stoPro = function() {
	localStorage.setItem('pro',this.projection.mix)
}
voyc.World.prototype.stoCo = function() {
	localStorage.setItem('co', JSON.stringify(this.co))
	localStorage.setItem('gamma',this.gamma)
}
voyc.World.prototype.stoScale = function() {
	var scalefactor = this.scale.now / (Math.min(this.w,this.h) /2)
	localStorage.setItem('scalefactor',scalefactor)
}

// public zoom by increment, as with key arrow or mouse wheel
voyc.World.prototype.zoom = function(dir) {
	var x = 0;
	switch(dir) {
		case voyc.Spin.IN: x = 1; break;
		case voyc.Spin.OUT: x = -1; break;
	}
	//var newscale = this.scale.now + (x * this.scale.step); // constant step amount, no good
	var newscale = this.scale.now + (this.scale.now * x * this.option.scaleStepPct);
	newscale = voyc.clamp(newscale, this.scale.min, this.scale.max);
	this.setScale(newscale);
}

// public zoom to a specific scale, as with slider or setup
voyc.World.prototype.setScale = function(newscale) {
	this.scale.now = newscale || this.scale.now
	this.projection.scale(this.scale.now);
	this.moved = true;
	voyc.geosketch.render(0);
	voyc.geosketch.hud.setZoom(this.scale.now);
	this.stoScale()
}

// --------  public move

voyc.World.prototype.spin = function(dir) {
	switch(dir) {
		case voyc.Spin.LEFT : this.co[0] += this.option.spinStep; break;
		case voyc.Spin.RIGHT: this.co[0] -= this.option.spinStep; break;
		case voyc.Spin.UP   : this.co[1] += this.option.spinStep; break;
		case voyc.Spin.DOWN : this.co[1] -= this.option.spinStep; break;
		case voyc.Spin.CW   : this.gamma += this.option.spinStep; break;
		case voyc.Spin.CCW  : this.gamma -= this.option.spinStep; break;
	}
	this.moved = true;
	this.projection.rotate([0-this.co[0], 0-this.co[1], 0-this.gamma]);
	voyc.geosketch.render(0);
	this.stoCo()
}

voyc.World.prototype.grab = function(pt,prev) {
	this.dragging = true
	for (var id of ['empire','rivers1','rivers2','rivers3','rivers4','rivers5','rivers6','feature'].values())
		this.show(this.layer[id].e, false)
	this.animate(false)
}
voyc.World.prototype.drag = function(pt,prev) {
	var coNew = this.projection.invert(pt);
	var coOld = this.projection.invert(prev);
	var rotation = voyc.subtractArray(coNew,coOld)
	this.projection.rotateIncr(rotation)
	this.moved = true
	this.dragging = true
	voyc.geosketch.render(0);
	this.co = this.flipLat(this.projection.co)
	this.stoCo()
}
voyc.World.prototype.drop = function() {
	this.dragging = false
	this.moved = true
	//for (var id of ['empire','rivers','anima','feature'].values())
	for (var id of ['empire','rivers1','rivers2','rivers3','rivers4','rivers5','rivers6','feature'].values())
		this.show(this.layer[id].e, true)
	voyc.geosketch.render(0)  // more detailed drawing
	//this.animate(true)
}

voyc.World.prototype.flipLat = function(co) {
	// in projection, S is positive. Everywhere else, N is positive.
	return [co[0], 0-co[1]]
}

voyc.World.prototype.moveToCoord = function(co) {
	this.co = co
	this.projection.rotate([0-co[0], 0-co[1]])
	this.moved = true;
	voyc.geosketch.render(0);
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
			{
				'type': "MultiLineString", 
				'coordinates': voyc.Geo.graticule(),
			}
		]
	}
}

voyc.World.prototype.setupIterators = function() {
	this.iterator = {}
	this.iterator['count']   = new voyc.GeoIteratorCount()
	this.iterator['draw']    = new voyc.GeoIteratorDraw()
	this.iterator['animate'] = new voyc.GeoIteratorAnimate()
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
		a.palette = voyc.worldPalette[dataid]
		a.ctx = a.e.getContext("2d")
		if (useImageData) a.ctx.createImageData(self.w, self.h)
		self.layer[id] = a

		a.scalerank = parseInt(e.id.substr(6,1)) || 'x'
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
	createLayerCanvas('highmountains'   ,'highmountains'   ,false ,'draw', 'feature')
	createLayerCanvas('lowmountains'    ,'lowmountains'    ,false ,'draw', 'feature')
	createLayerCanvas('mediummountains' ,'mediummountains' ,false ,'draw', 'feature')

	//createLayerCanvas('rivers'          ,'rivers'          ,false ,'draw')
	createLayerCanvas('rivers1'          ,'rivers'          ,false ,'draw')
	createLayerCanvas('rivers2'          ,'rivers'          ,false ,'draw')
	createLayerCanvas('rivers3'          ,'rivers'          ,false ,'draw')
	createLayerCanvas('rivers4'          ,'rivers'          ,false ,'draw')
	createLayerCanvas('rivers5'          ,'rivers'          ,false ,'draw')
	createLayerCanvas('rivers6'          ,'rivers'          ,false ,'draw')

	//createLayerDiv('anima')
	//createLayerCanvas('anim1'           ,'rivers'          ,false ,'animate', 'anima')
	//createLayerCanvas('anim2'           ,'rivers'          ,false ,'animate', 'anima')
	//createLayerCanvas('anim3'           ,'rivers'          ,false ,'animate', 'anima')

	createLayerCanvas('empire'          ,'empire'          ,false ,'draw')
	createLayerCanvas('sketch'          ,'sketch'          ,false ,'draw')
	createLayerCanvas('grid'            ,'grid'            ,false ,'draw')
}


voyc.World.prototype.enableLayer = function(layerid, boo) {
	var layer = this.layer[layerid]
	if (!layer)
		var x = 'debug me'
	layer.enabled = boo
	voyc.show(layer.e, boo)
	this.moved = true
	voyc.geosketch.render(0)
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

// --------  drawing

voyc.World.prototype.resize = function(w, h) {
	this.w = w;
	this.h = h;
	this.projection.translate([this.w/2, this.h/2]);  // position the circle within the canvas (centered) in pixels

	this.marginRect = {
		l:0 + this.option.margin,
		t:0 + this.option.margin,
		r:this.w - this.option.margin,
		b:this.h - this.option.margin
	};

	for (var id in this.layer) {
		a = this.layer[id];
		if (a.type == 'canvas') {
			a.ctx.canvas.width  = this.w;
			a.ctx.canvas.height = this.h;
			a.ctx.canvas.style.width =  this.w + 'px';
			a.ctx.canvas.style.height = this.h + 'px';
		}
		else if (a.type == 'div') {
			a.e.style.width =  this.w + 'px';
			a.e.style.height = this.h + 'px';
		}
	}
	
	//if (useImageData) {
	//	a.imageData = a.ctx.createImageData(this.w, this.h);
	//}
}

voyc.World.prototype.draw = function() {
	if (this.moved) {
		this.drawWater();
		this.drawLayer('land')
		this.drawLayer('grid')
		this.drawLayer('sketch')
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
	layer.iterator.iterateCollection(
		layer.data, 
		this.projection, 
		layer.ctx, 
		layer.palette,
		layer.scalerank)
}

voyc.World.prototype.drawWater = function() {
	var layer = this.layer['water']
	if (!layer.enabled) return
	var ctx = layer.ctx
	var palette = voyc.worldPalette['water']
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
	this.drawLayer('rivers1')
	this.drawLayer('rivers2')
	this.drawLayer('rivers3')
	this.drawLayer('rivers4')
	this.drawLayer('rivers5')
	this.drawLayer('rivers6')
	return

	this.drawLayer('rivers')

	var data = this.layer['rivers'].data
	var ctx  = this.layer['rivers'].ctx
	var palette = voyc.worldPalette['animation']
	iterator = this.animationlayer[0].iterator
	ctx = this.animationlayer[0].ctx
	iterator.iterateCollection(data, this.projection, ctx, palette, 1, 3);
	ctx = this.animationlayer[1].ctx
	iterator.iterateCollection(data, this.projection, ctx, palette, 2, 3);
	ctx = this.animationlayer[2].ctx
	iterator.iterateCollection(data, this.projection, ctx, palette, 3, 3);
	// rivers scale 0-6
}

voyc.World.prototype.drawFeatures = function() {
	for (var id of ['deserts','highmountains','mediummountains','lowmountains'].values())
		this.drawLayer(id)
}

voyc.World.prototype.setupPalette = function() {
	for (var id in voyc.worldPalette) {
		voyc.worldPalette[id].fill = voyc.prepString('rgb($1,$2,$3)', voyc.worldPalette[id].fill)
		voyc.worldPalette[id].stroke = voyc.prepString('rgb($1,$2,$3)', voyc.worldPalette[id].stroke)
	}
}
voyc.World.prototype.fixupPalette = function() {
	for (var id of ['deserts', 'highmountains', 'mediummountains', 'lowmountains'].values())
		voyc.worldPalette[id].fill = this.layer[id].ctx.createPattern(voyc.geosketch.asset.get(id), 'repeat');
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

voyc.worldPalette = {
bkgrd:           {isStroke:0, stroke:[  0,  0,  0], pen:.5, isFill:1, fill:[  0,  0,  0]},
water:           {isStroke:0, stroke:[  0,  0,  0], pen:.5, isFill:1, fill:[111,166,207]},
land:            {isStroke:0, stroke:[  0,  0,  0], pen:.5, isFill:1, fill:[216,218,178]},
grid:            {isStroke:1, stroke:[  0,  0,  0], pen:.5, isFill:0, fill:[  0,  0,  0]},
sketch:          {isStroke:1, stroke:[  0,  0,  0], pen:.5, isFill:0, fill:[  0,  0,  0]},
empire:          {isStroke:1, stroke:[128,128,  0], pen:.5, isFill:0, fill:[  0,  0,  0]},
rivers:          {isStroke:1, stroke:[  0,  0,255], pen:2 , isFill:0, fill:[  0,  0,  0]},
animation:       {isStroke:1, stroke:[255,  0,  0], pen:.5, isFill:0, fill:[  0,  0,  0]},
deserts:         {isStroke:0, stroke:[  0,  0,255], pen:2 , isFill:1, fill:[  0,  0,  0]},
highmountains:   {isStroke:0, stroke:[  0,  0,255], pen:2 , isFill:1, fill:[  0,  0,  0]},
mediummountains: {isStroke:0, stroke:[  0,  0,255], pen:2 , isFill:1, fill:[  0,  0,  0]},
lowmountains:    {isStroke:0, stroke:[  0,  0,255], pen:2 , isFill:1, fill:[  0,  0,  0]},
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
	animation:       'Animation',
	deserts:         'Deserts',
	highmountains:   'Mountains',
}
