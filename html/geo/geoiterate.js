/** 
	class GeoIterate
	@constructor 
	Inspired by d3.js version 3.5.17, 17 June 2016.
	
	This class contains methods to interate through the coordinates of GeoJSON objects.

	Notes on polygons.
		One polygon includes one or more rings.
		The first ring is the exterior ring and must wind clockwise.
		Additional rings are holes and must wind counter-clockwise.
		A "donut" has two rings, one exterior and one hole.
		"winding" direction is CW or CCW, clockwise or counter-clockwise.
		In a "closed" ring the first point and the last point are identical.
		In d3:
			exterior ring must be clockwise
			interior ring, hole, must be counter-clockwise
			polygons larger than a hemisphere are not supported
		In canvas: 
			A polygon and its holes must be in opposite directions.
			ctx.fillRule or winding rule: "nonzero" or "evenodd"
		In svg:
			?
		In postgis:
			st_reverse(geom) - reverse the direction of a polygon
			st_enforceRHR(geom) - enforce the "right-hand rule"
				right-hand rule means the exterior ring must be CW and holes must be CCW

	Restrictive assumptions about our data.
		1. No rings.  All of our polygons have 1 exterior ring only.  No holes.
			In our original data, we found two exceptions:
			A. In the countries data, the country of South Africa has one hole, 
				for the country of Lesotho.  We ignore the hole and make certain we
				draw Leosotho on top of South Africa.
			B. In the land data, the 112th polygon has a 52-point hole beginning at
				[48.87488, 36.31921] which is the Caspian Sea.  We ignore the hole
				and add the Caspian Sea to the lakes data which is drawn on top of the land.
			
		2. No straight lines.  So we can skip adaptive resampling.
			Exceptions:
			A. The graticule.  We compose our own graticule using a large number
				of points so that resampling is not necessary.
			B. The line between Canada and USA.
			C. The eastern border of Madagascar.
			To all exceptions, we will solve the issue by adding points to the data,
			instead of additional processing at runtime.
				
		3. Uniform collections.  All the geometries in a GeometryCollection are of
			the same type:  all points or multipoints, all polygons or multipolygons, 
			all lines or multilines.  No one collection combines points,
			lines, and polygons.  This saves us having to change the stack of 
			iteratees for each geometry within one collection iteration.
				
				
*/
voyc.GeoIterate = function() {
}

voyc.GeoIterate.prototype.iterateCollection = function(collection, iteratee) {
	iteratee.collectionStart(collection);
	for (geometry in collection['geometries']) {
		this.iterateGeometry(collection['geometries'][geometry], iteratee);
	}
	iteratee.collectionEnd(collection);
}

voyc.GeoIterate.prototype.iterateGeometry = function(geometry, iteratee) {
	var boo = iteratee.geometryStart(geometry);
	if (!boo) {
		return false;
	}
	switch(geometry['type']) {
		case 'MultiPolygon':
			for (var poly in geometry['coordinates']) {
				this.iteratePolygon(geometry['coordinates'][poly],iteratee);
			}
			break;
		case 'Polygon':
			this.iteratePolygon(geometry['coordinates'],iteratee);
			break;
		case 'MultiLineString':
			for (var line in geometry['coordinates']) {
				this.iterateLine(geometry['coordinates'][line],iteratee);
			}
			break;
		case 'LineString':
			this.iterateLine(geometry['coordinates'],iteratee);
			break;
		case 'MultiPoint':
			//for each point {
			//	iteratee.point(geometry['coordinates']);
			//}
			break;
		case 'Point':
			iteratee.point(geometry['coordinates']);
			break;
	}
	iteratee.geometryEnd(geometry);
}

voyc.GeoIterate.prototype.iteratePolygon = function(polygon, iteratee) {
	var poly = polygon[0];
	var boo = iteratee.polygonStart(poly);
	if (boo) {
		var n = poly.length;
		n--;  // skip the last point because it duplicates the first
		for (var i=0; i<n; i++) {
			iteratee.point(poly[i]);
		}
		iteratee.polygonEnd(poly);
	}
}

