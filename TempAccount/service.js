var http = require('http'),
    express = require('express'),
    routes = require('routes'),
    app = express(),
    sqlReq = require('tedious').Request,
    sqlType = require('tedious').TYPES,
    passport = require('passport'),
   LocalStrategy = require('passport-local').Strategy
   crypto = require('crypto'),
   stylus = require('stylus'),
    nib = require('nib'),
    fixjade = require('fix-jade');

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

var SaltLength = 20;

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

///////////// for jade
function compile(str, path) {
  return stylus(str)
    .set('filename', path)
    .use(nib());
}

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(stylus.middleware(
  { src: __dirname + '/public'
  , compile: compile
  }
));
  
app.get('/', function (req, res) {
  res.render('signup');
});

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

   app.get('/accounts/list', function (req, res) {
      var successCall = function(accounts) {
        res.render('accounts', { data: accounts})
      }
      var failureCall = function() {
        res.status(500).send({"Error":"Unable to get accounts"});
      }
      getListAccounts(sqlConn, successCall, failureCall);
    });

   app.get('/accounts/info/:account_ID', function(request, response){
        var successCall = function(info) {
          response.render('account_edit', { data: info})
        }
        var failureCall = function() {
          response.status(500).send({"Error":"Unable to get account info"});
        }
        getData(sqlConn, request.params.account_ID, successCall, failureCall);
    });

   app.get('/accounts/password/:account_ID', function(request, response){
        response.render('account_password', { id : request.params.account_ID })
    });

   app.post('/accounts/info/update', function(request, response){
        // console.log(request.body);
        var successCall = function(info) {
          console.log("Update Success");
        }
        var failureCall = function() {
          response.status(500).send({"Error":"Unable to update account info"});
        }

        var data = {
            'Account_id' : request.body.account_id,
            'Name': request.body.accountName,
            'Email':request.body.email
        };
        // console.log(data)
        updateInfo(sqlConn, data, successCall, failureCall);
    });

   app.post('/accounts/password/update', function(request, response){
        
        if(request.body.confirmNewPass != request.body.newPass){
          console.log("Error!");
          response.status(500).send({"Error":"Unable to update password"});
        }else{
          console.log("Success!");
          var successCall = function(info) {
            console.log("Update Success");
          }
          var failureCall = function() {
            response.status(500).send({"Error":"Unable to update password"});
          }

          var salt = getSalt();
          var hash = getHash(request.body.newPass, salt);

          var data = {
              'Account_id' : request.body.accountID,
              'NewPassword': hash,
              'Salt': salt
          };
          console.log("salt : " + salt);
          console.log("hash : " + hash);
          console.log("id : " + request.body.accountID);
          updatePassword(sqlConn, data, successCall, failureCall);
        }

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

  // update the info of the account
  function updateInfo(Connection, Data, successCall, failureCall){

    var sqlreq = new sqlReq("sp_TempAccount_UpdateAccountInfo", function(err, rowCount){
        if(err) {
            console.log("Update Error: " + err);
        } 
    });
    sqlreq.addParameter('account_ID' , sqlType.Int, Data.Account_id);
    sqlreq.addParameter('name' , sqlType.VarChar, Data.Name);
    sqlreq.addParameter('email' , sqlType.VarChar, Data.Email);

    try{
      Connection.callProcedure(sqlreq);
      sqlreq.on("done", function(params, returnVal, metadata) {
        console.log(params + " - " + returnVal + " - " + metadata)
        successCall();
      });
    }catch(err){
      console.log(err);
      failureCall();
    }

}

// update the password of the account
  function updatePassword(Connection, Data, successCall, failureCall){

    var sqlreq = new sqlReq("sp_TempAccount_UpdatePassword", function(err, rowCount){
        if(err) {
            console.log("Update Error: " + err);
        } 
    });
    sqlreq.addParameter('account_ID' , sqlType.Int, Data.Account_id);
    sqlreq.addParameter('password' , sqlType.VarChar, Data.NewPassword);
    sqlreq.addParameter('salt' , sqlType.VarChar, Data.Salt);

    try{
      Connection.callProcedure(sqlreq);
      sqlreq.on("done", function(params, returnVal, metadata) {
        console.log(params + " - " + returnVal + " - " + metadata)
        successCall();
      });
    }catch(err){
      console.log(err);
      failureCall();
    }

}

 function sendData(Data , Connection){

    var sqlreq = new sqlReq("sp_TempAccount_Insert", function(err, rowCount){
        if(err) {
            console.log("Insert Error: " + err);
        } 
    });
    sqlreq.addParameter('name' , sqlType.VarChar, Data.Name);
    sqlreq.addParameter('email' , sqlType.VarChar, Data.Email);
    sqlreq.addParameter('password' , sqlType.VarChar, Data.Pword);
    sqlreq.addParameter('salt' , sqlType.VarChar, Data.Salt);

    Connection.callProcedure(sqlreq);

}

function getData(Connection, id, successCall, failureCall){

    var sqlreq = new sqlReq("sp_TempAccount_GetSingle", function(err, rowCount){
        if(err) {
            console.log("Retrieve Data Error: " + err);
            failureCall();
        } 
    });

    try {
      sqlreq.addParameter('account_ID', sqlType.VarChar, id);
      Connection.callProcedure(sqlreq);
      sqlreq.on('row', function(columns) {
          var row = {};
          columns.forEach(function(column) {
              row[column.metadata.colName.toLowerCase()] = column.value;
          });
          console.log("Row : ");
          console.log(row);
          successCall(row)
      });
    }
    catch (err) {
      failureCall()
    }
}

function getListAccounts(Connection, successCall, failureCall){

    var doc = [];
    var sqlreq = new sqlReq("sp_TempAccount_GetAccounts", function(err, rowCount){
        if(err) {
            console.log("Retrieve All Data Error: " + err);
            failureCall();
        } 
    });
    try {
      Connection.callProcedure(sqlreq);
      sqlreq.on('row', function(columns) {
          var row = {};
          columns.forEach(function(column) {
              row[column.metadata.colName.toLowerCase()] = column.value;
          });
          doc.push(row);
      });
      sqlreq.on('doneProc', function(rowCount, more, returnStatus, rows) {
        console.log("Row Count: " + rowCount);
        console.log(more);
        console.log("Return Status " + returnStatus);
        console.log("Rows: " );
        console.log(rows)
        console.log(doc)
        successCall(doc)
      });
    }
    catch (err) {
      failureCall()
    }
}

process.on('exit', function(){
    console.log("Process exiting");
    sqlConn.close();
});