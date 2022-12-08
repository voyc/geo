select 'voyc.data.lakes={"name":"lakes","type":"GeometryCollection","geometries":['
union all select '{"id":' || id || ',"name":"' || name || '","scalerank":' || scalerank || 
',' || trim(both '{}' from st_asgeojson(geom)) || '},'
from plunder.plunder 
where featureclass='lake' or featureclass = 'reservoir'
union all select ']}';
