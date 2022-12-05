SET CLIENT_ENCODING TO UTF8;
SET STANDARD_CONFORMING_STRINGS TO ON;

CREATE TABLE plunder.empire (
gid serial,
name varchar, 
scalerank integer,
featurecla varchar,
timebegin double,
timeend double,
forebear integer,
color integer)
ALTER TABLE "plunder"."rivers50" ADD PRIMARY KEY (gid);
SELECT AddGeometryColumn('plunder','empire','geom','0','MULTILINESTRING',2);





insert into plunder.empire
select
id,
replace(headline, E'\n', ' '),
magnitude,
'empire',
timebegin,
timeend,
forebear,
color,
st_asgeojson(st_forcerhr(the_geom),6) 
where editstatus < 10
and maptype in (3,4)
and datatype in (2,5,6,7,8,10)
order by forebear, timebegin, timeend)



load1 - generate insert statements on voyc
load2 - execute the insert statements on plunder


INSERT INTO "plunder"."rivers50" ("scalerank","featurecla","name","note","min_zoom","name_alt","min_label","name_en","label","wikidataid","name_ar","name_bn","name_de","name_es","name_fr","name_el","name_hi","name_hu","name_id","name_it","name_ja","name_ko","name_nl","name_pl","name_pt","name_ru","name_sv","name_tr","name_vi","name_zh","ne_id","name_fa","name_he","name_uk","name_ur","name_zht",geom) VALUES ('6','River','Kama',NULL,'4.7',NULL,'6.0','Kama','Kama','Q79082','ÙÙØ± ÙØ§Ù
Ø§','à¦à¦¾à¦®à¦¾','Kama','Kama','Kama','Î Î¿Ï
                                             Î±Î¼ÏÏ Î¬Î¼Î±','¡é¦¬æ²³','1159125917','Ø±ÙØ¯ Ú©Ø§Ùa','Kama',Ø§','×¡é¦¬æ²³','0105000000010000000102000
