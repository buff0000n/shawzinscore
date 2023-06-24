// lib for the control bar immediately on top of or below the track
var TrackBar = (function() {

    // track direction
    trackReversed = false;
    // show frets or strings
    showFrets = false;
    // tracking for which frets are enabled
    // this is just a toy for now, it doesn't do anything
    fretEnabled = [false, false, false, false];

    // keyboard div container, easier to rebuild if I keep track of a container
    rollKeyButtonDiv = null;

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
        });

        // event handler for the fret/string switch button
        var switchDiv = document.getElementById("trackbar-switch");
        switchDiv.addEventListener("click", () => {
            // invert the preference value
            var newShowFrets = !Settings.isShowFrets();
            // apply the new setting
            setShowFrets(newShowFrets);
            // save the new preference
            Settings.setShowFrets(newShowFrets);
        });

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
            this.lastTarget = null;
        }

        checkPlay(e, target) {
            //console.log(`checkplay: ${e.target.tagName}`);

            // check if the target isn't an enabled key element
            if (!target || !target.play) {
                //console.log("clearing");
                // clear the last element.  This way, when we drag off the keyboard and then back on to the same
                // key then it will play again
                this.lastTarget = null;

            // check if the drag target has changed
            } else if (target != this.lastTarget) {
                ///console.log("playing");
                // play the new note
                target.play(target);
                // save the target for later
                this.lastTarget = target;
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
            this.lastTarget = null;
        }
    }

    // just a single instance of this
    var scaleRollDragDropListener = new ScaleRollDragDropListener();

    class ScaleMidiListener extends MidiListener {
        constructor() {
            super();
            // map from midi notes to things with a play function
            this.midiNoteMap = null;
        }

        setMidiNoteMap(map) {
            // update the map when the scale changes
            this.midiNoteMap = map;
        }

        deviceOn(device) {
            // todo: some kind of UI indication that MIDI is a go?
            console.log(device + ": on");
        }

        deviceOff(device) {
            // todo: some kind of UI indication that MIDI is a no go?
            console.log(device + ": off");
        }

        noteOn(device, note) {
            //console.log(device + ": Note on: " + note);
            // pull out the corresponding play object, if any
            var box = this.midiNoteMap[note];
            if (box != null) {
                // play the note
                box.play(box);
            }
            // todo: chord enable/disable
        }

        noteOff(device, note) {
            //console.log(device + ": Note off: " + note);
            // todo: chord enable/disable
        }

        pitchBend(device, value) {
            //console.log(device + ": Pitch bend: " + value);
            // todo: increment scale
        }
    }

    // just a single instance of this
    var scaleMidiListener = new ScaleMidiListener();

    function playRollNote(box) {
        // get the note name from the UI element
        var noteName = box.noteName;
        // play the note immediately
        Playback.playNote(noteName);

        // pull the existing note box's style
        var noteBoxStyle = box.boxStyle;
        // create a new note box
        var playBox = document.createElement("div");
        // get the color for the play div
        // todo: better way to get the fret and color
        var color = MetadataUI.fretToRollColors[noteName.split("-")[0]];
        // set the css for the animation
        playBox.className = "roll-note playRollNote";
        // copy position from the original box, slightly modified for the animation
        // horizontal position is centered on the note center
        playBox.style.left = (noteBoxStyle.left + (noteBoxStyle.width/2))+ "px";
        // the rest is the same
        playBox.style.top = noteBoxStyle.top + "px";
        playBox.style.width = noteBoxStyle.width + "px";
        playBox.style.height = noteBoxStyle.height + "px";
        playBox.style.backgroundColor = color;
        // add the animation element
        rollKeyButtonDiv.appendChild(playBox);

        // schedule cleanup for when the animation is done
        setTimeout(() => {
            playBox.remove();
        }, 500);
    }

    // rebuild the piano container for the given scale
    function updateScale() {
        // get the shawzin and scale metadata
        var shawzin = Model.getShawzin();
        var scale = Model.getScale();
        var scaleMd = Metadata.shawzinList[shawzin].scales[scale];
        // get the base piano image path for the scale
        var src = scaleMd.config.img;

        // build a map of midi notes to boxes
        var midiMap = {};

        // set the base image on the existing image element
        var img = document.getElementById("roll-keyboard");
        PageUtils.setImgSrc(img, src);

        // remove the old button container, if present
        if (rollKeyButtonDiv) {
            rollKeyButtonDiv.remove();
        }

        // create a button container
        rollKeyButtonDiv = document.createElement("div");
        // child elemnents are absolutely positioned
        rollKeyButtonDiv.style.position="relative;";
        // iterate over the scale notes
        for (var noteName in scaleMd.notes) {
            // get the absolute note name
            var note = scaleMd.notes[noteName];
            // get the hard-coded set of position for the note from the UI metadata
            var boxStyle = MetadataUI.noteKeyboardBoxes[note];
            // create an invisible box div
            var box = document.createElement("div");
            // CSS
            box.className = "roll-keyboard-note";
            // set the position from the UI metadata
            box.style.left = boxStyle.left + "px";
            box.style.top = boxStyle.top + "px";
            box.style.width = boxStyle.width + "px";
            box.style.height = boxStyle.height + "px";
            // save the note name and metadata for the play function
            box.noteName = noteName;
            box.boxStyle = boxStyle;
            // save a play() function so the drag/drop listener can call it
            box.play = playRollNote;
            // setup the note div for drag/drop handling
            DragEvents.addDragDropListener(box, scaleRollDragDropListener);
            // add to the container
            rollKeyButtonDiv.appendChild(box);
            // get the midi note number
            var midiNote = MetadataUI.midiNoteC + Metadata.noteOrder.indexOf(note)
            // save to a map
            midiMap[midiNote] = box;
        }
        // add the button container to the piano roll header container
        document.getElementById("song-bar-roll").appendChild(rollKeyButtonDiv);
        // update the midi listener with the new note map
        scaleMidiListener.setMidiNoteMap(midiMap);
    }

    function setTrackDirection(reverse) {
        // sanity check
        if (trackReversed == reverse) return;

        // get some buttons inside the trackbar that we will have to move
        var dirDiv = document.getElementById("track-direction");
        var switchDiv = document.getElementById("trackbar-switch");
        //var chordDiv = document.getElementById("roll-chord-button");

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
            // move the fret/string switch button to the bottom of the header bar
            switchDiv.style.top = "";
            switchDiv.style.bottom = "0px";

            //PageUtils.setImgSrc(chordDiv.children[0], "icon-chord-up.png");

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
            // move the fret/string switch button to the top of the header bar
            switchDiv.style.top = "0px";
            switchDiv.style.bottom = "";

            //PageUtils.setImgSrc(chordDiv.children[0], "icon-chord-down.png");

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

        // find the switch button
        var switchDiv = document.getElementById("trackbar-switch");
        // change the image on the switch button accordingly
        PageUtils.setImgSrc(switchDiv.children[0], newShowFrets ? "icon-trackbar-switch-strings.png" : "icon-trackbar-switch-frets.png");

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
    

    //function selectChord() {
    //    console.log("select chord");
    //}

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

    return {
        registerEventListeners: registerEventListeners,  // ()
        updateControlScheme: updateControlScheme, // ()
        updateScale: updateScale,  // ()
    };
})();