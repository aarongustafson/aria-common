function linkCrossReferences() {

  var specBaseURL = ( respecConfig.ariaSpecURLs ?
    respecConfig.ariaSpecURLs[respecConfig.specStatus] : null
  );

  var coreMappingURL = (respecConfig.coreMappingURLs ?
    respecConfig.coreMappingURLs[respecConfig.specStatus] : null
  );

  var accNameURL = (respecConfig.accNameURLs ?
    respecConfig.accNameURLs[respecConfig.specStatus] : null
  );

  var htmlMappingURL = (respecConfig.htmlMappingURLs ?
    respecConfig.htmlMappingURLs[respecConfig.specStatus] : null
  );

  function setHrefs (selString, baseUrl) {
    $ (selString).each (
      function (idx, el) {
        var href = $ (el).attr ('href');
        $ (el).attr ('href', baseUrl + href);
    });
  }

  // First the links to the definitions of roles, states, and properties.
  if (!!specBaseURL) {
    setHrefs ('a.role-reference, a.property-reference, a.state-reference, a.specref', specBaseURL);
  }
  else {
    console.log ("linkCrossReferences():  specBaseURL is not defined.");
  }

  // Second, for links to role, state, and property mappings in the core mapping
  // doc.
  if (!!coreMappingURL) {
    setHrefs ('a.core-mapping', coreMappingURL);
  }
  else {
    console.log ("linkCrossReferences():  Note -- coreMappingURL is not defined.");
  }

  // Third, for links into the accname document.
  if (!!accNameURL) {
    setHrefs ('a.accname', accNameURL);
  }
  else {
    console.log ("linkCrossReferences():  Note -- accNameURL is not defined.");
  }
  // Fourth, for links to role, state, and property mappings in the html mapping
  // doc.
  if (!!htmlMappingURL) {
    setHrefs ('a.html-mapping', htmlMappingURL);
  }
  else {
    console.log ("linkCrossReferences():  Note -- htmleMappingURL is not defined.");
  }

}

function updateReferences(base) {
    // update references to properties
    //
    // New logic:
    //     1. for each item, find it's nearest 'section' ancestor (or nearest div
    //     with a class of role, property, or state)
    //     2. if we have not already seen this item in this section, it is a link using 'a'
    //     3. otherwise, it is just a styled reference to the item  using 'code'

    var baseURL = respecConfig.ariaSpecURLs[respecConfig.specStatus];

    var sectionMap = {} ;

    $.each(base.querySelectorAll("pref, sref, rref"), function(i, item) {
        var $item = $(item) ;

        // what are we referencing?
        var content = $item.text();
        var usedTitle = false;
        var ref = $item.attr("title");
        if (!ref) {
            ref = $item.attr("data-lt");
            if (!ref) {
                ref = content;
            } else {
                usedTitle = true;
            }
        } else {
            usedTitle = true;
        }

        // what sort of reference are we?
        var theClass = ($item.is("pref") ? "property-reference" : ($item.is("sref") ? "state-reference" : "role-reference"));

        // property and state references are assumed to be in the parent document
        // a role reference might be local or might be elsewhere
        var URL = $item.is("pref, sref") ? baseURL+"#" : "#";

        // assume we are making a link
        var theElement = "a";

        // pSec is the nearest parent section element
        var $pSec = $item.parents("section,div.role,div.state,div.property").first();
        var pID = $pSec.attr("id");
        if (pID) {
            if (sectionMap[pID]) {
                if (sectionMap[pID][ref]) {
                    // only change the element if we are in a paragraph.
                    if ($item.parents("p").length != 0) {
                        if (usedTitle) {
                            theElement = "span";
                        } else {
                            theElement = "code";
                        }
                    }
                } else {
                    sectionMap[pID][ref] = 1;
                }
            } else {
                sectionMap[pID] = {} ;
                sectionMap[pID][ref] = 1;
            }
        }

        if (theElement == "a" && $item.is('rref') ) {
            if (typeof localRoleInfo !== 'undefined' && localRoleInfo[ref]) {
                ref = localRoleInfo[ref].fragID;
            } else if (baseURL && roleInfo[ref]) {
                ref = roleInfo[ref].fragID;
                URL = baseURL + "#";
            } else {
                // no roleInfo structure.  Make an assumption
                URL = baseURL + "#";
            }
        }
        var sp = document.createElement(theElement);
        sp.href = URL + ref;
        sp.className = theClass;
        sp.innerHTML=content;
        $item.replaceWith(sp);
    });
}

// We should be able to remove terms that are not actually
// referenced from the common definitions
var termNames = [] ;

function restrictReferences(utils, content) {
    var base = document.createElement("div");
    base.innerHTML = content;
    updateReferences(base);

    // strategy: Traverse the content finding all of the terms defined
    $.each(base.querySelectorAll("dfn"), function(i, item) {
        var $t = $(item) ;
        var titles = $t.getDfnTitles();
        var n = $t.makeID("dfn", titles[0]);
        if (n) {
            termNames[n] = $t.parent() ;
        }
    });

    // add a handler to come in after all the definitions are resolved

    respecEvents.sub('end', function(message) {
        if (message == 'core/link-to-dfn') {
            // all definitions are linked
            $("a.internalDFN").each(function () {
                var $item = $(this) ;
                var r = $item.attr('href').replace(/^#/,"") ;
                if (termNames[r]) {
                    delete termNames[r] ;
                }
            });
    // delete any terms that were not referenced.
            Object.keys(termNames).forEach(function(term) {
                var $p = $("#"+term) ;
                if ($p) {
                    var tList = $p.getDfnTitles();
                    $p.parent().next().remove();
                    $p.remove() ;
                    tList.forEach(function( item ) {
                        if (respecConfig.definitionMap[item]) {
                            delete respecConfig.definitionMap[item];
                        }
                    });
                }
            });
        }
    });
    
    respecEvents.sub ('end-all', function () {
        $('body').attr('aria-busy', 'false');  // or, remove it entirely?
    });
    
    return (base.innerHTML);
}

// included files are brought in after proProc.  Create a DOM tree
// of content then call the updateReferences method above on it.  Return
// the transformed content
function fixIncludes(utils, content) {
    var base = document.createElement("div");
    base.innerHTML = content;
    updateReferences(base);
    return (base.innerHTML);
}

