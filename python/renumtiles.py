'''
  1. use soft links to point to actual media files
	ln -s ../media/data/natural_earth_data/raster/NE2_50M_SR_W.png ../html/assets/texture/50mtex.png
	ln -s ../media/data/natural_earth_data/raster/tiles ../html/assets/tiles

  2. run imageMagick program to cut the big png into tiles  
	convert -crop 300x300 ../html/assets/texture/50mtex.png ../html/assets/tiles/tile%03d.png

  3. run this python program to rename the tiles  
'''
import os

path = '../html/assets/tiles'
minlng = -180
maxlng = +180
minlat = -90  // north is negative
maxlat = +90

lng = minlng
lat = minlat
inc = 10

for i in range(648):

	slat = 'm' if lat < 0 else 'p'
	slng = 'm' if lng < 0 else 'p'

	alat = abs(lat)
	alng = abs(lng)

	oldname = f'{path}/tile{i:03d}.png'

	newname = f'{path}/{slng}{alng:03d}{slat}{alat:02d}.png'

	print(f'{oldname}   {newname}')

	os.rename(oldname, newname)

	lng += 10
	if lng >= maxlng:
		lng = minlng
		lat += 10


