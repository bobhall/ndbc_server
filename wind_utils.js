
var wind_directions = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];

exports.degrees_to_cardinal = function(degrees) {
  degrees = parseInt(degrees);
  return wind_directions[Math.floor(((degrees+11.25) % 360) / 22.5 )];
};
