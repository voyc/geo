/**
	class Hud
	singleton
	manages the Hud as the top layer of the map
	@constructor
*/
voyc.Hud = function() {
	// singleton
	if (voyc.Hud._instance) return voyc.Hud._instance;
	else voyc.Hud._instance = this;

	this.elem = {};
	this.keyIsDown = false;
	this.mapzoomer = {};
	this.mapzoomerIsHot = false;
	this.timeslider = {};
	this.timesliderIsHot = false;
	this.menuIsOpen = false;

	// touch gesture constants
	this.periodtap = 500
	this.perioddoubletap = 250
	this.pinchThreshold = .1
	this.twistThreshold = .001

	// touch gesture variables
	this.timetouchmove  = new Date()
	this.timetouchstart = new Date()
	this.timetouchend   = new Date()
	this.timetap        = new Date()
	this.hypo  = false
	this.angle = false
	this.pttouchstart = false
}

voyc.Hud.prototype.setup = function(elem) {
	this.elem = elem;
	this.menuIsOpen = false;
	this.populateLayerMenu()
	this.setupProjectBtn()
}

voyc.Hud.prototype.populateLayerMenu = function() {
	var s = ''
	for (var id in voyc.layers) {
		s += voyc.prepString("<div><span><input type='checkbox' checked layerid='$1' id='layer$1' class='layermenucheckbox' /><label for='layer$1' > $2</label></span>", [id, voyc.layers[id]])
		s += voyc.prepString("<button g id='palettebtn$1' class='layerpalettebtn'><img src='i/palette_black_24.png'/></button></div>", [id])
	}

	{
		s += "<div><span><b>Custom</b></span></div>"
		var id = 'sketch'
		s += voyc.prepString("<div><span><input type='checkbox' checked layerid='$1' id='layer$1' class='layermenucheckbox' /><label for='layer$1' > $2</label></span>", [id, voyc.layers[id]])
		s += voyc.prepString("<button g id='palettebtn$1' class='layerpalettebtn'><img src='i/palette_black_24.png'/></button></div>", [id])
		s += "<div><span><button class='anchor' id='newlayer'>New...</a></span></div>"
	}
	var layermenu = voyc.$('layermenu')
	layermenu.innerHTML = s

	var list = layermenu.querySelectorAll('.layermenucheckbox')
	list.forEach((e) => {
		e.addEventListener('click', function(evt) {
			evt.stopPropagation()
			voyc.geosketch.world.enableLayer(evt.target.getAttribute('layerid'), evt.target.checked)
		}, false)
	})
}



