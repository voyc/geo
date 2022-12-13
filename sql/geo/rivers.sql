select 'voyc.data.rivers={"name":"rivers","type":"GeometryCollection","geometries":['
union all select '{"id":' || id || ',"name":"' || name || '","scalerank":' || scalerank || ',' ||
regexp_replace(''||box2d(geom), 'BOX\((.*?) (.*?),(.*?) (.*?)\)', '"rect":{w:\1,n:\2,e:\3,s:\4}') 
|| ',' || trim(both '{}' from st_asgeojson(geom)) || '},'
from plunder.plunder 
where featureclass='river'
order by scalerank
union all select ']}';
