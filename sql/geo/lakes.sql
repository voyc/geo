select 'voyc.data.lakes={"name":"lakes","type":"GeometryCollection","geometries":[';
select '{"id":' || id || ',"name":"' || name || '",' || 
-- '"scalerank":' || case when scalerank=0 then 7 else scalerank || ', ' || 
'"scalerank":' || scalerank || ', ' || 
'"featureclass":"' || featureclass || '",' || 
trim(both '{}' from st_asgeojson(geom)) || '},'
from plunder.plunder 
where featureclass in ('lake','reservoir','basin','delta')
order by scalerank desc;
select ']}';
