/*
 * grunt-release-it
 * https://github.com/borntorun/grunt-release-it
 *
 * Copyright (c) 2015 João Carvalho
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function( grunt ) {
  var util = require('util');
  var format = util.format;
  var path = require('path');
  var fs = require('fs');
  var shelljs = require('shelljs');
  var url = require('url');
  var semver = require('semver');
  var Q = require('q');
  var readlinesync = require('readline-sync');

  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  grunt.registerMultiTask('releaseit', 'Grunt plugin to build a new release for a package.', function() {
    // Merge task-specific and/or target-specific options with these defaults.
    var taskName = this.name;
    var DIR_DIST = 'dist';
    var TYPES = {
      patch: 'patch',
      minor: 'minor',
      major: 'major'
    }
    var options = this.options({
      dir: DIR_DIST,
      type: 'patch',
      silent: false,
      tasks: {
        build: ['clean:teste1', 'clean:teste2']//['build']
      },
      commit: 'Release version %v',
      tag: 'Version %v'

    });

    //
    var errors = [];

    options.silent = typeof options.silent === 'boolean' ? options.silent : false;

    verifyDir();
    verifyType();
    verifyTasks();
    verifyOthers();

    if ( errors.length > 0 ) {
      throw new Error('\n' + errors.join('\n') + '\n');
    }

    function existsFilePath( filePath ) {
      grunt.log.ok(filePath);
      return fs.existsSync(filePath);
    }

    function verifyDir() {
      if ( typeof options.dir !== 'string' ) {
        options.dir = DIR_DIST;
      }
      if ( !existsFilePath(path.join(__dirname, options.dir)) ) {
        grunt.option('createDir', true);
      }
      else {
        grunt.option('createDir', false);
      }
    }

    function verifyType() {
      if ( TYPES[options.type] == null ) {
        errorOption('type', options.type);
      }
    }

    function verifyTasks() {
      if ( options.tasks.build ) {
        if ( isTypeString(options.tasks.build) ) {
          options.tasks.build = [options.tasks.build];
        }
        if ( util.isArray(options.tasks.build) ) {
          options.tasks.build.forEach(function( item ) {
            if ( !isTypeString(item) ) {
              errorOption('tasks.build', JSON.stringify(item));
            }
          });
        }
        else {
          errorOption('tasks.build', options.tasks.build);
        }
      }
      else {
        options.tasks.build = [];
      }

    }

    function verifyOthers() {
      if ( !isTypeString(options.commit) ) {
        errorOption('commit', options.commit);
      }
      if ( !isTypeString(options.tag) ) {
        errorOption('tag', options.tag);
      }
    }

    grunt.verbose.writeln(JSON.stringify(this));
    grunt.verbose.writeln(JSON.stringify(options));
    grunt.log.ok('createDir:', grunt.option('createDir'));

    Q.fcall(yes(format('Release [%s] (Y/n)?', options.type)))
      .then(command('git symbolic-ref --short -q HEAD', 'Get current branch'))
      .then(masterIsCurrentBranch)
      .then(command('git status --porcelain', 'Get current status'))
      .then(statusIsOk)
      //.then(command('git describe --tags --abbrev=0','Get last tag'))
      .then(command('echo v0.0.0', 'Get last tag')) //temp
      .then(semverIncrement)
      .then(function() {
        return Q.fcall(yes(format('Build/Release/Update to [%s] (Y/n)?', grunt.option('version'))));
      })
      .then(updateManifests)
      .then(runBuildTasks)
      //.then(command('git add -A .', 'Git add'))
      .then(command('echo "git add -A ."', 'Git add')) //temp
      //.then(command(format('git commit -m "%s"',options.commit), 'Git commit'))
      .then(gitCommit())
      .then(function( data ) {
        grunt.log.ok('then:final--->', data);
      })
      .catch(function( error ) {
        grunt.log.ok('catch:final--->');
        grunt.fail.fatal(error.message);
      });
    //      .done(function(data){
    ////        console.log('data=',data);
    ////        grunt.log.ok(format('\nEnd task [%s].', taskName));
    //      });

    function gitCommit() {

      return function() {
        var deferred = Q.defer();

        //Q.fcall(command(format('git commit -m \'%s\'', options.commit.replace('%v', grunt.option('version'))), 'Git commit'))
        Q.fcall(command(format('echo "git commit -m \'%s\'"', options.commit.replace('%v', grunt.option('version'))), 'Git commit'))//TODO:temp
          .then(function(data){
            deferred.resolve(data);
          })
          .catch(function(err){
            deferred.reject(err);
          });

        return deferred.promise;

      };

    }

    function runBuildTasks() {
      return (function() {
        if ( options.tasks.build.length > 0 ) {
          var aToRun = [];

          options.tasks.build.forEach(function( item ) {
            aToRun.push(command('grunt ' + item, 'Task:' + item));
          });

          return aToRun.reduce(function( accum, cur ) {
            return accum.then(cur);
          }, Q());

          /*result.then(function(res){
            grunt.log.ok('result:then:' + res);// handle success
            return res;
          }).catch(function(err){
            grunt.log.warn('result:catch:' + err);// handle failure
            return err;
          });*/

        }
      }());

      //      return Q.fcall(function() {
      //        if (options.tasks.build.length > 0){
      //          var aToRun = [];
      //
      //
      //          options.tasks.build.forEach(function(item){
      //            aToRun.push(command('grunt ' + item, 'Task:' + item)());
      //          });
      //
      //          var result = aToRun.reduce(function(accum,cur){ return accum.then(cur); },Q());
      //
      //          return result;
      //
      //          //return Q.all(aToRun);
      //        }
      //      });
    }

    function updateManifests() {
      function updateVersion( name ) {

        var _ = grunt.util._;
        var manifest = grunt.file.readJSON(name);

        manifest = JSON.stringify(_.extend(manifest, {version: grunt.option('version')}), null, 2);

        grunt.file.write(name, manifest);
      }

      return Q.fcall(function() {
        var packageJson = path.join(__dirname, 'package1.json');
        var bowerJson = path.join(__dirname, 'bower1.json');

        if ( existsFilePath(packageJson) ) {
          updateVersion(packageJson);
        }
        if ( existsFilePath(bowerJson) ) {
          updateVersion(bowerJson);
        }
      });

    }

    function statusIsOk( result ) {
      result = '';//TODO: delete this line
      var status = '';
      return compare(result.trim(), status, format('Error in step [%s]. Files were modified. Output:[%s]', 'Get current status', result.trim()));

    }

    function masterIsCurrentBranch( result ) {
      var branch = 'master';
      return compare(result.trim(), branch, format('Error in step [%s]. Branch [%s] is not the current branch. Output:[%s]', 'Get current branch', branch, result.trim()));
    }

    function compare( input, test, message ) {
      return Q.fcall(function() {
        var result = (input === test);
        if ( result ) {
          return result;
        }
        else {
          throw new Error(message);
        }
      });
    }

    function semverIncrement( actual ) {
      var deferred = Q.defer();
      try {
        var version = semver.inc(actual.trim(), options.type);
        if ( version != null ) {
          grunt.option('version', version);
          deferred.resolve(grunt.option('version'));
        }
        else {
          throw new Error('Version is null');
        }
      }
      catch( err ) {
        deferred.reject(new Error(format('Error in step [semverIncrement]. Error: [%s]', err.message)));
      }
      return deferred.promise;
    }

    function command( cmdline, step ) {

      return function() {
        grunt.log.ok('command=' + step);
        var deferred = Q.defer();
        var executed = shelljs.exec(cmdline, {silent: true});
        var code = executed.code;
        if ( code === 0 ) {
          deferred.resolve(executed.output);
        }
        else {
          deferred.reject(new Error(format('Error in step [%s]. Error Code:[%s]. Error output:[%s]', step, code, executed.output)));
        }
        return deferred.promise;
      };
    }

    function yes( message ) {
      return function() {
        grunt.log.ok('\n');
        var resp = readlinesync.question(message);//);
        if ( resp.toLowerCase() !== 'y' ) {
          throw new Error(format('Process stopped by user.\nMessage: [%s].\nUser answered: [%s]', message, resp));
        }
        return true;
      };
    }

    function errorOption( name, value ) {
      errors.push(util.format('Invalid value for option "%s": [%s]', name, value));
    }

    function isTypeString( value ) {
      return typeof value === 'string';
    }

    //    if (options.remote.identify) {
    //      grunt.log.writeln(JSON.stringify(url.parse(options.remote.identify)));
    //    }

    //grunt.log.writeln('File "' + f.dest + '" created.');

    // Iterate over all specified file groups.
    //this.files.
  });

};
