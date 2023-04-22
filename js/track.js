var Track = (function() {

    var tab = null;
    var roll = null;
    var viewHeight = null;
    var visibleTicks = null;
    var tickSpacing = Metadata.tickSpacing;

    var bpm = null;
    var meterBar = null;
    var meterBeat = null;

    var startBar = null;
    var endBar = null;

    var bars = [];
    var tickCapacity = 0;

    // hard-coded 2-second buffer at beginning
    var tickOffset = Metadata.leadInTicks;

    var song = null;
    var playbackMarker = null;

    function registerEventListeners() {
        scroll = document.getElementById("song-scroll");
        tab = document.getElementById("song-scroll-tab");
        roll = document.getElementById("song-scroll-roll");

        scroll.addEventListener("scroll", onscroll, { passive: false });

        resize();
        startBar = [
            buildBar(false, "tab", tickOffset),
            buildBar(false, "roll", tickOffset)
        ];
        tab.appendChild(startBar[0]);
        roll.appendChild(startBar[1]);

        endBar = [
            buildBar(false, "tab", visibleTicks),
            buildBar(false, "roll", visibleTicks)
        ];
        tab.appendChild(endBar[0]);
        roll.appendChild(endBar[1]);


//        bpm = 120;
//        meterBar = 4;
//        meterBeat = 4;
        ensureTickCapacity(visibleTicks - 1);
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
        song = newSong;
        if (song) {
            for (var n = 0; n < song.notes.length; n++) {
                var noteView = getView(song.notes[n]);
                noteView.clear();
                noteView.build();
            }
        }
        scrollToTick(0);
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

    function resize() {
        viewHeight = scroll.getBoundingClientRect().height;
        visibleTicks = Math.ceil(viewHeight / tickSpacing);
    }

    function onscroll() {
        var startTick = Math.ceil(scroll.scrollTop / tickSpacing) - tickOffset;
        var endTick = startTick + visibleTicks;
        if (endTick >= tickCapacity) {
            ensureTickCapacity(startTick + visibleTicks);
        } else if (endTick < tickCapacity && endTick > song.getLastTick()) {
            // check for notes present
            trimTickCapacity(endTick + visibleTicks);
        }
    }

    function setPlaybackTick(tick) {
        if (playbackMarker == null) {
            playbackMarker = new PlaybackMarker(tick);
        } else {
            playbackMarker.setPlayTick(tick);
        }
        scrollToTick(tick);
    }

    function scrollToTick(tick) {
        // scroll to location
        var pos = (tick + tickOffset) * tickSpacing;
        scroll.scrollTo(0, pos - (viewHeight/2));
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

        if (ticks || !bpm) {
            if (!ticks) ticks = visibleTicks;
            div.style.height = (ticks * tickSpacing) + "px";
            if (first) {
                div.appendChild(buildMarker("measure-marker-1-" + pngSuffix + ".png", 0));
            }
            div.ticks = ticks;

        } else {
            var ticksPerBeat = (60 * Metadata.ticksPerSecond) / bpm;
            var beats = meterBar;
            div.style.height = (beats * ticksPerBeat * tickSpacing) + "px";
            div.appendChild(buildMarker("measure-marker-1-" + pngSuffix + ".png", 0));

            for (var b = 1; b < beats; b++) {
                div.appendChild(buildMarker("measure-marker-2-" + pngSuffix + ".png", b * ticksPerBeat * tickSpacing));
            }

            div.ticks = ticksPerBeat * beats;
        }

        return div;
    }

    function insertBar() {
        var bar = [
            buildBar(bars.length == 0, "tab"),
            buildBar(bars.length == 0, "roll")
        ];

        bars.push(bar);
        endBar[0].parentNode.insertBefore(bar[0], endBar[0]);
        endBar[1].parentNode.insertBefore(bar[1], endBar[1]);
        tickCapacity += bar[0].ticks;
    }

    function removeBar() {
        var bar = bars.pop();
        bar[0].remove();
        bar[1].remove();
        tickCapacity -= bar[0].ticks;
    }

    function ensureTickCapacity(ticks) {
        while (tickCapacity < Metadata.maxTickLength && tickCapacity <= ticks) {
            insertBar();
        }
    }

    function trimTickCapacity(ticks) {
        while (tickCapacity > ticks + visibleTicks) {
            removeBar();
        }
    }

    function makeImage(png, className="centerImg") {
        var img = document.createElement("img");
        img.src = "img/" + png;
        img.srcset = "img2x/" + png + " 2x";
        img.className = className;
        return img;
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
        }

        buildTabNote() {
            var dot = makeImage("tab-note-dot.png");
            var fret1 = makeImage(this.note.fret.indexOf("1") >= 0 ? "tab-note-fret-1-pc.png" : "tab-note-fret-0.png");
            var fret2 = makeImage(this.note.fret.indexOf("2") >= 0 ? "tab-note-fret-2-pc.png" : "tab-note-fret-0.png");
            var fret3 = makeImage(this.note.fret.indexOf("3") >= 0 ? "tab-note-fret-3-pc.png" : "tab-note-fret-0.png");

            dot.style.left = "0px";
            dot.style.top = "0px" ;
            fret1.style.left = Metadata.tabFretXOffsets["1"] + "px";
            fret1.style.top = Metadata.tabFretYOffset + "px" ;
            fret2.style.left = Metadata.tabFretXOffsets["2"] + "px";
            fret2.style.top = Metadata.tabFretYOffset + "px" ;
            fret3.style.left = Metadata.tabFretXOffsets["3"] + "px";
            fret3.style.top = Metadata.tabFretYOffset + "px" ;

            var div = document.createElement("div");
            div.style.position = "absolute";
            div.appendChild(dot);
            div.appendChild(fret1);
            div.appendChild(fret2);
            div.appendChild(fret3);

            div.style.left = (Metadata.tabStringXOffsets[this.note.string]) + "px";
            div.style.top = ((this.note.tick + tickOffset) * tickSpacing) + "px" ;
            return div;
        }

        buildTab() {
            this.tabDiv = this.buildTabNote();
            tab.append(this.tabDiv);

            ensureTickCapacity(this.note.tick);
        }
    
        clearTab() {
            if (this.tabDiv) { this.tabDiv.remove(); this.tabDiv = null; }
        }

        buildRollNote(name, length, color, outline) {
            var div = document.createElement("div");
            div.className = outline ? "roll-note-outline" : "roll-note";
            div.style.left = Metadata.noteToRollOffsets[name] + "px";
            div.style.top = "0px";
            div.style.width = "12px"; // todo: metadata
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
            div.style.left = (Metadata.noteToRollOffsets[name] + 6) + "px";
            div.style.top = "0px";
            div.style.width = "12px"; // todo: metadata
            div.style.height = (length * tickSpacing) + "px";
            div.style.backgroundColor = color;
            return div;
        }

        buildRollRow() {
            var rollRow = document.createElement("div");
            rollRow.className = "roll-note-row";
            rollRow.style.left = "0px";
            rollRow.style.top = ((this.note.tick + tickOffset) * tickSpacing) + "px";
            return rollRow;
        }

        buildRoll() {
            // todo: optimize?
            var shawzinMd = Metadata.shawzinList[Model.getShawzin()];
            var scaleMd = shawzinMd.scales[Model.getScale()];
            var noteName = this.note.toNoteName();
            var color = Metadata.fretToRollColors[this.note.fret];
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
            roll.append(this.rollRow);
    
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
            tab.appendChild(tabDiv);

            // roll notes
            var rollRow = this.buildRollRow();
            var rollDivs = [];
            for (var i = 0; i < this.rollRow.noteList.length; i++) {
                var noteEntry = this.rollRow.noteList[i];
                var rollDiv = this.buildBounceRollNote(noteEntry)
                rollDivs.push(rollDiv);
                rollRow.appendChild(rollDiv);
            }
            roll.appendChild(rollRow);

            // cleanup
            setTimeout(() => {
                tabDiv.remove();
                rollRow.remove();
            }, 1000);
        }
    }

    class PlaybackMarker {
        constructor(playTick) {
            this.build();
            this.setPlayTick(playTick);
            this.nextNote = song.getFirstNoteAfter(Math.ceil(this.playTick));
        }

        build() {
            this.tabImg = makeImage("play-marker-tab.png", "centerYImg");
            this.tabImg.style.left = "0px";
            tab.appendChild(this.tabImg);
            
            this.rollImg = makeImage("play-marker-roll.png", "centerYImg");
            this.rollImg.style.left = "0px";
            roll.appendChild(this.rollImg);
        }

        // playtick can be fractional
        setPlayTick(playTick) {
            this.playTick = playTick;
            this.tabImg.style.top = ((this.playTick + tickOffset) * tickSpacing) + "px";
            this.rollImg.style.top = ((this.playTick + tickOffset) * tickSpacing) + "px";
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
        setPlaybackTick: setPlaybackTick,
        getPlaybackTick: getPlaybackTick,
        clearPlayback: clearPlayback,
    }
})();


