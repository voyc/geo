select name, natrank, scalerank, pop2020 as pop
from plunder.ne110_populated_places
order by pop desc;




select scalerank, count(*)
from plunder.ne110_populated_places
group by scalerank
order by scalerank;
