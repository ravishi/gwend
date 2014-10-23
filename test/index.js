var async = require('async');
var expect = require('chai').expect;
var fs = require('fs');
var mellon = require('../lib/mellon');
var mkdirp = require('mkdirp');
var path = require('path');
var plist = require('plist');
var query = require('../lib/query');
var readInstalled = require('../lib/installed');
var should = require('chai').should();
var sqlite3 = require('sqlite3');

function mkdirpSync(path) {
  try {
    mkdirp.sync(path);
  } catch (e) {
    if (e.code !== 'EEXIST') {
      throw e;
    }
  }
}

function mkdocset(folder, info) {
  var contents = path.resolve(folder, "Contents");
  var info_file = path.resolve(contents, "Info.plist");

  mkdirpSync(contents);

  info = plist.build(info || {});

  try {
    fs.writeFile(info_file, info);
  } catch (e) {
    if (e.code !== 'EEXIST') {
      throw e;
    }
  }
}

describe('readInstalled', function() {
  it('should return empty lists if nothing is installed', function(done) {
    var empty_folder = path.join(__dirname, 'temp', 'empty');

    mkdirpSync(empty_folder);

    readInstalled(empty_folder, function(err, i) {
      expect(err).to.be.null;
      expect(i).to.be.empty;
      done();
    });
  });

  it('should ignore hidden directories', function(done) {
    var with_hidden = path.join(__dirname, 'temp', 'with_hidden');

    mkdirpSync(path.join(with_hidden, '.hidden.docset'));

    readInstalled(with_hidden, function(err, i) {
      expect(err).to.be.null;
      expect(i).to.be.empty;
      done();
    });
  });

  it('should find all the docsets', function(done) {
    var filled = path.join(__dirname, 'temp', 'filled');

    mkdocset(path.join(filled, 'Python.docset'));
    mkdocset(path.join(filled, 'Go.docset'));
    mkdocset(path.join(filled, 'C.docset'));

    readInstalled(filled, function(err, i) {
      expect(err).to.be.null;
      expect(i).to.have.length(3);
      done();
    });
  });

  it('return docset information', function(done) {
    var docsets = path.join(__dirname, 'temp', 'with_info');
    var info = "ROFL:)";

    mkdocset(path.join(docsets, 'Rofl.docset'), {info: info});

    readInstalled(docsets, function(err, i) {
      expect(err).to.be.null;
      expect(i).to.have.length(1);

      var d = i[0];

      expect(d.path).to.be.equal(path.join(docsets, "Rofl.docset"));
      expect(d.name).to.be.equal("Rofl");
      expect(d.info).to.be.equal(info);

      done();
    });
  });
});

function readInstalledEx(dir, cb) {
  readInstalled(dir, function(err, i) {
    var docsets = i.map(function(i) {
      var dbfile = path.join(i.path, 'Contents', 'Resources', 'docSet.dsidx');
      return {
        db: new sqlite3.Database(dbfile, sqlite3.OPEN_READONLY),
        info: i,
        prefix: null
      };
    });

    cb(null, docsets);
  });
}

describe('mellon.query', function() {
  var docsets = [];
  var docsets_dir = path.join(__dirname, 'docsets');

  readInstalledEx(docsets_dir, function(err, i) {
    docsets = i;
  });

  describe('discoverDocsetType', function() {
    it('should identify docsets', function(done) {
      var ds = docsets[0];

      query.discoverDocsetType(ds, checkExpectationsAndCallDone);

      function checkExpectationsAndCallDone() {
        expect(ds.type).to.be.equal(query.ZDASH);
        done();
      }
    });
  });

  describe('runQueryOnDocset', function () {
    it('should actually run the queries', function(done) {
      var ds = docsets[0];
      var result = [];

      query.runQueryOnDocset(ds, "filter", function(err, r) {
        result.push(r);
      }, checkExpectationsAndCallDone);

      function checkExpectationsAndCallDone() {
        expect(result.length).to.be.equal(5);
        done();
      }
    });
  });
});

describe('mellon.DocsetRegistry', function() {
  var registry = new mellon.DocsetRegistry();
  var docsets_dir = path.join(__dirname, 'docsets');

  describe('#scanFolder', function() {
    it('should work', function(done) {
      registry.scanFolder(docsets_dir, function(err, found) {
        expect(found.length).to.be.equal(1);
        done();
      });
    });
  });

  describe('#queryEach', function() {
    it('should work', function(done) {
      // XXX Yay, we are running in the same context as previous tests!
      expect(registry.docsets.length).to.be.equal(1);

      var result = [];

      registry.queryEach('filter', function(err, r) {
        result.push(r);
      }, checkExpectationsAndCallDone);

      function checkExpectationsAndCallDone() {
        expect(result.length).to.be.equal(5);
        done();
      }
    });
  });

  describe('#queryAll', function() {
    it('should work', function(done) {
      // XXX Yay, we are running in the same context as previous tests!
      expect(registry.docsets.length).to.be.equal(1);

      registry.queryAll('filter', function(err, r) {
        expect(r.length).to.be.equal(5);
        done();
      });
    });
  });
});
