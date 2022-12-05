# run this on the voyc database
select 
"insert into plunder.empire (gid,name,scalerank,featurecla,timebegin,timeend,forebear,color,geom)" ||
" values(" ||
id || "," ||
replace(headline, E'\n', ' ') || "," ||
magnitude || "," ||
"'empire'," ||
timebegin || "," ||
timeend || "," ||
forebear || "," ||
color || "," ||
st_asgeojson(st_forcerhr(the_geom),6) || ") "
from fpd.fpd
where editstatus < 10
and maptype in (3,4)
and datatype in (2,5,6,7,8,10)
order by forebear, timebegin, timeend)
