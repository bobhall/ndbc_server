
var restify = require('restify'),
    request = require('request'),
cheerio = require('cheerio');
      _ = require('underscore'),
     tz = require('timezone'),
     wu = require('./wind_utils');

var us = tz(require("timezone/America"));

var ip_addr = '127.0.0.1';
var port    = '8080';

var server = restify.createServer({
  name: "ndbc_obs"
});

server.use(restify.queryParser());
server.use(restify.bodyParser());
server.use(restify.CORS());

function parseNDBCSite(data, name, position){
  var html = cheerio.load(data);
  var raw_string = html('b')[0].next.data;

  var time_string = html('p')[1].children[0].data
  var time = us(Date.parse(time_string), "America/Los_Angeles", "%c");

  var wind_direction = raw_string.split(',')[0],
      wind_speed     = raw_string.split(',')[1];

  console.log("dir: " + wind_direction);
  console.log("spd: " + wind_speed);

  wind_speed = wind_speed ? wind_speed.match(/([0-9\.]+)/g)[0] : wind_speed;
  wind_direction = wind_direction ? wind_direction.match(/[0-9\.]+/g)[0] : wind_direction;

  return [{wind_speed: wind_speed,
	   wind_direction: wu.degrees_to_cardinal(wind_direction),
	   station_name: name,
	   position: position,
	   time: time
	  }];
};

function parseCGR(data){

  console.log(data);

  var station_names = [{regex: /POINT NO POINT/g, name:'Point No Point', position: {lat: 47.9119, lon: -122.5258}},
		       {regex: /POINT ROBINSON/g, name:'Point Robinson', position: {lat: 47.3881, lon: -122.3742}},
		       {regex: /POINT WILSON/g, name:'Point Wilson', position: {lat: 48.143, lon: -122.754}},
		       {regex: /ALKI POINT/g, name:'Alki Point', position: {lat: 47.5763, lon: -122.4208}}];

  var html = cheerio.load(data);
  var raw_strings = html('.glossaryProduct')[0].children[0].data.split('\n');

  console.log(html('.glossaryProduct')[0].children[0].data);

  /*
    raw_strings comes from calling split('\n') on a string of this format:
000
SXUS40 KSEW 100402
CGRSEW

ID  WXVSB       /WIND /WAVE/AIR/PRESS     REMARKS  STATION NAME
///             /     /    /   /          NO RPT   WESTPORT
NOW             /     /    /   /          NO RPT   PORT ANGELES
53S             /N15  /    /   /                   POINT WILSON
///             /     /    /   /          NO RPT   BLAINE HARBOR
97S             /W04  /    /   /                   POINT NO POINT
///             /     /    /   /          NO RPT   HOOD CANAL BRIDGE
///             /NW04 /    /   /                   EVGRN PT BRDG
SEW MCY10       /W03  /    / 47/                   NOAA-LKWASHINGTON
91S             /CALM /    /   /                   ALKI POINT
99S             /W00  /    /   /                   POINT ROBINSON
///             /     /    /   /          NO RPT   MCNEIL ISLAND

$$
    */


  // Grab the time. In the example above, "100402" is DDMMSS, in UTC. We need to fill in year and month ourselves.
  var raw_time_string = raw_strings[2].split(' ')[2];
  var day =      raw_time_string.substring(0,2);
  var hour =     raw_time_string.substring(2,4);
  var minutes =  raw_time_string.substring(4,6);

  var now = tz(new Date());
  var time_in = tz(tz(now,"%Y") + "-" + tz(now,"%m") + "-" + day + " " + hour + ":" + minutes + ":00");

  // Try to find a match for the obs station we're interested in, parse the data and tuck it away into obs[].
  var obs = [];
  raw_strings.forEach(function(raw_string){
    station_names.forEach(function(station,i){

      if (raw_string.split('/').length == 5 && 
	  raw_string.split('/')[4].match(station.regex)) {

	var wind_speed, wind_dir;
	// Wind speed and direction fields can look like: W00, or NE10, or CALM
	if (raw_string.split('/')[1].trim() == "CALM") {
	  wind_speed = "0";
	  wind_dir = null;
	} else {
	  if (raw_string.split('/')[1].match(/([0-9\.]+)/g) &&
	      raw_string.split('/')[1].match(/([A-Z\.]+)/g)) {

	    wind_speed = raw_string.split('/')[1].match(/([0-9\.]+)/g)[0];
	    wind_dir =   raw_string.split('/')[1].match(/([A-Z\.]+)/g)[0];
	  }
	  else {
	    wind_speed = null;
	    wind_dir   = null;
	  }
	}

	obs.push({
	  wind_speed: wind_speed ? parseInt(wind_speed).toString() : wind_speed,
	  wind_direction: wind_dir,
	  station_name: station.name,
	  position: station.position,
	  time: us(time_in, "America/Los_Angeles","%c")
	});
      }//endif
    });
  });
  return obs;
};




