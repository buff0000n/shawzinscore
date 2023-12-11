var Editing = (function() {
    var editing = false;

    function registerEventListeners() {
        document.getElementById("edit-bar").addEventListener("click", toggleEditing, { passive: false });

//        // config menu button (structure)
//        document.getElementById("song-buttons-config").addEventListener("click", doConfigMenu, { passive: false });
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

        // the options in the tempo dropdown are built dynamically from metadata
        initTempoControl();

    }

    function toggleEditing() {
        editing = !editing;

        var buttonImg = document.getElementById("edit-bar-img");
        var toolbar = document.getElementById("edit-toolbar");
        var songScroll = document.getElementById("song-scroll");


        if (editing) {
            PageUtils.setImgSrc(buttonImg, "icon-dropup.png");
            toolbar.style.display = "block";
            songScroll.classList.remove("cursor-pointer");

            // make sure the key signature item is displaying the current key signature
            document.getElementById("select-keysig-text").innerHTML = getKeySigHTMLAndTooltip(Model.getKeySig())[0];

            // notify playback that the other metronome button is shown
            Playback.showSettingsMetronome();

        } else {
            PageUtils.setImgSrc(buttonImg, "icon-dropdown.png");
            toolbar.style.display = "none";
            songScroll.classList.add("cursor-pointer");

            // notify playback that the other metronome button is gone
            Playback.hideSettingsMetronome();
        }

        Track.setEditing(editing);
    }

    function updateSongStats() {
        var song = Model.getSong();

        var count = song.notes.length;
        var countInput = document.getElementById("edit-note-count-input");
        countInput.value = count;

        var duration;
        var durationInput = document.getElementById("edit-duration-input");
        if (count == 0) {
            duration = "Empty";
        } else {
            // todo: add lead-in or subtract first note?
            var ticks = song.notes[count - 1].tick;
            // todo: add duration of last note
            var seconds = Math.round(ticks / Metadata.ticksPerSecond);
            var minutes = Math.floor(seconds / 60);
            seconds -= (minutes * 60);
            duration = minutes.toString().padStart(2, "0") + ":" + seconds.toString().padStart(2, "0");
        }
        durationInput.value = duration;
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

    function commitLeadinChange() {
        // get the textbox
        var input = document.getElementById("config-leadin-input");
        // get its value, removing any extra spaces
        var value = input.value ? input.value.trim() : null;

        // update the model
        Model.setLeadin(value);
    }

    return {
        registerEventListeners: registerEventListeners,
        updateSongStats: updateSongStats,
    };
})();