voyc.Hud.prototype.attach = function() {
	this.attachTouchHandlers()
	this.attachMouseHandlers()

	// ----- attach button handlers

	//this.attachButtonHandlers()
	var self = this;
	//document.getElementById('menubtn').addEventListener('click', function(evt) {
	//	//evt.stopPropagation();
	//	if (self.menuIsOpen) {
	//		self.hide(document.getElementById('menu'));
	//		self.menuIsOpen = false;
	//	}
	//	else {
	//		self.populateMenu();
	//		self.show(document.getElementById('menu'));
	//		self.menuIsOpen = true;
	//	}
	//}, false);
	document.getElementById('menuhires').addEventListener('click', function(evt) {
		evt.stopPropagation();
		voyc.geosketch.setOption(voyc.option.HIRES, evt.target.checked);
	}, false);
	document.getElementById('menucheat').addEventListener('click', function(evt) {
		evt.stopPropagation();
		voyc.geosketch.setOption(voyc.option.CHEAT, evt.target.checked);
	}, false);
	document.getElementById('menugraticule').addEventListener('click', function(evt) {
		evt.stopPropagation();
		voyc.geosketch.setOption(voyc.option.GRATICULE, evt.target.checked);
		if (voyc.geosketch.getOption(voyc.option.CHEAT)) {
			voyc.geosketch.render(0);
		}
	}, false);
	document.getElementById('menupresentday').addEventListener('click', function(evt) {
		evt.stopPropagation();
		voyc.geosketch.setOption(voyc.option.PRESENTDAY, evt.target.checked);
	}, false);
	document.getElementById('announcedone').addEventListener('click', function(evt) {
		evt.stopPropagation();
		self.closeAnnouncement();
	}, false);

	document.getElementById('projectbtn').addEventListener('click', function(evt) {self.onProjectBtn(evt)}, false)
	document.getElementById('point').addEventListener('click', function() {voyc.geosketch.sketch.drawWhat('point')}, false);
	document.getElementById('line' ).addEventListener('click', function() {voyc.geosketch.sketch.drawWhat('line')}, false);
	document.getElementById('poly' ).addEventListener('click', function() {voyc.geosketch.sketch.drawWhat('poly')}, false);
	document.getElementById('finish').addEventListener('click', function() {voyc.geosketch.sketch.finish()}, false);
	document.getElementById('erase').addEventListener('click', function() {voyc.geosketch.sketch.erase()}, false);
	document.getElementById('save' ).addEventListener('click', function() {voyc.geosketch.sketch.save()}, false);
	document.getElementById('clear' ).addEventListener('click', function() {voyc.geosketch.sketch.clear()}, false);
	
	// -------- attach map zoomer handlers
	
	//document.getElementById('mapzoom').addEventListener('click', function(evt) {
	//	if (voyc.geosketch.getOption(voyc.option.CHEAT)) {
	//		evt.stopPropagation();
	//	}
	//}, false);
	this.mapzoomer = document.getElementById('mapzoomer');
	this.mapzoomer.min = voyc.geosketch.world.scale.min;
	this.mapzoomer.max = voyc.geosketch.world.scale.max;
	this.mapzoomer.addEventListener('mousedown', function(evt) {self.mapZoomerDown(evt)}, false);
	this.mapzoomer.addEventListener('touchstart', function(evt) {self.mapZoomerDown(evt)}, false);
	this.mapzoomer.addEventListener('input', function(evt) {self.mapZoomerMove(evt)}, false);
	this.mapzoomer.addEventListener('mousemove', function(evt) {self.mapZoomerMove(evt)}, false);
	this.mapzoomer.addEventListener('touchend', function(evt) {self.mapZoomerUp(evt)}, false);
	this.mapzoomer.addEventListener('mouseup', function(evt) {self.mapZoomerUp(evt)}, false);

	document.getElementById('zoomplusbtn').addEventListener('click', function(e) {
		voyc.geosketch.world.zoom(voyc.Spin.IN)	
	}, false);
	document.getElementById('zoomminusbtn').addEventListener('click', function(e) {
		voyc.geosketch.world.zoom(voyc.Spin.OUT)	
	}, false);

	// -------- time slider handlers
	
	document.getElementById('timeslide').addEventListener('click', function(evt) {
		if (voyc.geosketch.getOption(voyc.option.CHEAT)) {
			evt.stopPropagation();
		}
	}, false);
	this.timeslider = document.getElementById('timeslider');
	this.timeslider.min = voyc.geosketch.time.begin;
	this.timeslider.max = voyc.geosketch.time.end;
	this.timeslider.addEventListener('mousedown', function(evt) {
		if (voyc.geosketch.getOption(voyc.option.CHEAT)) {
			self.timesliderIsHot = true;
			evt.stopPropagation();
			voyc.geosketch.timeslideStart();
		}
	}, false);
	this.timeslider.addEventListener('input', function(evt) {
		if (voyc.geosketch.getOption(voyc.option.CHEAT)) {
			voyc.geosketch.timeslideValue(parseInt(this.value,10));
			evt.stopPropagation();
		}
	}, false);
	this.timeslider.addEventListener('mouseup', function(evt) {
		if (voyc.geosketch.getOption(voyc.option.CHEAT)) {
			//voyc.geosketch.timeslideValue(this.value);
			evt.stopPropagation();
			voyc.geosketch.timeslideStop();
			self.timesliderIsHot = false;
		}
	}, false);

	// -------- keyboard handlers

	window.addEventListener('keydown', function(evt) {
		if (evt.keyCode == voyc.Key.C && evt.altKey) {
			voyc.geosketch.setOption(voyc.option.CHEAT, !voyc.geosketch.getOption(voyc.option.CHEAT));
			return;
		}
		if (evt.keyCode == voyc.Key.P && evt.altKey) {
			voyc.geosketch.game.toggle();
			return;
		}
		if (evt.keyCode == voyc.Key.T && evt.altKey) {
			voyc.geosketch.render(voyc.geosketch.previousTimestamp + 100);
			return;
		}
		if (voyc.geosketch.getOption(voyc.option.CHEAT)) {
			if (evt.ctrlKey) {
				switch (evt.keyCode) {
					case 39: voyc.geosketch.timeForward(); break;
					case 37: voyc.geosketch.timeBackward(); break;
					default: return;
				}
			}
			else if (evt.shiftKey) {
				switch (evt.keyCode) {
					case 39: voyc.geosketch.world.spin(voyc.Spin.CW); break;
					case 37: voyc.geosketch.world.spin(voyc.Spin.CCW); break;
					case 38: voyc.geosketch.world.zoom(voyc.Spin.IN); break;
					case 40: voyc.geosketch.world.zoom(voyc.Spin.OUT); break;
					default: return;
				}
			}
			else {
				switch (evt.keyCode) {
					case 39: voyc.geosketch.world.spin(voyc.Spin.RIGHT); break;
					case 37: voyc.geosketch.world.spin(voyc.Spin.LEFT ); break;
					case 38: voyc.geosketch.world.spin(voyc.Spin.DOWN ); break;
					case 40: voyc.geosketch.world.spin(voyc.Spin.UP   ); break;
					default: return;
				}
			}
			evt.preventDefault();
			this.keyIsDown = true;
		}
	}, false);
	window.addEventListener('keyup', function(evt) {
		if (this.keyIsDown) {
			this.keyIsDown = false;
			evt.preventDefault();
			//voyc.geosketch.world.zoomStop();
		}
	}, false);
}

