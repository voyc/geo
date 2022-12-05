select 'voyc.data.rivers = {"type": "FeatureCollection","features":['
union all select '{"type":"Feature","geometry":' || st_asgeojson(the_geom) 
|| ',"properties":{gid:' || gid || ',"scalerank":' || scalerank || ',"name":"' || name || '"}},'
from plunder.rivers50 where featurecla = 'River'
union all select ']}';