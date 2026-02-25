var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
require("dotenv").config();
var errorHandler = require('./Middleware/errorHandler');

var indexRouter = require('./routes/index');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', indexRouter);

// ---- 404 HANDLER ----//
app.use(function (req, res, next) {
  res.status(404).render('error', {
    message: 'Route Not Found',
    error: { status: 404 }
  });
});

// ---- GLOBAL ERROR HANDLER ----//
app.use(errorHandler);

module.exports = app;
