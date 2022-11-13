/** 
	Geo
	a static class, not instantiated
	containing static variables and methods
*/
voyc.Geo = function() {
}

// static variables
voyc.Geo.ε = 1e-6;    // epsilon
voyc.Geo.ε2 = voyc.Geo.ε * voyc.Geo.ε;   // epsilon2
voyc.Geo.π = Math.PI;    // pi
voyc.Geo.τ = 2 * voyc.Geo.π;           // tau = 2 * pi
voyc.Geo.τε = voyc.Geo.τ - voyc.Geo.ε;      // tau minus epsilon
voyc.Geo.halfπ = voyc.Geo.π / 2;   // half pi
voyc.Geo.to_radians = voyc.Geo.π / 180;
voyc.Geo.to_degrees = 180 / voyc.Geo.π;

voyc.Geo.distance = function(a, b) {
	var Δλ = (b[0] - a[0]) * voyc.Geo.to_radians, φ0 = a[1] * voyc.Geo.to_radians, φ1 = b[1] * voyc.Geo.to_radians, sinΔλ = Math.sin(Δλ), cosΔλ = Math.cos(Δλ), sinφ0 = Math.sin(φ0), cosφ0 = Math.cos(φ0), sinφ1 = Math.sin(φ1), cosφ1 = Math.cos(φ1), t;
	return Math.atan2(Math.sqrt((t = cosφ1 * sinΔλ) * t + (t = cosφ0 * sinφ1 - sinφ0 * cosφ1 * cosΔλ) * t), sinφ0 * sinφ1 + cosφ0 * cosφ1 * cosΔλ);
}

voyc.Geo.interpolate = function(source, target, t) {
	var x0 = source[0] * voyc.Geo.to_radians;
	var y0 = source[1] * voyc.Geo.to_radians;
	var x1 = target[0] * voyc.Geo.to_radians;
	var y1 = target[1] * voyc.Geo.to_radians;

	var cy0 = Math.cos(y0), sy0 = Math.sin(y0), cy1 = Math.cos(y1), sy1 = Math.sin(y1), kx0 = cy0 * Math.cos(x0), ky0 = cy0 * Math.sin(x0), kx1 = cy1 * Math.cos(x1), ky1 = cy1 * Math.sin(x1), d = 2 * Math.asin(Math.sqrt(voyc.Geo.haversin(y1 - y0) + cy0 * cy1 * voyc.Geo.haversin(x1 - x0))), k = 1 / Math.sin(d);
	var B = Math.sin(t *= d) * k, A = Math.sin(d - t) * k, x = A * kx0 + B * kx1, y = A * ky0 + B * ky1, z = A * sy0 + B * sy1;
	return [ Math.atan2(y, x) * voyc.Geo.to_degrees, Math.atan2(z, Math.sqrt(x * x + y * y)) * voyc.Geo.to_degrees ];
}

voyc.Geo.haversin = function(x) {
	return (x = Math.sin(x / 2)) * x;
}

// calculate the angle of two points against the x-axis
voyc.Geo.calcAngle = function(ptStart, ptEnd) {
	var X = 0;
	var Y = 1;
	var d = [];
	d[Y] = ptEnd[Y] - ptStart[Y];
	d[X] = ptEnd[X] - ptStart[X];
	var theta = Math.atan2(d[Y], d[X]); // range (-PI, PI]
	theta *= 180 / Math.PI; // rads to degs, range (-180, 180]
	if (theta < 0) theta = 360 + theta; // range [0, 360)
	return theta;
}

/** 
	draw a bitmap from src to dst
	each of src and dst is an object with these properties:
		projection
		imageData
		ctx
		w
		h
		
*/
voyc.Geo.drawTexture = function(dst,src) {
	// loop thru every pixel in the dst
	var co = [];
	var pt = [];
	var wn = 0;
	var tn = 0;
	//log&&console.log(voyc.timer()+'texture data copy start');
	for (var x=0; x<(dst.w); x++) {
		for (var y=0; y<(dst.h); y++) {
			co = dst.projection.invert([x,y]);
			//co = [-20, -80];

			if (!(isNaN(co[0]) || isNaN(co[1]))) {
				pt = src.projection(co);
				//pt = [300,300]; 
				
				// copy 4 bytes for each pixel
				wn = (y * dst.w + x) * 4;
				tn = (Math.floor(pt[1]) * src.w + Math.floor(pt[0])) * 4;
				dst.imageData.data[wn + 0] = src.imageData.data[tn + 0];
				dst.imageData.data[wn + 1] = src.imageData.data[tn + 1];
				dst.imageData.data[wn + 2] = src.imageData.data[tn + 2];
				if (src.imageData.data[wn + 0] + src.imageData.data[wn + 1] + src.imageData.data[wn + 2]) {
					dst.imageData.data[wn + 3] = 255;
				}
			}
		}
	}
	//log&&console.log(voyc.timer()+'texture data copy complete');
	//log&&console.log(voyc.timer()+'texture data put start');
	dst.ctx.putImageData(dst.imageData, 0, 0);
	//log&&console.log(voyc.timer()+'texture data put complete');
}

/**
	graticule()
	create a geojson multiline object of parallels and meridians
*/
voyc.Geo.graticule = function() {
	var lng = [
		0, // prime meridian
		90,
		180, // antimeridian
		-90,
	];
	var lat = [
		66.55772,  // artic circle
		23.43715,  // tropic of cancer
		0,         // equator
		-23.43715, // tropic of capricorn
		-66.55772, // antartic circle
	];

	// meridians
	var lines = [];
	var n = 0;
	for (var x=0; x<lng.length; x++) {
		lines.push([]);
		for (var y=-90; y<=90; y+=10) {
			lines[n].push([lng[x],y]);
		}
		n++;
	}
	// parallels
	for (var y=0; y<lat.length; y++) {
		lines.push([]);
		for (var x=-180; x<=180; x+=10) {
			lines[n].push([x,lat[y]]);
		}
		n++;
	}
	return lines;
}
