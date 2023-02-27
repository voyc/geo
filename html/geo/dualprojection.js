/** 
	class DualProjection
	@constructor 

	Project orthographic or mercator or a point in between.
	Useful for animating globe to mercatur and back again.
	
	Notes on clipping.
		To clip a point means to remove it from consideration because it is not visible.
		Either it is on the backside hemisphere of the globe (small-circle clipping),
		or it is outside of the viewport window of the screen (extent clipping).
		Antimeridian clipping is for equirectanular and albers equal-area conic projections.
		For orthographic, we always do small-circle clipping with a clipangle of 90 degrees.
		We do NOT implement extent clipping, because it has no visual effect,
		and offers no improvement in performance of canvas drawing.
		There are some additional issues in clipping lines and polygons,
		and these are implemented in class GeoIteration.
		
	Variable naming conventions.
		pt is an [x,y] point in pixels
		co is a [lng,lat] coordinate in degrees
		ro is a [λ,φ,γ] set of angles in degrees

	API
		pt = project(co)
		co = invert(pt)

		set variables used by project and invert, called in response to UI view changes:
			rotate() - when user pans or spins the globe
			translate() - when screen is resized
			scale() - when user zooms in or out
			clipAngle() - on startup to set threshold for small-circle clipping

		subroutines called by project and invert
			clipExtent() - rectangle clipping, not implemented
			precision() - adaptive resampling, not implemented
			asin() - math utility
			isPointVisible() - small-circle clipping

		center()
		
*/
voyc.DualProjection = function() {
	// inputs
	this.projtype = 'orthographic'  // orthographic, equirectangular, mercator, mix
	this.co = []	// center coord [lng,lat]  E and S are positive (opposite of world.co)
	this.pt = []	// center [x,y]
	this.zoom = 0	// [0:20], [0:4], [-2:7]

	// rotate
	this.δλ = 0  // delta lambda, horizontal angle in radians
	this.δφ = 0  // delta phi, vertical angle in radians
	this.δγ = 0  // delta gamma, z-axis angle in radians
	this.cosδφ = 0
	this.sinδφ = 0
	this.cosδγ = 0
	this.sinδγ = 0

	// translate
	this.δx = 0  // delta x in pixels
	this.δy = 0  // delta y in pixels
	this.wd = 0
	this.ht = 0

	// scale
	this.k = 0		// orthographic: radius of the globe in pixels
	this.pxlPerDgr = 0	// equirectangular: ratio pixel to degree
	this.uscale = 0		// all projections: ratio map to earth, used for qualify and palette choice

	// clip
	this.cr = this.clipAngle(90) // cosine of the clip angle in radians
	this.cx = [[],[]]  // clipExtent, rectangle of viewport, used to clip raster mercator points
	this.mx = [[],[]]  // mapExtent, rectangle of complete map, used for mercator stitch
	this.latClamp = 85.05113 // exclude polar regions for perfect mercator square

	//this.mix = 0  // used during animated projection morph
}

voyc.DualProjection.prototype.setProjType = function(projtype) {
	this.projtype = projtype
	this.cx = this.clipExtent()
}

/**
	rotate([λ,φ,γ])
	Sets the projection’s three-axis rotation 
	to the specified angles λ, φ and γ (yaw, pitch and roll) in degrees :
		λ = lambda = yaw = negative longitude = spin on the x axis
		φ = phi    = pitch = negative latitude = spin on the y axis
		γ = gamma  = roll = spin on the z axis, optional
	See https://www.jasondavies.com/maps/rotate/

	called by voyc.World.spin()
		voyc.World maintains current co and gamma values
		spin adjusts by an increment
		passes the zero-complement of the three values as ro
*/
voyc.DualProjection.prototype.rotate = function(ro) {
	// for mercator, set the center coordinate
	var lng = 0 - ro[0] 
	var lat = ro[1]      // flip latitude
	this.co = [lng,lat]  // in here, N is negative

	// for orthographic, set three rotation amounts
	this.δλ = ro[0] % 360 * voyc.Geo.to_radians;   // delta lambda (horizontal)
	this.δφ = ro[1] % 360 * voyc.Geo.to_radians;   // delta phi (vertical)
	if (ro.length > 2) {
		this.δγ = ro[2] % 360 * voyc.Geo.to_radians;  // delta gamma (z-axis)
	}
	this.cosδφ = Math.cos(this.δφ);
	this.sinδφ = Math.sin(this.δφ);
	this.cosδγ = Math.cos(this.δγ);
	this.sinδγ = Math.sin(this.δγ);

	this.cx = this.clipExtent()
}

