var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var session = require('express-session');
var crypto = require('crypto');

var routes_front = require('./routes/front');
var routes_back = require('./routes/back');

//Connect to the DataBase
var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/NationalIdentity');

var AM = require('./helpers/account-manager/AM')
var AM = new AM(db, crypto);

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

//==MIDLEWARE==//
//Log ips
app.use(function (req, res, next) {
  var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  console.log('Client IP:', ip);
  next();
});

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(session({secret: '<TODO-Secret-KEY>', resave:false, saveUninitialized:false}));

app.use(function(req,res,next){
    req.db = db;
    req.AM = AM;
    next();
});

app.use('/', routes_front);
app.use('/app', routes_back);
app.use('/user', AM.routes);

AM.setup()



// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
