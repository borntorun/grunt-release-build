### The test process

Based in the process used by [grunt-build-control/test](https://github.com/robwierzbowski/grunt-build-control/blob/master/test/readme.md)

# Tests
Tests can be executed by running
```bash
grunt test
```
or 
```bash
grunt watch:tests
```

## Layout
```
test/
    releasebuild_test.js        - contains tests to be executed
    scenarios/      - different scenarios to be tested 
        <name>/
          repo/     - repository simulating the package to release (to do tests on)
    simulation/     - [auto gen] testing area for any given scenario
      <scenario name> - [copied from scenarios/<name>]
        repo/
        remote/     - [auto gen] "remote", imagine it as a github repo
        validation/  - [auto gen] `git clone remote validate` produces this folder
        ...
```

#### Notes
All tests are executed with the relative path being: `test/simulation/<scenario name>`

# Usage Example/Workflow
Still confused?  
Imagine a `basic deployment` scenario
[test/scenarios/build-simple](/test/scenarios/build-simple)

```
Working directory: "scenarios/build-simple/"

Source code is in "/*"

grunt-release-build task is located in "gruntfile.js"

The test case can be found in "/test/releasebuild_test.js", high level test flow:
	- purge `simulation/`
	- copy `scenarios/build-simple/**` to `simulation/build-simple/`
	- change working directory to `simulation/build-simple/`
	- execute the test case named `build-simple`

The "build-simple" test case does the following:
  - create remote repo pointing to `simulation/build-simple/remote`
	- prepare repo (git operations on repo: init, add, commit, add remote)
	- runs execScenario()
		- which executes `grunt default` (which will run the releasebuild task)
		- which executes `git clone remote validation`
	- does validations/expectations to results
```

How does mocha know which scenario folder to copy? By the `describe` suite name of course!
