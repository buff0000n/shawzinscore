// pretty complete MIDI file spec: http://www.somascape.org/midi/tech/mfile.html
// full spec: https://midi.org/standard-midi-files-specification

const MidiReader = (function() {
    container = null;

    fileContentDiv = null;
    processingLogDiv = null;
    processingLog = null;
    dialogClose = null;

    function registerListeners() {
        document.getElementById("midi-import-input").addEventListener("change", handleFileSelection);

        fileContentDiv = document.getElementById("midi-import-display");
        processingLogDiv = document.getElementById("midi-import-log");
        processingLog = document.getElementById("midi-import-log-textarea");

        document.getElementById("midi-import-close").addEventListener("click", () => {
            showDialog(false);
        });

        // have to delay this as the file input element hasn't been sized yet
        setTimeout(() => {
            Events.addCombinedResizeListener(resize);
        }, 10);

    }

    function resize(w, h) {
        document.getElementById("midi-import").style.height = h + "px";
        document.getElementById("midi-import-display").style.height = (h -
                // subtract title bar and input field section
                PageUtils.getHeight("midi-import-title") -
                PageUtils.getHeight("midi-import-fields") -
                // fudge factor for all the margins
                24
        ) + "px";
    }

    function showDialog(show = true) {
        // register listeners lazily, who else is ever going to use this?
        if (fileContentDiv == null) {
            registerListeners();
        }

        const midiImportSection = document.getElementById("midi-import");
        midiImportSection.style.display = show ? "inline-block" : "none";

        if (show) {
            // scroll to midi file dialog, wait for it to be laid out
            setTimeout(() => {
                document.scrollingElement.scrollTo(0, document.scrollingElement.scrollTop + document.getElementById("midi-import").getBoundingClientRect().top);
            }, 10);
        }
    }

    function handleFileSelection(event) {
        const file = event.target.files[0];

        // Validate file existence and type
        if (!file) {
            showMessage("No file selected. Please choose a file.", "error");
            return;
        }

        fileContentDiv.style.display = "none";
        processingLog.value = "";
        processingLogDiv.style.display = "block";

        // Displays a message to the user
        function showMessage(message) {
            processingLog.value += message + "\n";
            processingLog.scrollTop = processingLog.scrollHeight;
        }

        // Read the file
        const reader = new FileReader();
        reader.onload = () => {
            const fileName = document.getElementById("midi-import-input").files[0].name
            document.getElementById("midi-import-filename").innerHTML = `<strong>${fileName}</strong>`;
            processingLog.innerHTML = "";
            const midiSong = MidiFileUtils.readMidiFile(reader.result, showMessage);

            if (midiSong == null) {
                return;
            }

            // showMidiSong(fileProcessingDisplay, midiSong);
            const table = buildMidiSongGrid(midiSong, (startTrack, startMeasure, endTrack, endMeasure) => {
                const track = midiSong.getNotesInRange(startTrack, startMeasure, endTrack, endMeasure);
                MidiProcessor.processTrack(track, showMessage);
            });
//            dialogClose();
            fileContentDiv.innerHTML = "";
            fileContentDiv.appendChild(table);
            fileContentDiv.style.display = "block";
            processingLogDiv.style.display = "none";
//            showDialog();
        };
        reader.onerror = () => {
            showMessage("Error reading the file. Please try again.", "error");
        };
        reader.readAsArrayBuffer(file);
    }

    function showMidiSong(element, song) {
        element.innerHTML = "";

        function appendTitle(text) {
            const div = document.createElement("div");
            div.innerHTML = `<h1>${text}</h1>`;
            element.appendChild(div);
        }

        function appendText(text) {
            const div = document.createElement("div");
            div.innerHTML = text;
            element.appendChild(div);
        }

        appendTitle(song.name);

        for (var i = 0; i < song.tracks.length; i++) {
            const track = song.tracks[i];
            appendTitle(`Track ${i + 1}: ${track.name}`);
            track.notes.forEach(function(note) {
                appendText(note.toString());
            });
        }
    }

    // rangeSelectionListener(trackNumber, startMeasure, endMeasure)
    function buildMidiSongGrid(midiSong, rangeSelectionListener) {
        const table = document.createElement("table");
        table.className = "midiGrid";
        const numMeasures = midiSong.lastEventTime.measure + 1;

        const numTr = document.createElement("tr");
        numTr.appendChild(document.createElement("th"));
        const numIncrement = 8;
        for (var i = 0; i < numMeasures; i+= numIncrement) {
            const numTh = document.createElement("th");
            numTh.className = "midiNumber";
            numTh.innerHTML = `${i + 1}`;
            numTh.colSpan = Math.min(numMeasures - i, numIncrement);
            numTr.appendChild(numTh);
        }
        table.appendChild(numTr);

        for (var t = 0; t < midiSong.tracks.length; t++) {
            const track = midiSong.tracks[t];
            const tr = document.createElement("tr");

            const nameTh = document.createElement("th");
            if (track.name) nameTh.innerHTML = `<strong>${track.name}</strong>`;
            nameTh.className = "midiLabel";
            tr.appendChild(nameTh);

            var currentMeasure = -1;

            function addCell(className, trackNum, measureNum) {
                const td = document.createElement("td");
                td.className = className;
                td.t = trackNum;
                td.m = measureNum;
                tr.appendChild(td);
            }

            function addBlank(trackNum, measureNum) {
                addCell("no", trackNum, measureNum);
            }

            function addNaFilled(trackNum, measureNum) {
                addCell("na", trackNum, measureNum);
            }

            function addFilled(trackNum, measureNum) {
                addCell("ya", trackNum, measureNum);
            }

            for (var n = 0; n < track.notes.length; n++) {
                const note = track.notes[n];
                const time = note.time;
                while (currentMeasure < time.measure - 1) {
                    currentMeasure += 1;
                    addBlank(t, currentMeasure);
                }
                if (currentMeasure == time.measure - 1) {
                    currentMeasure += 1;
                    if (note.channel == 9) {
                        // drum track
                        addNaFilled(t, currentMeasure);
                    } else {
                        addFilled(t, currentMeasure);
                    }
                }
            }
            while (currentMeasure < numMeasures - 1) {
                addBlank(t, currentMeasure);
                currentMeasure += 1;
            }

            table.appendChild(tr);
        }

        function resetSelection(table) {
            table.startTrack = null;
            table.startMeasure = null;
            table.endTrack = null;
            table.endMeasure = null;
        }

        function modifySelection(table, startTrack, startMeasure, endTrack, endMeasure, selected) {
            for (var t = startTrack; t <= endTrack; t++) {
                for (var m = startMeasure; m <= endMeasure; m++) {
                    const cell = table.childNodes[t + 1].childNodes[m + 1];
                    if (selected) {
                        cell.classList.add("selected");
                    } else {
                        cell.classList.remove("selected");
                    }
                }
            }
        }

        table.addEventListener("click", (e) => {
            var track = e.target.t;
            var measure = e.target.m;

            if (track != null) {
                // sigh, still can never figure out when you lose context and when you don't
                const table = e.currentTarget;
                if (table.endTrack) {
                    modifySelection(table, table.startTrack, table.startMeasure, table.endTrack, table.endMeasure, false);
                    resetSelection(table);
                }

                if (table.startTrack == null) {
                    table.startTrack = track;
                    table.startMeasure = measure;
                    modifySelection(table, table.startTrack, table.startMeasure, table.startTrack, table.startMeasure, true);

                } else {
                    table.endTrack = track;
                    table.endMeasure = measure;
                    modifySelection(table, table.startTrack, table.startMeasure, table.endTrack, table.endMeasure, true);
                    rangeSelectionListener(table.startTrack, table.startMeasure, table.endTrack, table.endMeasure);
                }
            }
        }, { passive: false });

        return table;
    }

    return {
        // showDialog(element)
        //   element: base element
        showDialog: showDialog,
    };
})();