/**
	projection.scale(zoom)
	Sets the projection’s zoom level
*/
voyc.DualProjection.prototype.scale = function(zoom) {
	this.zoom = zoom				// level between -2 and 20
	this.uscale = voyc.scaler(this.wd,this.zoom)	// universal scale (all projections)

	var square = Math.min(this.wd, this.ht)		// largest square in window, in pixels
	var halfwid = square / 2			// half square

	// scale-factor for orthographic
	this.k = (2**zoom) * (halfwid/Math.PI)	// radius of earth in pixels, for given zoom

	// scale-factor for equirectangular 
	this.pxlPerDgr = (2**zoom) * (square / 360)	// fixed ratio of pixels to degrees

	this.cx = this.clipExtent()
}

/**
	translate([x,y])
	Sets the projection’s translation offset 
	to the specified two-element array [x, y] in pixels.
	This is normally the center point of the viewport window.
	Called on load and resize.
*/
voyc.DualProjection.prototype.translate = function(pt) {
	// save the center point in pixels
	this.pt = pt;

	// for orthographic, set the translation amounts
	this.δx = this.pt[0];
	this.δy = this.pt[1];

	// for mercator, calc screen boundaries in pixels
	this.wd = this.pt[0] * 2
	this.ht = this.pt[1] * 2

	// rescale: zoom is kept constant, factors recalculated for new length
	var square = Math.min(this.wd, this.ht)
	var halfwid = square / 2
	this.k = (2**this.zoom) * (halfwid/Math.PI)
	this.pxlPerDgr = (2**this.zoom) * (square / 360)	// fixed ratio of pixels to degrees

	this.cx = this.clipExtent()
}

/**
	clipAngle(angle) in degrees
	Sets the projection’s clipping circle radius to the specified angle in degrees.
	This is used for "small-circle" clipping of each coordinate during project().
	We always use 90 degrees, which is the exact circle of the visible hemisphere.
*/
voyc.DualProjection.prototype.clipAngle = function(angle) {
	var clipAngle = angle;
	var clipRadians = clipAngle * voyc.Geo.to_radians;
	var cr = Math.cos(clipRadians);
	return cr
}

/**
	clipExtent([x1,y1,x2,y2]) in pixels
	Sets the projection’s viewport clip extent 
	to the specified rectangle bounds in pixels.
	Normally this is [0,0,w,h], the rectangle of the viewport window.

	There are two kinds of clipping:
		1. "small-circle" clipping, which is done during the first phase of projection,
			by comparing the input [lng,lat] coordinates to a visible circle on the globe.
		2. "extent" clipping, performed after point projection, 
			by comparing the output [x,y] point to the visible rectangle of the viewport window.
*/
voyc.DualProjection.prototype.clipExtent = function()  {

	// map extent
	var y = this.latClamp
	var nw = this.project([-180, y])
	var se = this.project([180, 0-y]) 
	var w = nw[0]
	var n = nw[1]
	var e = se[0]
	var s = se[1]
	this.mx = [[w,n],[e,s]]

	// center	
	var wd = e - w
	wd /= 2
	w = this.pt[0] - wd
	e = this.pt[0] + wd

	// clamp to window
	var w = Math.max(w, 0)
	var n = Math.max(n, 0)
	var e = Math.min(e, this.wd)
	var s = Math.min(s, this.ht)

	var cx = [[w,n],[e,s]]
	return cx
}
/*
	if clipExtent intersects pt
*/
voyc.DualProjection.prototype.isVisibleExtent = function(x,y) {
	return (x >= this.cx[0][0]) && (x <= this.cx[1][0])
	    && (y >= this.cx[0][1]) && (y <= this.cx[1][1])
}

