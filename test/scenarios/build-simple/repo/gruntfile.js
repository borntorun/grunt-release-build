/**
 * Created by Joao Carvalho on 13-10-2015.
 */
  //gruntfile.js
module.exports = function( grunt ) {
  // add custom tasks

  // NOTE: cwd is `test/simulation/<scenario>/repo`
  //to get the releaseit task
  grunt.loadTasks('../../../../tasks');
  //to get the concat task
  grunt.loadTasks('../../../../node_modules/grunt-contrib-concat/tasks');


  // test config
  grunt.initConfig({

    /**
     * Case: task with default options
     */
    releaseit: {
      default: {}
    },
    //this tasks just simulate a build operation
    concat: {
      options: {
        separator: ''
      },
      dist: {
        src: ['test*.js'],
        dest: 'dist/final.js'
      }
    }
  });


  // default task
  grunt.registerTask('default', ['releaseit']);

  //build task poins to the mock concat
  grunt.registerTask('build', ['concat']);
};
