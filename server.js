
var restify = require('restify'),
    request = require('request'),
    xml = require('xml2js'),
 parser = require('http-string-parser'),
     qs = require('querystring'),
  jsdom = require('jsdom'),
cheerio = require('cheerio');
      _ = require('underscore');

var ip_addr = '127.0.0.1';
var port    = '8080';

var server = restify.createServer({
  name: "ndbc_obs"
});

server.use(restify.queryParser());
server.use(restify.bodyParser());
server.use(restify.CORS());

function parseWestPoint(data){
  console.log('parsing wp...');

  var html = cheerio.load(data);
  var raw_string = html('b')[0].next.data;

  var wind_direction = raw_string.split(',')[0];
  var wind_speed =     raw_string.split(',')[1];

  wind_direction = wind_direction.match(/([0-9\.]+)/g)[0];
  wind_speed     = wind_speed.match(/[0-9\.]+/g)[0];

  return [{wind_speed: wind_speed,
	  wind_direction: wind_direction,
	  station_name: 'West Point',
	  time: '?'
  }];
};

function parseCGR(data){

  console.log('parsing cgr...');
/*
  var html = cheerio.load(data);
  var raw_string = html('.glossaryProduct')[0].children[0].data;

  raw_strings = raw_string.split('\n');

  var report_time = raw_strings[2].split(' ')[2]; // Ex: 'SXUS40 KSEW 102353' where 102353 is DDHHSS in UTC.
  var point_wilson = raw_strings[8].split('/')
*/
  var point_wilson_wind_speed = 'abc',
  point_wilson_wind_direction = 'def';

  return [{wind_speed: point_wilson_wind_speed,
	   wind_direction: point_wilson_wind_direction,
	   station_name: 'Point Wilson',
	   time: '?'
  }];
};

var urls = [//'http://www.nws.noaa.gov/view/validProds.php?prod=CGR&node=KSEW',
	    {url:'http://www.ndbc.noaa.gov/mobile/station.php?station=wpow1', 
	     parser: parseWestPoint, 
	     name: 'West Point'},
	    {url: 'http://forecast.weather.gov/product.php?site=GRB&product=CGR&issuedby=SEW',
	     parser: parseCGR, // CGR = Coast Guard Report. This page contains multiple obs stations.
	     name: 'CGR'}]




function getAllObs(req, res, next){

  res.setHeader('Access-Control-Allow-Origin','*');

  var obs = [];
  var callback = _.after(urls.length, function(){
    console.log("callback")
    res.send(200, obs);
  });

  urls.forEach(function(station,ix){
    console.log('requesting ' + station.name);
    request(station.url, function(error,response,body){
      obs = obs.concat(station.parser(body));
      callback();
    });
  });
  return next();
};

var PATH = '/obs';
server.get({path: PATH,
	    version: '0.0.1'},
	   getAllObs);

server.listen(port, ip_addr, function(){
  console.log("Hello.")
});
