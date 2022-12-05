select 'voyc.data.highmountains = {"type": "FeatureCollection","features":['
union all select '{"type":"Feature","geometry":' || st_asgeojson(the_geom) || ',"properties":{gid:' || gid || ',"scalerank":' || scalerank || ',"name":"' || name || '"}},'
from plunder.georegions where featurecla = 'range/mtn' and scalerank < 3
union all select ']}';