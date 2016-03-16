var fs = require('fs');
var path = require('path');
var rmdir = require('rimraf');
var multer  = require('multer');
var DecompressZip = require('decompress-zip');

const child = require('child_process');
var exec = require('child_process').exec;

var express = require('express');
var router = express.Router();

var mongoose = require('mongoose');
var User = mongoose.model('User');

var passport = require('passport');

function checkDirectorySync(directory) {
  try {
    fs.statSync(directory);
  } catch(e) {
    fs.mkdirSync(directory);
    var unzipdeps = new DecompressZip('./data/deps.zip');
    unzipdeps.on('extract', function () {
      console.log("Deps have been extracted");
    });
    unzipdeps.on('progress', function (fileIndex, fileCount) {
      //console.log('Extracted file ' + (fileIndex + 1) + ' of ' + fileCount);
    });
    unzipdeps.extract({ path: directory});
  }
}

function runAnalyser(directory) {
  //child.spawn('java', ['-jar', directory + 'analyser.jar']);
  console.log('Running Analyser');
  exec('java -jar ' + directory + 'analyser.jar ' + '\"' + directory + '\"' , function (err, stdout, stderr) {
    if (err) {
      console.log(err);
      throw err;
    }
    console.log(directory + ' Analyser stdout: ' + stdout);
    console.log(directory + ' Analyser stderr: ' + stderr);
  });
}

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    var teampath = './data/' + req.user.username;
    cb(null, teampath);
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + req.user.username + '.zip')
  }
});

var upload = multer({
                      storage: storage,
                      fileFilter: function (req, file, cb) {
                        if (path.extname(file.originalname) !== '.zip') {
                          return cb(new Error('Only .zip are allowed'))
                        }
                        cb(null, true)
                      }
                    }).single('submission');

/* General Routes */
router.get('/', function (req, res, next) {
  res.render('index', { user: req.user });
});

router.get('/register', function (req, res, next) {
  res.render('register', {});
});

router.get('/login', function (req, res, next) {
  res.render('login', { user: req.user });
});

router.get('/resources', function (req, res, next) {
  res.render('resources', { user: req.user });
});

router.get('/submission', function (req, res, next) {
  res.render('submission', { user: req.user });
});

router.get('/leaderboard', function (req, res, next) {
  res.render('leaderboard', { user : req.user });
});

/* API */
router.post('/api/register', function(req, res) {
  var user = new User({
    username: req.body.username,
    email:    req.body.email
  });
  //console.log(user);
  User.register(user, req.body.password, function(err, user) {
    if (err) {
      return res.render('register', { user: user});
    }
    console.log(user);
    passport.authenticate('local')(req,res, function () {
      res.redirect('/');
    });
  });
});

router.post('/api/login', passport.authenticate('local'), function (req, res) {
  res.redirect('/');
});

router.get('/api/logout', function (req, res, next) {
  req.logout();
  res.redirect('/');
});

router.post('/api/submission', function(req,res) {
  var teampath = './data/' + req.user.username + '/';

  rmdir(teampath, function(err) {
    if (err) {
      console.log(err);
      throw err;
    }

    console.log(teampath + 'has been deleted');

    checkDirectorySync(teampath);

    upload(req, res, function (err) {
      if(err) {
        console.log(err);
        return res.end("Error uploading file. " + err);
      }

      // extract Submission files from .zip
      var unzipper = new DecompressZip('./data/' + req.user.username + '/submission-' + req.user.username + '.zip');
      unzipper.on('extract', function () {
        console.log("Submission files have been extracted");
        runAnalyser(teampath);
      });
      unzipper.on('progress', function (fileIndex, fileCount) {
        //console.log('Extracted file ' + (fileIndex + 1) + ' of ' + fileCount);
      });
      unzipper.extract({ path: './data/' + req.user.username});

      res.end("Submission has been uploaded");
    })

  });
});

module.exports = router;
