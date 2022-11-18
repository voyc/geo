/** 
	class MercatorProjection
	@constructor 
	Inspired by d3.js version 3.5.17, 17 June 2016.
	
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
*/
voyc.MercatorProjection = function() {
	// rotate
	this.δλ = 0;  // delta lambda, horizontal angle in radians
	this.δφ = 0;  // delta phi, vertical angle in radians
	this.δγ = 0;  // delta gamma, elevation
	this.cosδφ = 0;
	this.sinδφ = 0;
	this.cosδγ = 0;
	this.sinδγ = 0;

	// translate
	this.pt = []; // centerpoint in pixels
	this.wd = 0;
	this.ht = 0;
	this.co = []; // center coordinate
	this.w  = 0;
	this.e  = 0;
	this.n  = 0;
	this.s  = 0;

	this.δx = 0;  // delta x in pixels
	this.δy = 0;  // delta y in pixels

	// scale
	this.k = 0;  // scale in pixels.  In orthographic projection, scale = radius of the globe.

	// clip
	this.clipAngle = 0;  // in degrees  (always 90)
	this.radius = 0;  // radius in radians
	this.cr = 0;  // cosine radius, used for clipping
	this.clipType = 'polygon';
}

/**
	rotate([λ,φ,γ])
	Sets the projection’s three-axis rotation 
	to the specified angles λ, φ and γ (yaw, pitch and roll) in degrees :
		λ = lambda = yaw = negative longitude = spin on the x axis
		φ = phi    = pitch = negative latitude = spin on the y axis
		γ = gamma  = roll = spin on the z axis, optional
	See https://www.jasondavies.com/maps/rotate/
*/
voyc.MercatorProjection.prototype.rotate = function(ro) {
	var lng = 0 - ro[0]
	var lat = 0 - ro[1]
	this.co = [lng,lat]
	return


	this.δλ = ro[0] % 360 * voyc.Geo.to_radians;   // delta lambda (horizontal)
	this.δφ = ro[1] % 360 * voyc.Geo.to_radians;   // delta phi (vertical)
	if (ro.length > 2) {
		this.δγ = ro[2] % 360 * voyc.Geo.to_radians;  // delta gamma (z-axis)
	}

	this.cosδφ = Math.cos(this.δφ);
	this.sinδφ = Math.sin(this.δφ);
	this.cosδγ = Math.cos(this.δγ);
	this.sinδγ = Math.sin(this.δγ);
}

/**
	projection.scale(scale)
	Sets the projection’s scale factor to the specified value.
	In the Orthographic projection, scale is equal to the radius of the globe.
*/
voyc.MercatorProjection.prototype.scale = function(k) {
	console.log(['k',k])  // range 241 - 2892
	this.k = k;

	var scale = voyc.geosketch.world.scale
	var pctscale = (k - scale.min) / (scale.max - scale.min)

	lngspread = (360 * pctscale) / 2
	latspread = (180 * pctscale) / 2

	this.w = this.co[0] - lngspread 
	this.e = this.co[0] + lngspread
	this.n = this.co[1] - latspread 
	this.s = this.co[1] + latspread
	console.log([this.k,pctscale,this.w,this.e,this.n,this.s])
}

/**
	center([lng,lat])
	Sets the projection’s center to the specified coordinate, 
	a three-element array of longitude in degrees.
*/
voyc.MercatorProjection.prototype.center = function(co) {
	//this.rotate([0-co[0], 0-co[1]]);
	this.co = co
	//this.pt = this.project(co)
	var scale = voyc.geosketch.world.scale
	var pctscale = (this.k - scale.min) / (scale.max - scale.min)

	lngspread = (360 * pctscale) / 2
	latspread = (180 * pctscale) / 2

	this.w = this.co[0] - lngspread 
	this.e = this.co[0] + lngspread
	this.n = this.co[1] - latspread 
	this.s = this.co[1] + latspread
}

/**
	translate([x,y])
	Sets the projection’s translation offset 
	to the specified two-element array [x, y] in pixels.
	This is normally the center point of the viewport window.
*/
voyc.MercatorProjection.prototype.translate = function(pt) {
	this.pt = pt;
	this.wd = this.pt[0] * 2
	this.ht = this.pt[1] * 2
	this.co = this.invert(pt)

	var nw = this.invert([0,0])
	var se = this.invert([this.wd,this.ht])

	this.w = nw[0]
	this.n = nw[1]
	this.e = se[0]
	this.s = se[1]

	//this.δx = this.pt[0];
	//this.δy = this.pt[1];
}

/**
	clipAngle(angle) in degrees
	Sets the projection’s clipping circle radius to the specified angle in degrees.
	This is used for "small-circle" clipping of each coordinate during project().
	We always use 90 degrees, which is the exact circle of the visible hemisphere.
*/
voyc.MercatorProjection.prototype.clip = function(angle) {
	this.clipAngle = angle;
	this.radius = this.clipAngle * voyc.Geo.to_radians;
	this.cr = Math.cos(this.radius);
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
voyc.MercatorProjection.prototype.clipExtent = function([x1,x2,y1,y2]) {
	// not implemented
}

/**
	isPointVisible(λ, φ)
	Returns true or false.
	Called by project() to implements small-circle clipping of a coordinate.
*/
voyc.MercatorProjection.prototype.isPointVisible = function(λ, φ) {
	return (Math.cos(λ) * Math.cos(φ)) > this.cr;   // cr 6.12323395736766e-17
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
voyc.MercatorProjection.prototype.project = function(co) {

	lng = co[0]
	lat = 0-co[1]

	x = voyc.interpolate(lng, this.w, this.e, 0, this.wd)
	y = voyc.interpolate(lat, this.n, this.s, 0, this.ht)
	return [x,y];

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
	return [work3x,work3y];
}

/**
	[lng,lat] = invert([x,y])
	invert a pixel on the screen back into a geo coordinate
	Projects backward from Cartesian coordinates (in pixels) 
	to spherical coordinates (in degrees). 
	Returns an array [longitude, latitude] given the input array [x, y]. 
*/
voyc.MercatorProjection.prototype.invert = function(pt) {
	lng = voyc.interpolate(pt[0], 0, this.wd, this.w, this.e)
	lat = voyc.interpolate((0-pt[1]), 0, this.ht, this.n, this.s)
	return [lng,lat];

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

	λ -= this.δλ;  // δλ = -1.3962634015954636
	λ = (λ > voyc.Geo.π) ? λ - voyc.Geo.τ : (λ < -voyc.Geo.π) ? λ + voyc.Geo.τ : λ;
	
	λ = λ * voyc.Geo.to_degrees;
	φ = φ * voyc.Geo.to_degrees;
	return [λ,φ];
}

// constrain within pos or neg half pi
voyc.MercatorProjection.prototype.asin = function(x) {
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
voyc.MercatorProjection.prototype.precision = function(x) {
	// not implemented
	// We do NOT do adaptive resampling.
	// "Adaptive resampling" inserts additional points in a line
	// to give it the great arc curvature on the surface of the globe.
	// We assume our data has sufficient points, ie., no long straight lines,
	// so that resampling is not necessary.
}