voyc.GeoIterate.prototype.iterateLine = function(line, iteratee) {
	var boo = iteratee.lineStart(line);
	if (boo) {
		var n = line.length;
		for (var i=0; i<n; i++) {
			iteratee.point(line[i]);
		}
		iteratee.lineEnd(line);
	}
}

/**
	the following iteratee objects
*/

/**
	polygon clipping.
	A gap is a sequence of invisible points in the array of a polygon ring.
	In place of the gap, we draw an arc along the edge of the globe, 
	between the two points on either side of the gap.
	A gap can occur at the start of the ring, at the end of the ring, or interior.
	There can be multiple gaps in any ring.
	@constructor
*/
voyc.GeoIterate.iterateePolygonClipping = function() {
	this.projection = /** @type voyc.OrthographicProjection*/({});
	this.ctx = /**@type CanvasRenderingContext2D */({});
	this.pointCount = 0;
	this.visiblePointCount = 0;
	this.firstVisiblePointInRing =false;
	this.lastVisiblePointInRing =false;
	this.lastVisiblePointBeforeGap =false;
	this.firstVisiblePointAfterGap =false;
	this.isGapAtStart =false;
	this.isGapAtEnd =false;
	this.previousPt =false;
}

voyc.GeoIterate.iterateePolygonClipping.prototype = {
	point: function(co) {
		var pt = this.projection.project(co);
		if (pt) { // if visible
			if (!this.firstVisiblePointInRing) {
				this.firstVisiblePointInRing = pt;
			}
			else if (this.lastVisiblePointBeforeGap) {  // gap finished, first visible point after gap
				this.firstVisiblePointAfterGap = pt;
				this.arcGap(this.lastVisiblePointBeforeGap, this.firstVisiblePointAfterGap, this.projection.pt, this.projection.k, this.ctx);
				this.lastVisiblePointBeforeGap = false;
			}
			if (this.visiblePointCount) {
				this.ctx.lineTo(pt[0],pt[1]);
			}
			else {
				this.ctx.moveTo(pt[0],pt[1]);
			}
			this.visiblePointCount++;
			this.lastVisiblePointInRing = pt;
		}
		else {  // not visible
			if (!this.pointCount) {
				this.isGapAtStart = true;
			}
			if (!this.lastVisiblePointBeforeGap && this.previousPt) {  // pt is first invisible point in the gap
				this.lastVisiblePointBeforeGap = this.previousPt;
			}
		}
		this.pointCount++;
		this.previousPt = pt;
	},
	lineStart: function(line) {},
	lineEnd: function(line) {},
	polygonStart: function(polygon) {
		this.pointCount = 0;
		this.visiblePointCount = 0;
		this.firstVisiblePointInRing = false;
		this.lastVisiblePointInRing = false;
		this.lastVisiblePointBeforeGap = false;
		this.firstVisiblePointAfterGap = false;
		this.isGapAtStart = false;
		this.isGapAtEnd = false;
		this.previousPt = false;
		return true;
	},
	polygonEnd: function(polygon) {
		if (!this.previousPt) {
			this.isGapAtEnd = true;
		}
		if (this.visiblePointCount && (this.isGapAtStart || this.isGapAtEnd)) {
			this.arcGap(this.lastVisiblePointInRing, this.firstVisiblePointInRing, this.projection.pt, this.projection.k, this.ctx);
			this.ctx.lineTo(this.firstVisiblePointInRing[0],this.firstVisiblePointInRing[1]);
		}
		this.ctx.closePath();
	},
	geometryStart: function(geometry) {return true;},
	geometryEnd: function(geometry) {
		if (this.visiblePointCount) {
			geometry.v = true;
		}
		else {
			geometry.v = false;
		}
	},
	collectionStart: function(collection) {},
	collectionEnd: function(collection) {},

	findTangent: function(ob,oc,ctr,r) {
		var dθ = oc.θ - ob.θ;
		var θ3 = ob.θ + dθ/2;
		var r3 = r/Math.cos(dθ/2);
		var x1 = ctr[0] + r3*Math.cos(θ3);
		var y1 = ctr[1] + r3*Math.sin(θ3);
		return [x1,y1];
	},
	extendToCircumference: function(pt,ctr,r) {
		// translate to 0,0
		var x1 = pt[0] - ctr[0];
		var y1 = pt[1] - ctr[1];

		var tanθ = y1/x1;
		var θ = Math.atan(tanθ);
		if (x1 < 0) { // if in Quadrant II or III
			θ += Math.PI;
		}
		var x = Math.cos(θ) * r;
		var y = Math.sin(θ) * r;
		
		
		// translate back to center
		x2 = x+ctr[0];
		y2 = y+ctr[1];
		return {θ:θ, pt:[x2,y2]};
	},
	arcGap: function(a,d,ctr,r,ctx) {
		ob = this.extendToCircumference(a,ctr,r);
		oc = this.extendToCircumference(d,ctr,r);
		var e = this.findTangent(ob, oc,ctr,r);
		ctx.lineTo(ob.pt[0],ob.pt[1]);
		ctx.arcTo(e[0],e[1],oc.pt[0],oc.pt[1],r);
	}
}

