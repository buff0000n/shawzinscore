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
    }

    function showDialog() {
        // register listeners lazily, who else is ever going to use this?
        if (fileContentDiv == null) {
            registerListeners();
        }

        // get the hidden dialog div from the document
        var dialogDiv = document.getElementById("midi-import-dialog");

        // remove it
        dialogDiv.remove();

//        processingLog.content += "blah\n";


        // show the menu with a custom close callback
        dialogClose = Menus.showMenu(dialogDiv, document.documentElement, "MIDI Import", true, () => {
            // when the change speed menu is closed, remove the the original container
            dialogDiv.remove();
            // and add it back to the hidden area of the document
            document.getElementById("hidden-things").appendChild(dialogDiv);
        }, true);
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

        // Read the file
        const reader = new FileReader();
        reader.onload = () => {
            const midiSong = MidiFileUtils.readMidiFile(reader.result, showMessage);

            if (midiSong == null) {
                return;
            }

            // showMidiSong(fileProcessingDisplay, midiSong);
            const table = buildMidiSongGrid(midiSong, (startTrack, startMeasure, endTrack, endMeasure) => {
                const track = midiSong.getNotesInRange(startTrack, startMeasure, endTrack, endMeasure);
                processTrack(track);
            });
            dialogClose();
            fileContentDiv.innerHTML = "";
            fileContentDiv.appendChild(table);
            fileContentDiv.style.display = "block";
            processingLogDiv.style.display = "none";
            showDialog();
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
        const div = document.createElement("div");
        div.className = "midiGridContainer";

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

        div.appendChild(table);
        return div;
    }

    function processTrack(track) {
        fileProcessingDisplay.innerHTML = "";

        var meter = null;
        var tempo = null;
        var tempoMultiplier;

        function calcTempoMeter() {
            const firstNote = track.notes[0];
            const lastNote = track.notes[track.notes.length - 1];
            const tempos = track.midiSong.getTemposInRange(firstNote.time, lastNote.time);

            if (tempos.length == 1) {
                // just use the starting meter
                meter = track.midiSong.getMeter(firstNote.time);
                // need beats per minute
                // beats/Q * Q/microseconds * microseconds/minute
                var bpm = ((startingMeter.denominator / 4) * 60000000) / tempos[0].microsecondsPerQ;

                const tempoList = MetadataUI.tempoList;
                while (bpm < tempoList[0]) {
                    bpm *= 2;
                }
                while (bpm > tempoList[tempoList.length - 1]) {
                    bpm /= 2;
                }

                tempo = tempoList[0];
                function getTempoError(t1, t2) {
                    return Math.abs((1/t1) - (1/t2));
                }
                for (var i = 1; i < tempoList.length; i++) {
                    if (tempoError(bpm, tempoList[i]) < tempoError(bpm, tempo)) {
                        tempo = tempoList[i];
                    }
                }

                tempoMultiplier = tempo/bpm;

            } else {
                // the tempo changes, there's no point in trying to assign a meter or figure out tempo
                tempoMultiplier = 1;
            }
        }

        function retimeAndGroupNotes(track, tempoMultiplier) {
            const groupedNotes = [];
            for (var n = 0; n < track.notes.length; n++) {
                const note = track.notes[n];
                // scale midi time by multiplier, add a small fudge factor so ties go to the later tick, and convert to shawzin ticks
                const shawzinTick = Math.round(((n.time.time * tempoMultiplier) + Metadata.ticksPerSecond / 10) / Metadata.ticksPerSecond);
                if (groupNotes.length == 0 || groupNotes[groupedNotes.length - 1]["tick"] < shawzinTick) {
                    groupedNotes.push({"tick": shawzinTick, "notes": [note.note]});
                } else {
                    groupedNotes[groupedNotes.length - 1]["notes"].push(note.note);
                }
            }

            for (var n = 0; n < groupedNotes.length; n++) {
                groupedNotes[n]["notes"].sort();
            }

            return groupedNotes;
        }

        function applyTranspositionAndScale(groupedNotes, noteList, chordMap, offset, scale) {

        }

        function calcScaleAndTransposition(groupedNotes) {

        }

        calcTempoMeter();



//        for (var n = 0; n < track.notes.length; n++) {
//            const div = document.createElement("div");
//            div.innerHTML = track.notes[n].toString();
//            fileProcessingDisplay.appendChild(div);
//        }
    }

    // Displays a message to the user
    function showMessage(message) {
        this.processingLog.value += message + "\n";
        this.processingLog.scrollTop = this.processingLog.scrollHeight;
    }
    
    return {
        // showDialog(element)
        //   element: base element
        showDialog: showDialog,
    };
    
})();

class MidiReaderContext {
    // grouped notes: Array of {"tick": shawzin tick, "notes": array of midi notes in ascending order}
    constructor(groupedNotes) {
        this.rawSeq = groupedNotes;

        const noteMap = Map();
        const chordMap = [];
        for (var n = 0; n < groupedNotes.length; n++) {
            const note = groupedNotes[n].notes;
            noteList.set(note, noteList.has(note) ? noteList.get(note) + 1 : 1);
        }
        for (var n = 0; n < this.rawSeq.length; n++) {
            var notes = this.rawSeq[i]["notes"];
            if (notes.length == 1) {

            }
        }
    }
}

//function main() {
//    MidiReader.registerListeners();
//}


