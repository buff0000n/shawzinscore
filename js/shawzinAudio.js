var ShawzinAudio = (function() {

    // base URL for sound files
    var baseUrl = "mp3-hifi/";
    // They're MP3's because that's the most widely supported compression format
    var soundFileExtension = ".mp3";
    // suffix for alternate note sound files
    var altFileSuffix = "-alt";

    // build mappings from sound name to mono groups
    var monophonicGroups = {};
    var duophonicGroups = {};

    for (var i = 0; i < Metadata.scaleNoteOrder.length; i++) {
        // monophonic puts notes into a single group
        monophonicGroups[Metadata.scaleNoteOrder[i]] = 1;
        // duophonic puts notes into a single group
        duophonicGroups[Metadata.scaleNoteOrder[i]] = 1;
    }
    for (var i = 0; i < Metadata.scaleChordOrder.length; i++) {
        // monophonic puts chords into the same group as notes
        monophonicGroups[Metadata.scaleChordOrder[i]] = 1;
        // duophonic puts chordsinto a a separate group
        duophonicGroups[Metadata.scaleChordOrder[i]] = 2;
    }

    // easy mapping from the metadata constants
    var typeToMonoGroups = {
        "polyphonic": {},
        "monophonic": monophonicGroups,
        "duophonic": duophonicGroups
    };

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
        for (var i in Metadata.scaleNoteOrder) {
            var name = Metadata.scaleNoteOrder[i];
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

        // check for slap
        if (shawzinMetadata.config.slap) {
            // for slap, go back over the scale notes in order
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
                soundBank.addSound(name, urlList, monoGroups[name], noteMonoFadeTime);
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
            getSoundBank: getSoundBank
        };
    }());



    // public members
    return  {
        getSoundBank: function(shawzinName, scaleName) {
            return SoundBankCache.getSoundBank(shawzinName, scaleName);
        },
        setTimeOffset: Audio.setTimeOffset,
    };
})();


