// just some utils I need for song things
var SongUtils = (function() {
    // does javascript have a built in b64 parser that doesn't suck?
    var base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    function base64ToInt(char) {
        // todo: better?
        // not too worried about optimizing the parsing side, we're going to be producing base64 way more often than we're parsing it
        var index = base64Chars.indexOf(char);
        if (index < 0) {
            throw "Invalid character: \"" + char + "\"";
        }
        return index;
    }

    function intToBase64(i) {
        if (i < 0 || i > 63) {
            throw "Invalid int for base64: " + i;
        }
        return base64Chars[i];
    }

    // time based comparator for sorting notes
    function noteTickComparator(note1, note2) {
        return note1.tick - note2.tick;
    }

    // public members
    return {
        // convert a single character to a 6-bit int
        base64ToInt: base64ToInt, // (char)
        // convert a single 6-bit int to a base64 char
        intToBase64: intToBase64, // (i)
        // time based comparator for sorting notes
        noteTickComparator: noteTickComparator, // (note1, note2)
    };
})();

// thanks to https://www.reddit.com/r/Warframe/comments/cxbxoc/shawzin_song_recording_syntax/
// object representing a single note
class Note {
    constructor(fret = "", string = "", tick = 0) {
        // string, fret and time
        this.string = string;
        this.fret = fret;
        this.tick = tick;

        // doubly linked list
        this.prev = null;
        this.next = null;
    }

    // parse a three character code for string, fret, and timing
    fromString(code) {
        // sanity check
        if (code.length != 3) {
            throw "Invalid note code: \"" + code + "\""
        }
        // split three base64 chars and convert to ints
        var noteInt = SongUtils.base64ToInt(code.charAt(0));
        var measure = SongUtils.base64ToInt(code.charAt(1));
        var measureTick = SongUtils.base64ToInt(code.charAt(2));

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

        // combine measure int and tick into into a single tick, number of ticks from the beginning of the song
        this.tick = (measure * 64) + measureTick;

        if (this.string.length != 1) {
            // must contain exactly one string
            throw "Invalid note code: \"" + code + "\"";
        }

        return this;
    }

    // build the canonical name for the string and fret combination,
    // this identifies the audio sound to play
    toNoteName() {
        return (this.fret.length == 0 ? "0" : this.fret) + "-" + this.string;
    }

    // convert to a three-character code
    toString(offsetTicks = 0) {
        // build the first character from the string and fret info
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

        // offset the time
        var saveTick = this.tick - offsetTicks;

        // high-order time
        var b2 = Math.floor(saveTick / 64);

        // low-order time
        var b3 = saveTick - (b2 * 64);

        // convert to base64
        return SongUtils.intToBase64(b1) + SongUtils.intToBase64(b2) + SongUtils.intToBase64(b3);
    }

    // convenience function to determine whether this note is a chord or not
    isChord() {
        return this.fret.length > 1;
    }

    // human readable description
    desc() {
        return "[" + this.tick + " : " + this.string + "-" + this.fret + "]";
    }

    // shift the tick time
    shiftTick(offsetTicks) {
        this.tick += offsetTicks;
    }
}

// object representing an entire song
class Song {
    constructor() {
        // scale
        this.scale = "";
        // notes
        this.notes = Array();
    }

    // scale setter
    setScale(scale) {
        this.scale = scale;
        return this;
    }

    // scale getter
    getScale() {
        return this.scale;
    }

    // parse a song code and store the data in this object
    fromString(code) {
        // strip all whitespace
        code = code.replace(/\s/g, '');
        // should be 3n+1 chars long
        if (code.length % 3 != 1) {
            throw "Code is an invalid length"
        }

        // pull out the scale code and map it
        var scaleCode = code.charAt(0);
        this.scale = Metadata.scaleOrder[scaleCode - 1];
        // check if it's a valid scale code
        if (!this.scale) {
            throw "Invalid scale code: \"" + scaleCode + "\""
        }

        // note array
        this.notes = Array();
        // pull out each three-char substring and parse it into a note string, fret, and tick
        for (var i = 1; i < code.length; i+= 3) {
            // add to the note list, sorting by tick and setting up a doubly linked list
            this.addNote(new Note().fromString(code.substring(i, i+3)));
        }

        return this;
    }

    /// add a note
    addNote(note) {
        // search for the insertion index
        var index = binarySearch(this.notes, note, SongUtils.noteTickComparator);
        if (index < 0) {
            // no exact tick match found, just get the insertion index
            index = -(index + 1);
        } else {
            // exact tick match found, which you should not be doing.
            // Insert this note as the last one in the list at that tick
            while (index < this.notes.length && this.notes[index].tick == note.tick) { index++ }
        }
        // perform the insertion
        this.notes.splice(index, 0, note);
        // maintain the link forward
        if (index > 0) {
            this.notes[index].prev = this.notes[index - 1];
            this.notes[index - 1].next = this.notes[index];
        }
        // maintain the link backward
        if (index < this.notes.length - 1) {
            this.notes[index + 1].prev = this.notes[index];
            this.notes[index].next = this.notes[index + 1];
        }
    }

