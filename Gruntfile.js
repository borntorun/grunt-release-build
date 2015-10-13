/*
 * grunt-release-it
 * https://github.com/borntorun/grunt-release-it
 *
 * Copyright (c) 2015 João Carvalho
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    jshint: {
      all: [
        'Gruntfile.js',
        'tasks/*.js',
        '<%= mochaTest.test.src %>'
      ],
      options: {
        jshintrc: '.jshintrc'
      }
    },

    // Before generating any new files, remove any previously-created files.
    clean: {
      tests: [
        'test/simulation'
      ],
      teste1: ['teste1'],
      teste2: ['teste2']
    },

    // Configuration to be run (and then tested).
    releaseit: {
      default: {},
      modified: {
        options:{
          type: 'minor',
          silent: false,
          tasks: {
            build: ['clean:teste1', 'clean:teste2']
          },
          commit: 'Build/Release v%v',
          tag: 'Version => %v'
        }

      }
    },
    watch: {
      tests: {
        files: [
          'tasks/**/*.js',
          'test/**/*',
          '!**/test/simulation/**',

          // don't watch remote repo files
          // see https://github.com/gruntjs/grunt-contrib-watch/issues/75#issuecomment-70389741
          '!test/scenarios/**/{remote,*_remote}/{**/*,*}'
        ],
        tasks: 'test',
        options: {
          atBegin: true
        }
      }
    },

    // Unit tests.
    mochaTest: {
      test: {
        src: ['test/releaseit_test.js']
      }
    }

  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-mocha-test');


  // Whenever the "test" task is run, first clean the "tmp" dir, then run this
  // plugin's task(s), then test the result.
  grunt.registerTask('test', ['clean:tests', 'mochaTest']);

  // By default, lint and run all tests.
  grunt.registerTask('default', ['jshint', 'test']);

};
