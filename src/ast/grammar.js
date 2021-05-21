'use strict';

var util = require('../util');

var Grammar = function(name, rules, children) {
  this._name  = name;
  this._rules = rules;
  this._child_grammars = children;
};

util.assign(Grammar.prototype, {
  toSexp: function() {
    var rules = this._rules.map(function(r) { return r.toSexp() });
    var us = ['grammar', this._name].concat(rules);
    if (this._child_grammars && this._child_grammars.length > 0)
      return [us, ...this._child_grammars.map(x => x.toSexp())];
    else
      return us;
  },

  forEach: function(callback, context) {
    this._rules.forEach(callback, context);
    // "normal" foreach doesn't iterate over children grammars
  },

  compile: function(builder) {
    var scan = function(node, callback, context, nochildren) {
      callback.call(context, node);
      if (node.forEach)
        node.forEach(function(child) { scan(child, callback, context) });
      // scan should include our child grammars
      if (node._child_grammars && !nochildren)
        node._child_grammars.forEach(function(child) { scan(child, callback, context) });
    };

    builder.package_(this._name, function(builder) {
      var actions = [];
      scan(this, function(node) {
        if (node._actionName) {
          actions.push(node._actionName);
        }
      });
      // Prefix all methods
      var gcmap = new Map();
      if (this._child_grammars && this._child_grammars.length > 0)
      {
        this._child_grammars.forEach(function(child) {
          gcmap.set(child._name, child); // maybe allow refs?
          scan(child, function(ref){
            if (ref.updateName)
              ref.updateName((old) => {
                if (gcmap.has(old))
                  return gcmap.get(old)._name + "_"+ gcmap.get(old)._rules[0].name;
                else
                  return child._name + "_" + old;
              });
          })
        });
        scan(this, function(ref){
          if (ref.updateName)
            ref.updateName((old) => {
              if (gcmap.has(old))
                return gcmap.get(old)._rules[0].name; // name already prefixed
              else
                return old;
            });
        }, null, true);
      }

      var nodeClassName = builder.syntaxNodeClass_(), subclassIndex = 1;
      scan(this, function(node) {
        var subclassName = nodeClassName + subclassIndex,
            labels = node.collectLabels && node.collectLabels(subclassName);

        if (!labels) return;

        builder.class_(subclassName, nodeClassName, function(builder) {
          var keys = [];
          for (var key in labels) keys.push(key);
          builder.attributes_(keys);
          builder.constructor_(['text', 'offset', 'elements'], function(builder) {
            for (var key in labels)
              builder.attribute_(key, builder.arrayLookup_('elements', labels[key]));
          });
        });
        subclassIndex += 1;
      });

      builder.grammarModule_(actions.sort(), function(builder) {
        var regexName = 'REGEX_', regexIndex = 1;
        scan(this, function(node) {
          if (node.regex) builder.compileRegex_(node, regexName + (regexIndex++));
        });

        this._rules.forEach(function(rule) { rule.compile(builder) });

        if (this._child_grammars && this._child_grammars.length > 0)
        {
          this._child_grammars.forEach(function(child){
            child._rules.forEach(function(rule) { rule.compile(builder) });
          });
        }
      }, this);

      var root = this._rules[0].name;

      builder.parserClass_(root);
      builder.exports_();
    }, this);
  }
});

module.exports = Grammar;
