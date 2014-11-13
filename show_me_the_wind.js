
$(document).ready(function() {

  var url_base = "http://127.0.0.1:8080";
  var TWO_HOURS = 1000*60*60*2;
  $.ajax({
    url: url_base + "/obs",
    success: function(result, status, xhr){
      console.log(result);

      if (result) {
	result.forEach(function(station,i){
	  var new_box = $($(".wind-box")[0]).clone();
	  new_box.find(".station-name").text(station.station_name);
	  new_box.find(".wind-speed").text(station.wind_speed);
	  new_box.find(".wind-direction").text(station.wind_direction);

	  new_box.find(".time-stamp").text(station.time);
	  if ((new Date()) - Date.parse(station.time) > TWO_HOURS){
	    new_box.find(".time-stamp").addClass("time-stamp-late");
	  }

	  $(new_box).css("display","block");
	  $(".outer-container").append(new_box);
	  $(".outer-container").append("<br>");
	});
      }
    },
    error: function(xhr, status, error){
      console.log(error);
    }
  });

});