voyc.Hud.prototype.setupProjectBtn = function() {
	var id = (voyc.geosketch.world.projection.mix == voyc.Projection.orthographic) ? 'globeimg' : 'mercimg'
	voyc.show(voyc.$(id),false)
}

voyc.Hud.prototype.onProjectBtn = function(evt,btn) {
	if (evt.currentTarget.firstElementChild.classList.contains('hidden')) {
		voyc.show(voyc.$('mercimg'),false)
		voyc.show(voyc.$('globeimg'),true)
		voyc.geosketch.world.mercator()
	}
	else {
		voyc.show( voyc.$('mercimg'),true)
		voyc.show( voyc.$('globeimg'),false)
		voyc.geosketch.world.orthographic()
	}
}

voyc.Hud.prototype.showWhereami = function (pt,s) {
	var s = s || ''
	if (!s) {
		var co = voyc.geosketch.world.projection.invert(pt)
		lngd = (co[0]<=0) ? '&deg;W'  : '&deg;E'
		latd = (co[1]<=0) ? '&deg;S,&nbsp;': '&deg;N,&nbsp;'
		lng = Math.abs(Math.round(co[0]))
		lat = Math.abs(Math.round(co[1]))
		s = lat + latd + lng + lngd
	}
	voyc.$('whereami').innerHTML = s
}

// -------- mapzoomer handlers

// five ways to zoom, to call world.setScale()
//   1. mouse wheel
//   2. click plus or minus
//   3. drag zoom slider
//   4. keyboard shift up or down arrow
//   5. touch two-finger pinch

// zoom UI, like google earth: up is zoom in, down is zoom out
// up = zoom in: up wheel, up slider, up shift-arrow, up plus

voyc.Hud.prototype.mapZoomerDown = function (evt) {
	evt.stopPropagation();
	this.mapzoomerIsHot = true;
	voyc.geosketch.world.grab()
}
voyc.Hud.prototype.mapZoomerMove = function (evt) {
	evt.stopPropagation();
	if (this.mapzoomerIsHot)
		voyc.geosketch.world.setScale(parseInt(evt.target.value,10));
}

voyc.Hud.prototype.mapZoomerUp = function (evt) {
	evt.stopPropagation();
	this.mapzoomerIsHot = false
	voyc.geosketch.world.drop()
}

voyc.Hud.prototype.mapZoomWheel = function(evt) {
	var spin = (evt.deltaY > 0) ? voyc.Spin.OUT : voyc.Spin.IN
	pt = this.getMousePt(evt)
	voyc.geosketch.world.zoom(spin,pt)	
}

// -------- ?

voyc.Hud.prototype.show = function(elem) {
	elem.classList.remove('hidden');
}
voyc.Hud.prototype.hide = function(elem) {
	elem.classList.add('hidden');
}

