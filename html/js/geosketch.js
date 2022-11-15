/**
	class voyc.GeoSketch
	@constructor
	A singleton object
*/
voyc.GeoSketch = function () {
	if (voyc.GeoSketch._instance) return voyc.GeoSketch._instance;
	voyc.GeoSketch._instance = this;

	this.time = {
		begin: 0,
		end: 0,
		now: 0,
		step: 0,
		moved: false,
		sliding: false,
		speed: 10 // years per second	
	}
	
}

voyc.GeoSketch.prototype.setup = function () {
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
		url = 'http://geosketch.hagstrand.com/svc';  // for local testing
	}
	this.comm = new voyc.Comm(url, 'acomm', 2, true);

	// attach app events
	var self = this;
	this.observer.subscribe('profile-requested'   ,'geosketch' ,function(note) { self.onProfileRequested    (note); });
	this.observer.subscribe('profile-submitted'   ,'geosketch' ,function(note) { self.onProfileSubmitted    (note); });
	this.observer.subscribe('setprofile-posted'   ,'geosketch' ,function(note) { self.onSetProfilePosted    (note); });
	this.observer.subscribe('setprofile-received' ,'geosketch' ,function(note) { self.onSetProfileReceived  (note); });
	this.observer.subscribe('getprofile-received' ,'geosketch' ,function(note) { self.onGetProfileReceived  (note); });

	// setup sketch layer
	sketch = new voyc.Sketch(document.getElementById('sketch'));
	sketch.draw();
	document.getElementById('clearbtn').addEventListener('click', function() {sketch.clear()}, false);
	document.getElementById('clearmenu').addEventListener('click', function() {sketch.clear()}, false);
	document.addEventListener('keydown', function(event) {
		if (event.key == "Escape") {
			sketch.clear();
		}
	})

	// setup world layer
	this.world = new voyc.World();
	var divworld = document.getElementById('world') 
	this.world.setup( 
		divworld,
		[80,20,0],  // start position: india 80E 20N
		divworld.clientWidth,
		divworld.clientHeight
	 )

	this.world.setupData()

	this.observer.publish('setup-complete', 'geosketch', {});
	//(new voyc.3).nav('home');

	this.world.moved = true
	this.render()

	this.hud = new voyc.Hud();
	this.hud.setup(document.getElementById('hud'))
	this.hud.attach()
	this.hud.showCheat(true);

	this.keyboard = new voyc.Keyboard();
	this.keyboard.listenForEvents([
		voyc.Key.LEFT, 
		voyc.Key.RIGHT, 
		voyc.Key.UP, 
		voyc.Key.DOWN,
	]);
}

voyc.option = {
	HIRES:0,
	CHEAT:1,
	GRATICULE:2,
	PRESENTDAY:3
}
voyc.GeoSketch.prototype.getOption = function(x) {
	return true;
}

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

voyc.GeoSketch.prototype.render = function (timestamp) {
	if (timestamp) {
		this.calcTime(timestamp);
	}

	// update
	//if (!this.getOption(voyc.option.CHEAT)) {
	//	var keyed = this.hud.checkKeyboard();
	//	this.hero.move(keyed, timestamp);
	//}

	//if (this.world.moved) {
	//	this.hero.updateDestination();
	//}

	// draw world		
	if (this.world.moved || this.time.moved) {
		var ctx = this.world.getLayer(voyc.layer.FOREGROUND).ctx;
		ctx.clearRect(0, 0, this.world.w, this.world.h);
		var ctx = this.world.getLayer(voyc.layer.EMPIRE).ctx;
		ctx.clearRect(0, 0, this.world.w, this.world.h);
	}
	if (this.world.moved) {
		this.world.drawOceansAndLand();
		this.world.drawGrid();
	}	
	//if (this.world.moved && !this.world.dragging && !this.world.zooming) {
	//	this.world.drawFeatures();
	//	this.world.drawRivers();
	//}
	//if ((this.world.moved || this.time.moved) && !this.world.dragging && !this.world.zooming) {
	//	var ctx = this.world.getLayer(voyc.layer.EMPIRE).ctx;
	//	this.drawEmpire(ctx);
	//	ctx = this.world.getLayer(voyc.layer.FOREGROUND).ctx;
	//	this.drawTreasure(ctx);
	//	this.world.drawRiversAnim();
	//}
	//if ((this.world.moved || this.hero.moved) && !this.getOption(voyc.option.CHEAT)) {
	//	this.hero.draw();
	//}

	//if ((this.getOption(voyc.option.CHEAT) && !this.world.dragging && !this.world.zooming)
	//		|| (!this.getOption(voyc.option.CHEAT) && (this.hero.moved))) {
	//	this.hitTestFeatures();
	//}

	//if ((this.time.moved || this.hero.moved) && !this.getOption(voyc.option.CHEAT)) {
	//	this.hitTestTreasure();
	//}

	//this.hero.speed.now = (this.hero.moved) ? this.hero.speed.best : 0;
	//this.hud.setSpeed(this.hero.speed.now);
	////console.log('set speed: ' + this.hero.speed.now);

	//this.drawEffects(ctx);
	
	this.world.moved = false;
	//this.time.moved = false;
	//this.hero.moved = false;
	this.previousTimestamp = timestamp;
	return;
}

/* on startup */
window.addEventListener('load', function(evt) {
	voyc.geosketch = new voyc.GeoSketch();
	voyc.geosketch.setup();
}, false);

window['voyc']['onScriptLoaded'] = function(filename) {
	console.log(filename + ' loaded')
}
