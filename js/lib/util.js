//==============================================================
// Utility DOM functions
// probably doing some of these the hard way but nothing else
// was reliable enough
// Most UI elements are identified by class instead of ID
// because they're added dynamically and there can be more than
// one of them in the DOM
//==============================================================

var DomUtils = (function() {
    function getParent(node, parentClass) {
        // walk up the DOM until we find a parent with the given class name or run out of parents
        while (node != null && (!node.className || !node.className.includes(parentClass))) {
            node = node.parentNode;
        }
        return node;
    }

    function getFirstChild(node, childClass, maxDepth = 0) {
        // perform a depth first search from the first child to the last,
        // until we find an element with the given class name
        var children = node.children;
        for (var i = 0; i < children.length; i++) {
            var child = node.children[i];
            if (child.classList.contains(childClass)) {
                return child;
            }
            // recursive call
            if (maxDepth == 0 || maxDepth > 2) {
                var child2 = getFirstChild(child, childClass, maxDepth == 0 ? 0 : maxDepth - 1);
                if (child2 !== null) {
                    return child2;
                }
            }
        }
        return null;
    }

    function getLastChild(node, childClass, maxDepth = 0) {
        // perform a depth first search going from the last child to the first,
        // until we find an element with the given class name
        var children = node.children;
        // go over the children in reverse order
        for (var i = children.length - 1; i >= 0; i--) {
            var child = node.children[i];
            if (child.classList.contains(childClass)) {
                return child;
            }
            // recursive call
            if (maxDepth == 0 || maxDepth > 2) {
                var child2 = getLastChild(child, childClass, maxDepth == 0 ? 0 : maxDepth - 1);
                if (child2 !== null) {
                    return child2;
                }
            }
        }
        return null;
    }

    function getAllChildren(node, childClass) {
        // find all the children with the given class name
        return getAllChildren0(node, childClass, Array());
    }

    function getAllChildren0(node, childClass, list) {
        var children = node.children;
        for (var i = 0; i < children.length; i++) {
            var child = node.children[i];
            if (child.classList.contains(childClass)) {
                list.push(child);
            }
            getAllChildren0(child, childClass, list);
        }
        return list;
    }

    function addClass(node, clazz) {
        node.classList.add(clazz);
    }

    function removeClass(node, clazz) {
        node.classList.remove(clazz);
    }

    function deleteNode(node) {
        // delete an element from its parent
        node.parentNode.removeChild(node);
    }

    // returns the index of the item was removed, or -1 if nothing was removed
    function removeFromList(list, item) {
        var index = list.indexOf(item);
        if (index >= 0) {
            list.splice(index, 1);
            return index;

        } else {
            return -1;
        }
    }

    // returns true if the list was changed
    function addToListIfNotPresent(list, item) {
        var index = list.indexOf(item);
        if (index == -1) {
            list.push(item);
            return true;

        } else {
            return false;
        }
    }

    function insertAfter(el, referenceNode) {
        referenceNode.parentNode.insertBefore(el, referenceNode.nextSibling);
    }

    function insertBefore(el, referenceNode) {
        referenceNode.parentNode.insertBefore(el, referenceNode);
    }

    // public members
    return  {
        getParent: getParent, // (node, parentClass)
        getFirstChild: getFirstChild, // (node, childClass, maxDepth = 0)
        getLastChild: getLastChild, // (node, childClass, maxDepth = 0)
        getAllChildren: getAllChildren, // (node, childClass)
        deleteNode: deleteNode, // (node)
        addClass: addClass, // (node, clazz)
        removeClass: removeClass, // (node, clazz)
        // returns the index of the item was removed, or -1 if nothing was removed
        removeFromList: removeFromList, // (list, item)
        // returns true if the list was changed
        addToListIfNotPresent: addToListIfNotPresent, // (list, item)
        insertAfter: insertAfter, // (el, referenceNode)
        insertBefore: insertBefore, // (el, referenceNode)
    };
})();

//==============================================================
// object merging
//==============================================================


