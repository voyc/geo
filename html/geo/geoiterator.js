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
}

/* 	method: iterateGeometry()
	entry point. always call this class to iterate a dataset.
	parameter 1 - a collection
	override collectionStart to read additional parameters
*/
voyc.GeoIterator.prototype.iterateCollection = function(collection, ...add) {
	this.collectionStart(collection, add);
	for (geometry in collection['geometries']) {
		this.iterateGeometry(collection['geometries'][geometry]);
	}
	this.collectionEnd(collection);
}

voyc.GeoIterator.prototype.iterateGeometry = function(geometry) {
	this.geometryStart(geometry);
	switch(geometry['type']) {
		case 'MultiPolygon':
			for (var poly in geometry['coordinates']) {
				this.iteratePolygon(geometry['coordinates'][poly]);
			}
			break;
		case 'Polygon':
			this.iteratePolygon(geometry['coordinates']);
			break;
		case 'MultiLineString':
			for (var line in geometry['coordinates']) {
				this.iterateLine(geometry['coordinates'][line]);
			}
			break;
		case 'LineString':
			this.iterateLine(geometry['coordinates']);
			break;
		case 'MultiPoint':
			for (var point in geometry['coordinates']) {
				this.doPoint(geometry['coordinates'], 'point');
			}
			break;
		case 'Point':
			this.doPoint(geometry['coordinates'], 'point');
			break;
	}
	this.geometryEnd(geometry);
}

voyc.GeoIterator.prototype.iteratePolygon = function(polygon) {
	var poly = polygon[0]; // voyc uses only one ring per polygon
	this.polygonStart(poly);
	var n = poly.length;
	n--;  // skip the last point because it duplicates the first
	for (var i=0; i<n; i++) {
		this.doPoint(poly[i], 'poly');
	}
	this.polygonEnd(poly);
}

voyc.GeoIterator.prototype.iterateLine = function(line) {
	this.lineStart(line);
	var n = line.length;
	for (var i=0; i<n; i++) {
		this.doPoint(line[i], 'line');
	}
	this.lineEnd(line);
}

voyc.GeoIterator.prototype.doPoint = function(point, within) {}

/* 
	overrideable methods
*/
voyc.GeoIterator.prototype.collectionStart = function(collection, ...add) {}
voyc.GeoIterator.prototype.collectionEnd=function(collection) {}
voyc.GeoIterator.prototype.geometryStart = function(geometry) {}
voyc.GeoIterator.prototype.geometryEnd = function(geometry) {}
voyc.GeoIterator.prototype.polygonStart = function(polygon) {}
voyc.GeoIterator.prototype.polygonEnd = function(polygon) {}
voyc.GeoIterator.prototype.lineStart = function(line) {}
voyc.GeoIterator.prototype.lineEnd = function(line) {}

// -------- subclass GeoIteratorCount, for debugging

voyc.GeoIteratorCount = function() {
	voyc.GeoIterator.call(this)
}
voyc.GeoIteratorCount.prototype = Object.create(voyc.GeoIterator.prototype)

voyc.GeoIteratorCount.prototype.collectionStart = function(collection, add) {
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
voyc.GeoIteratorCount.prototype.doPoint = function(point, within) { this.points++ }
voyc.GeoIteratorCount.prototype.lineStart = function(line) { this.lines++ }
voyc.GeoIteratorCount.prototype.polygonStart = function(polygon) { this.polygons++ }
voyc.GeoIteratorCount.prototype.geometryStart = function(geometry) { this.geometries++ }

// -------- subclass GeoIteratorDraw, with clipping

voyc.GeoIteratorDraw = function() {
	voyc.GeoIterator.call(this) // super
}
voyc.GeoIteratorDraw.prototype = Object.create(voyc.GeoIterator.prototype) // inherit

voyc.GeoIteratorDraw.prototype.collectionStart = function(collection, add) {
	this.projection = add[0]
	this.ctx = add[1]
	this.palette = add[2]
	this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
	this.ctx.beginPath();
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
}
voyc.GeoIteratorDraw.prototype.lineEnd = function(line) {
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

// entrypoint: iterateCollection(collection, projection, ctx, palette, offset)

voyc.GeoIteratorAnimate.prototype.collectionStart = function(collection, add) {
	this.projection = add[0]
	this.ctx = add[1]
	this.palette = add[2]
	this.offset = add[3] || 1
	this.skip   = add[4] || 3
	this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)
	this.ctx.beginPath()
	this.n = 0
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
			var sz = 1
			this.ctx.moveTo(x-sz,y-sz)
			this.ctx.lineTo(x+sz,y-sz)
			this.ctx.lineTo(x+sz,y+sz)
			this.ctx.lineTo(x-sz,y+sz)
			this.ctx.lineTo(x-sz,y-sz)
			this.ctx.closePath()
		}
	}
}