/**
	init
	@constructor
*/
voyc.GeoIterate.iterateeInit = function() {
	this.bbox = {};
}
voyc.GeoIterate.iterateeInit.prototype = {
	point: function(pt) {
		if (pt[0] < this.bbox.w) { this.bbox.w = pt[0]}; 
		if (pt[0] > this.bbox.e) { this.bbox.e = pt[0]}; 
		if (pt[1] > this.bbox.n) { this.bbox.n = pt[1]}; 
		if (pt[1] < this.bbox.s) { this.bbox.s = pt[1]};
	},
	polygonStart: function(poly) {return true;},
	polygonEnd: function(poly) {}, 
	geometryStart: function(geometry) { 
		this.bbox = {w:180,n:-90,e:-180,s:90};
		return true; 
	},
	geometryEnd: function(geometry) {
		geometry.q = true;
		geometry.v = false;
		geometry.bbox = this.bbox;
		//console.log(this.bbox, geometry.name);
	},
	collectionStart: function(collection) {},
	collectionEnd: function(collection) {},
}

/** @constructor */
voyc.GeoIterate.iterateeDrawPerGeometry = function() {
	this.colorstack = [];
	this.ctx = /**@type CanvasRenderingContext2D */({});
}
voyc.GeoIterate.iterateeDrawPerGeometry.prototype = {
	geometryStart: function(geometry) {
		if (geometry['q']) {
			this.ctx.beginPath();
		}
		return geometry.q;
	},
	geometryEnd: function(geometry) {
		if (this.visiblePointCount) {
			this.ctx.fillStyle = this.colorstack[geometry['c']];
			this.ctx.fill()
			geometry['v'] = true;
		}
		else {
			geometry['v'] = false;
		}
	},
}

/** @constructor */
voyc.GeoIterate.iterateeLine = function() {
	this.projection = /**@type voyc.OrthographicProjection*/({});
	this.ctx = /**@type CanvasRenderingContext2D */({});
	this.pointCount = 0;
}
voyc.GeoIterate.iterateeLine.prototype = {
	point: function(pt) {
		var p = this.projection.project(pt);
		if (p) {
			if (!this.pointCount) {
				this.ctx.moveTo(p[0],p[1]);
			}
			else {
				this.ctx.lineTo(p[0],p[1]);
			}
			this.pointCount++;
		}
		else {
			//console.log('invisible point');
			this.pointCount = 0;
		}
	},
	lineStart: function(line) {
		this.pointCount = 0;
		return true;
	},
	lineEnd: function(line) {},
	polygonStart: function(polygon) {},
	polygonEnd: function(polygon) {},
	geometryStart: function(geometry) {return true},
	geometryEnd: function(geometry) {},
	collectionStart: function(collection) {
		this.ctx.beginPath();
	},
	collectionEnd: function(collection) {
		this.ctx.stroke();
	},
}

