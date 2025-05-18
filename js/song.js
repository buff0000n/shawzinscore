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

    // marker for an alt note code.  Using this because it represents a time portion of the note code
    // that is beyond the four minute time limit
    var altNoteCodeSuffix = "//";

    function parseNoteCode(code) {
        // sanity check
        if (code.length != 3) {
            throw "Invalid note code: \"" + code + "\""
        }
        // split three base64 chars and convert to ints
        var noteInt = base64ToInt(code.charAt(0));
        var measure = base64ToInt(code.charAt(1));
        var measureTick = base64ToInt(code.charAt(2));

        // reconstruct the timestamp
        var tick = parseMeasure(measure, measureTick);
        // reconstruct the fret and string
        var [fret, string] = parseNoteInt(noteInt);

        return [tick, fret, string];
    }

    function parseAltNoteCode(code) {
        // sanity check
        if (code.length != 3) {
            throw "Invalid alt note code: \"" + code + "\""
        }
        // code format is "N//" where "N" is the note int and "//" is a static marker
        var noteInt = base64ToInt(code.charAt(0));

        // reconstruct just the fret and string
        return parseNoteInt(noteInt);
    }

    function parseMeasure(measure, measureTick) {
        // combine measure int and tick into into a single tick, number of ticks from the beginning of the song
        return (measure * 64) + measureTick;
    }

    function parseNoteInt(noteInt) {
        // bits 1-3 of the note int are the strings
        // apparently more than one string is fine
        var string = "";
        if (noteInt & 0x01) string = string + "1";
        if (noteInt & 0x02) string = string + "2";
        if (noteInt & 0x04) string = string + "3";
        // bits 4-6 of the note int are the frets
        var fret = "";
        if (noteInt & 0x08) fret = fret + "1";
        if (noteInt & 0x10) fret = fret + "2";
        if (noteInt & 0x20) fret = fret + "3";
        // replace no fret with the zero fret
        if (fret.length == 0) {
            fret = "0";
        }

        return [fret, string];
    }
    
    function toNoteCode(tick, fret, string) {
        // note int
        var b1 = toNoteInt(fret, string);

        // high-order time
        var b2 = Math.floor(tick / 64);

        // low-order time
        var b3 = tick - (b2 * 64);

        // convert to base64
        return intToBase64(b1) + intToBase64(b2) + intToBase64(b3);
    }
    
    function toAltNoteCode(fret, string) {
        var b1 = toNoteInt(fret, string);

        // convert to base64 with the static marker
        return intToBase64(b1) + altNoteCodeSuffix;
    }
    
    function toNoteInt(fret, string) {
        // build the first character from the string and fret info
        var b1 = 0;
        for (var c = 0; c < string.length; c++) {
            switch (string.charAt(c)) {
                case "1" : b1 |= 0x01; break;
                case "2" : b1 |= 0x02; break;
                case "3" : b1 |= 0x04; break;
            }
        }
        for (var c = 0; c < fret.length; c++) {
            switch (fret.charAt(c)) {
                case "1" : b1 |= 0x08; break;
                case "2" : b1 |= 0x10; break;
                case "3" : b1 |= 0x20; break;
                case "0" : break;
            }
        }
        return b1;
    }

    // ganked from https://stackoverflow.com/questions/22697936/binary-search-in-javascript
    function binarySearchSong(arr, tick, fret=null, string=null, alt=false) {
        var m = 0;
        var n = arr.length - 1;

        while (m <= n) {
            var k = (n + m) >> 1;

            // customized comparison section
            var cmp = tick - arr[k].tick;
            if (cmp == 0 && fret) {
                cmp = fret.localeCompare(alt ? arr[k].altFret : arr[k].fret);
            }
            if (cmp == 0 && string) {
                cmp = string.localeCompare(alt ? arr[k].altString : arr[k].string);
            }

            // carry on
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

    // split a note name into a two-element array with the fret(s) and string(s)
    function splitNoteName(noteName) {
        var split = noteName.split("-");
        if (split.length == 2) {
            var fret = split[0];
            var string = split[1];
            return [fret, string];
        }
        throw "Invalid note name: \"" + noteName + "\"";
    }

    // for debugging, give each Note object an ID
    var noteCount = 0;
    function noteId() {
        return noteCount++;
    }

    // public members
    return {
        splitNoteName: splitNoteName, // (noteName): [fret, string]
        // parse a song code note fragment
        parseNoteCode: parseNoteCode, // (code): [tick, fret, string]
        // note code suffix denoting an alt note code
        altNoteCodeSuffix: altNoteCodeSuffix, //
        // parse a song code alt note fragment
        parseAltNoteCode: parseAltNoteCode, // (code): [fret, string]
        // convert note info to a song code fragment
        toNoteCode: toNoteCode, // (tick, fret, string): String
        // convert alt note info to a song code fragment
        toAltNoteCode: toAltNoteCode, // (fret, string): String
        // search an array of notes for the given tick and optional note info
        binarySearchSong: binarySearchSong, // (array, tick, fret=null, string=null)
        // generate an ID for a note
        noteId: noteId, // ()
    };
})();

