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
    var tickOffset = null;

    var song = null;

    function registerEventListeners() {
        scroll = document.getElementById("song-scroll");
        tab = document.getElementById("song-scroll-tab");
        roll = document.getElementById("song-scroll-roll");

        scroll.addEventListener("scroll", onscroll);

        resize();
        startBar = [
            buildBar(true, "tab"),
            buildBar(true, "roll")
        ];
        tab.appendChild(startBar[0]);
        roll.appendChild(startBar[1]);
        tickOffset = visibleTicks;

        endBar = [
            buildBar(true, "tab"),
            buildBar(true, "roll")
        ];
        tab.appendChild(endBar[0]);
        roll.appendChild(endBar[1]);


        bpm = 120;
        meterBar = 4;
        meterBeat = 4;
        ensureTickCapacity(visibleTicks - 1);
    }

    function setSong(newSong) {
        if (song) {
            for (var n = 0; n < song.notes.length; n++) {
                clearTabNote(song.notes[n]);
                clearRollNoteRow(song.notes[n]);
            }
        }
        song = newSong;
        rebuildTabNotes();
        rebuildRollNotes();
    }

    function rebuildTabNotes() {
        if (song) {
            for (var n = 0; n < song.notes.length; n++) {
                clearTabNote(song.notes[n]);
                buildTabNote(song.notes[n]);
            }
        }
    }

    function rebuildRollNotes() {
        if (song) {
            for (var n = 0; n < song.notes.length; n++) {
                clearRollNoteRow(song.notes[n]);
                buildRollNoteRow(song.notes[n]);
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
        } else if (endTick < tickCapacity) {
            // check for notes present
            trimTickCapacity(startTick + visibleTicks);
        }
    }

    function buildMarker(png, top) {
        var marker = document.createElement("img");
        marker.src = "img/" + png;
        marker.srcset="img2x/" + png + " 2x";
        marker.className = "measure-marker";
        marker.style.top = top + "px";
        return marker;
    }

    function buildBar(first, pngSuffix) {
        var div = document.createElement("div");
        div.className = "measure-spacer";

        if (!bpm) {
            var ticks = visibleTicks;
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
            buildBar(bars.length == 1, "tab"),
            buildBar(bars.length == 1, "roll")
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

    function makeImage(png) {
        var img = document.createElement("img");
        img.src = "img/" + png;
        img.srcset = "img2x/" + png + " 2x";
        img.className = "centerImg";
        return img;
    }

    function clearTabNote(note) {
        if (note.dot) { note.dot.remove(); note.dot = null; }
        if (note.fret1) { note.fret1.remove(); note.fret1 = null; }
        if (note.fret2) { note.fret2.remove(); note.fret2 = null; }
        if (note.fret3) { note.fret3.remove(); note.fret3 = null; }
    }

    function buildTabNote(note) {
        note.dot = makeImage("tab-note-dot.png");
        note.fret1 = makeImage(note.fret.indexOf("1") >= 0 ? "tab-note-fret-1-pc.png" : "tab-note-fret-0.png");
        note.fret2 = makeImage(note.fret.indexOf("2") >= 0 ? "tab-note-fret-2-pc.png" : "tab-note-fret-0.png");
        note.fret3 = makeImage(note.fret.indexOf("3") >= 0 ? "tab-note-fret-3-pc.png" : "tab-note-fret-0.png");

        note.dot.style.left = (Metadata.tabStringXOffsets[note.string]) + "px";
        note.dot.style.top = ((note.time + tickOffset) * tickSpacing) + "px" ;
        note.fret1.style.left = (Metadata.tabStringXOffsets[note.string] + Metadata.tabFretXOffsets["1"]) + "px";
        note.fret1.style.top = (((note.time + tickOffset) * tickSpacing) + Metadata.tabFretYOffset) + "px" ;
        note.fret2.style.left = (Metadata.tabStringXOffsets[note.string] + Metadata.tabFretXOffsets["2"]) + "px";
        note.fret2.style.top = (((note.time + tickOffset) * tickSpacing) + Metadata.tabFretYOffset) + "px" ;
        note.fret3.style.left = (Metadata.tabStringXOffsets[note.string] + Metadata.tabFretXOffsets["3"]) + "px";
        note.fret3.style.top = (((note.time + tickOffset) * tickSpacing) + Metadata.tabFretYOffset) + "px" ;

        tab.append(note.dot);
        tab.append(note.fret1);
        tab.append(note.fret2);
        tab.append(note.fret3);

        ensureTickCapacity(note.time);
    }

    function trimToNextNonPolyphonicNote(note, noteLength, poly) {
        if (poly == "polyphonic") return noteLength;

        var nextNote = song.findNextNote(note, (note1, note2) => {
            return note2.time - note1.time < noteLength && (
                (poly == "monophonic") ||
                (poly == "duophonic" && note1.isChord() == note2.isChord())
            );
        });
        if (nextNote) {
            var nextTime = nextNote.time - note.time;
            if (nextTime < noteLength) {
                return nextTime;
            }
        }
        return noteLength;
    }

    function buildRollNoteRow(note) {
        // todo: optimize?
        var shawzinMd = Metadata.shawzinList[Model.getShawzin()];
        var scaleMd = shawzinMd.scales[Model.getScale()];
        var noteName = note.toNoteName();

        note.rollNoteList = null;
        if (!note.isChord()) {
            var noteLength = trimToNextNonPolyphonicNote(note, shawzinMd.notes.length, shawzinMd.config.type);
            note.rollNoteList = [buildRollNote(scaleMd.notes[noteName], noteLength, Metadata.fretToRollColors[note.fret], false)];

        } else if (shawzinMd.config.slap) {
            var noteLength = trimToNextNonPolyphonicNote(note, shawzinMd.slap.length, shawzinMd.config.type);
            var rollNoteName = scaleMd.slap.notes ? scaleMd.slap.notes[noteName] : scaleMd.notes[Metadata.slapMap[noteName]];
            note.rollNoteList = [buildRollNote(rollNoteName, noteLength, Metadata.fretToRollColors[note.fret], false)];

        } else {
            note.rollNoteList = [];
            var chord = scaleMd.chords[noteName];
            var noteLength = trimToNextNonPolyphonicNote(note, chord.length, shawzinMd.config.type);
            for (var n = 0; n < chord.notes.length; n++) {
                var rollNoteName = chord.notes[n];
                note.rollNoteList.push(buildRollNote(rollNoteName, noteLength, Metadata.fretToRollColors[note.fret], false));
            }
        }

        note.rollRow = document.createElement("div");
        note.rollRow.className = "roll-note-row";
        note.rollRow.style.left = "0px";
        note.rollRow.style.top = ((note.time + tickOffset) * tickSpacing) + "px";
        for (var n = 0; n < note.rollNoteList.length; n++) {
            note.rollRow.appendChild(note.rollNoteList[n]);
        }
        note.rollRow.rollNoteList = note.rollNoteList;
        roll.append(note.rollRow);

        ensureTickCapacity(note.time);
    }

    function clearRollNoteRow(note) {
        if (note.rollRow) {
            note.rollRow.remove();
            note.rollRow = null;
        }
    }

    function buildRollNote(name, length, color, outline) {
        var div = document.createElement("div");
        div.className = outline ? "roll-note-outline" : "roll-note";
        div.style.left = Metadata.noteToRollOffsets[name] + "px";
        div.style.top = "0px";
        div.style.width = "12px"; // todo: metadata
        div.style.height = (length * tickSpacing) + "px";
        div.style.backgroundColor = color;
        div.style.borderColor = "#202020";
        return div;
    }


    // public members
    return  {
        registerEventListeners: registerEventListeners,
        setSong: setSong,
        updateShawzin: rebuildRollNotes,
        updateScale: rebuildRollNotes
    };
})();


