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
        var keySigBaseNote = MetadataMusic.noteOrder[baseNoteIndex];
        var selectKeySig = MetadataMusic.keySigs[keySigBaseNote];
        // lookup the pitch offset
        var pitchOffset = Piano.getPitchOffset(note);
        // build some HTML describing the pitch offset
        var pitchOffsetString =
            (pitchOffset < 0) ? (`<strong class="fret1">&darr;${-pitchOffset}</strong>`)
            : (pitchOffset > 0) ? (`<strong class="fret2">&uarr;${pitchOffset}</strong>`)
            : "";

        // build the list of scale names, including alt scales
        var scaleList = [];
        // HTML describing the main scale
        var mainName = `${MetadataMusic.getNoteNameInKeySig(selectKeySig, baseNote)} ${scaleMetadata.config.name}`;
        // add to the top of the list
        // todo: why do I need to explicitly set the color here?
        scaleList.push(`<span class="justtooltiptext">${mainName}</span>`);
        // loop over the alt scales
        for (var i = 0; i < scaleMetadata.config.altScales.length; i++) {
            // get the alt scale metadata
            var altScale = scaleMetadata.config.altScales[i];
            // get the absolute offset of the alt scale's base note
            var altOffset = MetadataMusic.noteOrder.indexOf(altScale.key)
            // calculate the alt scale's base note in the current key
            // Note: baseNoteOffset cancels itself out
            var altBaseNote = MetadataMusic.noteOrder[(offset + altOffset) % MetadataMusic.noteOrder.length];
            // if this is the first alt scale, add a little separator to the list
            if (i == 0) {
                scaleList.push(`<i class="fret13">Other names:</i>`);
            }
            // HTML describing the alt scale
        // todo: why do I need to explicitly set the color here?
            scaleList.push(`<span class="justtooltiptext">${MetadataMusic.getNoteNameInKeySig(selectKeySig, altBaseNote)} ${altScale.name}</span>`);
        }

        // wow that was hard
        return {
            // generate an image base using the type of shawzin and the key signature base note
            "imgBase": `keysig/${shawzinMetadata.config.clef}-${selectKeySig.baseNote}.png`,
            // generate a name with a display note and the name of the current scale
            "name": `
                ${mainName}
                ${pitchOffsetString}
            `,
            // generate some popup text with the main scale and all the alt scales
            // this is too much to put in the main UI
            "popup": `${scaleList.join("<br/>")}`
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
