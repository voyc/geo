/** 
	class GeoIterator
	Inspired by d3.js version 3.5.17, 17 June 2016.
	
	This class contains methods to interate through the coordinates of GeoJSON objects.

	Notes on polygon rings.
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
		In voyc:
			only 1 ring per polygon
			This means that one set of [] goes to waste.
			In iteratePolygon(), we take only the first ring: polygon[0]

	Restrictive assumptions about our data.
		1. No rings.  All of our polygons have 1 ring only.  No holes.
			In our original data, we found two exceptions:
			A. In the countries data, the country of South Africa has one hole, 
				for the country of Lesotho.  We ignore the hole and make certain we
				draw Leosotho on top of South Africa.
			B. In the land data, the 112th polygon has a 52-point hole beginning at
				[48.87488, 36.31921] which is the Caspian Sea.  We ignore the hole and 
				add the Caspian Sea to the lakes data which is drawn on top of the land.

		2. All polygons are closed.  Last point duplicates the first.
			
		3. No straight lines.  So we can skip adaptive resampling.
			Exceptions:
			A. The graticule.  We compose our own graticule using a large number
				of points so that resampling is not necessary.
			B. The line between Canada and USA.
			C. The eastern border of Madagascar.
			To all exceptions, we will solve the issue by adding points to the data,
			instead of additional processing at runtime.
				
		4. Uniform collections.  All the geometries in a GeometryCollection are of
			the same type:  all points or multipoints, all polygons or multipolygons, 
			all lines or multilines.  No one collection combines points,
			lines, and polygons.  This saves us having to change the stack of 
			iteratees for each geometry within one collection iteration.
*/

/* 
	GeoIterator is an abstract class.  It iterates through the data but does nothing.
	Instantiate one of the subclasses below.
*/
voyc.GeoIterator = function() {
	this.ret = false
}

/* 	
	method: iterateCollection()
	entry point. always call this method to iterate a dataset.
	parameter 1 - a collection
	parameter additional - override collectionStart to read additional parameters
*/
voyc.GeoIterator.prototype.iterateCollection = function(collection, ...add) {
	this.ret = false
	this.collection = collection
	if (this.collectionStart(collection, add)) { 
		var boo = true // continue nested iterations until boo goes false
		var geometries = collection['geometries']
		var len = geometries.length
		var i = -1
		while (boo && ++i<len) {
			boo = this.iterateGeometry(geometries[i])
		}
		this.collectionEnd(collection);
	}
	return this.ret // set depending on subclass
}

voyc.GeoIterator.prototype.iterateGeometry = function(geometry) {
	this.geometry = geometry
	if (this.geometryStart(geometry)) {
		var boo = true
		var coordinates = geometry['coordinates']
		var len = coordinates.length
		var i = -1
		switch(geometry['type']) {
			case 'MultiPolygon':
				while (boo && ++i<len) {
					boo = this.iteratePolygon(coordinates[i])
				}
				break
			case 'Polygon':
				boo = this.iteratePolygon(coordinates)
				break
			case 'MultiLineString':
				while (boo && ++i<len) {
					boo = this.iterateLine(coordinates[i])
				}
				break
			case 'LineString':
				boo = this.iterateLine(coordinates)
				break
			case 'MultiPoint':
				while (boo && ++i<len) {
					boo = this.doPoint(coordinates[i], 'point')
				}
				break
			case 'Point':
				boo = this.doPoint(coordinates, 'point')
				break
		}
		this.geometryEnd(geometry)
	}
	return boo
}

voyc.GeoIterator.prototype.iteratePolygon = function(polygon) {
	this.polygon = polygon
	var poly = polygon[0] // voyc uses only one ring per polygon
	if (this.polygonStart(poly)) {
		var boo = true
		var len = poly.length
		len--  // skip the last point because it duplicates the first
		var i = -1
		while (boo && ++i<len) {
			boo = this.doPoint(poly[i], 'poly')
		}
	}
	this.polygonEnd(poly)
	return boo 
}

