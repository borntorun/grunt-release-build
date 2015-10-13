'use strict';

var async = require('async');
var fs = require('fs-extra');
var path = require('path');

var chai = require('chai');
var expect = chai.expect;
var should = chai.should();

var childProcess = require('child_process');

var _ = require('lodash');

var GRUNT_EXEC = 'node ' + path.resolve('node_modules/grunt-cli/bin/grunt');

var mockRepoDir = path.normalize(__dirname + '/simulation');

var distDir = path.join(mockRepoDir, 'repo');
var remoteDir = path.join(mockRepoDir, 'remote');
var verifyDir = path.join(mockRepoDir, 'validation');

var execScenario = function(cb) {
  var tasks = [];

  tasks.push(function createRemote(next) {
    fs.ensureDirSync(remoteDir);
    childProcess.exec('git init --bare', {cwd: remoteDir}, function(err, stdout, stderr) {
      if (err) throw new Error(err);
      next(err, {stdout: stdout, stderr: stderr});
    });
  });

  tasks.push(function executeGruntCommand(next) {
    //options
    GRUNT_EXEC += ' --no-color';

    childProcess.exec(GRUNT_EXEC, {cwd: distDir}, function(err, stdout, stderr) {
      next(err, {stdout: stdout, stderr: stderr});
    });
  });

  tasks.push(function createVerifyFromRemote(next) {
    fs.removeSync(verifyDir); // since we're cloning from `remote/` we'll just remove the folder if it exists
    childProcess.exec('git clone remote validation', {cwd: mockRepoDir}, function(err) {
      if (err) throw new Error(err);
      next(err);
    });
  });


  async.series(tasks, function returnCallbackStatus(err, results) {
    // return results from executeGruntCommand

    cb(err, results/*results[0].stdout, results[1].stderr*/);


  });
};

describe('releaseit', function() {

  this.timeout(120000);


  beforeEach(function(done) {
    var scenarioPath = this.currentTest.parent.title;
    // ensure that we reset to `test/` dir
    process.chdir(__dirname);
    // clean testing folder `test/mock`
    fs.removeSync('simulation');
    fs.ensureDirSync('simulation');
    try {
      // copy scenario to `test/simulation`
      fs.copySync('scenarios/' + scenarioPath, 'simulation');
      // ensure all tests are using the working directory: `test/simulation`
      process.chdir('simulation');
      done();
    }
    catch (err) {
      if (err && err.code === 'ENOENT'){
        throw new Error('could not find scenario "' + scenarioPath + '" in test/scenarios/');
      }
      throw new Error(err);
    }
  });

  describe('build-simple', function() {


    it('should have build/tag/pushed a dist folder and have the correct commit in the "validation" repo', function(done) {

      // the working directory is `test/simulation`.
      var tasks = [];

      tasks.push(function git_init(next) {
        childProcess.exec('git init', {cwd: distDir}, next);
      });
      tasks.push(function git_add(next) {
        childProcess.exec('git add .', {cwd: distDir}, next);
      });
      tasks.push(function git_commit(next) {
        childProcess.exec('git commit -m "first commit"', {cwd: distDir}, next);
      });
      tasks.push(function git_addremote(next) {
        childProcess.exec('git remote add origin ../remote', {cwd: distDir}, next);
      });

      tasks.push(function execute_scenario(next) {
        execScenario(function(err, results) {
          //console.log(results);
          expect(err).to.not.exist;
          next();
        });
      });

      //Expectations
      tasks.push(function verify_file_exists(next) {
        console.log('validation/dist');
        expect(fs.existsSync('validation/dist')).be.true;
        console.log('validation/dist/final.js');
        expect(fs.existsSync('validation/dist/final.js')).be.true;
        next();
      });
      tasks.push(function verify_commit_message(next) {
        console.log('commit message');
        childProcess.exec('git rev-parse HEAD', {cwd: 'distDir'}, function(err, sha) {
          childProcess.exec('git log --pretty=oneline --no-color', {cwd: 'validation'}, function(err, stdout) {
            expect(stdout).have.string(sha.trim() + ' Release version v0.0.1');
            next();
          });
        });
      });
      tasks.push(function verify_tag(next) {
        console.log('tag');
        childProcess.exec('git tag', {cwd: 'repo'}, function(err, tag) {
          childProcess.exec('git checkout tags/' + tag.trim() , {cwd: 'validation'}, function(err, stdout, stderr) {
            childProcess.exec('git branch', {cwd: 'validation'}, function(err, stdout) {
              expect(stdout).have.string('* (HEAD detached at v0.0.1)');
              next();
            });
          });
        });
      });

      async.series(tasks, done);
    });

  });

});




