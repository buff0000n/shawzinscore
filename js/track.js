// Lib handling the scrolling note tablature and piano roll section
var Track = (function() {

    // main scroll container
    var scroll = null;
    // container for the note tablature
    var tab = null;
    // container for the piano roll
    var roll = null;
    // track how big the currently viewable area is
    var viewHeight = null;
    // how many ticks are visible in the currently viewable area
    var visibleTicks = null;
    // distance between ticks in pixels
    var tickSpacing = MetadataUI.tickSpacing;
    // whether the note direction is top to bottom (false) or bottom to top (true)
    var reversed = false;

    // the key signature, used for changing the audio playback pitch and all the accompanying UI bits
    var keySig = null;

    // the initial 2.75 second blank bar at the beginning of the song
    var startBar = null;

    // the list of bars
    var bars = [];
    // total capacity of the created bars, in ticks
    var tickCapacity = 0;
    // and pixels
    var pixelCapacity = 0;
    // if there's no structure, bars are 2 seconds long
    var defaultBarTicks = 32;
    // number of ticks per bar
    var barTicks = null;
    // during playback, instead of scrolling so the playback marker is in the middle of the scroll area,
    // offset it so the middle of the scroll area is the playback marker plus some fraction of the visible ticks
    // this moves the playback marker nearer to the far border
    // todo: make this a set pixel distance from the border instead?
    var playbackOffset = 0.35;
    // hack: prevent out of control creaion of bars by having a delay between scrolling to the end and adding new bars
    var scrollThrottleMs = 250;
    // extra buffer to keep capacity ahead of the scrollbar
    var tickBuffer = (2 * scrollThrottleMs / 1000) * Metadata.ticksPerSecond;

    // hard-coded 2.75-second buffer at beginning
    // this is roughly how long the in-game player gives you after starting a song
    var tickOffset = Metadata.leadInTicks;

    // current song object
    var song = null;
    // playing flag
    var playing = false;
    // playback marker object
    var playbackMarker = null;
    // playback start marker object
    var playbackStartMarker = null;

    // copy of the setting
    var oldFretLayout = null;
    
    // whether Duviri mode is available to be enabled or disabled
    var duviriModeShown = false;
    // whether Duviri mode is enabled
    // todo: make this a persistent setting?
    var duviriModeOn = false;

    // opacity for notes that are being dragged
    var tempNoteOpacity = "50%";
    // basically the number of ticks before and after the cursor to search for a note
    var editNoteLength = 2;

    function registerEventListeners() {
        // set this directly to start with, before doing any layouts
        reversed = Settings.isTrackReversed();

        scroll = document.getElementById("song-scroll");
        tab = document.getElementById("song-scroll-tab");
        roll = document.getElementById("song-scroll-roll");

        // todo: figure out a better way to fix the weird loop that can happen when scrolling up in reversed mode too quickly
        // There's some built-in auto-scroll thing that can fight with this handler if it runs
        // immediately, or even when it runs later but doesn't wait long enough, causing a loop
        // where it keeps adding a new blank bar on every scroll event.  The only fix I've found is
        // to delay by a significant fraction of a second before handling the scroll event.
        // This has a nice side effect of not letting you scroll too far past the end of the song without noticing.
        var scrollTimeout = null;
        scroll.addEventListener("scroll", (e) => {
            // schedule a scroll handler if there isn't already one scheduled
            if (scrollTimeout == null) {
                scrollTimeout = setTimeout(() => {
                    // clear the timeout, the next scroll event will scheduled a new one.
                    scrollTimeout = null;
                    // actually handle the scroll
                    onscroll();
                }, scrollThrottleMs);
            }
        }, { passive: false });

        // resize listener on both the window viewport and the mobile visual viewport
        Events.addCombinedResizeListener(resize);

        // Editor object has its own listeners
        Editor.registerEventListeners();

        // initialize here
        oldFretLayout = Settings.getOldFretLayout();
        
        // duviri mode setup
        Events.setupCheckbox(document.getElementById("config-tab-duvirimode-input"), true);
        document.getElementById("config-tab-duvirimode-input").addEventListener("change", commitDuviriModeChange, { passive: false });
    }

    // lazily build a view object tied to the given note object
    function getView(note) {
        if (!note.view) {
            note.view = new NoteView(note);
        }
        return note.view;
    }

    // build or rebuild the view for the given song
    function setSong(newSong) {
        // check if we already have a song
        if (song) {
            // clear out the view of the old song
            for (var n = 0; n < song.notes.length; n++) {
                getView(song.notes[n]).clear();
            }
        }
        // clear all bars
        clearBars();
        // save the song
        song = newSong;
        // check to make sure there is a new song
        if (song) {
            // refresh the duviri mode button, if applicable
            updateDuviriModeShown();
            // build the start bar
            ensureTickCapacity(0);
            // build a view for each note
            for (var n = 0; n < song.notes.length; n++) {
                var noteView = getView(song.notes[n]);
                noteView.build();
            }
            // scroll to the beginning
            scrollToTick(0);
        }
    }

    function getBarTicks() {
        // lazily initialize this
        if (barTicks == null) {
            // check for structure
            var tempo = Model.getTempo();
            if (tempo == null) {
                // no structure, use the default 2-second bar length
                barTicks = defaultBarTicks;

            } else {
                // calculate the number of ticks per bar
                barTicks = ((60 * Metadata.ticksPerSecond) / tempo) * Model.getMeterTop();
            }
        }
        return barTicks;
    }

    // rebuild the entire view for the new structure
    function updateStructure() {
        // force recalculation of gar ticks
        barTicks = null;
        // get the current scroll tick
        var tick = getScrollTick();
        // reset the song, forcing a rebuild of note views and bars
        setSong(song);
        // make sure we can still scroll to the previous scroll tick
        ensureTickCapacity(tick);
        // scroll to the previous scroll tick
        scrollToTick(tick);
    }

    function setRollBackground() {
        // change the piano roll side's background image depending on key signature and whether editing is enabled
        roll.style.backgroundImage = "url('img2x/track/keys-bg-" + Model.getKeySig() + (Editor.isEditing() ? "-ticks" : "") + ".png')";
    }

    function setTabBackground() {
        // change the tab side's background image depending on whether editing is enabled
        tab.style.backgroundImage = "url('img2x/track/tab-bg" + (Editor.isEditing() ? "-ticks" : "") + ".png')";
    }

    // just rebuild the piano roll view when the shawzin or scale has changed
    function rebuildRollNotes() {
        // check if the key signature has changed
        if (Model.getKeySig() != keySig) {
            // change the piano roll side's background image
            setRollBackground();
            // we have to rebuild the piano roll from scratch because of the meaure dividing lines that are embedded in
            // each bar.
            updateStructure();

        } else {
            // sanity check
            if (song) {
                // clear each note's roll view and rebuild it
                for (var n = 0; n < song.notes.length; n++) {
                    var noteView = getView(song.notes[n]);
                    noteView.clearRoll();
                    noteView.buildRoll();
                }
            }
        }
    }

    function rebuildTabNotes() {
        // always set the tab background
        setTabBackground();
        // sanity check
        if (song) {
            // clear each note's tab view and rebuild it
            for (var n = 0; n < song.notes.length; n++) {
                var noteView = getView(song.notes[n]);
                noteView.clearTab();
                noteView.buildTab();
            }
        }
    }

    /// ugh
    function getHeight(elementId) {
        var element = document.getElementById(elementId)
        var bcr = element.getBoundingClientRect();
        return bcr.height;
    }

    // recalculate visible pixels and ticks when the window size has changed
    function resize(w, h) {
        var container = document.getElementById("song-container");
        container.style.height = h + "px";
        // FFS goddammit I'm drunk but why is it so hard to make this the right height with CSS
        scroll.style.height = (h - getHeight("song-toolbar") - getHeight("song-bar")) + "px";
        viewHeight = scroll.getBoundingClientRect().height;
        visibleTicks = Math.ceil(viewHeight / tickSpacing);
        // if we're playing, make sure the full track is onscreen
        if (playing) {
            showTrack();
        }
    }

    // handle the onscroll event from the main scrolling container
    function onscroll() {
        // get the updated y-coordinate of the top of the viewing area
        var scrollTop = scroll.scrollTop;
        //console.log("START scrollTop: " + scrollTop);
        // calculate the maximum viewable tick time, depending on direction
        var endTick = reversed
                      ? (tickCapacity - (Math.floor(scrollTop / tickSpacing)))
                      : (Math.ceil(scrollTop / tickSpacing) - tickOffset) + visibleTicks
                      ;

        // if it's past the end if the current capacity, make sure we have the bars to display the end tick time
        if (endTick >= tickCapacity - tickBuffer) {
            ensureTickCapacity(endTick);

        // if it's less than the capacity, check if we can trim some empty bars
        } else if (endTick < tickCapacity + tickBuffer && endTick > (song ? song.getEndTick() : 0)) {
            // check for notes present
            trimTickCapacity(endTick);
        }
        //console.log("END   scrollTop: " + scroll.scrollTop);

        Editor.scrollUpdated();
    }

    // set the playing flag and setup the UI
    function setPlaying(newPlaying) {
        // check
        if (playing == newPlaying) return;
        // set the flag
        playing = newPlaying;

        if (playing) {
            // disable scrolling on the tab/roll section while still allowing the page to be scrolled
            // with this one weird trick
            scroll.style.pointerEvents = "none";
            scroll.style.cursor = "unset";

            // make sure the full track is onscreen
            showTrack();
            // Some browsers have scroll lag that can keep it going after playback starts and scroll events
            // are disabled, unfortunately, it doesn't produce scroll events and I have no idea how to fix it
            // document.scrollingElement.addEventListener("scroll", showTrack, { passive: "false"});

        } else {
            scroll.style.pointerEvents = "unset";
            scroll.style.cursor = "pointer";

            //document.scrollingElement.removeEventListener("scroll", showTrack, { passive: "false"});
        }
    }

    function showTrack() {
        // get the track container element
        var container = document.getElementById("song-container");
        // get the page-level scroll element
        var se = document.scrollingElement;
        // get the bounds of the track container
        var bcr = container.getBoundingClientRect();
        // getBoundingClientRect is in terms of the visible window, convert to absolute global position using the scroll state
        var top = bcr.top + se.scrollTop;
        var left = bcr.left + se.scrollLeft;
        // scroll the main window so the track is in view
        se.scrollTo(left, top);
    }

    function updatePlaybackTick(tick) {
        // build a new playback marker if there isn't one
        if (playbackMarker == null) {
            playbackMarker = new PlaybackMarker(tick);
        } else {
            // update the existing playback marker
            playbackMarker.setPlayTick(tick);
        }
    }

    function clearPlaybackTick() {
        if (playbackMarker != null) {
            // clear the existing playback marker
            playbackMarker.clear();
            playbackMarker = null;
        }
    }

    function setPlaybackStartTick(tick) {
        // build a new playback start marker if there isn't one
        if (playbackStartMarker == null) {
            playbackStartMarker = new PlaybackStartMarker(tick);
        } else {
            // update the existing playback start marker
            playbackStartMarker.setPlayTick(tick);
        }
    }

    function getPlaybackStartTick() {
        // check for a playback start marker
        return playbackStartMarker != null ? playbackStartMarker.playTick : null;
    }

    function clearPlaybackStartTick() {
        if (playbackStartMarker != null) {
            // clear the existing playback marker
            playbackStartMarker.clear();
            playbackStartMarker = null;
        }
    }

    // scroll the view and the playback marker to match the given playback time, which can be in fractional ticks
    function setPlaybackTick(tick) {
        // update the marker position
        updatePlaybackTick(tick);
        // offset the center tick
        scrollToTick(tick + (visibleTicks * playbackOffset), true);
    }

    // scroll so the center of the view is on the given tick
    function scrollToTick(tick, smooth=false) {
        // scroll to location
        var pos = reversed
                  ? (tickCapacity - tick) * tickSpacing
                  : (tickOffset + tick) * tickSpacing;
        var halfHeight = (viewHeight/2);
        if (pos < halfHeight) {
            pos = halfHeight
        } else if (pos > (pixelCapacity - halfHeight)) {
            pos = pixelCapacity - halfHeight;
        }
        scroll.scrollTo(0, pos - halfHeight);
        // todo: Firefox's smooth scrolling is awesome but jesus christ Chrome's is either a train wreck or nonexistent
//        scroll.scrollTo({ top: (pos - halfHeight), behavior: (smooth ? "smooth" : "instant") });
    }

    // get the current center tick
    function getScrollTick() {
        // calculate half the view height in pixels
        var halfHeight = (viewHeight/2);
        // translate to tick position
        return getTickForScreenPosition(halfHeight);
    }

    function getTickForScreenPosition(y) {
        // calculate the absolute center view position in pixels
        var pos = scroll.scrollTop + y;
        // translate to ticks, depending on direction
        return tick = reversed
                  ? tickCapacity - (pos / tickSpacing)
                  : (pos / tickSpacing) - tickOffset;
    }

    // get the current playback tick position
    function getPlaybackTick() {
        return playbackMarker != null ? playbackMarker.playTick : null;
    }

    // get the current playback tick position
    function getPlaybackStartTick() {
        return playbackStartMarker != null ? playbackStartMarker.playTick : null;
    }

    // remove the playback marker
    function clearPlayback() {
        if (playbackMarker != null) {
            playbackMarker.clear();
            playbackMarker = null;
        }
    }

    // set the track direction, top to bottom (false) or bottom to top (true)
    function setReversed(newReversed) {
        // check if it's already set
        if (newReversed == reversed) {
            return
        }
        // set
        reversed = newReversed;
        // just rebuild the whole track
        setSong(song);
    }

    // add a new blank bar at the end of the song
    function insertBar() {
        // save this before we insert a bar.  Some browsers will automatically
        // fix the scroll location
        var scrollTop = scroll.scrollTop;
        // build a new bar object, which is a 2-element array of the tablature and piano roll bars
        var bar = [
            buildBar(false, "1-tab", "2-tab", null, null),
            buildBar(false, "1-roll-" + Model.getKeySig(), "2-roll", null, index=(bars.length + 1))
        ];

        if (reversed) {
            // for reversed direction, add the bar to the top of the container
            tab.prepend(bar[0]);
            roll.prepend(bar[1]);
        } else {
            // for "normal" direction, add the bar to the bottom of the container
            tab.append(bar[0]);
            roll.append(bar[1]);
        }

        // add the bar to the bar list
        bars.push(bar);
        // set some capacity properties on the containers
        bar[0].startTick = tickCapacity;
        bar[1].startTick = tickCapacity;
        // increment the overall capacity
        tickCapacity += bar[0].ticks;
        pixelCapacity += bar[0].ticks * tickSpacing;

        // todo: hinky
        // if direction is reversed, scroll down a bar so it looks like we haven't moved
        if (reversed) {
            scroll.scrollTo(0, scrollTop + (bar[0].ticks * tickSpacing));
        }
    }

    // remove a bar from of the song, if no bar is specified the remove the last one.
    function removeBar(bar=null) {
        // if no bar specified, get the last one
        if (!bar) {
            bar = bars.pop();
        }
        // remove the tablature and piano roll portions
        bar[0].remove();
        bar[1].remove();
        // decrement overall capacity
        tickCapacity = Math.max(0, tickCapacity - bar[0].ticks);
        pixelCapacity = Math.max(0, pixelCapacity - (bar[0].ticks * tickSpacing));
    }

    // remove all bars
    function clearBars() {
        // remove while there is still nonzero capacity
        while (tickCapacity > 0) {
            removeBar();
        }
        // remove the start bar
        if (startBar) {
            removeBar(startBar);
            startBar = null;
        }
    }

    // make sure the current capacity is at least as big as the given tick time
    function ensureTickCapacity(ticks) {
        // make sure the start bar is present
        if (!startBar) {
            buildStartBar();
        }
        //var count = 0;
        // add capacity while we're below the given tick
        while (tickCapacity <= ticks + tickBuffer) {
            //console.log("ensuring: " + tickCapacity + " > " + ticks + " + " + tickBuffer + " (" + (++count) + ")");
            insertBar();
        }
    }

    // make sure any extra capacity beyond the given tick plus the visible area is removed
    function trimTickCapacity(ticks) {
        //var count = 0;
        // remove capacity while it's beyond the given tick plus the visible area, and beyond the end of the song
        // Need to add a barTicks buffer to prevent thrashing on a measure boundary
        while (tickCapacity > ticks + visibleTicks + tickBuffer + getBarTicks()) {
            //console.log("trimming: " + tickCapacity + " < " + ticks + " + " + tickBuffer + " (" + (++count) + ")");
            removeBar();
        }
    }

    // get the bar containing the given tick time
    function getBarForTick(tick) {
        // check for < 0
        if (tick < 0) {
            return startBar;
        }
        // make sure we have capacity for the given tick
        ensureTickCapacity(tick);
        // calculate the corresponding bar using barTicks
        return bars[Math.floor(tick / getBarTicks())];
    }

    // build the start bar
    function buildStartBar() {
        // build the 2-element tablature and piano roll bar
        startBar = [
            buildBar(true, "1-tab", "2-tab", ticks=tickOffset, null),
            buildBar(true, "1-roll-" + Model.getKeySig(), "2-roll", ticks=tickOffset, null)
        ];
        // setup the bar properties
        startBar[0].startTick = -tickOffset;
        startBar[1].startTick = -tickOffset;
        // add to the container
        // this assumed the container is empty
        tab.appendChild(startBar[0]);
        roll.appendChild(startBar[1]);

        // add to the pixel capacity
        pixelCapacity = startBar[0].ticks * tickSpacing;
    }

    // build a meter structure delimiter image
    function buildMarker(png, top) {
        var marker = document.createElement("img");
        PageUtils.setImgSrc(marker, png);
        marker.className = "measure-marker";
        marker.style.top = top + "px";
        return marker;
    }

    // build either a tablature or piano roll bar
    function buildBar(first, pngSuffix1, pngSuffix2, ticks = null, index = null) {
        // bar div
        var div = document.createElement("div");
        div.className = "measure-spacer";

        // get the tempo, if any
        var tempo = Model.getTempo();

        // check if we have an explicit number of ticks or no structure
        if (ticks || !tempo) {
            // if we don't have an explicit number of ticks then use the default
            if (!ticks) ticks = getBarTicks();
            // set the div height.  This is the only thing that actually adds space to the scroll view
            div.style.height = (ticks * tickSpacing) + "px";
            // if this is the first bar, then add a delimiter at the top or bottom, depending on whether we're reversed or not
            // with no structure, this will be the only delimiter in the view
            if (first) {
                div.appendChild(buildMarker("track/measure-marker-" + pngSuffix1 + ".png", reversed ? 0 : ticks * tickSpacing));
            }
            // save the bar tick capacity to the container for some reason
            div.ticks = ticks;

        // otherwise we're building a structured bar
        } else {
            // calculate the ticks per beat from the tempo
            var ticksPerBeat = (60 * Metadata.ticksPerSecond) / tempo;
            // get the number of beats per measure
            var beats = Model.getMeterTop();
            // set the div height.  This is the only thing that actually adds space to the scroll view
            div.style.height = (beats * ticksPerBeat * tickSpacing) + "px";
            // add a starting major bar delimiter
            div.appendChild(buildMarker("track/measure-marker-" + pngSuffix1 + ".png", reversed ? 0 : ticks * tickSpacing));

            // add internal minor beat delimiters on each beat
            for (var b = 1; b < beats; b++) {
                div.appendChild(buildMarker("track/measure-marker-" + pngSuffix2 + ".png", b * ticksPerBeat * tickSpacing));
            }
            // todo: even more minor tick delimiters if the zoom is big enough?

            // add a measure number, if given
            if (index) {
                // create element and set style
                var indexElement = document.createElement("div");
                indexElement.className = reversed ? "measure-index-reversed" : "measure-index";
                // set the contents to the measure number
                indexElement.innerHTML = index;
                // add to bar
                div.appendChild(indexElement);
            }

            // save the bar tick capacity to the container for some reason
            div.ticks = getBarTicks(); // should be the same as ticksPerBeat * beats;
        }

        return div;
    }

    // huh
    function getNoteDisplayLength(note, noteLength, poly, temp=false, outline=false) {
        // common logic factored out to here
        // notes being dragged are their default length
        if (temp) return noteLength;
        // cursor is the length of the search size
        if (outline) return editNoteLength;

        // okay, so when a shawzin is some kind of monophonic then we need to trim each note so it ends when
        // the next one begins

        // nothing to do if the note is polyphonic, they can overlap
        if (poly == Metadata.polyTypePolyphonic) return noteLength;

        // find the next note that will cause the given one to end
        var nextNote = song.findNextNote(note, (note1, note2) => {
            if (note1.tick == note2.tick) {
                // for UI readability, if they start on the exact same tick then keep looking.
                // this prevents notes appearing as just horizontal lines with zero height
                return false;
            }
            // we need a filter object basically just for the Void's Song Shawzin
            return note2.tick - note1.tick < noteLength && (
                // if the poly type is monophonic, them just find the next note of any type
                (poly == Metadata.polyTypeMonophonic) ||
                // if the poly type is duophonic, i.e. void's song, then
                // if the note is a chord then find the next chord note, otherwise if the note is not
                // a chord then find the next non-chord note.  ffs.
                (poly == Metadata.polyTypeDuophonic && note1.isChord() == note2.isChord())
            );
        });
        // if we found a next note
        if (nextNote) {
            // check the next note's starting tick
            var nextTick = nextNote.tick - note.tick;
            // if the next note starts before the end of the given note then we need to trim the given note
            if (nextTick < noteLength) {
                // trim to the start of the next note
                return nextTick;
            }
        }
        // otherwise leave the note length alone.  I cannot believe how complicated this is.
        return noteLength;
    }

    // optimization
    var fretKeyList = ["", "1", "2", "3"];

    // object encapsulating both the tablature and piano roll views for a single note
    class NoteView {
        // display cases:
        //  - normal note
        //  - dragging note (temp)
        //  - ephemeral note (outline)
        constructor(note, temp=false, outline=false, selected=false, hover=false) {
            // store the note
            this.note = note;
            // style settings
            this.temp = temp;
            this.outline = outline;
            this.selected = selected;
            this.hover = hover;
            // errors flag
            this.hasErrors = false;
            // initialize the errors flag with the note's errors, if any
            this.setHasErrors(note.hasErrors());
            // backreference
            note.view = this;
            // containing bar
            this.bar = null;

            // tablature container
            this.tabDiv = null;
            // tablature elements
            this.dot = null;
            this.fret1 = null;
            this.fret2 = null;
            this.fret3 = null;

            // piano roll container
            this.rollRow = null;
            // list of piano roll elements
        }

        // build the tablature and piano roll views
        build() {
            this.buildTab();
            this.buildRoll();
        }

        // clear all views
        clear() {
            this.clearTab();
            this.clearRoll();
            this.bar = null;
        }

        // style update for selected note
        setSelected(newSelected) {
            if (newSelected == this.selected) return;
            this.selected = newSelected;
            this.updateStyle();
        }

        // style update for hovered note
        setHover(newHover) {
            if (newHover == this.hover) return;
            this.hover = newHover;
            this.updateStyle();
        }

        // style update for note with/without errors
        setHasErrors(newHasErrors) {
            if (newHasErrors != this.hasErrors) {
                this.hasErrors = newHasErrors;
                this.updateStyle();
            }
        }

        // get the bar container for the tablature elements (false) or piano roll elements (true)
        getBar(roll) {
            // lazily initialize the bar
            if (!this.bar) {
                this.bar = getBarForTick(this.note.tick, 0);
            }
            // return the correct one depending on the flag
            return this.bar[roll ? 1 : 0];
        }

        // update the display style of the note
        updateStyle() {
            // sanity check
            if (this.dot) {
                // tab side is a different image for the central dot
                PageUtils.setImgSrc(this.dot, this.getTabDotImage());
                // roll side is css styling on the box div
                for (var i = 0; i < this.rollRow.noteList.length; i+=2) {
                    this.styleRollDiv(this.rollRow.noteList[i]);
                }
            }
        }

        // determine which tab-side image to use for the central dot
        getTabDotImage() {
            // outline has jsut a single option and takes precedence
            return this.outline ? "tab-note-outline.png" :
                   // hovering has two options depending on whether there are errors
                   this.hover ?
                     this.hasErrors ? "tab-note-hover-error.png" : "tab-note-hover.png" :
                   // selected has two options depending on whether there are errors
                   this.selected ?
                     this.hasErrors ? "tab-note-selected-error.png" : "tab-note-selected.png" :
                   // default two options depending on whether there are errors
                   this.hasErrors ? "tab-note-selected-error.png" : "tab-note-dot.png";
        }

        // actually build the tablature elements
        buildTabNote(playing=false) {
            // we need the control scheme
            var controlScheme = Model.getControlScheme();
            // respect duviri mode for the displayed tab note
            var string = isDuviriModeOn() ? this.note.altString : this.note.string;

            // container div, absolutely positioned
            var div = document.createElement("div");
            div.style.position = "absolute";
            // set transparency if it's a temp note being dragged
            if (this.temp) {
                div.style.opacity = tempNoteOpacity;
            // otherwise, if this is a cursor note then disable events on it
            } else if (this.outline) {
                div.style.pointerEvents = "none";
                div.style.touchEvents = "none";
            }

            if (!playing) {
                // build a grab div
                this.tabGrab = document.createElement("div");
                this.tabGrab.className = "tab-grab";
                div.appendChild(this.tabGrab);

                this.tabGrab.noteView = this;
            }

            // build the central dot image
            var dot = dot = PageUtils.makeImage(this.getTabDotImage(), "centerImg");
            dot.classList.add("tab-dot");
            // CSS already centers this element, so center it on the position of the container
            dot.style.left = "0px";
            dot.style.top = "0px" ;
            // add the dot element
            div.appendChild(dot);

            // save the dot image if it's not a playing note
            if (!playing) {
                this.dot = dot;
            }

            // respect Duviri mode for the displayed tab note
            var noteFret = isDuviriModeOn() ? this.note.altFret : this.note.fret;
            // if there are no frets then the central dot is all that's displayed, unless oldFretLayout is enabled
            if (noteFret != "0" || oldFretLayout) {
                // css classes for the three dots, we need to center them differently
                // also depends on fret style
                var classes = oldFretLayout ? ["centerImg", "centerImg", "centerImg"] : ["leftImg", "bottomImg", "rightImg"];
                // offsets, depending on fret style
                var fretOffsets = oldFretLayout ? MetadataUI.tabFretOffsets_Old : MetadataUI.tabFretOffsets;
                // iterate over the three possible frets
                for (var i = 1; i <= 3; i++) {
                    // get the fret as a string
                    var fretKey = fretKeyList[i];
                    // fret image element
                    var fretImg;
                    // check if the fret spec contains the fret
                    if (noteFret.indexOf(fretKey) >= 0) {
                        // build the fret image and alt based on the control scheme
                        fretImg = PageUtils.makeImage(controlScheme.frets[fretKey].imgBase + "_s.png", classes[i - 1]);
                        fretImg.alt = controlScheme.frets[fretKey].altText;

                    } else {
                        // build a placeholder small dot image
                        fretImg = PageUtils.makeImage(MetadataUI.noFretImg, classes[i - 1])
                    }
                    // add a css class, I really gotta do some css cleanup
                    fretImg.classList.add("tab-dot");
                    // get the absolutely positioning offsets for the fret index
                    fretImg.style.left = fretOffsets[fretKey][0] + "px";
                    fretImg.style.top = fretOffsets[fretKey][1] + "px" ;
                    // add the fret element
                    div.appendChild(fretImg);
                }
            }

            // if it's not a cursor note then add the central string image
            if (!this.outline) {
                // build the string image and alt based on the control scheme
                var stringImg = PageUtils.makeImage(controlScheme.strings[string].imgBase + "_b.png", "centerImg");
                stringImg.alt = controlScheme.strings[string].altText + "\n";
                // more css
                stringImg.classList.add("tab-dot");
                // place on top of the central dot
                stringImg.style.left = "0px";
                stringImg.style.top = "0px" ;
                // add the string element
                div.appendChild(stringImg);
            }

            // position the central dot horizontally over top of the correct string line
            div.style.left = (MetadataUI.tabStringXOffsets[string]) + "px";
            // position the central dot vertically inside its bar, depending on the direction
            div.style.top = (reversed
                            ? ((this.getBar(0).startTick + this.getBar(0).ticks - this.note.tick) * tickSpacing)
                            : ((this.note.tick - this.getBar(0).startTick) * tickSpacing)
                            ) + "px";
            // that was fun
            return div;
        }

        buildTab() {
            // sanity check
            if (this.tabDiv) {
                this.clearTab();
            }
            // build the tablature element container
            this.tabDiv = this.buildTabNote();
            // add it to the bar
            this.getBar(0).append(this.tabDiv);
        }
    
        clearTab() {
            // sanity check
            if (this.tabDiv) {
                // remove the tablature container element
                this.tabDiv.remove();
                // clear references
                this.tabDiv = null;
            }
        }

        buildRollNoteDiv(name, length) {
            // The actual piano roll note is just a div box with a bunch of CSS
            var div = document.createElement("div");
            // set the horizontal position according to the metadata for the given absolute note name
            div.style.left = Piano.rollNoteOffset(Model.getKeySig(), name) + "px";
            // set the vertical position above the note position if we're reversed, otherwise set it to 0
            // note that this will be placed into a container that will determine the actual vertical position
            div.style.top = (reversed ? -(length * tickSpacing) : 0) + "px";
            // set the width
            div.style.width = Piano.rollNoteWidth + "px";
            // set the height based on the note length in ticks
            div.style.height = (length * tickSpacing) + "px";

            return div;
        }

        // set the CSS style on a roll note box div
        styleRollDiv(div) {
            // check if it's a cursor note
            if (this.outline) {
                // set just the border color
                div.style.borderColor = div.color;
                // disable events on this note
                div.style.pointerEvents = "none";
                div.style.touchEvents = "none";
            } else {
                // color the div background, this is what makes it show up
                div.style.backgroundColor = div.color;
                // set a border color to keep consecutive notes from merging together
                // color the div border
                div.style.borderColor = this.selected ?
                                        // selected notes are pink or white, depending on whether there's an error'
                                          this.hasErrors ? "#FFB0B0" : "#FFFFFF" :
                                        // default notes are red or gray, depending on whether there's an error'
                                          this.hasErrors ? "#FF0000" : "#202020";
                // hovered notes are slightly lighter
                div.style.filter = this.hover ? "brightness(250%) saturate(50%)" : "";
            }
        }

        // build a single piano roll note element
        buildRollNote(name, length, color) {
            var div = this.buildRollNoteDiv(name, length);
            // classname depends on whether it's outline mode
            div.className = this.outline ? "roll-note-outline" : "roll-note";
            div.color = color;
            this.styleRollDiv(div);
            // save for later
            div.noteName = name;
            div.noteLength = length;
            div.noteColor = color;
            div.noteView = this;
            // if it's a cursor div then we're done, no need for the grab element
            if (this.outline) {
                return [div];
            }

//            // hard-code grab box at 2 ticks of length, we have to balance easy selecting with the ability to put
//            // repeated notes close to each other
//            var grabDiv = this.buildRollNoteDiv(name, editNoteLength);
            // meh, it's too confusing when you can't grab anywhere on the note
            var grabDiv = this.buildRollNoteDiv(name, length);
            grabDiv.className = "roll-note-grab";
            grabDiv.noteView = this;

            return [div, grabDiv];
        }

        // take the given piano roll note div and build a corresponding animated play element
        buildBounceRollNote(rollNoteDiv) {
            // copy from the original
            var name = rollNoteDiv.noteName;
            var length = rollNoteDiv.noteLength;
            var color = rollNoteDiv.noteColor;

            // just a div with some CSS
            var div = document.createElement("div");
            // animation css entry
            div.className = "roll-note playRollNote";
            // the animation expands horizontally in both directions equally
            // this means we have to position it slightly differently from the other note
            // subtract half the width from the horizontal offset
            div.style.left = (Piano.rollNoteOffset(Model.getKeySig(), name) + (Piano.rollNoteWidth / 2)) + "px";
            // set the top, width, and height the same as the other version
            div.style.top = (reversed ? -(length * tickSpacing) : 0) + "px";
            div.style.width = Piano.rollNoteWidth + "px";
            div.style.height = (length * tickSpacing) + "px";
            // color
            div.style.backgroundColor = color;
            // no border color
            return div;
        }

        getRollNoteTop(bar, tick) {
            // hahaha what the hell
            return (reversed
                    ? ((bar.startTick + bar.ticks - tick) * tickSpacing)
                    : ((tick - bar.startTick) * tickSpacing)
                   );
        }

        // build the container for a row of piano roll notes
        buildRollRow() {
            // absolute positioning container
            var rollRow = document.createElement("div");
            rollRow.className = "roll-note-row";
            // horizontal position is always starts at the left border
            rollRow.style.left = "0px";
            // set the vertical position depending on the direction
            rollRow.style.top = this.getRollNoteTop(this.getBar(1), this.note.tick) + "px";
            // set transparency if it's a temp note
            if (this.temp) {
                rollRow.style.opacity = tempNoteOpacity;
            }

            return rollRow;
        }

        buildRoll() {
            // todo: optimize?
            // pull the shawzin and scale metadata
            var shawzinMd = Metadata.shawzinList[Model.getShawzin()];
            var scaleMd = shawzinMd.scales[Model.getScale()];
            // get the scale note name
            var noteName = this.note.toNoteName();
            // get the corresponding color for the note's frets
            // ignore Duviri mode for the displayed roll note
            var color = MetadataUI.fretToRollColors[this.note.fret];
            // length of the note will be filled in later
            var noteLength = null;

            // build the container
            var rollRow = this.buildRollRow();
            // start a list of notes
            var rollNoteList = [];

            // todo: this is a goddamned mess

            // check if it's a chord
            if (!this.note.isChord()) {
                // optionally trim the length of the note depending on polyphony rules and when the next note is
                noteLength = getNoteDisplayLength(this.note, shawzinMd.notes.length, shawzinMd.config.type, this.temp, this.outline);
                // not a chord, just one note
                // build the note element, pulling the absolute name of the note from the scale definition
                var rollNotes = this.buildRollNote(scaleMd.notes[noteName], noteLength, color);
                // add to the row and note list
                for (var i = 0; i < rollNotes.length; i++) {
                    var rollNote = rollNotes[i];
                    rollRow.appendChild(rollNote);
                    rollNoteList.push(rollNote);
                }

            } else if (scaleMd.config.chordtype == Metadata.chordTypeSlap) {
                // slap chord, still just a single note
                // optionally trim the length of the note depending on polyphony rules and when the next note is
                noteLength = getNoteDisplayLength(this.note, scaleMd.slap.length, shawzinMd.config.type, this.temp, this.outline);
                // pull the absolute name of the slap note from the scale definition if provided, otherwise using a
                // mapping from chord note to single note and using the regular scale note definition
                var rollNote0 = scaleMd.slap.notes ? scaleMd.slap.notes[noteName] : scaleMd.notes[Metadata.slapMap[noteName]];
                // build the note element
                var rollNotes = this.buildRollNote(rollNote0, noteLength, color);
                // add to the row and note list
                for (var i = 0; i < rollNotes.length; i++) {
                    var rollNote = rollNotes[i];
                    rollRow.appendChild(rollNote);
                    rollNoteList.push(rollNote);
                }

            } else {
                // oh god it's a chord
                // get the scale note name
                var chord = scaleMd.chords[noteName];
                // optionally trim the length of the notes depending on polyphony rules and when the next note is
                // this length applies to all notes in the chord
                noteLength = getNoteDisplayLength(this.note, chord.length, shawzinMd.config.type, this.temp, this.outline);
                // loop over each note in the chord
                for (var n = 0; n < chord.notes.length; n++) {
                    // look up the absolute note name
                    var rollNote0 = chord.notes[n];
                    // build the note element
                    var rollNotes = this.buildRollNote(rollNote0, noteLength, color);
                    // add to the row and note list
                    for (var i = 0; i < rollNotes.length; i++) {
                        var rollNote = rollNotes[i];
                        rollRow.appendChild(rollNote);
                        rollNoteList.push(rollNote);
                    }
                }
            }
    
            // save for later;
            rollRow.noteList = rollNoteList;
            this.rollRow = rollRow;
            // add to the bar
            this.getBar(1).append(this.rollRow);
        }
    
        clearRoll() {
            // sanity check
            if (this.rollRow) {
                // remove the element
                this.rollRow.remove();
                // clear references
                this.rollRow = null;
            }
        }

        play() {
            //console.log("playing " + this.note);

            // the animated tablature elements are a carbon copy of the regular ones
            // todo: do an actual copy instead of generating it again from scratcn?
            var tabDiv = this.buildTabNote(true);
            // Add a special animated css class that makes it expand and increase in transparency
            tabDiv.classList.add("playTabNote");
            // add to the bar
            this.getBar(0).appendChild(tabDiv);

            // the animated piano roll notes are different
            // build a container just like before
            var rollRow = this.buildRollRow();
            // we can skip a bunch of steps and create the animated elements based on the normal ones we already have
            // hack: just increment by 2 to skip over the grab boxes
            for (var i = 0; i < this.rollRow.noteList.length; i+=2) {
                // pull the entry
                var noteEntry = this.rollRow.noteList[i];
                // build a new animated note div
                var rollDiv = this.buildBounceRollNote(noteEntry)
                // add to the row
                rollRow.appendChild(rollDiv);
            }
            // add to the bar
            this.getBar(1).appendChild(rollRow);

            // schedule a cleanup to remove the animation elements when they're done
            setTimeout(() => {
                tabDiv.remove();
                rollRow.remove();
            // the animation takes half a second, it's really fast
            }, 500);
        }
    }

    // object encapsulating a playback marker and playback tracking
    class AbstractMarker {
        // playtick can be fractional
        constructor(playTick, tabImg, rollImg, className) {
            // build UI elements
            this.build(tabImg, rollImg, className);
            // current bar
            this.bar = null;
            // initialize the playback location
            this.setPlayTick(playTick);
        }

        build(tabImg, rollImg, className) {
            // tablature side with the circles
            this.tabImg = PageUtils.makeImage("track/" + tabImg, "centerYImg " + className);
            this.tabImg.style.left = "0px";

            // piano roll side is just a line
            this.rollImg = PageUtils.makeImage("track/" + rollImg, "centerYImg " + className);
            this.rollImg.style.left = "0px";
        }

        // playtick can be fractional
        setPlayTick(playTick) {
            // update
            this.playTick = playTick;
            // get the current bar
            var newBar = getBarForTick(this.playTick);
            // move to the new bar if necessary
            if (newBar != this.bar) {
                // update the bar
                this.bar = newBar;
                // remove tablature and piano roll elements from the old bar and add them to the new one
                this.tabImg.remove();
                this.rollImg.remove();
                // sanity check
                if (this.bar) {
                    this.bar[0].appendChild(this.tabImg);
                    this.bar[1].appendChild(this.rollImg);
                }
            }
            // sanity check
            if (this.bar) {
                // set the position based on what the direction is
                var top = (reversed
                          // O.o
                          ? ((this.bar[0].startTick + this.bar[0].ticks - this.playTick) * tickSpacing)
                          : ((this.playTick - this.bar[0].startTick) * tickSpacing)
                          ) + "px";
                // same position for both elements, they're centered vertically on the tick location
                this.tabImg.style.top = top;
                this.rollImg.style.top = top;
            }
        }

        clear() {
            // cleanup
            this.tabImg.remove();
            this.rollImg.remove();
        }
    }

    // normal playback marker, takes care of animating bar/roll notes
    class PlaybackMarker extends AbstractMarker {
        // playtick can be fractional
        constructor(playTick) {
            // init common stuff
            super(playTick, "play-marker-tab.png", "play-marker-roll.png", "playback-marker");
            // get the next note that will be played from our starting tick
            this.nextNote = song.getFirstNoteAfter(Math.ceil(this.playTick));
        }

        setPlayTick(tick) {
            // update UI
            super.setPlayTick(tick);

            // given the current playback tick, find any notes that were passed since the last note was played
            // and play their animations
            while (this.nextNote != null && this.nextNote.tick <= this.playTick) {
                // play the tablature and piano roll animations
                this.nextNote.view.play();
                // advance to the next note
                this.nextNote = this.nextNote.next;
            }
        }
    }

    // playback start marker, just makes a spot where playback starts
    class PlaybackStartMarker extends AbstractMarker {
        // playtick can be fractional
        constructor(playTick) {
            // init common stuff
            super(playTick, "measure-marker-playback-start.png", "measure-marker-playback-start.png", "playback-start-marker");
            // that's it
        }
    }

    // let's encapsulate editor functions
    var Editor = (function() {
        // editing enabled flag
        var editing = false;
        // recording flag
        var recording = false;

        // editor state flags
        var tabEnabled = false;
        var rollEnabled = false;
        // which frets are enabled
        var fretsEnabled = [false];

        function registerEventListeners() {
            // mouse listeners on the whole track area
            scroll.addEventListener("mousedown",  (e) => { handleDownEvent(Events.mouseEventToMTEvent(e)); }, { "passive": false } );
            scroll.addEventListener("mousemove",  (e) => { handleMoveEvent(Events.mouseEventToMTEvent(e)); }, { "passive": false } );
            scroll.addEventListener("mouseup",    (e) => { handleUpEvent(Events.mouseEventToMTEvent(e));   }, { "passive": true  } );
            scroll.addEventListener("mouseleave", (e) => { handleOutEvent(Events.mouseEventToMTEvent(e));  }, { "passive": true  } );

            // touch listeners on the whole track area
            // todo: these don't work that great
            scroll.addEventListener("touchstart", (e) => {
                // convert
                var e2 = Events.touchEventToMTEvent(e);
                // if there's only one touch, then treat it like a mouse down event
                if (e.touches.length == 1) {
                    handleDownEvent(e2);
                }
            }, { "passive": false});
            scroll.addEventListener("touchmove", (e) => {
                // convert
                var e2 = Events.touchEventToMTEvent(e);
                // if there's only one touch, then treat it like a mouse move event
                if (e.touches.length == 1) {
                    handleMoveEvent(e2);
                }
            }, { "passive": false } );
            scroll.addEventListener("touchend", (e) => {
                // convert
                var e2 = Events.touchEventToMTEvent(e);
                // if there are no touches left and there was a previous edit event then treat it like a mouse up event
                // plus a mouse leave event
                if (e.touches.length == 0 && editEvent) {
                    handleUpEvent(e2);
                    handleOutEvent(e2);
                }
            }, { "passive": true});
        }

        // toggle editing enabled
        function setEditing(newEditing) {
            // check for change
            if (newEditing == editing) return;

            // set a local flag
            editing = newEditing;

            // get the track area
            var songScroll = document.getElementById("song-scroll");
            if (editing) {
                // remove the blanket pointer cursor from the track area, now only certain areas should have pointer cursors
                songScroll.classList.remove("cursor-pointer");

            } else {
                // reinstate the blanket pointer cursor from the track area
                songScroll.classList.add("cursor-pointer");
            }

            // change the track backgrounds
            setRollBackground();
            setTabBackground();
            // show or don't show the fret buttons in the track bar
            TrackBar.setShowFrets(editing);

            // update fret-related state
            editingUpdated();
        }

        // getter for flag
        function isEditing() {
            return editing;
        }

        function editingUpdated() {
            // that's a pretty fancy way to determine if any fret flags are true
            var anyFretEnabled = fretsEnabled.reduce((a, b) => a || b);
            // if there are any enabled frets then the tab side is enabled
            var newTabEnabled = editing && anyFretEnabled;
            // if there are no enabled frets then the roll side is enabled
            var newRollEnabled = editing && !anyFretEnabled;

            // update flags
            tabEnabled = newTabEnabled;
            rollEnabled = newRollEnabled;

            // rerun the last edit event to update the track UI
            rerunEditEvent();
        }

        function updateFrets(newFretsEnabled) {
            // sanity check
            if (!ObjectUtils.listEquals(fretsEnabled, newFretsEnabled)) {
                // enable/disable frets
                fretsEnabled = newFretsEnabled;
                // update fret-related state
                editingUpdated();
            }
        }

        function convertFretsEnabledToFretString(fe = fretsEnabled) {
            // null check
            if (!fe) return "";
            // convert an enabled frets boolean array to a fret string
            var fretsEnabledString = "";
            for (var i = 0; i < fe.length; i++) {
                if (fe[i]) fretsEnabledString += i;
            }
            return fretsEnabledString;
        }

        // rerun the last edit event to update the track UI
        function rerunEditEvent() {
            // check if there was a last edit event
            if (editEvent) {
                // recalculate event target
                editEvent.target = document.elementFromPoint(editEvent.clientX, editEvent.clientY);
                // handle event again, with flags set to treat it like a move event
                handleEditEvent(editEvent);
            }
        }

        function setPlaybackBar(e, tick=getTickForEvent(e)) {
            if (tick != null) {
                // clear any existing playback marker
                clearPlaybackTick();
                // create a new playback marker
                updatePlaybackTick(tick);
                // also create a playback start marker.  Playback will start here until the user rewinds or clicks
                // somewhere else
                setPlaybackStartTick(tick);
            }
        }

        function handleDownEvent(e) {
            // if we're editing then call the edit event handler
            if (editing) {
                handleEditEvent(e, true, false, false);
                // prevent default handlers
                e.preventDefault();

            } else {
                // otherwise just set the playback bar location
                setPlaybackBar(e);
            }
        }

        function handleUpEvent(e) {
            // if we're editing then call the edit event handler
            if (editing) {
                handleEditEvent(e, false, true, false);
                // allow default handlers to also run
                // I forget why we do this
                //e.preventDefault();
            }
        }

        function handleMoveEvent(e) {
            // if we're editing then call the edit event handler
            if (editing) {
                handleEditEvent(e, false, false, false);
                // prevent default handlers
                e.preventDefault();
            }
        }

        function handleOutEvent(e) {
            // if we're editing then call the edit event handler
            if (editing) {
                handleEditEvent(e, false, false, true);
                // allow default handlers to also run
            }
        }
        
        ////////////////////////////////////////////////////////////////
        // event handler meat
        ////////////////////////////////////////////////////////////////

        // we need a shitload of state

        // last edit event
        var editEvent = null;

        // enum constants representing the two editor sides
        var sideTab = "t";
        var sideRoll = "r";

        // state for the note currently being edited
        // the current tick
        var editTick = null;
        // the current note name
        var editNoteName = null;
        // the current note object
        var editNote = null;
        // whether the current note is brand new or an edited existing note
        var editNoteNew = null;
        // the editor side where editing started
        var editNoteSide = null;
        // the vertical offset where the current note was clicked
        var editNoteOffsetTick = null;
        // todo: horiontal offset for chords
//        var editNoteOffsetNoteName = 0;

        // state for the original note, if we're editing an existing note or adding a new one
        // original note object
        var originalNote = null;
        // whether the original note was new or an existing note
        var originalNoteNew = false;
        // side where the original note was clicked
        var originalNoteSide = null;
        // the vertical offset where the original note was clicked
        var originalNoteOffsetTick = 0;
        // todo: horizontal offset for chords
//        var originalNoteOffsetNoteName = 0;
        // whether the current note has been moved off the original note in any direction
        var originalNoteHasMoved = false;

        // editing state flags
        // whether we're currently dragging a note
        var isDragging = false;
        // whether the current note was dragged outside the track area
        var isDragPaused = false;
        // whether the last event was outside the track area, it can happen apparently
        var isOutside = true;
        // whether the cursor is currently inside the active side of the track area
        var isInsideActive = false;

        // get the tick and note name positions of the edit event
        function updateEditTickNoteName() {
            // get the tick position of the event
            // there are issues with detecting when we leave the boundary through coordinates alone, so
            // short-circuit if we know it's an out event.
            editTick = editEvent.clientY == null ? null : getTickForEvent(editEvent);
            // if there's an original note, then add the tick offset
            if (editTick != null && originalNote) {
                editTick += originalNoteOffsetTick;
            }
            // if there's a tick for the event then get the note name for the event
            editNoteName = (editTick != null) ? getNoteNameForEvent(editEvent) : null;
            // todo: originalNoteOffsetNote

            // completely outside the track element
            isOutside = editTick == null;
            // inside the active side of the track element
            isInsideActive = editNoteName != null;
            // if we're not outside, set the edit side and invert if on the non-active side
            editNoteSide = isOutside ? null : getCurrentEditSide(!isInsideActive);
        }

        // temporarily update the trackbar fret/chord mode for the current event
        function updateTrackBarMode() {
            // oh boy.  To prevent infinite loops, temporarily clear out the edit event
            var t = editEvent;
            editEvent = null;
            // set the trackbar fret/chord mode based on the original note
            setTrackBarMode(originalNote, originalNoteSide);
            // restore the edit event
            editEvent = t;
            // recalculate the current tick and node name positions
            updateEditTickNoteName();
        }

        // revert the trackbar fret/chord mode temporary settings
        function revertTrackBarMode() {
            // Cripes.  To prevent infinite loops, temporarily clear out the edit event
            var t = editEvent;
            editEvent = null;
            // revert the trackbar fret/chord mode
            resetTrackBarMode();
            // restore the edit event
            editEvent = t;
            // recalculate the current tick and node name positions
            updateEditTickNoteName();
        }

        // wrapper for starting an undo combo
        function startAction() {
            Undo.startUndoCombo();
        }

        // wrapper for ending an undo combo and checking for errors
        function endAction(name) {
            if (!Undo.endUndoCombo(name)) {
                console.log("Error finishing " + name + " operation");
                console.trace();
            }
        }

        // wrapper for canceling an undo combo and checking for errors
        function cancelAction() {
            if (!Undo.cancelUndoCombo()) {
                console.log("Error canceling undo");
                console.trace();
            }
        }

        // get the currently active editor side, or the opposite of that if specified
        function getCurrentEditSide(inverse=false) {
            // holy crap ladies and gentlemen, it's an XOR
            return (tabEnabled ^ inverse) ? sideTab : sideRoll;
        }

        // build a new editor note, taking into account whether we're in Duviri mode and
        // which side of the track we're editing on
        function buildNewEditNote(newEditNoteName, newEditTick) {
            // check if we're editing an duviri-mode note
            if (originalNote && originalNote.hasAlt()) {
                // if we're on the tab side and duviri mode is enabled
                if (getCurrentEditSide() == sideTab && isDuviriModeOn()) {
                    // then create a new note with the original's normal note, and the editor's
                    // note as the alt note.
                    return new Note(originalNote.toNoteName(), newEditTick, newEditNoteName);
                } else {
                    // otherwise, we're either on the roll side or duviri mode is not enabled.
                    // create a new note with the editor's note, and the original's alt note as the alt note.
                    // editing a duviri-mode note without duviri mode enabled cannot modify the alt note.
                    return new Note(newEditNoteName, newEditTick, originalNote.toAltNoteName());
                }
            } else {
                // normal case, doesn't have an alt note
                return new Note(newEditNoteName, newEditTick);
            }
        }

        // build a new cursor edit note
        function setTempEditNote() {
            // clear any previous edit note
            clearEditNote();
            // build a new note
            editNote = buildNewEditNote(editNoteName, editTick);
            // it's new
            editNoteNew = true;
            // save the side
            editNoteSide = getCurrentEditSide();
            // no offset tick, this is directly under the cursor
            editNoteOffsetTick = 0;
            // create a new view on top of the edit note
            var view = new NoteView(editNote, false, true);
            // build the view, this associates itself with the note
            view.build();
        }

        // set the current note to an existing note and put it in hover mode
        function setHoverEditNote(hoverNote, side=getCurrentEditSide()) {
            // check to see if it's a change
            if (hoverNote != editNote || side != editNoteSide) {
                // clear any previous edit note
                clearEditNote();
                // save the existing note as the new edit note
                editNote = hoverNote;
                // not a new note
                editNoteNew = false;
                // save the side
                editNoteSide = side;
                // set the note style
                editNote.view.setHover(true);
            }
            // do this every time because the offset can change while still hovering over the same note
            editNoteOffsetTick = hoverNote.tick - editTick;
        }

        // set the current note to a dragging note
        function setDragEditNote() {
            // clear any previous edit note
            clearEditNote();
            // build a new note
            editNote = buildNewEditNote(editNoteName, editTick);
            // it's a new note
            editNoteNew = true;
            // save the side
            editNoteSide = getCurrentEditSide();
            // copy the offset from the original note, presumably the original note that was dragged
            editNoteOffsetTick = originalNoteOffsetTick;
            // create a new view on top of the edit note
            var view = new NoteView(editNote, true, false);
            // build the view, this associates itself with the note
            view.build();
        }

        // clear out the current edit note
        function clearEditNote() {
            // check if there is an edit note and a view
            if (editNote && editNote.view) {
                if (editNoteNew) {
                    // if it's a new note then remove the view
                    editNote.view.clear();
                } else {
                    // otherwise it's an existing note, so unset the hover style
                    editNote.view.setHover(false);
                }
            }
            // clear out the reference
            editNote = null;
        }

        // copy the edit note to the original note in anticipation of dragging it
        function initOriginalNote() {
            // copy note reference
            originalNote = editNote;
            // copy flags
            originalNoteNew = editNoteNew;
            originalNoteSide = editNoteSide;
            originalNoteOffsetTick = editNoteOffsetTick;
            // reset the moved flag
            originalNoteHasMoved = false;
        }

        function clearOriginalNote() {
            // reset references and flags
            originalNote = null;
            originalNoteNew = null;
            originalNoteSide = null;
            originalNoteOffsetTick = null;
            originalNoteHasMoved = false;
        }

        // determine if two notes are equal
        function notesEqual(n1, n2) {
            // Note.equals() just compares the note name
            return n1.tick == n2.tick && n1.equals(n2);
        }

        // determine if a note is equal to the current edit cursor position
        function noteEqualToCurrentPosition(n) {
            // short circuit
            if (n == null || editTick != n.tick) return false;
            // check equality
            return noteEqualToCurrent(n);
        }

        // checking note equality depends on the current state of duviri mode
        function noteEqualToCurrent(n) {
            // if we're editing on the tab side and duviri mode is on and the
            // given note has an alt note, then check against it alt note.
            if (getCurrentEditSide() == sideTab && isDuviriModeOn() && n.hasAlt()) {
                return editNoteName == n.toAltNoteName();
            } else {
                // otherwise, check against the normal note.
                return editNoteName == n.toNoteName();
            }
        }

        // ugh, after all that we still need a stopgap to prevent infinite loops
        var handlingEditEvent = false;

        // Main event handler
        // I went through several iterations before just putting everything in a single function with a million cases
        function handleEditEvent(e, isDownEvent=false, isUpEvent=false, isOutEvent=false) {
            // haha, shit, we have to prevent recursive calls coming from changing the fret/chord mode
            // and undoing/redoing edit actions
            if (handlingEditEvent) {
                return;
            }
            handlingEditEvent = true;

            try {
                // save the last edit event
                editEvent = e;
                // button state
                var isButtonDown = isUpEvent ? false : isDownEvent ? true : e.buttons == 1;

                // hax: signify that this event takes place outside the track area
                // we can do this because it's a our own event wrapper object
                if (isOutEvent) {
                    editEvent.clientY = null;
                }
                // update the current tab/note name position
                updateEditTickNoteName();

                // enable this for ludicrous debug logging
                //console.log("Event at " +
                //        editTick + ":" + editNoteName + "(" + editNoteOffsetTick + ") " +
                //        (isDownEvent ? "(down) " : isUpEvent ? "(up) " : isOutEvent ? "(out) " : "(move) ") +
                //        (isButtonDown ? "(buttonDown) " : "" ) +
                //        (isDragging ? "(dragging) " : "" ) +
                //        (isDragPaused ? "(dragPaused) " : "" ) +
                //        (isOutside ? "(outside) " : "" ) +
                //        (isInsideActive ? "(insideActive) " : "" )
                //);

                if (!isInsideActive) {
                    if (isDragging) {
                        // Case: not inside the active editor side, but currently dragging
                        // Action: cancel any note edits and pause the drag operation until the cursor enters the
                        // active side again, or appears in the inactive side with no buttons pressed

                        //console.log("pausing edit");
                        // remove last Edit Note
                        clearEditNote();
                        // cancel undo combo
                        // this should also re-add any note that was removed
                        cancelAction();
                        // pause drag
                        isDragging = false;
                        isDragPaused = true;
                        // if it's totally outside the edit area then reset any trackbar mode changes
                        if (isOutside) {
                            revertTrackBarMode();
                        }
                    } else {
                        // Case: not inside the active editor side, not dragging anything
                        // Action: clear the cursor edit note
                        clearEditNote();
                    }
                }

                if (isOutside) {
                    // Case: completely outside the edit area, possibly having just canceled a drag operation
                    // Action: we're done

                    //console.log("outside");
                    // nothing
                    return;
                }

                if (isDragPaused) {
                    if (isButtonDown && originalNoteSide == editNoteSide) {
                        // Case: Dragging is paused, but inside the active edit side with the button down
                        // Action: resume dragging

                        // start undo combo
                        startAction();
                        // remove originalNote from song if not new
                        if (!originalNoteNew) {
                            removeNote(originalNote);
                        }
                        // setTrackBarMode
                        updateTrackBarMode();
                        // unpause drag
                        isDragPaused = false;
                        isDragging = true;

                    } else if (!isButtonDown) {
                        // Case: Dragging is paused, but inside either side of the edit area with no buttons down
                        // Action: completely cancel the drag operation

                        // clear out the original note
                        originalNote = null;
                        originalNoteOffsetTick = 0;
                        // cancel drag
                        isDragPaused = false;
                        // reset any trackbar mode changes
                        revertTrackBarMode();
                    }

                    if (isDragPaused) {
                        // Case: Dragging is still paused, on the inactive side of the edit area
                        // Action: we're done

                        return;
                    }
                }

                if (isDragging && isInsideActive) {
                    // Case: dragging and in the active side of the editor
                    // Action: handle drag movement

                    // check to see if the current position has moved from the current edit note
                    if (!noteEqualToCurrentPosition(editNote)) {
                        // if there was no previous edit note, or the current position has moved
                        // to a different note name, then play audio for the new note name
                        if (editNote == null || !noteEqualToCurrent(editNote)) {
                            // if we're editing on the tab side and duviri mode is enabled and the current note has
                            // an alt then use the edit note's normal note, copied from the original note
                            if (getCurrentEditSide() == sideTab && isDuviriModeOn() && editNote.hasAlt()) {
                                playNoteName = editNote.toNoteName();
                            } else {
                                // otherwise just play what the cursor is pointing at
                                playNoteName = editNoteName;
                            }
                            Playback.playNote(playNoteName);
                        }
                        // build or rebuild a drag note under the cursor
                        setDragEditNote();
                    }

                    if (isButtonDown) {
                        // Case: active dragging and the button is still down
                        // Action: record if there's be any movement away from the original

                        if (!notesEqual(originalNote, editNote)) {
                            originalNoteHasMoved = true;
                        }

                    } else {
                        // Case: active dragging and the button is up
                        // Action: finish the drag operation

                        // reset the original offset, gotta do it somewhere
                        originalNoteOffsetTick = 0;
                        if (!originalNoteNew && notesEqual(originalNote, editNote)) {
                            // Case: Drag operation finished where it started
                            // Action: cancel the drag operation, add the original note back, and possibly
                            // open the note menu if there was no movement

                            // cancel undo combo, this will also add the original note back
                            cancelAction();
                            // reset any trackbar mode changes, do this before we show the note menu
                            // because some things depend on the original state of the fret buttons
                            revertTrackBarMode();
                            // check if there's any movement away from the original
                            if (!originalNoteHasMoved) {
                                // note menu
                                noteMenu(editEvent, originalNote);
                            }

                        } else {
                            // Case: Drag operation finished at a new location
                            // Action: add a new note

                            // create new note from editNote
                            var newNote = new Note(editNote.toNoteName(), editNote.tick, editNote.toAltNoteName());
                            // remove editNote
                            clearEditNote();
                            // fully add note
                            addNote(newNote);
                            // end undo combo
                            endAction(originalNoteNew ? "Create Note" : "Modify Note");
                            // reset any trackbar mode changes
                            revertTrackBarMode();
                        }
                        // unset flag
                        isDragging = false;
                        // clear the original note
                        clearOriginalNote();
                    }
                }

                if (!isDragging) {
                    // check event target
                    if (editEvent.target && editEvent.target.noteView && !editEvent.target.noteView.temp) {
                        // Case: Not dragging and hovering over a note on either side of the edit area
                        // Action: start hovering on the note

                        // get the side the note is on, which might not be the active side
                        // todo: error if it's not one of these?
                        var side = editEvent.target.className == "roll-note-grab" ? sideRoll :
                                   editEvent.target.className == "tab-grab" ? sideTab :
                                   null;
                        // start hovering on the note
                        setHoverEditNote(editEvent.target.noteView.note, side);

                    } else if (isInsideActive) {
                        // check if it's different from the current editNote
                        if (!noteEqualToCurrentPosition(editNote)) {
                            // Case: Not dragging, on the active edit side, not hovering directly over a note, and
                            // cursor has moved from its previous position
                            // Action: search for a note near the cursor

                            // parse moveNoteName into fret and string
                            var [fret, string] = SongUtils.splitNoteName(editNoteName);
                            // search for an existing note near the cursor
                            // if the tab is active, search for a note with any frets on that string
                            var hoverNote = song.getNote(editTick,
                                tabEnabled ? null : fret,
                                string, editNoteLength-1, editNoteLength-1,
                                // alt
                                getCurrentEditSide() == sideTab && isDuviriModeOn()
                            );
                            if (hoverNote) {
                                // if one was found, start hovering on it
                                setHoverEditNote(hoverNote);

                            } else {
                                // otherwise show a cursor outline
                                setTempEditNote();
                            }
                        }
                    }
                }

                // determine whether there's a current edit note, there probably should be
                var hasEditNote = editNote != null;

                if (!isDragging && isButtonDown) {
                    if (hasEditNote) {
                        // Case: not dragging, button is down, and currently has either a cursor position or a hover note
                        // Action: Start dragging either a new note edit or an existing note

                        // copy edit Note to the original note
                        // this is either an existing note being hovered or our position cursor
                        initOriginalNote();
                        // setTrackBarMode before setting the drag edit note
                        updateTrackBarMode();
                        // remove the edit note and replace it with a drag note at the current position
                        setDragEditNote();
                        // start undo combo
                        startAction();
                        // if the original note is not new
                        if (!originalNoteNew) {
                            // then remove it
                            removeNote(originalNote);
                        }
                        // start dragging
                        isDragging = true;
                        // start off by playing audio for the current note
                        // if we're editing on the tab side and duviri mode is enabled and the current note has
                        // an alt then use the edit note's normal note, copied from the original note
                        if (getCurrentEditSide() == sideTab && isDuviriModeOn() && originalNote.hasAlt()) {
                            playNoteName = originalNote.toNoteName();
                        } else {
                            // otherwise just play what the cursor is pointing at
                            playNoteName = editNoteName;
                        }
                        Playback.playNote(playNoteName);

                    } else if (isDownEvent) {
                        // Case: not dragging, button is down, but not on over a note and not on the active side of
                        // the edit area
                        // Action: set the playback marker
                        setPlaybackBar(editEvent);
                    }
                }
            } finally {
                // clear the stopgap flag
                handlingEditEvent = false;
            }
            // sheesh
        }
        
        ////////////////////////////////////////////////////////////////
        // end event handler meat
        ////////////////////////////////////////////////////////////////

        // temporarily set the trackbar fret/chord mode for the given note
        function setTrackBarMode(note, side) {
            switch (side) {
                case sideRoll:
                    // the clicked note fret is always the main fret on the roll side
                    var clickFret = note.fret;
                    // if the note is on the roll side, set the chord mode
                    TrackBar.setChordModeForFretsTemporarily(clickFret);
                    break;
                case sideTab:
                    // the clicked fret can be the alt fret on the tab side
                    var clickFret = isDuviriModeOn() ? note.altFret : note.fret;
                    // if the note is on the tab side, set the frets
                    TrackBar.setFretsTemporarily(clickFret);
                    break;
            }
        }

        // revert temporary fret/chord mode settings in the trackbar
        function resetTrackBarMode() {
            TrackBar.revertTemporarySettings();
        }

        // show the note menu
        function noteMenu(event, note) {
            // get the hidden dialog div from the document
            var menuDiv = document.getElementById("note-menu");

            // setup listeners
            var deleteButton = document.getElementById("note-edit-delete");
            deleteButton.onclick = (e) => {
                removeNote(note);
                noteMenuClose();
            };

            // oh boy
            if (Settings.getDuviriModeEditingEnabled()) {
                // get the duviri mode options
                var duviriModeButton = document.getElementById("note-edit-duviri-mode");
                var duviriModeRemoveButton = document.getElementById("note-edit-duviri-mode-remove");
                // check if the note is already in duviri mode
                if (note.hasAlt()) {
                    // disable duviri mode button
                    duviriModeButton.style.display = "none";
                    // enable remove duviri mode button
                    duviriModeRemoveButton.style.display = "";
                    duviriModeRemoveButton.onclick = (e) => {
                        setDuviriModeOnNote(note, false);
                        noteMenuClose();
                    };

                } else {
                    // disable remove duviri mode button
                    duviriModeRemoveButton.style.display = "none";

                    // convert the enabled editor frets to a fret string
                    var fretsEnabledString = convertFretsEnabledToFretString();

                    // check against the clicked note
                    if (fretsEnabledString != "" && fretsEnabledString != note.fret) {
                        // we can enable the duviri mode button, this will change the alt fret
                        // and allow us to move the tab side independently
                        duviriModeButton.style.display = "";
                        duviriModeButton.onclick = (e) => {
                            setDuviriModeOnNote(note, true);
                            noteMenuClose();
                        };

                    } else {
                        // don't show the button
                        duviriModeButton.style.display = "none";
                    }
                }
            }

            // remove it
            menuDiv.remove();

            // show the menu with a custom close callback
            var noteMenuClose = Menus.showMenuAtEvent(menuDiv, event, null, false, () => {
                // when the change speed menu is closed, remove the the original container
                menuDiv.remove();
                // and add it back to the hidden area of the document
                document.getElementById("hidden-things").appendChild(menuDiv);
            });
        }

        // remove a note from the song
        function removeNote(note) {
            // wrap in an undo action that returns the actual note that was removed
            return Undo.doAction(
                () => {
                    // actually remove the note from the song, returning the object that was actually removed
                    var ret = doRemoveNote(note);
                    // schedule a URL update
                    Model.scheduleUpdate();
                    // re-run the last edit event as a move event to fix hovering/cursor status
                    rerunEditEvent();
                    // return the note object that was removed
                    return ret;
                },
                () => {
                    // undo action
                    // add the note back
                    doAddNote(note);
                    // schedule a URL update
                    Model.scheduleUpdate();
                    // re-run the last edit event as a move event to fix hovering/cursor status
                    rerunEditEvent();
                },
                "Remove Note"
            );
        }

        function addNote(note) {
            // wrap in an undo action
            Undo.doAction(
                () => {
                    // add the note back
                    doAddNote(note);
                    // schedule a URL update
                    Model.scheduleUpdate();
                    // re-run the last edit event as a move event to fix hovering/cursor status
                    rerunEditEvent();
                },
                () => {
                    // actually remove the note from the song, returning the object that was actually removed
                    var ret = doRemoveNote(note);
                    // schedule a URL update
                    Model.scheduleUpdate();
                    // re-run the last edit event as a move event to fix hovering/cursor status
                    rerunEditEvent();
                    // return the note object that was removed
                    return ret;
                },
                "Add Note"
            );
        }

        function doRemoveNote(note) {
            // remove the note or its equivalent from the song, getting the actual note object that was removed
            var removedNote = song.removeNote(note);
            // the note object still has the linkages set up
            var prev = removedNote.prev;
            var next = removedNote.next;
            // clear the note's UI
            removedNote.view.clear();
            // rebuild any notes around the removed one,
            // changing their UI lengths in case they're some flavor of monophonic
            rebuildNoteViews(removedNote, prev, next);
            // avoid cleanup issues if we're currently hovering over this note
            if (removedNote == editNote) {
                editNote = null;
            }
            // Check if we've removed the first note in the song and have to change the lead-in setting
            checkLeadIn();
            // update editing
            Editing.updateSongStats();
            // update the duviri mode button
            updateDuviriModeShown();
            // return the note object that was removed
            return removedNote;
        }

        function doAddNote(note) {
            // add the note to the song
            song.addNote(note);
            // create a UI for the note
            var view = new NoteView(note, false, false);
            // build the UI, this associates the view with the note
            view.build();
            // rebuild any notes around the removed one,
            // changing their UI lengths in case they're some flavor of monophonic
            rebuildNoteViews(note);
            // Check if the note we added is now the first note in the song and we have to change the lead-in setting
            checkLeadIn();
            // update editing
            Editing.updateSongStats();
            // update the duviri mode button
            updateDuviriModeShown();
        }

        // convert a note to or from duviri mode
        function setDuviriModeOnNote(note, mode) {
            if (mode) {
                // convert the currently enabled editor frets to a fret string
                // this is why we need to revert the trackbar settings before getting here
                var altFret = convertFretsEnabledToFretString();
                // create a new duviri-mode note with the currently selected frets as its alt frets.
                // the string will still be the same, but it can not be moved independently of the roll side.
                var newNote = new Note(note.fret + "-" + note.string, note.tick, altFret + "-" + note.string);

                // create a single undo action involving removing the old note and adding the new one.
                Undo.startUndoCombo();
                removeNote(note);
                addNote(newNote);
                Undo.endUndoCombo("Switch note to Duviri mode");

            } else if (note.hasAlt()) {
                // create a new note where the alt note equals the normal note.
                var newNote = new Note(note.fret = "-" + note.string, note.tick);

                // create a single undo action involving removing the old note and adding the new one.
                Undo.startUndoCombo();
                removeNote(note);
                addNote(newNote);
                Undo.endUndoCombo("Switch note out of Duviri mode");
            }
        }

        // look around the given added or removed note and see if we have to rebuild any other note views
        function rebuildNoteViews(note, prev=note.prev, next=note.next) {
            // look backwards from the reference note
            while (prev != null) {
                // just always rebuild the note view, not worth optimizing
                prev.view.clear();
                prev.view.build();
                // if the current note is at a different time from the removed note, and the note after
                // that one is at a different time from the current note, then we're done
                if (prev.tick != note.tick && prev.prev != null && prev.prev.tick != prev.tick) {
                    break;
                }
                // keep going
                prev = prev.prev;
            }
            while (next != null) {
                // just always rebuild the note view, not worth optimizing
                next.view.clear();
                next.view.build();
                // if the current note is at a different time from the removed note, and the note after
                // that one is at a different time from the current note, then we're done
                if (next.tick != note.tick && next.next != null && next.next.tick != next.tick) {
                    break;
                }
                // keep going
                next = next.next;
            }
        }

        // get the tick under the event's position
        function getTickForEvent(e) {
            // screen positions of the event
            var x = e.clientX;
            var y = e.clientY;
            // get the bounds for the scroll area
            var bcr = scroll.getBoundingClientRect();
            // bounds check, because touch events can go past the boundary of an element and still notify the
            // originally touched element
            if (x < bcr.left || x >= bcr.left + bcr.width) {
                return null;
            }
            if (y < bcr.top || y > bcr.top + bcr.height) {
                return null;
            }
            // put the event y-position in scroll area coordinates, and translate to a whole tick location
            return Math.floor(getTickForScreenPosition(y - bcr.top));
        }

        // get the note name closest to the event's position
        function getNoteNameForEvent(e) {
            // split into functions for roll side and tab side
            if (rollEnabled) {
                return getRollNoteForEvent(e);

            } else if (tabEnabled) {
                return getTabNoteForEvent(e);
            }
        }

        // get the roll side note name closest to an event position
        function getRollNoteForEvent(e) {
            // screen x-position of the event
            var x = e.clientX;
            // get the bounds for the piano roll area
            var bcr2 = roll.getBoundingClientRect();
            // bounds check, because touch events can go past the boundary of an element and still notify the
            // originally touched element
            var x2 = x - bcr2.left;
            if (x2 < 0) {
                return null;
            }
            // put the event x-position in piano roll area coordinates, and translate to a note index, possibly fractional
            // all the hard work is in this function
            var noteIndex = Piano.rollNoteIndexFromOffset(Model.getKeySig(), x2);

            // get the nearest scale note, depending on the current chord mode
            return TrackBar.getNearestScaleNoteName(noteIndex);
        }

        function getRollNoteOffset(baseNote, clickNote) {
            // todo
            return 0;
        }

        // get the tab side note name closest to an event position
        function getTabNoteForEvent(e) {
            // screen x-position of the event
            var x = e.clientX;
            // get the bounds for the piano tab area
            var bcr2 = tab.getBoundingClientRect();
            // put the event x-position in tab area coordinates
            var x2 = x - bcr2.left;
            // bounds check, because touch events can go past the boundary of an element and still notify the
            // originally touched element
            if (x2 >= bcr2.width) {
                return null;
            }
            // translate to the nearest string, we don't have to super-optimize this
            var string = null;
            var dist = bcr2.width;

            // iterate over the three string offsets
            for (var s in MetadataUI.tabStringXOffsets) {
                var offset = MetadataUI.tabStringXOffsets[s];
                // get the x-distance
                var newDist = Math.abs(x2 - offset);
                // track the smallest distance
                if (newDist < dist) {
                    string = s;
                    dist = newDist;
                }
            }

            // build a note name
            var noteName = "";
            // add all the active frets in the trackbar
            for (var i = 0; i < fretsEnabled.length; i++) {
                if (fretsEnabled[i]) {
                    noteName = noteName + i;
                }
            }
            // add the string
            return noteName + "-" + string;
        }

        // check if we need to update the lead-in
        function checkLeadIn() {
            if (song.notes.length == 0) {
                // if there's no notes then there is no lead-in
                Model.setLeadInTicks(0, false);

            } else {
                // set the lead-in to the time of the first note
                Model.setLeadInTicks(-song.notes[0].tick, false);
            }
        }

        function setRecording(newRecording) {
            // check
            if (recording == newRecording) {
                return;
            }
            // set the flag
            recording = newRecording;
            if (recording) {
                // if recording is starting, start an undo combo to contain all the recording events
                Undo.startUndoCombo();
            } else {
                // if recording is done, end the undo combo
                Undo.endUndoCombo("Recording");
            }
        }

        function notePlayed(noteName, currentSongTick) {
            if (recording && playbackMarker) {
                // todo tweak this? floor instead?
                var tick = Math.round(currentSongTick);
                // console.log("Recorded: " + noteName + " at " + tick);
                addNote(new Note(noteName, tick));
            }
        }

        function transformNotes(func) {
            // clone the note list
            var notesCopy = song.notes.slice();
            // start an undo combo
            Undo.startUndoCombo();
            // loop
            for (var n = 0; n < notesCopy.length; n++) {
                var note = notesCopy[n];
                var newNote = func(note);
                if (!note.equals(newNote) || note.tick != newNote.tick) {
                    removeNote(note);
                    addNote(newNote);
                }
            }
            // end the undo combo
            Undo.endUndoCombo("Bulk Edit");
        }

        return {
            registerEventListeners: registerEventListeners, // ()
            setEditing: setEditing, // (newEditing)
            isEditing: isEditing, // ()
            scrollUpdated: rerunEditEvent, // ()
            updateFrets: updateFrets, // (fretsEnabled[4])
            setRecording: setRecording, // (newRecording)
            notePlayed: notePlayed, // (notename, currentSongTick)
            transformNotes: transformNotes, // ((note) => new note)
        };
    })();

    function updateSettings() {
        // refresh from settings
        oldFretLayout = Settings.getOldFretLayout();
        // redraw
        // todo: more granular?
        updateStructure();
    }

    // check the current song to see if we should show the duviri mode checkbox
    function updateDuviriModeShown() {
        // check if the current song has alt notes
        var newDuviriModeShown = song && song.hasAltNotes();
        // check if we need to switch
        if (newDuviriModeShown != duviriModeShown) {
            duviriModeShown = newDuviriModeShown;
            // get the checkbox pop-up
            var div = document.getElementById("tab-duviri-mode")
            // check if we're showing it or not
            if (duviriModeShown) {
                // display the checkbox
                div.style.display = "";
                // default it to checked
                setDuviriModeOn(true);
            } else {
                // hide the checkbox
                div.style.display = "none";
            }
        }
    }

    // check if duviri mode is on
    function isDuviriModeOn() {
        return duviriModeOn;
    }

    // set duviri mode
    function setDuviriModeOn(newDuviriModeOn) {
        // short circuit
        if (newDuviriModeOn != duviriModeOn) {
            duviriModeOn = newDuviriModeOn;
            // this should always be shown, check it anyway
            if (duviriModeShown) {
                // get the checkbox and set its state
                var input = document.getElementById("config-tab-duvirimode-input");
                input.checked = duviriModeOn;
                // rebuild the tab side of the track view
                rebuildTabNotes();
            }
        }
    }

    // event handler for the duviri mode checkbox
    function commitDuviriModeChange() {
        // get the checkbox
        var input = document.getElementById("config-tab-duvirimode-input");
        // get its value, just a boolean
        var value = input.checked;
        // set the mode
        setDuviriModeOn(value);
    }

    // public members
    return  {
        registerEventListeners: registerEventListeners, // ()
        // set the song and rebuild the view
        setSong: setSong, // (song)
        // rebuild the piano roll view when just the shawzin has changed
        updateShawzin: rebuildRollNotes, // ()
        // rebuild the piano roll view when just the scale has changed
        updateScale: rebuildRollNotes, // ()
        // rebuild the tablature view when just the control scheme has changed
        updateControlScheme: rebuildTabNotes, // ()
        // rebuild the entire view when the structure has changed
        updateStructure: updateStructure, // ()
        // update the view for any settings changes
        updateSettings: updateSettings, // ()
        // update the list of enabled frets for editing mode
        updateFrets: Editor.updateFrets, // (fretsEnabled[4])

        // set the playing flag and setup the UI
        setPlaying: setPlaying, // (newPlaying)
        // scroll the view and the playback marker to match the given playback time, which can be in fractional ticks
        setPlaybackTick: setPlaybackTick, // (tick)
        // get the current playback tick position
        getPlaybackTick: getPlaybackTick, // ()
        // remove the playback marker
        clearPlayback: clearPlayback, // ()
        // set the tick time at which playback should start, which can be in fractional ticks
        setPlaybackStartTick: setPlaybackStartTick, // (tick)
        // get the current playback start tick position
        getPlaybackStartTick: getPlaybackStartTick, // ()
        // clear the current playback start tick position, the next playback will start at the beginning
        clearPlaybackStartTick: clearPlaybackStartTick, // ()
        // scroll so the center of the view is on the given tick
        scrollToTick: scrollToTick, // (tick, smooth=false)
        // set the track direction, top to bottom (false) or bottom to top (true)
        setReversed: setReversed, // (newReversed)
        // recalculate visible pixels and ticks when the window size has changed
        resize: resize, // (width, height)
        // set whether editing mode is enabled
        setEditing: Editor.setEditing, // (newEditing)
        // set whether recording is enabled
        setRecording: Editor.setRecording, // (newRecording)
        // notify when a note was manually played
        notePlayed: Editor.notePlayed, // (notename, currentSongTick)
        // run a 1-1 note transformation according to some rule
        transformNotes: Editor.transformNotes, // ((note) => new note)
        // duviriMode flag
        isDuviriModeOn: isDuviriModeOn, // (): boolean
    }
})();