voyc.GeoIterator.prototype.iterateLine = function(line) {
	this.line = line
	if (this.lineStart(line)) {
		var boo = true
		var len = line.length
		var i = -1
		while (boo && ++i<len) {
			boo = this.doPoint(line[i], 'line')
		}
	}
	this.lineEnd(line)
	return boo
}

voyc.GeoIterator.prototype.doPoint = function(point, within) {
	return true
}

/* 
	overrideable methods
*/
voyc.GeoIterator.prototype.collectionStart = function(collection, ...add) {}
voyc.GeoIterator.prototype.collectionEnd=function(collection) {}
voyc.GeoIterator.prototype.geometryStart = function(geometry) {return true}
voyc.GeoIterator.prototype.geometryEnd = function(geometry) {}
voyc.GeoIterator.prototype.polygonStart = function(polygon) {return true}
voyc.GeoIterator.prototype.polygonEnd = function(polygon) {}
voyc.GeoIterator.prototype.lineStart = function(line) {return true}
voyc.GeoIterator.prototype.lineEnd = function(line) {}

// -------- subclass GeoIteratorCount, for debugging

voyc.GeoIteratorCount = function() {
	voyc.GeoIterator.call(this)
}
voyc.GeoIteratorCount.prototype = Object.create(voyc.GeoIterator.prototype)

voyc.GeoIteratorCount.prototype.collectionStart = function(collection, add) {
	console.log(['iterate count',collection.name])
	this.saveCollection = collection
	this.option1 = add[0] // custom
	this.option2 = add[1]
	this.option3 = add[2]
	this.points = 0
	this.lines = 0
	this.polygons = 0
	this.geometries = 0
}
voyc.GeoIteratorCount.prototype.collectionEnd = function(collection) {
	log&console.log([collection.name,
		'geom',this.geometries,
		'poly',this.polygons,
		'line',this.lines,
		'pt',this.points])
},
voyc.GeoIteratorCount.prototype.doPoint = function(point, within) { this.points++; return true }
voyc.GeoIteratorCount.prototype.lineStart = function(line) { this.lines++; return true }
voyc.GeoIteratorCount.prototype.polygonStart = function(polygon) { this.polygons++; return true }
voyc.GeoIteratorCount.prototype.geometryStart = function(geometry) { this.geometries++; return true}

// -------- subclass GeoIteratorDraw, with clipping

voyc.GeoIteratorDraw = function() {
	voyc.GeoIterator.call(this) // super
}
voyc.GeoIteratorDraw.prototype = Object.create(voyc.GeoIterator.prototype) // inherit

voyc.GeoIteratorDraw.prototype.collectionStart = function(collection, add) {
	console.log(['iterate draw',collection.name])
	this.projection = add[0]
	this.ctx = add[1]
	this.palette = add[2]
	this.scalerank = add[3]
	this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
	this.ctx.beginPath();
	return true
}

voyc.GeoIteratorDraw.prototype.geometryStart = function(geometry) {
	//if (geometry.type == 'MultiLineString') 
	//	if (geometry.name != 'Bratul Sulina') 
	//		return false
	//  ??? this needs to be >=	
	if (this.collection.name == 'rivers') 
		var x = 3
	return ((this.scalerank == 'x') || (geometry.scalerank == this.scalerank))
}

voyc.GeoIteratorDraw.prototype.collectionEnd = function(collection) {
	this.ctx.fillStyle = this.palette.fill
	this.ctx.strokeStyle = this.palette.stroke
	this.ctx.linewidth = this.palette.pen
	if (this.palette.isFill) this.ctx.fill()
	if (this.palette.isStroke) this.ctx.stroke()
}

voyc.GeoIteratorDraw.prototype.lineStart = function(line) {
	this.polygonStart(line)
	return true
}

