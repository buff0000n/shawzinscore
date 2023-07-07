// util module for building and dealing with piano graphics
var Piano = (function() {
    // I don't see any reason not to always do hi DPI
    var hidpi = true;

    // Max shawzin range covers 28 notes
    var numNotes = 28;

    // UI parameters for the full piano keyboard layout
    var width = 344;
    var height = 96;
    var rounded = 0.5;
    var lineWidth = 4;
    var whiteNoteWidth = 20;
    var blackNoteWidth = 10;
    // percentage of the full height
    var blackNoteHeight = 0.55;

    // UI parameters for the piano roll section
    var rollNoteWidth = 11.75;
    var rollNoteWhiteColor = "#404040";
    var rollNoteBlackColor = "#000000";
    var rollNoteWhiteColorReverse = "#202020";
    var rollNoteBlackColorReverse = "#404040";

    // I hate how many steps it takes to both draw and fill in a shape
    function fillStroke(context, path) {
        // do the fill first
        context.beginPath();
        path(context);
        context.fill();

        // draw the lines on top
        context.beginPath();
        path(context);
        context.stroke();
    }

    // struct for parameters for a single keyboard key
    class NoteConf {
        constructor(type, xOffset, keyXOffset) {
            // black or white
            this.type = type;
            // horizontal offset, most black keys aren't exactly halfway between two white keys
            this.xOffset = xOffset;
            // overall horizontal offset when this note is the root of the key
            this.keyXOffset = keyXOffset;
        }
    }

    // note config order, including blank spots for gaps between consecutive white keys
    var noteConfOrder = ["c", "cs", "d", "ds", "e", "EF", "f", "fs", "g", "gs", "a", "as", "b", "BC"];
    // just the notes with no gaps, for external use
    var keySigOrder = ["c", "cs", "d", "ds", "e", "f", "fs", "g", "gs", "a", "as", "b"];

    // note configs, offsets were basically determined by eyeball
    var noteConfs = {
        "c": new NoteConf("w", 0, 2),
        "cs": new NoteConf("b", -1, 0),
        "d": new NoteConf("w", 0, 5),
        "ds": new NoteConf("b", 1, 2),
        "e": new NoteConf("w", 0, 8),
        "EF": new NoteConf("", 0, 0),
        "f": new NoteConf("w", 0, 0),
        "fs": new NoteConf("b", -2, 0),
        "g": new NoteConf("w", 0, 3),
        "gs": new NoteConf("b", 0, 0),
        "a": new NoteConf("w", 0, 6),
        "as": new NoteConf("b", 2, 2),
        "b": new NoteConf("w", 0, 10),
        "BC": new NoteConf("", 0, 0),
    };

    // build a canvas and draw a piano keyboard with the given parameters
    // if colors[] is specified, this also generates a list of CSS-ready box objects and puts them on the canvas
    // object under canvas.boxSyles.
    function buildPianoCanvas(keySig, xScale, yScale, colors = []) {
        // create a canvas
        var canvas = document.createElement("canvas");
        // set size explicitly with CSS, this is what allows us to make a high DPI canvas
        canvas.style.width = (width * xScale) + "px";
        canvas.style.height = (height * yScale) + "px";
        // todo: necessary?
        canvas.style.display = "block";

        // scale internal coordinates by 2 for high DPI
        if (hidpi) {
            xScale *= 2;
            yScale *= 2;
        }

        // set the internal canvas size
        canvas.width = width * xScale;
        canvas.height = height * yScale;
        // get the graphics context, this is what we'll do all our work in
        var context = canvas.getContext("2d");

        // set line color and style
        context.strokeStyle = "#000000";
        context.lineWidth = lineWidth * xScale;
        // keep track of CSS box styles
        var boxStyles = [];

        // make the main draw loop a function because we have to draw all the white keys, and then draw the black keys
        // on top of them
        function drawKeys(drawType) {
            // start the note index from the key signature
            var noteIndex = noteConfOrder.indexOf(keySig);
            // get the conf of the key signature note
            var firstNoteConf = noteConfs[noteConfOrder[noteIndex]];
            // x coordinate represents the center of the next note to draw
            // start the x coordinate so the left edge of the first note is flush with the left edge of the canvas
            // this has to account for the line width, the width of the first note, and any offset that note has.
            var x = (lineWidth/2) + (firstNoteConf.type == "w" ? whiteNoteWidth/2 : blackNoteWidth /2) - (firstNoteConf.xOffset);

            // loop over all notes
            for (var n = 0; n < numNotes; n++) {
                // get the current note's conf
                var noteConf = noteConfs[noteConfOrder[noteIndex]];
                // we're going to set a bunch of variables depending on whether it's a white or black note
                var defaultColor, left, top, wid, high, bleft, btop, bwid, bhigh;
                switch (noteConf.type) {
                    case "w" :
                        // default note color
                        defaultColor = "#FFFFFF";

                        // draw coordinates for a white note centered on x
                        wid = whiteNoteWidth;
                        left = (x + (noteConf.xOffset) - wid/2);
                        top = (lineWidth/2);
                        high = (height - lineWidth);

                        // CSS box coordinates for the playable portion of a white note centered on x
                        bleft = left;
                        bwid = wid;
                        btop = (height * blackNoteHeight) + (lineWidth/2);
                        bhigh = (height * (1 - blackNoteHeight)) - (lineWidth/2);
                        break;
                    case "b" :
                        // default note color
                        defaultColor = "#000000";

                        // draw coordinates for a black note centered on x
                        wid = blackNoteWidth;
                        left = (x + (noteConf.xOffset) - wid/2);
                        top = (lineWidth/2);
                        high = (height * blackNoteHeight) - (lineWidth/2);

                        // CSS box coordinates for the playable portion of a black note centered on x
                        bleft = left - (lineWidth/2);
                        bwid = wid + lineWidth;
                        btop = 0;
                        bhigh = high + lineWidth;
                        break;
                    case "" :
                        // it's a gap note entry, reset the for loop counter so that this doesn't count as a note,
                        // but let it increment x as normal
                        n -= 1;
                        break;
                }
                // only draw the note if it matches the which type we're currently drawing
                if (noteConf.type == drawType) {
                    // extract a custom color from the color list, if there is one
                    var color = (colors.length > n && colors[n] != null) ? colors[n] : null;
                    // use the special note color if specified, otherwise use the default color
                    context.fillStyle = color ? color : defaultColor;
                    // draw the note, here is where we need to apply the scale
                    fillStroke(context, (c) => {
                        c.roundRect(
                            left * xScale,
                            top * xScale,
                            wid * xScale,
                            high * xScale,
                            [0, 0, rounded * xScale, rounded * xScale]);
                    });
                    // if there was a custom color, then build a box style object
                    if (color) {
                        // build a basic CSS box style struct
                        // todo: make an actual object class for this?
                        var boxStyle = {
                            "left": bleft,
                            "top": btop,
                            "width": bwid,
                            "height": bhigh
                        };
                        // save to the list
                        boxStyles[n] = boxStyle;
                    }
                }

                // increment the x coordinate by half a white note
                x += whiteNoteWidth/2;
                // increment the current note and wrap around if necessary
                noteIndex = (noteIndex + 1) % noteConfOrder.length;
            }
        }

        // draw the white keys first
        drawKeys("w");
        // draw the black keys over top of the white keys
        drawKeys("b");
        //var filteredBoxStyles = boxStyles.filter((e) => e != null);
        canvas.boxStyles = boxStyles;

        // that was an ordeal
        return canvas;
    }

    // build the background image
    // Note: I don't know of a way to use a canvas directly as a CSS background-image.  These need to be generated and
    // saved as PNGs to be usable
    function buildPianoRollCanvas(keySig, xScale, yScale, negative=false, padding=0) {
        // create a canvas
        var canvas = document.createElement("canvas");
        // set size explicitly with CSS, this is what allows us to make a high DPI canvas
        canvas.style.width = ((width + padding) * xScale) + "px";
        canvas.style.height = (yScale) + "px";
        // todo: necessary?
        canvas.style.display = "block";

        // scale internal coordinates by 2 for high DPI
        if (hidpi) {
            xScale *= 2;
            yScale *= 2;
        }

        // set the internal canvas size
        canvas.width = (width + padding) * xScale;
        // just use yScale directly
        canvas.height = yScale;

        // get the graphics context, this is what we'll do all our work in
        var context = canvas.getContext("2d");

        // fill with a background color
        context.fillStyle = "#202020";
        context.fillRect(0, 0, canvas.width, canvas.height);

        // initialize the key starting note
        var noteIndex = noteConfOrder.indexOf(keySig);
        // get the starting x offset to line up with the full piano version of this key signature
        var keyOffset = noteConfs[noteConfOrder[noteIndex]].keyXOffset;

        // loop over the notes the first time
        for (var n = 0; n < numNotes; n++) {
            // get the note color
            var noteConf = noteConfs[noteConfOrder[noteIndex]];
            var color;
            switch (noteConf.type) {
                case "w" :
                    color = negative ? rollNoteWhiteColorReverse : rollNoteWhiteColor;
                    break;
                case "b" :
                    color = negative ? rollNoteBlackColorReverse : rollNoteBlackColor;
                    break;
                case "" :
                    // it's a gap note entry, reset the for loop counter so that this doesn't count as a note,
                    // but let it continue
                    n -= 1;
                    break;
            }
            // skip the gap entries
            if (noteConf.type != "") {
                // fill the note rectangle
                context.fillStyle = color;
                context.fillRect(
                    (keyOffset + (n * rollNoteWidth)) * xScale,
                    0,
                    rollNoteWidth * xScale,
                    yScale,
                );
            }
            // increment the note and wrap around
            noteIndex = (noteIndex + 1) % noteConfOrder.length;
        }

        // start back at the beginning
        var noteIndex = noteConfOrder.indexOf(keySig);
        // width for the dividing lines
        context.lineWidth = lineWidth * xScale / 2;
        // color for the dividing lines
        color = negative ? rollNoteWhiteColor : rollNoteBlackColor;

        // If the first note is a white note and has no x offset then we need an extra dividing line
        // all the way on the left
        if (noteConfs[noteConfOrder[noteIndex]].type == "w" && keyOffset == 0) {
            // left ide dividing line color
            context.strokeStyle = negative ? rollNoteWhiteColor : rollNoteBlackColor;
            // draw the line
            context.beginPath();
            context.moveTo(keyOffset * xScale, 0);
            context.lineTo(keyOffset * xScale, yScale);
            context.stroke();
        }

        // loop over the notes again
        for (var n = 0; n < numNotes; n++) {
            // get the note conf
            var noteConf = noteConfs[noteConfOrder[noteIndex]];
            // check if it's a gap entry
            if (noteConf.type == "") {
                // draw a line in the gap
                context.strokeStyle = color;
                context.beginPath();
                context.moveTo((keyOffset + (n * rollNoteWidth)) * xScale, 0);
                context.lineTo((keyOffset + (n * rollNoteWidth)) * xScale, yScale);
                context.stroke();
                // decrement the note counter as usual
                n -= 1;
            }

            // increment the note and wrap around
            noteIndex = (noteIndex + 1) % noteConfOrder.length;
        }

        // that was fun
        return canvas;
    }

    // convenience function to build download links for the background and main dividing line images
    // we can't use a canvs for the background image, and we don't want to use canvases for hundreds of
    // dividing lines, so we need to actually save them as PNGs
    function testPianoCanvas(keySig, xScale, yScale, colors = []) {
        var div = document.createElement("div");
        var rollCanvas = buildPianoRollCanvas(keySig, xScale, 32, false, 106);
        div.append(rollCanvas);
        var rollCanvas2 = buildPianoRollCanvas(keySig, xScale, 2, true, 0);
        div.append(rollCanvas2);

        var canvas = buildPianoCanvas(keySig, xScale, yScale, colors);
        var pdiv = document.createElement("div");
        pdiv.append(canvas);
        pdiv.style.position = "relative";
        for (var i = 0; i < canvas.boxStyles.length; i++) {
            var boxStyle = canvas.boxStyles[i];
            if (boxStyle) {
                var box = document.createElement("div");
                box.className = "roll-note playRollNote";
                box.className = "roll-keyboard-note";
                // set the position from the UI metadata
                box.style.left = boxStyle.left + "px";
                box.style.top = boxStyle.top + "px";
                box.style.width = boxStyle.width + "px";
                box.style.height = boxStyle.height + "px";
                //box.style.backgroundColor = "#FF00FF80";//colors[i] + "80";
                box.style.backgroundColor = colors[i] + "80";
                pdiv.append(box);
            }
        }

        div.append(pdiv);

        // download links
        div.append(ExportUtils.convertToPngLink(rollCanvas, "keys-bg-" + keySig));
        div.append(document.createElement("br"));
        div.append(ExportUtils.convertToPngLink(rollCanvas2, "measure-marker-1-roll-" + keySig));

        return div;
    }

    // convenience lookup table for note offsets built from the main metadata's note list
    var noteToRollOffsets = {};
    for (var n = 0; n < Metadata.noteOrder.length; n++) {
        noteToRollOffsets[Metadata.noteOrder[n]] = rollNoteWidth * n;
    }

    // get the piano roll offset for the given note
    function rollNoteOffset(keySig, noteName) {
        return noteConfs[keySig].keyXOffset + noteToRollOffsets[noteName];
    }

    // get the audio pitch offset in half-tones for the given key signature
    function getPitchOffset(keySig) {
        // get the index of the key sig
        var index = keySigOrder.indexOf(keySig);
        // We want to raise the pitch up to a certain point, then switch to lowering the pitch.  The cutoff is
        // between F-sharp and G.
        if (index > keySigOrder.length/2) {
            index -= keySigOrder.length;
        }
        return index;
    }

    return {
        buildPianoCanvas: buildPianoCanvas, // (startNote, xScale, yScale, colors = [])
        buildPianoRollCanvas: buildPianoRollCanvas, // (keySig, xScale, yScale, negative=false, padding=0)
        testPianoCanvas: testPianoCanvas, // (keySig, xScale, yScale, colors = [])
        keySigOrder: keySigOrder,
        rollNoteWidth: rollNoteWidth,
        rollNoteOffset: rollNoteOffset, // (keySig, noteName)
        numNotes: numNotes,
        getPitchOffset: getPitchOffset, // (keySig)
    }
}());