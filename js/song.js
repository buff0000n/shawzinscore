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

    // ganked from https://stackoverflow.com/questions/22697936/binary-search-in-javascript
    function binarySearchSong(arr, tick, fret=null, string=null) {
        var m = 0;
        var n = arr.length - 1;

        while (m <= n) {
            var k = (n + m) >> 1;

            var cmp = tick - arr[k].tick;
            if (cmp == 0 && fret) {
                cmp = fret.localeCompare(arr[k].fret);
            }
            if (cmp == 0 && string) {
                cmp = string.localeCompare(arr[k].string);
            }

            if (cmp > 0) {
                m = k + 1;

            } else if (cmp < 0) {
                n = k - 1;

            } else {
                return k;
            }
        }

        return ~m;
    }

    function splitNoteName(noteName) {
        var split = noteName.split("-");
        if (split.length == 2) {
            var fret = split[0];
            var string = split[1];
            return [fret, string];
        }
        throw "Invalid note name: \"" + noteName + "\"";
    }

    var noteCount = 0;
    function noteId() {
        return noteCount++;
    }

    // public members
    return {
        // convert a single character to a 6-bit int
        base64ToInt: base64ToInt, // (char)
        // convert a single 6-bit int to a base64 char
        intToBase64: intToBase64, // (i)
        // time based comparator for sorting notes
        splitNoteName: splitNoteName, // (noteName): [fret, string]
        binarySearchSong: binarySearchSong, // (array, tick, fret=null, string=null)
        noteId: noteId, // ()
    };
})();

// thanks to https://www.reddit.com/r/Warframe/comments/cxbxoc/shawzin_song_recording_syntax/
// object representing a single note
class Note {
    constructor(noteName = null, tick = 0) {
        this.id = SongUtils.noteId();
        this.string = null;
        this.fret = null;

        // string, fret
        if (noteName) {
            [this.fret, this.string] = SongUtils.splitNoteName(noteName);
        }
        // time
        this.tick = tick;

        // doubly linked list
        this.prev = null;
        this.next = null;

        this.errors = null;
    }

    // parse a three character code for string, fret, and timing
    fromCode(code) {
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
        if (this.fret.length == 0) {
            this.fret = "0";
        }

        // combine measure int and tick into into a single tick, number of ticks from the beginning of the song
        this.tick = (measure * 64) + measureTick;

        // apparently more than one string is fine

        return this;
    }

    // build the canonical name for the string and fret combination,
    // this identifies the audio sound to play
    toNoteName() {
        return this.fret + "-" + this.string;
    }

