import csv

csvfile = open('deserts.csv', newline='')
reader = csv.DictReader(csvfile)

#select name,id from geo.geo where name in ('Kalahari', 'Great Basin Desert', 'Atacama Desert', 'Sahara Desert', 'Great Australian Desert', 'Arabian Desert', 'Ordos Desert');
parents = {
	'Atacama Desert'         : 835,
	'Kalahari Desert'        : 926,
	'Sahara Desert'          : 994,
	'Arabian Desert'         :1049,
	'Great Basin Desert'     :1050,
	'Great Australian Desert':1051,
	'Ordos Desert'           :1052,
}

for row in reader:
	gid	= row['gid']
	trx	= row['trx']
	name    = row['name'].replace("'", "''")
	rank    = row['rank']
	partof  = row['partof'].replace("'", "''")
	aka     = row['aka'].replace("'", "''")
	wikikey	= row['wikikey']
	
	parent = 0
	if partof != '':
		parent = parents[partof]

	if parent == 1052:
		s = f"update geo.geo set parent={parent} where id=1053;"
		print(s)
	elif parent>0 and trx != 'delete':
		s = f"update geo.geo set parent={parent} where gid={gid};"
		print(s)