/** @constructor */
voyc.GeoIterate.iterateeLineSvg = function() {
	this.projection = /**@type voyc.OrthographicProjection*/({});
	this.pointCount = 0;
	this.d = '';
}
voyc.GeoIterate.iterateeLineSvg.prototype = {
	point: function(pt) {
		var p = this.projection.project(pt);
		if (p) {
			if (!this.pointCount) {
				this.d += 'M' + p[0] + ' ' + p[1] + ' ';
			}
			else {
				this.d += 'L' + p[0] + ' ' + p[1] + ' ';
			}
			this.pointCount++;
		}
		else {
			//console.log('invisible point');
			this.pointCount = 0;
		}
	},
	lineStart: function(line) {
		this.pointCount = 0;
		return true;
	},
	lineEnd: function(line) {},
	polygonStart: function(polygon) {},
	polygonEnd: function(polygon) {},
	geometryStart: function(geometry) {return true},
	geometryEnd: function(geometry) {},
	collectionStart: function(collection) {
		this.d = '';
	},
	collectionEnd: function(collection) {
	},
}

/** @constructor */
voyc.GeoIterate.iterateePoint = function() {
	this.projection = /**@type voyc.OrthographicProjection*/({});
	this.ctx = /**@type CanvasRenderingContext2D */({});
	this.draw = {
		image:null,
		w:0,
		h:0
	};
	this.pt = [];
}
voyc.GeoIterate.iterateePoint.prototype = {
	point: function(co) {
		var pt = this.projection.project(co);
		if (pt && (pt[0] > 0) && (pt[0]<this.ctx.canvas.width) && (pt[1] > 0) && (pt[1]<this.ctx.canvas.height)) {
			this.pt = pt;
		}
		else {
			this.pt = false;
		}
	},
	geometryStart: function(geometry) {
		geometry['q'] = (geometry['b'] < voyc.plunder.time.now) && (voyc.plunder.time.now < geometry['e']) && !geometry['cap'];
		this.pt = false;
		return geometry['q'];
	},
	geometryEnd: function(geometry) {
		geometry['pt'] = this.pt;
		geometry['v'] = (this.pt) ? true : false;
		if (this.pt) {
			this.ctx.drawImage(
				this.draw.image, // image

				0, // source x
				0, // source y
				this.draw.w, // source width
				this.draw.h, // source height

				this.pt[0] - (this.draw.w/2),  // target x
				this.pt[1] - (this.draw.h/2), // target y
				this.draw.w,   // target width
				this.draw.h   // target height
			);
		}
	},
	collectionStart: function(collection) {
		this.ctx.clearRect(0,0,this.ctx.canvas.width,this.ctx.canvas.height);
	},
	collectionEnd: function(collection) {},
}

/** @constructor */
voyc.GeoIterate.iterateeCounter = function() {
	this.points = 0;
	this.lines = 0;
	this.rings = 0;
	this.polygons = 0;
	this.geometries = 0;
	this.collections = 0;
}
voyc.GeoIterate.iterateeCounter.prototype = {
	point: function(pt) {
		this.points++;
	},
	lineStart: function(pt,geometry) {
		this.lines++;
		return true;
	},
	lineEnd: function(pt,geometry) {},
	polygonStart: function(polygon) {
		this.polygons++;
		return true;
	},
	polygonEnd: function(polygon) {
	},
	geometryStart: function(geometry) {
		this.geometries++;
		return true;
	},
	geometryEnd: function(geometry) {
		//console.log([this.geometries, geometry.id, geometry.type, geometry['coordinates'].length], (this.rings > this.polygons));
	},
	collectionStart: function(collection) {
		this.points = 0;
		this.lines = 0;
		this.rings = 0;
		this.polygons = 0;
		this.geometries = 0;
		this.collections = 1;
	},
	collectionEnd: function(collection) {
		console.log(
			'pt:'+this.points+
			', line:'+this.lines+
			', ring:'+this.rings+
			', poly:'+this.polygons+
			', geom:'+this.geometries+
			', coll:'+this.collections
		);
	},
}

