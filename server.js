var express = require('express');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var exphbs  = require('express-handlebars');
var path =  require('path');
var mongoose = require('mongoose');
var cookieParser = require('cookie-parser');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var mongoUri = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost/nnchallenge';

// Connection to db
mongoose.connect(mongoUri, function (error) {
    if (error) {
        console.log(error);
    }
});

var app = express();

// Set the port
var port = process.env.PORT || 3300;

// Set Morgan logger
app.use(morgan('dev'));

// Set layout engine
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

// Getting data via Json from Post
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Auth
app.use(cookieParser());
app.use(require('express-session')({
  secret: 'nervousnet',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Serving static files
app.set('views', './views')
app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'public')));

// Set Models
var models = require('./models');

// Passport Config
var User = mongoose.model('User');
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Set Router
app.use('/', require('./routes/main') )

// Listen
var server = app.listen(port, function () {
  console.log('App listening at http://%s:%s', server.address().address, server.address().port);
});