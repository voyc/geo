-- initial load of geo table, Mar 2023

-- osmtilemill georegions data
cd ~/media/data/osmtilemill
wget https://github.com/polpols/OSM-Tilemill/archive/master.zip
unzip -j master */10m_geography_regions_polys.*
shp2pgsql -c -W LATIN1 10m_geography_regions_polys geo.georegions >load.georegions.sql
psql -d voyccom_geo -U voyccom_jhagstrand <load.georegions.sql
-- cleanup all files except master.zip
rm *regions*

--copy osmtilemill records into geo table
insert into geo.bib(id, name, url ) 
values (1, 'osmtilemill','https://github.com/polpols/OSM-Tilemill/archive/master.zip');

insert into geo.geo (bibid,gid,rank,class,name,aka,region,geom)
select 1, gid,scalerank,featurecla,name,namealt,region || ',' || subregion,geom
from geo.georegions;

-- now run a bunch of "fix" sql files to clean the names and such
-- see google drive ground_cover spreadsheet
-- download each tab to csv, run fix*.py to generate fix*.sql
psql -d voyccom_geo -U voyccom_jhagstrand <fixdeserts.sql
psql -d voyccom_geo -U voyccom_jhagstrand <fixdeserts2.sql







-- rivers from natural earth data



-- gen alpha table






/*
--list schemas, tables
select table_schema, table_name from information_schema.tables where table_schema not in ('public','pg_catalog','information_schema') group by table_schema, table_name order by table_schema,table_name;

--list columns
select column_name, data_type from information_schema.columns where table_name = 'geo';
\d geo.geo
*/

select region, subregion
from geo.georegions
group by region, subregion
order by region,subregion;

         region          |        subregion        
-------------------------+-------------------------
 Africa                  | Comores
 Africa                  | Indian Ocean
 Africa                  | North Atlantic Ocean
 Africa                  | 
 Antarctica              | 
 Asia                    | Arabian Sea
 Asia                    | Malay Archipelago
 Asia                    | Mediterranean Sea
 Asia                    | South China Sea
 Asia                    | 
 Europe                  | Arctic Ocean
 Europe                  | British Isles
 Europe                  | Iceland
 Europe                  | Mediterranean Sea
 Europe                  | North Atlantic Ocean
 Europe                  | 
 North America           | Arctic Archipelago
 North America           | Central America
 North America           | Greenland
 North America           | West Indies
 North America           | 
 Oceania                 | Australasia
 Oceania                 | Melanesia
 Oceania                 | Micronesia
 Oceania                 | New Zealand
 Oceania                 | Polynesia
 Oceania                 | 
 Seven seas (open ocean) | Bay of Bengal
 Seven seas (open ocean) | Indian Ocean
 Seven seas (open ocean) | Is. Revillagigedo
 Seven seas (open ocean) | Mascarene Islands
 Seven seas (open ocean) | North Atlantic Ocean
 Seven seas (open ocean) | Seychelles
 Seven seas (open ocean) | South Atlantic Ocean
 Seven seas (open ocean) | Southern Atlantic Ocean
 Seven seas (open ocean) | Southern Indian Ocean
 Seven seas (open ocean) | 
 South America           | Falkland Islands
 South America           | Galapagos Islands
 South America           | 