voyc.GeoIteratorDraw.prototype.polygonStart = function(polygon) {
	this.pointCount = 0;
	this.visiblePointCount = 0;
	this.firstVisiblePointInRing = false;
	this.lastVisiblePointInRing = false;
	this.lastVisiblePointBeforeGap = false;
	this.firstVisiblePointAfterGap = false;
	this.isGapAtStart = false;
	this.isGapAtEnd = false;
	this.previousPt = false;
	return true
}
voyc.GeoIteratorDraw.prototype.polygonEnd = function(polygon) {
	if (!this.previousPt) {
		this.isGapAtEnd = true;
	}
	if (this.visiblePointCount && (this.isGapAtStart || this.isGapAtEnd)) {
		this.arcGap(this.lastVisiblePointInRing, 
			this.firstVisiblePointInRing, 
			this.projection.pt, 
			this.projection.k, 
			this.ctx);
		this.ctx.lineTo(this.firstVisiblePointInRing[0],this.firstVisiblePointInRing[1]);
	}
	this.ctx.closePath();
}

voyc.GeoIteratorDraw.prototype.doPoint = function(co, within) {
	var pt = this.projection.project(co);
	if (pt) {                                              // if visible
		if (!this.firstVisiblePointInRing) {           //    if first visible point
			this.firstVisiblePointInRing = pt;     //       save it
		}
		else if (this.lastVisiblePointBeforeGap) {     //    else if gap finished
			this.firstVisiblePointAfterGap = pt;   //       save 1st visible after gap
			if (within == 'poly')
				this.arcGap(this.lastVisiblePointBeforeGap, 
					this.firstVisiblePointAfterGap, 
					this.projection.pt,    //       if poly 
					this.projection.k)     //          draw arc in the gap 
			else if (within == 'line')             //       if line
				this.visiblePointCount = 0     //          kill the lineTo 
			this.lastVisiblePointBeforeGap = false;//          mark done with gap
		}
		if (this.visiblePointCount) {                  //    if some visible point already
			this.ctx.lineTo(pt[0],pt[1])           //       lineTo
		}
		else {                                         //    else
			this.ctx.moveTo(pt[0],pt[1]);          //       moveTo
		}
		this.visiblePointCount++                       //    count it
		this.lastVisiblePointInRing = pt               //    mark it last visible (so far)
	}
	else {                                                 // else if not visible
		if (!this.pointCount) {                        //    if first point
			this.isGapAtStart = true               //       mark gap at start
		}
		if (!this.lastVisiblePointBeforeGap &&         //    if no last-before-gap
				this.previousPt) {             //       and not the first point
			this.lastVisiblePointBeforeGap = this.previousPt;
		}                                              //       prev point was last-before-gap
	}
	this.pointCount++                                      // count
	this.previousPt = pt                                   // save previous
	return true
}

voyc.GeoIteratorDraw.prototype.findTangent = function(ob,oc,ctr,r) {
	var dθ = oc.θ - ob.θ;
	var θ3 = ob.θ + dθ/2;
	var r3 = r/Math.cos(dθ/2);
	var x1 = ctr[0] + r3*Math.cos(θ3);
	var y1 = ctr[1] + r3*Math.sin(θ3);
	return [x1,y1];
}
voyc.GeoIteratorDraw.prototype.extendToCircumference = function(pt,ctr,r) {
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
}
voyc.GeoIteratorDraw.prototype.arcGap = function(a,d,ctr,r) {
	// given two points, a center and radius
	// extend both points to the circumference, 
	// 	otherwise you get a thick mish-mash of lines around the edge
	// draw a line to the first point
	// then, arc to the second point
	ob = this.extendToCircumference(a,ctr,r);
	oc = this.extendToCircumference(d,ctr,r);
	var e = this.findTangent(ob, oc,ctr,r);
	this.ctx.lineTo(ob.pt[0],ob.pt[1]);
	this.ctx.arcTo(e[0],e[1],oc.pt[0],oc.pt[1],r);
}

// -------- subclass GeoIteratorAnimate, draw rivers with offset points

voyc.GeoIteratorAnimate = function() {
	voyc.GeoIterator.call(this) // super
}
voyc.GeoIteratorAnimate.prototype = Object.create(voyc.GeoIterator.prototype) // inherit

