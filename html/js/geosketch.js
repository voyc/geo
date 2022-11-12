/**
	class voyc.GeoSketch
	@constructor
	A singleton object
*/
voyc.GeoSketch = function () {
	if (voyc.GeoSketch._instance) return voyc.GeoSketch._instance;
	voyc.GeoSketch._instance = this;
	this.setup();
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

	sketch = new voyc.Sketch(document.getElementById('sketch'));
	sketch.draw();
	document.getElementById('clearbtn').addEventListener('click', function() {sketch.clear()}, false);
	document.getElementById('clearmenu').addEventListener('click', function() {sketch.clear()}, false);
	document.addEventListener('keydown', function(event) {
		if (event.key == "Escape") {
			sketch.clear();
		}
	})

	this.observer.publish('setup-complete', 'geosketch', {});
	//(new voyc.3).nav('home');
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

/* on startup */
window.addEventListener('load', function(evt) {
	voyc.geosketch = new voyc.GeoSketch();
}, false);