const MidiProcessor = (function() {
    function processTrack(track, logCallback = (t) => { console.log(t); }) {
        // todo: options dialog
        const options = new MidiOptions(logCallback);

        // start with meter, tempo, etc
        const struct = calcStructure(options, track);
        // build a track cache and the initial, untransposed track re-timed to Shawzin time
        const trackCache = new MidiTrackCache(options, struct.meter, struct.tempo, struct.leadIn, struct.tempoMultiplier);
        trackCache.init(track);

        // todo: guess/iterate over these
        const shawzinmd = Metadata.shawzinList[Model.getShawzin()];
        const scalemd = shawzinmd.scales[Model.getScale()];
        const offset = Piano.getPitchOffset(Model.getKeySig());

        // cram it
        cram(options, trackCache, scalemd, offset);

//        for (var n = 0; n < track.notes.length; n++) {
//            const div = document.createElement("div");
//            div.innerHTML = track.notes[n].toString();
//            fileProcessingDisplay.appendChild(div);
//        }
    }

    function calcStructure(options, track) {
        var meter = null;
        var tempo = null;
        var leadIn = null;
        var tempoMultiplier;

        const firstNote = track.notes[0];
        const lastNote = track.notes[track.notes.length - 1];
        const tempos = track.midiSong.getTemposInRange(firstNote.time, lastNote.time);

        // ugh, might as well check for multiple tempo changes that are all the same tempo
        var oneTempo = true;
        for (var i = 1; i < tempos.length; i++) {
            if (tempos[i - 1].microsecondsPerQ != tempos[i].microsecondsPerQ) {
                oneTempo = false;
                break
            }
        }

        if (oneTempo) {
            // just use the starting meter
            meter = track.midiSong.getMeter(firstNote.time);
            leadIn = // lead-in whole beats
                     ((meter.numerator - firstNote.time.beat) % meter.numerator) -
                     // lead-in partial beats
                     (firstNote.time.beatTick / ((4 / meter.denominator) * track.midiSong.ticksPerQ));

            // need beats per minute
            // beats/Q * Q/microseconds * microseconds/minute
            var bpm = ((meter.denominator / 4) * 60000000) / tempos[0].microsecondsPerQ;

            // get the list of "allowed" Shawzin tempos
            const tempoList = MetadataUI.tempoList;
            // normalize the song's bpm to be within the allowed range
            while (bpm < tempoList[0]) {
                bpm *= 2;
                leadIn *= 2;
                // fix lead-in if it exceeds the meter numerator
                while (leadIn > meter.numerator) {
                    meter.numerator -= meter.numerator;
                }
            }
            while (bpm > tempoList[tempoList.length - 1]) {
                bpm /= 2;
                leadIn /= 2;
            }

            tempo = tempoList[0];
            function getTempoError(t1, t2) {
                return Math.abs((1/t1) - (1/t2));
            }
            for (var i = 1; i < tempoList.length; i++) {
                if (getTempoError(bpm, tempoList[i]) < getTempoError(bpm, tempo)) {
                    tempo = tempoList[i];
                }
            }

            // save result
            tempoMultiplier = tempo/bpm;

            options.log(`Using ${meter.numerator}/${meter.denominator} at ${bpm} (${Math.round((1 - tempoMultiplier) * 100)}% speed), ${leadIn.toFixed(2)} lead-in beats`);

        } else {
            // the tempo changes, there's no point in trying to assign a meter or figure out tempo
            this.tempoMultiplier = 1;
            options.log("Tempo changes detected, not applying any meter or adjusting tempo");
        }

        return {"meter": meter, "tempo": tempo, "leadIn": leadIn, "tempoMultiplier": tempoMultiplier};
    }


    function getMidiInfoForScale(scalemd) {
        // already cached
        if (scalemd.midi) return scalemd.midi;

        // map scale notes
        const scaleMidiNotes = Metadata.scaleNoteOrder.map(sno =>
                               Metadata.noteIndex[scalemd.notes[sno]] + Midi.midiNoteC);

        // map each chord
        const chordMidiNotes = [];
        for (var c = 0; c < Metadata.scaleChordOrder.length; c++) {
            // I'm pretty sure this is already sorted lowest to highest, but sort it again so we're sure it
            // will match with the midi chords.
            const chordNotes = scalemd.chords[Metadata.scaleChordOrder[c]].notes;
            const midiNotes = chordNotes.map((n) => Metadata.noteIndex[n] + Midi.midiNoteC);
            chordMidiNotes.push(midiNotes);
        }

        // do some indexing on the scale notes
        const midiNoteIndex = new Map();
        var minMidiNote = 128;
        var maxMidiNote = -1;
        for (var n = 0; n < scaleMidiNotes.length; n++) {
            midiNoteIndex.set(scaleMidiNotes[n], n);
            if (scaleMidiNotes[n] < minMidiNote) minMidiNote = scaleMidiNotes[n];
            if (scaleMidiNotes[n] > maxMidiNote) maxMidiNote = scaleMidiNotes[n];
        }

        const midiInfo = {
            "notes": scaleMidiNotes,
            "noteIndex": midiNoteIndex,
            "minNote": minMidiNote,
            "maxNote": maxMidiNote,
            "chords": chordMidiNotes
        };
        scalemd.midi = midiInfo;
        return midiInfo;
    }

    function cram(options, trackCache, scalemd, offset) {
        // stats
        // todo: put in context
        var octaveJumps = 0;

        // transpose the track according to the offset
        const transposed = trackCache.getTransposed(offset);

        // pull out the sequence, note inventory, and chord inventory.
        // [{t: shawzin tick, n: midi note}]
        const seq = transposed.seq;
        // { midi note -> count }
        const noteInventory = transposed.ni;
        // { [sorted midi notes] -> count }
        const chordInventory = transposed.ci;

        // build a context to hold this session's inputs and outputs
        const context = new MidiReaderContext(options, scalemd, offset);

        // get the midi <-> shawzin mapping for the scale
        // {
        //    "notes": scaleMidiNotes,
        //    "noteIndex": midiNoteIndex,
        //    "minNote": minMidiNote,
        //    "maxNote": maxMidiNote,
        //    "chords": chordMidiNotes
        // }
        const scaleMidiInfo = getMidiInfoForScale(context.scalemd);

        // OKAY NOW WHAT

        // build note mappings
        // returns: { midi note -> [ {n: mapped midi note, o: octave difference(, d: error delta)} ] }
        const noteMappings = buildNoteMappings(context, scaleMidiInfo, noteInventory);

        // chord mappings
        // returns: { [sorted midi notes] -> (
        //                                     {chord: shawzin chord index} |
        //                                     {note: {n: mapped midi note, o: octave difference(, d: error delta)}}
        //                                    ) }
        const chordMappings = buildChordMappings(context, scaleMidiInfo, chordInventory, noteMappings);

        // build octave regions
        // returns: [{"start": seq index, "end": seq index, "octaves": Set(octaves)});
        const octaveRegions = buildOctaveRegions(context, seq, noteMappings, chordMappings);

        // pick an octave for each region, minimizing octave jumps
        // returns: [octave ints]
        const octaveRegionPlan = buildOctaveRegionPlan(context, octaveRegions);

        // plan out exactly where the octave breaks are
        // returns: [{"noteIndex", "octave"}]
        const octaveEvents = buildOctavePlan(context, trackCache, seq, octaveRegions, octaveRegionPlan);

        // apply octave changes to each note in the sequence
        // context: context
        // seq: [{t: shawzin tick, n: midi note}]
        // octaveEvents: [{"noteIndex", "octave"}]
        // returns: [{t: shawzin tick, n: midi note}]
        const transposedSeq = applyOctaveEvents(context, seq, octaveEvents)

        // apply note and chord mappings to each note in the sequence
        // context: context
        // seq: [{t: shawzin tick, n: midi note}]
        // octaveEvents: [{"noteIndex", "octave"}]
        // returns: [{t: shawzin tick, n: midi note}]
        const fixedSeq = pickNotes(context, transposedSeq)

        // apply note and chord mappings to each note in the sequence
        // context: context
        // seq: [{t: shawzin tick, n: midi note}]
        // octaveEvents: [{"noteIndex", "octave"}]
        // returns: [{t: shawzin tick, n: midi note}]
        const mappedSeq = applyMappings(context, transposedSeq, octaveEvents)


        // noteMappings: { midi note -> [ {n: mapped midi note, o: octave difference(, d: error delta)} ] }
        // chord mappings: [sorted midi notes] -> (
        //                                          {chord: shawzin chord index} |
        //                                          {note: {n: mapped midi note, o: octave difference(, d: error delta)}}
        //                                        ) }
        // returns: [{t: shawzin tick, n: []}]
        // noteMappings, chordMappings,

    }

    // returns: { midi note -> [ {n: mapped midi note, o: octave difference(, d: error delta)} ] }
    function buildNoteMappings(context, scaleMidiInfo, noteInventory) {
        var matchedNoteCount = 0;
        var nearMatchedNoteCount = 0;
        var unmatchedNoteCount = 0;

        // build note mapping options
        const noteMappings = new Map();
        // loop over note inventory
        noteInventory.entries().forEach((e) => {
            const note = e[0];
            // Find the octave offset of the note to its first occurrence in the scale range
            var minOctaveOffset = 0;
            while (note + minOctaveOffset > scaleMidiInfo.minNote) minOctaveOffset -= 12;
            while (note + minOctaveOffset < scaleMidiInfo.minNote) minOctaveOffset += 12;
            // find matches in the scale range
            const matches = [];
            for (var octaveOffset = minOctaveOffset; note + octaveOffset <= scaleMidiInfo.maxNote; octaveOffset += 12) {
                if (scaleMidiInfo.noteIndex.has(note + octaveOffset)) {
                    matches.push({"n": note + octaveOffset, "o": octaveOffset});
                }
            }

            if (matches.length > 0) {
                matchedNoteCount += e[1];

            } else {
                // uh-oh
                // look 1 half-step away, then 2 half-steps away, if it's further than that then give up
                for (var d = 1; d < 2; d++) {
                    for (var octaveOffset = minOctaveOffset - 12; note + octaveOffset + d <= scaleMidiInfo.maxNote; octaveOffset += 12) {
                        if (scaleMidiInfo.noteIndex.has(note + octaveOffset) - d) {
                            matches.push({"n": note + octaveOffset - d, "o": octaveOffset, "d": -d});
                        }
                        if (scaleMidiInfo.noteIndex.has(note + octaveOffset) + 1) {
                            matches.push({"n": note + octaveOffset + d, "o": octaveOffset, "d": d});
                        }
                    }
                    if (matches.length > 0) {
                        nearMatchedNoteCount += e[1];
                        break;
                    }
                }
            }

            if (matches.length > 0) {
                noteMappings.set(note, matches);

            } else {
                unmatchedNoteCount += e[1];
            }
        });

        if (unmatchedNoteCount > 0) {
            // this shouldn't happen, no scale has a gap bigger than 4
            throw `${unmatchedNoteCount} notes unable to be matched in the scale`;
        }

        context.matchedNoteCount = matchedNoteCount;
        context.nearMatchedNoteCount = nearMatchedNoteCount;
        context.unmatchedNoteCount = unmatchedNoteCount;
        return noteMappings;
    }

    // build chord mappings
    // returns: { [sorted midi notes] -> (
    //                                     {chord: shawzin chord index} |
    //                                     {n: mapped midi note, o: octave difference(, d: error delta)}
    //                                    ) >
    function buildChordMappings(context, scaleMidiInfo, chordInventory, noteMappings) {
        var matchedChords = 0;
        var unmatchedChords = 0;

        // chords will either be an exact match or we'll revert to the note mapping for the top note.
        var chordMappings = new Map();
        chordInventory.entries().forEach((e) => {
            const midiChord = e[0];
            var foundMatch = null;
            // all we an do is a hard target search
            for (var c = 0; c < scaleMidiInfo.chords.length; c++) {
                if (ObjectUtils.listEquals(midiChord, scaleMidiInfo.chords[c])) {
                    // amazing coincidence or the midi file was built specifically with Shawzins in mind
                    foundMatch = c;
                    break;
                }
            }

            if (foundMatch != null) {
                // exact chord match
                matchedChords += 1
                chordMappings.set(midiChord, {"chord": foundMatch});

            } else {
                unmatchedChords += 1;
                // use the note mapping options for the top note in the chord
                chordMappings.set(midiChord, noteMappings.get(midiChord[midiChord.length - 1]));
            }
        });

        context.matchedChords = matchedChords;
        context.unmatchedChords = unmatchedChords;
        return chordMappings;
    }

    // build octave regions
    // context: context
    //   seq:
    //   return: [{"start": seq index, "end": seq index, "octaves": Set(octaves)});
    function buildOctaveRegions(context, seq, noteMappings, chordMappings) {
        const octaveRegions = [];
        // state
        var currentOctaveRegionStart = null;
        var currentRegionOctaves = null;

        for (var n = 0; n < seq.length; n++) {
            const notes = seq[n].n;

            // skip mapped chords
            if (notes.length > 1 && chordMappings.get(notes).chord) {
                continue;
            }

            // get the note mapping options
            const noteMapping = notes.length == 1 ? noteMappings.get(notes[0]) : chordMappingOptions.get(notes);
            // pull out the octave options
            const octaves = new Set();
            noteMapping.entries().forEach((e) => {
                octaves.add(e[1].o);
            });
            // check if we have a current octave region and it doesn't match the current note's octaves
            if (currentRegionOctaves != null && (!currentRegionOctaves.isSubsetOf(octaves) || !octaves.isSubsetOf(currentRegionOctaves))) {
                // end of region
                octaveRegions.push({"start": currentOctaveRegionStart, "end": n - 1, "octaves": currentRegionOctaves});
                currentRegionOctaves = null;
                currentOctaveRegionStart = null;
            }

            if (currentRegionOctaves == null) {
                // start new region
                currentRegionOctaves = octaves;
                currentOctaveRegionStart = n;
            }
        }
        // last region
        octaveRegions.push({"start": currentOctaveRegionStart, "end": seq.length - 1, "octaves": currentRegionOctaves});

        return octaveRegions;
    }

    function buildOctaveRegionPlan(context, octaveRegions) {
        var bestPath = null;
        var bestPathChanges = octaveRegions.length;

        const octaves = [];
        octaveRegions.forEach((octaveRegion) => {
            octaves.push(Array.from(octaveRegion.octaves).sort());
        });

        function traverse(r, currentPath, currentPathChanges) {
            // todo: handle the == case and compare two paths with equal changes
            if (currentPathChanges >= bestPathChanges) return;
            if (r == octaveRegions.length) {
                bestPath = currentPath.slice();
                bestPathChanges = currentPathChanges;
                return;
            }

            const olist = octaves[r];
            var triedOctave = currentPath[r - 1];
            if (currentPath.length > 0 && olist.indexOf(triedOctave) >= 0) {
                currentPath.push(triedOctave);
                traverse(r + 1, currentPath, currentPathChanges);
                currentPath.pop();
            }
            for (var i = 0; i < olist.length; i++) {
                if (olist[i] != triedOctave) {
                    currentPath.push(olist[i]);
                    traverse(r + 1, currentPath, r == 0 ? 0 : currentPathChanges + 1);
                    currentPath.pop();
                }
            }
        }

        traverse(0, [], 0);

        return bestPath;
    }


    // returns: [{"noteIndex", "octave"}]
    function buildOctavePlan(context, trackCache, seq, octaveRegions, octaveRegionPlan) {
        // Okay, octave regions are set in stone, let's screw with them some more
        const octaveEvents = [];

        function addOctaveEvent(noteIndex, octave) {
            octaveEvents.push({"noteIndex": noteIndex, "octave": octave});
        }

        // starting entry
        addOctaveEvent(octaveRegions[0].start, octaveRegionPlan[0]);
        for (var r = 1; r < octaveRegionPlan.length; r++) {
            if (octaveRegionPlan[r] != octaveRegionPlan[r - 1]) {
                // boundary, find out if we can expand it to get some wiggle room
                // search backwards for the octave regions that support the two octaves in question
                var bStart = r;
                while (bStart > 0 &&
                       octaveRegions[bStart - 1].octaves.has(octaveRegionPlan[r]) &&
                       octaveRegions[bStart - 1].octaves.has(octaveRegionPlan[r - 1]))
                       bStart -= 1;
                // search forwards for the octave regions that support the two octaves in question
                var bEnd = r - 1;
                while (bEnd < octaveRegions.length - 1 &&
                       octaveRegions[bEnd + 1].octaves.has(octaveRegionPlan[r]) &&
                       octaveRegions[bEnd + 1].octaves.has(octaveRegionPlan[r - 1]))
                       bEnd += 1;

                if (bStart > bEnd) {
                    // no wiggle room found, this is a hard octave boundary.  we have to switch right here
                    addOctaveEvent(octaveRegions[r].start, octaveRegionPlan[r]);

                } else {
                    // we have some wiggle room.  Find a good split point in the regions range
                    var start = octaveRegions[bStart].start;
                    var end = octaveRegions[bEnd].end;

                    // get the guessed weightings for what notes start phrases
                    const weighting = trackCache.getPhraseWeighting();

                    // find the highest weight note, include the first note of the next region
                    var phraseNote = -1;
                    for (var n = start; n <= end + 1; n++) {
                        if (phraseNote == -1 || weighting[n] > weighting[phraseNote]) {
                            phraseNote = n;
                        }
                    }

                    // todo: range check?
                    addOctaveEvent(phraseNote, octaveRegionPlan[r]);
                }
            }
        }
        return octaveEvents;
    }

    function finalizeNotes(octavePlan) {


    }


    return {
        // processTrack(track, logCallback) {
        processTrack: processTrack,
        // getMidiInfoForScale(scalemd)
        getMidiInfoForScale: getMidiInfoForScale,
    };
    
})();

