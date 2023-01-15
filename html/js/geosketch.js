/**
	class voyc.GeoSketch
	@constructor
	A singleton object
*/
voyc.GeoSketch = function () {
	if (voyc.GeoSketch._instance) return voyc.GeoSketch._instance;
	voyc.GeoSketch._instance = this;

	this.options = {}
	this.defaultOptions = {
		showid:true,
		maxscale:6,
		animation:true,
		fps:20,
	}
}

voyc.GeoSketch.prototype.setup = function () {
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
		self.observer.publish(event+'-requested', 'geosketch', {page:pageid});
	});

	// server communications
	var url = '/svc/';
	if (window.location.origin == 'file://') {
		url = 'http://geosketch.voyc.com/svc';  // for local testing
	}
	this.comm = new voyc.Comm(url, 'acomm', 2, true);

	// images assets
	var path = 'assets/';
	var list = [
		//{key:'hero'    ,path:path+'sprites/survivor-walk-16.png'},
		//{key:'explode' ,path:path+'sprites/explosion-1.png'},
		{key:'tileset' ,path:path+'images/tiles.png'},
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
	var self = this;
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

voyc.GeoSketch.prototype.setupContinue = function () {
	// setup world layer
	this.world = new voyc.World();
	var divworld = document.getElementById('world') 
	this.world.setup( 
		divworld,
		[140,20],  // start position: india 80E 20N
		divworld.clientWidth,
		divworld.clientHeight,
		1	// starting scale factor
	)

	this.hud = new voyc.Hud();
	this.hud.buttons = [1]  // middle
	this.hud.setup(document.getElementById('hud'))

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
	this.world.setScale() // to set the zoomer, forces a render
	this.hud.setCo(this.world.co, this.world.gamma)
	this.hud.setTime(this.world.time.now)
	this.hud.setTool('point')

	if (this.options.animation)
		this.game.start()

	this.observer.publish('setup-complete', 'geosketch', {});
}

// -------- options, settings, preferences

voyc.GeoSketch.prototype.setupOptions = function () {
	this.options = JSON.parse(localStorage.getItem('options')) || this.defaultOptions
	localStorage.setItem( 'options', JSON.stringify(this.options));

	voyc.$('option-showid').checked = this.options.showid
	voyc.$('option-maxscale').value = this.options.maxscale
	voyc.$('option-dim').innerHTML = document.body.clientWidth +' x '+document.body.clientHeight
	voyc.$('option-animation').checked = this.options.animation
	voyc.$('option-fps').value = this.options.fps
}
voyc.GeoSketch.prototype.setOption = function (key,value) {
	this.options[key] = value
	localStorage.setItem('options', JSON.stringify(this.options))
}
voyc.GeoSketch.prototype.getOption = function (key) {
	return this.options[key]
}

// -------- demo from Account

voyc.GeoSketch.prototype.onProfileRequested = function(note) {
	var svcname = 'getprofile';
	var data = {};
	data['si'] = voyc.getSessionId();
	
	// call svc
	var self = this;
	this.comm.request(svcname, data, function(ok, response, xhr) {
		if (!ok) {
			response = { 'status':'system-error'};
		}
		self.observer.publish('getprofile-received', 'geosketch', response);
	});
	this.observer.publish('getprofile-posted', 'geosketch', {});
}

voyc.GeoSketch.prototype.onGetProfileReceived = function(note) {
	var response = note.payload;
	if (response['status'] == 'ok') {
		console.log('getprofile success');
		voyc.$('gender').value = response['gender'];
		voyc.$('photo' ).value = response['photo' ];
		voyc.$('phone' ).value = response['phone' ];
	}
	else {
		console.log('getprofile failed');
	}
}

voyc.GeoSketch.prototype.onProfileSubmitted = function(note) {
	var svcname = 'setprofile';
	var inputs = note.payload.inputs;

	// build data array of name/value pairs from user input
	var data = {};
	data['si'] = voyc.getSessionId();
	data['gender'] = inputs['gender'].value;
	data['photo' ] = inputs['photo' ].value;
	data['phone' ] = inputs['phone' ].value;
	
	// call svc
	var self = this;
	this.comm.request(svcname, data, function(ok, response, xhr) {
		if (!ok) {
			response = { 'status':'system-error'};
		}

		self.observer.publish('setprofile-received', 'geosketch', response);

		if (response['status'] == 'ok') {
			console.log('setprofile success' + response['message']);
		}
		else {
			console.log('setprofile failed');
		}
	});

	this.observer.publish('setprofile-posted', 'geosketch', {});
}

voyc.GeoSketch.prototype.onSetProfilePosted = function(note) {
	console.log('setprofile posted');
}

voyc.GeoSketch.prototype.onSetProfileReceived = function(note) {
	console.log('setprofile received');
}

voyc.GeoSketch.prototype.animate = function(boo) {
	if (boo)
		this.game.start()
	else 
		this.game.stop()
}

voyc.GeoSketch.prototype.render = function (timestamp) {
	if (this.options.animation || !timestamp)
		this.world.drawWorld()
}

voyc.GeoSketch.prototype.resize = function (evt) {
	var w = document.body.clientWidth 
	var h = document.body.clientHeight
	voyc.$('option-dim').innerHTML = w+' x '+h
	this.world.resize(w,h)
	this.hud.resize(w,h)
}

// -------- startup events

window.addEventListener('load', function(evt) {
	voyc.geosketch = new voyc.GeoSketch();
	voyc.geosketch.setup();
	window.addEventListener('resize', function(evt) {
		voyc.geosketch.resize()
	}, false);
}, false);

window['voyc']['onScriptLoaded'] = function(filename) {
	console.log(filename + ' loaded')
}
window['voyc']['onDataLoaded'] = function(filename) {
	console.log(filename + ' loaded')
}
