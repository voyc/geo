select 'voyc.data.countries={"name":"countries","type":"GeometryCollection","geometries":[';
select '{"id":' || gid || ',"name":"' || name || 
'",' || trim(both '{}' from st_asgeojson(geom)) || '},'
from plunder.ne110_admin0_countries;
select ']}' ;
