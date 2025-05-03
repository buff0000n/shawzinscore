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
    // lead in ticks
    var leadInTicks = null;
    // either measures per line or seconds per line for shawzin tab, depending on whether a structure is defined
    // this depends on the song, so it's saved as part of the model
    var unitsPerLine = null;
    // key signature, basically the global pitch offset
    var keySig = Piano.keySigOrder[0];

    // delay before updating the song code and the URL
    var updateDelay = 1000;
    // setTimeout() future for the update, in case we need to cancel and reschedule
    var scheduledUpdate = null;

    function init(url) {
        // gotta do this before filling in the track
        // control scheme comes from preferences and isn't tied to the song data
        doSetControlScheme(ControlSchemeUI.preferenceToControlScheme(Settings.getControlScheme()));

        // keep track of whether we need to update the URL due to deprecated parameters
        var updateUrl = false;

        // load settings from the URL query parameters
        var shawzin = PageUtils.getQueryParam("s", false);
        var songName = PageUtils.urlDecodeString(PageUtils.getQueryParam("n"));
        // don't parse '+' in the song code as a space
        var songCode = PageUtils.getQueryParam("c", false);
        var songTempo = PageUtils.getQueryParam("t", false);
        var songMeter = PageUtils.getQueryParam("m", false);
        // new lead-in parameter
        var songLeadInTicks = PageUtils.getQueryParam("lt", false);
        // try old lead-in parameter
        if (songLeadInTicks == null) {
            // read lead-in beats string
            var songLeadIn = PageUtils.getQueryParam("l", false);
            // if we have a lead-in value and a tempo, convert to ticks
            if (songLeadIn != null && songTempo != null) {
                songLeadInTicks = beatsStringToTicks(songLeadIn, MiscUtils.parseInt(songTempo));
                // hack: remove the l=... parameter
                PageUtils.removeUrlQueryParam("l");
                // update the URL when we're done
                updateUrl = true;
            }
        }

        var tabUnitsPerLine = PageUtils.getQueryParam("u", false);

        // default shawzin
        if (!shawzin) shawzin = Metadata.shawzinOrder[0];
        // set the shawzin
        doSetShawzin(shawzin);

        // set the title
        doSetSongName(songName); // can be null

        // parse the tempo if present
        var songTempoInt = (songTempo && songTempo != "") ? MiscUtils.parseInt(songTempo) : null;
        // set the structure (meter, tempo)
        doSetStructure(songMeter, songTempoInt);

        // set the measures/seconds per line for shawzin tab
        doSetUnitsPerLine(tabUnitsPerLine); // can be null

        // check for a song code
        if (songCode) {
            // parse the sond code
            var newSong = new Song();
            newSong.fromCode(songCode);
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

        // apply lead-in after loading the song
        doSetLeadInTicks(songLeadInTicks ? MiscUtils.parseInt(songLeadInTicks) : null, changeSong=true, forceUpdate=true);

        // update the URL if there were some deprecated parameters in there
        if (updateUrl) {
            scheduleUpdate();
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
            // this will get url-encoded elsewhere
            "n": songName, // PageUtils.urlEncodeString(songName),
            "s": shawzin,
            "m": meter,
            "t": tempo,
            "lt": leadInTicks,
            "u": unitsPerLine,
            // todo: compressed format?
            // any of the usual compression formats are going to have to be base64 encoded anyway,
            // saving us very little at best over the default base64-esque format
            "c": songCode
        };
    }

    function doUpdate() {
        // get or re-generate the song code, update it in the UI, build a parameter map, and update the URL
        PageUtils.setQueryParamMap(getQueryParamMap(), false);
    }

    function buildUrl() {
        // generate an up-to-date paramter map and use it to build a modified version of the current URL
        return PageUtils.buildQueryUrlWithMap(getQueryParamMap(), false);
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

        // propagate the update to the track, trackbar, and the player
        Track.updateShawzin();
        TrackBar.updateShawzin();
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

    function doSetKeySig(newKeySig) {
        // check for validity
        if (Piano.keySigOrder.indexOf(newKeySig) == -1) {
            console.log("Invalid key signature: " + newKeySig);
            return;
        }
        // update the setting
        keySig = newKeySig;
        // update the other modules that need updating
        Playback.updateKeySig();
        TrackBar.updateScale();
        Track.updateScale();
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
        Settings.setControlScheme(ControlSchemeUI.controlSchemeToPreference(controlScheme));
        // propagate to the trackbar
        TrackBar.updateControlScheme();
        // propagate to the track
        Track.updateControlScheme();
    }

    function doSetSongName(name) {
        // replace blank string with null
        if (name && name.length == 0) name = null;
        // set it
        songName = MiscUtils.sanitizeString(name);
        // update the UI
        var text = document.getElementById("metadata-settings-title-text");
        text.value = name;
    }

    function doGetSongCode() {
        // check if don't have one cached
        if (!songCode) {
            // get the song code from the song object, or use a default
            songCode = song ? song.toCode() : "";
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

        // update editing
        Editing.updateSongStats();
    }

    // easiest to just handle these two parameters at the same time
    function doSetStructure(newMeter, newTempo) {
        // check for a change
        if (newMeter == meter && newTempo == tempo) return;

        // standardize non-values
        if (newMeter == "") newMeter = null;
        if (newTempo == 0) newTempo = null;

        // if we're transition from no structure to some structure, fill in any missing values with defaults
        if (!meter && (newMeter || newTempo)) {
            if (!newMeter) newMeter = MetadataUI.defaultMeter;
            if (!newTempo) newTempo = MetadataUI.defaultTempo;

        // if we're transition from having structure no structure, clear everything out
        } else if (meter && (!newMeter || !newTempo)) {
            newMeter = null;
            newTempo = null;
        }

        if (!newMeter) {
            // clear everything
            meter = null;
            meterArray = null;
            tempo = null;

        } else {
            // parse meter, throw an error if there's any format issues
            var newMeterStringArray = newMeter.split("/");
            // check format
            if (newMeterStringArray.length != 2) {
                throw "Invalid meter format: '" + newMeter + "'";
            }

            // parse as two ints
            var newMeterArray = [MiscUtils.parseInt(newMeterStringArray[0]), MiscUtils.parseInt(newMeterStringArray[1])];

            // range check
            if (newMeterArray[0] > MetadataUI.maxBeatsPerMeasure) {
                newMeterArray[0] = MetadataUI.maxBeatsPerMeasure;
                newMeter = newMeterArray[0] + "/" + newMeterArray[1];
            }

            // after all the parsing/checking is done, save the values
            meter = newMeter;
            meterArray = newMeterArray;
            tempo = newTempo;
        }

        // update UI controls
        var meterInput = document.getElementById("config-meter-input");
        meterInput.value = meter ? meter : "";

        var tempoInput = document.getElementById("config-tempo-input");
        tempoInput.value = tempo ? tempo : "";

        // if there is a lead-in then don't actually change the lead-in ticks, but
        // update the UI for the new or lack of meter/tempo
        if (leadInTicks) {
            doSetLeadInTicks(leadInTicks, true, true);
        }

        // update the track
        Track.updateStructure();
        // update the Playback UI, basically it just needs to know whether to enable the metronome
        Playback.updateStructure();
        // update editing
        Editing.updateStructure();
    }
    
    function doSetLeadInTicks(newLeadInTicks, changeSong = true, forceUpdate = false) {
        // optional equality check, we might need to force an update to the UI for a new meter/tempo
        if (!forceUpdate && newLeadInTicks == leadInTicks) {
            return;
        }
        // set the new value
        leadInTicks = newLeadInTicks;

        // get the UI containers for the two states
        var leadInBeatsContainer = document.getElementById("config-leadin-beats");
        var leadInSecondsContainer = document.getElementById("config-leadin-seconds");

        // check if there is structure
        if (meter) {
            // UI element for lead-in beats
            var leadInInput = document.getElementById("config-leadin-beats-input");
            // set the UI value
            leadInInput.value = leadInTicks ? ticksToBeatsString(leadInTicks, tempo) : "";
            // show the beats one and hide the seconds one
            leadInBeatsContainer.style.display = "";
            leadInSecondsContainer.style.display = "none";

        } else {
            // UI element for lead-in seconds
            var leadInInput = document.getElementById("config-leadin-seconds-input");
            // set the UI value
            leadInInput.value = leadInTicks ? ticksToBeatsString(leadInTicks, 60) : "";
            // show the seconds one and hide the beats one
            leadInBeatsContainer.style.display = "none";
            leadInSecondsContainer.style.display = "";
        }

        if (changeSong) {
            // apply the lead-in to the song
            setLeadInTicksOnSong(song);
            // update the Track
            Track.updateStructure();
        }
    }

    // regex for trimming trailing decimal zeros from a number string
    var numberTrimRegex = /(\.)?0+$/i;

    // convert ticks to beats according to a tempo
    function ticksToBeatsString(ticks, tempo) {
        return (ticks == null || ticks == 0) ? "" :
            // convert from ticks to beats according to the tempo and format as a string
            (ticks / ((Metadata.ticksPerSecond * 60) / tempo)).toFixed(4).replace(numberTrimRegex, "");
    }

    // convert beats to ticks according to a tempo and optional meter
    function beatsStringToTicks(beatsString, tempo, meterArray=null) {
        // null check
        if (beatsString == null) {
            return null;
        }
        // parse as a float
        var beatsFloat = MiscUtils.parseFloat(beatsString);
        // optionally normalize with the meter beats
        if (meterArray) {
            // lead-in beats needs to be less than one measure's worth of beats
            while (beatsFloat > meterArray[0]) {
                beatsFloat -= meterArray[0];
            }
            // might as well fix negative numbers, too
            while (beatsFloat < 0) {
                beatsFloat += meterArray[0];
            }
        }
        // calculate the lead-in ticks based on the tempo
        return Math.round(beatsFloat * ((Metadata.ticksPerSecond * 60) / tempo));
    }

    function setLeadInTicksOnSong(song) {
        // sanity check
        if (!song) return;

        var songLeadInTicks = leadInTicks ? leadInTicks : 0;

        // check if there's structure
        if (tempo && meterArray) {
            // calculate the ticks per measure
            var beatsPerMeasure = meterArray[0];
            var ticksPerMeasure = (60.0 / tempo) * Metadata.ticksPerSecond * beatsPerMeasure;
            // if the lead-in ticks are less than half a measure, then make lead-in negative,
            // so those notes occur before measure 1
            if (songLeadInTicks < ticksPerMeasure / 2) {
                song.setLeadInTicks(-songLeadInTicks);
            // otherwise, measure 1 is lead-in to measure 2
            } else {
                song.setLeadInTicks(ticksPerMeasure - songLeadInTicks);
            }
        } else {
            // no structure, so use the lead-in directly
            // todo: some kind of sanity check?
            song.setLeadInTicks(-songLeadInTicks);
        }

        // update editing
        Editing.updateSongStats();
    }

    function setStructure(newMeter, newTempo) {
        // save the current values to this function closure
        var currentMeter = meter;
        var currentTempo = tempo;
        // check for any value change
        if (newMeter != currentMeter || newTempo != currentTempo) {
            // build do and undo actions, execute the do action and put it on the undo stack
            Undo.doAction(
                () => { doSetStructure(newMeter, newTempo); scheduleUpdate(); },
                () => { doSetStructure(currentMeter, currentTempo); scheduleUpdate(); },
                "Set Structure"
            );
        }
    }

    function setLeadInTicks(newLeadInTicks, changeSong=true) {
        // save the current values to this function closure
        var currentLeadInTicks = leadInTicks;
        // check for any value change
        if (newLeadInTicks != currentLeadInTicks) {
            // build do and undo actions, execute the do action and put it on the undo stack
            Undo.doAction(
                () => { doSetLeadInTicks(newLeadInTicks, changeSong); scheduleUpdate(); },
                () => { doSetLeadInTicks(currentLeadInTicks, changeSong); scheduleUpdate(); },
                "Set Lead-in"
            );
        }
    }

    function doSetUnitsPerLine(newUnitsPerLine) {
        // check for change
        if (newUnitsPerLine == unitsPerLine) return;
        // can't have people putting in huge numbers and crashing the page
        if (newUnitsPerLine > MetadataUI.maxUnitsPerLine) {
            newUnitsPerLine = MetadataUI.maxUnitsPerLine;
        }
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

        // key sig getter/setter
        getKeySig: function() { return keySig; },
        setKeySig: function(newKeySig) {
            // save current value
            var current = keySig;
            // check for change
            if (newKeySig != current) {
                // build do and undo actions and run through the undo system
                Undo.doAction(
                    () => { doSetKeySig(newKeySig); scheduleUpdate(); },
                    () => { doSetKeySig(current); scheduleUpdate(); },
                    "Set Key Signature"
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
        // setter pulls in the other value because they're tied together
        setMeter: function(newMeter) { setStructure(newMeter, tempo); },
        // tempo
        getTempo: function() { return tempo; },
        // setter pulls in the other values because they're tied together
        setTempo: function(newTempo) { setStructure(meter, newTempo); },
        // convenience to set both at the same time
        setStructure: setStructure, // (newMeter, newTempo)
        // lead-in getter, just for debugging right now
        getLeadInTicks: function() { return leadInTicks; },
        // direct setter for lead-in ticks
        setLeadInTicks: setLeadInTicks, // (leadInTicks, updateSong=true)
        // setter for lead-in beats
        setLeadInBeats: function(leadInBeatsString, updateSong) {
            // convert to ticks using the current tempo/meter
            // todo: check if there is a meter?
            setLeadInTicks(beatsStringToTicks(leadInBeatsString, tempo, meterArray), updateSong);
        },
        // setter for lead-in seconds
        setLeadInSeconds: function(leadInSecondsString, updateSong) {
            // convert to ticks, repurposing the beat method with 60 bpm
            setLeadInTicks(beatsStringToTicks(leadInSecondsString, 60), updateSong);
        },

        // units per line getter/setter
        getUnitsPerLine: function() { return unitsPerLine; },
        // no undo
        setUnitsPerLine: function(newUnitsPerLine) { doSetUnitsPerLine(newUnitsPerLine); scheduleUpdate(); },

        // song getters
        getSong: function() { return song; },
        getSongCode: doGetSongCode,
        // direct song object setter
        setSong: function(newSong) {
            var currentSong = song;
            Undo.doAction(
                // set the song object directly, to preserve and references in the undo/redo lists.
                () => { doSetSong(newSong); scheduleUpdate(); },
                () => { doSetSong(currentSong); scheduleUpdate(); },
                "Set Song"
            );
        },
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
            newSong.fromCode(newCode);

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

        // schedule a URL update when something in the model changes
        scheduleUpdate: scheduleUpdate, // ()

        // build a URL containing all the model data
        buildUrl: buildUrl, // ()
    };
})();


