import csv

csvfile = open('deserts.csv', newline='')
reader = csv.DictReader(csvfile)
for row in reader:
	gid	= row['gid']
	trx	= row['trx']
	name    = row['name'].replace("'", "''")
	rank    = row['rank']
	partof  = row['partof'].replace("'", "''")
	aka     = row['aka'].replace("'", "''")
	wikikey	= row['wikikey']

	if trx == 'update':
		s = f"update geo.geo set name='{name}',rank={rank},aka='{aka}',wikikey='{wikikey}' where gid={gid};"
	elif trx == 'insert':
		s = f"insert into geo.geo (name,rank,aka,wikikey) values ('{name}',{rank},'{aka}','{wikikey}');"
	else:
		s = f"delete from geo.geo where gid = {gid};"

	print(s)
