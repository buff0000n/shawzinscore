// wrapper lib for the generic audio lib
var ShawzinAudio = (function() {

    // base URL for sound files
    var baseUrl = "mp3-hifi/";
    // They're MP3's because that's the most widely supported compression format
    var soundFileExtension = ".mp3";
    // suffix for alternate note sound files
    var altFileSuffix = "-alt";

    // metronome sound back cache
    var metronomeSoundBank = null;

    // build mappings from sound name to mono groups
    var polyphonicGroups = {};
    var monophonicGroups = {};
    var duophonicGroups = {};

    for (var i = 0; i < Metadata.scaleNoteOrder.length; i++) {
        // no group for polyphonic notes
        // monophonic puts notes into a single group
        monophonicGroups[Metadata.scaleNoteOrder[i]] = 1;
        // duophonic puts notes into a single group
        duophonicGroups[Metadata.scaleNoteOrder[i]] = 1;
    }
    for (var i = 0; i < Metadata.scaleChordOrder.length; i++) {
        // polyphonic still puts chords into a group
        polyphonicGroups[Metadata.scaleChordOrder[i]] = 1;
        // monophonic puts chords into the same group as notes
        monophonicGroups[Metadata.scaleChordOrder[i]] = 1;
        // duophonic puts chords into a a separate group
        duophonicGroups[Metadata.scaleChordOrder[i]] = 2;
    }

    // easy mapping from the metadata constants
    var typeToMonoGroups = []
    typeToMonoGroups[Metadata.polyTypePolyphonic] = polyphonicGroups;
    typeToMonoGroups[Metadata.polyTypeMonophonic] = monophonicGroups;
    typeToMonoGroups[Metadata.polyTypeDuophonic] = duophonicGroups;

    function createSoundBank(shawzinName, scaleName) {
        // get the shawzin's metadata
        var shawzinMetadata = Metadata.shawzinList[shawzinName];

        // get scale's metadata
        var scaleMetadata = shawzinMetadata.scales[scaleName];

        // get the appropriate mono group maping
        var monoGroups = typeToMonoGroups[shawzinMetadata.config.type];

        // create a blank sound bank
        var soundBank = Audio.createSoundBank();
        // init its volume, the individual sounds are a little loud
        soundBank.setVolume(0.25);

        // get the mono fade time for all notes, if applicable
        var noteMonoFadeTime = shawzinMetadata.notes.monoFadeTime;

        // add the notes in order
        for (var name in scaleMetadata.notes) {
            // get the correct note pitch name for the scale note
            var note = scaleMetadata.notes[name];
            // build a base URL for the shawzin's sound for that pitch
            var noteUrlBase = baseUrl + shawzinName + "/note/" + note;
            // two options for a URL list
            var urlList = null;
            if (shawzinMetadata.notes.alts) {
                // if there are alts, then each note has two sounds
                urlList = [
                    noteUrlBase + soundFileExtension,
                    noteUrlBase + altFileSuffix + soundFileExtension
                ];
            } else {
                // otherwise, jsut one sound for the note
                urlList = [noteUrlBase + soundFileExtension];
            }
            // add the sound to the bank
            soundBank.addSound(name, urlList, monoGroups[name], noteMonoFadeTime);
        }

        if (scaleMetadata.chords) {
            // check for slap
            if (scaleMetadata.config.chordtype == Metadata.chordTypeSlap) {
                if (scaleMetadata.slap.notes) {
                    // custom slap scale because it's bugged
                    for (var chordName in scaleMetadata.slap.notes) {
                        // get the slap note pitch name
                        var note = scaleMetadata.slap.notes[chordName];
                        // build a base URL for the slap sound
                        var noteUrlBase = baseUrl + shawzinName + "/slap/" + note;
                        // no alts for slap, just one sound in the list
                        var urlList = [noteUrlBase + soundFileExtension];
                        // add the sound to the bank
                        soundBank.addSound(chordName, urlList, monoGroups[name], noteMonoFadeTime);
                    }
                } else {
                    // go back over the scale notes in order
                    for (var i in Metadata.scaleNoteOrder) {
                        var name = Metadata.scaleNoteOrder[i];
                        // get the corresponding chord name
                        var chordName = Metadata.scaleChordOrder[i];
                        // get the scale note pitch name
                        var note = scaleMetadata.notes[name];
                        // build a base URL for the slap sound
                        var noteUrlBase = baseUrl + shawzinName + "/slap/" + note;
                        // no alts for slap, just one sound in the list
                        var urlList = [noteUrlBase + soundFileExtension];
                        // add the sound to the bank
                        soundBank.addSound(chordName, urlList, monoGroups[name], noteMonoFadeTime);
                    }
                }
            } else {
                // go over the chord notes in order
                for (var i in Metadata.scaleChordOrder) {
                    var chordName = Metadata.scaleChordOrder[i];
                    // build a base URL for the chord sound
                    var chordUrlBase = baseUrl + shawzinName + "/chord/" + scaleName + "/" + chordName;
                    // no alts, just a single sound
                    var urlList = [chordUrlBase + soundFileExtension];
                    // pull the mono fade time on a per-chord basis
                    var monoFadeTime = scaleMetadata.chords[chordName].monoFadeTime;
                    // add the sound to the bank
                    soundBank.addSound(chordName, urlList, monoGroups[chordName], monoFadeTime);
                }
            }
        }

        // mix in a function for altering pitches for the specific key signature
        soundBank.setKeySig = function(keySig) {
            // get the pitch offset in half tones
            var pitchOffset = Piano.getPitchOffset(keySig);
            // convert to a playback speed multiplier
            var rate = 2 ** (pitchOffset / 12);
            // apply the multiplier to the sound bank's playback rate
            this.setRate(rate);
        }

        // all done
        return soundBank;
    }

    // basic cache for sound banks
    var SoundBankCache = (function() {
        // map from name to SoundBank
        var cache = {};

        function getSoundBank(shawzinName, scaleName) {
            // build a key from the shawzin and scale names
            var name = shawzinName + ":" + scaleName;
            // check the cache
            if (!cache[name]) {
                // cache miss, create the sound bank from scratch
                var soundBank = createSoundBank(shawzinName, scaleName);
                // cache it
                cache[name] = soundBank;
            }
            return cache[name];
        }

        // public members
        return {
            getSoundBank: getSoundBank // (shawzinName, scaleName)
        };
    }());

    function getMetronomeSoundBank() {
        // lazily load
        if (metronomeSoundBank == null) {
            var metronomeSoundBank = Audio.createSoundBank();
            // init its volume, the individual sounds are pretty loud
            metronomeSoundBank.setVolume(0.15);
            // metronome sounds
            metronomeSoundBank.addSound("bar", [baseUrl + "misc/bar.mp3"], 1, 0.1);
            metronomeSoundBank.addSound("beat", [baseUrl + "misc/beat.mp3"], 1, 0.1);
        }
        return metronomeSoundBank;
    }

    function scaleTest(time, shawz, scale, next=null) {
        // get the sound bank for the given shawzin and scale
        var sb = ShawzinAudio.getSoundBank(shawz, scale);

        // initialiez the bank and run a callback
        sb.checkInit(() => {
            // initialize the start time if it hasn't been
            if (time == null) {
                ShawzinAudio.setTimeOffset();
                time = 0;
            }
            // loop over and play every single note, a quarter second per note
            for (var i = 0; i < Metadata.scaleNoteOrder.length; i++) {
                sb.play(Metadata.scaleNoteOrder[i], time);
                time += 0.25;
            }
            // loop over and play every chord note, a quarter second per note
            for (var i = 0; i < Metadata.scaleChordOrder.length; i++) {
                sb.play(Metadata.scaleChordOrder[i], time);
                time += 0.25;
            }
            // call the callback if there is one, giving it the current end time as the next start time
            // this allows us to schedule each scale one after the other
            if (next) next(time);
        });
    }

    function shawzTest(shawz) {
        // scale counter
        var j = 0;
        // define a function to run the test for a single scale starting at a particular time, or null to initialize the time
        var thing = (time) => {
            // check if we're not at the end of the scales
            if (j < Metadata.scaleOrder.length) {
                // get the scale
                scale = Metadata.scaleOrder[j];
                // increase the counter
                j++;
                // run the scale test, using this function as the callback to run the next scale
                scaleTest(time, shawz, scale, thing);
            }
        };
        // start off with no start time so it gets initialized
        thing(null);
    }

    // public members
    return  {
        // get a sound back for the given shawzin and scale combination
        getSoundBank: function(shawzinName, scaleName) {
            // go to the cache
            return SoundBankCache.getSoundBank(shawzinName, scaleName);
        },
        // get the metronome sound bank
        getMetronomeSoundBank: getMetronomeSoundBank, // ()
        // initizize the time offset for scheduling sounds
        setTimeOffset: Audio.setTimeOffset, // (offset=0)

        // run a sound test for every scale on the given shawzin, just for testing
        shawzTest: shawzTest, // (shawz)
    };
})();


