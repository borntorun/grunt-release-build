/**
 * Created by Joao Carvalho on 13-10-2015.
 */
  //gruntfile.js
module.exports = function( grunt ) {
  // add custom tasks
  // NOTE: cwd is `test/mock`
  grunt.loadTasks('../../../tasks');
  grunt.loadTasks('../../../node_modules/grunt-contrib-concat/tasks');


  // test config
  grunt.initConfig({
    releaseit: {
      default: {}
    },
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

  grunt.registerTask('build', ['concat']);
};