/** @constructor */
voyc.GeoIterate.iterateeHitTest = function() {
	this.projection = /**@type voyc.OrthographicProjection*/({});
	this.targetCoord = [];
	this.suffix = '';
	this.hit = false;
	this.numTests = 0;
}	
voyc.GeoIterate.iterateeHitTest.prototype = {
	point: function(pt) {},
	lineStart: function(pt,geometry) {},
	lineEnd: function(pt,geometry) {},
	polygonStart: function(polygon) {
		var hit = this.pointInPolygon(this.targetCoord, polygon);
		this.numTests++;
		if (hit) {
			this.hit = true;
		}
		return false;
	},
	polygonEnd: function(polygon) {},
	geometryStart: function(geometry) {
		this.hit = false;
		return (geometry.q && geometry.v && this.pointInBbox(this.targetCoord,geometry.bbox));
	},
	geometryEnd: function(geometry) {
		if (this.hit) {
			//console.log('click in ' + geometry.name + this.suffix);
			this.name = geometry.name + this.suffix;
		}
	},
	collectionStart: function(collection) {
		this.numTests = 0;
	},
	collectionEnd: function(collection) {
		//console.log('hittests: ' + this.numTests);
	},

	/**
		Point in Polygon
		http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html#Listing the Vertices
		via geojson-utils
		subroutine called for hittest
	*/
	pointInPolygon: function(pt,poly) {
		var x = pt[0];
		var y = pt[1];
		var inside = false
		for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
			if (((poly[i][1] > y) != (poly[j][1] > y)) && (x < (poly[j][0] - poly[i][0]) * (y - poly[i][1]) / (poly[j][1] - poly[i][1]) + poly[i][0])) {
				inside = !inside;
			}
		}
		return inside;
	},
	pointInBbox: function(pt,bbox) {
		return((pt[0] > bbox.w)
			&& (pt[0] < bbox.e)
			&& (pt[1] < bbox.n)
			&& (pt[1] > bbox.s));
	}
}


/** @constructor */
voyc.GeoIterate.iterateeHitTestPoint = function() {
	this.targetRect = {l:0,t:0,r:0,b:0};
	this.hit = false;
	this.numTests = 0;
}	
voyc.GeoIterate.iterateeHitTestPoint.prototype = {
	point: function(co) {
		var pt = this.projection.project(co);
		if (this.targetRect.l < pt[0] && pt[0] < this.targetRect.r
				&& this.targetRect.t < pt[1] && pt[1] < this.targetRect.b) {
			this.hit = true;
		}
	},
	geometryStart: function(geometry) {
		this.hit = false;
		return (geometry['q'] && geometry['v'] && !geometry['cap']);
	},
	geometryEnd: function(geometry) {
		if (this.hit) {
			//console.log('click in ' + geometry.name + this.suffix);
			this.geom = geometry;
		}
	},
	collectionStart: function(collection) {
		this.numTests = 0;
		this.geom = false;
	},
	collectionEnd: function(collection) {
		//console.log('hittests: ' + this.numTests);
	},
}

/**
	Alternative ctx objects
	Pointilist can be used for line or polygon.
	@constructor
*/
voyc.GeoIterate.ctxPointilist = function() {
	this.ctx = /**@type CanvasRenderingContext2D */({});
}
voyc.GeoIterate.ctxPointilist.prototype = {
	moveTo: function(x,y) {
		this.drawPoint(x,y);
	},
	lineTo: function(x,y) {
		this.drawPoint(x,y);
	},
	closePath: function() {
		this.ctx.closePath();
	},
	drawPoint: function(x,y) {
		this.ctx.moveTo(x-1,y-1);
		this.ctx.lineTo(x+1,y-1);
		this.ctx.lineTo(x+1,y+1);
		this.ctx.lineTo(x-1,y+1);
		this.ctx.lineTo(x-1,y-1);
	}
}
