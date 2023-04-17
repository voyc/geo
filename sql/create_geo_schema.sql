/* 
This SQL is designed for postgres.
Find the GRANT statements in the config file.
*/

--drop schema geo cascade;
create schema geo;

--drop table geo.alpha cascade;
create table geo.alpha (
	id serial primary key,
	name varchar not null,
	geoid integer not null default 0 --foreign key to geo table
);
create unique index ndx_alpha_name on geo.alpha (name);

--drop table geo.geo cascade;
create table geo.geo ( --previous iterations: voyc.fpd, plunder.plunder
	id serial primary key,
	name varchar not null,
	aka  varchar default '',  --comma-separated alt names

	datatype integer default 0,
	class    varchar default 0,
	rank     integer default 0,
	forebear integer default 0, --hierarchy, foreign key to this table
	parent   integer default 0, --hierarchy, foreign key to this table
	color    integer default 0,
	palette  varchar default 0,
	
	timebegin double precision default 0,
	timeend   double precision default 0,
	--timelvlhi     | integer  --scale
	--timelvllo     | integer  --scale
	--timetype      | integer  --point, bar
	--timeprecision | integer  --0 to 100, pct blur
	
	--geom geometry,  -- use AddGeometry() function after the create
	mapprecision integer default 0,  --0 to 100, pct blur
	--maptype      | integer  --point, line, poly, included in geom
	--maplvlhi      | integer   --scale range
	--maplvllo      | integer   --scale range
	
	--headline      | character varying  --name
	--abstract      | character varying  --description
	--author        | character varying
	--imageurl      | character varying
	storyurl varchar default '',
	wikikey varchar default '',
	region varchar default '',
	descr varchar default '',
	--thumburl      | character varying

	bibid integer default 0,  --bibliography, source, foreign key to bib table
	gid   integer default 0,  --key within the source 
	--service       | character varying  --reuters, etc
	--permalink     | character varying  --blog idea
	
	--placename     | character varying
	--tags          | character varying
	--magnitude     | integer
	--feeling       | integer
	
	--version       | integer
	--editstatus    | integer
	--tm            | timestamp with time zone
	--userid        | integer
	
	--fulltext      | character varying
	--tsfulltext    | tsvector

	pop integer default 0,   -- population
	elev integer default 0,  -- meters above sea level

	insertid integer default 0,   --foreign key to user table
	inserttm timestamp default (now() at time zone 'utc'), 
	updateid integer default 0,   --foreign key to user table
	updatetm timestamp default (now() at time zone 'utc')
);
select AddGeometryColumn('geo','geo','geom','0','GEOMETRY',2);

--drop table geo.bib cascade;
create table geo.bib ( --bibliography source
	id serial primary key,
	name varchar not null,
	url varchar default '',
	descr varchar default '',
	inserttm timestamp default (now() at time zone 'utc')
);

--drop table geo.usergeo cascade;
create table geo.usergeo ( --geo plus userid, for custom user data
	id serial primary key,
	userid integer default 0,  --foreign key to user table
	name varchar not null,
	aka  varchar default '',  --comma-separated alt names

	layernm  varchar default '', --foreign key to layer table
	scale    integer default 0,
	pop      integer default 0,   -- population
	elev     integer default 0,  -- meters above sea level

	forebear integer default 0, --hierarchy, foreign key to this table
	parent   integer default 0, --hierarchy, foreign key to this table
	palette  varchar default '', --json string of palette object
	
	timebegin double precision default 0,
	timeend   double precision default 0,
	
	--geom geom,  -- use AddGeometry() function after the create
	mapprecision integer default 0,  --0 to 100, pct blur
	
	storyurl varchar default '',
	wikikey varchar default '',
	region varchar default '',
	descr varchar default '',

	insertid integer default 0,   --foreign key to user table
	inserttm timestamp default (now() at time zone 'utc'), 
	updateid integer default 0,   --foreign key to user table
	updatetm timestamp default (now() at time zone 'utc')
);
select AddGeometryColumn('geo','usergeo','geom','0','GEOMETRY',2);



/*
--list schemas, tables
select table_schema, table_name from information_schema.tables where table_schema not in ('public','pg_catalog','information_schema') group by table_schema, table_name order by table_schema,table_name;

--list columns
select column_name, data_type from information_schema.columns where table_name = 'geo';
\d geo.geo
*/

