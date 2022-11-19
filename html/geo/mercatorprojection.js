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
	this.co = []; // center coordinate

	// translate
	this.pt = []; // centerpoint in pixels
	this.wd = 0;
	this.ht = 0;

	// scale
	this.k = 0;  // scale in pixels.  In orthographic projection, scale = radius of the globe.
	this.pxlPerDgr = 0;
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
	var lat = ro[1]
	this.co = [lng,lat]
}

/**
	center([lng,lat])
	Sets the projection’s center to the specified coordinate, 
	a three-element array of longitude in degrees.
*/
voyc.MercatorProjection.prototype.center = function(co) {
	this.rotate([0-co[0], 0-co[1]]);
	// legacy - replace with rotate
}

/**
	projection.scale(scale)
	Sets the projection’s scale factor to the specified value.
	In the Orthographic projection, scale is equal to the radius of the globe, in pixels.
*/
voyc.MercatorProjection.prototype.scale = function(k) {
	this.k = k;   // radius globe in pixels, approximate range 241 - 2892
	this.pxlPerDgr = (k * 4) / 360
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
	// rotate
	lng = co[0]     - this.co[0]
	lat = (0-co[1]) - this.co[1]

	// scale
	x = lng * this.pxlPerDgr
	y = lat * this.pxlPerDgr

	// translate
	x += this.pt[0]
	y += this.pt[1]
	return [x,y];
}

/**
	[lng,lat] = invert([x,y])
	invert a pixel on the screen back into a geo coordinate
	Projects backward from Cartesian coordinates (in pixels) 
	to spherical coordinates (in degrees). 
	Returns an array [longitude, latitude] given the input array [x, y]. 
*/
voyc.MercatorProjection.prototype.invert = function(pt) {
	x = pt[0] - this.pt[0]
	y = pt[1] - this.pt[1]

	lng = x / this.pxlPerDgr
	lat = 0 - (y / this.pxlPerDgr)

	lng += this.co[0]
	lat -= this.co[1]
	return [lng,lat];
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
