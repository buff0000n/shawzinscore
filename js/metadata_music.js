var MetadataMusic = (function() {

    var flat = "\u266D";
    var sharp = "\u266F";
    var natural = "\u266E";
    
    var note = {
        C: "c",
            Cs: "cs", Db: "cs",
        D: "d",
            Ds: "ds", Eb: "ds",
        E: "e",
        F: "f",
            Fs: "fs", Gb: "fs",
        G: "g",
            Gs: "gs", Ab: "gs",
        A: "a",
            As: "as", Bb: "as",
        B: "b",
    };

    var noteOrder = [
        note.C,
            note.Cs,
        note.D,
            note.Ds,
        note.E,
        note.F,
            note.Fs,
        note.G,
            note.Gs,
        note.A,
            note.As,
        note.B,
    ];

    var noteNames = {};
    noteNames[note.C] = ["C", "C"];
        noteNames[note.Cs] = ["C" + sharp, "D" + flat];
    noteNames[note.D] = ["D", "D"];
        noteNames[note.Ds] = ["D" + sharp, "E" + flat];
    noteNames[note.E] = ["E", "E"];
    noteNames[note.F] = ["F", "F"];
        noteNames[note.Fs] = ["F" + sharp, "G" + flat];
    noteNames[note.G] = ["G", "G"];
        noteNames[note.Gs] = ["G" + sharp, "A" + flat];
    noteNames[note.A] = ["A", "A"];
        noteNames[note.As] = ["A" + sharp, "B" + flat];
    noteNames[note.B] = ["B", "B"];

    class KeySig {
        constructor(baseNote, sharps, flats) {
            this.baseNote = baseNote;
            this.sharps = sharps;
            this.flats = flats;
        }
    }
    
    var keySigs = {};
    // no sharps or flats
    keySigs[note.C] = new KeySig(note.C, 0, 0);
    // sharps
    keySigs[note.G] = new KeySig(note.G, 1, 0);
    keySigs[note.D] = new KeySig(note.D, 2, 0);
    keySigs[note.A] = new KeySig(note.A, 3, 0);
    keySigs[note.E] = new KeySig(note.E, 4, 0);
    keySigs[note.B] = new KeySig(note.B, 5, 0);
    // flats
    keySigs[note.F] =  new KeySig(note.F , 0, 1);
    keySigs[note.Bb] = new KeySig(note.Bb, 0, 2);
    keySigs[note.Eb] = new KeySig(note.Eb, 0, 3);
    keySigs[note.Ab] = new KeySig(note.Ab, 0, 4);
    keySigs[note.Db] = new KeySig(note.Db, 0, 5);
    // meh, gotta pick one
    keySigs[note.Gb] = new KeySig(note.Gb, 0, 6);


    function getNoteNameInKeySig(keySig, note) {
        return noteNames[note][keySig.flats > 0 ? 1 : 0];
    }

    // threw this here for lack of a better common place
    function getKeySigDisplay(note) {
        // get the current shawzin metadata
        var shawzinMetadata = Metadata.shawzinList[Model.getShawzin()];
        // get the current scale metadata
        var scaleMetadata = shawzinMetadata.scales[Model.getScale()];
        // lookup the offset of the base scale note
        var baseNoteOffset = MetadataMusic.noteOrder.indexOf(scaleMetadata.config.key);

        // lookup the offset of the key signature
        var offset = MetadataMusic.noteOrder.indexOf(note)
        // Add the note offsets and lookup the corresponding note
        var baseNote = MetadataMusic.noteOrder[(baseNoteOffset + offset) % MetadataMusic.noteOrder.length];

        // Calculate the index of the base note for the key signature
        var baseNoteIndex = (MetadataMusic.noteOrder.indexOf(scaleMetadata.config.keysig.baseNote) + offset) % MetadataMusic.noteOrder.length
        // lookup the base note, then the key signature
        var selectKeySig = MetadataMusic.keySigs[MetadataMusic.noteOrder[baseNoteIndex]];

        // wow that was hard
        return {
            // generate an image base using the type of shawzin and the key signature base note
            "imgBase": `keysig/${shawzinMetadata.config.clef}-${selectKeySig.baseNote}.png`,
            // generate a name with a display note and the name of the current scale
            "name": `${MetadataMusic.getNoteNameInKeySig(selectKeySig, baseNote)} ${scaleMetadata.config.name}`
        };
    }

    // public members
    return  {
        note: note,
        noteOrder: noteOrder,
        noteNames: noteNames,
        keySigs: keySigs,
        getNoteNameInKeySig: getNoteNameInKeySig, // (keySig, note)
        getKeySigDisplay: getKeySigDisplay, // (note)
    }
})();
