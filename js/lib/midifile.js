class MidiTime {
    constructor(tick, measure, beat, beatTick, microseconds) {
        this.tick = tick;
        this.measure = measure;
        this.beat = beat;
        this.beatTick = beatTick;
        this.microseconds = microseconds;
    }

    toString() {
        return `${String(this.measure).padStart(3, "0")}:${String(this.beat).padStart(1, "0")}:${String(this.beatTick).padStart(3, "0")} (${(this.microseconds / 1000000).toFixed(2).padStart(6, "0")})`;
    }
}

class MidiNote {
    constructor(time, durationTicks, channel, note, velocity) {
        this.time = time;
        this.durationTicks = durationTicks;
        this.channel = channel;
        this.note = note;
        this.velocity = velocity;
    }

    toString() {
        return `[${this.time.toString()}] chan ${this.channel}, note ${Music.getMidiNoteName(this.note)}, velocity: ${this.velocity}, duration: ${this.durationTicks}`;
    }
}

class MidiTrack {
    constructor(midiSong = null) {
        this.midiSong = midiSong;
        this.name = null;
        this.notes = [];
    }

    addNote(startTick, endTick, channel, note, velocity) {
        const midiNote = new MidiNote(this.midiSong.tickToMidiTime(startTick), endTick - startTick, channel, note, velocity);
        this.addNote0(midiNote);
    }

    addNote0(midiNote) {
        var index = MidiFileUtils.searchForMidiTime(this.notes, midiNote.time.tick);
        if (index < 0) {
            index = ~index;

        } else {
            index += 1;
        }

        this.notes.splice(index, 0, midiNote);
        if (this.midiSong) {
            this.midiSong.checkLastEventTime(midiNote.time);
        }
    }

    getNoteIndex(time) {
        var index = MidiFileUtils.searchForMidiTime(this.notes, time.tick);
        if (index < 0) {
            index = ~index;
        }
        return index;
    }
}

class MidiMeter {
    constructor(time, numerator, denominator) {
        this.time = time;
        this.numerator = numerator;
        this.denominator = denominator;
    }
}

class MidiTempo {
    constructor(time, microsecondsPerQ, bps) {
        this.time = time;
        this.microsecondsPerQ = microsecondsPerQ;
        // just to make debugging easier
        this.bps = bps;
    }
}

class MidiSong {
    constructor(ticksPerQ) {
        this.ticksPerQ = ticksPerQ;
        this.name = null;
        this.meterChanges = [];
        this.tempoChanges = [];
        this.tracks = [];
        this.latestEventTime = null;

        // default meter is 4/4
        this.addMeterChange(0, 4, 4);
        // default tempo is 120bpm
        this.addTempoChange(0, 500000);
    }

    addTrack() {
        const track = new MidiTrack(this);
        this.tracks.push(track);
        return track;
    }

    getTrack(num) {
        if (!this.tracks[num]) {
            this.tracks[num] = new MidiTrack(this);
        }
        return this.tracks[num];
    }

    getChangeIndex(changes, tick) {
        var index = MidiFileUtils.searchForMidiTime(changes, tick);
        if (index < 0) index = (~index) - 1;
        return index;
    }

    getChange(changes, tick) {
        return changes[this.getChangeIndex(changes, tick)];
    }

    getChangesInRange(changes, tick1, tick2) {
        const startIndex = this.getChangeIndex(changes, tick1);
        const endIndex = this.getChangeIndex(changes, tick2);
        return changes.slice(startIndex, endIndex + 1);
    }

    getMeter(time) {
        return this.getChange(this.meterChanges, time.tick);
    }

    getMetersInRange(time1, time2) {
        return this.getChangesInRange(this.meterChanges, time1.tick, time2.tick);
    }

    getTempo(time) {
        return this.getChange(this.tempoChanges, time.tick);
    }

