// just some utils I need for song things
var SongUtils = (function() {

    var base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    function base64ToInt(char) {
        // todo: better?
        var index = base64Chars.indexOf(char);
        if (index < 0) {
            throw "Invalid character: \"" + char + "\"";
        }
        return index;
    }

    function intToBas64(i) {
        if (i < 0 || i > 63) {
            throw "Invalid int for base64: " + i;
        }
        return base64Chars[i];
    }

    function noteTimeComparator(note1, note2) {
        return note1.time - note2.time;
    }

    // public members
    return  {
        base64ToInt: base64ToInt,
        intToBas64: intToBas64,
        noteTimeComparator: noteTimeComparator,
    };
})();



// thanks to https://www.reddit.com/r/Warframe/comments/cxbxoc/shawzin_song_recording_syntax/
class Note {
    constructor(fret = "", string = "", time = 0) {
        this.string = string;
        this.fret = fret;
        this.time = time;
    }

    fromString(code) {
        // sanity check
        if (code.length != 3) {
            throw "Invalid note code: \"" + code + "\""
        }
        // split three base64 chars and convert to ints
        var noteInt = SongUtils.base64ToInt(code.charAt(0));
        var measure = SongUtils.base64ToInt(code.charAt(1));
        var tick = SongUtils.base64ToInt(code.charAt(2));

        // bits 1-3 of the note int are the strings
        this.string = "";
        if (noteInt & 0x01) this.string = this.string + "1";
        if (noteInt & 0x02) this.string = this.string + "2";
        if (noteInt & 0x04) this.string = this.string + "3";
        // bits 4-6 of the note int are the frets
        this.fret = "";
        if (noteInt & 0x08) this.fret = this.fret + "1";
        if (noteInt & 0x10) this.fret = this.fret + "2";
        if (noteInt & 0x20) this.fret = this.fret + "3";

        // combine measure int and tick into into a single time, number of ticks from the beginning of the song
        this.time = (measure * 64) + tick

        if (this.string.length != 1) {
            // must contain exactly one string
            throw "Invalid note code: \"" + code + "\"";
        }

        return this;
    }

    toNoteName() {
        return (this.fret.length == 0 ? "0" : this.fret) + "-" + this.string;
    }

    toString() {
        var b1 = 0;
        for (var c = 0; c < this.string.length; c++) {
            switch (this.string.charAt(c)) {
                case "1" : b1 |= 0x01; break;
                case "2" : b1 |= 0x02; break;
                case "3" : b1 |= 0x04; break;
            }
        }
        for (var c = 0; c < this.fret.length; c++) {
            switch (this.fret.charAt(c)) {
                case "1" : b1 |= 0x08; break;
                case "2" : b1 |= 0x10; break;
                case "3" : b1 |= 0x20; break;
            }
        }

        var b2 = Math.floor(this.time / 64);

        var b3 = this.time - (b2 * 64);

        return SongUtils.intToBas64(b1) + SongUtils.intToBas64(b2) + SongUtils.intToBas64(b3);
    }

    desc() {
        return "[" + this.time + " : " + this.string + "-" + this.fret + "]";
    }

    offsetTime(offset) {
        // construct a new note with the same note value but an offset time
        var n = new Note();
        n.string = this.string;
        n.fret = this.fret;
        n.time = this.time + offset;

        return n;
    }
}

class Song {
    constructor() {
        this.scale = "";
        this.notes = Array();
    }

    setScale(scale) {
        this.scale = scale;
        return this;
    }

    getScale() {
        return this.scale;
    }

    fromString(code) {
        // should be 3n+1 chars long
        if (code.length % 3 != 1) {
            throw "Code is an invalid length"
        }

        // pull out the scale code and map it
        var scaleCode = code.charAt(0);
        this.scale = Metadata.scaleOrder[scaleCode - 1];
        if (!this.scale) {
            throw "Invalid scale code: \"" + scaleCode + "\""
        }

        // note array
        this.notes = Array();
        // pull out each three-char substring and parse it into a note string, fret, and time
        for (var i = 1; i < code.length; i+= 3) {
            this.notes.push(new Note().fromString(code.substring(i, i+3)));
        }

        // sort by time, should be unnecessary but there's nothing preventing anyone from
        // building note lists out of order.
        this.notes.sort(SongUtils.noteTimeComparator);

        return this;
    }

