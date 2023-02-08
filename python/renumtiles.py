'''
  1. use soft link to point to actual media files
	ln -s ~/media/data/natural_earth_data/raster ../html/assets/texture

  2. run imageMagick program to cut the big png into tiles  
	convert -crop 300x300 ../html/assets/texture/50mtex.png ../html/assets/tiles/tile%03d.png

  3. run this python program to rename the tiles  

Cut the map into 10x10 degree square tiles, starting at top-left, north-west.
Natural Earth data is all north positive.
'''
import os

path = '../html/assets/tiles'
w = -180
e = +180
s = -90
n = +90

lng = w
lat = n
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

	lng += inc
	if lng >= e:
		lng = w
		lat -= inc
 

# for (var lat=n; lat>s; lat-=inc) // north to south	
# 	for (var lng=w; lng<e; lng+=inc) // west to east

# for i in range(648):
# 
# 	slat = 'm' if lat < 0 else 'p'
# 	slng = 'm' if lng < 0 else 'p'
# 
# 	alat = abs(lat)
# 	alng = abs(lng)
# 
# 	oldname = f'{path}/tile{i:03d}.png'
# 
# 	newname = f'{path}/{slng}{alng:03d}{slat}{alat:02d}.png'
# 
# 	print(f'{oldname}   {newname}')
# 
# 	os.rename(oldname, newname)
# 
# 	lng += 10
# 	if lng >= maxlng:
# 		lng = minlng
# 		lat += inc
