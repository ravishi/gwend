exports.runQueryOnDocset = runQueryOnDocset;
exports.discoverDocsetType = discoverDocsetType;

var DASH = exports.DASH = 1;
var ZDASH = exports.ZDASH = 2;

function toQuery(s) {
  var r = {query: s, prefix: null, prepared: null};
  var p = s.split(':');

  if (p.length < 2) {
    r.prepared = s;
  } else {
    r.prefix = p.shift().trim().toLowerCase();
    r.prepared = p.join(':');
  }

  return r;
}

function sanitizeQuery(query) {
  return query
    .replace('\\', '\\\\')
    .replace('_', '\\_')
    .replace('%', '\\%')
    .replace('\'', '\'\'');
}

function subName(name, value) {
  return (
    " or " + name + " like '%." + value + "%' escape '\\'"
    + " or " + name + " like '%::" + value + "%' escape '\\'"
    + " or " + name + " like '%/" + value + "%' escape '\\'"
  );
}

function dashQuery(one, two, three) {
  return (
    "select t.name, null, t.path from searchIndex t where (t.name"
    + " like '" + one + "%' escape '\\' " + three + ") " + two
    + " order by length(t.name), lower(t.name) asc, t.path asc limit 100"
  );
}

function zDashQuery(one, two, three) {
  return (
    "select ztokenname, null, zpath, zanchor from ztoken"
    + " join ztokenmetainformation on ztoken.zmetainformation"
    + " = ztokenmetainformation.z_pk join zfilepath"
    + " on ztokenmetainformation.zfile = zfilepath.z_pk where (ztokenname" 
    + " like '" + one + "%' escape '\\' " + three + ") " + two
    + " order by lower(ztokenname) asc, zpath asc, zanchor asc limit 100"
  );
}

function dashResult(r, docset) {
  return {
    name: r.name,
    path: r.path,
    anchor: null,
    docset: docset
  };
}

function zDashResult(r, docset) {
  return {
    name: r.ZTOKENNAME,
    path: r.ZPATH,
    anchor: r.ZANCHOR,
    docset: docset
  };
}

function discoverDocsetType(docset, done) {
  var qs = "select count(name) as count from sqlite_master " +
           "where type='table' and name='searchIndex'";
  docset.db.get(qs, function(err, r) {
    docset.type = r.count > 0 ? DASH : ZDASH;
    done();
  });
}

function runQueryOnDocset(docset, query, cb, done) {
  if (typeof query !== Object) {
    query = toQuery(query);
  }

  if (query.prefix && docset.info.prefix && query.prefix !== docset.info.prefix) {
    // Ignore this docset, as the prefixes don't match
    done();
    return;
  }

  function actuallyRunTheQuery() {
    if (!docset.type) {
      discoverDocsetType(docset, actuallyRunTheQuery);
      return;
    }

    var cur = sanitizeQuery(query.prepared);
    var neg = "";

    //function next(q) {
    /*
    if (with_substrings) {
      prep = "%" + cur;
      neg = " and not (t.name like '%1%' escape '\\' %2) ").arg(prep, sub.arg("t.name", prep));
    }
    */

    var q, qc;

    if (docset.type === DASH) {
      q = dashQuery(cur, neg, subName("t.name", cur));
      qc = dashResult;
    } else {
      q = zDashQuery(cur, neg, subName("ztokenname", cur));
      qc = zDashResult;
    }

    // TODO: process the query into something standard before
    // passing it to callback
    docset.db.each(q, function(err, r) {
      if (r) {
        r = qc(r, docset);
      }
      cb(err, r);
    }, done);
  }

  actuallyRunTheQuery();
}
