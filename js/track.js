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

        scroll.addEventListener("click", trackClick, { "passive": true});
    }

    function trackClick(e) {
        // screen y-position of the click
        var y = e.clientY;
        // get the bounds for the scroll area
        var bcr = scroll.getBoundingClientRect();
        // put the click y-position in scroll area coordinates, and translate to a tick location
        var tick = getTickForScreenPosition(y - bcr.top);
        // assume we're not playing
        // clear any existing playback marker
        clearPlaybackTick();
        // create a new playback marker
        updatePlaybackTick(tick);
        // also create a playback start marker.  Playback will start here until the user rewinds or clicks
        // somewhere else
        setPlaybackStartTick(tick);
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

    // just rebuild the piano roll view when the shawzin or scale has changed
    function rebuildRollNotes() {
        // check if the key signature has changed
        if (Model.getKeySig() != keySig) {
            // change the piano roll side's background image
            document.getElementById("song-scroll-roll").style.backgroundImage = "url('img2x/track/keys-bg-" + Model.getKeySig() + ".png')";
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
        } else if (endTick < tickCapacity + tickBuffer && endTick > song.getEndTick()) {
            // check for notes present
            trimTickCapacity(endTick);
        }
        //console.log("END   scrollTop: " + scroll.scrollTop);
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
            buildBar(false, "1-tab", "2-tab"),
            buildBar(false, "1-roll-" + Model.getKeySig(), "2-roll")
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
        // add capacity while we're below the given tick and the maximum tick length
        while (tickCapacity < Metadata.maxTickLength && tickCapacity <= ticks + tickBuffer) {
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
            buildBar(true, "1-tab", "2-tab", tickOffset),
            buildBar(true, "1-roll-" + Model.getKeySig(), "2-roll", tickOffset)
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
    function buildBar(first, pngSuffix1, pngSuffix2, ticks = null) {
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

            // save the bar tick capacity to the container for some reason
            div.ticks = getBarTicks(); // should be the same as ticksPerBeat * beats;
        }

        return div;
    }

    // huh
    function trimToNextNonPolyphonicNote(note, noteLength, poly) {
        // okay, so when a shawzin is some kind of monophonic then we need to trim each note so it ends when
        // the next one begins

        // nothing to do if the note is polyphonic, they can overlap
        if (poly == Metadata.polyTypePolyphonic) return noteLength;

        // find the next note that will cause the given one to end
        var nextNote = song.findNextNote(note, (note1, note2) => {
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
        constructor(note) {
            // store the note
            this.note = note;
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
            this.rollNoteList = null;
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

        // get the bar container for the tablature elements (false) or piano roll elements (true)
        getBar(roll) {
            // lazily initialize the bar
            if (!this.bar) {
                this.bar = getBarForTick(this.note.tick, 0);
            }
            // return the correct one depending on the flag
            return this.bar[roll ? 1 : 0];
        }

        // actually build the tablature elements
        buildTabNote() {
            // we need the control scheme
            var controlScheme = Model.getControlScheme();

            // container div, absolutely positioned
            var div = document.createElement("div");
            div.style.position = "absolute";

            // build the central dot image
            var dot = PageUtils.makeImage("tab-note-dot.png", "centerImg");
            dot.classList.add("tab-dot");
            // CSS already centers this element, so center it on the position of the container
            dot.style.left = "0px";
            dot.style.top = "0px" ;
            // add the dot element
            div.appendChild(dot);

            // if there are no frets then the central dot is all that's displayed
            if (this.note.fret != "") {
                // css classes for the three dots, we need to center them differently
                var classes = ["leftImg", "bottomImg", "rightImg"];
                // iterate over the three possible frets
                for (var i = 1; i <= 3; i++) {
                    // get the fret as a string
                    var fretKey = fretKeyList[i];
                    // fret image element
                    var fretImg;
                    // check if the fret spec contains the fret
                    if (this.note.fret.indexOf(fretKey) >= 0) {
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
                    fretImg.style.left = MetadataUI.tabFretOffsets[fretKey][0] + "px";
                    fretImg.style.top = MetadataUI.tabFretOffsets[fretKey][1] + "px" ;
                    // add the fret element
                    div.appendChild(fretImg);
                }
            }

            // build the string image and alt based on the control scheme
            var stringImg = PageUtils.makeImage(controlScheme.strings[this.note.string].imgBase + "_b.png", "centerImg");
            stringImg.alt = controlScheme.strings[this.note.string].altText + "\n";
            // more css
            stringImg.classList.add("tab-dot");
            // place on top of the central dot
            stringImg.style.left = "0px";
            stringImg.style.top = "0px" ;
            // add the string element
            div.appendChild(stringImg);

            // position the central dot horizontally over top of the correct string line
            div.style.left = (MetadataUI.tabStringXOffsets[this.note.string]) + "px";
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

        // build a single piano roll note element
        buildRollNote(name, length, color, outline) {
            // The actual piano roll note is just a div box with a bunch of CSS
            var div = document.createElement("div");
            // todo: what was outline for again/
            div.className = outline ? "roll-note-outline" : "roll-note";
            // set the horizontal position according to the metadata for the given absolute note name
            div.style.left = Piano.rollNoteOffset(Model.getKeySig(), name) + "px";
            // set the vertical position above the note position if we're reversed, otherwise set it to 0
            // note that this will be placed into a container that will determine the actual vertical position
            div.style.top = (reversed ? -(length * tickSpacing) : 0) + "px";
            // set the width
            div.style.width = Piano.rollNoteWidth + "px";
            // set the height based on the note length in ticks
            div.style.height = (length * tickSpacing) + "px";
            // color the div background, this is what makes it show up
            div.style.backgroundColor = color;
            // set a border color to keep consecutive notes from merging together
            div.style.borderColor = "#202020";
            // save for later
            div.noteName = name;
            div.noteLength = length;
            div.noteColor = color;
            return div;
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

        // build the container for a row of piano roll notes
        buildRollRow() {
            // absolute positioning container
            var rollRow = document.createElement("div");
            rollRow.className = "roll-note-row";
            // horizontal position is always starts at the left border
            rollRow.style.left = "0px";
            // set the vertical position depending on the direction
            rollRow.style.top = (reversed
                                // O.o
                                ? ((this.getBar(1).startTick + this.getBar(1).ticks - this.note.tick) * tickSpacing)
                                : ((this.note.tick - this.getBar(1).startTick) * tickSpacing)
                                ) + "px";
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
            var color = MetadataUI.fretToRollColors[this.note.fret];
            // length of the note will be filled in later
            var noteLength = null;

            // build the container
            var rollRow = this.buildRollRow();
            // start a list of notes
            var rollNoteList = [];
            // check if it's a chord
            if (!this.note.isChord()) {
                // not a chord, just one note
                // optionally trim the length of the note depending on polyphony rules and when the next note is
                noteLength = trimToNextNonPolyphonicNote(this.note, shawzinMd.notes.length, shawzinMd.config.type);
                // build the note element, pulling the absolute name of the note from the scale definition
                var rollNote = this.buildRollNote(scaleMd.notes[noteName], noteLength, color, false);
                // add to the row and note list
                rollRow.appendChild(rollNote);
                rollNoteList.push(rollNote);

            } else if (shawzinMd.config.slap) {
                // slap chord, still just a single note
                // optionally trim the length of the note depending on polyphony rules and when the next note is
                noteLength = trimToNextNonPolyphonicNote(this.note, shawzinMd.slap.length, shawzinMd.config.type);
                // pull the absolute name of the slap note from the scale definition if provided, otherwise using a
                // mapping from chord note to single note and using the regular scale note definition
                var rollNoteName = scaleMd.slap.notes ? scaleMd.slap.notes[noteName] : scaleMd.notes[Metadata.slapMap[noteName]];
                // build the note element
                var rollNote = this.buildRollNote(rollNoteName, noteLength, color, false);
                // add to the row and note list
                rollRow.appendChild(rollNote);
                rollNoteList.push(rollNote);

            } else {
                // oh god it's a chord
                // pull the list of chord notes from the scale definition
                var chord = scaleMd.chords[noteName];
                // optionally trim the length of the notes depending on polyphony rules and when the next note is
                // this length applies to all notes in the chord
                noteLength = trimToNextNonPolyphonicNote(this.note, chord.length, shawzinMd.config.type);
                // loop over each note in the chord
                for (var n = 0; n < chord.notes.length; n++) {
                    // look up the absolute note name
                    var rollNoteName = chord.notes[n];
                    // build the note element
                    var rollNote = this.buildRollNote(rollNoteName, noteLength, color, false);
                    // add to the row and note list
                    rollRow.appendChild(rollNote);
                    rollNoteList.push(rollNote);
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
                this.rollNoteList = null;
            }
        }

        play() {
            //console.log("playing " + this.note);

            // the animated tablature elements are a carbon copy of the regular ones
            // todo: do an actual copy instead of generating it again from scratcn?
            var tabDiv = this.buildTabNote();
            // with a special animated css class that makes it expand and increase in transparency
            tabDiv.classList.add("playTabNote");
            // add to the bar
            this.getBar(0).appendChild(tabDiv);

            // the animated piano roll notes are different
            // build a container just like before
            var rollRow = this.buildRollRow();
            // we can skip a bunch of steps and create the animated elements based on the normal ones we already have
            for (var i = 0; i < this.rollRow.noteList.length; i++) {
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
    }
})();


