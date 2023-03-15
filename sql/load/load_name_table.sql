--This SQL is designed for postgres.

-- drop table plunder.names cascade;
create table plunder.names (
	id serial primary key,
	name varchar(250),
	loc varchar(20),
	pid integer,
	fc varchar(20)
);

insert into plunder.names (name, loc, pid, fc)
select name, 'plunder', id, featureclass from plunder.plunder;

insert into plunder.names (name, loc, pid, fc)
select name, 'cities', gid, 'city' from plunder.cities;

insert into plunder.names (name, loc, pid, fc)
select name, 'countries', gid, 'country' from plunder.ne110_admin0_countries;


wget https://simplemaps.com/static/data/world-cities/basic/simplemaps_worldcities_basicv1.75.zip
