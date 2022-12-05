select 'voyc.data.rivers = {"type": "GeometryCollection","geometries":['
union all select '{"id":' || id || ',"name":"' || name || '","scalerank":' || scalerank || 
',"geometry":' || st_asgeojson(geom) || ','
from plunder.plunder 
where (featureclass='river')
union all select '}';
