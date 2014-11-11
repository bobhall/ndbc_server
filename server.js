
var restify = require('restify'),
    request = require('request'),
    xml = require('xml2js'),
 parser = require('http-string-parser'),
     qs = require('querystring'),
  jsdom = require('jsdom'),
cheerio = require('cheerio');
      _ = require('underscore'),
     tz = require('timezone');

var ip_addr = '127.0.0.1';
var port    = '8080';

var server = restify.createServer({
  name: "ndbc_obs"
});

server.use(restify.queryParser());
server.use(restify.bodyParser());
server.use(restify.CORS());

function parseNDBCSite(data, name){
  var html = cheerio.load(data);
  var raw_string = html('b')[0].next.data;

  var wind_direction = raw_string.split(',')[0],
      wind_speed     = raw_string.split(',')[1];

  return [{wind_speed: wind_speed.match(/([0-9\.]+)/g)[0],
	   wind_direction: wind_direction.match(/[0-9\.]+/g)[0],
	   station_name: name,
	   time: 'time_in'
	  }];
};

function parseCGR(data){

  var station_names = [{regex: /POINT NO POINT/g, name:'Point No Point'},
		       {regex: /POINT ROBINSON/g, name:'Point Robinson'},
		       {regex: /POINT WILSON/g, name:'Point Wilson'},
		       {regex: /ALKI POINT/g, name:'Alki Point'}];

  var html = cheerio.load(data);
  var raw_strings = html('.glossaryProduct')[0].children[0].data.split('\n');

  var obs = [];
  raw_strings.forEach(function(raw_string){
    station_names.forEach(function(station,i){

      if (raw_string.split('/').length == 5 && 
	  raw_string.split('/')[4].match(station.regex)) {

	obs.push({
	  wind_speed: raw_string.split('/')[1].match(/([0-9\.]+)/g)[0],
	  wind_direction: raw_string.split('/')[1].match(/([A-Z\.]+)/g)[0],
	  station_name: station.name,
	  time: 'time_in'
	});

      }//endif
    });
  });
  return obs;
};

var urls = [{url:'http://www.ndbc.noaa.gov/mobile/station.php?station=wpow1', 
	     parser: parseNDBCSite, 
	     name: 'West Point'},
	    {url: 'http://www.ndbc.noaa.gov/mobile/station.php?station=sisw1',
	     parser: parseNDBCSite,
	     name: 'Smith Island'
	    },
	    {url: 'http://forecast.weather.gov/product.php?site=GRB&product=CGR&issuedby=SEW',
	     parser: parseCGR, // CGR = Coast Guard Report. This page contains multiple obs stations.
	     name: 'CGR'}];

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
      obs = obs.concat(station.parser(body, station.name));
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