voyc.GeoIteratorAnimate.prototype.collectionStart = function(collection, add) {
	console.log(['iterate animate',collection.name])
	this.projection = add[0]
	this.ctx = add[1]
	this.palette = add[2]
	this.offset = add[3] || 1
	this.skip   = add[4] || 3
	this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)
	this.ctx.beginPath()
	this.n = 0
	return true
}

voyc.GeoIteratorAnimate.prototype.collectionEnd = function(collection) {
	this.ctx.fillStyle = this.palette.fill
	this.ctx.strokeStyle = this.palette.stroke
	this.ctx.linewidth = this.palette.pen
	if (this.palette.isFill) this.ctx.fill()
	if (this.palette.isStroke) this.ctx.stroke()
}

voyc.GeoIteratorAnimate.prototype.doPoint = function(co, within) {
	var pt = this.projection.project(co);
	if (pt) {
		this.n++
		if ((this.n+this.offset) % this.skip == 0) {
			var x = parseInt(pt[0])
			var y = parseInt(pt[1])
			var sz = this.palette.pen
			this.ctx.moveTo(x-sz,y-sz)
			this.ctx.lineTo(x+sz,y-sz)
			this.ctx.lineTo(x+sz,y+sz)
			this.ctx.lineTo(x-sz,y+sz)
			this.ctx.lineTo(x-sz,y-sz)
			this.ctx.closePath()
		}
	}
	return true
}

// -------- subclass GeoIteratorHitTest, return a geometry intersecing a point

voyc.GeoIteratorHitTest = function() {
	voyc.GeoIterator.call(this) // super
}
voyc.GeoIteratorHitTest.prototype = Object.create(voyc.GeoIterator.prototype) // inherit

voyc.GeoIteratorHitTest.prototype.collectionStart = function(collection, add) {
	console.log(['iterate hittest',collection.name])
	this.ret = false
	this.projection = add[0]
	this.mousept = add[1]
	var size = 15
	this.mouserect = {
		w:this.mousept[0]-size,
		e:this.mousept[0]+size,
		n:this.mousept[1]-size,
		s:this.mousept[1]+size,
	}
	this.mouseco = this.projection.invert(this.mousept)
	this.ptPrev = false
	this.hits = []
	this.d = []
	return true
}

voyc.GeoIteratorHitTest.prototype.geometryStart = function(geometry) {
	return true
}
voyc.GeoIteratorHitTest.prototype.geometryEnd = function(geometry) {
	if (this.ret) {
		this.d.sort()
		var d = this.d[0]
		this.hits.push({name:geometry.name,d:d})
		this.ret = false
	}
}
voyc.GeoIteratorHitTest.prototype.collectionEnd = function() {
	var a = []
	for (var o of this.hits)
		a.push(o.name)
	console.log(a)
	if (this.hits.length > 0) {
		this.hits.sort(function(a, b){return a.d - b.d})
		this.ret = this.hits[0].name
	}
}

voyc.GeoIteratorHitTest.prototype.doPoint = function(co, within) {
	var pt = this.projection.project(co)
	//console.log(['co',co[0],co[1],'pt',pt[0],pt[1]])
	var boo = true
	var match = false
	if (pt) {
		if (within == 'point') 
			match = this.pointInRect(pt,this.rect)
		if (within == 'poly')
			match = this.pointInPoly(pt,poly)
	
		if (within == 'line')
			if (this.ptPrev) {
				var d = voyc.distancePointToLineSeg(this.mousept,this.ptPrev,pt)
				if (d < 10) {
					this.d.push(d)
					match = true
				}
			}
			this.ptPrev = pt	
	}
	if (match)
		this.ret = true
	return true 
}
voyc.GeoIteratorHitTest.prototype.pointInPolygon= function(pt,poly) {
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
voyc.GeoIteratorHitTest.prototype.pointInRect= function(pt,rect) {
	return(    (pt[0] > rect.w)
		&& (pt[0] < rect.e)
		&& (pt[1] > rect.n)
		&& (pt[1] < rect.s))
}
