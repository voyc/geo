/* empire is not in voyc/plunder but in jhagstrand_voyc/fpd */
/* psql -t -d jhagstrand_voyc -U jhagstrand_voyc <empire.sql >../../html/data/empire.js */
select 'voyc.data.empire = {"type": "FeatureCollection","features":['
union all (select '{"type":"Feature","geometry":' || st_asgeojson(st_forcerhr(the_geom),6) || ',"properties":{id:' || id || ',"name":"' || replace(headline, E'\n', ' ') || '","b":' || timebegin || ',"e":' || timeend || ',"fb":' || forebear || ',"c":' || color || '}},'
from fpd.fpd
where editstatus < 10
and maptype in (3,4)
and datatype in (2,5,6,7,8,10)
order by forebear, timebegin, timeend)
union all select ']}';
