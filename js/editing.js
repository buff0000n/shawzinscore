var Editing = (function() {
    // whether the editing controls are enabled
    var editing = false;

    function registerEventListeners() {
        document.getElementById("edit-bar").addEventListener("click", toggleEditing, { passive: false });

//        // config menu button (structure)
//        document.getElementById("song-buttons-config").addEventListener("click", doConfigMenu, { passive: false });

        // individual controls in the editing menu
        // these are hidden by default, so we can just keep then up-to-date all the time like everything else

        // meter textbox event handlers
        Events.setupTextInput(document.getElementById("config-meter-input"), true);
        document.getElementById("config-meter-input").addEventListener("change", commitMeterChange, { passive: false });

        // tempo combobox event handlers
        document.getElementById("config-tempo-input").addEventListener("change", commitTempoChange, { passive: false });

        // lead-in textbox event handlers
        Events.setupTextInput(document.getElementById("config-leadin-beats-input"), true);
        document.getElementById("config-leadin-beats-input").addEventListener("change", commitLeadInBeatsChange, { passive: false });
        Events.setupTextInput(document.getElementById("config-leadin-seconds-input"), true);
        document.getElementById("config-leadin-seconds-input").addEventListener("change", commitLeadInSecondsChange, { passive: false });

        // Quantize button
        document.getElementById("edit-quantize").addEventListener("click", quantize, { passive: false });

        // Change speed button
        document.getElementById("edit-change-speed").addEventListener("click", changeSpeed, { passive: false });

        // Delete all button
        document.getElementById("edit-delete-all").addEventListener("click", deleteAll, { passive: false });

        // key signature selection event handlers
        document.getElementById("select-keysig").addEventListener("click", doKeySigSelect, { passive: false });

        // the options in the tempo dropdown are built dynamically from metadata
        initTempoControl();

        // apply the editing setting
        // we have to wait for more of the UI to get initialized before we enable editing,
        // so save it for later
        setTimeout(() => {
            setEditing(Settings.getEditingEnabled());
        }, 100);
    }

    function toggleEditing() {
        // flip the flag
        setEditing(!editing);
    }

    function setEditing(newEditing) {
        // short circuit
        if (newEditing == editing) return;

        // apply
        editing = newEditing;

        var buttonImg = document.getElementById("edit-bar-img");
        var toolbar = document.getElementById("edit-toolbar");

        if (editing) {
            // change the icon
            PageUtils.setImgSrc(buttonImg, "icon-dropup.png");
            // display the editing controls
            toolbar.style.display = "block";

            // make sure the key signature item is displaying the current key signature
            document.getElementById("select-keysig-text").innerHTML = getKeySigHTMLAndTooltip(Model.getKeySig())[0];

            // notify playback that the other metronome button is shown
            Playback.showSettingsMetronome();

        } else {
            // change the icon
            PageUtils.setImgSrc(buttonImg, "icon-dropdown.png");
            // hide the editing controls
            toolbar.style.display = "none";

            // notify playback that the other metronome button is gone
            Playback.hideSettingsMetronome();
        }

        // enable/disable the record button
        Playback.setRecordEnabled(editing);

        // set the track up for editing
        Track.setEditing(editing);

        // save preference, I'm tired of re-enabling editing a million times while debugging
        Settings.setEditingEnabled(editing);
    }

    function enableButtons() {
        // get the song note count
        var song = Model.getSong();
        var noteCount = song ? song.notes.length : 0;

        if (noteCount == 0) {
            // disable the Delete All, Change Speed if there are no notes
            DomUtils.addClass(document.getElementById("edit-change-speed"), "disabled");
            DomUtils.addClass(document.getElementById("edit-delete-all"), "disabled");

        } else {
            // make sure the change Speed and Delete All options are enabled
            DomUtils.removeClass(document.getElementById("edit-change-speed"), "disabled");
            DomUtils.removeClass(document.getElementById("edit-delete-all"), "disabled");
        }

        // enable the quantize option only if there are notes and a meter is specified
        if (noteCount > 0 && Model.getMeter() != null) {
            DomUtils.removeClass(document.getElementById("edit-quantize"), "disabled");
        } else {
            DomUtils.addClass(document.getElementById("edit-quantize"), "disabled");
        }
    }

    function updateSongStats() {
        // get the song
        var song = Model.getSong();

        // count the song notes
        var count = song ? song.notes.length : 0;
        // update the UI count
        var countInput = document.getElementById("edit-note-count-input");
        countInput.value = count;

        // duration and UI element
        var duration;
        var durationInput = document.getElementById("edit-duration-input");
        if (count == 0) {
            // If there are no notes then just put the word "Empty" in there
            duration = "Empty";

        } else {
            // calculate the song duration
            // todo: add duration of last note?
            var ticks = song.notes[count - 1].tick - Math.min(0, song.notes[0].tick);
            // split into seconds and minutes
            var seconds = Math.round(ticks / Metadata.ticksPerSecond);
            var minutes = Math.floor(seconds / 60);
            seconds -= (minutes * 60);
            // build a duration string
            duration = minutes.toString().padStart(2, "0") + ":" + seconds.toString().padStart(2, "0");
        }

        // update the UI duration
        durationInput.value = duration;
        // update button states
        enableButtons();
    }

    function updateStructure() {
        // check if there is a meter and tempo
        if (Model.getMeter()) {
            // If there is a meter/tempo, then enable the option to change speed based on tempo
            // enable the label
            DomUtils.removeClass(document.getElementById("change-speed-type-tempo"), "disabled");
            // enable the checkbox
            document.getElementById("change-speed-type-tempo-input").disabled = false;
            // enable the quantize function
            DomUtils.removeClass(document.getElementById("edit-quantize"), "disabled");

        } else {
            // If there is no meter/tempo, then disble the option to change speed based on tempo
            // disable the label
            DomUtils.addClass(document.getElementById("change-speed-type-tempo"), "disabled");
            // disable the checkbox
            document.getElementById("change-speed-type-tempo-input").disabled = true;
            // make sure the percent option is selected
            document.getElementById("change-speed-type-percent-input").checked = true;
            // disable the quantize function
            DomUtils.addClass(document.getElementById("edit-quantize"), "disabled");
            // deselect the Tempo option in the change speed dialog, if selected
            updateChangeSpeedType();
        }

        // update button states
        enableButtons();
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

        // fill in the tempos
        populateTempoSelection(input);
    }

    function populateTempoSelection(input) {
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

    function getKeySigHTMLAndTooltip(note) {
        // get the image base, display name, and tooltip for the key signature
        var display = MetadataMusic.getKeySigDisplay(note);
        // generate some HTML with all that in there
        return [`
                <div class="key-sig-box"><img src="img/${display.imgBase}" srcset="img2x/${display.imgBase} 2x" class="icon"/></div>
                ${display.name}
                `,
                display.popup
               ];
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
                            (note == MetadataMusic.noteOrder[0] ? " fret3" : "") +
                            " tooltip";

            // meh. build the selection contents from the metadata icon image, name, and description
            var [html, tooltip] = getKeySigHTMLAndTooltip(note);
            tr.innerHTML = `
                ${html}
                <div class="tooltiptextbottom">${tooltip}</div>
            `;

            // click event handler.  Because this is inside a function closure we can just use the local variables
            tr.onclick = () => {
                // set the key signature on the model
                Model.setKeySig(note);
                // update the top-level menu item
                document.getElementById("select-keysig-text").innerHTML = getKeySigHTMLAndTooltip(note)[0];
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

    function commitLeadInBeatsChange() {
        // get the textbox
        var input = document.getElementById("config-leadin-beats-input");
        // get its value, removing any extra spaces
        var value = input.value ? input.value.trim() : null;

        // update the model
        Model.setLeadInBeats(value, true);
    }

    function commitLeadInSecondsChange() {
        // get the textbox
        var input = document.getElementById("config-leadin-seconds-input");
        // get its value, removing any extra spaces
        var value = input.value ? input.value.trim() : null;

        // update the model
        Model.setLeadInSeconds(value, true);
    }

//    function roundToNearestPowerOfTwo(int n) {
//        return 1 << Math.floor(Math.log2(n));
//    }
//

    // close callback for the change speed dialog, I can't figure out a good way to not need this as a global variable
    var quantizeDialogClose = null;

    function initQuantizeDialog(div) {
        var itemIdRegex = /(\w+)-(\d)_(\d+)/i;

        // only initialize listeners once
        if (!div.initialized) {
            // click handler
            function quantizeClick(e) {
                // get the clicked items' division
                // use currentTarget to get the parent item that actually has the listener registered
                var division = e.currentTarget.division;
                // console.log("Division: " + division);
                // do the quantization
                commitQuantize(division);
                // close the dialog
                quantizeDialogClose();
            }

            // loop over the quantize menu items
            for (var i = 0; i < div.childElementCount; i++) {
                // get the item
                var item = div.children[i];
                // get it's id
                var id = item.id;

                // parse the division out of the id
                // man I'm going through almost more trouble than it would be to just generate the dang UI in code
                var results = itemIdRegex.exec(id);
                if (!results) {
                    return;
                }
                var division = parseInt(results[3]);
                // save the division to the item for later
                item.division = division;

                // register listener
                item.addEventListener("click", quantizeClick, { passive: false });
            }
            // set the flag so we don't initialize again
            div.initialized = true;
        }

        // calculate ticks per beat
        var ticksPerBeat = (Metadata.ticksPerSecond * 60) / Model.getTempo();

        // loop over the selection items (again)
        for (var i = 0; i < div.childElementCount; i++) {
            // get the item
            var item = div.children[i];
            // get its division
            var division = item.division;

            // calculate the quantize ticks for this selection
            var qTicks = getQuantizeTicks(division);
            // calculate how many beats the quantize ticks is
            var beatFraction = qTicks / ticksPerBeat;

            // get the item label
            var label = document.getElementById("quantize_beats_1_" + division);
            // build a description string
            // start by generating a reduced fraction representation of the beat fraction
            // multiply the beat fraction by 3 times a large enough power of 2 in order to produce an integer
            // in all cases, then reduce the fraction using that factor as the denominator
            var fraction = MiscUtils.reduceFraction(Math.round(beatFraction * 96), 96);
            // start the string with the numerator of the fraction
            var fractionString = fraction[0] + "";
            // if the denominator is something other than 1, then add the denominator
            if (fraction[1] != 1) {
                fractionString = fractionString + "/" + fraction[1];
            }
            // add a singular or plural dependong on if the fraction is greater than 1
            if (beatFraction > 1) {
                fractionString = fractionString + " beats";
            } else {
                fractionString = fractionString + " beat";
            }
            // set the label.
            label.innerHTML = fractionString;
            // set the color of the label depending on whether this option produces an integer number of ticks to
            // quantize by
            if (Math.floor(qTicks) == qTicks) {
                label.className = "info";
            } else {
                label.className = "warn";
            }
            // That was a surprisingly large amount of work
        }
    }

    function quantize() {
        // check for a meter
        if (!Model.getMeter()) {
            return;
        }
        // get the hidden dialog div from the document
        var dialogDiv = document.getElementById("quantize-dialog");

        initQuantizeDialog(dialogDiv);

        // remove it
        dialogDiv.remove();

        // show the menu with a custom close callback
        quantizeDialogClose = Menus.showMenu(dialogDiv, this, "Quantize", false, () => {
            // when the menu is closed, remove the the original container
            dialogDiv.remove();
            // and add it back to the hidden area of the document
            document.getElementById("hidden-things").appendChild(dialogDiv);
        });
    }

    function getQuantizeTicks(division) {
        // get the tempo
        var tempo = Model.getTempo();
        // get the bottom of the time signature, which tells us which time unit is one beat
        var meterBottom = Model.getMeterBottom();

        // calculate ticks per beat
        var ticksPerBeat = (Metadata.ticksPerSecond * 60) / tempo;

        // calculate the number of ticks for each quantized interval, which may be a fraction
        // todo: keep the fraction separate to prevent rounding errors?
        var qTicks = (ticksPerBeat * meterBottom) / division;
        return qTicks;
    }

    function commitQuantize(division) {
        // get the quantization ticks
        var qTicks = getQuantizeTicks(division);

        // start an Undo combo
        Undo.startUndoCombo();

        // Fudge factor 1 and Fudge Factor 2 determined experimentally to do two things:
        // 1. Favor moving notes earlier
        // 2. split 0-7 into 3 at 0, 3, and 6
        var FF1 = -0.001;
        var FF2 = 0.25;

        // run note-by-note transformation in the track
        // this also takes care of keeping the lead-in up to date
        Track.transformNotes((note) => {
            // calculate the quantized time
            // Divide by the quantize ticks, round to the nearest whole number, multiply by the quantized ticks, and round again.
            // add in fudge factors to make common cases come out "right"
            var newTick = Math.round((Math.round((note.tick / qTicks) + FF1) * qTicks) + FF2);
            // create a new note with the same note name and a quantized time
            var newNote = new Note(note.toNoteName(), newTick);
            // return the transformed note
            return newNote;
        });

        // end the undo combo
        Undo.endUndoCombo("Quantize");
    }

    // close callback for the change speed dialog, I can't figure out a good way to not need this as a global variable
    var changeSpeedDialogClose = null;

    function updateChangeSpeedType() {
        // check if the percent option is checked
        if (document.getElementById("change-speed-type-percent-input").checked) {
            // show the percent selector and hide the tempo selector
            document.getElementById("change-speed-percent").style.display = "";
            document.getElementById("change-speed-tempo").style.display = "none";
        } else {
            // show the tempo selector and hide the percent selector
            document.getElementById("change-speed-percent").style.display = "none";
            document.getElementById("change-speed-tempo").style.display = "";
        }
    }

    function initChangeSpeedDialog(div) {
        // only initialize once
        if (div.initialized) {
            return;
        }

        // type selectors listeners
        document.getElementById("change-speed-type-percent-input").addEventListener("change", updateChangeSpeedType, { passive: false });
        document.getElementById("change-speed-type-tempo-input").addEventListener("change", updateChangeSpeedType, { passive: false });

        // init the tempo selection
        populateTempoSelection(document.getElementById("change-speed-tempo-input"));

        // okay button listener
        document.getElementById("change-speed-ok-button").addEventListener("click", () => {
            commitChangeSpeed();
            changeSpeedDialogClose();
        }, { passive: false });

        // cancel button listener
        document.getElementById("change-speed-cancel-button").addEventListener("click", () => {
            changeSpeedDialogClose();
        }, { passive: false });

        // only initialize once
        div.initialized = true;
    }

    function changeSpeed() {
        // get the hidden dialog div from the document
        var dialogDiv = document.getElementById("change-speed-dialog");
        initChangeSpeedDialog(dialogDiv);

        // update the tempo selector with the current tempo, if there is one
        var tempo = Model.getTempo();
        if (tempo != null) {
            document.getElementById("change-speed-tempo-input").value = `${tempo}`;
        }

        // remove it
        dialogDiv.remove();

        // show the menu with a custom close callback
        changeSpeedDialogClose = Menus.showMenu(dialogDiv, this, "Change Speed", false, () => {
            // when the change speed menu is closed, remove the the original container
            dialogDiv.remove();
            // and add it back to the hidden area of the document
            document.getElementById("hidden-things").appendChild(dialogDiv);
        });
    }

    function commitChangeSpeed() {
        // look at one of the radio buttons
        var percentTypeInput = document.getElementById("change-speed-type-percent-input");
        // check if it's a percentage change
        if (percentTypeInput.checked) {
            // get the percentage
            var percentInput = document.getElementById("change-speed-percent-input");
            // convert to a length scaling factor
            var scale = 100 / MiscUtils.parseInt(percentInput.value);
            // if the scaling factor is 1 then do nothing
            if (scale != 1) {
                // scale the note times
                scaleSongLength(scale);
            }
        } else {
            // get the selected tempo
            var tempoInput = document.getElementById("change-speed-tempo-input");
            var newTempo = MiscUtils.parseInt(tempoInput.value);
            // get the current tempo
            var tempo = Model.getTempo();
            // check if they're different
            if (newTempo != tempo) {
                // run the tempo change
                doChangeSpeedToTempo(tempo, newTempo);
            }
        }
    }

    function scaleSongLength(scale) {
        // start an Undo combo
        Undo.startUndoCombo();

        // run note-by-note transformation in the track
        // this also takes care of keeping the lead-in up to date
        Track.transformNotes((note) => {
            // create a new note with the same note name and a scaled time time
            var newNote = new Note(note.toNoteName(), Math.round(note.tick * scale));
            // return the transformed note
            return newNote;
        });

        // end the undo combo
        Undo.endUndoCombo("Change Speed");
    }

    function doChangeSpeedToTempo(oldTempo, newTempo) {
        // calcluate the length scaling factor to go from the old tempo to the new one
        var scaleLengthFactor = oldTempo / newTempo;

        // start an Undo combo
        Undo.startUndoCombo();

        // change the tempo, this doesn't affect the song or lead-in
        Model.setTempo(newTempo);
        // change the song and lead-in
        scaleSongLength(scaleLengthFactor);

        // end the undo combo
        Undo.endUndoCombo("Change Tempo");
    }

    function deleteAll() {
        // get the current song
        var song = Model.getSong();
        // if the current song is blank then do nothing
        if (!song || song.notes.length == 0) {
            return;
        }
        // create a new song
        var newSong = new Song();
        // copy over the song scale
        newSong.setScale(song.getScale());

        // start an undo combo so we can get this Set Song action a different name
        Undo.startUndoCombo();
        // set it as a new song
        Model.setSong(newSong);
        // end the undo combo
        Undo.endUndoCombo("Delete All");
    }

    return {
        // register event listeners
        registerEventListeners: registerEventListeners,
        // notify that something with the song itself has changed
        updateSongStats: updateSongStats,
        // notify that something with the meter/tempo has changed
        updateStructure: updateStructure,
    };
})();