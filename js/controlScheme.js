// Gathered all the control scheme UI here
var ControlSchemeUI = (function() {
    // local storage key
    var key = "shawzinscore:customschemes";

    // list of custom control schemes, persisted to preferences
    var customSchemeList = null;
    // current control scheme being edited in the custom control scheme pop-up
    var scheme = null;
    // close function for the custom control scheme pop-up
    var mainClose = null;
    // close function for the top-level control scheme menu
    var topMenuClose = null;
    // currently selected row in the top-level control scheme menu, in case we need to delete it.
    var topMenuSelectionRow = null;

    // setup event listeners and other things
    function registerEventListeners() {
        // setup event listeners for the custom pop-up
        // platform selection button
        document.getElementById("ccs-platform-button").addEventListener("click", (e) => {
            doPlatformMenu(document.getElementById("ccs-platform-button"), (platform) => {
                // sanity check
                if (platform.id == scheme.platformId) return;
                // get the template control scheme for the chosen platform
                var templateScheme = MetadataUI.controlSchemes[platform.defaultTemplate];
                // clone the template
                var newScheme = cloneScheme(templateScheme);
                // carry over the old scheme id, if we save then we will replace the old scheme rather than create a new one
                newScheme.id = scheme.id;
                // carry over the old scheme name
                newScheme.name = scheme.name;
                // replace the old scheme
                scheme = newScheme;
                // update the UI
                updateScheme();
            });
        }, { passive: false });

        // setup the name field
        Events.setupTextInput(document.getElementById("ccs-name-input"), false);
        document.getElementById("ccs-name-input").addEventListener("change", commitNameChange, { passive: false });

        // setup the OK and save buttons, they do the same thing
        document.getElementById("ccs-ok-button").addEventListener("click", save, { passive: false });
        document.getElementById("ccs-save-button").addEventListener("click", save, { passive: false });

        // setup the cancel button, which just closes the custom pop-up
        document.getElementById("ccs-cancel-button").addEventListener("click", (e) => { mainClose(); }, { passive: false });

        // setup the delete button
        document.getElementById("ccs-delete-button").addEventListener("click", (e) => {
            // delete from storage
            deleteCustomScheme(scheme);
            // remove the entry from the top-level menu
            // todo: this doesn't re-size the menu, so it has blank space at the end
            if (topMenuSelectionRow) {
                topMenuSelectionRow.remove();
            }
            // close the custom pop-up
            mainClose();
        }, { passive: false });

        // load schemes from storage
        loadCustomSchemes();
    }

    function save() {
        // save to storage
        scheme = saveCustomScheme(scheme);
        // apply the new scheme to the model
        Model.setControlScheme(scheme);
        // close the pop-up
        mainClose();
        // close the top-level menu
        topMenuClose();
    }

    function cloneScheme(templateScheme) {
        return new ControlScheme(
            // clear out the id
            null,
            // if the template is not a custom scheme, then set the name to "custom"
            !templateScheme.custom ? "Custom" : templateScheme.name,
            // we don't need the description
            null,
            // copy everything else
            templateScheme.platformId,
            templateScheme.img,
            templateScheme.strings["1"],
            templateScheme.strings["2"],
            templateScheme.strings["3"],
            templateScheme.frets["1"],
            templateScheme.frets["2"],
            templateScheme.frets["3"],
            // custom flag
            true
        );
    }

    // util class representing one of the six possible shawzin controls
    class ActionBinding {
        constructor(id, name) {
            // contains an identifier and a name
            this.id = id;
            this.name = name;
        }

        // functions for getting a setting on a control scheme, these must be overridden
        get(scheme) { return null; }
        set(scheme, controlKey) { return null; }
    }

    // ugh, the functional enum design pattern is not a great fit for javascript
    // binding for the string 1 action
    var actionBindingS1 = new ActionBinding("s1", "1st String");
    actionBindingS1.get = (scheme) => { return scheme.strings["1"]; };
    actionBindingS1.set = (scheme, controlKey) => { scheme.strings["1"] = controlKey; };
    // binding for the string 2 action
    var actionBindingS2 = new ActionBinding("s2", "2nd String");
    actionBindingS2.get = (scheme) => { return scheme.strings["2"]; };
    actionBindingS2.set = (scheme, controlKey) => { scheme.strings["2"] = controlKey; };
    // binding for the string 3 action
    var actionBindingS3 = new ActionBinding("s3", "3rd String");
    actionBindingS3.get = (scheme) => { return scheme.strings["3"]; };
    actionBindingS3.set = (scheme, controlKey) => { scheme.strings["3"] = controlKey; };
    // binding for the fret 1 action
    var actionBindingF1 = new ActionBinding("f1", "Air Fret");
    actionBindingF1.get = (scheme) => { return scheme.frets["1"]; };
    actionBindingF1.set = (scheme, controlKey) => { scheme.frets["1"] = controlKey; };
    // binding for the fret 2 action
    var actionBindingF2 = new ActionBinding("f2", "Earth Fret");
    actionBindingF2.get = (scheme) => { return scheme.frets["2"]; };
    actionBindingF2.set = (scheme, controlKey) => { scheme.frets["2"] = controlKey; };
    // binding for the fret 3 action
    var actionBindingF3 = new ActionBinding("f3", "Water Fret");
    actionBindingF3.get = (scheme) => { return scheme.frets["3"]; };
    actionBindingF3.set = (scheme, controlKey) => { scheme.frets["3"] = controlKey; };

    // action binding list, in order
    var actionBindingList = [
        actionBindingS1,
        actionBindingS2,
        actionBindingS3,
        actionBindingF1,
        actionBindingF2,
        actionBindingF3,
    ];

    // action binding menu
    function doActionBindingMenu(controlDiv, callback) {
        // container
        var selectionDiv = document.createElement("div");
        selectionDiv.className = "selection-div";

        // basically a function object that contains the state for the click event handler
        function createSelection(actionBinding) {
            // create the selection item
            var tr = document.createElement("div");
            tr.className = "selection-item";

            // get the current key bound to this control
            var control = actionBinding.get(scheme);

            // build the selection contents from the control data
            tr.innerHTML = `
                <img src="img/${control.imgBase}_w.png" srcset="img2x/${control.imgBase}_w.png 2x" class="icon" style="height: 2ex; width: auto; margin: 0.5ex;"/>
                ${actionBinding.name}
            `;

            // click event handler.  Because this is inside a function closure we can just use the local variables
            tr.onclick = () => {
                // set the binding
                callback(actionBinding);
                // cose the menu using the close callback returned at the end of the outer function
                close();
            };

            return tr;
        }

        // iterate over the control binding list
        for (var i = 0; i < actionBindingList.length; i++) {
            // get the control
            var actionBinding = actionBindingList[i];
            // build the selection item and its handler, and add to the container
            selectionDiv.appendChild(createSelection(actionBinding));
        }

        // show the menu and store the close callback
        var close = Menus.showMenu(selectionDiv, controlDiv, "Rebind Control");
    }

    // platform selection menu
    function doPlatformMenu(button, callback) {
        // container
        var selectionDiv = document.createElement("div");
        selectionDiv.className = "selection-div";

        // basically a function object that contains the state for the click event handler
        function createSelection(platform) {
            // create the selection item
            var tr = document.createElement("div");
            tr.className = "selection-item";

            // build the selection contents from the metadata
            tr.innerHTML = `
                <img src="img/${platform.image}" srcset="img2x/${platform.image} 2x" class="icon"/>
                ${platform.name}
            `;

            // click event handler.  Because this is inside a function closure we can just use the local variables
            tr.onclick = () => {
                // call the callback
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

    // build the controller diagram
    function buildDiagram(diagramDiv, scheme) {
        // platform metadata
        var plat = MetadataUI.platforms[scheme.platformId];

        // clear out the container
        diagramDiv.innerHTML = "";
        // setup the container style, todo: only do this once?  It doesn't change
        diagramDiv.style.position = "relative";
        diagramDiv.style.width = plat.diagram.width + "px";
        diagramDiv.style.height = plat.diagram.height + "px";
        // setup the background image for the specific platform
        diagramDiv.style.backgroundImage = "url('img2x/" + plat.diagram.image + "')";
        diagramDiv.style.backgroundSize = plat.diagram.width + "px " + plat.diagram.height + "px";

        // build a map of control divs
        var controlMap = {};

        // function to set a control to a certain binding, or null to unset
        function setBinding(controlDiv, actionBinding) {
            // save the binding to the control div
            controlDiv.actionBinding = actionBinding;
            // if it's an actual binding
            if (actionBinding) {
                // change the text inside the control div
                controlDiv.innerHTML = actionBinding.name;
                // set the new binding in the control scheme
                actionBinding.set(scheme, controlDiv.controlKey);
            } else {
                // change the text inside the control div
                controlDiv.innerHTML = "N/A";
                // we don't need to do anything on the control scheme, the binding will be changed to the new control.
            }
        }

        // listener to handle clicking on a control
        function controlListener(e) {
            // get the control div from the event
            var controlDiv = e.target;
            // get the corresponding control key
            var controlKey = controlDiv.controlKey;
            // run the action binding menu with this control
            doActionBindingMenu(controlDiv, (actionBinding) => {
                // save the old binding for this control
                var oldActionBinding = controlDiv.actionBinding;
                // check for no change
                if (actionBinding == oldActionBinding) return;

                // get the control that was previously bound to the new action
                var oldControlDiv = controlMap[actionBinding.get(scheme).id];
                // set the previously bound control to whatever the current control was
                // bound to, or clear it if the current control was not bound to anything
                setBinding(oldControlDiv, oldActionBinding);
                // set the current control to be bound to the selected action
                setBinding(controlDiv, actionBinding);
            });
        }

        // loop over the control keys
        for (var key in plat.keys) {
            // get the control key
            var controlKey = plat.keys[key];
            // create a button div
            var controlDiv = document.createElement("div");
            controlDiv.className = "textButton";
            // position the button
            controlDiv.style.position = "absolute";
            // y position is centered on the coordinate in the metadata
            controlDiv.style.bottom = (plat.diagram.height - controlKey.diag_y) + "px";
            controlDiv.style.transform = "translateY(50%)";
            // x position depends on whether it's on the left or right side of the diagram
            if (controlKey.diag_x < (plat.diagram.width/2)) {
                // on the left side, right-justify against the metadata coordinate
                // we have to give this position in terms of distance from the right side of the container
                controlDiv.style.right = (plat.diagram.width - controlKey.diag_x) + "px";
            } else {
                // on the right side, left-justify against the metadata coordinate
                controlDiv.style.left = controlKey.diag_x + "px";
            }

            // start all controls off unbound
            controlDiv.innerHTML = "N/A";
            // hax: save a reference to the control key on the button div itself
            controlDiv.controlKey = controlKey;
            // also save a reference to the action binding, when there is one
            controlDiv.actionBinding = null;
            // add the button div
            diagramDiv.appendChild(controlDiv);
            // save the button div to a map
            controlMap[key] = controlDiv;

            // set the listener on the button div
            controlDiv.addEventListener("click", controlListener);
        }

        // loop over all the action bindings and setup the diagram
        for (var i = 0; i < actionBindingList.length; i++) {
            // get the action binding
            var actionBinding = actionBindingList[i];
            // get the corresponding control key from the scheme
            var controlKey = actionBinding.get(scheme)
            // set the binding in the diagram
            setBinding(controlMap[controlKey.id], actionBinding);
        }
    }

    // basically update the whole custom control scheme pop-up with whatever new scheme is selected
    function updateScheme() {
        // get the platform metadata
        var platform = MetadataUI.platforms[scheme.platformId];
        // update the platform selection dropdown with the dropdown icon, platform icon, and platform name
        document.getElementById("ccs-platform-button").innerHTML = `
            <img src="img/icon-dropdown.png" srcset="img2x/icon-dropdown.png 2x" class="icon"/>
            <img src="img/${platform.image}" srcset="img2x/${platform.image} 2x" class="icon"/>
            ${platform.name}
        `;
        // build the diagram and control buttons
        buildDiagram(document.getElementById("ccs-diagram"), scheme);

        // update the name field
        document.getElementById("ccs-name-input").value = scheme.name;

        // show the OK button if it's an existing custom scheme, otherwise show the Save button
        document.getElementById("ccs-ok-button").style.display = (scheme.id != null) ? "" : "none";
        document.getElementById("ccs-save-button").style.display = (scheme.id != null) ? "none" : "";

        // show the delete buttom if it's an existing custom scheme
        document.getElementById("ccs-delete-button").style.display = (scheme.id != null && scheme.custom) ? "" : "none";
    }

    // update the scheme's name from the UI field
    function commitNameChange() {
        nameField = document.getElementById("ccs-name-input");
        scheme.name = MiscUtils.sanitizeString(nameField.value);
        nameField.value = scheme.name;
    }

    // show the custom control scheme menu
    function doCustomControlSchemeMenu(selectionRow, menuClose, theScheme) {
        // todo: are these checks necessary?
        // Check if's not a console control scheme
        if (!MetadataUI.platforms[theScheme.platformId].console) {
            // replace with the default XBox scheme
            theScheme = MetadataUI.controlSchemes[MetadataUI.platforms.xbx.defaultTemplate]
            theScheme = cloneScheme(theScheme);

        // check if it's not a custom scheme
        } else if (!theScheme.custom) {
            // clone if for a custom scheme
            theScheme = cloneScheme(theScheme);
        }

        // set the current scheme
        scheme = theScheme;

        // rebuild the UI
        updateScheme();

        // pull the menu element out of the hidden area
        var mainDiv = document.getElementById("custom-control-scheme");
        mainDiv.remove();

        // listener for the enter key, which saves and exits.
        var keyListener = (e) => {
            save();
            return true;
        };

        // show it as a pop-up menu with a custom close callback
        mainClose = Menus.showMenu(mainDiv, selectionRow, "Customize Control Scheme", false, () => {
            // put the menu contents back in the hidden area
            mainDiv.remove();
            document.getElementById("hidden-things").appendChild(mainDiv);
            // remove the enter key listener
            Events.removeKeyDownListener("Enter", keyListener);
        });
        // save the close callback so we can call it elsewhere
        topMenuClose = menuClose;
        // save the row in the top-level menu that was actually clicked
        topMenuSelectionRow = selectionRow;
        // add the enter key listener
        Events.addKeyDownListener("Enter", keyListener);
    }

    // convert a control scheme to something minimal we can save to preferences
    function controlSchemeToPreference(scheme) {
        // start a blank object
        var pref = {};
        // save a few basic properties
        pref.id = scheme.id;
        pref.platformId = scheme.platformId;
        pref.name = scheme.name;
        pref.description = scheme.description;
        pref.custom = scheme.custom;
        // save just the control key IDs for the action bindings
        for (var i = 0; i < actionBindingList.length; i++) {
            var actionBinding = actionBindingList[i];
            pref[actionBinding.id] = actionBinding.get(scheme).id;
        }

        // that's it
        return pref;
    }

    // convert a minimal preference setting to a full control scheme
    function preferenceToControlScheme(pref) {
        // if there is no preferences then apply the default here
        if (!pref) {
            return MetadataUI.controlSchemes.pc;
        }

        // if it's a legacy static control scheme then replace it with the equivalent new one.
        if (!pref.id) {
            return legacyPreferenceToControlScheme(pref);
        }

        // get the platform metadata
        var platform = MetadataUI.platforms[pref.platformId];

        // build a new control scheme with everything except the control key bindings
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
        // loop over action bindings
        for (var i = 0; i < actionBindingList.length; i++) {
            var actionBinding = actionBindingList[i];
            // use the action binding id to get the control key id, then look it up and set it to the control scheme
            actionBinding.set(scheme, platform.keys[pref[actionBinding.id]]);
        }

        // that's it
        return scheme;
    }

    function legacyPreferenceToControlScheme(pref) {
        // loop over the static control schemes
        for (var id in MetadataUI.controlSchemes) {
            var scheme = MetadataUI.controlSchemes[id];
            // find one with the same name
            if (pref.name == scheme.name) {
                return scheme;
            }
        }
        // oops something is wrong
        console.log("unrecognized control scheme: " + pref.name);
        // return a default
        return MetadataUI.controlSchemes.pc;
    }

    function loadCustomSchemes() {
        // load a JSON string from local storage
        var json = window.localStorage.getItem(key);
        // check if it's there
        if (json) {
            // parse json
            customSchemeList = JSON.parse(json);
        } else {
            // no custom schemes yet
            customSchemeList = [];
        }
    }

    function persistCustomSchemes() {
        // straight up save the whole list as a JSON array
        window.localStorage.setItem(key, JSON.stringify(customSchemeList));
    }

    function clearCustomSchemes() {
        // reset everything
        window.localStorage.removeItem(key);
        customSchemeList = [];
    }

    function lookupCustomSchemeIndex(id) {
        // lookup a custom scheme by id
        // not too interested in optimizing this
        for (var i = 0; i < customSchemeList.length; i++) {
            if (customSchemeList[i].id == id) { return i; }
        }
        // 404 control scheme not found
        return -1;
    }

    function saveCustomScheme(scheme) {
        // if the scheme has an id then we're replacing an existing scheme
        if (scheme.id != null) {
            // look up the existing scheme
            var index = lookupCustomSchemeIndex(scheme.id);
            // found it
            if (index >= 0) {
                // replace it
                customSchemeList[index] = scheme;
            } else {
                // just add the scheme
                // should only happen if the user deletes the current scheme, then clicks the Add button and saves
                // it again
                customSchemeList.push(scheme);
            }
        } else {
            // we need to find an unused id
            // start with 0
            var max = 0;
            // loop over the current custom schemes
            for (var i = 0; i < customSchemeList.length; i++) {
                // parse the id out and get the number
                var n = Number.parseInt(customSchemeList[i].id.substring(1));
                // update the max
                if (n > max) max = n;
            }

            // increment the max by 1 and use that as the new scheme's id
            var id = "c" + (max + 1);
            scheme.id = id;
            // save to the list
            customSchemeList.push(scheme);
        }
        // save the list to local storage
        persistCustomSchemes();
        // return the updated scheme
        return scheme;
    }

    function deleteCustomScheme(scheme) {
        // lookup by id
        var index = lookupCustomSchemeIndex(scheme.id);
        // if one is found, remove from the list
        if (index >= 0) {
            customSchemeList.splice(index, 1);
            // save the list to local storage
            persistCustomSchemes();
        }
    }

//    function getCustomSchemes() {
//        return customSchemeList;
//    }

    // run the top-level control scheme select menu
    function doControlSchemeSelect() {
        var currentSchemeId = Model.getControlScheme().id;

        // get the control scheme list
        var sm = MetadataUI.controlSchemes;

        // main container div, we're going to have two selection sections
        var containerDiv = document.createElement("div");

        // main selection container
        var selectionDiv = document.createElement("div");
        selectionDiv.className = "selection-div";

        // basically a function object that contains the state for the click event handler
        function createSelection(scheme) {
            // create the selection item
            var tr = document.createElement("div");
            // display it differently if it's the currently selected item
            tr.className = scheme.id == currentSchemeId ? "selection-item-selected" : "selection-item";

            // build the selection contents from the metadata icon image, name, and description
            tr.innerHTML = `
                <div class="tooltip">
                    <img src="img/${scheme.img}" srcset="img2x/${scheme.img} 2x" class="icon"/>
                    ${scheme.name}
                    <span class="tooltiptextbottom">${scheme.description ? scheme.description : "Custom control scheme"}</span>
                </div>
            `;

            // click event handler.  Because this is inside a function closure we can just use the local variables
            tr.onclick = () => {
                if (scheme.custom) {
                    // clone the scheme and carry over the id, so if we save when we already have this custom scheme
                    // selected then the Model will still detect it as a changed scheme
                    var clonedScheme = cloneScheme(scheme);
                    clonedScheme.id = scheme.id;
                    doCustomControlSchemeMenu(tr, close, clonedScheme);

                } else {
                    Model.setControlScheme(scheme);
                    close();
                }
            };

            return tr;
        }

        // loop over the static control schemes
        for (var csn in sm) {
            // build the selection item and its handler, and add to the container
            selectionDiv.appendChild(createSelection(sm[csn]));
        }

        // add the main selection container
        containerDiv.appendChild(selectionDiv);

        // custom selection container
        var customDiv = document.createElement("div");
        customDiv.className = "selection-div";
        // shrugs
        customDiv.style.margin = "1ex 0 0 0";

        // loop over the custom control schemes
        for (var i = 0; i < customSchemeList.length; i++) {
            // build the selection item and its handler, and add to the container
            customDiv.appendChild(createSelection(customSchemeList[i]));
        }

        // create the add button
        var tr = document.createElement("div");
        tr.className = "selection-item";

        tr.innerHTML = `
            <div class="tooltip">
                <img src="img/icon-control-scheme-add.png" srcset="img2x/icon-control-scheme-add.png 2x" class="icon"/>
                Add custom
                <span class="tooltiptextbottom">Add a custom control scheme</span>
            </div>
        `;

        // click event handler
        tr.onclick = () => {
            // run the custom control scheme, cloning whatever the model's current control scheme is for the input
            doCustomControlSchemeMenu(tr, close, cloneScheme(Model.getControlScheme()));
        };
        customDiv.appendChild(tr);

        // add the custom selection container
        containerDiv.appendChild(customDiv);

        // show the menu and store the close callback
        var close = Menus.showMenu(containerDiv, this, "Select Control Scheme");
    }

    return  {
        registerEventListeners: registerEventListeners, // ()
//        getCustomSchemes: getCustomSchemes, // ()
//        saveCustomScheme: saveCustomScheme, // (scheme)
//        deleteCustomScheme: deleteCustomScheme, // (scheme)
//        doCustomControlSchemeMenu: doCustomControlSchemeMenu, // (button, scheme)
        controlSchemeToPreference: controlSchemeToPreference, // (scheme)
        preferenceToControlScheme: preferenceToControlScheme, // (pref)
        doControlSchemeSelect: doControlSchemeSelect, // ()
    };
})();
