/* treasure is not in voyc/plunder but in jhagstrand_voyc/fpd */
/* psql -t -d jhagstrand_voyc -U jhagstrand_voyc <treasure.sql >../../html/data/treasure.js */
select 'voyc.data.treasure = {"type": "GeometryCollection","geometries":['
union all (select '{tp:"pt",co:[' || round(st_x(the_geom)::numeric,3) || ',' || round(st_y(the_geom)::numeric,3) || '],b:' || timebegin || ',e:' || timeend || ',score:1000,cap:0,id:' || id || ',name:"' || headline || '"},'
from fpd.fpd
where editstatus < 10
and maptype = 2
and datatype in (2,5,6,7,8,10)
and timebegin < 1900
order by timebegin, timeend)
union all select ']};window["voyc"]["onScriptLoaded"]("treasure.js");';
