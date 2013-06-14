var express = require('express'),
    stylus = require('stylus'),
    nib = require('nib'),
    fixjade = require('fix-jade');

var app = express()

function compile(str, path) {
  return stylus(str)
    .set('filename', path)
    .use(nib());
}

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.logger('dev'));
app.use(stylus.middleware(
  { src: __dirname + '/public'
  , compile: compile
  }
));

app.use(express.static(__dirname + '/public'));
app.listen(9000);

app.get('/', function (req, res) {
  res.render('signup');
});

app.post('/signup', express.bodyParser(), function(request, response){
        console.log(request.body);


    //  sendData(data,sqlConn);
    });