class MidiReaderContext {
    constructor(options, scalemd, offset) {
        this.options = options;
        this.log = options.log;
        this.scalemd = scalemd;
        this.offset = offset;
    }
}

class MidiTrackCache {
    constructor(options, meter, tempo, leadin, tempoMultiplier) {
        this.options = options;

        this.midiTrack = null;

        this.meter = meter;
        this.tempo = tempo;
        this.leadin = leadin;
        this.tempoMultiplier = tempoMultiplier;

        // stats
        this.minGap = null;
        this.maxGap = null;
        this.avgGap = null;

        // map of transposed sequence + inventory objects
        this.tmap = new Map();
        // lazily calculated
        this.phraseWeighting = null;
    }

    init(track) {
        this.midiTrack = track;
        // delicious fudge
        const fudge = (1 / (Metadata.ticksPerSecond * 4));

        // array of arrays, chords will have multiple elements in the array
        const sequence = [];
        var startingTick = 0;
        // loop over the track
        for (var n = 0; n < track.notes.length; n++) {
            const note = track.notes[n];
            // convert midi time to seconds, scale by multiplier, add a small fudge factor so ties go to the later tick, and convert to shawzin ticks
            const shawzinTick = Math.round( (((note.time.microseconds * this.tempoMultiplier) / 1000000) + fudge) * Metadata.ticksPerSecond);
            // if this is the first note in the track, or the previous note is at an earlier time,
            // then start a new entry
            if (sequence.length == 0 || sequence[sequence.length - 1].t < shawzinTick) {
                if (sequence.length == 0) startingTick = shawzinTick;
                sequence.push({"t": shawzinTick - startingTick, "n": [note.note], "mn": [note]});
            } else {
                // otherwise, add to the latest entry
                sequence[sequence.length - 1].n.push(note.note);
                // sigh, we need the whole midi note much later when finding good octave jump points
                sequence[sequence.length - 1].mn.push(note);
            }
        }

        // map for storing notes and their counts
        const noteInventory = new Map();
        // map for storing canonical chord note arrays and their counts
        const chordInventory = new Map();

        function addNoteToInventory(note) {
            if (noteInventory.has(note)) {
                noteInventory.set(note, noteInventory.get(note) + 1);
            } else {
                noteInventory.set(note, 1);
            }
        }

        // initilize stats
        var maxGap = -1;
        var minGap = 4*60*16;
        var gapTotal = 0;

        // second pass over the sequence
        for (var n = 0; n < sequence.length; n++) {
            const notes = sequence[n].n;

            if (notes.length == 1) {
                addNoteToInventory(notes[0]);

            } else {
                // sort each chord array ascending
                notes.sort();
                // might as well sort the midi notes
                sequence[n].md.sort((a, b) => { return a.note - b.note});

                // add the top chord note to the note inventory, unless someone specifically built the midi file
                // with shawzin chords in mind we will probably reduce them to their top note
                addNoteToInventory(notes[notes.length - 1]);

                // find a match in the chord inventory.  We can't just use Map.get() because Map indexes objects by
                // identity.  It's so useful!
                const match = chordInventory.entries().find((e) => { return ObjectUtils.listEquals(e[0], notes)});
                if (match) {
                    // found a match, increment the count
                    chordInventory.set(match[0], match[1] + 1);
                    // replace the sequence entry with the canonical array object, so looking the note array up in
                    // a map will now work.
                    sequence[n].n = match[0];
                } else {
                    // no match, start a new map entry. this array will be the canonical version for this chord
                    chordInventory.set(notes, 1);
                }
            }

            if (n > 0) {
                const gap = sequence[n].t - sequence[n-1].t;
                if (gap < minGap) minGap = gap;
                if (gap > maxGap) maxGap = gap;
                gapTotal += gap;
            }
        }

        // start with the zero transposition entry
        this.tmap.set(0, {"seq": sequence, "ni": noteInventory, "ci": chordInventory});
        // save stats
        this.minGap = minGap;
        this.maxGap = maxGap;
        this.avgGap = gapTotal / sequence.length;
    }