function parseFerry(data){

  var areas = [
    {top: 47.62, bottom: 47.6, left: -122.475, right: -122.4275, name: "Seattle / Bainbridge Island Ferry"},
    {top: 47.82, bottom: 47.785, left: -122.467, right: -122.42, name: "Edmonds / Kingston Ferry"},
    {top: 48.5371, bottom: 48.51, left: -122.76, right: -122.729, name: "Anacortes Ferry (Rosario Strait)"}
  ];

  var $ = cheerio.load(data);

  var found_locations = false;
  var station_name = '';
  var position = {}; // return value for position. 'location' is used to store the string from the website.
  var speeds = []; // keeps track of found speeds
  var time = null;

  $('table tr').each(function(ix, tr) {

    var line = $(tr).text().split('\t');
    
    var location = line[1].trim();
    var lat = parseFloat(location.split('  ')[0]); // float
    var lon = location.split('  ')[1];             // float
    var speed = parseInt(line[5].trim());
    var dir = parseInt(line[4].trim());

    areas.forEach(function(area) {
      if (lat > area.bottom && 
	  lat < area.top &&
	  lon > area.left &&
	  lon < area.right) {
	found_locations = true;
	station_name = area.name;
	position = {lat: lat, lon: lon};
	speeds.push({speed: speed, dir: dir});
	time = time || line[0].trim();
	console.log("Got one: " + time);
      }
      else {
	if (found_locations == true) {
	  return false;
	}
      }
    }); //end areas.forEach
  });

  if (!found_locations) {
    return null;
  }
  else {
    var avg = wu.get_average_wind_speed(speeds);
    return {
      wind_speed: avg.speed.toFixed(1),
      wind_direction: wu.degrees_to_cardinal(avg.direction),
      station_name: station_name,
      time: wu.ferry_time_to_tz(time),
      position: position
    };
  }
};


var urls = [
  {url:'http://www.ndbc.noaa.gov/mobile/station.php?station=wpow1', 
   parser: parseNDBCSite, 
   name: 'West Point',
   position: {
     lat: 47.662,
     lon: -122.436 
   },
  },
  {url: 'http://www.ndbc.noaa.gov/mobile/station.php?station=sisw1',
   parser: parseNDBCSite,
   name: 'Smith Island',
   position: {
     lat: 48.318,
     lon: -122.843
   }
  },
  {url: 'http://forecast.weather.gov/product.php?site=GRB&product=CGR&issuedby=SEW',
   parser: parseCGR, // CGR = Coast Guard Report. This page contains multiple obs stations.
   name: 'CGR'},
  {url: 'http://i90.atmos.washington.edu/ferry/tabular/FP.htm',
   parser: parseFerry,
   name: 'Puyallup'
  },
  {url: 'http://i90.atmos.washington.edu/ferry/tabular/FS.htm',
   parser: parseFerry,
   name: 'Sealth'
  },
  {url: 'http://i90.atmos.washington.edu/ferry/tabular/FE.htm',
   parser: parseFerry,
   name: 'Elwha'
  } 
];

function getAllObs(req, res, next){

  res.setHeader('Access-Control-Allow-Origin','*');

  var obs = [];
  var callback = _.after(urls.length, function(){
    obs = obs.filter(function(ob){return ob != null;});
    obs.sort(function(a,b){console.log(a); console.log(b); return a.position.lat < b.position.lat;});
    res.send(200, obs);
  });

  urls.forEach(function(station,ix){
    console.log('requesting ' + station.name);
    request(station.url, function(error,response,body){
      obs = obs.concat(station.parser(body, station.name, station.position));
      callback();
    });
  });
  return next();
};


var PATH = '/obs';
server.get({path: PATH,
	    version: '0.0.1'},
	   getAllObs);

if(require.main === module) {
  server.listen(port, ip_addr, function(){
    console.log("Started server....")
  });
}


module.exports.parseNDBCSite = parseNDBCSite;
module.exports.parseCGR = parseCGR;
