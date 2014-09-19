var fs = require('fs');
var path = require('path');
var async = require('async');
var plist = require('plist');

module.exports = readInstalled;

function readInstalled(folder, cb) {
  fs.readdir(path.resolve(folder), function(err, inst) {
    if (err) {
      inst = [];
    }

    inst = inst.filter(function(f) { return f.charAt(0) !== "." });

    inst = inst.map(function(name) { return path.resolve(folder, name) });

    async.map(inst, loadDocsetInfoIterator, function(err, results) {
      cb(err || null, results);
    });
  });
}

function loadDocsetInfoIterator(folder, cb) {
  fs.readFile(path.resolve(folder, "Contents", "Info.plist"), function (err, c) {
    if (err) {
      cb(err, null);
      return;
    }

    var info = plist.parse(c + '');

    info['path'] = folder;
    info['name'] = path.basename(folder).replace(/\.docset$/, '');

    cb(null, info);
  });
}