    getTransposed(offset) {
        if (this.tmap.has(offset)) {
            return this.tmap.get(offset);
        }
        // start with the non-transposed version
        const base = this.tmap.get(0);

        // mapped note inventory
        const tni = new Map();
        base.tni.entries().forEach((e) => {
            tni.set(e[0] + offset, e[1]);
        });

        // mapped chord inventory
        const cni = new Map();
        // mapping from canonical original chords to canonical transposed chords
        const chordMapping = new Map();
        base.cni.entries().forEach((e) => {
            const notes = e[0];
            const mappedNotes = [];
            for (var n = 0; n < notes.length; n++) {
                mappedNotes.push(notes[n] + offset);
            }
            chordMapping.set(notes, mappedNotes);
            cni.set(mappedNotes,e[1]);
        });

        // create mapped note sequence
        const sequence = [];
        base.seq.forEach((s) => {
            const time = s.time;
            var notes;
            if (s.notes.length == 1) {
                notes = [s.notes[0] + offset];
            } else {
                notes = chordMapping.get(s.notes);
            }
            // omit mn, we don't need it
            seq.push({"t": time, "n": notes});
        });

        const tmapEntry = {"seq": sequence, "ni": noteInventory, "ci": chordInventory};
        this.tmap.set(offset, tmapEntry);
        return tmapEntry;
    }

