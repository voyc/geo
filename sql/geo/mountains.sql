select 'voyc.data.mountains={"name":"mountains","type":"GeometryCollection","geometries":[';
select '{"id":' || id || ',"name":"' || name || '",' || '"scalerank":' || sr || ',' || co || '},'
from 
(
select id, name, case
when scalerank in (1,2) then 1
when scalerank in (3,4) then 2
when scalerank in (5,6) then 3
end as sr,
trim(both '{}' from st_asgeojson(geom)) as co 
from plunder.plunder 
where featureclass = 'range/mtn'
order by 3 desc
) x;
select ']}';