    // get the index of the given note
    getNoteIndex(note) {
        // search for a note at the correct tick
        var index = binarySearch(this.notes, note, SongUtils.noteTickComparator);
        if (index < 0) {
            // no exact tick match found
            return -1;

        } else {
            // just in case there's more than one at the same tick
            while (index < this.notes.length - 1 && this.notes[index] != note && this.notes[index + 1].tick == note.tick) { index++ }
            if (index >= this.notes.length || this.notes[index] != note) {
                // should I even be bothering with keeping an array?
                return -1;
            }
        }
        return index;
    }

    // remove the given note
    removeNote(note) {
        // find it in the array
        var index = this.getNoteIndex(note);
        // sanity check
        if (index < 0) {
            throw "Note not found: " + note;
        }

        // break the forward linkage
        if (index > 0) {
            this.notes[index - 1].next = this.notes[index].next;
        }
        // break the backward linkage
        if (index < this.notes.length - 1) {
            this.notes[index + 1].prev = this.notes[index].prev;
        }

        // remove from the array
        this.notes.splice(index, 1);
    }

    // internal function swap the notes at two indices
    swap(index1, index2) {
        // temp variables
        var t1 = this.notes[index1];
        var t2prev = t2.prev;
        var t2next = t2.next;

        // put note 1 where note 2 was
        this.notes[index1] = this.notes[index2];
        this.notes[index1].prev = t1.prev;
        this.notes[index1].next = t1.next;

        // put note 2 where note 1 was using the temp variables
        this.notes[index2] = t1;
        this.notes[index2].prev = t2prev;
        this.notes[index2].next = t2next;
    }

    // move the given note to the given time
    moveNote(note, tick) {
        // find the note
        var index = this.getNoteIndex(note);
        // sanity check
        if (index < 0) {
            throw "Note not found: " + note;
        }

        // update the note's tick
        note.tick = tick;
        // Assume we don't have to move it far and be a little efficient about it
        // move backwards in the list if we decreased its tick
        while (index > 0 && this.notes[index - 1].tick > note.tick) {
            this.swap(index - 1, index);
        }
        // move forwrads in the list if we increased its tick
        while (index < this.notes.length - 1 && this.notes[index + 1].tick <= note.tick) {
            this.swap(index, index + 1);
        }
    }

    // find the first note after the given one matching the given condition
    findNextNote(note, condition = (n1, n2) => true) {
        var note2 = note.next;
        while (note2 != null && !condition(note, note2)) {
            note2 = note2.next;
        }
        return note2;
    }

    // find the first note after the given tick
    getFirstNoteAfter(tick) {
        // search for the index
        // todo: some way without making a throaway object
        var index = binarySearch(this.notes, new Note("", "", tick), SongUtils.noteTickComparator);
        // no exact match, correct the result
        if (index < 0) {
            index = -(index + 1);
        }
        return (index < this.notes.length) ? this.notes[index] : null;
    }

    // convert to a song code
    toString() {
        // If it's just a scale and no notes then return blank
        if (this.notes.length == 0) {
            return "";
        }
        // todo: actual buffer?
        var buffer = "";
        // scale code is the index of the scale, starting at 1
        var scaleCode = Metadata.scaleOrder.indexOf(this.scale) + 1;
        buffer += scaleCode;

        // All song codes have to start at time 0, offset by the first note's tick time
        var offsetTicks = this.notes[0].tick;

        // append each note in chronological order
        for (var n = 0; n < this.notes.length; n++) {
            buffer += this.notes[n].toString(offsetTicks);
        }
        return buffer;
    }

    // determine if there's no notes present
    isEmpty() {
        return this.notes.length == 0;
    }

    // shift every note in the song to match the given lead-in
    setLeadInTicks(leadInTicks) {
        // sanity check
        if (this.notes.length == 0) return;

        // if there's already a lead-in, subtract it and then add the new one.
        var leadInOffset = leadInTicks - this.notes[0].tick;

        if (leadInOffset != 0) {
            // iterate over all the notes
            for (var i = 0; i < this.notes.length; i++) {
                // shift the note
                this.notes[i].shiftTick(leadInOffset);
            }
        }

        return this;
    }

    // get the tick time of the first note
    getStartTick() {
        return this.notes.length == 0 ? 0 : this.notes[0].tick;
    }

    // get the tick time of the last note in the song
    getEndTick() {
        return this.notes.length == 0 ? 0 : this.notes[this.notes.length - 1].tick;
    }
}