// thanks to https://www.reddit.com/r/Warframe/comments/cxbxoc/shawzin_song_recording_syntax/
// object representing a single note
class Note {
    constructor(noteName = null, tick = 0, altNoteName = null) {
        // note ID for debugging
        this.id = SongUtils.noteId();
        // one or more strings
        this.string = null;
        // zero or more frets
        this.fret = null;
        
        // duviri-mode alt string
        this.altString = null;
        // duviri-mode alt frets
        this.altFret = null;

        // parse the note name
        if (noteName) {
            [this.fret, this.string] = SongUtils.splitNoteName(noteName);
        }
        // parse the alt note name, if given
        if (altNoteName) {
            [this.altFret, this.altString] = SongUtils.splitNoteName(altNoteName);
        // otherwise, the alt note name is the same as the note name
        } else {
            [this.altFret, this.altString] = [this.fret, this.string]
        }
        // time
        this.tick = tick;

        // doubly linked list
        this.prev = null;
        this.next = null;

        // list of errors on this note
        this.errors = null;
    }

    // parse a three character code for string, fret, and timing, plus optionally three more for an alt note
    fromCode(code) {
        if (code.length == 3) {
            // normal note code, alt note is the same as the normal one
            [this.tick, this.fret, this.string] = SongUtils.parseNoteCode(code);
            [this.altFret, this.altString] = [this.fret, this.string];

        } else if (code.length == 6) {
            // note code with an alt
            [this.tick, this.fret, this.string] = SongUtils.parseNoteCode(code.substring(0, 3));
            [this.altFret, this.altString] = SongUtils.parseAltNoteCode(code.substring(3));

        } else {
            throw "Invalid note code: \"" + code + "\""
        }

        return this;
    }

    // build the canonical name for the string and fret combination,
    // this identifies the audio sound to play
    toNoteName() {
        return this.fret + "-" + this.string;
    }

    // same, but for the alt note
    toAltNoteName() {
        return this.altFret + "-" + this.altString;
    }

    // convert to a three-character code
    toCode(offsetTick = 0, justNonAlt = false, justAlt = false) {
        // generate the base note code, depending on whether we want just the alt or not, offsetting the ticks
        var code = justAlt ? SongUtils.toNoteCode(this.tick - offsetTick, this.altFret, this.altString) :
                             SongUtils.toNoteCode(this.tick - offsetTick, this.fret, this.string);
        // check if there are no extra formatting options and append the alt note code if necessary
        if (!justNonAlt && !justAlt && this.hasAlt()) {
            code = code + SongUtils.toAltNoteCode(this.altFret, this.altString);
        }

        return code;
    }

    // human-readable string
    toString() {
        return this.tick + ":" + this.fret + "-" + this.string +
            (!this.hasAlt() ? "" : (" (" + this.altFret + "-" + this.altString + ")"));
    }

