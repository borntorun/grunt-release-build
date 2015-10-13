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
        '<%= nodeunit.tests %>'
      ],
      options: {
        jshintrc: '.jshintrc'
      }
    },

    // Before generating any new files, remove any previously-created files.
    clean: {
      tests: ['tmp'],
      teste1: ['teste1'],
      teste2: ['teste2']
    },

    // Configuration to be run (and then tested).
    releaseit: {
      options: {
        type: 'major'
      },
      default: {},
      modified: {
        options:{
          type: 'minor',
          silent: true,
          tasks: {
            build: ['clean:teste2']
          },
          commit: 'Build/Release %v',
          tag: 'Version => %v'
        }

      }
    },

    // Unit tests.
    nodeunit: {
      tests: ['test/*_test.js']
    }

  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');

  // Whenever the "test" task is run, first clean the "tmp" dir, then run this
  // plugin's task(s), then test the result.
  grunt.registerTask('test', ['clean', 'releaseit', /*'nodeunit'*/]);

  grunt.registerTask('build', ['clean:teste1']);

  // By default, lint and run all tests.
  grunt.registerTask('default', ['jshint', 'test']);

};
