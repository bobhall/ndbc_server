var test = require('unit.js');
var wu =   require('../wind_utils')

describe('test degrees to cardinal', function(){

  it('test some different values', function(){
    var north = wu.degrees_to_cardinal(0);
    test.string(north)
      .is('N');
  });
});


describe('test get average wind speed', function(){
  it('test bad input', function(){
    var value = wu.get_average_wind_speed([{spd:1,dr:2}]);
    console.log("Value: " + value.speed + value.direction);
    test.object(value)
      .is({speed: NaN, direction: NaN})
  });
  it('test zero input', function(){
    test.exception(function(){return wu.get_average_wind_speed([])}, TypeError);
  });
});
