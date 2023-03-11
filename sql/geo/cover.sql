select 'voyc.data.cover = {"name":"cover","type": "GeometryCollection","geometries":[';
select '{"id":' || id || ',"name":"' || name || '","b":-7777, "e":7777,' || '"c":' || c || ',' || co || '},'
from
(
select id, name, case
when featureclass = 'plateau'  then 1        -- green light   rgb(128,255,128)
when featureclass = 'plain'    then 2        -- green         rgb(  0,255,  0)
when featureclass = 'lowland'  then 3        -- green dark 1  rgb(  0,192,  0)
when featureclass = 'basin'    then 4        -- green dark 2  rgb(  0,128,  0)
when featureclass = 'wetlands' then 5        -- green dark 3  rgb(  0, 64,  0)
when featureclass = 'tundra'   then 6        -- off white     rgb(255,255,255)
when featureclass = 'valley'   then 7        -- pink          rgb(255,128,128)
when featureclass = 'gorge'    then 8        -- orange        rgb(128,128,  0)
when featureclass = 'depression'    then 9   -- red           rgb(255,  0,  0)
when featureclass = 'alkaline lake' then 10  -- brown         rgb( 64, 64,  0)
end as c,
trim(both '{}' from st_asgeojson(geom)) as co 
from plunder.plunder 
where featureclass in ('plateau','plain','lowland','basin','wetlands','tundra','valley','gorge','depression','alkaline lake')
order by featureclass
) x;
select ']}';
