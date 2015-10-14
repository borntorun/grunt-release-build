'use strict';

var async = require('async');
var fs = require('fs-extra');
var path = require('path');

var chai = require('chai');
var expect = chai.expect;
//var should = chai.should();
var childProcess = require('child_process');

var _ = require('lodash');

var Q = require('q');

var GRUNT_EXEC = 'node ' + path.resolve('node_modules/grunt-cli/bin/grunt');

var mockRepoDir = path.normalize(__dirname + '/simulation');
var scenarioDir;
var repoDir;
var remoteDir;
var validationDir;

function execChildProcess ( cmdline, options, next ) {

  childProcess.exec(cmdline, options, function( err, stdout, stderr ) {
    next(err, {stdout: stdout, stderr: stderr});
  });
}

function runChildProcess ( cmdline, options ) {
  var defered = Q.defer();

  childProcess.exec(cmdline, options, function cb_runChildProcess( err, stdout, stderr ) {
    if ( err ) {
      throw new Error(err);
      //defered.reject(err);
    }
    else {
      defered.resolve({stdout: stdout, stderr: stderr});
    }
  });
  return defered.promise;
}

function execScenario ( cb ) {
  var tasks = [];

  tasks.push(function executeGruntCommand( next ) {
    //options
    GRUNT_EXEC += ' --no-color';

    execChildProcess(GRUNT_EXEC, {cwd: repoDir}, next);
  });

  tasks.push(function createVerifyFromRemote( next ) {
    fs.removeSync(validationDir); // since we're cloning from `remote/` we'll just remove the folder if it exists

    execChildProcess('git clone remote validation', {cwd: scenarioDir}, next);
  });

  async.series(tasks, function returnCallbackStatus( err, results ) {
    // return results from tasks
    // results is an array
    console.log(results);
    cb(err, results/*results[0].stdout, results[1].stderr*/);
  });
}

