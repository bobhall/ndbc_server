
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

function parseNDBCSite(data, name){
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
	   time: time
	  }];
};

function parseCGR(data){

  console.log(data);

  var station_names = [{regex: /POINT NO POINT/g, name:'Point No Point'},
		       {regex: /POINT ROBINSON/g, name:'Point Robinson'},
		       {regex: /POINT WILSON/g, name:'Point Wilson'},
		       {regex: /ALKI POINT/g, name:'Alki Point'}];

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
	  time: us(time_in, "America/Los_Angeles","%c")
	});
      }//endif
    });
  });
  return obs;
};




function parseFerry(data){

  var areas = {
    winslow: {top: 47.62, bottom: 47.6, left: -122.475, right: -122.4275},
    edmonds: {top: 47.82, bottom: 47.785, left: -122.467, right: -122.42},
    rosario: {top: 48.5371, bottom: 48.51, left: -122.76, right: -122.729}
  };

  var $ = cheerio.load(data);
  var nn = 0;

  var found_locations = false;
  var locations = [];
  var station_name = '';
  var speeds = [];

  $('table tr').each(function(ix, tr) {

    if (nn > 2 && nn < 999) {
      var line = $(tr).text().split('\t');
      var time = line[0].trim();
      var location = line[1].trim();
      var lat = parseFloat(location.split('  ')[0]);
      var lon = location.split('  ')[1];

      var speed = parseInt(line[5].trim());
      var dir = parseInt(line[4].trim());

      if (lat > areas.winslow.bottom &&
	  lat < areas.winslow.top &&
	  lon > areas.winslow.left &&
	  lon < areas.winslow.right) {
	found_locations = true;
	station_name = "Seattle / Bainbridge Island";
	speeds.push({speed: speed, dir: dir});
      }
      else {
	if (found_locations == true) {
	  'Done finding locations....'
	}
      }
    }
    nn = nn+1;
  });

  if (!found_locations) {
    return null;
  }
  else {

    var avg = wu.get_average_wind_speed(speeds);

    return {
      wind_speed: avg.speed.toFixed(1),
      wind_direction: avg.direction.toFixed(1),
      station_name: station_name,
      time: ferryTimeToTZ('11:14 AM')
    };
  }
};


/*
Input: an array of wind speeds in degrees (Example: [24,56,33])
Returns the average wind direction. This is more complicated than you might think.

Algorithm:
1) Convert each wind speed from degrees to radians. (radians = degrees*pi/180)
2) Take the sin of each of the radians.
3) Take the average of that.
4) Take the inverse sin of that.
5) Convert to degrees.

*/
function averageWindSpeeds(wind_speeds)
{
  var sins = wind_speeds.map(function(x){return x * Math.PI/180;})
    .map(function(x){return Math.sin(x);})
    .reduce(function(a,b){return a+b;});

  var avg_sins = sins / wind_speeds.length;

  var avg_radians = Math.asin(avg_sins);

  return avg_radians * 180 / Math.PI;
};
/*
  Input: 11:15 AM, or 4:18 PM, etc
  Output: string of the date. Example: '2014-01-15 11:15:00 AM PDT'
*/
function ferryTimeToTZ(ferry_time){
  var time = ferry_time.split(' ')[0];
  var ampm = ferry_time.split(' ')[1];

//  var day =      raw_time_string.substring(0,2);
  var hour =     time.split(':')[0];
  if (ampm == 'PM') {hour = parseInt(hour)+12; hour = String(hour);}
  var minutes =  time.split(':')[1];

  var now = tz(new Date());
  var time_in = us(now, 'America/Los_Angeles', '%Y-%m-%d') + " " + hour + ":" + minutes + ":00";

//  console.log(tz(now,"%Y") + "-" + tz(now,"%m") + "-" + tz(now,"%d") + " " + hour + ":" + minutes + ":00");
  
  return us(time_in, 'America/Los_Angeles', '%c');
};

var urls = [
  {url:'http://www.ndbc.noaa.gov/mobile/station.php?station=wpow1', 
   parser: parseNDBCSite, 
   position: {
     lat: 47.662,
     lon: -122.436 
   },
   name: 'West Point'},
  {url: 'http://www.ndbc.noaa.gov/mobile/station.php?station=sisw1',
   parser: parseNDBCSite,
   name: 'Smith Island'
  },
  {url: 'http://forecast.weather.gov/product.php?site=GRB&product=CGR&issuedby=SEW',
   parser: parseCGR, // CGR = Coast Guard Report. This page contains multiple obs stations.
   name: 'CGR'},


  {url: 'http://i90.atmos.washington.edu/ferry/tabular/FP.htm',
   parser: parseFerry,
   name: 'Puyallup'
  },

/*  {url: 'http://i90.atmos.washington.edu/ferry/tabular/FE.htm',
   parser: parseFerry,
   name: 'Elwha'
  } */
];

function getAllObs(req, res, next){

  res.setHeader('Access-Control-Allow-Origin','*');

  var obs = [];
  var callback = _.after(urls.length, function(){
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


if(require.main === module) {
  server.listen(port, ip_addr, function(){
    console.log("Started server....")
  });
}


module.exports.parseNDBCSite = parseNDBCSite;
module.exports.parseCGR = parseCGR;