    toString() {
        // no song codes that are just a scale and no notes
        if (this.notes.length == 0) {
            return "";
        }
        // todo: actual buffer?
        var buffer = "";
        // index of the scale, starting at 1
        var scaleCode = Metadata.scaleOrder.indexOf(this.scale) + 1;
        buffer += scaleCode;

        for (var n = 0; n < this.notes.length; n++) {
            buffer += this.notes[n].toString();
        }
        return buffer;
    }

    isEmpty() {
        return this.notes.length == 0;
    }

    applyLeadIn(leadInLength, measureLength) {
        var leadInOffset = measureLength - leadInLength;

        // iterate over all the notes
        for (var i = 0; i < this.notes.length; i++) {
            this.notes[i] = this.notes[i].offsetTime(leadInOffset);
        }

        return this;
    }

    split(intervalLength) {
        // This is the meat of the whole thing

        // we will build an array of sub-songs
        var array = new Array();

        // initial state, start before beginning
        var intervalStart = -intervalLength;
        // the start of the next interval
        var intervalEnd = 0;
        // loop over notes
        // current sub-song, there isn't one yet
        var subSong;

        // iterate over all the notes
        for (var i = 0; i < this.notes.length; i++) {
            var note = this.notes[i];
            // if the note's time is after our current interval, add sub-songs and increment the interval
            // until we reach the right range
            while (note.time >= intervalEnd) {
                // create a new subSong and put it at the end of the array
                // might as well copy the scale, too
                subSong = new Song().setScale(this.scale);
                array.push(subSong);
                // increment the interval
                intervalStart = intervalEnd;
                intervalEnd = intervalStart + intervalLength;
            }

            // offset the note so that the interval start is time zero
            subSong.notes.push(note.offsetTime(-intervalStart));
        }

        return array;
    }
}