    // equality check
    equals(other) {
        return other && 
            this.fret == other.fret && this.string == other.string &&
            this.altFret == other.altFret && this.altString == other.altString;
    }

    hasAlt() {
        return this.altFret != this.fret || this.altString != this.string;
    }

    // match with optional fret and string info
    matchesNoteName(matchFret=null, matchString=null, alt=false) {
        return (matchFret == null || (!alt && matchFret == this.fret) || (alt && matchFret == this.altFret))
            && (matchString == null || (!alt && matchString == this.string) || (alt && matchString == this.altString));
    }

    // convenience function to determine whether this note is a chord or not
    isChord() {
        return this.fret.length > 1;
    }

    // human readable description
    desc() {
        return "[" + this.toString() + "]";
    }

    // shift the tick time
    shiftTick(offsetTick) {
        this.tick += offsetTick;
    }

    // whether the note has errors
    hasErrors() {
        return this.errors != null;
    }

    // add an error to the note
    addError(error) {
        // check for an error list
        if (!this.errors) {
            // create a new error list
            this.errors = [error];
            // notify the view, if there is one
            if (this.view) {
                this.view.setHasErrors(true);
            }
        } else {
            // add to the existing error list
            DomUtils.addToListIfNotPresent(this.errors, error);
        }
    }