/**
	isPointVisible(λ, φ)
	Returns true or false.
	Called by project() to implements small-circle clipping of a coordinate.
*/
voyc.DualProjection.prototype.isPointVisible = function(λ, φ) {
	return (Math.cos(λ) * Math.cos(φ)) > this.cr;   // cr 6.12323395736766e-17
}

voyc.DualProjection.prototype.isPointInCircle = function(x, y) {
	var xc = this.wd/2
	var yc = this.ht/2
	var r = this.k
	return (((x-xc)**2) + ((y-yc)**2) <= r**2)
}

/**
	[x,y] = project([lng,lat])
	project a geo coordinate onto the screen
	Projects forward from spherical coordinates (in degrees) 
	to Cartesian coordinates (in pixels). 
	Returns an array [x, y] given the input array [longitude, latitude]. 
	Returns null when the coordinate is not visible.

	These transformations are performed:
		convert degrees to radians
		rotate on three axes
		clip to the small circle
		projected to the Cartesian plane
			scale
			translate
			adaptive resampling (not implemented) 
		clip to the rectangle extent of the viewport (not implemented)
*/
voyc.DualProjection.prototype.project = function(co) {
	var xe = xm = xo = 0
	var ye = ym = yo = 0

	if (this.projtype == 'equirectangular' || this.projtype == 'mix') {
		lng = co[0]
		lat = 0-co[1]  // flip sign of latitude
		lat = voyc.clamp(lat, 0-this.latClamp, this.latClamp) // exclude polar regions

		// rotate
		lng = lng - this.co[0]
		lat = lat - this.co[1]    

		// scale
		xe = lng * this.pxlPerDgr
		ye = lat * this.pxlPerDgr

		// translate
		xe += this.pt[0]
		ye += this.pt[1]
	}

	if (this.projtype == 'mercator' || this.projtype == 'mix') {
		lng = co[0]
		lat = 0-co[1]
		lat = voyc.clamp(lat, 0-this.latClamp, this.latClamp)

		lat = voyc.mercatorStretch(lat)
		
		// rotate
		lng = lng - this.co[0]
		lat = lat - this.co[1]    

		// scale
		xm = lng * this.pxlPerDgr
		ym = lat * this.pxlPerDgr

		// translate
		xm += this.pt[0]
		ym += this.pt[1]
	}

	if (this.projtype == 'orthographic' || this.projtype == 'mix') {
		// convert degrees to radians
		var λ = co[0] * voyc.Geo.to_radians;  // lambda (small)
		var φ = co[1] * voyc.Geo.to_radians;  // phi (small)
	
		// rotate
		λ += this.δλ;  // lambda plus delta lambda
		λ = (λ > voyc.Geo.π) ? λ - voyc.Geo.τ : (λ < -voyc.Geo.π) ? λ + voyc.Geo.τ : λ;  // constrain to pi
		var cosφ = Math.cos(φ);
		var x = Math.cos(λ) * cosφ;
		var y = Math.sin(λ) * cosφ;
		var z = Math.sin(φ);
		var k = z * this.cosδφ + x * this.sinδφ;
		λ = Math.atan2(y * this.cosδγ - k * this.sinδγ, x * this.cosδφ - z * this.sinδφ);
		φ = this.asin(k * this.cosδγ + y * this.sinδγ);
	
		// clip to small circle
		var boo = this.isPointVisible(λ,φ);
		if (!boo) {
			return false;
		}
	
		// scale
		var cosλ = Math.cos(λ);
		var cosφ = Math.cos(φ);
		var k = 1; //scale(cosλ * cosφ);  // scale() return 1
	
		var work2x = k * cosφ * Math.sin(λ)
		var work2y = k * Math.sin(φ);
	
		// translate
		var work3x = work2x * this.k + this.δx;
		var work3y = this.δy - work2y * this.k;
		
		// clip extent (not implemented)
		xo = work3x
		yo = work3y
	}

	var x = xm || xo || xe
	var y = ym || yo || ye

	if (this.projtype == 'mix') {
		// in-between, mix

		// doing mixes, like with cylindrical for example, requires availablity of visible flag
		var mixpct = .1
		x = xm + ((xo - xm) * mixpct)
		y = ym + ((yo - ym) * mixpct)
	}
	return [x,y];
}

