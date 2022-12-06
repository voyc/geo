select 'voyc.data.rivers={"name":"rivers","type":"GeometryCollection","geometries":['
union all select '{"id":' || id || ',"name":"' || name || '","scalerank":' || scalerank || 
',' || trim(both '{}' from st_asgeojson(geom)) || '},'
from plunder.plunder 
where featureclass='river'
union all select ']}';
