#psql -t -d voyccom_plunder -U voyccom_jhagstrand <geo/mountains.sql >../html/data/mountains.js
#psql -t -d voyccom_plunder -U voyccom_jhagstrand <geo/lakes.sql     >../html/data/lakes.js
#psql -t -d voyccom_plunder -U voyccom_jhagstrand <geo/rivers.sql    >../html/data/rivers.js
#psql -t -d voyccom_plunder -U voyccom_jhagstrand <poli/cities.sql    >../html/data/cities.js
#psql -t -d voyccom_plunder -U voyccom_jhagstrand <poli/countries.sql    >../html/data/countries.js
psql -t -d voyccom_plunder -U voyccom_jhagstrand <geo/cover.sql    >../html/data/cover.js
