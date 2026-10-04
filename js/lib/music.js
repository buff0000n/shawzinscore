var Music = (function() {

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

    function getMidiNoteName(midiNote) {
        const octave = Math.floor(midiNote / 12);
        const noteIndex = midiNote - (octave * 12);
        return noteNames[noteOrder[noteIndex]][0] + "-" + octave;
    }
    
    // parseMeter(meterString)
    //   meterString: a meter in the format N/M
    //   returns: [fixed meterString, [numerator int, denominator int]] or null if it can't be parsed
    function parseMeter(meterString) {
        // parse meter, throw an error if there's any format issues
        var meterStringArray = meterString.split("/");
        // check format
        if (meterStringArray.length != 2) {
            return null;
        }

        // parse as two ints
        var meterArray = [MiscUtils.parseInt(meterStringArray[0]), MiscUtils.parseInt(meterStringArray[1])];

        // range check
        if (meterArray[0] > MetadataUI.maxBeatsPerMeasure) {
            meterArray[0] = MetadataUI.maxBeatsPerMeasure;
            meterString = meterArray[0] + "/" + meterArray[1];
        }
        // denominator check, only support a power of two because I don't know what a non power of two means.
        // Ugh, either throw a couple of massively overkill Math.log()s at it or just count up by bits
        var b = 1;
        while (b < meterArray[1]) b <<= 1;
        if (b != meterArray[1]) {
            // round down to the nearest power of 2
            b >>= 1;
            // they put 0 as the denominator for some damn reason.  It's four now.  Zero equals four.
            if (b == 0) b = 4;
            meterArray[1] = b;
            meterString = meterArray[0] + "/" + meterArray[1];
        }

        return [meterString, meterArray];
    }

    // public members
    return  {
        note: note,
        noteOrder: noteOrder,
        noteNames: noteNames,
        keySigs: keySigs,
        getNoteNameInKeySig: getNoteNameInKeySig, // (keySig, note)
        // getMidiNoteName(midiNote)
        //   returns: note name + octave
        getMidiNoteName: getMidiNoteName,
        // parseMeter(meterString)
        //   meterString: a meter in the format N/M
        //   returns: [fixed meterString, [numerator int, denominator int]] or null if it can't be parsed
        parseMeter: parseMeter,
    }
})();