    getTemposInRange(time1, time2) {
        return this.getChangesInRange(this.tempoChanges, time1.tick, time2.tick);
    }

    addChange(type, changes, change) {
        var index = MidiFileUtils.searchForMidiTime(changes, change.time.tick);
        if (index < 0) {
            index = ~index;
            changes.splice(index, 0, change);

        } else {
            changes[index] = change;
        }
    }

    addMeterChange(tick, numerator, denominator) {
        const time = this.tickToMidiTime(tick);

        if (time.beat > 0 || time.beatTick > 0) {
            throw `Invalid meter change in the middle of a measure: ${time.toString()}`;
        }

        const meter = new MidiMeter(time, numerator, denominator);
        this.addChange("meter", this.meterChanges, meter);
        // todo: re-time any existing changes and events after the meter change
    }

    addTempoChange(tick, microsecondsPerQ, bps) {
        const time = this.tickToMidiTime(tick);
        const tempo = new MidiTempo(time, microsecondsPerQ, bps);
        this.addChange("tempo", this.tempoChanges, tempo);
        // todo: re-time any existing changes and events after the tempo change
    }

    checkLastEventTime(time) {
        if (this.lastEventTime == null || time.tick > this.lastEventTime.tick) {
            this.lastEventTime = time;
        }
    }

    getNotesInRange(t1, m1, t2, m2) {
        const newTrack = new MidiTrack(this);
        var time1 = this.locationToMidiTime(m1, 0, 0);

        for (var t = t1; t <= t2; t++) {
            const track = this.tracks[t];
            var n = track.getNoteIndex(time1);
            while (n < track.notes.length && track.notes[n].time.measure <= m2) {
                newTrack.addNote0(track.notes[n]);
                n += 1;
            }
        }
        return newTrack;
    }

    tickToMidiTime(tick) {
        // gotta bootstrap somehow
        if (tick == 0) {
            return new MidiTime(0, 0, 0, 0, 0);
        }

        if (this.meterChanges.length == 0 || this.meterChanges[0].time.tick > 0) {
            throw "Missing initial meter";
        }

        if (this.tempoChanges.length == 0 || this.tempoChanges[0].time.tick > 0) {
            throw "Missing initial tempo";
        }

        // get the relevant meter and tempo entries
        const meter = this.getChange(this.meterChanges, tick);
        const tempo = this.getChange(this.tempoChanges, tick);
        // ticks per beat
        const ticksPerBeat = this.ticksPerQ / (meter.denominator / 4);
        // microseconds per beat
        const mspb = tempo.microsecondsPerQ / (meter.denominator / 4);

        // calculate measure, beat, and remainder ticks
        const ticksAfterMeter = tick - meter.time.tick;
        const beatsAfterMeter = Math.floor(ticksAfterMeter / ticksPerBeat);
        const measuresAfterMeter = Math.floor(beatsAfterMeter / meter.denominator);

        const measure = measuresAfterMeter + meter.time.measure;
        const remainderBeats = beatsAfterMeter - (measuresAfterMeter * meter.denominator);
        const remainderTicks = ticksAfterMeter - (beatsAfterMeter * ticksPerBeat);

        // calculate time
        // base time is whichever is later, the start of the current meter or the start of the current tempo
        const baseTime = meter.time.ticks > tempo.time.ticks ? meter.time : tempo.time;
        // ticks * (beats / ticks) * (microseconds / beats) = microseconds
        const microseconds = baseTime.microseconds + (((tick - baseTime.tick) * mspb) / ticksPerBeat);

        return new MidiTime(tick, measure, remainderBeats, remainderTicks, microseconds);
    }