var ObjectUtils = (function() {
    function listEquals(a, b) {
        return a == null ? b == null :
            b == null ? false :
            a.length == b.length && a.every((val, index) => val == b[index]);
    }
    
    function isObject(obj) {
        // stackoverflow.com magic
        return obj === Object(obj);
    }
    
    function isArray(obj) {
        return Array.isArray(obj);
    }
    
    function merge(o1, o2) {
    // meh, skip merging arrays and just overwrite
//        // see if there are two arrays to merge
//        if (isArray(o1) && isArray(o2)) {
//            // build a new array
//            var o3 = new Array();
//            // iterate over the first array
//            for (var i = 0; i < o1.length; i++) {
//                // if there's no corresponding entry in the second array, just copy from the first
//                if (i >= o2.length) {
//                    o3.push(o1[i]);
//
//                // otherwise, merge corresponding entries
//                } else {
//                    o3.push(merge(o1[i], o2[i]));
//                }
//            }
//            // iterate over the second array if it's longer than the first and copy it in
//            for (var i = o1.length; i < o2.length; i++) {
//                o3.push(o2[i]);
//            }
//            return o3;
//
//        } else
        // see if there are two objects to merge
        if (isObject(o1) && isObject(o2) && !isArray(o1) && !isArray(o2)) {
            // build a new object
            var o3 = new Object();
    
            // iterate over the list of attributes from object 1
            var o1Keys = Object.keys(o1);
            for (var i = 0; i < o1Keys.length; i++) {
                var key = o1Keys[i];
                // merge the same attribute from the two objects and put it in the new object
                o3[key] = merge(o1[key], o2[key]);
            }
    
            // iterate over the list of attributes from object 1
            var o2Keys = Object.keys(o2);
            for (var i = 0; i < o2Keys.length; i++) {
                var key = o2Keys[i];
                // if this attribute is only in object 2, just copy it to the new object
                if (o1[key] == null) {
                    o3[key] = o2[key];
                }
            }
            return o3;
    
        // otherwise, prefer the second one
        } else if (o2 != null) {
            return o2;
    
        // no second one, left with the first one
        } else {
            return o1;
        }
    }

    // public members
    return  {
        merge: merge,
        listEquals: listEquals,
    };
})();

