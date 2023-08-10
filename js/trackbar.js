// lib for the control bar immediately on top of or below the track
var TrackBar = (function() {

    // track direction
    var trackReversed = false;
    // show frets or strings
    var showFrets = false;
    // tracking for which frets are enabled
    // this is just a toy for now, it doesn't do anything
    var fretEnabled = [false, false, false, false];
    // current chord mode, (null, "a", "b", "ab")
    var chordMode = null;
    var chordModeMidiMap = null;

    // keyboard div container, easier to rebuild if I keep track of a container
    var rollKeyButtonDiv = null;

    function registerEventListeners() {
        // event handler for the track direction button, I love this button
        var dirDiv = document.getElementById("track-direction");
        dirDiv.addEventListener("click", () => {
            // invert the preference value
            var newReversed = !Settings.isTrackReversed();
            // apply the new setting
            setTrackDirection(newReversed);
            // save the new preference
            Settings.setTrackReversed(newReversed);
            // update the setting UI, there are two ways to set this setting
            document.getElementById("config-trackreversed-input").checked = !newReversed;
        });

        // event handlers for the chord mode buttons

        var noneDiv = document.getElementById("roll-chord-button-none");
        noneDiv.addEventListener("click", () => {
            // apply the new setting
            setChordMode(null);
        });
        var aDiv = document.getElementById("roll-chord-button-a");
        aDiv.addEventListener("click", () => {
            // apply the new setting
            setChordMode("a");
        });
        var bDiv = document.getElementById("roll-chord-button-b");
        bDiv.addEventListener("click", () => {
            // apply the new setting
            setChordMode("b");
        });
        var abDiv = document.getElementById("roll-chord-button-ab");
        abDiv.addEventListener("click", () => {
            // apply the new setting
            setChordMode("ab");
        });
        var slapDiv = document.getElementById("roll-chord-button-slap");
        slapDiv.addEventListener("click", () => {
            // apply the new setting
            setChordMode("slap");
        });

        // event handler for the fret/string switch button
        var switchHandler = () => {
            // invert the preference value
            var newShowFrets = !Settings.isShowFrets();
            // apply the new setting
            setShowFrets(newShowFrets);
            // save the new preference
            Settings.setShowFrets(newShowFrets);
        };
        var switchFretsDiv = document.getElementById("trackbar-switch-frets");
        switchFretsDiv.addEventListener("click", switchHandler);
        var switchStringsDiv = document.getElementById("trackbar-switch-strings");
        switchStringsDiv.addEventListener("click", switchHandler);

        // later
//        var chordDiv = document.getElementById("roll-chord-button");
//        chordDiv.addEventListener("click", selectChord);

        // add event handlers for the fret buttons
        for (var fret = 0; fret < 4; fret++) {
            var fretDiv = document.getElementById("tab-fret-" + fret);
            // set a convenience property on the UI element
            fretDiv.fret = fret;
            // add a listener
            fretDiv.addEventListener("click", (e) => {
                // find the top div which has the fret property set
                var topDiv = DomUtils.getParent(e.target, "tab-fret-div");
                // handle fret toggling
                toggleFretEnabled(topDiv.fret);
            });
        }

        // add global listeners for the arrow keys, mimicking the standard PC control scheme
        Events.addKeyDownListener("ArrowLeft", (e) => {
            // left toggles fret 1
            toggleFretEnabled(1);
            // handled
            return true;
        }, { passive: true });
        Events.addKeyDownListener("ArrowDown", (e) => {
            // down toggles fret 2
            toggleFretEnabled(2);
            // handled
            return true;
        }, { passive: true });
        Events.addKeyDownListener("ArrowRight", (e) => {
            // right toggles fret 3
            toggleFretEnabled(3);
            // handled
            return true;
        }, { passive: true });

        // oh god is this is a freakin' MIDI listener?!  What the hell.
        Midi.addMidiListener(scaleMidiListener);

        // read preferences and apply them
        setTrackDirection(Settings.isTrackReversed());
        setShowFrets(Settings.isShowFrets());
    }

    // drag drop listener for the piano element
    class ScaleRollDragDropListener extends DragDropListener {
        constructor() {
            super();
            // track the last key that was touched
            this.lastGroup = null;
        }

        checkPlay(e, target) {
            //console.log(`checkplay: ${e.target.tagName}`);
            //PageUtils.showDebug("checkPlay: " + target);

            // check if the target isn't an enabled key element
            if (!target || !target.group) {
                //console.log("clearing");
                //PageUtils.showDebug("clearing: " + target);
                // clear the last element.  This way, when we drag off the keyboard and then back on to the same
                // key then it will play again
                this.lastGroup = null;

            // check if the drag target has changed
            } else if (target.group != this.lastGroup) {
                ///console.log("playing");
                //PageUtils.showDebug("playing: " + target.className);
                // play the new note
                target.group.action(target.group);
                // save the target for later
                this.lastGroup = target.group;
            //} else {
            //    PageUtils.showDebug("same: " + target.className);
            }
            // otherwise, we're dragging on the same note we did before, so do nothing
        }

        // starting a drag and continuing the drag both do the same action
        onStart(e, target) {
            this.checkPlay(e, target);
        }

        onDrag(e, target) {
            this.checkPlay(e, target);
        }

        // when dropped, clear the target
        onDrop(e, target) {
            //console.log("storped");
            this.lastGroup = null;
        }
    }

    // just a single instance of this
    var scaleRollDragDropListener = new ScaleRollDragDropListener();

    // build a map from note fingerings to display notes for the given scale and chord mode
    function buildNoteMap(scaleMd, chordMode) {
        if (chordMode == null) {
            // no chord mode, just the normal single note fingerings and notes
            return scaleMd.notes;

        } else if (chordMode == "slap") {
            // for slap mode, convert the normal scale notes to a slap map
            var noteMap = {};
            // loop over the full chord note list
            for (var n = 0; n < Metadata.scaleChordOrder.length; n++) {
                // get the chord fingering
                var noteName = Metadata.scaleChordOrder[n];
                // use the custom slap note map if present for this shawzin + scale, otherwise use the default slap
                // mapping from chord fingerings to regular fingerings
                var note = scaleMd.slap.notes ? scaleMd.slap.notes[noteName] : scaleMd.notes[Metadata.slapMap[noteName]];
                // map the fingering to tone
                noteMap[noteName] = note;
            }
            // done with slap mode
            return noteMap;

        } else {
            // either one of the dual modes or the single mode.
            // set some parameters based on which mode
            var start, end, noteOffset;
            switch (chordMode) {
                case "a":
                    // mode A runs over the first half of the chords and its display maps to the first half of the
                    // regular notes
                    start = 0;
                    end = Metadata.scaleChordOrder.length / 2;
                    noteOffset = 0;
                    break;
                case "b":
                    // mode B runs over the second half of the chords and its display maps to the first half of the
                    // regular notes, requiring an offset
                    start = Metadata.scaleChordOrder.length / 2;
                    end = Metadata.scaleChordOrder.length;
                    noteOffset = -Metadata.scaleChordOrder.length / 2;
                    break;
                case "ab":
                    // mode AB runs over the entire chord set and its display mapes to the entire regular note set
                    start = 0;
                    end = Metadata.scaleChordOrder.length;
                    noteOffset = 0;
                    break;
            }

            var noteMap = {};
            // loop over the appropriate portion of the chord set
            for (var n = start; n < end; n++) {
                // get the fingering
                var noteName = Metadata.scaleChordOrder[n];
                // there are two cases for the display note napping
                var note;
                // check if there's a chord config and an explicit note mapping
                if (scaleMd.chords != "none" && scaleMd.chords[noteName].note) {
                    // use the explicit chord to display note mapping
                    note = scaleMd.chords[noteName].note;
                } else {
                    // get a chord fingering, offset if necessary
                    var offsetNoteName = Metadata.scaleChordOrder[n + noteOffset];
                    // use he default slap map to map that chord fingering to a regular note fingering, then get
                    // the corrdponding note from the scale
                    note = scaleMd.notes[Metadata.slapMap[offsetNoteName]];
                }
                // finally, map the fingering to tone
                noteMap[noteName] = note;
            }
            // that was a lot of work
            return noteMap;
        }
    }

    // build a coloring for the given note map, based on the map key fingerings
    function buildPianoColoring(noteMap) {
        // this will be an array with indices from 0 to 28
        // most of the indices will be null
        var colors = [];
        // loop over the scale notes
        for (var noteName in noteMap) {
            var note = noteMap[noteName];
            // find the full keyboard index of the scale note
            var index = Metadata.noteOrder.indexOf(note);
            // get the fret color for the note
            // todo: better way to get the fret and color
            var color = MetadataUI.fretToRollColors[noteName.split("-")[0]];
            // save the color to the array in the correct index
            colors[index] = color;
        }
        return colors;
    }

    // set the chord mode
    function setChordMode(mode) {
        // change check
        if (chordMode == mode) return;
        // save
        chordMode = mode;

        // update the chord mode buttons
        updateChordMode();
        // update the piano display
        rebuildPiano();
    }

    //
    function updateChordMode() {
        // get the scale metadata
        var scaleMd = getScaleMetadata();
        // todo: there's a code path that gets in here before everything is initialized
        if (!scaleMd) return;

        // translate null to "none" to make things easier
        var mode = chordMode ? chordMode : "none";
        // util function to enable/disable and show/hide a chord mode button
        function setChordButtonEnabled(suffix, enabled) {
            // get the button div
            var div = document.getElementById("roll-chord-button-" + suffix);
            // if it should be disabled, then hide it
            if (!enabled) {
                div.style.display = "none";
                // don't bother doing anything else
                return;
            }
            // Only one can be selected at a time
            var selected = suffix == mode;
            // set the image source depending on whether it's selected
            PageUtils.setImgSrc(div.children[0], "icon-chord-" + suffix + (selected ? "-selected" : "") + ".png");
            // make sure it's displayed
            div.style.display = "block";
        }

        // go through all the chord mode buttons
        // "none" chord mode is always enabled
        setChordButtonEnabled("none", true);
        // "a" and "b" buttons are enabled if the shawzin + scale is a dual chord type
        setChordButtonEnabled("a", scaleMd.config.chordtype == Metadata.chordTypeDual);
        setChordButtonEnabled("b", scaleMd.config.chordtype == Metadata.chordTypeDual);
        // "ab" button is enabled if the shawzin + scale is a single chord type
        setChordButtonEnabled("ab", scaleMd.config.chordtype == Metadata.chordTypeSingle);
        // "slap" button is enabled if the shawzin + scale is a slap type
        setChordButtonEnabled("slap", scaleMd.config.chordtype == Metadata.chordTypeSlap);

        // todo: show and implement the chord info popup
    }

    // rebuild the piano container and chord mode buttons for the chosen shawzin + scale
    function updateScale() {
        // reset the chord mode
        chordMode = null;
        // build the midi listeners for changing chord modes
        buildChordModeMidiListeners();
        // update and show/hide chord mode buttons
        updateChordMode();
        // rebuild the piano display
        rebuildPiano();
        // rebuild the key signature icon, if necessary
        updateKeySig();
    }

    // util function to get the current scale metadata
    function getScaleMetadata() {
        // get model properties
        var shawzin = Model.getShawzin();
        var scale = Model.getScale();
        // sanity check, then derefernce from metadata
        // todo: there's a code path that gets in here before everything is initialized
        return (shawzin && scale) ? Metadata.shawzinList[shawzin].scales[scale] : null;
    }

    function updateKeySig() {
        // get the current key signature
        var note = Model.getKeySig();

        // get the container div for the key signature marker icon
        var containerDiv = document.getElementById("keysig-icon");
        var offset = Piano.getPitchOffset(note);
        // if we're on the default key signagure, don't show the icon
        if (offset == 0) {
            containerDiv.style.display = "none";
            return;
        }

        // show the icon
        containerDiv.style.display = "block";

        // get the image base and display name
        var display = MetadataMusic.getKeySigDisplay(note);

        // set the icon image
        PageUtils.setImgSrc(document.getElementById("keysig-icon-img"), display.imgBase);
        // set the tooltip
        document.getElementById("keysig-icon-tooltip").innerHTML = `
            ${display.name}<br/>
            (${(offset > 0 ? "+" : "")}${offset} half-tones)
        `;
    }

    // class grouping together possible multiple clickable boxes for a single piano key and handling sound and
    // animation for that key
    class KeyGroup {
        constructor(noteName, boxStyleList) {
            this.noteName = noteName;
            this.boxStyleList = boxStyleList;
            // meh, just keep a list of the click boxes we create
            this.boxes = [];
        }

        // build the click boxes and add them to the UI
        buildBoxes() {
            for (var i = 0; i < this.boxStyleList.length; i++) {
                var boxStyle = this.boxStyleList[i];
                // create an invisible box div
                var box = document.createElement("div");
                // CSS
                box.className = "roll-keyboard-note";
                // set the position from the UI metadata
                box.style.left = boxStyle.left + "px";
                box.style.top = boxStyle.top + "px";
                box.style.width = boxStyle.width + "px";
                box.style.height = boxStyle.height + "px";
                // save a back reference the drag/drop listener can call it
                box.group = this;
                // setup the note div for drag/drop handling
                DragEvents.addDragDropListener(box, scaleRollDragDropListener);
                // add to the container
                rollKeyButtonDiv.appendChild(box);
                this.boxes.push(box);
            }
        }

        // play the sound and do the animation
        // did the event listener for this weird, so 'this' doesn't actually point to this object
        action(group) {
            // play the note immediately
            Playback.playNote(group.noteName);

            // put this in a function for closure
            function doPlay(boxStyle) {
                // create a new note box
                var playBox = document.createElement("div");
                // get the color for the play div
                // todo: better way to get the fret and color
                var color = MetadataUI.fretToRollColors[group.noteName.split("-")[0]];
                // set the css for the animation
                playBox.className = "roll-note playRollNote";
                // copy position from the original box, slightly modified for the animation
                // horizontal position is centered on the note center
                playBox.style.left = (boxStyle.left + (boxStyle.width/2))+ "px";
                // the rest is the same
                playBox.style.top = boxStyle.top + "px";
                playBox.style.width = boxStyle.width + "px";
                playBox.style.height = boxStyle.height + "px";
                playBox.style.backgroundColor = color;
                // add the animation element
                rollKeyButtonDiv.appendChild(playBox);

                // schedule cleanup for when the animation is done
                setTimeout(() => {
                    playBox.remove();
                }, 500);
            }

            for (var i = 0; i < group.boxStyleList.length; i++) {
                doPlay(group.boxStyleList[i]);
            }
        }
    }

    // rebuild the piano container for the given scale
    function rebuildPiano() {
        // get the scale metadata
        var scaleMd = getScaleMetadata();
        // todo: there's a code path that gets in here before everything is initialized
        if (!scaleMd) return;

        // build a mapping from note fingerings to display tones based on the current scale and chord type
        var noteMap = buildNoteMap(scaleMd, chordMode);

        // build a map of midi notes to boxes
        var midiMap = {};
        // get the note offset based on the key signature
        var midiNoteOffset = Piano.getPitchOffset(Model.getKeySig());

        // remove the old canvas/image element
        document.getElementById("roll-keyboard").remove();
        // build a new canvas with the correct key and scale coloring
        var newImage = Piano.buildPianoCanvas(Model.getKeySig(), 1, 1, buildPianoColoring(noteMap));
        // make sure we can find it later
        newImage.id = "roll-keyboard";
        // put it in the container
        document.getElementById("song-bar-roll").appendChild(newImage);

        // remove the old button container, if present
        if (rollKeyButtonDiv) {
            rollKeyButtonDiv.remove();
        }

        // create a button container
        rollKeyButtonDiv = document.createElement("div");
        // child elemnents are absolutely positioned
        rollKeyButtonDiv.style.position="relative;";
        // iterate over the scale notes
        for (var noteName in noteMap) {
            // get the absolute note name
            var note = noteMap[noteName];
            // get the position for the note box from the canvas,
            // indexed by the note's overall index in the full note order list
            var boxStyleList = newImage.boxStyles[Metadata.noteOrder.indexOf(note)];
            // create a key group
            var keyGroup = new KeyGroup(noteName, boxStyleList);
            // build the click boxes and add them to the container
            keyGroup.buildBoxes();

            // get the midi note number plus any offset
            var midiNote = MetadataUI.midiNoteC + Metadata.noteOrder.indexOf(note) + midiNoteOffset;
            // save to a map
            midiMap[midiNote] = keyGroup;
        }
        // add the button container to the piano roll header container
        document.getElementById("song-bar-roll").appendChild(rollKeyButtonDiv);

        // add chord mode listeners to the midi note map
        for (note in chordModeMidiMap) {
            midiMap[note] = chordModeMidiMap[note];
        }
        // update the midi listener with the new note map
        scaleMidiListener.setMidiNoteMap(midiMap);
    }

    function setTrackDirection(reverse) {
        // sanity check
        if (trackReversed == reverse) return;

        // get some buttons inside the trackbar that we will have to move
        var dirDiv = document.getElementById("track-direction");
        var switchFretsDiv = document.getElementById("trackbar-switch-frets");
        var switchStringsDiv = document.getElementById("trackbar-switch-strings");
        var chordDiv = document.getElementById("roll-chord-button");
        var chordInfoDiv = document.getElementById("roll-chord-info");

        // get the bar and track containers
        var songBarDiv = document.getElementById("song-bar");
        var songScrollDiv = document.getElementById("song-scroll");

        // "reverse" is when the note direction is bottom to top
        // this mirrors how the shawzin screen works, so it's actually the default
        if (reverse) {
            // change the direction button's image
            PageUtils.setImgSrc(dirDiv.children[0], "icon-dropup.png");
            // move the direction button to the top of the header bar
            dirDiv.style.top = "0px";
            dirDiv.style.bottom = "";
            // move the fret/string switch buttons to the bottom of the header bar
            switchFretsDiv.style.top = "";
            switchFretsDiv.style.bottom = "0px";
            switchStringsDiv.style.top = "";
            switchStringsDiv.style.bottom = "0px";

            PageUtils.setImgSrc(chordInfoDiv.children[0], "icon-chord-up.png");
            chordInfoDiv.style.top = "0px";
            chordInfoDiv.style.bottom = "";

            // remove the header bar entirely
            songBarDiv.remove();
            // insert the header bar after the scroll area
            DomUtils.insertAfter(songBarDiv, songScrollDiv);

        // "normal" is when the note direction is top to bottom
        // this mirrows how I think of things when I'm editing music
        } else {
            // change the direction button's image
            PageUtils.setImgSrc(dirDiv.children[0], "icon-dropdown.png");
            // move the direction button to the bottom of the header bar
            dirDiv.style.top = "";
            dirDiv.style.bottom = "0px";
            // move the fret/string switch buttons to the top of the header bar
            switchFretsDiv.style.top = "0px";
            switchFretsDiv.style.bottom = "";
            switchStringsDiv.style.top = "0px";
            switchStringsDiv.style.bottom = "";

            PageUtils.setImgSrc(chordInfoDiv.children[0], "icon-chord-down.png");
            chordInfoDiv.style.top = "";
            chordInfoDiv.style.bottom = "0px";

            // remove the header bar entirely
            songBarDiv.remove();
            // insert the header bar before the scroll area
            DomUtils.insertBefore(songBarDiv, songScrollDiv);
        }

        // save the setting
        trackReversed = reverse;
        // rebuild the track view
        Track.setReversed(reverse);
    }

    function updateControlScheme() {
        controlScheme = Model.getControlScheme();
        // update the fret images in the track bar
        for (i = 1; i <= 3; i++) {
            var img = document.getElementById("tab-note-fret-" + i);
            PageUtils.setImgSrc(img, controlScheme.frets["" + i].imgBase + "_w.png");
        }
        // update the string images in the track bar
        for (i = 1; i <= 3; i++) {
            var img = document.getElementById("tab-note-string-" + i);
            PageUtils.setImgSrc(img, controlScheme.strings["" + i].imgBase + "_w.png");
        }
    }

    function setShowFrets(newShowFrets) {
        // sanity check
        if (showFrets == newShowFrets) return;

        // show/hide the switch buttons
        var switchFretsDiv = document.getElementById("trackbar-switch-frets");
        var switchStringsDiv = document.getElementById("trackbar-switch-strings");
        switchFretsDiv.style.display = newShowFrets ? "none" : "inline-block";
        switchStringsDiv.style.display = newShowFrets ? "inline-block" : "none";

        // show or hide the string elements
        for (var i = 1; i <= 3; i++) {
            document.getElementById(`tab-string-${i}`).style.display = newShowFrets ? "none" : "inline-block";
        }
        // hide or show the fret elements
        for (var i = 0; i <= 3; i++) {
            document.getElementById(`tab-fret-${i}`).style.display = newShowFrets ? "inline-block" : "none";
        }

        // save the setting
        showFrets = newShowFrets;
    }

    function toggleFretEnabled(fret) {
        // get the current enabled value for the fret and invert it
        setFretEnabled(fret, !fretEnabled[fret]);
    }

    function setFretEnabled(fret, enabled) {
        // sanity check
        if (fretEnabled[fret] == enabled) return;
        // get the fret element
        var div = document.getElementById("tab-fret-" + fret);
        /// update the image source
        PageUtils.setImgSrc(div.children[0], "fret-" + (enabled ? "enabled-" : "") + fret + ".png");
        if (fret > 0) {
            // if it's fret 1-3, then disable the 0 fret
            setFretEnabled(0, false);
            // also switch the color of its control image
            div.children[1].className = enabled ? "tab-fret-button-enabled" : "tab-fret-button";
        } else {
            // if it's fret 0, disable the other three frets
            for (var f = 1; f < 4; f++) {
                setFretEnabled(f, false);
            }
            // no control image to update
        }
        // save the state
        fretEnabled[fret] = enabled;
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // MIDI stuff
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    class ScaleMidiListener extends MidiListener {
        constructor() {
            super();
            // map from midi notes to things with a play function
            this.midiNoteMap = null;
            // list of connected midi devices
            this.devices = [];
            // UI icon
            this.icon = null;
        }

        setMidiNoteMap(map) {
            // update the map when the scale changes
            this.midiNoteMap = map;
        }

        updateIcon() {
            if (this.devices.length == 0) {
                // if there are no connected midi devices but the icon is still there, remove it
                if (this.icon) {
                    // hide the icon
                    this.icon.style.display = "none";
                    // clear the reference
                    this.icon = null;
                }
            } else {
                // if there are connected midi devices but the icon is not there, add it
                if (!this.icon) {
                    // get the icon element
                    this.icon = document.getElementById("midi-icon");
                    // display it
                    this.icon.style.display = "block";
                }
                // update the alt text with the list of midi devices
                document.getElementById("midi-icon-tooltip").innerHTML = this.devices.join(", ");
            }
        }

        deviceOn(device) {
            console.log(device + ": on");
            DomUtils.addToListIfNotPresent(this.devices, device);
            this.updateIcon();
        }

        deviceOff(device) {
            console.log(device + ": off");
            DomUtils.removeFromList(this.devices, device);
            this.updateIcon();
        }

        noteOn(device, note) {
            //console.log(device + ": Note on: " + note);
            // pull out the corresponding play object, if any
            var box = this.midiNoteMap[note];
            if (box != null) {
                // play the note or enable/disable some chord mode
                box.action(box);
            }
        }

        noteOff(device, note) {
            //console.log(device + ": Note off: " + note);
            var box = this.midiNoteMap[note];
            if (box != null && box.unaction != null) {
                // disable some chord mode, if applicable
                box.unaction(box);
            }
        }

        pitchBend(device, value) {
            //console.log(device + ": Pitch bend: " + value);
            // todo: increment scale
        }
    }

    // just a single instance of this
    var scaleMidiListener = new ScaleMidiListener();

    function buildChordModeMidiListeners() {
        // get the scale metadata
        var scaleMd = getScaleMetadata();
        // todo: there's a code path that gets in here before everything is initialized
        if (!scaleMd) return;

        // get the note offset based on the key signature
        var midiNoteOffset = Piano.getPitchOffset(Model.getKeySig());

        // depends on the chord type of the shawzin + scale
        switch (scaleMd.config.chordtype) {
            case Metadata.chordTypeDual:
                chordModeMidiMap = buildChordHandlersDual(scaleMd, midiNoteOffset);
                break;

            case Metadata.chordTypeSingle:
                chordModeMidiMap = buildChordHandlersSingle(scaleMd, midiNoteOffset);
                break;

            case Metadata.chordTypeSlap:
                chordModeMidiMap = buildChordHandlersSlap(scaleMd, midiNoteOffset);
                break;
        }
    }

    function buildChordHandlersDual(scaleMd, midiNoteOffset) {
        var midiMap = {};
        // handling concurrent key presses takes some state management
        var aOn = false;
        var bOn = false;
        var lastDown = null;
        // take the current state and figure out what chord mode should be set
        function doSetChordModeDual() {
            // if both keys are pressed, use the one that was pressed last
            if (aOn && bOn) setChordMode(lastDown);
            // otherwise, use whichever one's pressed
            else if (aOn) setChordMode("a");
            else if (bOn) setChordMode("b");
            // no chord keys pressed
            else setChordMode(null);
        };
        // for dual chord type, add a listener on the Ab below the starting C for chord mode A
        midiMap[MetadataUI.midiNoteC + midiNoteOffset - 4] = {
            "action": function() {
                // set state
                aOn = true;
                lastDown = "a";
                // set the chord mode
                doSetChordModeDual();
            },
            "unaction": function() {
                // set state
                aOn = false;
                // set the chord mode
                doSetChordModeDual();
            },
        };
        // and a listener on the Bb below the starting C for chord mode B
        midiMap[MetadataUI.midiNoteC + midiNoteOffset - 2] = {
            "action": function() {
                // set state
                bOn = true;
                lastDown = "b";
                // set the chord mode
                doSetChordModeDual();
            },
            "unaction": function() {
                // set state
                bOn = false;
                // set the chord mode
                doSetChordModeDual();
            },
        };
        return midiMap;
    }

    function buildChordHandlersSingle(scaleMd, midiNoteOffset) {
        var midiMap = {};
        // for single chord type, add a listener on the Ab and Bb below the starting C that both switch on
        // chord mode AB
        // state management is just how many keys are pressed
        var downCountSingle = 0;
        // take the current state and figure out what chord mode should be set
        function doSetChordModeSingle() {
            // if at least one of the keys is pressed, set the chord mode
            if (downCountSingle > 0) setChordMode("ab");
            // otherwise, no chord mode
            else setChordMode(null);
        };
        var box = {
            "action": function() {
                // set state
                downCountSingle++;
                // set the chord mode
                doSetChordModeSingle();
            },
            "unaction": function() {
                // set state
                downCountSingle--;
                // set the chord mode
                doSetChordModeSingle();
            },
        };
        // just to be consistent with the dual chord type, eitehr Ab or Bb can be used to turn on chord mode
        midiMap[MetadataUI.midiNoteC + midiNoteOffset - 2] = box;
        midiMap[MetadataUI.midiNoteC + midiNoteOffset - 4] = box;
        return midiMap;
    }

    function buildChordHandlersSlap(scaleMd, midiNoteOffset) {
        var midiMap = {};
        // for slap chord type, every note up to an octave above the top of the scale and an octave below the
        // bottom of the scale can be used to enable the slap chord mode.
        // state management is just how many keys are pressed
        var downCountSlap = 0;
        // take the current state and figure out what chord mode should be set
        function doSetChordModeSlap() {
            // if at least one key is pressed, set the chord mode
            if (downCountSlap > 0) setChordMode("slap");
            // otherwise, no chord mode
            else setChordMode(null);
        };
        var box = {
            "action": function() {
                // set state
                downCountSlap++;
                // set the chord mode
                doSetChordModeSlap();
            },
            "unaction": function() {
                // set state
                downCountSlap--;
                // set the chord mode
                doSetChordModeSlap();
            },
        };
        // find the top tone of the scale, this takes some mapping
        var top = 0;
        for (noteName in scaleMd.notes) {
            var noteIndex = Metadata.noteOrder.indexOf(scaleMd.notes[noteName]);
            if (noteIndex > top) top = noteIndex;
        }
        // go up to an octave
        for (var n = 1; n <= 12; n++) {
            // below the scale
            midiMap[MetadataUI.midiNoteC + midiNoteOffset - n] = box;
            // above the scale
            midiMap[MetadataUI.midiNoteC + midiNoteOffset + top + n] = box;
        }
        return midiMap;
    }

    function updateTrackDirection() {
        setTrackDirection(Settings.isTrackReversed());
    }

    return {
        registerEventListeners: registerEventListeners,  // ()
        updateControlScheme: updateControlScheme, // ()
        updateScale: updateScale,  // ()
        updateShawzin: updateScale,  // ()
        updateTrackDirection: updateTrackDirection, // ()
    };
})();