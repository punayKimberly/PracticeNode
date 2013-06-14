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


app.get('/accounts', function (req, res) {
  var data = {
        'id' : 1,
        'name': 'Kim',
        'email': 'kim@kim.com',
      };
  res.render('accounts', 
    { data : data });
});


app.use(express.static(__dirname + '/resources/'));
app.listen(9000);

