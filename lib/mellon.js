module.exports = runQueryOnDocset;

DASH = 1;
ZDASH = 2;

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
  //).arg(curQuery, notQuery, subNames.arg("ztokenname", curQuery));
  return qs;
};

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
    /* FIXME XXX We should move this into a method, something like "discover docset type"! */
    if (!docset.type) {
      docset.db.all("select name from sqlite_master where type='table'", function(err, rows) {
        var isdash = (1 <= rows.filter(function(i) { i.name === "searchIndex" }).length);
        docset.type = isdash ? DASH : ZDASH;
        actuallyRunTheQuery();
      });
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

    var q;

    if (docset.type === DASH) {
      q = dashQuery(cur, neg, subName("t.name", cur));
    } else {
      // subNames.arg("ztokenname", curQuery)
      q = zDashQuery(cur, neg, subName("ztokenname", cur));
    }

    // TODO: process the query into something standard before passing it to
    // callback
    docset.db.each(q, cb, done);
  }

  actuallyRunTheQuery();
}
