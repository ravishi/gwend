var path = require('path');
var should = require('chai').should();
var expect = require('chai').expect;
var readInstalled = require('../lib/installed');
var mkdirp = require('mkdirp');
var fs = require('fs');
var plist = require('plist');

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
