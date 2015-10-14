# grunt-release-it

> Grunt plugin to build a new release for a package. Release a patch, minor or major release. Allows git-tag and git-push to remote repo/branch.

## Getting Started
This plugin requires Grunt `~0.4.5`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-release-it --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-release-it');
```

## The "releaseit" task

Increment versions in manifests files (use git tag to discover the actual version)

Run build tasks, update manifests, release a patch, minor or major release.

Allows git-tag and git-push to remote repository (allows choosing if several remotes are in use).

* for now branch master is assumed (local and remote)

Typical use: a package distributes its files in a distribution directory; the directory is part of the repo.   

### Overview
In your project's Gruntfile, add a section named `releaseit` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  releaseit: {
    options: {
      // Task-specific options go here.
    },
    your_target: {
      // Target-specific file lists and/or options go here.
    },
  },
});
```

### Options

#### type
Type: `String`
Default value: `patch`

The release type according the semver options. Allows:
patch|minor|major|premajor|preminor|prepatch|prerelease

#### silent
Type: `Boolean`
Default value: `false`

With the default value (false), all writable/critical operations will be preceded by a quastion confirmation to the user

#### tasks
Type: `Object`
Default value: `{build: ['build']}`

An object to reference the grunt tasks responsable to build the package.
tasks.build : `String|[String]`

If an array with tasks is passed, they will be executed in sequence; any error in one of them will stop the process. 

#### commit
Type: `String`
Default value: `Release version v%v`

The commit message to use when commiting changes. `%v` will be replaced with the version number to be released.

#### tag
Type: `String`
Default value: `Version %v`

The tag message to use when creating the release tag. `%v` will be replaced with the version number to be released.



### Usage Examples

#### Default Options
In this example, a minor version is released with "no confirmations steps" and executing the clean, test and build tasks. 

```js
grunt.initConfig({
  releaseit: {
    minor: {
      options: {
        type: 'minor',
        silent: true,
        tasks: {
          build: ['clean', 'test', 'build']
        }
      }
    }    
  }
});
```

If in package.json | bower.json version is '0.0.0'. 
The result will be:
- in those files version will be '0.1.0'
- the tasks 'clean', 'test', 'build' will run
- the changes produced will be added to git
- the changes will be comitted with a commit message 'Release version v0.1.0'
- there will be a tag v0.1.0 with message 'Version 0.1.0'
- the brach 'master' will be pushed to the master branch in remote name choosen
  - if only one remote exists it will be used without question the user

So supose that build task produce a `dist` folder with release files this folder will be included to the git repo.

### Contribution

Post bugs and feature requests to the [Github issue tracker](https://github.com/borntorun/grunt-release-it/issues). In lieu of a formal styleguide, take care to maintain the existing coding style. Lint and test your code using [Grunt](https://github.com/gruntjs/grunt).
* Contributions and comments are welcome.

### Authors

* **João Carvalho** 
  * [@jmmtcarvalho](https://twitter.com/jmmtcarvalho) 
  * [GitHub](https://github.com/borntorun)

### License

Copyright (c) 2015 João Carvalho

Licensed under the MIT License