describe('releaseit', function() {

  this.timeout(120000);

  //Error mocha TypeError: JSON.stringify cannot serialize cyclic structures.
  //https://github.com/metaskills/mocha-phantomjs/issues/104
  var stringify = JSON.stringify;
  //End:Error mocha TypeError

  before(function() {

    //Error mocha TypeError: JSON.stringify cannot serialize cyclic structures.
    //https://github.com/metaskills/mocha-phantomjs/issues/104
    JSON.stringify = function( obj ) {
      var seen = [];

      return stringify(obj, function( key, val ) {
        if ( typeof val === 'object' ) {
          if ( seen.indexOf(val) >= 0 ) {
            return;
          }
          seen.push(val);
        }
        return val;
      });
    };
    //End:Error mocha TypeError
  });

  after(function() {
    //Error mocha TypeError
    JSON.stringify = stringify;
    //End:Error mocha TypeError

    process.chdir(__dirname);
    fs.removeSync('simulation');
  });

  before(function( done ) {
    //before all describes: only once

    // ensure that we reset to `test/` dir
    process.chdir(__dirname);
    // clean testing folder `test/simulation`
    fs.removeSync('simulation');
    fs.ensureDirSync('simulation');
    done();
  });

  function removeScenario(name) {
    process.chdir(__dirname);
    fs.removeSync('simulation/' + name);
  }
  function createScenario(name){
    var scenarioPath = name;

    scenarioDir = path.join(mockRepoDir, scenarioPath);
    repoDir = path.join(mockRepoDir, scenarioPath, 'repo');
    remoteDir = path.join(mockRepoDir, scenarioPath, 'remote');
    validationDir = path.join(mockRepoDir, scenarioPath, 'validation');

    try {
      fs.ensureDirSync(scenarioDir);
      // copy scenario to `test/simulation`
      fs.copySync('scenarios/' + scenarioPath, scenarioDir);
      // ensure all tests are using the working directory: `test/simulation/<scenario-path>`
      process.chdir(scenarioDir);
    }
    catch( err ) {
      if ( err && err.code === 'ENOENT' ) {
        throw new Error('Could not find scenario "' + scenarioPath + '" in test/scenarios/');
      }
      throw new Error(err);
    }
  }

  describe('build-simple', function() {

    after(function( done ) {
      removeScenario(this.test.parent.title);
      done();
    });
    before(function( done ) {
      //before each it block - only once
      var tasks = [];

      process.chdir(__dirname);

      createScenario(this.test.parent.title/*this.currentTest.parent.title*/);

      // the working directory is `test/simulation/` + scenarioPath

      tasks.push(function createRemote( next ) {
        fs.ensureDirSync(remoteDir);
        childProcess.exec('git init --bare', {cwd: remoteDir}, function( err, stdout, stderr ) {
          if ( err ) {throw new Error(err);}
          next(null, {stdout: stdout, stderr: stderr});
        });
      });

      tasks.push(function prepareRepo( next ) {
        runChildProcess('git init;git add .;git commit -m "first commit";git remote add origin ../remote', {cwd: 'repo'})
          .then(function() {
            /*console.log('ok');*/
            execScenario(function( err/*, results*/ ) {
              if ( err ) {
                throw new Error(err);
              }
              next();
            });
          })
          .catch(function( err ) {
            /*console.log(err);*/
            next(err);
          });
      });

      async.series(tasks, function( err/*, results*/ ) {
        if ( err ) {
          done(err);
        }
        else {
          done();
        }
      });
    });

    it('should exists file \'dist/final.js\' in \'validation\' repo', function( done ) {
      var tasks = [];

      //Expectations
      tasks.push(function verify_file_exists( next ) {
        expect(fs.existsSync('validation/dist')).to.equal(true);
        expect(fs.existsSync('validation/dist/final.js')).to.equal(true);
        next();
      });
      async.series(tasks, done);

    });

    it('should have correct tag and allow checkout tag', function( done ) {
      var tasks = [];

      tasks.push(function verify_tag( next ) {

        runChildProcess('git tag', {cwd: 'repo'})
          .then(function( data ) {
            return runChildProcess('git checkout tags/' + data.stdout.trim(), {cwd: 'validation'});
          })
          .then(function( /*data*/ ) {
            return runChildProcess('git branch', {cwd: 'validation'});
          })
          .then(function( data ) {
            expect(data.stdout).have.string('* (HEAD detached at v0.0.1)');
            next();
          })
          .catch(function( err ) {
            next(err);
          });
      });
      async.series(tasks, function( err, results ) {
        //console.log('err=', err, 'results=', results)
        if ( err ) {
          done(err);
        }
        else {
          done();
        }
      });
    });

    it('should have correct commit/tag messages', function( done ) {
      var tasks = [];

      tasks.push(function verify_tag_message( next ) {

        runChildProcess('git tag -l -n1 v0.0.1', {cwd: 'repo'})
          .then(function( data ) {
            var tag = data.stdout.trim();
            expect(tag).have.string(' Version 0.0.1');
            next();
          })
          .catch(function( err ) {
            next(err);
          });
      });

      tasks.push(function verify_commit_message( next ) {

        runChildProcess('git rev-parse HEAD', {cwd: 'repo'})
          .then(function( data ) {
            var sha = data.stdout.trim();
            runChildProcess('git log --pretty=oneline --no-color', {cwd: 'validation'})
              .then(function( data ) {
                expect(data.stdout).have.string(sha + ' Release version v0.0.1');
                next();
              })
              .catch(function( err ) {
                next(err);
              });
          })
          .catch(function( err ) {
            next(err);
          });
      });
      async.series(tasks, function( err, results ) {
        //console.log('err=', err, 'results=', results)
        if ( err ) {
          done(err);
        }
        else {
          done();
        }
      });
    });

    it('should have update manifest files', function( done ) {
      var tasks = [];

      //Expectations
      tasks.push(function verify_manifest_files( next ) {

        Q.allSettled([
          readManifest(path.join(repoDir, 'package.json')),
          readManifest(path.join(repoDir, 'bower.json'))
        ])
          .then(function( data ) {
            data.forEach(function( file ) {
              expect(file.value.version).to.equal('0.0.1');
            });
            next();
          })
          .catch(function( err ) {
            next(err);
          });

      });

      async.series(tasks, function( err, results ) {
        //console.log('err=', err, 'results=', results)
        if ( err ) {
          done(err);
        }
        else {
          done();
        }
      });

    });
  });

  function readManifest( file ) {
    var deferred = Q.defer();
    fs.readJson(file, function readManifest( err, fileObj ) {
      if ( err ) {
        deferred.reject(err);
      }
      else {
        deferred.resolve(fileObj);
      }
    });
    return deferred.promise;
  }

});




