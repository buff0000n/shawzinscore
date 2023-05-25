var Model = (function() {

    var shawzin = null;
    var song = null;
    var songCode = null;
    var songName = null;
    var controlScheme = null;

    var meter = null;
    var meterArray = null;
    var tempo = null;
    var leadin = null;
    var leadinTicks = null;
    var unitsPerLine = null;

    var updateDelay = 1000;
    var scheduledUpdate = null;

    function init(url) {
        // gotta do this before filling in the track
        doSetControlScheme(Settings.getControlScheme());

        var shawzin = PageUtils.getQueryParam("s");
        var songName = PageUtils.getQueryParam("n");
        var songCode = PageUtils.getQueryParam("c");
        var songTempo = PageUtils.getQueryParam("t");
        var songMeter = PageUtils.getQueryParam("m");
        var songLeadin = PageUtils.getQueryParam("l");
        var tabUnitsPerLine = PageUtils.getQueryParam("u");

        if (!shawzin) shawzin = Metadata.shawzinOrder[0];
        doSetShawzin(shawzin);

        doSetSongName(songName); // can be null

        var songTempoInt = (songTempo && songTempo != "") ? MiscUtils.parseInt(songTempo) : null;
        doSetStructure(songMeter, songTempoInt, songLeadin);

        doSetUnitsPerLine(tabUnitsPerLine); // can be null

        // todo: compressed format?
        if (songCode) {
            var newSong = new Song();
            newSong.fromString(songCode);
            doSetSong(newSong);
            doUpdateSongCode();
        } else {
            var newSong = new Song();
            newSong.setScale(Metadata.scaleOrder[0]);
            doSetSong(newSong);
        }
    }

    function scheduleUpdate() {
        if (scheduledUpdate) {
            clearTimeout(scheduledUpdate);
        }
        scheduledUpdate = setTimeout(() => {
            doUpdate();
            scheduledUpdate = null;
        }, updateDelay);
        songCode = null;
    }

    function doUpdateSongCode() {
        var songCode = doGetSongCode();
        Controls.updateSongCode(songCode);
        return songCode;
    }

    function getQueryParamMap() {
        var songCode = doUpdateSongCode();
        return {
            "n": songName,
            "s": shawzin,
            "m": meter,
            "t": tempo,
            "l": leadin,
            "u": unitsPerLine,
            // todo: compressed format?
            // any of the usual compression formats are going to have to be base64 encoded anyway,
            // saving us very little at best over the default base64-esque format
            "c": songCode
        };
    }

    function doUpdate() {
        PageUtils.setQueryParamMap(getQueryParamMap());
    }

    function buildUrl() {
        return PageUtils.buildQueryUrlWithMap(getQueryParamMap());
    }

    function doSetShawzin(name) {
        shawzin = name;

        var image = document.getElementById("toolbar-shawzin-img");
        PageUtils.setImgSrc(image, `shawzin-${name}-large.png`);

        var text = document.getElementById("select-shawzin-text");
        text.innerHTML = Metadata.shawzinList[shawzin].config.name;

        Track.updateShawzin();
        Playback.updateShawzin();
    }

    function getScale() {
        return song ? song.getScale() : null;
    }

    function updateScale() {
        var text = document.getElementById("select-scale-text");
        var scale = song.getScale();
        text.innerHTML = Metadata.shawzinList[shawzin].scales[scale].config.name;

        Track.updateScale();
        TrackBar.updateScale();
        Playback.updateScale();
    }

    function doSetScale(name) {
        song.setScale(name);
        updateScale();
    }
    
    function getControlScheme() {
        return controlScheme;
    }

    function doSetControlScheme(newControlScheme) {
        controlScheme = newControlScheme;

        var text = document.getElementById("select-control-scheme-text");
        text.innerHTML = `
            <img src="img/${controlScheme.img}" srcset="img2x/${controlScheme.img} 2x" class="icon"/>
            ${controlScheme.name}
        `;
        for (i = 1; i <= 3; i++) {
            var img = document.getElementById("tab-note-fret-" + i);
            PageUtils.setImgSrc(img, controlScheme.frets["" + i].imgBase + "_w.png");
        }
        for (i = 1; i <= 3; i++) {
            var img = document.getElementById("tab-note-string-" + i);
            PageUtils.setImgSrc(img, controlScheme.strings["" + i].imgBase + "_w.png");
        }

        Settings.setControlScheme(controlScheme);
        Track.updateControlScheme();
    }

    function doSetSongName(name) {
        if (name && name.length == 0) name = null;
        songName = name;
        var text = document.getElementById("metadata-settings-title-text");
        text.value = name;
    }

    function doGetSongCode() {
        if (!songCode) {
            songCode = song ? song.toString() : "";
        }
        return songCode;
    }

    function doSetSong(newSong, newSongCode=null) {
        if (tempo != null) {
            setLeadInTicksOnSong(newSong);
        }

        // update playback first so it stops any playback in progress
        Playback.setSong(newSong);

        song = newSong;
        songCode = newSongCode;
        updateScale();

        Track.setSong(song);
    }

    // easiest to just handle threse three parameters all at the same time
    function doSetStructure(newMeter, newTempo, newLeadin) {
        if (newMeter == meter && newTempo == tempo && newLeadin == leadin) return;

        // standardize non-values
        if (newMeter == "") newMeter = null;
        if (newTempo == 0) newTempo = null;
        if (newLeadin == "") newLeadin = null;
        // just parse tempo, it's simple

        // if we're transition from no structure to some structure, fill in any missing values with defaults
        if (!meter && (newMeter || newTempo || newLeadin)) {
            if (!newMeter) newMeter = MetadataUI.defaultMeter;
            if (!newTempo) newTempo = MetadataUI.detaultTempo;
            // if leadin is null then it can stay null

        // if we're transition from having structure no structure, clear everything out
        } else if (meter && (!newMeter || !newTempo)) {
            newMeter = null;
            newTempo = null;
            newLeadin = null;
        }

        if (!newMeter) {
            // clear everything
            meter = null;
            meterArray = null;
            tempo = null;
            leadin = null;
            leadinTicks = null;

        } else {
            // parse meter
            var newMeterStringArray = newMeter.split("/");
            if (newMeterStringArray.length != 2) {
                throw "Invalid meter format: '" + newMeter + "'";
            }
            var newMeterArray = [MiscUtils.parseInt(newMeterStringArray[0]), MiscUtils.parseInt(newMeterStringArray[1])];

            // parse leadin and convert from beats to ticks
            var newLeadInTicks;
            if (!newLeadin || newLeadin == "") {
                newLeadin = null;
                newLeadInTicks = 0;

            } else {
                var newLeadinParts = newLeadin.split(".");
                if (newLeadinParts.length > 2) {
                    throw "Invalid number format: '" + newLeadin + "'";
                }
                var newLeadinBeats = MiscUtils.parseInt(newLeadinParts[0]);
                while (newLeadinBeats > newMeterArray[0]) {
                    newLeadinBeats -= newMeterArray[0];
                }
                var newLeadinFloat = newLeadinBeats;
                if (newLeadinParts.length == 2) {
                   newLeadinFloat += MiscUtils.parseFloat("0." + newLeadinParts[1]);
                }
                newLeadInTicks = Math.round(newLeadinFloat * ((Metadata.ticksPerSecond * 60) / newTempo));
            }

            // after all the parsing/checking is done, save the values
            meter = newMeter;
            meterArray = newMeterArray;
            tempo = newTempo;
            leadin = newLeadin;
            leadinTicks = newLeadInTicks;
        }

        // update UI controls
        var meterInput = document.getElementById("config-meter-input");
        meterInput.value = meter ? meter : "";

        var tempoInput = document.getElementById("config-tempo-input");
        tempoInput.value = tempo ? tempo : "";

        var leadinInput = document.getElementById("config-leadin-input");
        leadinInput.value = leadin ? leadin : "";

        // apply the leadin to the song
        setLeadInTicksOnSong(song);

        // update the Track
        Track.updateStructure();
    }

    function setLeadInTicksOnSong(song) {
        if (!song) return;
        
        if (leadinTicks && tempo && meterArray) {
            var beatsPerMeasure = meterArray[0];
            var ticksPerMeasure = (60.0 / tempo) * Metadata.ticksPerSecond * beatsPerMeasure;
            if (leadinTicks < ticksPerMeasure / 2) {
                song.setLeadInTicks(-leadinTicks);
            } else {
                song.setLeadInTicks(ticksPerMeasure - leadinTicks);
            }
        } else {
            song.setLeadInTicks(0);
        }
    }

    function setStructure(newMeter, newTempo, newLeadin) {
        var currentMeter = meter;
        var currentTempo = tempo;
        var currentLeadin = leadin;
        if (newMeter != currentMeter || newTempo != currentTempo || newLeadin != currentLeadin) {
            Undo.doAction(
                () => { doSetStructure(newMeter, newTempo, newLeadin); scheduleUpdate(); },
                () => { doSetStructure(currentMeter, currentTempo, currentLeadin); scheduleUpdate(); },
                "Set Struture"
            );
        }
    }

    function doSetUnitsPerLine(newUnitsPerLine) {
        if (newUnitsPerLine == unitsPerLine) return;
        newUnitsPerLine = (newUnitsPerLine != null && newUnitsPerLine > 0) ? newUnitsPerLine : MetadataUI.defaultUnitsPerLine;

        var unitsInput = document.getElementById("config-line-units-input");
        unitsInput.value = newUnitsPerLine;

        unitsPerLine = newUnitsPerLine;
    }

   // public members
    return  {
        init: init,

        getShawzin: function() { return shawzin; },
        setShawzin: function(newShawzin) {
            var current = shawzin;
            if (newShawzin != current) {
                Undo.doAction(
                    () => { doSetShawzin(newShawzin); scheduleUpdate(); },
                    () => { doSetShawzin(current); scheduleUpdate(); },
                    "Set Shawzin"
                );
            }
        },

        getScale: getScale,
        setScale: function(newScale) {
            var current = getScale();
            if (newScale != current) {
                Undo.doAction(
                    () => { doSetScale(newScale); scheduleUpdate(); },
                    () => { doSetScale(current); scheduleUpdate(); },
                    "Set Scale"
                );
            }
        },

        getControlScheme: getControlScheme,
        setControlScheme: function(newControlScheme) {
            var current = getControlScheme();
            if (newControlScheme != current) {
                Undo.doAction(
                    () => { doSetControlScheme(newControlScheme); scheduleUpdate(); },
                    () => { doSetControlScheme(current); scheduleUpdate(); },
                    "Set Control Scheme"
                );
            }
        },

        getSongName: function() { return songName; },
        setSongName: function(newName) {
            var current = songName;
            if (newName != current) {
                Undo.doAction(
                    () => { doSetSongName(newName); scheduleUpdate(); },
                    () => { doSetSongName(current); scheduleUpdate(); },
                    "Set Song Name"
                );
            }
        },

        getMeter: function() { return meter; },
        getMeterTop: function() { return meterArray ? meterArray[0] : null; },
        getMeterBottom: function() { return meterArray ? meterArray[1] : null; },
        setMeter: function(newMeter) { setStructure(newMeter, tempo, leadin); },
        getTempo: function() { return tempo; },
        setTempo: function(newTempo) { setStructure(meter, newTempo, leadin); },
        getLeadin: function() { return leadin; },
        setLeadin: function(newLeadin) { setStructure(meter, tempo, newLeadin); },
        setStructure: setStructure,

        getUnitsPerLine: function() { return unitsPerLine; },
        // no undo
        setUnitsPerLine: function(newUnitsPerLine) { doSetUnitsPerLine(newUnitsPerLine); scheduleUpdate(); },

        getSong: function() { return song; },
        getSongCode: doGetSongCode,
        setSongCode: function(newCode) {
            if (!newCode || newCode.length == 0) {
                newCode = "1";
            }
            // create a new Song and parse the code first thing
            var newSong = new Song();
            newSong.fromString(newCode);

            // store the old song and code
            var currentSong = song;
            var currentCode = doGetSongCode();

            // check for change
            if (newCode != currentCode) {
                Undo.doAction(
                    // set the song object directly, to preserve and references in the undo/redo lists.
                    () => { doSetSong(newSong, newCode); scheduleUpdate(); },
                    () => { doSetSong(currentSong, currentCode); scheduleUpdate(); },
                    "Set Song Code"
                );
            }
        },
        buildUrl: buildUrl,

        stupidPlay: function() {
            // let's just hear something I don't care how dumb this is
            var sb = ShawzinAudio.getSoundBank(shawzin, getScale());
            sb.checkInit(() => {
                ShawzinAudio.setTimeOffset();
                for (var n = 0; n < song.notes.length; n++) {
                    var note = song.notes[n];
                    var noteName = note.toNoteName();
                    var time = note.tick / 16;
                    sb.play(noteName, time);
                }
            });
            return sb;
        },
    };
})();


