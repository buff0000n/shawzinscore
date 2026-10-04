var MetadataMusic = (function() {
    function getKeySigDisplay(note,
                              // get the current shawzin metadata
                              shawzinMetadata = Metadata.shawzinList[Model.getShawzin()],
                              // get the current scale metadata
                              scaleMetadata = shawzinMetadata.scales[Model.getScale()]) {
        // lookup the offset of the base scale note
        var baseNoteOffset = Music.noteOrder.indexOf(scaleMetadata.config.key);

        // lookup the offset of the key signature
        var offset = Music.noteOrder.indexOf(note)
        // Add the note offsets and lookup the corresponding note
        var baseNote = Music.noteOrder[(baseNoteOffset + offset) % Music.noteOrder.length];

        // Calculate the index of the base note for the key signature
        var baseNoteIndex = (Music.noteOrder.indexOf(scaleMetadata.config.keysig.baseNote) + offset) % Music.noteOrder.length
        // lookup the base note, then the key signature
        var keySigBaseNote = Music.noteOrder[baseNoteIndex];
        var selectKeySig = Music.keySigs[keySigBaseNote];
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
        var mainName = `${Music.getNoteNameInKeySig(selectKeySig, baseNote)} ${scaleMetadata.config.name}`;
        // add to the top of the list
        // todo: why do I need to explicitly set the color here?
        scaleList.push(`<span class="justtooltiptext">${mainName}</span>`);
        // loop over the alt scales
        for (var i = 0; i < scaleMetadata.config.altScales.length; i++) {
            // get the alt scale metadata
            var altScale = scaleMetadata.config.altScales[i];
            // get the absolute offset of the alt scale's base note
            var altOffset = Music.noteOrder.indexOf(altScale.key)
            // calculate the alt scale's base note in the current key
            // Note: baseNoteOffset cancels itself out
            var altBaseNote = Music.noteOrder[(offset + altOffset) % Music.noteOrder.length];
            // if this is the first alt scale, add a little separator to the list
            if (i == 0) {
                scaleList.push(`<i class="fret13">Other names:</i>`);
            }
            // HTML describing the alt scale
        // todo: why do I need to explicitly set the color here?
            scaleList.push(`<span class="justtooltiptext">${Music.getNoteNameInKeySig(selectKeySig, altBaseNote)} ${altScale.name}</span>`);
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
        getKeySigDisplay: getKeySigDisplay, // (note, [shawzinMetadata, scaleMetadata])
    }
})();
