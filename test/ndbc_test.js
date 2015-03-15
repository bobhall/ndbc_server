var test = require('unit.js');
var wu =   require('../wind_utils')

describe('test degrees to cardinal', function(){

  it('test some different values', function(){
    var north = wu.degrees_to_cardinal(0);
    test.string(north)
      .is('N');
  });
});

describe('test ferry to tz', function(){
  it('test early morning', function(){
    var now = new Date(1426427152753);
    var time = wu.ferry_time_to_tz('5:41 AM');
//    console.log("TIME:");
//    console.log(time);
    test.string(time)
      .is('Sun 15 Mar 2015 05:41:00 AM PDT');
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
  it('test typical', function(){
    var avg = wu.get_average_wind_speed([{speed: 12, dir: 90}, {speed: 12, dir: 180}])
    test.object(avg)
      .is({speed: 8.485281374238571, direction: 135});
  });
  it('test real world example', function(){
    var speeds = [{speed: 16, dir: 251},
		  {speed: 16, dir: 250},
		  {speed: 18, dir: 242},
		  {speed: 17, dir: 235},
		  {speed: 20, dir: 237},
		  {speed: 21, dir: 227},
		  {speed: 18, dir: 231},
		  {speed: 17, dir: 209},
		  {speed: 17, dir: 211},
		  {speed: 18, dir: 204},
		  {speed: 17, dir: 208},
		  {speed: 16, dir: 198},
		  {speed: 17, dir: 198},
		  {speed: 17, dir: 190}];
    var avg = wu.get_average_wind_speed(speeds);
    test.object(avg)
      .is({speed: 16.50593303503767, direction: 220.98279522783216});
  });
});
