/**
	class voyc.Geo
	@constructor
	A singleton object
*/
voyc.Geo = function () {
	if (voyc.Geo._instance) return voyc.Geo._instance;
	voyc.Geo._instance = this;

	this.options = {}
	this.defaultOptions = {
		showid:false,
		devzoom:false,
		devmix:false,
		hires:true,
		animation:true,
		fps:20,
	}
}

voyc.Geo.prototype.setup = function () {
	this.setupOptions()

	this.observer = new voyc.Observer();
	new voyc.View();
	new voyc.User();
	new voyc.Account();
	new voyc.AccountView();

	// set drawPage method as the callback in BrowserHistory object
	var self = this;
	new voyc.BrowserHistory('name', function(pageid) {
		var event = pageid.split('-')[0];
		self.observer.publish(event+'-requested', 'geo', {page:pageid});
	});

	// server communications
	var url = '/svc/';
	if (window.location.origin == 'file://') {
		url = 'http://geo.voyc.com/svc';  // for local testing
	}
	this.comm = new voyc.Comm(url, 'acomm', 2, true);

	// images assets
	var path = 'assets/';
	var list = [
		{key:'reddot'  ,path:path+'images/reddot.png'},
		{key:'crosshair',path:path+'images/crosshair.png'},
		{key:'redxbox' ,path:path+'images/red-xbox.png'},
		{key:'bluebox' ,path:path+'images/blue-xbox.png'},
		{key:'treasure',path:path+'images/chest32.png'},
		{key:'mountains_1'   ,path:path+'images/mountains_1b.png'},
		{key:'mountains_2'   ,path:path+'images/mountains_2b.png'},
		{key:'mountains_3'   ,path:path+'images/mountains_3b.png'},
		{key:'deserts'         ,path:path+'images/deserts.png'},
		{key:'point'   ,path:'i/yellow-dot-lg-n.gif'},
	];
	this.asset = new voyc.Asset();
	this.asset.load(list, function(success, key) {
		if (!key)
			self.setupContinue();	
	})

	this.game = new voyc.Game()
	this.game.maxfps = this.options.fps
	this.game.onRender = function(elapsed) {
		self.render(elapsed)
	}
}

voyc.Geo.prototype.setupContinue = function () {
	// setup world layer
	this.world = new voyc.World();
	var divworld = document.getElementById('world') 
	this.world.setup( 
		divworld,
		[140,20],  // start position: india 80E 20N
		divworld.clientWidth,
		divworld.clientHeight,
		0	// starting zoom
	)

	this.hud = new voyc.Hud();
	this.hud.buttons = [1]  // middle
	this.hud.setup(document.getElementById('hud'), this.comm)

	//this.keyboard = new voyc.Keyboard();
	//this.keyboard.listenForEvents([
	//	voyc.Key.LEFT, 
	//	voyc.Key.RIGHT, 
	//	voyc.Key.UP, 
	//	voyc.Key.DOWN,
	//]);

	// setup sketch layer
	this.sketch = new voyc.SketchPad(document.getElementById('sketch'),document.getElementById('hud'));
	this.sketch.setup()

	this.world.moved = true
	this.world.setZoom() // to set the zoomer, forces a render
	this.hud.setCo(this.world.co, this.world.gamma)
	this.hud.setTime(this.world.time.now)
	this.hud.setTool('point')

	if (this.options.animation)
		this.game.start()

	var self = this;
	this.observer.publish('setup-complete', 'geo', {});
}

// -------- options, settings, preferences

voyc.Geo.prototype.setupOptions = function () {
	this.options = JSON.parse(localStorage.getItem('options')) || this.defaultOptions
	localStorage.setItem( 'options', JSON.stringify(this.options));

	voyc.$('option-showid').checked = this.options.showid
	voyc.$('option-devzoom').checked = this.options.devzoom
	voyc.$('option-devmix').checked = this.options.devmix
	voyc.$('option-hires').checked = this.options.hires
	voyc.$('option-animation').checked = this.options.animation
	voyc.$('option-fps').value = this.options.fps

	voyc.$('option-dim').innerHTML = document.body.clientWidth +' x '+document.body.clientHeight
}
voyc.Geo.prototype.setOption = function (key,value) {
	this.options[key] = value
	localStorage.setItem('options', JSON.stringify(this.options))
}
voyc.Geo.prototype.getOption = function (key) {
	return this.options[key]
}

// --------

voyc.Geo.prototype.animate = function(boo) {
	if (boo)
		this.game.start()
	else 
		this.game.stop()
}

voyc.Geo.prototype.render = function (timestamp) {
	if (this.options.animation || !timestamp)
		this.world.drawWorld()
}

voyc.Geo.prototype.resize = function (evt) {
	var w = document.body.clientWidth 
	var h = document.body.clientHeight
	voyc.$('option-dim').innerHTML = w+' x '+h
	this.world.resize(w,h)
	this.hud.resize(w,h)
}

// -------- startup events

window.addEventListener('load', function(evt) {
	voyc.geo = new voyc.Geo();
	voyc.geo.setup();
	window.addEventListener('resize', function(evt) {
		voyc.geo.resize()
	}, false);
}, false);

window['voyc']['onScriptLoaded'] = function(filename) {
	console.log(filename + ' loaded')
}
window['voyc']['onDataLoaded'] = function(filename) {
	console.log(filename + ' loaded')
}
