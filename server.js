
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


var urls = ['http://www.nws.noaa.gov/view/validProds.php?prod=CGR&node=KSEW',
	    'http://www.ndbc.noaa.gov/mobile/station.php?station=wpow1']
	    

function getAllObs(req, res, next){
  res.setHeader('Access-Control-Allow-Origin','*');
//  res.send(200, {robert: 'hall'});

  request('http://www.ndbc.noaa.gov/mobile/station.php?station=wpow1', function(error, response, body) {
    if (!error && response.statusCode == 200) {
//      console.log(body);

      html = cheerio.parseHTML(body[0]);
      console.log(html);
    

//      console.log(qs.parse(body));
//      message = parser.parseResponse(body);
//      console.log(message);
//      res.send(200,message);
/*      xml.parseString(body,function(err, result) {
	console.log(err);
	console.log(result);
	res.send(200,result);
      });
*/
      res.send(200,{});
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
