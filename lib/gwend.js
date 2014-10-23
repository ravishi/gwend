var path = require('path');
var query = require('./query');
var sqlite3 = require('sqlite3');
var readInstalled = require('./installed');

exports.DocsetRegistry = DocsetRegistry;

function DocsetRegistry() {
  this.docsets = [];
}

DocsetRegistry.prototype.scanFolder = function(folder, done) {
  var self = this;
  var added = [];
  readInstalled(folder, function(err, inst) {
    if (!err) {
      inst.forEach(function(i) {
        added.push(self.addDocset(i));
      });
    }
    if (done) {
      done(err, added);
    }
  });
}

DocsetRegistry.prototype.addDocset = function(info) {
  var dbfile = path.join(info.path, 'Contents', 'Resources', 'docSet.dsidx');
  // XXX TODO Is it OK to have lots of open connections hanging around?
  var docset = {
    db: new sqlite3.Database(dbfile, sqlite3.OPEN_READONLY),
    info: info,
    prefix: null
  };
  this.docsets.push(docset);
  return docset;
}

DocsetRegistry.prototype.queryEach = function(q, cb, done) {
  // FIXME XXX Is it really necessary to use a copy of docsets? I'm only doing
  // it because I think that if we use the original and someone adds a docset
  // while a query is running, the `exausted === this.docset` comparison
  // bellow would never return true and then this function would never finish.
  // I'm probably wrong, though.
  var docsets = this.docsets.slice();
  var exausted = [];
  docsets.forEach(function(i) {
    query.runQueryOnDocset(i, q, function(err, res) {
      // TODO damn it, man, we should make all results look the same before
      // giving them to callbacks!
      cb(err || null, res || null);
    }, function() {
      if (exausted.indexOf(i) === -1) {
        exausted.push(i);
      }
      if (exausted.length === docsets.length) {
        // TODO FIXME what if done isn't given? Can we test that?
        done();
      }
    });
  });
}

DocsetRegistry.prototype.queryAll = function(q, cb) {
  var result = [];
  this.queryEach(q, function(err, r) {
    // TODO FIXME what about the errors?
    if (!err) {
      result.push(r);
    }
  }, function() {
    cb(null, result);
  });
}