voyc.Hud.prototype.populateMenu = function() {
	document.getElementById('menuhires').checked = voyc.geosketch.getOption(voyc.option.HIRES);
	document.getElementById('menucheat').checked = voyc.geosketch.getOption(voyc.option.CHEAT);
	document.getElementById('menugraticule').checked = voyc.geosketch.getOption(voyc.option.GRATICULE);
	document.getElementById('menupresentday').checked = voyc.geosketch.getOption(voyc.option.PRESENTDAY);
}

voyc.Hud.prototype.announce = function(msg,duration) {
	document.getElementById('announcemsg').innerHTML = msg;
	this.show(document.getElementById('announce'));
	if (duration) {
		var self = this;
		setTimeout(function() {
			self.closeAnnouncement();
		}, duration);
	}
}

voyc.Hud.prototype.closeAnnouncement = function() {
	this.hide(document.getElementById('announce'));
}

voyc.Hud.prototype.setTime = function(time) {
	document.getElementById('time').innerHTML = Math.abs(time) + ' ' + ((time < 0) ? 'BCE' : 'CE');
	if (!this.timesliderIsHot) {
		this.timeslider.value = time;
	}
}

voyc.Hud.prototype.setZoom = function(newvalue) {
	if (!this.mapzoomerIsHot) {
		this.mapzoomer.value = newvalue;
	}
	voyc.$('zoomscale').innerHTML = newvalue;
}

// -------- mouse handlers

voyc.Hud.prototype.attachMouseHandlers = function() {
	var self = this
	this.elem.addEventListener('mousemove', function(evt) {self.onmousemove(evt), false})
	this.elem.addEventListener('mousedown', function(evt) {self.onmousedown(evt), false})
	this.elem.addEventListener('mouseup',   function(evt) {self.onmouseup(evt)  , false})
	this.elem.addEventListener('wheel',     function(evt) {self.onwheel(evt)    , false})
	this.elem.addEventListener('click',     function(evt) {self.onclick(evt)    , false})
	this.elem.addEventListener('dblclick',  function(evt) {self.ondblclick(evt) , false})
	this.dragPrev = false;
	this.mousebuttondown = false;
}

voyc.Hud.prototype.getMousePt = function(evt) { 
	var pt = false;
	if (evt.pageX || evt.pageY) {
		pt = [evt.pageX, evt.pageY];
	}
	return pt;
}
	
voyc.Hud.prototype.onmousedown = function(evt) {
	evt.preventDefault()
	evt.stopPropagation()
	this.dragPrev = this.getMousePt(evt)
	this.mousebuttondown = evt.button
	if (evt.button == voyc.mouse.middle)
		voyc.geosketch.world.grab()
}

voyc.Hud.prototype.onmousemove = function(evt) {
	evt.preventDefault()
	evt.stopPropagation()
	var pt = this.getMousePt(evt)
	this.showWhereami(pt)
	if (this.dragPrev) {
		if (this.mousebuttondown == voyc.mouse.middle)
			voyc.geosketch.world.drag(pt, this.dragPrev);
		else
			voyc.geosketch.sketch.addPoint(pt)
		this.dragPrev = pt
	}
}

voyc.Hud.prototype.onmouseup = function(evt) {
	evt.preventDefault();
	evt.stopPropagation();
	this.dragPrev = false;
	if (this.mousebuttondown) 
		voyc.geosketch.world.drop()
	this.mousebuttondown = false
}

voyc.Hud.prototype.onclick = function(evt) {
	evt.preventDefault();
	evt.stopPropagation();
	var pt = this.getMousePt(evt)
	if (evt.shiftKey) {
		var s = voyc.geosketch.world.hit(pt)
		this.showWhereami(pt,s)
	}
	else
		voyc.geosketch.sketch.addPoint(pt)
}

voyc.Hud.prototype.ondblclick = function(evt) {
	evt.preventDefault();
	evt.stopPropagation();
	voyc.geosketch.sketch.finish()
}

voyc.Hud.prototype.onwheel = function(evt) {
	evt.preventDefault();
	evt.stopPropagation();
	this.mapZoomWheel(evt)
}

// -------- touch handlers

voyc.Hud.prototype.attachTouchHandlers = function() {
	var self = this
	this.elem.addEventListener('touchmove', function(evt) {self.ontouchmove(evt), false})
	this.elem.addEventListener('touchstart',function(evt) {self.ontouchstart(evt), false})
	this.elem.addEventListener('touchend',  function(evt) {self.ontouchend(evt)  , false})

	this.timetouchmove = new Date()
	this.timetouchstart = new Date()
	this.timetouchend = new Date()
}

