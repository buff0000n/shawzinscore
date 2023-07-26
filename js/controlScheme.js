var ControlSchemeUI = (function() {
    // local storage key
    var key = "shawzinscore:customschemes";

    var customSchemeList = null;
    var scheme = null;

    function registerEventListeners() {
        document.getElementById("ccs-platform-button").addEventListener("click", (e) => {
            doPlatformMenu(document.getElementById("ccs-platform-button"), (platform) => {
                if (platform.id == scheme.platformId) return;
                scheme = MetadataUI.controlSchemes[platform.defaultTemplate].clone(null);
                updateScheme();
            });
        });

        document.getElementById("ccs-ok-button").addEventListener("click", (e) => {
        });

        document.getElementById("ccs-cancel-button").addEventListener("click", (e) => {
        });

        document.getElementById("ccs-delete-button").addEventListener("click", (e) => {
        });

        // load schemes from storage
        loadCustomSchemes();
    }

    class ControlBinding {
        constructor(id, name) {
            this.id = id;
            this.name = name;
        }

        get(scheme) { return null; }
        set(scheme, controlKey) { return null; }
    }

    // ugh
    var controlSchemeS1 = new ControlBinding("s1", "1st String");
    controlSchemeS1.get = (scheme) => { return scheme.strings["1"]; };
    controlSchemeS1.set = (scheme, controlKey) => { scheme.strings["1"] = controlKey; };
    var controlSchemeS2 = new ControlBinding("s2", "2nd String");
    controlSchemeS2.get = (scheme) => { return scheme.strings["2"]; };
    controlSchemeS2.set = (scheme, controlKey) => { scheme.strings["2"] = controlKey; };
    var controlSchemeS3 = new ControlBinding("s3", "3rd String");
    controlSchemeS3.get = (scheme) => { return scheme.strings["3"]; };
    controlSchemeS3.set = (scheme, controlKey) => { scheme.strings["3"] = controlKey; };
    var controlSchemeF1 = new ControlBinding("f1", "Air Fret");
    controlSchemeF1.get = (scheme) => { return scheme.frets["1"]; };
    controlSchemeF1.set = (scheme, controlKey) => { scheme.frets["1"] = controlKey; };
    var controlSchemeF2 = new ControlBinding("f2", "Earth Fret");
    controlSchemeF2.get = (scheme) => { return scheme.frets["2"]; };
    controlSchemeF2.set = (scheme, controlKey) => { scheme.frets["2"] = controlKey; };
    var controlSchemeF3 = new ControlBinding("f3", "Water Fret");
    controlSchemeF3.get = (scheme) => { return scheme.frets["3"]; };
    controlSchemeF3.set = (scheme, controlKey) => { scheme.frets["3"] = controlKey; };

    var controlList = [
        controlSchemeS1,
        controlSchemeS2,
        controlSchemeS3,
        controlSchemeF1,
        controlSchemeF2,
        controlSchemeF3,
    ];

    function doControlMenu(controlDiv, callback) {
        var selectionDiv = document.createElement("div");
        selectionDiv.className = "selection-div";

        // basically a function object that contains the state for the click event handler
        function createSelection(controlBinding) {
            // create the selection item
            var tr = document.createElement("div");
            tr.className = "selection-item";

            var control = controlBinding.get(scheme);

            // meh. build the selection contents from the control data
            // todo: icon?
            tr.innerHTML = `
                <img src="img/${control.imgBase}_w.png" srcset="img2x/${control.imgBase}_w.png 2x" class="icon" style="height: 2ex; width: auto; margin: 0.5ex;"/>
                ${controlBinding.name}
            `;

            // click event handler.  Because this is inside a function closure we can just use the local variables
            tr.onclick = () => {
                // set the binding
                callback(controlBinding);
                // cose the menu using the close callback returned at the end of the outer function
                close();
            };

            return tr;
        }

        // iterate over the control list
        for (var i = 0; i < controlList.length; i++) {
            // get the name
            var controlBinding = controlList[i];
            // build the selection item and its handler, and add to the container
            selectionDiv.appendChild(createSelection(controlBinding));
        }

        // show the menu and store the close callback
        var close = Menus.showMenu(selectionDiv, controlDiv, "Control binding");
    }

    function doPlatformMenu(button, callback) {
        var selectionDiv = document.createElement("div");
        selectionDiv.className = "selection-div";

        // basically a function object that contains the state for the click event handler
        function createSelection(platform) {
            // create the selection item
            var tr = document.createElement("div");
            tr.className = "selection-item";

            // meh. build the selection contents from the metadata
            tr.innerHTML = `
                <img src="img/${platform.image}" srcset="img2x/${platform.image} 2x" class="icon"/>
                ${platform.name}
            `;

            // click event handler.  Because this is inside a function closure we can just use the local variables
            tr.onclick = () => {
                // set the binding
                callback(platform);
                // cose the menu using the close callback returned at the end of the outer function
                close();
            };

            return tr;
        }

        // iterate over the platform list
        for (var id in MetadataUI.platforms) {
            var platform = MetadataUI.platforms[id];
            // skip PC
            if (!platform.console) continue;
            // build the selection item and its handler, and add to the container
            selectionDiv.appendChild(createSelection(platform));
        }

        // show the menu and store the close callback
        var close = Menus.showMenu(selectionDiv, button, "Select Platform");
    }

    function buildDiagram(diagramDiv, scheme) {
        var plat = MetadataUI.platforms[scheme.platformId];

        diagramDiv.innerHTML = "";
        diagramDiv.style.position = "relative";
        diagramDiv.style.width = plat.diagram.width + "px";
        diagramDiv.style.height = plat.diagram.height + "px";
        diagramDiv.style.backgroundImage = "url('img2x/" + plat.diagram.image + "')";
        diagramDiv.style.backgroundSize = plat.diagram.width + "px " + plat.diagram.height + "px";

        var controlMap = {};

        function setBinding(controlDiv, controlBinding) {
            controlDiv.controlBinding = controlBinding;
            if (controlBinding) {
                controlDiv.innerHTML = controlBinding.name;
                controlBinding.set(scheme, controlDiv.controlKey);
            } else {
                controlDiv.innerHTML = "N/A";
            }
        }

        function listener(e) {
            var controlDiv = e.target;
            var controlKey = controlDiv.controlKey;
            doControlMenu(controlDiv, (controlBinding) => {
                var oldControlBinding = controlDiv.controlBinding;
                // check for no change
                if (controlBinding == oldControlBinding) return;

                var oldControlDiv = controlMap[controlBinding.get(scheme).id];

                setBinding(oldControlDiv, oldControlBinding);
                setBinding(controlDiv, controlBinding);
            });
        }

        for (var key in plat.keys) {
            var controlKey = plat.keys[key];
            var controlDiv = document.createElement("div");
            controlDiv.className = "textButton";
            controlDiv.style.position = "absolute";
            controlDiv.style.bottom = (plat.diagram.height - controlKey.diag_y) + "px";
            if (controlKey.diag_x < (plat.diagram.width/2)) {
                controlDiv.style.right = (plat.diagram.width - controlKey.diag_x) + "px";
            } else {
                controlDiv.style.left = controlKey.diag_x + "px";
            }
            controlDiv.style.transform = "translateY(50%)";

            controlDiv.innerHTML = "N/A";
            controlDiv.controlKey = controlKey;
            controlDiv.controlBinding = null;
            diagramDiv.appendChild(controlDiv);
            controlMap[key] = controlDiv;

            controlDiv.addEventListener("click", listener);
        }

        for (var i = 0; i < controlList.length; i++) {
            var controlBinding = controlList[i];
            var controlKey = controlBinding.get(scheme)
            setBinding(controlMap[controlKey.id], controlBinding);
        }

        // return controlDiv;
    }

    function updateScheme() {
        var platform = MetadataUI.platforms[scheme.platformId];
        document.getElementById("ccs-platform-button").innerHTML = `
            <img src="img/icon-dropdown.png" srcset="img2x/icon-dropdown.png 2x" class="icon"/>
            <img src="img/${platform.image}" srcset="img2x/${platform.image} 2x" class="icon"/>
            ${platform.name}
        `;
        buildDiagram(document.getElementById("ccs-diagram"), scheme);
    }

    function doCustomControlSchemeMenu(button, menuClose, theScheme) {
        // scheme cases:
        //  - non-console
        //  - console, non-custom
        //  - console, custom
        if (!MetadataUI.platforms[theScheme.platformId].console) {
            theScheme = MetadataUI.controlSchemes[MetadataUI.platforms.xbx.defaultTemplate]
            theScheme = theScheme.clone(null);

        } else if (!theScheme.custom) {
            theScheme = theScheme.clone(null);
        }

        scheme = theScheme;

//        var container = document.createElement("div");
//        container.className = "selection-div";
//        container.style.textAlign = "center";
//
//        var platformButton = document.createElement("span");
//        platformButton.className = "lightButton";
//        platformButton.style.margin = "1ex 1ex";
//        container.appendChild(platformButton);
//
//        var diagramDiv = document.createElement("div");
//        container.appendChild(diagramDiv);
//
//        var okayButton = document.createElement("span");
//        okayButton.className = "lightButton";
//        okayButton.style.margin = "1ex 1ex";
//        okayButton.innerHTML = "OK";
//        container.appendChild(okayButton);
//
//        var cancelButton = document.createElement("span");
//        cancelButton.className = "lightButton";
//        cancelButton.style.margin = "1ex 1ex";
//        cancelButton.innerHTML = "Cancel";
//        container.appendChild(cancelButton);
//
//        if (scheme.id != null && scheme.custom) {
//            var deleteButton = document.createElement("span");
//            deleteButton.className = "lightButton";
//            deleteButton.style.margin = "1ex 1ex";
//            deleteButton.innerHTML = "Delete";
//            container.appendChild(deleteButton);
//        }

        document.getElementById("ccs-delete-button").style.display = (scheme.id != null && scheme.custom) ? "" : "none";

        updateScheme();


        // pull the shawzin tab element ouf of the hidden area
        var mainDiv = document.getElementById("custom-control-scheme");
        mainDiv.remove();

        // show it as a pop-up menu with a custom close callback
        var close = Menus.showMenu(mainDiv, button, "Customize Control Scheme", false, () => {
            // put the menu contents back in the hidden area
            mainDiv.remove();
            document.getElementById("hidden-things").appendChild(mainDiv);
        });
    }

    function controlSchemeToPreference(scheme) {
//        debugger;
        var pref = {};
        pref.id = scheme.id;
        pref.platformId = scheme.platformId;
        pref.name = scheme.name;
        pref.description = scheme.description;
        pref.custom = scheme.custom;
        for (var i = 0; i < controlList.length; i++) {
            var controlBinding = controlList[i];
            pref[controlBinding.id] = controlBinding.get(scheme).id;
        }
        return pref;
    }

    function preferenceToControlScheme(pref) {
//        debugger;

        if (!pref) {
            return MetadataUI.controlSchemes.pc;
        }

        if (!pref.id) {
            return legacyPreferenceToControlScheme(pref);
        }

        var platform = MetadataUI.platforms[pref.platformId];

        var scheme = new ControlScheme(
            pref.id,
            pref.name,
            pref.description,
            platform.id,
            platform.image,
            null, null, null,
            null, null, null,
            pref.custom
        );
        for (var i = 0; i < controlList.length; i++) {
            var controlBinding = controlList[i];
            controlBinding.set(scheme, platform.keys[pref[controlBinding.id]]);
        }

        return scheme;
    }

    function legacyPreferenceToControlScheme(pref) {
        for (var id in MetadataUI.controlSchemes) {
            var scheme = MetadataUI.controlSchemes[id];
            if (pref.name == scheme.name) {
                return pref;
            }
        }
        console.log("unrecognized control scheme: " + pref.name);
        return MetadataUI.controlSchemes.pc;
    }

    function loadCustomSchemes() {
        var json = window.localStorage.getItem(key);
        if (json) {
            // parse json
            customSchemeList = JSON.parse(json);
        } else {
            customSchemeList = [];
        }
    }

    function persistCustomScheme(scheme) {
        window.localStorage.setItem(key, JSON.stringify(customSchemeList));
    }

    function clearCustomSchemes() {
        window.localStorage.removeItem(key);
        customSchemeList = [];
    }

    function lookupCustomSchemeIndex(id) {
        for (var i = 0; i < customSchemeList.length; i++) {
            if (customSchemeList[i].id == id) { return i; }
        }
        return -1;
    }

    function saveCustomScheme(scheme) {
        if (scheme.id != null) {
            var index = lookupCustomSchemeIndex(scheme.id);
            if (index >= 0) {
                customSchemeList[index] = scheme;
            } else {
                // todo: warning?
                customSchemeList.push(scheme);
            }
        } else {
            var max = 0;
            for (var i = 0; i < customSchemeList.length; i++) {
                var n = Number.parseInt(customSchemeList[i].id.substring(1));
                if (n > max) max = n;
            }

            var id = "c" + (max + 1);
            scheme.id = id;
            customSchemeList.push(scheme);

        }
        return scheme;
    }
    function deleteCustomScheme(scheme) {
        var index = lookupCustomSchemeIndex(scheme.id);
        if (index >= 0) {
            list.splice(index, 1);
        }
    }

    function getCustomSchemes() {
        return customSchemeList;
    }

    return  {
        registerEventListeners: registerEventListeners, // ()
        getCustomSchemes: getCustomSchemes, // ()
        saveCustomScheme: saveCustomScheme, // (scheme)
        deleteCustomScheme: deleteCustomScheme, // (scheme)
        doCustomControlSchemeMenu: doCustomControlSchemeMenu, // (button, scheme)
        controlSchemeToPreference: controlSchemeToPreference, // (scheme)
        preferenceToControlScheme: preferenceToControlScheme, // (pref)
    };
})();
