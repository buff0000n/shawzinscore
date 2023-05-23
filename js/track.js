var Track = (function() {

    var tab = null;
    var roll = null;
    var viewHeight = null;
    var visibleTicks = null;
    var tickSpacing = MetadataUI.tickSpacing;
    var reversed = false;

    var startBar = null;

    var bars = [];
    var tickCapacity = 0;
    var pixelCapacity = 0;
    var defaultBarTicks = 32;
    var barTicks = null;
    var playbackOffset = 0.35;
    var scrollThrottleMs = 250;

    // hard-coded 2.75-second buffer at beginning
    var tickOffset = Metadata.leadInTicks;

    var song = null;
    var playbackMarker = null;

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

        resize();
    }

    function getView(note) {
        if (!note.view) {
            note.view = new NoteView(note);
        }
        return note.view;
    }

    function setSong(newSong) {
        if (song) {
            for (var n = 0; n < song.notes.length; n++) {
                getView(song.notes[n]).clear();
            }
        }
        clearBars();
        song = newSong;
        if (song) {
            ensureTickCapacity(0);
            for (var n = 0; n < song.notes.length; n++) {
                var noteView = getView(song.notes[n]);
                noteView.clear();
                noteView.build();
            }
            scrollToTick(0);
        }
    }

    function getBarTicks() {
        // lazily initialize this
        if (barTicks == null) {
            var tempo = Model.getTempo();
            if (tempo == null) {
                barTicks = defaultBarTicks;

            } else {
                barTicks = ((60 * Metadata.ticksPerSecond) / tempo) * Model.getMeterTop();
            }
        }
        return barTicks;
    }

    function updateStructure() {
        barTicks = null;
        var tick = getScrollTick();
        // MEH
        setSong(song);
        ensureTickCapacity(tick);
        scrollToTick(tick);
    }

    function rebuildRollNotes() {
        if (song) {
            for (var n = 0; n < song.notes.length; n++) {
                var noteView = getView(song.notes[n]);
                noteView.clearRoll();
                noteView.buildRoll();
            }
        }
    }

    function rebuildTabNotes() {
        if (song) {
            for (var n = 0; n < song.notes.length; n++) {
                var noteView = getView(song.notes[n]);
                noteView.clearTab();
                noteView.buildTab();
            }
        }
    }

    function resize() {
        viewHeight = scroll.getBoundingClientRect().height;
        visibleTicks = Math.ceil(viewHeight / tickSpacing);
    }

    function onscroll() {
        var scrollTop = scroll.scrollTop;
        //console.log("START scrollTop: " + scrollTop);
        var endTick = reversed
                      ? (tickCapacity - (Math.floor(scrollTop / tickSpacing)))
                      : (Math.ceil(scrollTop / tickSpacing) - tickOffset) + visibleTicks
                      ;

        if (endTick >= tickCapacity) {
            ensureTickCapacity(endTick);

        } else if (endTick < tickCapacity && endTick > song.getLastTick()) {
            // check for notes present
            trimTickCapacity(endTick);
        }
        //console.log("END   scrollTop: " + scroll.scrollTop);
    }

    function setPlaybackTick(tick) {
        if (playbackMarker == null) {
            playbackMarker = new PlaybackMarker(tick);
        } else {
            playbackMarker.setPlayTick(tick);
        }
        // offset the center tick
        scrollToTick(tick + (visibleTicks * playbackOffset));
    }

    function scrollToTick(tick) {
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
    }

    function getScrollTick() {
        var halfHeight = (viewHeight/2);
        var pos = scroll.scrollTop + halfHeight;
        var tick = reversed
                  ? tickCapacity - (pos / tickSpacing)
                  : (pos / tickSpacing) - tickOffset
        return tick;
    }

    function getPlaybackTick() {
        return playbackMarker != null ? playbackMarker.playTick : null;
    }

    function clearPlayback() {
        if (playbackMarker != null) {
            playbackMarker.clear();
            playbackMarker = null;
        }
    }

    function setReversed(newReversed) {
        // check if it's already set
        if (newReversed == reversed) {
            return
        }

        reversed = newReversed;

        setSong(song);
    }


    function insertBar() {
        var bar = [
            buildBar(false, "tab"),
            buildBar(false, "roll")
        ];

        if (reversed) {
            tab.prepend(bar[0]);
            roll.prepend(bar[1]);
        } else {
            tab.append(bar[0]);
            roll.append(bar[1]);
        }

        bars.push(bar);
        bar[0].startTick = tickCapacity;
        bar[1].startTick = tickCapacity;
        tickCapacity += bar[0].ticks;
        pixelCapacity += bar[0].ticks * tickSpacing;

        if (reversed) {
            scroll.scrollTo(0, scroll.scrollTop + (bar[0].ticks * tickSpacing));
        }
    }

    function removeBar(bar) {
        if (!bar) {
            bar = bars.pop();
        }
        bar[0].remove();
        bar[1].remove();
        tickCapacity = Math.max(0, tickCapacity - bar[0].ticks);
        pixelCapacity = Math.max(0, pixelCapacity - (bar[0].ticks * tickSpacing));
    }

    function clearBars() {
        while (tickCapacity > 0) {
            removeBar();
        }
        if (startBar) {
            removeBar(startBar);
            startBar = null;
        }
    }

    function ensureTickCapacity(ticks) {
        if (!startBar) {
            buildStartBar();
        }
        var count = 0;
        while (tickCapacity < Metadata.maxTickLength && tickCapacity <= ticks) {
            //console.log("ensuring: " + tickCapacity + " > " + ticks + "(" + (++count) + ")");
            insertBar();
        }
    }

    function trimTickCapacity(ticks) {
        var count = 0;
        // Need to add a barTicks buffer to prevent thrashing on a measure boundary
        while (tickCapacity > ticks + visibleTicks + getBarTicks()) {
            //console.log("trimming: " + tickCapacity + " < " + ticks + "(" + (++count) + ")");
            removeBar();
        }
    }

    function getBarForTick(tick) {
        if (tick < 0) {
            return startBar;
        }
        ensureTickCapacity(tick);
        return bars[Math.floor(tick / getBarTicks())];
    }

    function buildStartBar() {
        startBar = [
            buildBar(true, "tab", tickOffset),
            buildBar(true, "roll", tickOffset)
        ];
        startBar[0].startTick = -tickOffset;
        startBar[1].startTick = -tickOffset;
        tab.appendChild(startBar[0]);
        roll.appendChild(startBar[1]);

        pixelCapacity = startBar[0].ticks * tickSpacing;
    }

    function buildMarker(png, top) {
        var marker = document.createElement("img");
        PageUtils.setImgSrc(marker, png);
        marker.className = "measure-marker";
        marker.style.top = top + "px";
        return marker;
    }

    function buildBar(first, pngSuffix, ticks = null) {
        var div = document.createElement("div");
        div.className = "measure-spacer";

        var tempo = Model.getTempo();

        if (ticks || !tempo) {
            if (!ticks) ticks = getBarTicks();
            div.style.height = (ticks * tickSpacing) + "px";
            if (first) {
                div.appendChild(buildMarker("measure-marker-1-" + pngSuffix + ".png", reversed ? 0 : ticks * tickSpacing));
            }
            div.ticks = ticks;

        } else {
            var ticksPerBeat = (60 * Metadata.ticksPerSecond) / tempo;
            var beats = Model.getMeterTop();
            div.style.height = (beats * ticksPerBeat * tickSpacing) + "px";
            div.appendChild(buildMarker("measure-marker-1-" + pngSuffix + ".png", reversed ? 0 : ticks * tickSpacing));

            for (var b = 1; b < beats; b++) {
                div.appendChild(buildMarker("measure-marker-2-" + pngSuffix + ".png", b * ticksPerBeat * tickSpacing));
            }

            div.ticks = getBarTicks(); // should be the same as ticksPerBeat * beats;
        }

        return div;
    }

    function trimToNextNonPolyphonicNote(note, noteLength, poly) {
        if (poly == "polyphonic") return noteLength;

        var nextNote = song.findNextNote(note, (note1, note2) => {
            return note2.tick - note1.tick < noteLength && (
                (poly == "monophonic") ||
                (poly == "duophonic" && note1.isChord() == note2.isChord())
            );
        });
        if (nextNote) {
            var nextTick = nextNote.tick - note.tick;
            if (nextTick < noteLength) {
                return nextTick;
            }
        }
        return noteLength;
    }

    class NoteView {
        constructor(note) {
            this.note = note;
            note.view = this;
            this.bar = null;

            this.dot = null;
            this.fret1 = null;
            this.fret2 = null;
            this.fret3 = null;
            this.rollRow = null;
            this.rollNoteList = null;
        }
        
        build() {
            this.buildTab();
            this.buildRoll();
        }

        clear() {
            this.clearTab();
            this.clearRoll();
            this.bar = null;
        }

        getBar(roll) {
            if (!this.bar) {
                this.bar = getBarForTick(this.note.tick, 0);
            }
            return this.bar[roll ? 1 : 0];
        }

        buildTabNote() {
            var controlScheme = Model.getControlScheme();
            var div = document.createElement("div");
            div.style.position = "absolute";

            var dot = PageUtils.makeImage("tab-note-dot.png", "centerImg");
            dot.classList.add("tab-dot");
            dot.style.left = "0px";
            dot.style.top = "0px" ;
            div.appendChild(dot);

            if (this.note.fret != "") {
                var classes = ["leftImg", "bottomImg", "rightImg"];
                for (var i = 1; i <= 3; i++) {
                    var fretKey = "" + i;
                    var fretImg;
                    if (this.note.fret.indexOf(fretKey) >= 0) {
                        fretImg = PageUtils.makeImage(controlScheme.frets[fretKey].imgBase + "_s.png", classes[i - 1]);
                        fretImg.alt = controlScheme.frets[fretKey].altText;

                    } else {
                        fretImg = PageUtils.makeImage("tab-note-fret-0.png", classes[i - 1])
                    }
                    fretImg.classList.add("tab-dot");
                    fretImg.style.left = MetadataUI.tabFretOffsets[fretKey][0] + "px";
                    fretImg.style.top = MetadataUI.tabFretOffsets[fretKey][1] + "px" ;
                    div.appendChild(fretImg);
                }
            }

            var stringImg = PageUtils.makeImage(controlScheme.strings[this.note.string].imgBase + "_b.png", "centerImg");
            stringImg.alt = controlScheme.strings[this.note.string].altText + "\n";
            stringImg.classList.add("tab-dot");
            stringImg.style.left = "0px";
            stringImg.style.top = "0px" ;
            div.appendChild(stringImg);

            div.style.left = (MetadataUI.tabStringXOffsets[this.note.string]) + "px";
            div.style.top = (reversed
                            ? ((this.getBar(0).startTick + this.getBar(0).ticks - this.note.tick) * tickSpacing)
                            : ((this.note.tick - this.getBar(0).startTick) * tickSpacing)
                            ) + "px";
            return div;
        }

        buildTab() {
            this.tabDiv = this.buildTabNote();
            this.getBar(0).append(this.tabDiv);
        }
    
        clearTab() {
            if (this.tabDiv) { this.tabDiv.remove(); this.tabDiv = null; }
        }

        buildRollNote(name, length, color, outline) {
            var div = document.createElement("div");
            div.className = outline ? "roll-note-outline" : "roll-note";
            div.style.left = MetadataUI.noteToRollOffsets[name] + "px";
            div.style.top = (reversed ? -(length * tickSpacing) : 0) + "px";
            div.style.width = "12px";
            div.style.height = (length * tickSpacing) + "px";
            div.style.backgroundColor = color;
            div.style.borderColor = "#202020";
            // save for later
            div.noteName = name;
            div.noteLength = length;
            div.noteColor = color;
            return div;
        }

        buildBounceRollNote(rollNoteDiv) {
            var name = rollNoteDiv.noteName;
            var length = rollNoteDiv.noteLength;
            var color = rollNoteDiv.noteColor;

            var div = document.createElement("div");
            div.className = "roll-note playRollNote";
            div.style.left = (MetadataUI.noteToRollOffsets[name] + 6) + "px";
            div.style.top = (reversed ? -(length * tickSpacing) : 0) + "px";
            div.style.width = MetadataUI.noteRollWidth + "px";
            div.style.height = (length * tickSpacing) + "px";
            div.style.backgroundColor = color;
            return div;
        }

        buildRollRow() {
            var rollRow = document.createElement("div");
            rollRow.className = "roll-note-row";
            rollRow.style.left = "0px";
            rollRow.style.top = (reversed
                                ? ((this.getBar(1).startTick + this.getBar(1).ticks - this.note.tick) * tickSpacing)
                                : ((this.note.tick - this.getBar(1).startTick) * tickSpacing)
                                ) + "px";
            return rollRow;
        }

        buildRoll() {
            // todo: optimize?
            var shawzinMd = Metadata.shawzinList[Model.getShawzin()];
            var scaleMd = shawzinMd.scales[Model.getScale()];
            var noteName = this.note.toNoteName();
            var color = MetadataUI.fretToRollColors[this.note.fret];
            var noteLength = null;

            var rollRow = this.buildRollRow();
            var rollNoteList = [];
            if (!this.note.isChord()) {
                noteLength = trimToNextNonPolyphonicNote(this.note, shawzinMd.notes.length, shawzinMd.config.type);
                var rollNote = this.buildRollNote(scaleMd.notes[noteName], noteLength, color, false);
                rollRow.appendChild(rollNote);
                rollNoteList.push(rollNote);

            } else if (shawzinMd.config.slap) {
                noteLength = trimToNextNonPolyphonicNote(this.note, shawzinMd.slap.length, shawzinMd.config.type);
                var rollNoteName = scaleMd.slap.notes ? scaleMd.slap.notes[noteName] : scaleMd.notes[Metadata.slapMap[noteName]];
                var rollNote = this.buildRollNote(rollNoteName, noteLength, color, false);
                rollRow.appendChild(rollNote);
                rollNoteList.push(rollNote);

            } else {
                var chord = scaleMd.chords[noteName];
                noteLength = trimToNextNonPolyphonicNote(this.note, chord.length, shawzinMd.config.type);
                for (var n = 0; n < chord.notes.length; n++) {
                    var rollNoteName = chord.notes[n];
                    var rollNote = this.buildRollNote(rollNoteName, noteLength, color, false);
                    rollRow.appendChild(rollNote);
                    rollNoteList.push(rollNote);
                }
            }
    
            // save for later;
            rollRow.noteList = rollNoteList;

            this.rollRow = rollRow;
            this.getBar(1).append(this.rollRow);

            ensureTickCapacity(this.note.tick);
        }
    
        clearRoll() {
            if (this.rollRow) {
                this.rollRow.remove();
                this.rollRow = null;
                this.rollNoteList = null;
            }
        }

        play() {
            //console.log("playing " + this.note);

            // tab note
            var tabDiv = this.buildTabNote();
            tabDiv.classList.add("playTabNote");
            this.getBar(0).appendChild(tabDiv);

            // roll notes
            var rollRow = this.buildRollRow();
            var rollDivs = [];
            for (var i = 0; i < this.rollRow.noteList.length; i++) {
                var noteEntry = this.rollRow.noteList[i];
                var rollDiv = this.buildBounceRollNote(noteEntry)
                rollDivs.push(rollDiv);
                rollRow.appendChild(rollDiv);
            }
            this.getBar(1).appendChild(rollRow);

            // cleanup
            setTimeout(() => {
                tabDiv.remove();
                rollRow.remove();
            }, 500);
        }
    }

    class PlaybackMarker {
        constructor(playTick) {
            this.bar = null;
            this.build();
            this.setPlayTick(playTick);
            this.nextNote = song.getFirstNoteAfter(Math.ceil(this.playTick));
        }

        build() {
            this.tabImg = PageUtils.makeImage("play-marker-tab.png", "centerYImg playback-marker");
            this.tabImg.style.left = "0px";

            this.rollImg = PageUtils.makeImage("play-marker-roll.png", "centerYImg playback-marker");
            this.rollImg.style.left = "0px";
        }

        // playtick can be fractional
        setPlayTick(playTick) {
            this.playTick = playTick;
            var newBar = getBarForTick(this.playTick);
            if (newBar != this.bar) {
                this.bar = newBar;
                this.tabImg.remove();
                this.bar[0].appendChild(this.tabImg);
                this.rollImg.remove();
                this.bar[1].appendChild(this.rollImg);
            }
            var top = (reversed
                      ? ((this.bar[0].startTick + this.bar[0].ticks - this.playTick) * tickSpacing)
                      : ((this.playTick - this.bar[0].startTick) * tickSpacing)
                      ) + "px";
            this.tabImg.style.top = top;
            this.rollImg.style.top = top;

            while (this.nextNote != null && this.nextNote.tick <= this.playTick) {
                this.nextNote.view.play();
                this.nextNote = this.nextNote.next;
            }
        }

        clear() {
            this.tabImg.remove();
            this.rollImg.remove();
        }

    }

    // public members
    return  {
        registerEventListeners: registerEventListeners,
        setSong: setSong,
        updateShawzin: rebuildRollNotes,
        updateScale: rebuildRollNotes,
        updateControlScheme: rebuildTabNotes,
        updateStructure: updateStructure,

        setPlaybackTick: setPlaybackTick,
        getPlaybackTick: getPlaybackTick,
        clearPlayback: clearPlayback,
        scrollToTick: scrollToTick,
        setReversed: setReversed,
        resize: resize,
    }
})();