    // returns: [float]
    getPhraseWeighting(options) {
        if (this.phraseWeighting != null) return this.phraseWeighting;

        // todo: make these configurable and/or make different profiles?
        const measureBoundaryWeighting = 1;
        const measureBoundaryFactorFalloff = 2;

        const beatBoundaryWeighting = 0.25;
        const beatBoundaryFactorFalloff = 2;

        const gapWeighting = 2;
        const gapFactorFalloff = 2;

        // todo: subsequence/repetition search?

        const weights = [];
        // const table = [];
        // skip the first note, it can't have an octave break
        weights.push(0);

        // get the original untransposed sequence, which is linked to the original midi notes
        const seq = this.tmap.get(0).seq;
        for (var n = 1; n < seq.length; n++) {
            // gap weighting based on the shawzin time max gap
            const gap = seq[n].t - seq[n - 1].t;
            const gapFactor = Math.pow(gap / this.maxGap, gapFactorFalloff);
            // const debug = {"t": seq[n].mn[0].time.toString(), "n": seq[n].mn[0].note};
            // debug["gw"] = gapFactor.toFixed(2);

            if (this.meter != null) {
                // measure and beat weightings based on the midi notes, of which there may be multiple
                var mbFactorSum = 0;
                var bbFactorSum = 0;

                for (var i = 0; i < seq[n].mn.length; i++) {
                    const midiTime = seq[n].mn[i].time;
                    // todo: optimize/cache meter?
                    const meter = this.midiTrack.midiSong.getMeter(midiTime);
                    // calculate ticks/beat
                    const beatMidiTicks = this.midiTrack.midiSong.ticksPerQ / (meter.denominator / 4);

                    // fraction of a full beat portion of the note time
                    const beatFraction = midiTime.beatTick / beatMidiTicks;
                    // distance to the nearest beat, normalized
                    const beatDistance = Math.abs((beatFraction * 2) - 1);
                    // calculate beat factor
                    const bbFactor = Math.pow(beatDistance, beatBoundaryFactorFalloff);
                    // add to running sum
                    bbFactorSum += bbFactor;

                    // fraction of a full measure portion of the note time
                    const measureFraction = ((midiTime.beat * beatMidiTicks) + beatFraction) / (meter.numerator * beatMidiTicks);
                    // distance to the nearest measure, normalized
                    const measureDistance = Math.abs((measureFraction * 2) - 1);
                    // calculate measure factor
                    const mbFactor = Math.pow(measureDistance, measureBoundaryFactorFalloff);
                    // add to running sum
                    mbFactorSum += mbFactor;
                }

                // average the beat and measure factors
                const bbAvgFactor = (bbFactorSum / seq[n].mn.length);
                const mbAvgFactor = (mbFactorSum / seq[n].mn.length);

                // debug["bbw"] = bbAvgFactor.toFixed(2);
                // debug["mbw"] = mbAvgFactor.toFixed(2);

                // Just add weighted factors and normalize
                const weight = (
                    (gapFactor * gapWeighting) +
                    (bbAvgFactor * beatBoundaryWeighting) +
                    (mbAvgFactor * measureBoundaryWeighting)
                ) / (gapWeighting + beatBoundaryWeighting + measureBoundaryWeighting);
                weights.push(weight);
                // debug["w"] = weight.toFixed(4);
                // table[n] = debug;

            } else {
                // no meter, the only factor we have is the gap
                weights.push(gapWeighting);
            }
        }

        // cache for later
        this.phraseWeighting = weights;
        return this.phraseWeighting;
    }
}

