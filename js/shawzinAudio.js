var ShawzinAudio = (function() {

    var baseUrl = "mp3-hifi/";

    var monophonicGroup1 = Array();
    var duophonicGroup1 = Array();
    var duophonicGroup2 = Array();
    for (var i = 0; i < Metadata.scaleNoteOrder.length; i++) {
        monophonicGroup1.push(Metadata.scaleNoteOrder[i]);
        duophonicGroup1.push(Metadata.scaleNoteOrder[i]);
    }
    for (var i = 0; i < Metadata.scaleChordOrder.length; i++) {
        monophonicGroup1.push(Metadata.scaleChordOrder[i]);
        duophonicGroup2.push(Metadata.scaleChordOrder[i]);
    }

    var typeToMonoGroups = {
        "polyphonic": null,
        "monophonic": [monophonicGroup1],
        "duophonic": [duophonicGroup1, duophonicGroup2]
    };

    function createSoundBank(shawzinName, scaleName) {
        var shawzinMetadata = Metadata.shawzinList[shawzinName];
        var scaleMetadata = shawzinMetadata.scales[scaleName];

        var monoGroups = typeToMonoGroups[shawzinMetadata.config.type];

        var nameToUrlList = {};

        for (var i in Metadata.scaleNoteOrder) {
            var name = Metadata.scaleNoteOrder[i];
            var note = scaleMetadata.notes[name];
            var noteUrlBase = baseUrl + shawzinName + "/note/" + note;
            if (shawzinMetadata.notes.alts) {
                nameToUrlList[name] = [
                    noteUrlBase + ".mp3",
                    noteUrlBase + "-alt.mp3"
                ];
            } else {
                nameToUrlList[name] = [noteUrlBase + ".mp3"];
            }
        }

        if (shawzinMetadata.config.slap) {
            for (var i in Metadata.scaleNoteOrder) {
                var name = Metadata.scaleNoteOrder[i];
                var chordName = Metadata.scaleChordOrder[i];
                var note = scaleMetadata.notes[name];
                var noteUrlBase = baseUrl + shawzinName + "/slap/" + note;
                nameToUrlList[chordName] = [noteUrlBase + ".mp3"];
            }
        } else {
            for (var i in Metadata.scaleChordOrder) {
                var chordName = Metadata.scaleChordOrder[i];
                var chordUrlBase = baseUrl + shawzinName + "/chord/" + scaleName + "/" + chordName;
                nameToUrlList[chordName] = [chordUrlBase + ".mp3"];
            }
        }

        var soundBank = Audio.createSoundBank(nameToUrlList, monoGroups);
        soundBank.setVolume(0.25);
        return soundBank;
    }

    var SoundBankCache = (function() {
        // map from name to SoundBank
        var cache = {};

        function getSoundBank(shawzinName, scaleName) {
            var name = shawzinName + ":" + scaleName;
            if (!cache[name]) {
                var soundBank = createSoundBank(shawzinName, scaleName);
                cache[name] = soundBank;
            }
            return cache[name];
        }

        return {
            getSoundBank: getSoundBank
        };
    }());



    return  {
        getSoundBank: function(shawzinName, scaleName) {
            return SoundBankCache.getSoundBank(shawzinName, scaleName);
        }
    };
})();


