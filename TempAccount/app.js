var http = require('http'),
    express = require('express'),
    routes = require('routes');
    app = express(),
    sqlReq = require('tedious').Request,
    sqlType = require('tedious').TYPES,
    passport = require('passport'),
   LocalStrategy = require('passport-local').Strategy
   crypto = require('crypto');

var sqlConn = require('tedious').Connection;
var sqlConfig = {
    userName: '',
    password: '',
    server: '',
    options:
    {
        database: 'TempAccount'
    }
};

var SaltLength = 50;

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type,Authorization');
    next();
}

app.configure(function(){
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(allowCrossDomain);
  app.use(app.router);
  app.use(passport.initialize());
app.use(passport.session());
});
  app.use(express.static(__dirname + "/"));
  app.listen(9000);

passport.use(new LocalStrategy(
  function(username, password, done) {
    console.log("username : "+username);
    console.log("password : "+password);
  }
));
  


var sqlConn = new sqlConn(sqlConfig);

sqlConn.on('connect', function(err) {
  if(err)
  {
      console.log(err);
  }
  else
  {

    console.log("Connected to SQL");

    app.post('/signup', function(request, response){
        console.log(request.body);

        var salt = getSalt();
        var hash = getHash(request.body.password, salt);

        var data = {'Name': request.body.accountName,
        'Email':request.body.email,
        'Pword':hash,
        'Salt':salt
      };

      sendData(data,sqlConn);
    });

   app.get('/account', function(request, response){
        console.log(request.body);

        getData(sqlConn);
      });
  }
});

function getSalt(){
  return generateSalt(SaltLength);
}

function getHash(password, salt){
  return md5(password + salt);
}

function generateSalt(len) {
  var set = '0123456789abcdefghijklmnopqurstuvwxyzABCDEFGHIJKLMNOPQURSTUVWXYZ',
      setLen = set.length,
      salt = '';
  for (var i = 0; i < len; i++) {
    var p = Math.floor(Math.random() * setLen);
    salt += set[p];
  }
  return salt;
}

function md5(string) {
  return crypto.createHash('md5').update(string).digest('hex');
}

 function sendData(Data , Connection){

    var sqlreq = new sqlReq("sp_TempAccount_Insert", function(err, rowCount){
        if(err) {
            console.log("insert: " + err);
        } 
    });
    sqlreq.addParameter('name' , sqlType.VarChar, Data.Name);
    sqlreq.addParameter('email' , sqlType.VarChar, Data.Email);
    sqlreq.addParameter('password' , sqlType.VarChar, Data.Pword);
    sqlreq.addParameter('salt' , sqlType.VarChar, Data.Salt);

    Connection.callProcedure(sqlreq);

}

function getData(Connection){

     var doc = [];
    var sqlreq = new sqlReq("sp_TempAccount_GetAccounts", function(err, rowCount){
        if(err) {
            console.log("insert: " + err);
        } 
    });

    Connection.callProcedure(sqlreq);
    sqlreq.on('row', function(columns) {
        var row = {};
        columns.forEach(function(column) {
            row[column.metadata.colName.toLowerCase()] = column.value;
        });
        doc.push(row);

        console.log(doc);
    });
}

process.on('exit', function(){
    console.log("Process exiting");
    sqlConn.close();
});