class MidiOptions {
    constructor(logCallback) {
        this.log = logCallback;
    }
}

//function main() {
//    MidiReader.registerListeners();
//}

// waay overcomplicated
//        function buildOctaveRegionPlan0(context, octaveRegions) {
//            // this is gonna be a thing
//            // 1. octave region plan
//            //    a. get the octave option that covers the most of the track, by time range.
//            //    b. for each gap where that octave is not an option, recursively call (1) with just the gap range
//            // 2. region adjustment:
//            //    a. find any separate octave streaks that can be connected
//            //    b. expand boundaries between octaves to include regions where they're both in common
//            //    c. for each non-zero boundary section, find a "good" spot to make the octave break
//
//            // octaveRegionPlan: [{"octave", "startRegion", "endRegion"}]
//            function fillPlanGap(startRegion, endRegion) {
//                // octaveToStreaks: octave -> {totalTickLen, streaks: [{startRegion, endRegion}]}
//                const octaveToStreaks = new Map();
//                // bookkeeping function
//                function addStreak(octave, startStreakRegion, endStreakRegion) {
//                    // calculate streak length in ticks from first to last note in region
//                    // christ, we have to map from region index to note index to tick
//                    const tickLen = seq[octaveRegions[endStreakRegion].end].t - seq[octaveRegions[startStreakRegion].start].t;
//                    // init streak map
//                    if (!octaveToStreaks.has(octave)) {
//                        octaveToStreaks.set(octave, {"totalTickLen": 0, "streaks": []});
//                    }
//                    const streaks = octaveToStreaks.get(octave);
//                    // increment tick total
//                    streaks.totalTickLen += tickLen;
//                    // add streak entry
//                    streaks.streaks.push({"startRegion": startStreakRegion, "endRegion": endStreakRegion, "ticklen": tickLen});
//                }
//                // keep track of running streaks while iterating over the octave regions
//                const currentStreaks = new Map();
//                for (var r = startRegion; r <= endRegion; r++) {
//                    const octaveRegion = octaveRegions[r];
//                    // end any current streaks that are no longer present in the current region
//                    currentStreaks.entries().forEach((e) => {
//                        const octave = e[0];
//                        if (!octaveRegion.octaves.has(octave)) {
//                            // streak no longer present, close it out
//                            addStreak(octave, e[1], r - 1);
//                            // todo: is this safe?
//                            currentStreaks.delete(octave);
//                        }
//                    });
//                    // start any new streaks not present in the current streaks
//                    octaveRegion.octaves.forEach((o) => {
//                        if (!currentStreaks.has(o)) {
//                            // start streak
//                            currentStreaks.set(o, r);
//                        }
//                    });
//                }
//                // at the end, close any still pending streaks
//                currentStreaks.entries().forEach((e) => {
//                    const octave = e[0];
//                    addStreak(octave, e[1], octaveRegions.length - 1);
//                });
//
//                // look through the streaks and find the octave that covers the most of the range
//                var streakOctave = null;
//                var streakEntry = null;
//                octaveToStreaks.entries().forEach((e) => {
//                    if (streakEntry == null || streakEntry.totalTickLen < e[1].totalTickLen) {
//                        streakOctave = e[0];
//                        streakEntry = e[1];
//                    }
//                });
//
//                // streaks should already be in chronological order
//                // start building the region plan
//                const regionOctavePlan = [];
//                for (var s = 0; s < streakEntry.streaks.length; s++) {
//                    // fill gap if present
//                    if (s > 0 && streakEntry.streaks[s - 1].endRegion + 1 < streakEntry[s].startRegion) {
//                        // recursive call, get an octave plan covering the regions in the gap
//                        const gapPlan = buildOctaveRegionPlan(streakEntry.streaks[s - 1].endRegion + 1, streakEntry[s].startRegion - 1);
//                        // append to region pan
//                        for (var r = 0; r < gapPlan.length; r++) {
//                            regionOctavePlan.push(gapPlan[r]);
//                        }
//                    }
//
//                    // append current streak regions to region plan
//                    for (var r = streakEntry.streaks[s].startRegion; r <= streakEntry.streaks[s].endRegion; r++) {
//                        regionOctavePlan.push(streakOctave);
//                    }
//                }
//
//                // done with the plan, for now
//                return regionOctavePlan;
//            } // end fillPlanGap
//
//            const octaveRegionPlan = fillPlanGap(0, octaveRegions.length - 1);
//
//            // continually find the largest gaps between octave regions that can be replaced with that octave and
//            // replace it, until none such gaps found
//            for (;;) {
//                // largest region
//                var largestOctave = null;
//                var largestStartRegion = null;
//                var largestEndRegion = null
//                var largestTickLen = null;
//                function checkLargest(octave, startRegion, endRegion, tickLen) {
//                    if (largestOctave == null || largestTickLen < tickLen) {
//                        largestOctave = octave;
//                        largestStartRegion = startRegion;
//                        largestEndRegion = endRegion;
//                        largestTickLen = tickLen;
//                    }
//                }
//
//                var start = 0;
//                while (start < octaveRegionPlan.length) {
//                    // find end of current streak
//                    const octave = octaveRegionPlan[start];
//                    var end = start;
//                    while (end < octaveRegionPlan.length - 1 && octaveRegionPlan[end + 1] == octave) end++;
//
//                    // see if we can get to another streak of the same octave through regions which support that octave
//                    var otherStart = end + 1;
//                    // keep searching as long as we're not past the end,
//                    while (otherStart < octaveRegionPlan.length &&
//                    // the plan for this region is not the octave in question,
//                    octaveRegionPlan[otherStart] != octave &&
//                    // and the octave region itself supports the octave in question
//                    octaveRegions[otherStart].octaves.has(octave))
//                    otherStart++;
//
//                    // check of we reached the end of the regions or another matching region
//                    if (otherStart == octaveRegionPlan.length && octaveRegionPlan[otherStart] == octave) {
//                        // got a candidate
//                        const adjustStartRegion = end + 1;
//                        const adjustEndregion = otherStart - 1;
//                        // check if it's an empty adjust region, shouldn't happen
//                        if (adjustStartRegion <= adjustEndRegion) {
//                            // calculate the adjustment region's tick size
//                            const adjustTickLen = Seq[octaveRegions[adjustEndRegion].end].t -
//                            Seq[octaveRegions[adjustEndStart].start].t;
//                            // replace current largest if applicable
//                            checkLargest(octave, adjustRegionStart, adjustRegionEnd, adjustTickLen);
//                        }
//                    }
//
//                    // check if there's an adjust we can do all the way back to the beginning
//                    if (start > 0) {
//                        var otherEnd = start - 1;
//                        // keep searching as long as we're not at the end,
//                        while (otherEnd >= 0 &&
//                        // the plan for this region is not the octave in question,
//                        octaveRegionPlan[otherStart] != octave &&
//                        // and the octave region itself supports the octave in question
//                        octaveRegions[otherStart].octaves.has(octave))
//                        end++;
//                    }
//
//                    // go to next region streak
//                    start = end + 1;
//                }
//
//                if (largestOctave != null) {
//                    for (var r = largestStartRegion; r <= largestEndRegion; r++) {
//                        octaveRegionPlan[r] = largestOctave;
//                    }
//                } else {
//                    // no joinable regions found
//                    break;
//                }
//            }
//
//            return octaveRegionPlan;
//        }


