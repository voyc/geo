select 'voyc.data.lakes={"name":"lakes","type":"GeometryCollection","geometries":[';
select '{"id":' || id || ',"name":"' || nm || '",' || '"scalerank":' || sr || ',' || co || '},'
from (
select id, 
case when name is null then 'unnamed' || ' ' || featureclass || ' ' || id else name end as nm,
case
when scalerank=0 then 1 
when scalerank=1 then 2 
else 3
end as sr,
trim(both '{}' from st_asgeojson(geom)) as co 
from plunder.plunder 
where featureclass in ('lake','reservoir','delta')
order by 3 desc
) x;
select ']}';
