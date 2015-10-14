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
    //var taskName = this.name;
    //var DIR_DIST = 'dist';
    var TYPES = {
      patch: 'patch',
      minor: 'minor',
      major: 'major',
      premajor: 'premajor',
      preminor: 'preminor',
      prepatch: 'prepatch',
      prerelease: 'prerelease'
    };

    grunt.verbose.writeln(JSON.stringify(this.options));

    var options = this.options({
      //dir: DIR_DIST,
      type: 'patch',
      silent: false,
      tasks: {
        build: ['build']
      },
      commit: 'Release version v%v',
      tag: 'Version %v'
    });

    var errors = [];

    options.silent = typeof options.silent === 'boolean' ? options.silent : false;

    //verifyDir();
    verifyType();
    verifyTasks();
    verifyOthers();

    if ( errors.length > 0 ) {
      throw new Error('\n' + errors.join('\n') + '\n');
    }



    var MSG = {
      INIT_TASK: 'Release [%s] (Y/n)?',
      RUN_BUILD: 'Build/Release/Update to [%s]\n[Manifest files will be updated/Build tasks will run] (Y/n)?',
      GIT_OP: 'Add, commit and create tag [%s] (Y/n)?',
      PUSH_REMOTE: 'Push (w/tags) to branch [master] on [%s] (Y/n)?',
      DONE: 'Release done: v%s committed, tagged and pushed to [%s] on [%s].\n'
    };

    grunt.verbose.writeln(JSON.stringify(this));
    grunt.verbose.writeln(JSON.stringify(options));

    Q.fcall(yes(format(MSG.INIT_TASK, options.type)))

      .then(isCurrentBranch('master'))
      .then(isStatusClean())
      .then(incrementVersion())
      .then(function() {
        return Q.fcall(yes(format(MSG.RUN_BUILD, grunt.option('version'))));
      })
      .then(updateManifests)
      .then(runBuildTasks)
      .then(function() {
        return Q.fcall(yes(format(MSG.GIT_OP , grunt.option('version'))));
      })
      .then(gitAdd())
      .then(gitCommit())
      .then(gitTag())
      .then(gitRemote())
      .then(function() {
        return Q.fcall(yes(format(MSG.PUSH_REMOTE, grunt.option('remote'))));
      })
      .then(gitPush())
      .then(function() {
        grunt.log.ok(format(MSG.DONE, grunt.option('version'), 'master', grunt.option('remote')));
      })
      .catch(function( error ) {
        grunt.log.warn('Process interrupted.');
        grunt.fail.fatal(error.message);
      });


    function existsFilePath( filePath ) {
      //grunt.log.ok(filePath);
      return fs.existsSync(filePath);
    }

    //    function verifyDir() {
    //      if ( typeof options.dir !== 'string' ) {
    //        options.dir = DIR_DIST;
    //      }
    //      if ( !existsFilePath(path.join(__dirname, options.dir)) ) {
    //        grunt.option('createDir', true);
    //      }
    //      else {
    //        grunt.option('createDir', false);
    //      }
    //    }

    /**
     * Test type option is valid
     */
    function verifyType() {
      if ( TYPES[options.type] == null ) {
        errorOption('type', options.type);
      }
    }

    /**
     * Test tasks.build option
     */
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

    /**
     * Test other options
     */
    function verifyOthers() {
      if ( !isTypeString(options.commit) ) {
        errorOption('commit', options.commit);
      }
      if ( !isTypeString(options.tag) ) {
        errorOption('tag', options.tag);
      }
    }

    /**
     * Test if a brach is the current one
     * @param branch
     * @returns {Function}
     */
    function isCurrentBranch( branch ) {
      return function() {
        var deferred = Q.defer();

        Q.fcall(command('git symbolic-ref --short -q HEAD', 'Get current branch'))
          .then(function( data ) {
            if ( data && data.trim() === branch ) {
              deferred.resolve(true);
            }
            else {
              throw new Error(format('Error. Branch [%s] is not the current branch. Output:[%s]', branch, data.trim()));
            }
          })
          .catch(function( err ) {
            deferred.reject(err);
          });
        return deferred.promise;
      };
    }

    /**
     * Test if git status is clean
     * @returns {Function}
     */
    function isStatusClean() {
      return function() {
        var deferred = Q.defer();

        Q.fcall(command('git status --porcelain', 'Get status'))
          .then(function( data ) {
            //data = '';//TODO: delete this line
            if ( typeof data === 'string' && data.trim() === '' ) {
              deferred.resolve(true);
            }
            else {
              throw new Error(format('Error. Working directory is not in clean status. Output:[%s]', data.trim()));
            }

          })
          .catch(function( err ) {
            deferred.reject(err);
          });

        return deferred.promise;

      };
    }

    /**
     * Increment version based on last tag
     * @returns {Function}
     */
    function incrementVersion() {
      return function() {
        var deferred = Q.defer();

        function incVersion(data) {
          var version = semver.inc(data.trim(), options.type);
          if ( version != null ) {
            grunt.option('version', version);
            deferred.resolve(grunt.option('version'));
          }
          else {
            deferred.reject(new Error('Error in step [incrementVersion]. Version is null'));
          }
        }

        Q.fcall(command('git describe --tags --abbrev=0','Get last tag'))
          .then(function( data ) {
            try {
              if (!data || data.trim()===''){
                data = 'v0.0.0';
              }
              incVersion(data);
            }
            catch( err ) {
              deferred.reject(new Error(format('Error in step [incrementVersion]. [%s]', err.message)));
            }

          })
          .catch(function( err ) {

            if (err.message.indexOf('No names found, cannot describe anything')>-1) {
              incVersion('v0.0.0');
            } else {
              deferred.reject(err);
            }
          });
        return deferred.promise;
      };
    }

    /**
     * Update manifest files (package.json and bower.json)
     * @returns {*}
     */
    function updateManifests() {
      function updateVersion( name ) {
        var _ = grunt.util._;
        var manifest = grunt.file.readJSON(name);

        manifest = JSON.stringify(_.extend(manifest, {version: grunt.option('version')}), null, 2);
        grunt.file.write(name, manifest);
      }
      return Q.fcall(function() {
        var files = [
          path.join('./', 'package.json'),
          path.join('./', 'bower.json')
        ];
        files.forEach(function(item){
          //grunt.log.ok(item);
          if ( existsFilePath(item) ) {
            updateVersion(item);
          }
        });
      });
    }

    /**
     * Run build tasks
     */
    function runBuildTasks() {
      return (function() {
        if ( options.tasks.build.length > 0 ) {
          var aToRun = [];

          options.tasks.build.forEach(function( item ) {
            aToRun.push(command('grunt ' + item, 'Task:' + item));
          });

          return aToRun.reduce(function( accum, cur ) { //tks to http://stackoverflow.com/a/24262233/854575
            return accum.then(cur);
          }, Q());
        }
      }());
    }
    /**
     * Add changes (from the updatemanifests and build tasks) to git
     * @returns {Function}
     */
    function gitAdd() {
      return function() {
        var deferred = Q.defer();
        Q.fcall(command('git add -A .', 'Git add'))
        //Q.fcall(command('echo "git-add -A ."', 'Git add'))//TODO:temp
          .then(function( data ) {
            deferred.resolve(data);
          })
          .catch(function( err ) {
            deferred.reject(err);
          });
        return deferred.promise;
      };
    }
    /**
     * Add changes to git
     * @returns {Function}
     */
    function gitCommit() {
      return function() {
        var deferred = Q.defer();

        if (!grunt.option('version')) {
          throw new Error('Error in step [Git commit]. Version is not defined.');
        }

        Q.fcall(command(format('git commit -m \'%s\'', options.commit.replace('%v', grunt.option('version'))), 'Git commit'))
        //Q.fcall(command(format('echo "git commit -m \'%s\'"', options.commit.replace('%v', grunt.option('version'))), 'Git commit', false))//TODO:temp
          .then(function( data ) {
            deferred.resolve(data);
          })
          .catch(function( err ) {
            deferred.reject(err);
          });
        return deferred.promise;
      };
    }

    /**
     * Tag the new version
     * @returns {Function}
     */
    function gitTag() {
      return function() {
        var deferred = Q.defer();

        if (!grunt.option('version')) {
          throw new Error('Error in step [Git tag]. Version is not defined.');
        }
        Q.fcall(command(format('git tag -a v%s -m \'%s\'', grunt.option('version'), options.tag.replace('%v', grunt.option('version'))), 'Git tag'))
        //Q.fcall(command(format('echo "git tag -a v%s -m \'%s\'"', grunt.option('version'), options.tag.replace('%v', grunt.option('version'))), 'Git tag', false))//TODO:temp
          .then(function( data ) {
            deferred.resolve(data);
          })
          .catch(function( err ) {
            deferred.reject(err);
          });
        return deferred.promise;
      };
    }

    /**
     * Retrieve the remote name
     * @returns {Function}
     */
    function gitRemote() {
      return function() {
        var deferred = Q.defer();
        Q.fcall(command('git remote', 'Git remote'))
          .then(function( data ) {
            if ( !data || !data.trim() ) {
              deferred.reject(new Error('Error in step [Git remote]. No remotes founds.'));
            }
            var remotes = data.trim().split('\n');
            if ( remotes.length == 1 ) {
              grunt.option('remote', remotes[0]);
              deferred.resolve(grunt.option('remote'));
            }
            else {
              remotes.forEach(function( item, index, list ) {
                list[index] = format('[%s]-%s', index + 1, item);
              });
              var resp = 0;
              grunt.log.writeln(format('%s ', '\n\nThere are more than 1 remote associate with this repo, please choose the one to push into.\n\n' + remotes.join('\n')));
              while ( isNaN(resp) || resp === 0 || resp > remotes.length ) {
                resp = readlinesync.question('\nYour choice?');
                if ( resp === '' ) {
                  grunt.option('remote', undefined);
                  throw new Error('Error in step [Git remote]. No response from user.');
                }
                resp = parseInt(resp);
              }
              grunt.option('remote', data.trim().split('\n')[resp-1]);//using original output
              deferred.resolve(grunt.option('remote'));
            }

          })
          .catch(function( err ) {
            grunt.option('remote', undefined);
            deferred.reject(err);
          });
        return deferred.promise;
      };
    }

    /**
     * Push to remote
     * @returns {Function}
     */
    function gitPush() {
      return function() {
        var deferred = Q.defer();

        if (!grunt.option('remote')) {
          throw new Error('Error in step [Git push]. Remote is not defined.');
        }
        Q.fcall(command(format('git push %s master --tags', grunt.option('remote')), 'Git push', false))
        //Q.fcall(command(format('echo "git push %s master --tags"', grunt.option('remote')), 'Git push', false))//TODO:temp
          .then(function( data ) {
            deferred.resolve(data);
          })
          .catch(function( err ) {
            deferred.reject(err);
          });
        return deferred.promise;
      };
    }