    // remove an error from the note
    removeError(error) {
        // check for an error list
        if (this.errors) {
            // look for and remove the error from the list, and check if anything was removed
            if (DomUtils.removeFromList(this.errors, error) >= 0) {
                // check if the error list is now empty
                if (this.errors.length == 0) {
                    // clear out the error list
                    this.errors = null;
                    // notify the view, if there is one
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
        // count of notes with an alt
        this.notesWithAltCount = 0;
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
        // pull out each three-char substring
        for (var n = 1; n < code.length; n+= 3) {
            // check for a note code with an alt note
            if (n < code.length - 3 &&
                    code[n + 4] == SongUtils.altNoteCodeSuffix[0] &&
                    code[n + 5] == SongUtils.altNoteCodeSuffix[1]) {
                // parse six character note with alt code
                var noteCode = code.substring(n, n+6);
                // skip forward
                n += 3;
            } else {
                // parse normal three character note code
                var noteCode = code.substring(n, n+3);
            }
            // parse it into a note string, fret, and tick
            var note = new Note().fromCode(noteCode);
            // check if it's just a single string
            if (note.string.length == 1) {
                // add to the note list, sorting by tick and setting up a doubly linked list
                this.addNote(note);

            } else if (note.string.length == 0) {
                // what
                console.log("ignored note code with zero strings specified: " + noteCode);

            } else if (note.hasAlt()) {
                // yeah, no.  I'm not going to support a multi-string note with a duviri alt.
                // That's not worth the headache.
                throw "Invalid note code: \"" + noteCode + "\""

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
    getNoteIndex(tick, fret=null, string=null, alt=false) {
        // search for a note at the correct tick and optional fret and string
        return SongUtils.binarySearchSong(this.notes, tick, fret, string, alt=false);
        // that's it that's the function
    }

    getNote(tick, fret=null, string=null, backtrack=0, forwardtrack=0, alt=false) {
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
                    if (note.matchesNoteName(fret, string, alt)) {
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
                    if (this.notes[index2].matchesNoteName(fret, string, alt)) {
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
    toCode(justNonAlt = false, justAlt = false) {
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
        var offsetTick = this.notes[0].tick;

        // append each note in chronological order
        for (var n = 0; n < this.notes.length; n++) {
            var note = this.notes[n];

            // detect notes with the same tick and fret and combine them into multi-string notes
            // this works because the note list is fully ordered by tick and then by fret
            while (n < this.notes.length - 1 && this.notes[n + 1].tick == note.tick && this.notes[n + 1].fret == note.fret) {
                // not really interested in optimizing this extremely rare case
                // merge strings
                // just append, when creating the note code it doesn't matter what order the strings are in or
                // how many duplicates there are
                var newNoteString = note.string + this.notes[n + 1].string;
                // create new note
                var note2 = new Note(note.fret + "-" + newNoteString, note.tick);
                // replace the note to write
                note = note2;
                // move to the next note
                n++;
            }
            // convert to a code
            buffer += note.toCode(offsetTick, justNonAlt, justAlt);
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
        // check if we're past the max note count
        if (this.notes.length > Metadata.maxNotes) {
            // add an error to the new note
            note.addError("Exceeds max note count")
            // check if we just passed the max note count with this note
            if (this.notes.length == Metadata.maxNotes + 1) {
                // we gotta add the error to every note in the list
                for (var i = 0; i < this.notes.length; i++) {
                    this.notes[i].addError("Exceeds max note count")
                }
            }
        }
        // check against the max song duration
        if (note.tick >= Metadata.maxTickLength) {
            note.addError("Exceeds song time limit")
        }
        // pre-check if there are concurrent notes, then run the invalid concurrent note check
        if ((note.prev != null && note.prev.tick == note.tick) ||
            (note.next != null && note.next.tick == note.tick)) {
            this.checkInvalidConcurrentNotes(note);
        }

        // maintain the alt note count
        if (note.hasAlt()) {
            this.notesWithAltCount += 1;
        }
    }

    noteRemoved(note) {
        // check if we just dropped to the max note count
        if (this.notes.length == 1000) {
            // clear all those errors
            for (var i = 0; i < this.notes.length; i++) {
                this.notes[i].removeError("Exceeds max note count")
            }
        }

        // pre-check if there are concurrent notes before the removed one
        if (note.prev != null && note.prev.tick == note.tick) {
            // run the invalid concurrent note check on the previous notes
            this.checkInvalidConcurrentNotes(note.prev);

        // pre-check if there are concurrent notes after the removed one
        } else if (note.next != null && note.next.tick == note.tick) {
            // run the invalid concurrent note check on the next notes
            this.checkInvalidConcurrentNotes(note.next);
        }

        // maintain the alt note count
        if (note.hasAlt()) {
            this.notesWithAltCount -= 1;
        }
    }

    // concurrent note validity check
    checkInvalidConcurrentNotes(note) {
        // start at the given note
        var tickStartNote = note;
        // find the start of the concurrent notes
        while (tickStartNote.prev != null && tickStartNote.prev.tick == note.tick) {
            tickStartNote = tickStartNote.prev;
        }

        // start off valid
        var invalid = false;

        for (var n = tickStartNote; n.next != null && n.next.tick == note.tick; n = n.next) {
            // check straight equality
            if (n.equals(n.next)) {
                // add an error to both notes
                n.addError("Duplicate note");
                n.next.addError("Duplicate note");

            } else {
                // remove the error from both notes
                if (!n.prev || !n.equals(n.prev)) {
                    // only remove n's error if it wasn't already equal to its previous note
                    n.removeError("Duplicate note");
                }
                // remove it from the next note, if that one's equal to its next note then we'll
                // add the error back in the next iteration
                n.next.removeError("Duplicate note");

                // check for concurrent notes with different frets.  We only have to check
                // consecutive notes because they're ordered by fret
                // simultaneous notes where any of them have duviri alts is also an error, because I'm not going to
                // support that.
                if (n.fret != n.next.fret || n.hasAlt() || n.next.hasAlt()) {
                    invalid = true;
                }
            }
        }

        // loop over all concurrent notes and set or clear the invalid concurrent note error
        for (var n = tickStartNote; n != null && n.tick == note.tick; n = n.next) {
            if (invalid) {
                // set the error
                n.addError("Invalid concurrent notes");
            } else {
                // clear the error
                n.removeError("Invalid concurrent notes");
            }
        }
    }

    hasAltNotes() {
        return this.notesWithAltCount > 0;
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