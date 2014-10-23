exports.runQueryOnDocset = runQueryOnDocset;
exports.discoverDocsetType = discoverDocsetType;

var DASH = exports.DASH = 1;
var ZDASH = exports.ZDASH = 2;

function toQuery(s) {
  var parts = s.split(":", 1);

  if (parts.length < 2) {
    parts.unshift(null);
  }

  // TODO sanitize the prepared query

  return {
    query: s,
    prefix: parts[0],
    prepared: parts[1]
  };
}

function subName(name, value) {
  var sub = " or " + name + " like '%." + value + "%' escape '\\'";
  sub += " or " + name + " like '%::" + value + "%' escape '\\'";
  sub += " or " + name + " like '%/" + value + "%' escape '\\'";
  return sub;
}

function dashQuery(one, two, three) {
  var qs = "select t.name, t2.name, t.path from things t";
  qs += " left join things t2 on t2.id = t.parent where ";
  qs += "(t.name like '" + one + "%' escape '\\'  " + three + ")";
  qs += " " + two + " order by lower(t.name) asc, t.path asc limit 100";
  return qs;
}

function zDashQuery(one, two, three) {
  var qs = "select ztokenname, null, zpath, zanchor from ztoken ";
  qs += "join ztokenmetainformation on ztoken.zmetainformation = ztokenmetainformation.z_pk ";
  qs += "join zfilepath on ztokenmetainformation.zfile = zfilepath.z_pk where (ztokenname "; 
  qs += "like '" + one + "%' escape '\\' " + three + ") " + two + " order by ";
  qs += "lower(ztokenname) asc, zpath asc, zanchor asc limit 100";
  return qs;
}

function dashResult(r) {
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
  var qs = "select count(name) from sqlite_master " +
           "where type='table' and name='searchIndex'";
  docset.db.get(qs, function(err, count) {
    docset.type = count > 0 ? DASH : ZDASH;
    done();
  });
}

function runQueryOnDocset(docset, query, cb, done) {
  if (typeof query !== Object) {
    query = toQuery(query);
  }

  if (query.prefix && !docset.prefix.toLowerCase().indexOf(query.prefix.toLowerCase()) !== -1) {
    // Ignore this docset, as the prefixes don't match
    done();
    return;
  }

  //var found = [];
  //var with_substrings = false;

  function actuallyRunTheQuery() {
    if (!docset.type) {
      discoverDocsetType(docset, actuallyRunTheQuery);
      return;
    }

    var cur = query.prepared;
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