voyc.Hud.prototype.gesture = function(evt) {
	// return four values
	var g = {x:0, y:0, pinch:0, twist:0}

	// two input touch points
	var x1 = evt.targetTouches[0].pageX - evt.target.offsetLeft
	var y1 = evt.targetTouches[0].pageY - evt.target.offsetTop
	var x2 = evt.targetTouches[1].pageX - evt.target.offsetLeft
	var y2 = evt.targetTouches[1].pageY - evt.target.offsetTop

	// the center between the two points, the average
	g['x'] = Math.round((x1 + x2) / 2)
	g['y'] = Math.round((y1 + y2) / 2)

	// length of the hypotenuse between the two points, distance, size of pinch
	var hypo = Math.sqrt(Math.pow(x1-x2,2) + Math.pow(y1-y2,2)) // pythagorus

	// angle of the hypotenuse to horizontal, twist
	var angle = Math.atan((y2-y1)/(x2-x1)) * (180/Math.PI)

	// init on first move 
	if (!this.hypo) this.hypo = hypo
	if (!this.angle) this.angle = angle

	// adjust for crossing the vertical of plus or minus 90 degrees 
 	if (Math.abs(angle) > 45) {
		if (angle<0 && this.angle>0)  { this.angle -= 180 }
		if (angle>0 && this.angle<0)  { this.angle += 180 }
	}

	// change in pinch and twist since previous event
	mhypo = hypo - this.hypo
	if (Math.abs(mhypo) > this.pinchThreshold) {
		g['pinch'] = mhypo
		this.hypo = hypo
	}
	mangle = angle - this.angle
	if (Math.abs(mangle) > this.twistThreshold) {
		g['twist'] = mangle
		this.angle = angle
	}
	return g
}

voyc.Hud.prototype.ptTouch = function(evt) {
	return [Math.round(evt.targetTouches[0].pageX - evt.target.offsetLeft),
		Math.round(evt.targetTouches[0].pageY - evt.target.offsetTop)]
}

voyc.Hud.prototype.ontouchmove = function(evt) {
	if (this.touchdown && evt.currentTarget == this.elem) ; else return
	var time = new Date()

	if (evt.touches.length > 1) {
		g = this.gesture(evt)
		this.publish(evt, 'twofingermove', [g['x'], g['y']], g['pinch'], g['twist'])
	}
	else {
		this.publish(evt, 'onefingermove', this.ptTouch(evt))
	}

	this.timetouchmove = time
}

voyc.Hud.prototype.ontouchstart = function(evt) {
	if (evt.target == this.elem && evt.currentTarget == this.elem) ; else return
	this.touchdown = true
	var time = new Date()


	this.timetouchstart = time
	this.pttouchstart = this.ptTouch(evt)
	this.ptPrev = this.pttouchstart
}

voyc.Hud.prototype.ontouchend  = function(evt) {
	if (this.touchdown && evt.currentTarget == this.elem) ; else return
	this.touchdown = false

	var time = new Date()

	// detect tap and doubletap
	if (((time - this.timetouchstart) < this.periodtap) &&
			(this.timetouchstart > this.timetouchmove)) {
		if ((time - this.timetap) < this.perioddoubletap) {
			this.publish(evt, 'doubletap')
		}
		else {
			this.publish(evt, 'tap', this.pttouchstart)
			this.timetap = time
		}
	}

	this.hypo = false
	this.angle = false
	this.ptPrev = false
	this.timetouchend = time
}

voyc.Hud.prototype.publish = function(evt, name, pt, pinch, twist) {
	// window events: touchstart, touchend, touchmove
	// geosketch events: tap, doubletap, onefingermove, twofingermove
	if (name == 'tap') 
		voyc.geosketch.sketch.addPoint(pt)
	else if (name == 'doubletap') 
		voyc.geosketch.sketch.finish()
	else if (name == 'onefingermove') 
		voyc.geosketch.sketch.addPoint(pt)
	else if (name == 'twofingermove') {
		voyc.geosketch.world.drag(pt,this.ptPrev)
		this.ptPrev = pt
		//voyc.geosketch.world.zoom(pinch)
	}
}

voyc.mouse = {
	left: 0,
	middle: 1,
	right: 2,
}
