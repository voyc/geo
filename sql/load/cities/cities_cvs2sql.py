# wget https://simplemaps.com/static/data/world-cities/basic/simplemaps_worldcities_basicv1.75.zip
# 
# create table plunder.cities (
# id serial,
# gid integer,
# name varchar(50),
# country varchar(50),
# pop integer,
# geom geometry
# );
# 
# insert into plunder.cities (gid, name, country, pop, geom) values (1156273453, 'Xinyang', 'China', 6109106, ST_GeomFromText('POINT(114.0672 32.1264)', 4326));

def dq(s):
	return s.replace("'", "''")

import csv
with open('worldcities.csv', newline='') as csvfile:
	spamreader = csv.reader(csvfile, delimiter=',', quotechar='"')
	n = 0
	for row in spamreader:
		n += 1
		if n == 1:
			continue
		gid = row[10]
		name = row[0]
		lat = row[2]
		lng = row[3]
		country = row[4]
		pop = row[9]

		if not pop:
			continue

		print(f"insert into plunder.cities (gid, name, country, pop, geom) values ({gid}, '{dq(name)}', '{dq(country)}', {pop}, ST_GeomFromText('POINT({lng} {lat})', 4326));")

