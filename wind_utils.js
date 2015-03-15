var tz = require('timezone');
var us = tz(require('timezone/America'));

var cardinal_directions = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];

/*
Input: a wind direction in degrees, like 180, 265, or 50
Ouput: a cardinal wind direction., like 'S', 'WSW', or 'NW'
*/
exports.degrees_to_cardinal = function(degrees) {
  degrees = parseInt(degrees);
  return cardinal_directions[Math.floor(((degrees+11.25) % 360) / 22.5 )];
};

/* Convert degrees to radians. */
var deg_to_rad = function(deg) {
  return deg * Math.PI / 180;
};

/* Convert radians to degrees */
var rad_to_deg = function(rad) {
  return rad * 180 / Math.PI;
};


/* Get u component of wind speed and direction. */
var calc_u = function(speed, direction) {
  return Math.sin(deg_to_rad(direction + 180)) * speed;
};

/* Get u component of wind speed and direction. */
var calc_v = function(speed, direction) {
  return Math.cos(deg_to_rad(direction + 180)) * speed;
};

/* Converts wind speed and direction into its u and v components. */
exports.wind_speed_and_direction_to_u_v = function(speed, direction) {
  return {u: calc_u(speed, direction),
	  v: calc_v(speed, direction)};
};


/* Converts u and v components into wind speed and direction. */
exports.u_v_to_wind_speed_and_direction = function(u,v) {

  var speed = Math.sqrt(Math.pow(u,2) + Math.pow(v,2));

  var direction = Math.atan2(-u, -v);
  direction = rad_to_deg(direction);
  direction = direction % 360;
  
  return {speed: speed,
	  direction: direction};
};


/*
Input example: [{speed: 4, dir: 90},
                {speed: 6, dir: 105},
                ... ]

Returns a true vector average of the wind speed by breaking them (the averages) down
to their u and v components, averaging those, then converting that averaged value back to 
a wind speed and direction.
*/

var ex = exports;
exports.get_average_wind_speed = function(wind_speeds) {
  var u_v_total = wind_speeds.map(function(wind_speed) { 
    return exports.wind_speed_and_direction_to_u_v(wind_speed.speed, wind_speed.dir);  
  }).reduce(function(a, b) {
    return {u: a.u+b.u,
	    v: a.v+b.v};
  })

  var u_v_avg = {u: u_v_total.u / wind_speeds.length,
		 v: u_v_total.v / wind_speeds.length};

  return exports.u_v_to_wind_speed_and_direction(u_v_avg.u, u_v_avg.v);
};


/* 
  Input: 11:15 AM, or 4:18 PM, etc
  Output: string of the date. Example: '2014-01-15 11:15:00 AM PDT'
*/
exports.ferry_time_to_tz = function(ferry_time) {
  var time = ferry_time.split(' ')[0];
  var ampm = ferry_time.split(' ')[1];

  var hour =     time.split(':')[0];
  if (ampm == 'PM') {hour = parseInt(hour)+12; hour = String(hour);}
  var minutes =  time.split(':')[1];

  var now = tz(new Date());
  var time_in = us(now, 'America/Los_Angeles', '%Y-%m-%d') + " " + hour + ":" + minutes + ":00";

  return us(time_in, 'America/Los_Angeles', '%c');
};
