select 'voyc.data.cities={"name":"cities","type":"GeometryCollection","geometries":[';
select '{"id":' || id || ',"name":"' || name || '",pop:' || pop ||
',"scalerank":' ||
case
when pop>10000000 then 1
when pop> 6000000 then 2
when pop> 4000000 then 3
when pop> 3000000 then 4
when pop> 2000000 then 5
else 6
end
|| ',' || trim(both '{}' from st_asgeojson(geom)) || '},'
from plunder.cities
where pop > 1000000
order by pop; 
select ']}' ;

--select
--case 
--when pop>10000000 then 1
--when pop> 1000000 then 2
--when pop>  500000 then 3
--when pop>  300000 then 4
--when pop>  200000 then 5
--else 6
--end
--as scalerank, count(*)
--from plunder.cities
--where pop > 100000
--group by scalerank
--order by scalerank;
--
--select
--case 
--when pop>10000000 then 1
--when pop> 5000000 then 2
--when pop> 1000000 then 3
--when pop>  550000 then 4
--when pop>  300000 then 5
--else 6
--end
--as scalerank, count(*)
--from plunder.cities
--where pop > 200000
--group by scalerank
--order by scalerank;
--
--select
--case
--when pop>10000000 then 1
--when pop> 6000000 then 2
--when pop> 4000000 then 3
--when pop> 3000000 then 4
--when pop> 2000000 then 5
--else 6
--end
--as scalerank, count(*)
--from plunder.cities
--where pop > 1000000
--group by scalerank
--order by scalerank;

