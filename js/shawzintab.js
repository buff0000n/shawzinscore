var ShawzinTab = (function() {

    // copies of the model data
    var song = null;
    var controlScheme = null;
    var title = null;
    var ticksPerBeat = null;
    var beatsPerMeasure = null;

    // shawzintab-specific settings
    var darkMode = null;
    var oldMode = null;
    var unitsPerLine = null;
    // decided not to make this configurable right now
    var stringThreeOnTop = true;
    // scaling for the fret images
    var fretScale = 0.5;

    // rendering state
    var canvas = null;
    var imageLoader = null;

    function init(newCanvas, newSong, newControlScheme, newTitle, newTicksPerBeat, newBeatsPerMeasure) {
        // save the model data
        song = newSong;
        controlScheme = newControlScheme;
        title = newTitle ? newTitle : "Untitled";
        ticksPerBeat = newTicksPerBeat;
        beatsPerMeasure = newBeatsPerMeasure;

        // init rendering state
        canvas = newCanvas;
        imageLoader = null;
    }

    function setUnitsPerLine(newUnitsPerLine) {
        // save
        unitsPerLine = newUnitsPerLine;
    }

    function setDarkMode(newDarkMode) {
        // save
        darkMode = newDarkMode;
        // we'll need a new image loader
        imageLoader = null;
    }

    function setOldMode(newOldMode) {
        // save
        oldMode = newOldMode;
    }

    function close() {
        // clear rendering state
        canvas = null;
    }

    function getStringImagePath(controlKey) {
        // images for the string labels are the normal white-on-black or black-on-white images
        return "img2x/" + controlKey.imgBase + (darkMode ? "_w.png" : "_b.png");
    }

    function getFretImagePath(controlKey) {
        // images for the fret labels need to be the filled versions of the white-on-black or black-on-white images
        return "img2x/" + controlKey.imgBase + (darkMode ? "_wf.png" : "_bf.png");
    }

    function buildImageKeyToPath() {
        // build a map of image keys and paths
        return {
            "plat": "img2x/" + controlScheme.img,
            "s1": getStringImagePath(controlScheme.strings["1"]),
            "s2": getStringImagePath(controlScheme.strings["2"]),
            "s3": getStringImagePath(controlScheme.strings["3"]),
            "f0": getFretImagePath(MetadataUI.noFret),
            "f1": getFretImagePath(controlScheme.frets["1"]),
            "f2": getFretImagePath(controlScheme.frets["2"]),
            "f3": getFretImagePath(controlScheme.frets["3"]),
        };
    }

    function buildImageLoader() {
        // lazily initialize the image loader
        if (!imageLoader) {
            imageLoader = controlScheme ? new ImageLoader(buildImageKeyToPath()) : null;
        }
        return imageLoader;
    }

    function render() {
        // sanity check
        if (!canvas) {
            return;
        }
        // hard-coded to hi-DPI scale
        var scale = 2;

        // set a few constants for the image
        // todo: pull these from CSS like I do with rngsim
        // with dark mode lines are generally thicker and bolder
        if (darkMode) {
            var sideMargin = 15 * scale;
            var topBottomMargin = 15 * scale;
            var headerHeight = 80 * scale;
            var footerHeight = 50 * scale;
            var pageWidth = 1000 * scale;
            var lineHeight = 60 * scale;
            var fontSize = 18 * scale;
            var lineSeparation = 60 * scale;

        // light mode settings
        } else {
            var sideMargin = 15 * scale;
            var topBottomMargin = 15 * scale;
            var headerHeight = 80 * scale;
            var footerHeight = 50 * scale;
            var pageWidth = 1000 * scale;
            var lineHeight = 60 * scale;
            var fontSize = 15 * scale;
            var lineSeparation = 60 * scale;
        }

        // old-mode rendering treats fret separation differently
        if (oldMode) {
            var fretSep = 0;

        // a little more fret spacing in dark mode
        } else if (darkMode) {
            var fretSep = 14 * scale;

        // light more separation
        } else {
            var fretSep = 12 * scale;
        }

        // calculate ticks per measure, if there is structure
        var measureTicks = ticksPerBeat ? (ticksPerBeat * beatsPerMeasure) : null;
        // calculate ticks per line, units per line means measures if there is structure, otherwise it means seconds
        var lineTicks = measureTicks ? (measureTicks * unitsPerLine) : (Metadata.ticksPerSecond * unitsPerLine);

        // calculate the total number of lines
        var numLines;
        // one calculation method if there's structure
        if (measureTicks) {
            // calculate the number of measures in the song, adding one if there's lead-in, divide by units per line, then ceiling
            numLines = Math.ceil((Math.ceil((song.getEndTick() + 1) / measureTicks) + (song.getStartTick() < 0 ? 1 : 0)) / unitsPerLine);
        } else {
            // easier method if there's no structure, total tick length divided by line ticks
            numLines = Math.ceil((song.getEndTick() - Math.min(song.getStartTick(), 0)) / lineTicks);
        }

        // calculate page height and line width in pixels
        var pageHeight = headerHeight + footerHeight + (lineHeight * numLines) + (lineSeparation * (numLines- 1)) + (topBottomMargin * 2);
        var lineWidth = pageWidth - (sideMargin * 2);

        // resize the canvas
        // if you configure something stupid like a thousand-line tab you're probably going to crash something.
        canvas.width = pageWidth;
        canvas.height = pageHeight;
        // hi-DPI scaling
        if (scale != 1) {
            canvas.style.height = (pageHeight/scale) + 'px';
            canvas.style.width = (pageWidth/scale) + 'px';
        }

        // save the title to the canvas element for convertToPng() to pick up for a file name
        canvas.saveName = title;

        function drawTab(imageMap) {
            // get the graphics context, this is what we'll do all our work in
            var context = canvas.getContext("2d");

            // fill the whole canvas with a background color, otherwise it will be transparent
            context.fillStyle = darkMode ? "#000000" : "#FFFFFF";
            context.fillRect(0, 0, canvas.width, canvas.height);

            // set the line color and width
            context.strokeStyle = darkMode ? "#FFFFFF" : "#000000";
            context.lineWidth = darkMode ? fontSize / 6 : fontSize / 10;

            // set up the title text
            context.font = (fontSize * 2) + "px Arial";
            context.textAlign = "center";
            context.fillStyle = darkMode ? "#FFFFFF" : "#000000";
            // title
            context.fillText(title, pageWidth/2, topBottomMargin + headerHeight * 0.3);

            // set up the scale line
            context.font = (fontSize * 1) + "px Arial";
            context.textAlign = "left";
            // scale line
            context.fillText("Scale: " + Metadata.scaleName[song.getScale()], sideMargin*5, topBottomMargin + headerHeight * 0.6);

            // set up the footer line
            context.font = (fontSize * 1) + "px Arial";
            context.textAlign = "right";
            // footer line
            context.fillText("https://buff0000n.github.io/shawzinscore/", pageWidth - sideMargin, pageHeight - (topBottomMargin + footerHeight * 0.25));

            // set up the rest of the text
            context.font = fontSize + "px Arial";
            context.textAlign = "center";

            // if were not old mode, then slap the control scheme icon and name in the lower left corner
            if (imageMap) {
                drawCenteredImage(context, imageMap["plat"], sideMargin*1.5, pageHeight - (topBottomMargin + footerHeight * 0.25));
                context.textAlign = "left";
                placeText(context, fontSize, controlScheme.name, sideMargin * 2.5, pageHeight - (topBottomMargin + footerHeight * 0.25));
            }

            // initialize the starting tick
            // if there's structure
            if (measureTicks != null) {
                // start at 0, and back off by a measure until we're at or before the start of the song
                lineStart = 0;
                while (lineStart > song.getStartTick()) {
                    lineStart -= measureTicks;
                }
            } else {
                // No structure, just start at the beginning of the song
                lineStart = song.getStartTick();
            }
            // init the line end
            var lineEnd = lineStart + lineTicks;

            // note counter
            var noteIndex = 0;
            // iterate over the sub-songs
            for (var line = 0; line < numLines; line++) {

                var lineNotes = [];
                while(noteIndex < song.notes.length && song.notes[noteIndex].tick < lineEnd) {
                    lineNotes.push(song.notes[noteIndex]);
                    noteIndex += 1;
                }

                // calculate the box coordinates containing the line
                var x1 = sideMargin;
                var x2 = x1 + lineWidth;
                var y1 = topBottomMargin + headerHeight + ((lineHeight + lineSeparation) * line);
                var y2 = y1 + lineHeight;

                // draw the song line
                buildSongLine(context, x1, y1, x2, y2, fontSize,
                              lineNotes, lineStart, unitsPerLine, measureTicks, ticksPerBeat,
                              imageMap, fretSep)

                lineStart = lineEnd;
                lineEnd += lineTicks;
            }
        }

        if (!oldMode) {
            buildImageLoader().waitForImages((im) => { drawTab(im); });

        } else {
            drawTab(null);
        }

        return canvas;
    }

    function buildSongLine(context, x1, y1, x2, y3, fontSize, lineNotes, lineStart, unitsPerLine, measureTicks, ticksPerBeat, imageMap, fretSep) {
        //(`buildSongLine() starting at ${lineStart}`)
        // margin around the start/end bars and measure bars if present
        var barMargin = fontSize;

        // calculate the middle string y-position
        var y2 = (y1 + y3) / 2;

        // we'll use this line width for pretty much everything
        context.lineWidth = darkMode ? fontSize / 6 : fontSize / 10;

        // width for the string labels on the left
        var labelWidth = fontSize * 1.5

        // easier this way
        x1 += labelWidth;

        // draw 3 string lines
        drawLine(context, x1, y1, x2, y1);
        drawLine(context, x1, y2, x2, y2);
        drawLine(context, x1, y3, x2, y3);

        // string line labels
        if (!imageMap) {
            placeText(context, fontSize, stringThreeOnTop ? "3" : "1", x1-(fontSize*1), y1);
            placeText(context, fontSize, "2", x1-(fontSize*1), y2);
            placeText(context, fontSize, stringThreeOnTop ? "1" : "3", x1-(fontSize*1), y3);

        } else {
            drawCenteredImage(context, stringThreeOnTop ? imageMap["s3"] : imageMap["s1"], x1-(fontSize*1), y1);
            drawCenteredImage(context, imageMap["s2"], x1-(fontSize*1), y2);
            drawCenteredImage(context, stringThreeOnTop ? imageMap["s1"] : imageMap["s3"], x1-(fontSize*1), y3);
        }

        if (measureTicks) {
            // if we've putting so many measures per line that the usual margin around the barlines exceeds more than
            // half the width of the bar, then remove the margin.  It's funnier this way.
            if (barMargin > ((x2 - x1) / (unitsPerLine * 4))) {
                barMargin = 0;
            }
            // draw measure lines
            for (var i = 0; i <= unitsPerLine; i+= 1) {
                var x3 = x1 + (((x2 - x1) * i) / unitsPerLine);
                drawLine(context, x3, y1, x3, y3);
            }

            function drawMeasureNotes(measure, measureNotes, measureStart, clear) {
                var x1b = x1 + ((x2 - x1) * (measure / unitsPerLine));
                var x2b = x1 + ((x2 - x1) * ((measure + 1) / unitsPerLine));
                drawNotes(context, x1b+barMargin, y1, x2b-barMargin, y3, y2, fontSize, measureNotes, measureStart, measureEnd - measureStart, clear, imageMap, fretSep);
            }

            var measureStart = lineStart;
            var measureEnd = measureStart + measureTicks;

            var noteIndex = 0;
            // iterate over the sub-songs
            for (var measure = 0; measure < unitsPerLine; measure++) {

                var measureNotes = [];

                while(noteIndex < lineNotes.length && lineNotes[noteIndex].tick < measureEnd) {
                    measureNotes.push(lineNotes[noteIndex]);
                    noteIndex += 1;
                }

                if (!imageMap) {
                    drawMeasureNotes(measure, measureNotes, measureStart, true);
                    drawMeasureNotes(measure, measureNotes, measureStart, false);

                } else {
                    drawMeasureNotes(measure, measureNotes, measureStart, true);
                }

                measureStart = measureEnd;
                measureEnd += measureTicks;
            }

        } else {
            // just put lines at the beginning and ending of each line
            drawLine(context, x1, y1, x1, y3);
            drawLine(context, x2, y1, x2, y3);

            if (!imageMap) {
                // clear space for all the notes first
                drawNotes(context, x1+barMargin, y1, x2-barMargin, y3, y2, fontSize, lineNotes, lineStart, unitsPerLine * Metadata.ticksPerSecond,
                        true, null, fretSep);

                // now draw the notes
                drawNotes(context, x1+barMargin, y1, x2-barMargin, y3, y2, fontSize, lineNotes, lineStart, unitsPerLine * Metadata.ticksPerSecond,
                        false, null, fretSep);

            } else {
                drawNotes(context, x1+barMargin, y1, x2-barMargin, y3, y2, fontSize, lineNotes, lineStart, unitsPerLine * Metadata.ticksPerSecond,
                          true, imageMap, fretSep);
            }

        }

//        // beat lines are too much clutter
//        if (beatBreaks != 0) {
//            context.lineWidth = fontSize / 20;
//            var y1b = ((y1*2) + (y3*1)) / 3;
//            var y3b = ((y3*2) + (y1*1)) / 3;
//            for (var i = 0; i <= lineBreaks; i+= beatBreaks) {
//                var x3 = x1 + (((x2 - x1) * i) / lineBreaks);
//                drawLine(context, x3, y1b, x3, y3b);
//            }
//        }

    }

    function drawNotes(context, x1, y1, x2, y3, y2, fontSize, drawSong, tickOffset, intervalLength, clear, imageMap, fretSep) {
        //console.log(`drawNotes() starting at ${tickOffset}`)
        if (!imageMap) {
            context.textAlign = "center";

            // fill color depends on whether we're clearing or drawing
            if (clear) {
                context.fillStyle = darkMode ? "#000000" : "#FFFFFF";
            } else {
                context.fillStyle = darkMode ? "#FFFFFF" : "#000000";
            }
        }
        // iterate over the notes
        for (var n = 0; n < drawSong.length; n++) {
            var note = drawSong[n];
            // use the notes tick to calculate its x position in the line.  The tick is assumed to
            // start at zero at the beginning of the line
            // substract 1 from interval length to let barMargin take care of separating lines/measures
            var x3 = x1 + (((x2 - x1) * (note.tick - tickOffset)) / (intervalLength - 1));

            var noteString = Track.isDuviriModeOn() ? note.altString : note.string;
            // iterate over the note's strings
            // do multi-string notes actually happen?
            for (var j = 0; j < noteString.length; j++) {
                var string = noteString.charAt(j);
                // pick the y position for the correct string
                var ty;
                switch (string) {
                    case "1": ty = stringThreeOnTop ? y3 : y1; break;
                    case "2": ty = y2; break;
                    case "3": ty = stringThreeOnTop ? y1 : y3; break;
                }

                // respect the current Duviri mode
                var noteFret = Track.isDuviriModeOn() ? note.altFret : note.fret;
                if (!imageMap) {
                    // if there's no frets then use "0"
                    var fret = (noteFret != "" ? noteFret : "0");

                    // clear space or draw the note
                    placeText(context, fontSize, fret, x3, ty, fret.length > 1, clear);
                } else {
                    // draw the three frets, either open or closed
                    drawCenteredImage(context, noteFret.includes("1") ? imageMap["f1"] : imageMap["f0"], x3, ty + fretSep, fretScale);
                    drawCenteredImage(context, noteFret.includes("2") ? imageMap["f2"] : imageMap["f0"], x3, ty, fretScale);
                    drawCenteredImage(context, noteFret.includes("3") ? imageMap["f3"] : imageMap["f0"], x3, ty - fretSep, fretScale);
                }
            }
        }
    }

    function placeText(context, fontSize, text, x3, ty, underline=false, clear=false, ) {
        // kludge to make it appear in the middle of the string line
        // todo: how many browsers support context.measureText()?
        ty += (fontSize*0.35);
        var w = text.length * (fontSize * 0.8);
        var h = fontSize;

        if (clear) {
            // clear a rectangle around the text
            context.fillRect(x3-(w/2), ty-h, w, h*1.3);
        } else {
            // draw the text
            context.fillText(text, x3, ty);
            // underline it
            if (underline) {
                context.lineWidth = darkMode ? fontSize / 6 : fontSize / 10;
                drawLine(context, x3-(w/2), ty+(h*0.3), x3+(w/2), ty+(h*0.3))
            }
        }
    }

    function drawLine(context, x1, y1, x2, y2) {
        // why is this so annoying
        context.beginPath();
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        context.stroke();
    }

    // convenience function to draw an image centered on a point
    function drawCenteredImage(context, img, x, y, scale=1.0) {
        var w = img.width * scale;
        var h = img.height * scale;
        context.drawImage(img, x - (w / 2), y - (h / 2), w, h);
    }

    function generateLink() {
        return ExportUtils.convertToPngLink(canvas, title);
    }

    return {
        // initialize shawzin tab
        init: init, // (newCanvas, newSong, newControlScheme, newTitle, newTicksPerBeat, newBeatsPerMeasure)
        setUnitsPerLine: setUnitsPerLine,
        setDarkMode: setDarkMode,
        setOldMode: setOldMode,
        render: render,
        generateLink: generateLink,
        close: close,
    }
})()