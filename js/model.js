var Model = (function() {

    // major properties
    // selected shawzin
    var shawzin = null;
    // song object
    var song = null;
    // cached code for the song object
    var songCode = null;
    // title
    var songName = null;
    // control scheme, filled in from preferences but more convenient to have in the model
    var controlScheme = null;

    // structure properties
    // meter string
    var meter = null;
    // parsed top and bottom meter numbers
    var meterArray = null;
    // tempo as an int
    var tempo = null;
    // lead-in string
    var leadin = null;
    // lead in ticks, as calculated from the lead-in string and the tempo
    var leadinTicks = null;
    // either measures per line or seconds per line for shawzin tab, depending on whether a structure is defined
    // this depends on the song, so it's saved as part of the model
    var unitsPerLine = null;

    // delay before updating the song code and the URL
    var updateDelay = 1000;
    // setTimeout() future for the update, in case we need to cancel and reschedule
    var scheduledUpdate = null;

    function init(url) {
        // gotta do this before filling in the track
        // control scheme comes from preferences and isn't tied to the song data
        doSetControlScheme(Settings.getControlScheme());

        // load settings from the URL query parameters
        var shawzin = PageUtils.getQueryParam("s");
        var songName = PageUtils.getQueryParam("n");
        var songCode = PageUtils.getQueryParam("c");
        var songTempo = PageUtils.getQueryParam("t");
        var songMeter = PageUtils.getQueryParam("m");
        var songLeadin = PageUtils.getQueryParam("l");
        var tabUnitsPerLine = PageUtils.getQueryParam("u");

        // default shawzin
        if (!shawzin) shawzin = Metadata.shawzinOrder[0];
        // set the shawzin
        doSetShawzin(shawzin);

        // set the title
        doSetSongName(songName); // can be null

        // parse the tempo if present
        var songTempoInt = (songTempo && songTempo != "") ? MiscUtils.parseInt(songTempo) : null;
        // set the structure (meter, tempo, and lead-in)
        doSetStructure(songMeter, songTempoInt, songLeadin);

        // set the measures/seconds per line for shawzin tab
        doSetUnitsPerLine(tabUnitsPerLine); // can be null

        // check for a song code
        if (songCode) {
            // parse the sond code
            var newSong = new Song();
            newSong.fromString(songCode);
            // set the song object
            doSetSong(newSong);
            // update the UI with the song code
            // todo: rework this?
            doUpdateSongCode();
        } else {
            // create a new blank song
            var newSong = new Song();
            // default to the first scale in the list
            newSong.setScale(Metadata.scaleOrder[0]);
            // set the song object
            doSetSong(newSong);
        }
    }

    function scheduleUpdate() {
        // cancel any currently pending update
        if (scheduledUpdate) {
            clearTimeout(scheduledUpdate);
        }
        // schedule an update
        scheduledUpdate = setTimeout(() => {
            // update the URL, also takes care of updating the song code text box
            doUpdate();
            // clear the callback
            scheduledUpdate = null;
        }, updateDelay);
        // force it to update the song code, otherwise it will just use the cached value
        songCode = null;
    }

    function doUpdateSongCode() {
        // get or re-generate the song code
        var songCode = doGetSongCode();
        // update the UI
        Controls.updateSongCode(songCode);
        // return it for convenience
        return songCode;
    }

    function getQueryParamMap() {
        // get or re-generate the song code, also updating it in the UI
        var songCode = doUpdateSongCode();
        // build an ordered parameter map, putting the song code last
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
        // get or re-generate the song code, update it in the UI, build a parameter map, and update the URL
        PageUtils.setQueryParamMap(getQueryParamMap());
    }

    function buildUrl() {
        // generate an up-to-date paramter map and use it to build a modified version of the current URL
        return PageUtils.buildQueryUrlWithMap(getQueryParamMap());
    }

    function doSetShawzin(name) {
        // set it
        shawzin = name;

        // update the big image
        var image = document.getElementById("toolbar-shawzin-img");
        PageUtils.setImgSrc(image, `shawzin-${name}-large.png`);

        // update the text name
        var text = document.getElementById("select-shawzin-text");
        text.innerHTML = Metadata.shawzinList[shawzin].config.name;

        // propagate the update to the track and the player
        Track.updateShawzin();
        Playback.updateShawzin();
    }

    function getScale() {
        // pull the scale from the song object
        return song ? song.getScale() : null;
    }

    function updateScale() {
        // pull the scale from the song object
        // todo: null check?
        var scale = song.getScale();
        // update the UI
        var text = document.getElementById("select-scale-text");
        text.innerHTML = Metadata.shawzinList[shawzin].scales[scale].config.name;

        // propagate the scale change to the track, rack bar, and player
        Track.updateScale();
        TrackBar.updateScale();
        Playback.updateScale();
    }

    function doSetScale(name) {
        // update the scale in the song
        // todo: null check?
        song.setScale(name);
        // update the UI and other libs
        updateScale();
    }
    
    function getControlScheme() {
        // get it
        return controlScheme;
    }

    function doSetControlScheme(newControlScheme) {
        // set it
        controlScheme = newControlScheme;

        // update the UI
        // text description, along with an icon
        var text = document.getElementById("select-control-scheme-text");
        text.innerHTML = `
            <img src="img/${controlScheme.img}" srcset="img2x/${controlScheme.img} 2x" class="icon"/>
            ${controlScheme.name}
        `;

        // propagate to preferences
        Settings.setControlScheme(controlScheme);
        // propagate to the trackbar
        TrackBar.updateControlScheme();
        // propagate to the track
        Track.updateControlScheme();
    }

    function doSetSongName(name) {
        // replace blank string with null
        if (name && name.length == 0) name = null;
        // set it
        songName = name;
        // update the UI
        var text = document.getElementById("metadata-settings-title-text");
        text.value = name;
    }

    function doGetSongCode() {
        // check if don't have one cached
        if (!songCode) {
            // get the song code from the song object, or use a default
            songCode = song ? song.toString() : "";
        }
        return songCode;
    }

    function doSetSong(newSong, newSongCode=null) {
        // if we have structure, then apply the current lead-in
        if (tempo != null) {
            setLeadInTicksOnSong(newSong);
        }

        // update playback first so it stops any playback in progress
        Playback.setSong(newSong);

        // save the song and code
        song = newSong;
        songCode = newSongCode;
        // the scale is part of the song
        updateScale();

        // update the track
        Track.setSong(song);
    }

    // easiest to just handle threse three parameters all at the same time
    function doSetStructure(newMeter, newTempo, newLeadin) {
        // check for a change
        if (newMeter == meter && newTempo == tempo && newLeadin == leadin) return;

        // standardize non-values
        if (newMeter == "") newMeter = null;
        if (newTempo == 0) newTempo = null;
        if (newLeadin == "") newLeadin = null;

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
            // parse meter, throw an error if there's any format issues
            var newMeterStringArray = newMeter.split("/");
            if (newMeterStringArray.length != 2) {
                throw "Invalid meter format: '" + newMeter + "'";
            }
            var newMeterArray = [MiscUtils.parseInt(newMeterStringArray[0]), MiscUtils.parseInt(newMeterStringArray[1])];

            // parse lead-in and convert from beats to ticks
            var newLeadInTicks;
            if (!newLeadin || newLeadin == "") {
                // no lead-in, so zero lead-in ticks
                newLeadin = null;
                newLeadInTicks = 0;

            } else {
                // parse as a float
                var newLeadinFloat = MiscUtils.parseFloat(newLeadin);
                // lead-in beats needs to be less than one measure's worth of beats
                while (newLeadinFloat > newMeterArray[0]) {
                    newLeadinFloat -= newMeterArray[0];
                }
                // calculate the lead-in ticks based on the tempo
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
        // sanity check
        if (!song) return;

        // check if there's structure
        if (leadinTicks && tempo && meterArray) {
            // calculate the ticks per measure
            var beatsPerMeasure = meterArray[0];
            var ticksPerMeasure = (60.0 / tempo) * Metadata.ticksPerSecond * beatsPerMeasure;
            // if the lead-in ticks are less than half a measure, then make lead-in negative,
            // so those notes occur before measure 1
            if (leadinTicks < ticksPerMeasure / 2) {
                song.setLeadInTicks(-leadinTicks);
            // otherwise, measure 1 is lead-in to measure 2
            } else {
                song.setLeadInTicks(ticksPerMeasure - leadinTicks);
            }
        } else {
            // no structure, so no lead-in
            song.setLeadInTicks(0);
        }
    }

    function setStructure(newMeter, newTempo, newLeadin) {
        // save the current values to this function closure
        var currentMeter = meter;
        var currentTempo = tempo;
        var currentLeadin = leadin;
        // check for any value change
        if (newMeter != currentMeter || newTempo != currentTempo || newLeadin != currentLeadin) {
            // build do and undo actions, execute the do action and put it on the undo stack
            Undo.doAction(
                () => { doSetStructure(newMeter, newTempo, newLeadin); scheduleUpdate(); },
                () => { doSetStructure(currentMeter, currentTempo, currentLeadin); scheduleUpdate(); },
                "Set Structure"
            );
        }
    }

    function doSetUnitsPerLine(newUnitsPerLine) {
        // check for change
        if (newUnitsPerLine == unitsPerLine) return;
        // apply default value if it's blank or 0
        newUnitsPerLine = (newUnitsPerLine != null && newUnitsPerLine > 0) ? newUnitsPerLine : MetadataUI.defaultUnitsPerLine;

        // update the UI
        var unitsInput = document.getElementById("config-line-units-input");
        unitsInput.value = newUnitsPerLine;

        // set value
        unitsPerLine = newUnitsPerLine;
    }

   // public members
    return  {
        // initialize from the page URL
        init: init, // (url)

        // shawzin getter/setter
        getShawzin: function() { return shawzin; }, // ()
        setShawzin: function(newShawzin) {
            // save current value
            var current = shawzin;
            // check for change
            if (newShawzin != current) {
                // build do and undo actions and run through the undo system
                Undo.doAction(
                    () => { doSetShawzin(newShawzin); scheduleUpdate(); },
                    () => { doSetShawzin(current); scheduleUpdate(); },
                    "Set Shawzin"
                );
            }
        },

        // scale getter/setter
        getScale: getScale, // ()
        setScale: function(newScale) {
            // save current value
            var current = getScale();
            // check for change
            if (newScale != current) {
                // build do and undo actions and run through the undo system
                Undo.doAction(
                    () => { doSetScale(newScale); scheduleUpdate(); },
                    () => { doSetScale(current); scheduleUpdate(); },
                    "Set Scale"
                );
            }
        },

        // control scheme getter/setter
        getControlScheme: getControlScheme,
        setControlScheme: function(newControlScheme) {
            // save current value
            var current = getControlScheme();
            // check for change
            if (newControlScheme != current) {
                // build do and undo actions and run through the undo system
                Undo.doAction(
                    () => { doSetControlScheme(newControlScheme); scheduleUpdate(); },
                    () => { doSetControlScheme(current); scheduleUpdate(); },
                    "Set Control Scheme"
                );
            }
        },

        // title getter/setter
        getSongName: function() { return songName; },
        setSongName: function(newName) {
            // save current value
            var current = songName;
            // check for change
            if (newName != current) {
                // build do and undo actions and run through the undo system
                Undo.doAction(
                    () => { doSetSongName(newName); scheduleUpdate(); },
                    () => { doSetSongName(current); scheduleUpdate(); },
                    "Set Song Name"
                );
            }
        },

        // structure getters/setters
        // meter
        getMeter: function() { return meter; },
        // convenience getters for the two parts of the the meter
        getMeterTop: function() { return meterArray ? meterArray[0] : null; },
        getMeterBottom: function() { return meterArray ? meterArray[1] : null; },
        // setter pulls in the other two values because they're all tied together
        setMeter: function(newMeter) { setStructure(newMeter, tempo, leadin); },
        // tempo
        getTempo: function() { return tempo; },
        // setter pulls in the other two values because they're all tied together
        setTempo: function(newTempo) { setStructure(meter, newTempo, leadin); },
        // lead-in
        getLeadin: function() { return leadin; },
        // setter pulls in the other two values because they're all tied together
        setLeadin: function(newLeadin) { setStructure(meter, tempo, newLeadin); },
        // convenience to set all three at the same time
        setStructure: setStructure, // (newMeter, newTempo, newLeadin)

        // units per line getter/setter
        getUnitsPerLine: function() { return unitsPerLine; },
        // no undo
        setUnitsPerLine: function(newUnitsPerLine) { doSetUnitsPerLine(newUnitsPerLine); scheduleUpdate(); },

        // song getters
        getSong: function() { return song; },
        getSongCode: doGetSongCode,
        // song code setter
        setSongCode: function(newCode) {
            // todo: factor this out?
            // if the song code is null or blank, set a default
            if (!newCode || newCode.length == 0) {
                // song code for pentatonic minor, no notes
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
                // build do and undo actions and run through the undo system
                Undo.doAction(
                    // set the song object directly, to preserve and references in the undo/redo lists.
                    () => { doSetSong(newSong, newCode); scheduleUpdate(); },
                    () => { doSetSong(currentSong, currentCode); scheduleUpdate(); },
                    "Set Song Code"
                );
            }
        },

        // build a URL containing all the model data
        buildUrl: buildUrl, // ()
    };
})();


