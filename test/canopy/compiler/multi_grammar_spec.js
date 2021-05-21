var parseHelper = require('../../parse_helper'),
    jstest      = require('jstest').Test

jstest.describe("Compiler.MultiGrammar", function() { with(this) {
  include(parseHelper)

  before(function() { with(this) {
    compile('grammar global.FirstGram \
	string <- SecondGram "bar"  \
  >>>>  \
  grammar SecondGram \
	string <- "foo" \
  ')
  }})

  it('parses from root', function() { with(this) {
    assertParse( ['foobar', 0, [
		['foo', 0, []],
		['bar', 3, []]]], FirstGram.parse('foobar') )
  }})

  describe('parses three', function() { with(this) {
   
  before(function() { with(this) {
    compile('grammar global.FirstGramA \
	string <- SecondGramB "bar"  \
	>>>>  \
	grammar SecondGramB \
	  string <- "foo" \
	  >>>>  \
	  grammar SecondGramC \
		string <- "foo" \
  ')
  }})

  it('parses from root', function() { with(this) {
    assertParse( ['foobar', 0, [
		['foo', 0, []],
		['bar', 3, []]]], FirstGramA.parse('foobar') )
  }})
  }})
}})
