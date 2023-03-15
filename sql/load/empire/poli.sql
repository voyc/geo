/* poli */
select id,headline,timebegin, timeend, datatype,maptype,timetype, parent, forebear, color
from fpd.fpd
where editstatus < 10
and maptype in (3,4)
and datatype in (2,5,6,7,8,10)
order by timebegin, timeend;

/* dots */
and maptype = 2

/* shapes */
and maptype in (3,4)

select forebear, parent, color, timebegin, timeend, id, headline, datatype,maptype,timetype
from fpd.fpd
where editstatus < 10
and maptype in (3,4)
and datatype in (2,5,6,7,8,10)
order by forebear, timebegin, timeend;

select headline, replace(headline, '\n', ' ') 
from fpd.fpd where id = 14813


select id,datatype,forebear,parent,headline,maptype,timetype,magnitude from fpd limit 100;

select datatype,maptype,timetype,editstatus, count(*)
from fpd
group by datatype,maptype,timetype,editstatus
order by datatype,maptype,timetype,editstatus;

select forebear,parent,count(*)
from fpd
group by forebear, parent
order by forebear, parent;

select magnitude, count(*) from fpd
group by magnitude
order by magnitude;


datatype	maptype	timetype	editstatus	count
political	dot		bar			0			4
political	dot		bar			3			9
political	dot		bar			5			9
political	poly	bar			0			231
political	poly	bar			3			82
political	poly	bar			4			96
political	mpoly	bar			0			8
political	mpoly	bar			4			9
national	poly	bar			0			191
national	poly	bar			4			3
national	mpoly	bar			0			2
national	mpoly	bar			4			7
person		0		dot			10			1
person		dot		dot			0			70
person		dot		bar			0			21
person		dot		bar			5			3
work		dot		dot			0			7
work		dot		bar			5			1
headofstate	dot		bar			0			22
headofstate	dot		bar			5			14
bigevent	dot		dot			0			8
bigevent	dot		dot			5			8
bigevent	dot		bar			0			7
bigevent	dot		bar			5			2
bigevent	poly	bar			0			1
ww			dot		bar			0			2