//    function compare( input, test, message ) {
//      return Q.fcall(function() {
//        var result = (input === test);
//        if ( result ) {
//          return result;
//        }
//        else {
//          throw new Error(message);
//        }
//      });
//    }
    /**
     * Execute a shell cmd
     * @param cmdline {string} Command to be executed
     * @param step {string} Step name on the task
     * @param silent {boolean} [true] If false will output result
     * @returns {Function}
     */
    function command( cmdline, step, silent ) {
      silent = typeof silent === 'boolean'? silent: true;

      return function() {
        grunt.verbose.writeln(format('Step=[%s]',step));

        var deferred = Q.defer();
        var executed = shelljs.exec(cmdline, {silent: silent});
        var code = executed.code;
        if ( code === 0 ) {
          grunt.verbose.writeln(format('End step [%s]-OK',step));
          deferred.resolve(executed.output);
        }
        else {

          deferred.reject(new Error(format('Error in step [%s]. Error Code:[%s]. Error output:[%s]', step, code, executed.output)));
        }
        return deferred.promise;
      };
    }

    /**
     * Output message/question to user
     * Will throw error if answer is not yY(es)
     * @param message
     * @returns {Function}
     */
    function yes( message ) {
      return function() {
        if (options.silent === false) {
          grunt.log.ok('\n');
          var resp = readlinesync.question(message);//);
          if ( resp.toLowerCase() !== 'y' ) {
            throw new Error(format('Process stopped by user.\nMessage: [%s].\nUser answered: [%s]', message, resp));
          }
        }
        return true;
      };
    }

    //util functions
    function errorOption( name, value ) {
      errors.push(util.format('Invalid value for option "%s": [%s]', name, value));
    }

    function isTypeString( value ) {
      return typeof value === 'string';
    }


  });

};