    // convert to a three-character code
    toCode(offsetTicks = 0) {
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
                case "0" : break;
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

    toString() {
        return this.tick + ":" + this.fret + "-" + this.string;
    }

    equals(other) {
        return other && this.fret == other.fret && this.string == other.string;
    }
    
    matchesNoteName(matchFret=null, matchString=null) {
        return (matchFret == null || matchFret == this.fret)
            && (matchString == null || matchString == this.string);
    }

    // convenience function to determine whether this note is a chord or not
    isChord() {
        return this.fret.length > 1;
    }

    // human readable description
    desc() {
        return "[" + this.tick + " : " + this.toNoteName() + "]";
    }

    // shift the tick time
    shiftTick(offsetTicks) {
        this.tick += offsetTicks;
    }

    hasErrors() {
        return this.errors != null;
    }

    addError(error) {
        if (!this.errors) {
            this.errors = [error];
            if (this.view) {
                this.view.setHasErrors(true);
            }
        } else {
            DomUtils.addToListIfNotPresent(this.errors, error);
        }
    }

    removeError(error) {
        if (this.errors) {
            if (DomUtils.removeFromList(this.errors, error) >= 0) {
                if (this.errors.length == 0) {
                    this.errors = null;
                    if (this.view) {
                        this.view.setHasErrors(false);
                    }
                }
            }
        }
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
    fromCode(code) {
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
        for (var n = 1; n < code.length; n+= 3) {
            var noteCode = code.substring(n, n+3);
            var note = new Note().fromCode(noteCode);
            if (note.string.length == 1) {
                // add to the note list, sorting by tick and setting up a doubly linked list
                this.addNote(note);

            } else if (note.string.length == 0) {
                // what
                console.log("ignored note code with zero strings specified: " + noteCode);

            } else {
                // it's a multi-string code, break it up into multiple notes
                // loop over the strings
                for (var i = 0; i < note.string.length; i++) {
                    // build a note with a single string
                    var note2 = new Note(note.fret + "-" + note.string[i], note.tick);
                    // add to the note list, sorting by tick and setting up a doubly linked list
                    this.addNote(note2);
                }
            }
        }

        return this;
    }

    /// add a note
    addNote(note) {
        // search for the insertion index
        var index = this.getNoteIndex(note.tick, note.fret, note.string);
        if (index < 0) {
            // no exact match found, just get the insertion index
            index = -(index + 1);
        } else {
            // exact match found, which you should not be doing
            // check if the same exact object was added twice
            // we have to do a loop forward and backward in case some asshole has added the same
            // exact note multiple times.  What an asshole.
            for (var n = this.notes[index]; n != null && n.tick == note.tick; n = n.prev) {
                if (n == note) {
                    throw ("Duplicate note object added");
                }
            }
            for (var n = this.notes[index].next; n != null && n.tick == note.tick; n = n.next) {
                if (n == note) {
                    throw ("Duplicate note object added");
                }
            }
            // insert immediately afterward
            index++;
        }
        // perform the insertion
        this.notes.splice(index, 0, note);
        // maintain the link forward
        if (index > 0) {
            this.notes[index].prev = this.notes[index - 1];
            this.notes[index - 1].next = this.notes[index];
        } else {
            this.notes[index].prev = null;
        }
        // maintain the link backward
        if (index < this.notes.length - 1) {
            this.notes[index + 1].prev = this.notes[index];
            this.notes[index].next = this.notes[index + 1];
        } else {
            this.notes[index].next = null;
        }

        this.noteAdded(note);
    }

    // get the index of the given note
    // Jesus why is this so complicated
    getNoteIndex(tick, fret=null, string=null) {
        // search for a note at the correct tick and optional fret and string
        return SongUtils.binarySearchSong(this.notes, tick, fret, string);
        // that's it that's the function
    }

    getNote(tick, fret=null, string=null, backtrack=0, forwardtrack=0) {
        var index = this.getNoteIndex(tick, fret, string);
        if (index >= 0) {
            return this.notes[index];
        }
        // convert to insertion index
        index = -index - 1;
        if (backtrack > 0 && index > 0) {
            var stopTick = tick - backtrack;
            // start at the previous element to the insertion index
            for (var index2 = index - 1; index2 >= 0; index2--) {
                var note = this.notes[index2];
                if (note.tick < stopTick) break;
                if (note.tick <= tick) {
                    //console.log("backTrack: " + index2);
                    if (note.matchesNoteName(fret, string)) {
                        return note;
                    }
                }
            }
        }
        if (forwardtrack > 0 && index < this.notes.length - 1) {
            var stopTick = tick + forwardtrack;
            // start at the insertion index
            for (var index2 = index; index2 < this.notes.length; index2++) {
                var note = this.notes[index2];
                if (note.tick > stopTick) break;
                if (note.tick >= tick) {
                    //console.log("forwardTrack: " + index2);
                    if (this.notes[index2].matchesNoteName(fret, string)) {
                        return this.notes[index2];
                    }
                }
            }
        }
        return null;
    }

    // remove the given note
    removeNote(note) {
        // find it in the array
        var index = this.getNoteIndex(note.tick, note.fret, note.string);
        // sanity check
        if (index < 0) {
            throw "Note not found: " + note;
        }

        // ugh, if the given note object is actually in this note list then make sure its the one we remove
        // I feel like there's a better way to architect this whole note list
        var index2 = index;
        // search backward
        while (index2 > 0 && this.notes[index2] != note && this.notes[index2 - 1].tick == note.tick && this.notes[index2 - 1].equals(note)) {
            index2--;
        }
        if (this.notes[index2] != note) {
            // search forward
            var index2 = index;
            while (index2 < this.notes.length - 1 && this.notes[index2] != note && this.notes[index2 + 1].tick == note.tick && this.notes[index2 + 1].equals(note)) {
                index2++;
            }
        }

        index = index2;

        var noteToRemove = this.notes[index];

        // break the forward linkage
        if (noteToRemove.prev) {
            noteToRemove.prev.next = noteToRemove.next;
        }
        // break the backward linkage
        if (noteToRemove.next) {
            noteToRemove.next.prev = noteToRemove.prev;
        }

        // remove from the array
        this.notes.splice(index, 1);

        this.noteRemoved(noteToRemove);
        return noteToRemove;
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
        var index = this.getNoteIndex(tick);
        // no exact match, correct the result
        if (index < 0) {
            index = -(index + 1);
        }
        return (index < this.notes.length) ? this.notes[index] : null;
    }

    // convert to a song code
    toCode() {
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
            var note = this.notes[n];

            // detect notes with the same tick and fret and combine them into multi-string notes
            // this works because the note list is fully ordered by tick and then by fret
            while (n < this.notes.length - 1 && this.notes[n + 1].tick == note.tick && this.notes[n + 1].fret == note.fret) {
                // not really interested in optimizing this extremely rare case
                // build a new note
                var note2 = new Note();
                // merge
                note2.tick = note.tick;
                note2.fret = note.fret;
                // just append, when creating the note code it doesn't matter what order the strings are in or
                // how many duplicates there are
                note2.string = note.string + this.notes[n + 1].string;
                // replace the note to write
                note = note2;
                // move to the next note
                n++;
            }
            // convert to a code
            buffer += note.toCode(offsetTicks);
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

    // rules

    noteAdded(note) {
        if (this.notes.length > 1000) {
            note.addError("Exceeds max note count")
            if (this.notes.length == 1001) {
                for (var i = 0; i < this.notes.length; i++) {
                    this.notes[i].addError("Exceeds max note count")
                }
            }
        }
        if (note.tick >= Metadata.maxTickLength) {
            note.addError("Exceeds song time limit")
        }

        if ((note.prev != null && note.prev.tick == note.tick) ||
            (note.next != null && note.next.tick == note.tick)) {
            this.checkInvalidConcurrentNotes(note);
        }
    }

    noteRemoved(note) {
        if (this.notes.length == 1000) {
            for (var i = 0; i < this.notes.length; i++) {
                this.notes[i].removeError("Exceeds max note count")
            }
        }

        if (note.prev != null && note.prev.tick == note.tick) {
            this.checkInvalidConcurrentNotes(note.prev);

        } else if (note.next != null && note.next.tick == note.tick) {
            this.checkInvalidConcurrentNotes(note.next);
        }
    }

    checkInvalidConcurrentNotes(note) {
        var tickStartNote = note;
        while (tickStartNote.prev != null && tickStartNote.prev.tick == note.tick) {
            tickStartNote = tickStartNote.prev;
        }

        var invalid = false;

        for (var n = tickStartNote; n.next != null && n.next.tick == note.tick; n = n.next) {
            if (n.equals(n.next)) {
                n.addError("Duplicate note");
                n.next.addError("Duplicate note");

            } else {
                n.removeError("Duplicate note");
                n.next.removeError("Duplicate note");

                if (n.fret != n.next.fret) {
                    invalid = true;
                }
            }
        }

        for (var n = tickStartNote; n != null && n.tick == note.tick; n = n.next) {
            if (invalid) {
                n.addError("Invalid concurrent notes");
            } else {
                n.removeError("Invalid concurrent notes");
            }
        }
    }

}

function what() {
    var song = new Song();
    song.setScale("pmin");
    var fret = "1";
    var t = 0;
    var dt = 16;
    song.addNote(new Note(fret + "-1", t+=dt));
    song.addNote(new Note(fret + "-2", t+=dt));
    song.addNote(new Note(fret + "-3", t+=dt));
    song.addNote(new Note(fret + "-12", t+=dt));
    song.addNote(new Note(fret + "-23", t+=dt));
    song.addNote(new Note(fret + "-13", t+=dt));
    song.addNote(new Note(fret + "-123", t+=dt));
    fret = "12";
    song.addNote(new Note(fret + "-1", t+=dt));
    song.addNote(new Note(fret + "-2", t+=dt));
    song.addNote(new Note(fret + "-3", t+=dt));
    song.addNote(new Note(fret + "-12", t+=dt));
    song.addNote(new Note(fret + "-23", t+=dt));
    song.addNote(new Note(fret + "-13", t+=dt));
    song.addNote(new Note(fret + "-123", t+=dt));
    var code = song.toCode();
    console.log(code);
}

function what2() {
    var song = new Song();
    song.setScale("pmin");
    var fret = "1";
    var t = 0;
    var dt = 16;
    song.addNote(new Note(fret + "-1", t+=dt));
    song.addNote(new Note(fret + "-2", t+=dt));
    song.addNote(new Note(fret + "-3", t+=dt));
    song.addNote(new Note(fret + "-1", t+=dt));
    song.addNote(new Note(fret + "-2", t));
    song.addNote(new Note(fret + "-2", t+=dt));
    song.addNote(new Note(fret + "-3", t));
    song.addNote(new Note(fret + "-1", t+=dt));
    song.addNote(new Note(fret + "-3", t));
    song.addNote(new Note(fret + "-1", t+=dt));
    song.addNote(new Note(fret + "-2", t));
    song.addNote(new Note(fret + "-3", t));
    var code = song.toCode();
    console.log(code);
}

function what2() {
    var song = new Song();
    song.setScale("pmin");
    var fret = "1";
    var t = 0;
    var dt = 16;
    song.addNote(new Note(fret + "-1", t+=dt));
    song.addNote(new Note(fret + "-2", t+=dt));
    song.addNote(new Note(fret + "-3", t+=dt));
    song.addNote(new Note(fret + "-1", t+=dt));
    song.addNote(new Note(fret + "-2", t+1));
    song.addNote(new Note(fret + "-3", t+=dt));
    var code = song.toCode();
    console.log(code);
}

function what2() {
    var song = new Song();
    song.setScale("pmin");
    var fret = "1";
    var t = 0;
    var dt = 16;
    fret = "12";
    song.addNote(new Note(fret + "-1", t+=dt));
    song.addNote(new Note(fret + "-2", t+=dt));
    song.addNote(new Note(fret + "-3", t+=dt));
    song.addNote(new Note(fret + "-1", t+=dt));
    song.addNote(new Note(fret + "-2", t));
    song.addNote(new Note(fret + "-2", t+=dt));
    song.addNote(new Note(fret + "-3", t));
    song.addNote(new Note(fret + "-1", t+=dt));
    song.addNote(new Note(fret + "-3", t));
    song.addNote(new Note(fret + "-1", t+=dt));
    song.addNote(new Note(fret + "-2", t));
    song.addNote(new Note(fret + "-3", t));
    var code = song.toCode();
    console.log(code);
}