/*
//==============================================================
// UI Builders
//==============================================================

function buildTabWithoutMeasures(song, platform, title, author, secondsPerLine) {
    var secondsPerLineFloat = parseFloat(secondsPerLine);

    if (secondsPerLineFloat <= 0) {
        throw "Invalid seconds per line: \"" + secondsPerLine + "\"";
    }

    // 16 ticks in a second
    // round to the nearest tick
    buildTab(song, platform, title, author, Math.round(secondsPerLineFloat * 16));
}

function buildTabWithMeasures(song, platform, title, author, meter, tempo, measuresPerLine, leadInBeats) {
    // parse the tempo
    var tempoInt = parseInt(tempo);
    if (tempoInt <= 0) {
        throw "Invalid tempo: \"" + secondsPerLine + "\"";
    }

    // 16 ticks in a second => ticks/minute * minutes/beat = ticks per beat
    var ticksPerBeat = (16*60) / tempoInt;

    // parse the meter
    var regex = /(\d+)\/(\d+)/g;
    var match = regex.exec(meter);
    if (!match) {
        throw "Invalid time signature: \"" + meter + "\"";
    }

    // pull out the numerator and denominator of the meter
    // numerator = beats per measure
    var beatsPerMeasure = parseInt(match[1]);
    // denominator = the beat value
    var beatValue = parseInt(match[2]);

    if (beatsPerMeasure <= 0 || beatValue <= 0) {
        throw "Invalid time signature: \"" + meter + "\"";
    }

    // beatValue doesn't actually matter for our purposes.  We don't have to worry about drawing eighth notes
    // versus quarter notes.  We have a tempo in beats per second, and all we care about is how many beats are
    // in each measure

    // measure length is a multiple of the beat length
    var ticksPerMeasure = ticksPerBeat * beatsPerMeasure;

    var measuresPerLineInt = parseInt(measuresPerLine);
    if (measuresPerLineInt <= 0) {
        throw "Invalid measures per line: \"" + measuresPerLineInt + "\"";
    }
    // line length is a multiple of the measure length
    var ticksPerLine = ticksPerMeasure * measuresPerLineInt;

    var leadInBeatsFloat = parseFloat(leadInBeats);
    if (leadInBeatsFloat < 0) {
        throw "Invalid lead in beats: \"" + leadInBeats + "\"";
    }

    var leadInTicks = Math.round(leadInBeatsFloat * ticksPerBeat);

    // glad that's all out of the way
    buildTab(song, platform, title, author, ticksPerLine, ticksPerMeasure, ticksPerBeat, leadInTicks);

}

function parseInt(s) {
    var i = Number.parseInt(s);
    if (Number.isNaN(i)) {
        throw "Invalid number: \"" + s + "\"";
    }
    return i;
}

function parseFloat(s) {
    // read a decimal from a string
    var i = Number.parseFloat(s);
    if (Number.isNaN(i) || i < 0) {
        throw "Invalid number: \"" + s + "\"";
    }
    return i;
}

// convenience function to draw an image centered on a point
function drawCenteredImage(context, img, x, y) {
    context.drawImage(img, x - (img.width / 2), y - (img.height / 2));
}

function buildTab(song, platform, title, author, lineBreaks, measureBreaks=0, beatBreaks=0, leadIn=0) {
    // get the tab container
    var tabArea = document.getElementById("tabArea")

    // offset the song if lead-in was specified
    // The Shawzin recorder always starts on the first note, even if that note isn't at the beginning of a measure
    if (leadIn > 0) {
        song = song.applyLeadIn(leadIn, measureBreaks);
    }
    // split the song up into sub-songs by lines
    var lineSongs = song.split(lineBreaks);

    var scale = isHiDPI() ? 2 : 1;

    // set a few constants for the image
    // todo: pull these from CSS like I do with rngsim
    if (darkMode) {
        var sideMargin = 15 * scale;
        var topBottomMargin = 15 * scale;
        var headerHeight = 80 * scale;
        var footerHeight = 50 * scale;
        var pageWidth = 1000 * scale;
        var lineHeight = 60 * scale;
        var fontSize = 18 * scale;
        var lineSeparation = 60 * scale;

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

    if (platform == "none") {
        var fretSep = 0;
        // enable old rendering method
        var string1 = null;
        var string2 = null;
        var string3 = null;
        var fret0 = null;
        var fret1 = null;
        var fret2 = null;
        var fret3 = null;

    } else if (darkMode) {
        var fretSep = 14 * scale;
        // image objects
        var string1 = document.getElementById("plat_s_1_d")
        var string2 = document.getElementById("plat_s_2_d")
        var string3 = document.getElementById("plat_s_3_d")
        var fret0 = document.getElementById("all_f_0_d")
        var fret1 = document.getElementById("plat_f_1_d")
        var fret2 = document.getElementById("plat_f_2_d")
        var fret3 = document.getElementById("plat_f_3_d")

    } else {
        var fretSep = 12 * scale;
        // image objects
        var string1 = document.getElementById("plat_s_1_l")
        var string2 = document.getElementById("plat_s_2_l")
        var string3 = document.getElementById("plat_s_3_l")
        var fret0 = document.getElementById("all_f_0_l")
        var fret1 = document.getElementById("plat_f_1_l")
        var fret2 = document.getElementById("plat_f_2_l")
        var fret3 = document.getElementById("plat_f_3_l")
    }

    // these are calculated
    var pageHeight = headerHeight + footerHeight + (lineHeight * lineSongs.length) + (lineSeparation * (lineSongs.length - 1)) + (topBottomMargin * 2);
    var lineWidth = pageWidth - (sideMargin * 2);

    // create a canvas element under the tab container with the dimensions we calculated
    // if you configure something stupid like a thousand-line tab you're probably going to crash something.
    tabArea.innerHTML = `<canvas class="tabCanvas" height=` + pageHeight + ` width=` + pageWidth + ` onclick="convertToPng(this);"/>`;

    // find the canvas element we just added
    var canvas = getFirstChild(tabArea, "tabCanvas");

    if (scale != 1) {
        canvas.style.height = (pageHeight/scale) + 'px';
        canvas.style.width = (pageWidth/scale) + 'px';
    }

    // save the title to the canvas element for convertToPng() to pick up for a file name
    canvas.saveName = title;

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
    context.fillText("Scale: " + song.scale, sideMargin*5, topBottomMargin + headerHeight * 0.6);

    // set up the author line
    context.font = (fontSize * 1) + "px Arial";
    context.textAlign = "right";
    // authorline
    context.fillText(author, pageWidth - sideMargin*5, topBottomMargin + headerHeight * 0.6);

    // set up the footer line
    context.font = (fontSize * 1) + "px Arial";
    context.textAlign = "right";
    // footer line
    context.fillText("https://buff0000n.github.io/shawzintab/", pageWidth - sideMargin, pageHeight - (topBottomMargin + footerHeight * 0.25));

    // set up the rest of the text
    context.font = fontSize + "px Arial";
    context.textAlign = "center";

    // iterate over the sub-songs
    for (var line = 0; line < lineSongs.length; line++) {
        // calculate the box coordinates containing the line
        var x1 = sideMargin;
        var x2 = x1 + lineWidth;
        var y1 = topBottomMargin + headerHeight + ((lineHeight + lineSeparation) * line);
        var y2 = y1 + lineHeight;

        // draw the song line
        buildSongLine(context, x1, y1, x2, y2, fontSize, lineSongs[line], lineBreaks, measureBreaks, beatBreaks,
                      string1, string2, string3, fret0, fret1, fret2, fret3, fretSep)
    }
}

function buildSongLine(context, x1, y1, x2, y3, fontSize, lineSong, lineBreaks, measureBreaks, beatBreaks,
                       string1, string2, string3, fret0, fret1, fret2, fret3, fretSep) {
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
    if (!fret0) {
        placeText(context, fontSize, stringThreeOnTop ? "3" : "1", x1-(fontSize*1), y1);
        placeText(context, fontSize, "2", x1-(fontSize*1), y2);
        placeText(context, fontSize, stringThreeOnTop ? "1" : "3", x1-(fontSize*1), y3);

    } else {
        drawCenteredImage(context, stringThreeOnTop ? string3 : string1, x1-(fontSize*1), y1);
        drawCenteredImage(context, string2, x1-(fontSize*1), y2);
        drawCenteredImage(context, stringThreeOnTop ? string1 : string3, x1-(fontSize*1), y3);
    }

    if (measureBreaks != 0) {
        // draw measure lines
        for (var i = 0; i <= lineBreaks; i+= measureBreaks) {
            var x3 = x1 + (((x2 - x1) * i) / lineBreaks);
            drawLine(context, x3, y1, x3, y3);
        }

        // split up the line by measures
        var measureSongs = lineSong.split(measureBreaks);

        function drawMeasure(clear) {
            for (var m = 0; m < measureSongs.length; m++) {
                var measureSong = measureSongs[m];
                var x1b = x1 + (((x2 - x1) * (m * measureBreaks)) / lineBreaks);
                var x2b = x1 + (((x2 - x1) * ((m + 1) * measureBreaks)) / lineBreaks);
                drawNotes(context, x1b+barMargin, y1, x2b-barMargin, y3, y2, fontSize, measureSong, measureBreaks,
                          clear, fret0, fret1, fret2, fret3, fretSep);
            }
        }

        if (!fret0) {
            drawMeasure(true);
            drawMeasure(false);

        } else {
            drawMeasure(true);
        }

    } else {
        // just put lines at the beginning and ending of each line
        drawLine(context, x1, y1, x1, y3);
        drawLine(context, x2, y1, x2, y3);

        if (!fret0) {
            // clear space for all the notes first
            drawNotes(context, x1+barMargin, y1, x2-barMargin, y3, y2, fontSize, lineSong, lineBreaks,
                    true, fret0, fret1, fret2, fret3, fretSep);

            // now draw the notes
            drawNotes(context, x1+barMargin, y1, x2-barMargin, y3, y2, fontSize, lineSong, lineBreaks,
                    false, fret0, fret1, fret2, fret3, fretSep);

        } else {
            drawNotes(context, x1+barMargin, y1, x2-barMargin, y3, y2, fontSize, lineSong, lineBreaks,
                      true, fret0, fret1, fret2, fret3, fretSep);
        }
    }

    // beat lines are too much clutter
    if (beatBreaks != 0) {
        context.lineWidth = fontSize / 20;
        var y1b = ((y1*2) + (y3*1)) / 3;
        var y3b = ((y3*2) + (y1*1)) / 3;
        for (var i = 0; i <= lineBreaks; i+= beatBreaks) {
            var x3 = x1 + (((x2 - x1) * i) / lineBreaks);
            drawLine(context, x3, y1b, x3, y3b);
        }
    }

}

function drawNotes(context, x1, y1, x2, y3, y2, fontSize, drawSong, intervalLength, clear, fret0, fret1, fret2, fret3, fretSep) {
    if (!fret0) {
        context.textAlign = "center";

        // fill color depends on whether we're clearing or drawing
        if (clear) {
            context.fillStyle = darkMode ? "#000000" : "#FFFFFF";
        } else {
            context.fillStyle = darkMode ? "#FFFFFF" : "#000000";
        }
    }
    // iterate over the notes
    for (var n = 0; n < drawSong.notes.length; n++) {
        var note = drawSong.notes[n];
        // use the notes time to calculate its x position in the line.  The time is assumed to
        // start at zero at the beginning of the line
        // substract 1 from interval length to let barMargin take care of separating lines/measures
        var x3 = x1 + (((x2 - x1) * note.time) / (intervalLength - 1));
        // iterate over the note's strings
        // do multi-string notes actually happen?
        for (var j = 0; j < note.string.length; j++) {
            var string = note.string.charAt(j);
            // pick the y position for the correct string
            var ty;
            switch (string) {
                case "1": ty = stringThreeOnTop ? y3 : y1; break;
                case "2": ty = y2; break;
                case "3": ty = stringThreeOnTop ? y1 : y3; break;
            }

            if (!fret0) {
                // if there's no frets then use "0"
                var fret = (note.fret != "" ? note.fret : "0");

                // clear space or draw the note
                placeText(context, fontSize, fret, x3, ty, clear);
            } else {
                // draw the three frets, either open or closed
                drawCenteredImage(context, note.fret.includes("1") ? fret1 : fret0, x3, ty + fretSep);
                drawCenteredImage(context, note.fret.includes("2") ? fret2 : fret0, x3, ty);
                drawCenteredImage(context, note.fret.includes("3") ? fret3 : fret0, x3, ty - fretSep);
            }
        }
    }
}

function placeText(context, fontSize, text, x3, ty, clear=false) {
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
        // if it's a multi-fret chord then underline it
        if (text.length > 1) {
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

function convertToPng(canvas) {
    // quick and easy replace a canvas element with an equivalent image element for easy download

    // builds a huuuuge URL with the base-64 encoded PNG data embedded inside it
    var src = canvas.toDataURL();
    // get the song name that was saved to the canvas element
    var name = canvas.saveName;
    // use a default if no name was specified
    if (!name || name == "") {
        name = "song";
    }
    var fileName = name + ".png";

    if (canvas.style.height) {
        var imgStyle = `style = "height: ` + canvas.style.height + `; width: ` + canvas.style.width + `"`;
    } else {
        var imgStyle = ``;
    }

    // replace the canvas with an image
    // Ugh, the only way to give it a file name is to wrap it in a link element, and duplicate the entire src contents.
    canvas.parentElement.innerHTML = `
        <a download="${fileName}" href="${src}">
            <image src="${src}" ` + imgStyle + `></image>
        </a>
    `;
}
*/



