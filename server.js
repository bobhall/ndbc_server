
var restify = require('restify'),
    request = require('request'),
    xml = require('xml2js'),
 parser = require('http-string-parser'),
     qs = require('querystring'),
  jsdom = require('jsdom'),
cheerio = require('cheerio');
var ip_addr = '127.0.0.1';
var port    = '8080';

var server = restify.createServer({
  name: "ndbc_obs"
});

server.use(restify.queryParser());
server.use(restify.bodyParser());
server.use(restify.CORS());

function parseWestPoint(data){
  html = cheerio.load(data);
  var relevant_string = html('b')[0].next.data;

  var wind_direction = relevant_string.split(',')[0];
  var wind_speed =     relevant_string.split(',')[1];

  wind_direction = wind_direction.match(/([0-9\.]+)/g)[0];
  wind_speed     = wind_speed.match(/[0-9\.]+/g)[0];

  return {wind_speed: wind_speed,
	  wind_direction: wind_direction,
	  station_name: 'West Point'
  };
};

function parseCGR(data){
  return [];
};

var urls = [//'http://www.nws.noaa.gov/view/validProds.php?prod=CGR&node=KSEW',
	    {url:'http://www.ndbc.noaa.gov/mobile/station.php?station=wpow1', 
	     parser: parseWestPoint, 
	     name: 'West Point'},
	    {ur: 'http://forecast.weather.gov/product.php?site=GRB&product=CGR&issuedby=SEW',
	     parser: parseCGR, // CGR = Coast Guard Report. This page contains multiple obs stations.
	     name: 'CGR'}]




function getAllObs(req, res, next){

//  var obs = [];

  res.setHeader('Access-Control-Allow-Origin','*');
  request('http://www.ndbc.noaa.gov/mobile/station.php?station=wpow1', function(error, response, body) {
    if (!error && response.statusCode == 200) {
      res.send(200, parseWestPoint(body));
    }
    return next();
  });


};

var PATH = '/obs';
server.get({path: PATH,
	    version: '0.0.1'},
	   getAllObs);

server.listen(port, ip_addr, function(){
  console.log("Hello.")
});