/**
	[lng,lat] = invert([x,y])
	invert a pixel on the screen back into a geo coordinate
	Projects backward from Cartesian coordinates (in pixels) 
	to spherical coordinates (in degrees). 
	Returns an array [longitude, latitude] given the input array [x, y]. 
*/
voyc.DualProjection.prototype.invert = function(pt) {
	var latm = 0
	var lato = 0
	var lngm = 0
	var lngo = 0
	var visible = true

	if (this.projtype == 'equirectangular' || this.projtype == 'mix') {
		visible = this.isVisibleExtent(pt[0], pt[1])

		x = pt[0] - this.pt[0]
		y = pt[1] - this.pt[1]

		lngm = x / this.pxlPerDgr
		latm = 0 - (y / this.pxlPerDgr)

		lngm += this.co[0]
		latm -= this.co[1]
	}

	if (this.projtype == 'mercator' || this.projtype == 'mix') {
		visible = this.isVisibleExtent(pt[0], pt[1])

		x = pt[0] - this.pt[0]
		y = pt[1] - this.pt[1]

		lngm = x / this.pxlPerDgr
		latm = y / this.pxlPerDgr

		lngm += this.co[0]
		latm += this.co[1]

		latm = voyc.mercatorShrink(latm)
		latm = (0-latm)
	}

	if (this.projtype == 'orthographic' || this.projtype == 'mix') {
		var visible = this.isPointInCircle(pt[0],pt[1])

		var x = (pt[0] - this.δx) / this.k;
		var y = (this.δy - pt[1]) / this.k;
	
		var ρ = Math.sqrt(x * x + y * y);
		var c = this.asin(ρ); //angle(ρ);
		var sinc = Math.sin(c);
		var cosc = Math.cos(c);
		var λ = Math.atan2(x * sinc, ρ * cosc);
		var φ = Math.asin(ρ && y * sinc / ρ);
	
		var cosφ = Math.cos(φ);
		var xx = Math.cos(λ) * cosφ;
		var yy = Math.sin(λ) * cosφ;
		var zz = Math.sin(φ);
		var k = zz * this.cosδγ - yy * this.sinδγ;
		λ = Math.atan2(yy * this.cosδγ + zz * this.sinδγ, xx * this.cosδφ + k * this.sinδφ); 
		φ = this.asin(k * this.cosδφ - xx * this.sinδφ);
	
		// clip to small circle
		//var boo = this.isPointVisibleInvert(λ,φ)
		//if (!boo) 
		//	return false

		//var test1 = (λ > voyc.Geo.π)
		//var test2 = (λ < -voyc.Geo.π)
		
		λ -= this.δλ;  // δλ = -1.3962634015954636
		λ = (λ > voyc.Geo.π) ? λ - voyc.Geo.τ : (λ < -voyc.Geo.π) ? λ + voyc.Geo.τ : λ;

		lngo = λ * voyc.Geo.to_degrees;
		lato = φ * voyc.Geo.to_degrees;
	}

	var lng = lngm || lngo
	var lat = latm || lato
	return [lng,lat,visible];
}

// constrain within pos or neg half pi
voyc.DualProjection.prototype.asin = function(x) {
	return x > 1 ? voyc.Geo.halfπ : x < -1 ? -voyc.Geo.halfπ : Math.asin(x);
}

/**
	precision(precision) in pixels
	Sets the threshold for the projection’s adaptive resampling 
	to the specified value in pixels.
	This value corresponds to the Douglas–Peucker distance. 
	Defaults to Math.SQRT(1/2).
	A precision of 0 disables adaptive resampling.
*/
voyc.DualProjection.prototype.precision = function(x) {
	// not implemented
	// We do NOT do adaptive resampling.
	// "Adaptive resampling" inserts additional points in a line
	// to give it the great arc curvature on the surface of the globe.
	// We assume our data has sufficient points, ie., no long straight lines,
	// so that resampling is not necessary.
}