    locationToMidiTime(measure, beat, beatTick) {
        // meh, not really worth doing a binary search
        var mc = 0;
        while (mc < this.meterChanges.length && this.meterChanges[mc + 1].measure <= measure) {
            mc++;
        }
        const meter = this.meterChanges[mc];

        // ticks per beat
        const ticksPerBeat = this.ticksPerQ / (meter.denominator / 4);
        const ticksPerMeasure = ticksPerBeat * meter.numerator;

        const tick = meter.time.tick +
            (ticksPerMeasure * (measure - meter.time.measure)) +
            (ticksPerBeat * (beat - meter.time.beat)) +
            beatTick;

        const tempo = this.getChange(this.tempoChanges, tick);
        // microseconds per beat
        const mspb = tempo.microsecondsPerQ / (meter.denominator / 4);

        // calculate time
        // base time is whichever is later, the start of the current meter or the start of the current tempo
        const baseTime = meter.time.ticks > tempo.time.ticks ? meter.time : tempo.time;
        // ticks * (beats / ticks) * (microseconds / beats) = microseconds
        const microseconds = baseTime.microseconds + (((tick - baseTime.tick) * mspb) / ticksPerBeat);

        return new MidiTime(tick, measure, beat, beatTick, microseconds);
    }
}

var MidiFileUtils = (function() {
    // pretty complete MIDI file spec: http://www.somascape.org/midi/tech/mfile.html
    // full spec: https://midi.org/standard-midi-files-specification

    const EVENT_OFF = "OFF";
    const EVENT_ON = "ON";
    const EVENT_AFTERTOUCH = "AFTERTOUCH";
    const EVENT_CONTROLELR = "CONTROLLER";
    const EVENT_PROGRAM = "PROGRAM";
    const EVENT_CHANNEL_AFTERTOUCH = "CHANNEL_AFTERTOUCH";
    const EVENT_PITCH_BEND = "PITCH_BEND";

    const EVENT_META_SEQUENCE = "SEQUENCE";
    const EVENT_META_TEXT = "TEXT";
    const EVENT_META_COPYRIGHT = "COPYRIGHT";
    const EVENT_META_TRACK_NAME = "TRACK_NAME";
    const EVENT_META_INSTRUMENT_NAME = "INSTRUMENT_NAME";
    const EVENT_META_LYRIC = "LYRIC";
    const EVENT_META_MARKER = "MARKER";
    const EVENT_META_CUE_POINT = "CUE_POINT";
    const EVENT_META_PROGRAM_NAME = "PROGRAM_NAME";
    const EVENT_META_MIDI_CHANNEL_PREFIX = "MIDI_CHANNEL_PREFIX";
    const EVENT_META_MIDI_PORT = "MIDI_PORT";
    const EVENT_META_TRACK_END = "TRACK_END";
    const EVENT_META_TEMPO = "TEMPO";
    const EVENT_META_SMTPE_OFFSET = "SMTPE_OFFSET";
    const EVENT_META_TIME_SIGNATURE = "TIME_SIGNATURE";
    const EVENT_META_KEY_SIGNATURE = "KEY_SIGNATURE";
    const EVENT_META_SEQUENCER_SPECIFIC = "SEQUENCER_SPECIFIC";

    function readMidiFile(byteArray, logCallback = (text) => {}) {
        try {
            const midiInfo = parseMidiFile(byteArray, logCallback);
            const midiSong = buildMidiSong(midiInfo, logCallback);
            return midiSong;
        } catch (error) {
            logCallback(`Error: ${error}`);
            return null;
        }
    }

    function parseMidiFile(byteArray, logCallback) {
        var headerInfo;
        const tracks = [];

        const r = new DataViewReader(byteArray);

        while (r.hasMore()) {
            var chunkType = r.readText(4);
            var chunkLength = r.readUint32();
            if (!r.peekMore(chunkLength)) {
                throw "Invalid MIDI file";
            }
            var chunk = r.readBytes(chunkLength);
            var r2 = new DataViewReader(chunk.buffer);

            switch (chunkType) {
                case "MThd":
                    // three two-byte numbers
                    const type = r2.readUint16();
                    const ntracks = r2.readUint16();
                    const tickSpec = r2.readUint16();

                    const json = {"type": type, "numTracks": ntracks};

                    const metrical = (tickSpec & 0x8000) == 0;
                    var tickString;
                    if (metrical) {
                        const quarterTicks = tickSpec & 0x7FFF;
                        tickString = `${quarterTicks} ticks per quarter note`;
                        json["quarterTicks"] = quarterTicks;

                    } else {
                        const fps = (~((tickSpec > 8) & 0xFF) + 1) & 0xFF;
                        const subFrameResolution = tickSpec & 0xFF;
                        json["fps"] = fps;
                        json["subFrameResolution"] = subFrameResolution;
                    }

                    headerInfo = json;

                    logCallback(`MIDI Type ${type}, ${ntracks} tracks`);
                    break;

                case "MTrk":
                    var track = [];
                    function addEvent(json) {
                        track.push(json);
                    }

                    var time = 0;
                    var lastStatusByte = 0;

                    while (r2.hasMore()) {
                        r2.mark();
                        // delta time
                        time = time + r2.readVariableLengthInt();
                        // event type
                        var statusByte = r2.readUint8();
                        if ((statusByte & 0x80) == 0) {
                            // running status
                            if (lastStatusByte == 0) {
                                throw `Invalid starting status: ${intToHex(statusByte)}`;
                            }
                            statusByte = lastStatusByte;
                            r2.rewind(1);
                        }
                        lastStatusByte = statusByte;

                        switch (statusByte & 0xF0) {
                            // midi events
                            case 0x80: // note off
                                addEvent({"time": time, "type": EVENT_OFF, "channel": statusByte & 0x0F, "note": r2.readUint8(), "velocity": r2.readUint8()})
                                break;
                            case 0x90: // note on
                                addEvent({"time": time, "type": EVENT_ON, "channel": statusByte & 0x0F, "note": r2.readUint8(), "velocity": r2.readUint8()})
                                break;
                            case 0xA0: // aftertouch
                                addEvent({"time": time, "type": EVENT_AFTERTOUCH, "channel": statusByte & 0x0F, "note": r2.readUint8(), "pressure": r2.readUint8()})
                                break;
                            case 0xB0: // controller
                                addEvent({"time": time, "type": EVENT_CONTROLELR, "channel": statusByte & 0x0F, "controller": r2.readUint8(), "value": r2.readUint8()})
                                break;
                            case 0xC0: // program change
                                addEvent({"time": time, "type": EVENT_PROGRAM, "channel": statusByte & 0x0F, "program": r2.readUint8()})
                                break;
                            case 0xD0: // channel aftertouch
                                addEvent({"time": time, "type": EVENT_CHANNEL_AFTERTOUCH, "channel": statusByte & 0x0F, "pressure": r2.readUint8()})
                                break;
                            case 0xE0: // Pitch Bend
                                // little-endian and 7-bits each, for some reason
                                const lsb = r2.readUint8();
                                const msb = r2.readUint8();
                                // combine and normalize with the zero value
                                const bend = ((msb << 7) | lsb) - 0x4000;
                                addEvent({"time": time, "type": EVENT_PITCH_BEND, "channel": statusByte & 0x0F, "value": bend})
                                break;

                            // meta/sysex events
                            case 0xF0:
                                switch (statusByte) {
                                    case 0xFF: // meta event
                                        // always comes with an event type, length of data, then data
                                        const eventType = r2.readUint8();
                                        const eventLength = r2.readVariableLengthInt();
                                        const eventData = r2.readBytes(eventLength);
                                        var r3 = new DataViewReader(eventData.buffer);

                                        switch (eventType) {
                                            case 0x00: // Sequence number
                                                addEvent({"time": time, "type": EVENT_META_SEQUENCE, "sequenceNumber": r3.readUint16()})
                                                break;
                                            case 0x01: // Text
                                                addEvent({"time": time, "type": EVENT_META_TEXT, "text": r3.readText(eventLength)})
                                                break;
                                            case 0x02: // Copyright
                                                addEvent({"time": time, "type": EVENT_META_COPYRIGHT, "text": r3.readText(eventLength)})
                                                break;
                                            case 0x03: // Track/Channel Name
                                                addEvent({"time": time, "type": EVENT_META_TRACK_NAME, "text": r3.readText(eventLength)})
                                                break;
                                            case 0x04: // Instrument Name
                                                addEvent({"time": time, "type": EVENT_META_INSTRUMENT_NAME, "text": r3.readText(eventLength)})
                                                break;
                                            case 0x05: // Lyric
                                                addEvent({"time": time, "type": EVENT_META_LYRIC, "text": r3.readText(eventLength)})
                                                break;
                                            case 0x06: // Marker
                                                addEvent({"time": time, "type": EVENT_META_MARKER, "text": r3.readText(eventLength)})
                                                break;
                                            case 0x07: // Cue Point
                                                addEvent({"time": time, "type": EVENT_META_CUE_POINT, "text": r3.readText(eventLength)})
                                                break;
                                            case 0x08: // Program Name
                                                addEvent({"time": time, "type": EVENT_META_PROGRAM_NAME, "text": r3.readText(eventLength)})
                                                break;
                                            case 0x20: // Midi Channel Prefix
                                                addEvent({"time": time, "type": EVENT_META_MIDI_CHANNEL_PREFIX, "channel": r3.readUint8()})
                                                break;
                                            case 0x21: // Midi Port
                                                addEvent({"time": time, "type": EVENT_META_MIDI_PORT, "port": r3.readUint8()})
                                                break;
                                            case 0x2F: // End of Track
                                                addEvent({"time": time, "type": EVENT_META_TRACK_END})
                                                break;
                                            case 0x51: // Tempo
                                                //FF 51 03 tt tt tt
                                                //
                                                //tt tt tt is a 24-bit value specifying the tempo as the number of microseconds per quarter note.
                                                const microsecondsPerQ = r3.readUint24();
                                                addEvent({"time": time, "type": EVENT_META_TEMPO, "microsecondsPerQ": microsecondsPerQ});
                                                break;
                                            case 0x54: // SMPTE offset, whatever that means
                                                //FF 54 05 hr mn se fr ff
                                                //
                                                //hr is a byte specifying the hour, which is also encoded with the SMPTE format (frame rate),
                                                //  just as it is in MIDI Time Code, i.e. 0rrhhhhh, where :
                                                //  rr = frame rate : 00 = 24 fps, 01 = 25 fps, 10 = 30 fps (drop frame), 11 = 30 fps (non-drop frame)
                                                //  hhhhh = hour (0-23)
                                                //mn se are 2 bytes specifying the minutes (0-59) and seconds (0-59), respectively.
                                                //fr is a byte specifying the number of frames (0-23/24/28/29, depending on the frame rate specified
                                                //  in the hr byte).
                                                //ff is a byte specifying the number of fractional frames, in 100ths of a frame (even in SMPTE-based
                                                //  tracks using a different frame subdivision, defined in the MThd chunk).
                                                const hrSpec = r3.readUint8();
                                                var rr;
                                                switch ((hrSpec && 0x60) >> 5) {
                                                    case 0: rr = 24; break;
                                                    case 1: rr = 25; break;
                                                    case 2: rr = 29; break;
                                                    case 3: rr = 30; break;
                                                }
                                                const hr = hrSpec && 0x1F;
                                                const mn = r3.readUint8();
                                                const se = r3.readUint8();
                                                const fr = r3.readUint8();
                                                const ffr = r3.readUint8();
                                                addEvent({"time": time, "type": EVENT_META_SMTPE_OFFSET, "frameRate": rr, "hour": hr, "minute": mn, "second": se, "frames": fr, "fractionalFrames": ffr})
                                                break;
                                            case 0x58: // time signature
                                                //FF 58 04 nn dd cc bb
                                                //
                                                //nn is a byte specifying the numerator of the time signature (as notated).
                                                //dd is a byte specifying the denominator of the time signature as a negative
                                                //  power of 2 (i.e. 2 represents a quarter-note, 3 represents an eighth-note, etc).
                                                //cc is a byte specifying the number of MIDI clocks between metronome clicks.
                                                //bb is a byte specifying the number of notated 32nd-notes in a MIDI quarter-note
                                                //  (24 MIDI Clocks). The usual value for this parameter is 8, though some sequencers
                                                //  allow the user to specify that what MIDI thinks of as a quarter note, should be notated as something else.
                                                addEvent({"time": time, "type": EVENT_META_TIME_SIGNATURE, "numerator": r3.readUint8(), "denominator": 1<<r3.readUint8(), "midiClocks": r3.readUint8(), "thirtySecondsInQuarterNote": r3.readUint8()})
                                                break;
                                            case 0x59: // key signature
                                                //FF 59 02 sf mi
                                                //
                                                //sf is a byte specifying the number of flats (-ve) or sharps (+ve) that identifies the key signature
                                                //  (-7 = 7 flats, -1 = 1 flat, 0 = key of C, 1 = 1 sharp, etc).
                                                //mi is a byte specifying a major (0) or minor (1) key.
                                                const accidentals = r3.readInt8();
                                                addEvent({"time": time, "type": EVENT_META_KEY_SIGNATURE, "sharps": (accidentals > 0 ? accidentals : 0), "flats": (accidentals < 0 ? -accidentals : 0), "minor": r3.readUint8() == 1})
                                                break;
                                            case 0x7F: // sequencer specific
                                                addEvent({"time": time, "type": EVENT_META_SEQUENCER_SPECIFIC, "data": byteArrayToHex(eventData)})
                                                break;
                                            default:
                                                console.log(`Ignored unknown meta event ${intToHex(statusByte)} ${intToHex(eventType)}`);
                                                break;
                                        }
                                        break;
                                    case 0xF0: // sysex messages, don't care
                                    case 0xF7:
                                        const sysexLength = r2.readVariableLengthInt();
                                        const sysexData = r2.readBytes(sysexLength);
                                        addEvent({"time": time, "type": "Sysex", "data": byteArrayToHex(sysexData)})
                                        break;
                                    case 0xFE: // active sensing, why am I seeing this crap?
                                        addEvent({"time": time, "type": "Active Sensing"})
                                        break;
                                    case 0xF8: // active sensing, why am I seeing this crap?
                                        addEvent({"time": time, "type": "Timing Clock"})
                                        break;
                                    default:
                                        addEvent({"Unknown Event": intToHex(statusByte)});
                                        break;
                                }
                        }
                    }

                    tracks.push(track);
                    logCallback(`Track ${tracks.length - 1}: ${track.length} events`);
                    break;
                default:
                    console.log(`Unknown chunk type: ${chunkType}, length: ${chunkLength}`);
                    break;
            }
        }

        return {"header": headerInfo, "tracks": tracks};
    }

    function buildMidiSong(midiInfo, logCallback) {
        const song = new MidiSong(midiInfo["header"]["quarterTicks"]);

        const midiType = midiInfo["header"]["type"];
        if (midiType != 0 && midiType != 1) {
            // who uses midi type 2?
            throw `Unsupported MIDI file type: ${midiType}`;
        }

        const tracks = midiInfo["tracks"];

        for (var t = 0; t < tracks.length; t++) {
            const track = tracks[t];
            var channelPrefix = null;
            // no current track if it's a midi type 0 file, or the first track of a midi type 1 file
            var currentMidiTrack = (midiType == 0 || t == 0) ? null : song.addTrack();

            const pendingNotes = new Map();

            function startNote(tick, channel, note, velocity) {
                const key = `${channel}:${note}`;
                if (pendingNotes.get(key)) {
                    // overlapping notes, this is technically not allowed
                    // end the previous note immediately
                    endNote(tick, channel, note);
                }
                pendingNotes.set(key, {"tick": tick, "velocity": velocity});
            }

            function endNote(tick, channel, note) {
                const key = `${channel}:${note}`;
                const n = pendingNotes.get(key);
                if (n) {
                    pendingNotes.delete(key);

                    const track = midiType == 0 ? song.getTrack(channel) : currentMidiTrack;
                    track.addNote(n["tick"], tick, channel, note, n["velocity"]);

                } else {
                    // ignore
                }
            }

            for (var e = 0; e < track.length; e++) {
                const event = track[e];
                const tick = event["time"];

                switch (event["type"]) {
                    case EVENT_META_MIDI_CHANNEL_PREFIX:
                        channelPrefix = event["channel"];
                        break;

                    case EVENT_META_TRACK_NAME:
                        if (midiType == 0) {
                            if (channelPrefix != null) {
                                song.getTrack(channelPrefix).name = event["text"];
                            } else {
                                song.name = event["text"];
                            }
                        } else if (t == 0) {
                            song.name = event["text"];

                        } else {
                            currentMidiTrack.name = event["text"];
                        }
                        break;

                    case EVENT_META_TIME_SIGNATURE:
                        song.addMeterChange(tick, event["numerator"], event["denominator"]);
                        break;

                    case EVENT_META_TEMPO:
                        song.addTempoChange(tick, event["microsecondsPerQ"]);
                        break;

                    case EVENT_ON:
                        if (event["velocity"] > 0) {
                            startNote(tick, event["channel"], event["note"], event["velocity"]);
                            break;
                        }
                    case EVENT_OFF:
                        endNote(tick, event["channel"], event["note"]);
                        break;

                    // ignore all other events
                }
            }

            if (currentMidiTrack) {
                logCallback(`Read track ${currentMidiTrack.name}, ${currentMidiTrack.notes.length} notes`);

            } else {
                logCallback(`Song name ${song.name}, ${song.meterChanges.length} meter changes, ${song.tempoChanges.length} tempo changes`);
            }

        }
        return song;
    }

    // Fuck's fucking fuck why is there no, just, basic-ass stream reader you can put on top of a byte array
    // and read data without having to worry about incrementing a pointer?
    class DataViewReader {
        constructor(arrayBuffer) {
            this.view = new DataView(arrayBuffer);
            this.index = 0;
            this.length = arrayBuffer.byteLength;
            this.markIndex = 0;
        }

        hasMore() {
            return this.index < this.length;
        }

        rewind(bytes) {
            if (this.index < bytes) {
                throw "Invalid rewind";
            }
            this.index -= bytes;
        }

        mark() {
            this.markIndex = this.index;
        }

        peekMore(num=1) {
            return this.index + num <= this.length;
        }

        checkMore(num=1) {
            if (this.index + num > this.length) {
                throw "End of Stream";
            }
        }

        readUint8() {
            this.checkMore(1);
            const v = this.view.getUint8(this.index);
            this.index++
            return v;
        }

        readInt8() {
            this.checkMore(1);
            const v = this.view.getInt8(this.index);
            this.index++
            return v;
        }

        readUint16(littleEndian=false) {
            this.checkMore(2);
            const v = this.view.getUint16(this.index, littleEndian);
            this.index += 2;
            return v;
        }

        readUint24(littleEndian=false) {
            const a = this.readUint8();
            const b = this.readUint8();
            const c = this.readUint8();

            if (littleEndian) {
                return (c << 16) | (b << 8) | a;
            } else {
                return (a << 16) | (b << 8) | c;
            }
        }

        readUint32(littleEndian=false) {
            this.checkMore(4);
            const v = this.view.getUint32(this.index, littleEndian);
            this.index += 4;
            return v;
        }

        readBytes(length) {
            const bytes = new Uint8Array(length);
            for (var i = 0; i < length; i++) {
                bytes[i] = this.readUint8();
            }
            return bytes;
        }

        readBytesSinceMark() {
            const length = this.index - this.markIndex;
            const bytes = new Uint8Array(length);
            for (var i = 0; i < length; i++) {
                bytes[i] = this.view.getUint8(this.markIndex + i);
            }
            return bytes;
        }

        readText(length) {
            const bytes = this.readBytes(length);
            const text = new TextDecoder("utf-8").decode(bytes);
            return text;
        }

        // specific to the MIDI standard
        readVariableLengthInt() {
            var val = 0;
            for (var i = 0; i < 4; i++) {
                var b = this.readUint8();
                val = (val << 7) | (b & 0x7F);
                if ((b & 0x80) == 0) break;
            }
            return val;
        }
    }

    function intToHex(int) {
        return int.toString(16).padStart(2, '0');
    }

    function byteArrayToHex(uint8array) {
        var s1 = uint8array.toHex();
        var s2 = "";
        for (var i = 0; i < s1.length; i += 2) {
            if (i > 0) s2 += " ";
            s2 += s1.substring(i, i+2);
        }
        return s2;
    }

    function showMidiInfo(element, midiInfo) {
        element.innerHTML = "";

        function appendTitle(text) {
            const div = document.createElement("div");
            div.innerHTML = `<h1>${text}</h1>`;
            element.appendChild(div);
        }

        function appendMap(json) {
            const div = document.createElement("div");
            var s = "";
            const keys = Object.keys(json).forEach(function(key) {
                if (s != "") s += ", ";
                s += `${key}: ${json[key]}`;
            });
            div.innerHTML = s;
            element.appendChild(div);
        }

        appendTitle("Header");
        appendMap(midiInfo["header"]);

        midiInfo["tracks"].forEach(function(track) {
            appendTitle("Track");
            track.forEach(appendMap);
        });
    }

//    function showMidiSong(element, song) {
//        element.innerHTML = "";
//
//        function appendTitle(text) {
//            const div = document.createElement("div");
//            div.innerHTML = `<h1>${text}</h1>`;
//            element.appendChild(div);
//        }
//
//        function appendText(text) {
//            const div = document.createElement("div");
//            div.innerHTML = text;
//            element.appendChild(div);
//        }
//
//        appendTitle(song.name);
//
//        for (var i = 0; i < song.tracks.length; i++) {
//            const track = song.tracks[i];
//            appendTitle(`Track ${i + 1}: ${track.name}`);
//            track.notes.forEach(function(note) {
//                appendText(`${note.time.toString()}: Chan ${note.channel}, Note: ${note.note}, Vel: ${note.velocity}, Duration: ${note.durationTicks}`);
//            });
//        }
//    }


    // Displays a message to the user
    function showMessage(message, type) {
        messageDisplay.innerHTML = message;
    }


    function searchForMidiTime(timeElements, tick) {
        // ganked from https://stackoverflow.com/questions/22697936/binary-search-in-javascript
        var m = 0;
        var n = timeElements.length - 1;

        while (m <= n) {
            var k = (n + m) >> 1;

            var cmp = tick - timeElements[k].time.tick;

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

    return {
        // readMidiFile(byteArray)
        //   byteArray: a byte array containing a midi file
        //   returns: a MidiSong object
        readMidiFile: readMidiFile,

        // searchForMidiTime(timeElements, tick):
        //   timeElements: an array of objects that contain a .time MidiTime property
        //   tick: the raw tick to search for
        //   returns: if there is an element in timeElements that has the exact time specified, then the index of that
        //            element.  Otherwise, the index in timeElements where another element with the given tick
        //            would be inserted, in two's complement.
        searchForMidiTime: searchForMidiTime,
    }
})();