var PageUtils = (function() {
    //==============================================================
    // error display
    //==============================================================
    
    function showErrors(errors) {
        // find the error bar
        var errorBarElement = document.getElementById("error-bar");
        // build and error div with a line for each error in the list
        var html = `<div id="error">`;
        for (var error in errors) {
            html += `<div class="errorLine">${errors[error]}</div>`;
        }
        html += `</div>`;
        // show
        errorBarElement.innerHTML = html;
    }
    
    function clearErrors() {
        // find the error bar and clear it out
        var errorBarElement = document.getElementById("error-bar");
        errorBarElement.innerHTML = "";
    }
    
    function windowOnError(msg, url, lineNo, columnNo, error) {
        var array = [];
        array.push(msg.replace("Uncaught ", ""));
//        if (error && error.stack) {
//            array.push(error.stack);
//        } else if (url && lineNo) {
//            array.push(url + ":" + lineNo);
//        }
        showErrors(array);
        return false;
    }
    
    var debugCount = 0;
    
    function showDebug(msg) {
        // find the error bar
        var debugBarElement = document.getElementById("debug-bar");
        if (debugBarElement.children.length == 0) {
            debugBarElement.innerHTML = `<div id="debug"></div>`;
        }
        var debugElement = document.getElementById("debug");
    
        var line = document.createElement("div");
        line.className = "debugLine";
        debugCount += 1;
        // why the hell is replaceAll() not working
        // line.innerHTML = debugCount + ": " + msg.replaceAll("\n", "<br/>");
        line.innerHTML = debugCount + ": " + msg;
    
        debugElement.appendChild(line);
        var kids = debugElement.children
        while (kids.length > 5) {
            kids.item(0).remove();
        }
    }

    //==============================================================
    // URL stuff
    //==============================================================

	function urlEncodeString(string, plusIsSpace=true) {
	    // check for null
        if (!string) {
            return string;
        }
	    // urlencode some things
	    string = encodeURIComponent(string);

	    if (plusIsSpace) {
            // replace whitespace with '+'
            string = string.replace(/\s/g, "+");
        }
        return string;
	}

	function urlDecodeString(string, plusIsSpace=true) {
	    // check for null
        if (!string) {
            return string;
        }
	    if (plusIsSpace) {
            // un-replace '+' with a space
            string = string.replace(/\+/g, " ");
        }

	    // urldecode some things
	    string = decodeURIComponent(string);

	    // no funny business
	    string = string.replace(/[<>\"]/g, "");
	    return string;
	}

    function buildQueryUrlWithMap(map, plusIsSpace=true) {
        var query = buildQueryWithMap(map, plusIsSpace);
        return buildQueryUrl(query);
    }

    function buildQueryWithMap(map, plusIsSpace=true) {
        // yowza
        var terms = [];
        for (var key in map) {
            var value = map[key];
            if (value) {
                terms.push(`${key}=${urlEncodeString(value, plusIsSpace)}`);
            }
        }
        var query = "?" + terms.join("&");
        return query;
    }

    function extractUrlAnchor(url) {
        var m = url.match(/#.*/);
        var anchor = m ? m[0] : null;
        if (anchor) {
            url = url.substring(0, url.length - anchor.length);
        }
        return [url, anchor];
    }

    function removeUrlAnchor() {
        var [url, anchor] = extractUrlAnchor(getHref());
        if (anchor) {
            updateHref(url);
        }
    }

    function extractUrlQuery(url) {
        var m = url.match(/\?.*/);
        var query = m ? m[0] : null;
        if (query) {
            url = url.substring(0, url.length - query.length);
        }
        return [url, query];
    }

    function buildQueryUrl(query) {
        // get the current URL and strip out any query string
        var [url, query0] = extractUrlQuery(getHref());
        // append our parameters
        url += query;
        // omit any existing query or anchor
        return url;
    }

    function getQueryParam(name, plusIsSpace=true) {
        // from https://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
        // weird that there's no built in function for this
        var url = getHref();
        name = name.replace(/[\[\]]/g, '\\$&');
        var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
        var results = regex.exec(url);
        if (!results) {
            return null;
        }
        if (!results[2]) {
            return '';
        }

        var res = results[2];

        if (plusIsSpace) {
            res = res.replace(/\+/g, ' ')
        }

        return decodeURIComponent(res);
    }

    function setQueryParam(name, value, plusIsSpace=true) {
        if (value) {
            modifyUrlQueryParam(name, urlEncodeString(value, plusIsSpace));
        } else {
            removeUrlQueryParam(name);
        }
    }

    var hrefUpdateDelay = 1000;
    var hrefUpdateTimeout = null;
    var hrefToUpdate = null;

    // modify a URL parameter directly in the browser location bar
    function modifyUrlQueryParam(key, value) {
        var [href, anchor] = extractUrlAnchor(getHref());

        if (href.match(new RegExp("[?&]" + key + "="))) {
            href = href.replace(new RegExp("([?&]" + key + "=)[^&#]*"), "$1" + value);

        } else {
            if (href.indexOf("?") > 0) {
                href += "&" + key + "=" + value;
            } else {
                href += "?" + key + "=" + value;
            }
        }
        updateHref(href + (anchor ? anchor : ""));
    }

    function removeUrlQueryParam(key) {
        var [href, anchor] = extractUrlAnchor(getHref());

        // corner cases the stupid way
        href = href.replace(new RegExp("([?&])" + key + "=[^&#]*&"), "$1");
        href = href.replace(new RegExp("[&?]" + key + "=[^&#]*"), "");

        updateHref(href + (anchor ? anchor : ""));
    }

    function setQueryParamMap(map, plusIsSpace=true) {
        // todo: optimize
        for (key in map) {
            removeUrlQueryParam(key);
        }
        for (key in map) {
            var value = map[key];
            setQueryParam(key, value, plusIsSpace);
        }
    }

    function getHref() {
        return hrefToUpdate ? hrefToUpdate : window.location.href;
    }

    function updateHref(href) {
        if (hrefUpdateTimeout) {
            clearTimeout(hrefUpdateTimeout);
        }

        hrefToUpdate = href;
        hrefUpdateTimeout = setTimeout(actuallyModifyUrl, hrefUpdateDelay);
    }

    function actuallyModifyUrl() {
        // shenanigans
        history.replaceState( {} , document.title, hrefToUpdate );
        hrefUpdateTimeout = null;
        hrefToUpdate = null;
    }

    //==============================================================
    // clipboard
    //==============================================================

    function pasteFromClipboard(textbox, callback) {
        // reading the clipboard involves a weird callback
        navigator.clipboard.readText().then((text) => {
            try {
                // put in the value from the clipboard directly
                textbox.value = text;
                callback(text);
            } catch (e) {
                // bad things happen if we let any errors bubble out
                PageUtils.showError(e);
            }
        });
    }

    function copyToClipboard(value) {
        // wat
        navigator.clipboard.writeText(value).then(
          () => { /* popup? */ },
          () => {}
        );
    }

    //==============================================================
    // Misc
    //==============================================================

    function setImgSrc(img, png) {
        img.src = "img/" + png;
        img.srcset = "img2x/" + png + " 2x";
        return img;
    }

    function makeImage(png, className="centerImg") {
        var img = document.createElement("img");
        setImgSrc(img, png);
        img.className = className;
        return img;
    }

    // public members
    return  {
        showError: function(error) {
            showErrors([error]);
        },
        showErrors: showErrors, // (errors)
        clearErrors: clearErrors, // ()
        windowOnError: windowOnError, // (msg, url, lineNo, columnNo, error)
        showDebug: showDebug, // (msg)

        urlEncodeString: urlEncodeString, // (string, plusIsSpace=true)
        urlDecodeString: urlDecodeString, // (string, plusIsSpace=true)
        getQueryParam: getQueryParam, // (name, plusIsSpace=true)
        setQueryParam: setQueryParam, // (name, value, plusIsSpace=true)
        removeUrlQueryParam: removeUrlQueryParam, // (name, value, plusIsSpace=true)
        setQueryParamMap: setQueryParamMap, // (map, plusIsSpace=true)
        buildQueryWithMap: buildQueryWithMap, // (map, plusIsSpace=true)
        buildQueryUrlWithMap: buildQueryUrlWithMap, // (map, plusIsSpace=true)
        removeUrlAnchor: removeUrlAnchor, // ()

        pasteFromClipboard: pasteFromClipboard, // (textbox, callback)
        copyToClipboard: copyToClipboard, // (value)

        setImgSrc: setImgSrc, // (img, png)
        makeImage: makeImage, // (png, className="centerImg")
    }
})();



var ExportUtils = (function() {
    //==============================================================
    // PNG
    //==============================================================

    function convertToPngLink(canvas, name) {
        // builds a huuuuge URL with the base-64 encoded PNG data embedded inside it
        var src = canvas.toDataURL();
        // generate a file name
        var fileName = name + ".png";

        var a = document.createElement("a");
        a.download = fileName;
        a.href = src;
        a.innerHTML = fileName;
        a.onclick = doPngClick;
        return a;
    }

    function doPngClick(e) {
        var e = e || window.event;
        if (e.altKey) {
            // super-secret debug mode: alt-click on an image link to just show it instead of downloading it
            e.preventDefault();

            var link = e.currentTarget;
            var src = link.href;

            var img = document.createElement("img");
            img.src = link.href;
            img.srcset = link.href + " 2x";

            var parent = link.parentNode;
            parent.innerHTML = "";
            parent.appendChild(img);
        }
    }

    //==============================================================
    // WAV
    //==============================================================

    function convertToWavLink(buffer, name) {
        // build a wav file link
        var src = makeWavDownloadLink(buffer);

        var hrefElement = document.createElement("a");

        // generate a file name
        var fileName = name + ".wav";

        var a = document.createElement("a");
        a.download = fileName;
        a.href = src;
        a.innerHTML = fileName;
        a.onclick = doWavClick;
        return a;
    }

    function doWavClick(e) {
        var e = e || window.event;
        if (e.altKey) {
            // super-secret debug mode: alt-click on a wav link to create a player instead of downloading it
            e.preventDefault();

            var link = e.currentTarget;

            if (link.altClicked) {
                return;
            }
            link.altClicked = true;

            var src = link.href;

            var audio = document.createElement("audio");
            audio.controls = true;
            audio.autoplay = true;

            var source = document.createElement("source");
            source.src = link.href;
            source.type = "audio/wav";
            audio.appendChild(source);

            var parent = link.parentNode;
            parent.appendChild(document.createElement("br"));
            parent.appendChild(document.createElement("br"));
            parent.appendChild(audio);
        }
    }


    // public members
    return  {
        convertToPngLink: convertToPngLink, // (canvas, name)
        convertToWavLink: convertToWavLink, // (buffer, name)
    }
})();

var MiscUtils = (function(){
    function parseInt(s) {
        var i = Number.parseInt(s);
        if (Number.isNaN(i)) {
            throw "Invalid number: \"" + s + "\"";
        }
        return i;
    }

	function parseFloat(s) {
	    // read a decimal from a string
	    var i = Number.parseFloat(s);
	    if (Number.isNaN(i)) {
            throw "Invalid number: \"" + s + "\"";
	    }
	    return i;
	}

	function sanitizeString(s, maxLength = 25) {
        // yeah, just blow away anything that looks like HTML
        if (s == null) return null;

         s = s.replaceAll("<", "&lt;");
         if (s.length > 25) {
            s = s.substring(0, 25) + "...";
         }
         return s;
	}

    // ganked from https://stackoverflow.com/questions/4652468/is-there-a-javascript-function-that-reduces-a-fraction
    function reduceFraction(numerator,denominator){
        var gcd = function gcd(a,b){
            return b ? gcd(b, a%b) : a;
        };
        gcd = gcd(numerator,denominator);

        return [numerator/gcd, denominator/gcd];
    }

	return {
	    parseInt: parseInt, // (s)
	    parseFloat: parseFloat, // (s)
	    sanitizeString: sanitizeString,// (s, maxLength = 25)
	    reduceFraction: reduceFraction, // (numerator, denominator): [num, den]
	}
})();



//==============================================================
// Progress bar
//==============================================================

//class ProgressBar {
//    constructor() {
//        this.lastAmount = -1;
//        // build the UI
//        this.buildUI();
//    }
//
//    buildUI() {
//        // overall container
//        this.loadingBox = document.createElement("div");
//        this.loadingBox.className = "loadingBox";
//        // we need something in it to give it height
//        this.loadingBox.innerHTML = "&nbsp;";
//
//        this.progressBar = document.createElement("div");
//        this.progressBar.className = "loadingProgressPos";
//        // we need something in it to give it height
//        this.progressBar.innerHTML = "&nbsp;";
//        this.loadingBox.appendChild(this.progressBar);
//
//        // label
//        this.labelBar = document.createElement("div");
//        this.labelBar.className = "loadingLabel";
//        this.loadingBox.appendChild(this.labelBar);
//
//        // start hidden
//        this.hide();
//    }
//
//    hide() {
//        this.loadingBox.style.display = "none";
//    }
//
//    show() {
//        this.loadingBox.style.display = "inline-block";
//    }
//
//    setProgress(amount) {
//        // short circuit if there's no change
//        if (amount == this.lastAmount) {
//            return;
//        }
//        // set the progress bar width
//        this.progressBar.style.width = (amount * 100) + "%";
//
//        if (amount == 1) {
//            // automatically hide at 100%
//            this.hide();
//
//        } else {
//            // otherwise, make sure it's showing
//            this.show();
//        }
//        // save amount
//        this.lastAmount = amount;
//    }
//
//    setLabel(text) {
//        this.labelBar.innerHTML = text;
//    }
//}
//
//class ProgressBar2 {
//    constructor() {
//        this.lastAmount = -1;
//        // build the UI
//        this.buildUI();
//    }
//
//    buildUI() {
//        // overall container
//        this.loadingBox = document.createElement("div");
//        this.loadingBox.width = "100%";
//
//        // label
//        this.labelBar = document.createElement("div");
//        this.labelBar.width = "100%";
//        this.labelBar.textAlign = "center";
//        this.loadingBox.appendChild(this.labelBar);
//
//        // bar
//        this.progressBar = document.createElement("div");
//        this.progressBar.width = "0%";
//        this.progressBar.className = "progressBar2";
//        // we need something in it to give it height
//        this.progressBar.innerHTML = "&nbsp;";
//        this.loadingBox.appendChild(this.progressBar);
//    }
//
//    setProgress(amount) {
//        // short circuit if there's no change
//        if (amount == this.lastAmount) {
//            return;
//        }
//        // set the progress bar width
//        this.progressBar.style.width = (amount * 100) + "%";
//
//        // save amount
//        this.lastAmount = amount;
//    }
//
//    setLabel(text) {
//        if (this.label != text) {
//            this.labelBar.innerHTML = text;
//            this.label = text;
//        }
//    }
//}


//==============================================================
// high precision timing, or as high a precision as the browser allows
// yoinked from: https://stackoverflow.com/questions/4874408/better-way-of-getting-time-in-milliseconds-in-javascript
//==============================================================

//window.performance = window.performance || {};
//performance.now = (function() {
//    return performance.now       ||
//        performance.mozNow    ||
//        performance.msNow     ||
//        performance.oNow      ||
//        performance.webkitNow ||
//        Date.now  /*none found - fallback to browser default */
//})();
//
//function getTime() {
//    return window.performance.now();
//}
