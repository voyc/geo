select 'voyc.data.swamps = {"type": "FeatureCollection","features":['
union all select '{"type":"Feature","geometry":' || st_asgeojson(the_geom) || ',"properties":{gid:' || gid || ',"scalerank":' || scalerank || ',"name":"' || name || '"}},'
from plunder.georegions where featurecla = 'wetlands'
union all select ']}';