// miscellaneous event handlers and associated menus
// todo: break this up?  There's a lot in here.
var Controls = (function() {

    function registerEventListeners() {
        // section shawzin action
        document.getElementById("select-shawzin").addEventListener("click", doShawzinSelect, { passive: false });
        document.getElementById("toolbar-shawzin").addEventListener("click", doShawzinSelect, { passive: false });
        // select scale action
        document.getElementById("select-scale").addEventListener("click", doScaleSelect, { passive: false });
        // select control scheme action
        document.getElementById("select-control-scheme").addEventListener("click", ControlSchemeUI.doControlSchemeSelect, { passive: false });

        // title box event handlers
        Events.setupTextInput(document.getElementById("metadata-settings-title-text"));
        document.getElementById("metadata-settings-title-text").addEventListener("change", commitNameChange, { passive: false });

        // song code box event handlers
        Events.setupTextInput(document.getElementById("metadata-settings-code-text"), true);
        document.getElementById("metadata-settings-code-text").addEventListener("change", commitSongCodeChange, { passive: false });

        // hacky event handler for the paste code button
        document.getElementById("pasteCodeButton").addEventListener("click", (e) => {
            PageUtils.pasteFromClipboard(document.getElementById("metadata-settings-code-text"), commitSongCodeChange);
        }, { passive: false });

        // just as hacky event handler for the copy code button
        document.getElementById("copyCodeButton").addEventListener("click", (e) => {
            PageUtils.copyToClipboard(document.getElementById("metadata-settings-code-text").value);
        }, { passive: false });

        // config menu button (structure)
        document.getElementById("song-buttons-config").addEventListener("click", doConfigMenu, { passive: false });
        // individual controls in the config menu
        // these are hidden by default, so we can just keep then up-to-date all the time like everything else
        // meter textbox event handlers
        Events.setupTextInput(document.getElementById("config-meter-input"), true);
        document.getElementById("config-meter-input").addEventListener("change", commitMeterChange, { passive: false });
        // tempo combobox event handlers
        document.getElementById("config-tempo-input").addEventListener("change", commitTempoChange, { passive: false });
        // lead-in textbox event handlers
        Events.setupTextInput(document.getElementById("config-leadin-input"), true);
        document.getElementById("config-leadin-input").addEventListener("change", commitLeadinChange, { passive: false });
        // key signature selection event handlers
        document.getElementById("select-keysig").addEventListener("click", doKeySigSelect, { passive: false });

        // shawzintab menu button
        document.getElementById("toolbar-buttons-shawzintab").addEventListener("click", doShawzinTab, { passive: false });
        // individual controls in the shawzintab menu
        // these are hidden by default, so we can just keep then up-to-date all the time like everything else
        // meter textbox event handlers
        // download button
        document.getElementById("toolbar-buttons-shawzintab-download").addEventListener("click", doShawzinTabLink, { passive: false });
        // measures/seconds per line textbox
        Events.setupTextInput(document.getElementById("config-line-units-input"), true);
        document.getElementById("config-line-units-input").addEventListener("change", commitLineUnitsChange, { passive: false });
        // dark mode checkbox
        Events.setupCheckbox(document.getElementById("config-darkmode-input"), true);
        document.getElementById("config-darkmode-input").addEventListener("change", commitDarkModeChange, { passive: false });
        // old school mode checkbox
        Events.setupCheckbox(document.getElementById("config-oldmode-input"), true);
        document.getElementById("config-oldmode-input").addEventListener("change", commitOldModeChange, { passive: false });
        // initialize these from local storage. they are preferences and not part of the song model
        document.getElementById("config-darkmode-input").checked = Settings.getDarkMode();
        document.getElementById("config-oldmode-input").checked = Settings.getOldMode();

        // settings menu button
        document.getElementById("toolbar-buttons-settings").addEventListener("click", doSettingsMenu, { passive: false });
        // individual controls in the settings menu
        // these are hidden by default, so we can just keep then up-to-date all the time like everything else
        Events.setupCheckbox(document.getElementById("config-trackreversed-input"), true);
        document.getElementById("config-trackreversed-input").addEventListener("change", commitTrackReversedChange, { passive: false });
        //
        Events.setupCheckbox(document.getElementById("config-oldfretlayout-input"), true);
        document.getElementById("config-oldfretlayout-input").addEventListener("change", commitOldFretLayoutChange, { passive: false });
        // initialize these from local storage. they are preferences and not part of the song model
        document.getElementById("config-trackreversed-input").checked = !Settings.isTrackReversed();
        document.getElementById("config-oldfretlayout-input").checked = Settings.getOldFretLayout();

        // event handlers for the copy URL button
        document.getElementById("toolbar-buttons-copyurl").addEventListener("click", doCopyUrlMenu, { passive: false });

        // the options in the tempo dropdown are built dynamically from metadata
        initTempoControl();

        // we're done?!
    }

    function commitNameChange() {
        // Get the title textbox
        var input = document.getElementById("metadata-settings-title-text");
        // blur the textbox, I hate that web browsers don't do this automatically
        input.blur();
        // set the new value on the model
        Model.setSongName(input.value);
    }

    function commitSongCodeChange() {
        // get the song code textbox
        var input = document.getElementById("metadata-settings-code-text");
        // new song code
        var value = input.value;

        // sanity check, make sure it's a change
        if (value != Model.getSongCode()) {
            // set the song code
            Model.setSongCode(value);
            // do this after checking if the code has changed, this kicks off another change event for some reason
            input.blur();
            // set the state of the textbox and associated copy/paster buttons
            updateSongCode(value);
        }
    }

    function initTempoControl() {
        // get the tempo combobox
        var input = document.getElementById("config-tempo-input");

        // create the "none" option
        var option = document.createElement("option");
        option.selected = true;
        option.value = "";
        option.innerHTML = `None`;
        input.appendChild(option);

        // loop over the metadata tempos
        // because shawzin song code time is quantized by eighths of a second, we can't support just any tempo
        // just ones that come out to an integer number of ticks per beat
        for (var i = 0; i < MetadataUI.tempoList.length; i++) {
            // build a tempo option
            var tempo = MetadataUI.tempoList[i];
            var option = document.createElement("option");
            option.value = `${tempo}`;
            option.innerHTML = option.value;
            input.appendChild(option);
        }
    }

    function updateSongCode(songCode) {
        // update the song code textbox if the given song code is different
        // todo: is this necessary?
        var codeField = document.getElementById("metadata-settings-code-text");
        if (codeField.value != songCode) {
            codeField.value = songCode;
        }
        // if there's a song code then enable the copy button
        if (songCode && songCode.length > 0) {
            var button = document.getElementById("copyCodeButton");
            button.className = "smallButton icon tooltip";
            button.children[0].className = "icon";
        // otherwise, disable the copy button
        } else {
            var button = document.getElementById("copyCodeButton");
            button.className = "smallButton-disabled icon tooltip";
            button.children[0].className = "icon-disabled";
        }
    }

    function doShawzinSelect() {
        var currentShawzin = Model.getShawzin();

        // container div for the shawzin selection menu
        var selectionDiv = document.createElement("div");
        selectionDiv.className = "selection-div";

        // convenience
        function createSelection(name) {
            var sm = Metadata.shawzinList[name];

            var tr = document.createElement("div");
            // display it differently if it's the currently selected item
            tr.className = name == currentShawzin ? "selection-item-selected" : "selection-item";

            tr.innerHTML = `
                <div class="tooltip">
                    <img class="icon" src="img/icon-shawzin-${name}.png" srcset="img2x/icon-shawzin-${name}.png 2x"/>
                    ${sm.config.name}
                    <span class="tooltiptextbottom">${sm.config.comment}</span>
                </div>
            `;

            tr.onclick = () => {
                Model.setShawzin(name);
                close();
            };

            return tr;
        }

        for (var i = 0; i < Metadata.shawzinOrder.length; i++) {
            var name = Metadata.shawzinOrder[i];
            selectionDiv.appendChild(createSelection(name));
        }

        var close = Menus.showMenu(selectionDiv, this, "Select Shawzin");
    }

    function doScaleSelect() {
        // get the current shawzin metadata
        var sm = Metadata.shawzinList[Model.getShawzin()];
        var currentScaleName = Model.getScale();

        // container div
        var selectionDiv = document.createElement("div");
        selectionDiv.className = "selection-div";

        // basically a function object that contains the state for the click event handler
        function createSelection(name) {
            // create the selection item
            var tr = document.createElement("div");
            // display it differently if it's the currently selected item
            tr.className = name == currentScaleName ? "selection-item-selected" : "selection-item";

            // meh. build the selection contents from the metadata icon image, name, and description
            tr.innerHTML = `
                <img src="img/${sm.scales[name].config.img}" srcset="img2x/${sm.scales[name].config.img} 2x" class="icon" style="height: 2ex; width: auto; margin: 0.5ex;"/>
                ${sm.scales[name].config.name}
            `;

            // click event handler.  Because this is inside a function closure we can just use the local variables
            tr.onclick = () => {
                // set the scale on the model
                Model.setScale(name);
                // cose the menu using the close callback returned at the end of the outer function
                close();
            };

            return tr;
        }

        // get the shawzin list from metadata
        for (var i = 0; i < Metadata.scaleOrder.length; i++) {
            // get the name
            var name = Metadata.scaleOrder[i];
            // build the selection item and its handler, and add to the container
            selectionDiv.appendChild(createSelection(name));
        }

        // show the menu and store the close callback
        var close = Menus.showMenu(selectionDiv, this, "Select Scale");
    }

    function getKeySigHTML(note) {
        // get the image base and display name for the key signature
        var display = MetadataMusic.getKeySigDisplay(note);
        // generate some HTML with all that in there
        return `
            <div class="key-sig-box"><img src="img/${display.imgBase}" srcset="img2x/${display.imgBase} 2x" class="icon"/></div>
            ${display.name}
        `;
    }

    function doKeySigSelect() {
        // get the current scale metadata
        var currentNote = Model.getKeySig();

        // container div
        var containerDiv = document.createElement("div");
        // we're going to make a few selection divs
        function createSelectionContainerDiv() {
            var div = document.createElement("div");
            div.className = "selection-div";
            return div;
        }
        // first selection div
        var selectionDiv = createSelectionContainerDiv();

        // basically a function object that contains the state for the click event handler
        function createSelection(note) {
            // create the selection item
            var tr = document.createElement("div");
            // display it differently if it's the currently selected item
            tr.className = (note == currentNote ? "selection-item-selected" : "selection-item") +
                            (note == MetadataMusic.noteOrder[0] ? " fret3" : "");

            // meh. build the selection contents from the metadata icon image, name, and description
            tr.innerHTML = getKeySigHTML(note);

            // click event handler.  Because this is inside a function closure we can just use the local variables
            tr.onclick = () => {
                // set the key signature on the model
                Model.setKeySig(note);
                // update the top-level menu item
                document.getElementById("select-keysig-text").innerHTML = getKeySigHTML(note);
                // close the menu using the close callback returned at the end of the outer function
                close();
            };

            return tr;
        }

        // generate a note list
        var noteList = [];
        // loop over all 12 notes
        for (var i = 0; i < MetadataMusic.noteOrder.length; i++) {
            var note = MetadataMusic.noteOrder[i];
            // get the pitch offset for the key signature correponding to the note
            var pitchOffset = Piano.getPitchOffset(note);
            // save in a struct
            noteList.push({ "offset": pitchOffset, "note": note});
        }
        // put in inverse order of the offset, so high offsets are first and low offsets are last
        noteList.sort((a, b) => { return -(a.offset - b.offset); });

        // build a separator by closing the existing div and starting a new one
        function doSeparator() {
            containerDiv.appendChild(selectionDiv);
            selectionDiv = createSelectionContainerDiv();
            // shrugs
            selectionDiv.style.margin = "1ex 0 0 0";
        }

        // go over the sorted note list
        for (var i = 0; i < noteList.length; i++) {
            var note = noteList[i].note;
            // if it's the default key signature base, then build a separator before it
            if (note == MetadataMusic.noteOrder[0]) {
                doSeparator();
            }
            // build the selection
            selectionDiv.appendChild(createSelection(note));
            // if it's the default key signature base, then build another separator after it
            if (note == MetadataMusic.noteOrder[0]) {
                doSeparator();
            }
        }
        // add the remaining container
        containerDiv.appendChild(selectionDiv);

        // show the menu and store the close callback
        var close = Menus.showMenu(containerDiv, this, "Select Key");
    }

    function chooseControlScheme(name) {
        if (name == "custom") {
            // something
        } else {
            Model.setControlScheme(scheme);
        }
    }

    function commitMeterChange() {
        // get the textbox
        var input = document.getElementById("config-meter-input");
        // get its value, removing any extra spaces
        var value = input.value ? input.value.trim() : null;

        // update the model
        Model.setMeter(value);
    }

    function commitTempoChange() {
        // get the textbox
        var input = document.getElementById("config-tempo-input");
        // get its value, removing any extra spaces
        var value = input.value ? input.value.trim() : null;
        // parse to an int if there is a non-empty value, otherwise use null
        var intValue = (value == null || value.length == 0) ? null : MiscUtils.parseInt(value.trim());

        // update the model
        Model.setTempo(intValue);
    }

    function commitLeadinChange() {
        // get the textbox
        var input = document.getElementById("config-leadin-input");
        // get its value, removing any extra spaces
        var value = input.value ? input.value.trim() : null;

        // update the model
        Model.setLeadin(value);
    }

    function commitLineUnitsChange() {
        // get the textbox
        var input = document.getElementById("config-line-units-input");
        // get its value, removing any extra spaces
        var value = input.value ? input.value.trim() : null;

        // update the model, this basically just affects the URL parameter
        Model.setUnitsPerLine(value);
        // update Shawzintab
        ShawzinTab.setUnitsPerLine(Model.getUnitsPerLine());
        // re-render the song
        ShawzinTab.render();
    }

    function commitDarkModeChange() {
        // get the textbox
        var input = document.getElementById("config-darkmode-input");
        // get its value, just a boolean
        var value = input.checked;

        // save to preferences
        Settings.setDarkMode(value);
        // update Shawzintab
        ShawzinTab.setDarkMode(value);
        // re-render the song
        ShawzinTab.render();
    }

    function commitOldModeChange() {
        // get the textbox
        var input = document.getElementById("config-oldmode-input");
        // get its value, just a boolean
        var value = input.checked;

        // save to preferences
        Settings.setOldMode(value);
        // update Shawzintab
        ShawzinTab.setOldMode(value);
        // re-render the song
        ShawzinTab.render();
    }

    function doConfigMenu() {
        // build a container for the config contents
        var menuDiv = document.createElement("div");
        menuDiv.className = "selection-div";

        // get the hidden structure controls from the document
        var structureDiv = document.getElementById("config-structure");
        // remove them
        structureDiv.remove();
        // add them to the menu contents
        menuDiv.appendChild(structureDiv);

        // show the menu with a custom close callback
        var close = Menus.showMenu(menuDiv, this, "Song Configuration", false, () => {
            // when the structure menu is closed, remove the the original controls container
            structureDiv.remove();
            // and add it back to the hidden area of the document
            document.getElementById("hidden-things").appendChild(structureDiv);
            // notify playback that the other metronome button is gone
            Playback.hideSettingsMetronome();
        });

        // make sure the key signature item is displaying the current key signature
        document.getElementById("select-keysig-text").innerHTML = getKeySigHTML(Model.getKeySig());

        // notify playback that the other metronome button is shown
        Playback.showSettingsMetronome();
    }

    function doSettingsMenu() {
        // build a container for the config contents
        var menuDiv = document.createElement("div");
        menuDiv.className = "selection-div";

        // get the hidden setting controls from the document
        var settingsDiv = document.getElementById("config-settings");
        // remove them
        settingsDiv.remove();
        // add them to the menu contents
        menuDiv.appendChild(settingsDiv);

        // show the menu with a custom close callback
        var close = Menus.showMenu(menuDiv, this, "Settings", false, () => {
            // when the settings menu is closed, remove the the original container
            settingsDiv.remove();
            // and add it back to the hidden area of the document
            document.getElementById("hidden-things").appendChild(settingsDiv);
        });
    }

    function commitTrackReversedChange() {
        // get the textbox
        var input = document.getElementById("config-trackreversed-input");
        // get its value, just a boolean
        var value = !input.checked;

        // save to preferences
        Settings.setTrackReversed(value);
        // update Track
        TrackBar.updateTrackDirection();
    }

    function commitOldFretLayoutChange() {
        // get the textbox
        var input = document.getElementById("config-oldfretlayout-input");
        // get its value, just a boolean
        var value = input.checked;

        // save to preferences
        Settings.setOldFretLayout(value);
        // update Track
        Track.updateSettings();
    }

    function doCopyUrlMenu() {
        // build a container for the pop-up
        var menuDiv = document.createElement("div");
        menuDiv.className = "selection-div";

        // build a text box
        var textField = document.createElement("input");
        textField.size = 30;
        // set the contents to the current URL with the parameters changed to contain the current song model
        textField.value = Model.buildUrl();
        menuDiv.appendChild(textField);

        // add a convenience copy button
        var copyDiv = document.createElement("span");
        copyDiv.classList.add("smallButton");
        copyDiv.classList.add("icon");
        copyDiv.innerHTML = `<img src="img/icon-copy-code.png" srcset="img2x/icon-copy-code.png 2x" class="icon"/>`;
        // click action copies the URL contents to the clipboard
        copyDiv.addEventListener("click", (e) => { PageUtils.copyToClipboard(textField.value); });
        menuDiv.appendChild(copyDiv);

        // show the menu
        Menus.showMenu(menuDiv, this, "Copy Link", false);

        // ugh, after the menu is up, tweak the textbox:
        // give it focus
        textField.focus();
        // select its contents
        textField.select();
        // move it to the beginning of the line, otherwise you just wee base64 crap
        textField.scrollLeft = 0;
    }

    function doShawzinTab() {
        // todo: fix, like, everything
        // container
        var menuDiv = document.createElement("div");
        menuDiv.className = "selection-div";

        // determine whether there's a structure defined
        var ticksPerBeat = Model.getTempo() ? ((Metadata.ticksPerSecond * 60) / Model.getTempo()) : null;
        // set the correct label on the units pwer line control depending on weather there are measures or not
        if (ticksPerBeat) {
            document.getElementById("config-line-units-label-measures").style.display = "block";
            document.getElementById("config-line-units-label-seconds").style.display = "none";
        } else {
            document.getElementById("config-line-units-label-measures").style.display = "none";
            document.getElementById("config-line-units-label-seconds").style.display = "block";
        }

        // create a new canvas
        var canvas = document.createElement("canvas");
        // set the size to something comparable to a typical shawzin tab
        canvas.width = 1000;
        canvas.height = 1000;
        // get the currently hidden canvas container and replace its contents with the new canvas
        var container = document.getElementById("shawzintab-container");
        container.innerHTML = "";
        container.appendChild(canvas);

        // initialize the shawzin tab lib
        ShawzinTab.init(
            canvas,
            Model.getSong(),
            Model.getControlScheme(),
            Model.getSongName(),
            ticksPerBeat,
            Model.getMeterTop()
        );

        // init the configurable options
        // apply the default if units per line is empty
        var unitsPerLine = Model.getUnitsPerLine();
        ShawzinTab.setUnitsPerLine(unitsPerLine ? unitsPerLine : MetadataUI.defaultUnitsPerLine);
        // dark mode
        ShawzinTab.setDarkMode(Settings.getDarkMode());
        // old mode
        ShawzinTab.setOldMode(Settings.getOldMode());

        // pull the shawzin tab element ouf of the hidden area
        var shawzinTabDiv = document.getElementById("config-shawzintab");
        shawzinTabDiv.remove();
        // put it in the menu container
        menuDiv.appendChild(shawzinTabDiv);

        // show it as a full-width pop-up menu with a custom close callback
        Menus.showMenu(menuDiv, this, "Shawzin Tab", true, () => {
            // put the menu contents back in the hidden area
            shawzinTabDiv.remove();
            document.getElementById("hidden-things").appendChild(shawzinTabDiv);
            // clean up Shawzintab
            ShawzinTab.close();
        });

        // hack, wait some time to start rendering the shawzin tab
        setTimeout(() => { ShawzinTab.render(); }, 200);
    }

    function doShawzinTabLink() {
        // build a simple menu pop-up container
        var menuDiv = document.createElement("div");
        menuDiv.className = "selection-div";
        // generate a link element
        var link = ShawzinTab.generateLink();
        // add to the container
        menuDiv.appendChild(link);
        // display the link pop-up
        var close = Menus.showMenu(menuDiv, this, "Download Shawzin Tab", false);
    }

    // public members

    return  {
        registerEventListeners: registerEventListeners, // ()
        updateSongCode: updateSongCode, // (songCode)
    };
})();


