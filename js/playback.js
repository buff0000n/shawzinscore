// playback handling/tracking lib
var Playback = (function() {

    // Basically the framerate for the playback UI, currently set to roughly 60 fps
    // todo: Mobile Chrome has some kind of limit, you get maybe 5fps
    var playbackLoopInterval = Math.floor(1000/60);
    // how many seconds ahead to schedule sounds
    // this limits the load on the audio system scheduler and how many sounds we have to cancel when playback is stopped early
    // Note that this is in "song time", making it dependent on playback speed seems to make things worse
    var soundScheduleBufferTime = 1.0;

    // copies of the currently selected shawzin and scale
    var shawzin = null;
    var scale = null;
    // copy of the current song
    var song = null;

    // current sound bank, with just the sounds for the currently selected shawzin and scale
    var soundBank = null;
    // playing flag
    var playing = false;

    // track whether the stop button is enabled
    var stopEnabled = false;
    // track whether the metronome button is enabled
    var metronomeEnabled = false;
    // track whether the metronome is on
    var metronomeOn = false;
    // track whether the settings metronome is on
    var settingsMetronomeOn = false;
    // huhhh
    var metronomeAutoOff = false;
    // slider for playback speed selection
    var speedSlider = null;

    function registerEventListeners() {
        // set up button event listeners
        document.getElementById("song-buttons-play").addEventListener("click", togglePlay, { passive: false });
        document.getElementById("song-buttons-stop").addEventListener("click", stop, { passive: false });
        document.getElementById("song-buttons-rewind").addEventListener("click", rewind, { passive: false });
        document.getElementById("song-buttons-ff").addEventListener("click", fastForward, { passive: false });
        document.getElementById("song-buttons-metro").addEventListener("click", toggleMetronome, { passive: false });
        document.getElementById("song-buttons-metro-settings").addEventListener("click", toggleSettingsMetronome, { passive: false });

        // set up global key listener for the spacebar
        Events.addKeyDownListener("Space", (e) => {
            if (e.shiftKey) {
                // shift-spacebar plays from the beginning regardless of the current state
                FullPlayer.stopPlaying();
                FullPlayer.startPlaying();
            } else {
                // regular spacebar starts from wherever it left off if paused, otherwise starts from the beginning
                togglePlay();
            }
            return true;
        });

        // initialize the metronome buttom state from settings
        setMetronomeOn(Settings.getMetronomeOn());

        FullPlayer.setup();
    }

    function setSong(newSong) {
        // if someone sets the song, stop playing
        FullPlayer.stopPlaying();
        // save the song object
        song = newSong;
    }

    function setPlaying(newPlaying) {
        // sanity check
        if (playing == newPlaying) return;

        // set
        playing = newPlaying;

        // update the track
        Track.setPlaying(playing);
    }

    function isPlaying() {
        return playing;
    }

    function togglePlay() {
        // start if we're not playing
        if (!isPlaying()) {
            FullPlayer.startPlaying();

        // pause if we are playing
        } else {
            FullPlayer.pausePlaying();
        }

        // stop button gets enabled in both cases
        setStopEnabled(true);
    }

    function setPlayEnabled() {
        // reset the play button to be a play button
        var div = document.getElementById("song-buttons-play");
        var img = div.children[0];
        PageUtils.setImgSrc(img, "icon-play.png");
    }

    function setPauseEnabled() {
        // update the play button to be a pause button
        var div = document.getElementById("song-buttons-play");
        var img = div.children[0];
        PageUtils.setImgSrc(img, "icon-pause.png");
    }

    function setStopEnabled(enabled) {
        // enable or disable the stop button
        var div = document.getElementById("song-buttons-stop");
        var img = div.children[0];
        div.className = enabled ? "button tooltip" : "button-disabled tooltip";
        img.className = enabled ? "icon" : "icon-disabled";
        // save the state
        stopEnabled = enabled;
    }

    function setMetronomeEnabled(enabled) {
        // enable or disable the metronome button
        function ffs(id) {
            var div = document.getElementById(id);
            var img = div.children[0];
            div.className = enabled ? "button tooltip" : "button-disabled tooltip";
            img.className = enabled ? "icon" : "icon-disabled";
        }

        ffs("song-buttons-metro");
        ffs("song-buttons-metro-settings");
        // save the state
        metronomeEnabled = enabled;
    }

    function setMetronomeOn(on) {
        // change the state of the metronome button
        var div = document.getElementById("song-buttons-metro");
        var img = div.children[0];
        PageUtils.setImgSrc(img, on ? "icon-metro-on.png" : "icon-metro-off.png");
        // save the state
        metronomeOn = on;
        Settings.setMetronomeOn(on);
    }

    function setSettingsMetronomeOn(on) {
        // change the state of the settings metronome button
        var div = document.getElementById("song-buttons-metro-settings");
        var img = div.children[0];
        PageUtils.setImgSrc(img, on ? "icon-metro-on.png" : "icon-metro-off.png");
        // save the state
        settingsMetronomeOn = on;
    }

    function rewind() {
        // track whether we were playing or not
        var wasPlaying = isPlaying();
        // stop playing
        FullPlayer.stopPlaying();
        // clear the playback start marker, if present
        Track.clearPlaybackStartTick();
        // if we were playing, then start playback over from the beginning
        if (wasPlaying) {
            FullPlayer.startPlaying();
        // if we weren't playing, then just scroll back to the beginning
        } else {
            Track.scrollToTick(0);
        }
    }

    function fastForward() {
        // stop playing
        FullPlayer.stopPlaying();
        // scroll to the end of the song
        Track.scrollToTick(song ? song.getEndTick() : 0);
    }

    function updateSoundBank() {
        // get the current model settings
        var shawzin = Model.getShawzin();
        var scale = Model.getScale();
        // sanity check
        if (shawzin && scale) {
            // update the sound bank
            soundBank = ShawzinAudio.getSoundBank(shawzin, scale);
            updateKeySig();
        }
    }

    function updateKeySig() {
        // just need to set the pitch offset on the sound bank
        soundBank.setKeySig(Model.getKeySig());
    }

    function updateStructure() {
        // enable the metronome depending on whether the model has a meter and tempo
        var newMetronomeEnabled = (Model.getMeterTop() != null && Model.getTempo() != null);
        // check for a change
        if (metronomeEnabled != newMetronomeEnabled) {
            // set the enabledness of the metronome button
            setMetronomeEnabled(newMetronomeEnabled);
        }
    }

    function toggleMetronome() {
        // only do something if the metronome button is enabled
        if (metronomeEnabled) {
            var on = !metronomeOn;
            setMetronomeOn(on);
        }
    }

    function toggleSettingsMetronome() {
        // only do something if the metronome button is enabled
        if (metronomeEnabled) {
            var on = !settingsMetronomeOn;
            // toggle the metronome state
            setSettingsMetronomeOn(on);

            if (isPlaying()) {
                if (on && !metronomeOn) {
                    metronomeAutoOff = true;
                }
                setMetronomeOn(on);

            } else if (!on) {
                // stop metronome player
                console.log("stop metronome player");

            } else {
                // start metronome player
                console.log("start metronome player");
            }
        }
    }

    function showSettingsMetronome() {
        // only do something if the metronome button is enabled
        if (metronomeEnabled) {
            setSettingsMetronomeOn(isPlaying() && metronomeOn);
        }
    }

    function hideSettingsMetronome() {
        // only do something if the metronome button is enabled
        if (metronomeEnabled) {
            if (isPlaying()) {
                if (metronomeAutoOff) {
                    setMetronomeOn(false);
                }
            } else {
                if (settingsMetronomeOn) {
                    setSettingsMetronomeOn(false);
                    // stop metronome player
                    console.log("stop metronome player");
                }
            }
        }
    }

    // metronome tracker
    class MetronomeTrack {
        constructor(startTick, toRealTime) {
            // ugh
            this.toRealTime = toRealTime;
            // get the sound bank, this is cached by ShawzinAudio
            this.soundBank = ShawzinAudio.getMetronomeSoundBank();

            this.init(startTick);
        }

        init(startTick) {
            // cache these, we need to be able to tell when they change
            this.tempo = Model.getTempo();
            // get the beats per bar from the meter
            this.beatsPerBar = Model.getMeterTop();

            // calculate ticks per beat
            this.ticksPerBeat = (60 * Metadata.ticksPerSecond) / this.tempo;

            // initialize the next beat
            this.nextBeat = Math.ceil(startTick / this.ticksPerBeat);
            // and the time of the next beat
            this.nextBeatTick = this.nextBeat * this.ticksPerBeat;
        }

        playbackLoop(songTick, songScheduleBufferTicks) {
            // check if the structure has changed during playback
            if (Model.getTempo != this.tempo || model.getMeterTop != this.beatsPerBar) {
                // stop any scheduled sounds
                this.stopPlaying();
                // re-init with the new structure
                this.init(songTick);
            }
            // schedule sounds up to the buffer
            while (this.nextBeatTick - songTick < songScheduleBufferTicks) {
                // determine if the next sound is a bar or just a beat
                var isBar = (this.nextBeat % this.beatsPerBar) == 0;
                // convert to real time
                var beatTime = this.toRealTime(this.nextBeatTick);
                // schedule the sound
                this.soundBank.play(isBar ? "bar" : "beat", beatTime);
                // increment the beat
                this.nextBeat += 1;
                // recalculate the tick of the next beat
                this.nextBeatTick = this.nextBeat * this.ticksPerBeat;
                //console.log("Next beat: " + this.nextBeatTick);
            }
        }

        stopPlaying(realTime) {
            // stop any scheduled sounds
            this.soundBank.stop(realTime);
        }
    }

    var FullPlayer = (function() {
        // tracks the time location where playback started, we need this to schedule notes offset by that starting time
        var playbackStartTick = null;
        // the next note to be scheduled
        var nextScheduledNote = null;
        // the next note to be played, already scheduled
        var nextPlayedNote = null;
        // setTimeout cancel callback for the playback loop
        var loopTimeout = null;
        // tracking how long each playback loop takes will help us cancel only the notes that haven't played yet when we
        // have to stop playback.
        // I can't believe it's so hard to do this with AudioContext.
        var lastRealTime = null;
        var realLoopTime = null;
        // playback speed
        var playbackSpeed = null;
        // internal playback speed variable
        var newPlaybackSpeed = null;
        // metronome tracker, just one of them
        var metronomeTrack = null;

        function setup() {
            // initialize the playback speed from settings
            playbackSpeed = Settings.getPlaybackSpeed();
            // the playback speed slider needs a bit of setup
            setupSpeedSlider();
        }

        function setupSpeedSlider() {
            // pull the list of speeds from metadata
            var speedList = MetadataUI.playbackSpeeds;
            // how granular the slider is
            var granularity = 100;
            // the maximum Value of the slider
            var maxValue = (speedList.length - 1) * granularity;

            // define a function for converting slider value to speed
            function sliderToSpeed(value) {
                // special case: all the way to the right
                if (value == maxValue) {
                    return speedList[speedList.length - 1].toFixed(2);
                }
                // divide by granularity
                var v = value / granularity;
                // get the index if the speed below the slider
                var index = Math.floor(v);
                // get the factional part between two speeds
                var fraction = v - index;
                // just a basic linear interpolation, anything fancier feels weird
                // limit to two decimal places
                return ((speedList[index] * (1 - fraction)) + (speedList[index + 1] * fraction)).toFixed(2);
            }

            function speedToSlider(speed) {
                // find the last entry in the list that is less than or equal to the given speed
                var index = -1;
                while (index < speedList.length - 1 && speedList[index + 1] < speed) index++;

                // range checks
                if (index == -1) {
                    return 0;

                } else if (index >= speedList.length - 1) {
                    return maxValue;
                }

                // reverse linear interpolation is the name of my DEVO cover band
                var fraction = (speed - speedList[index]) / (speedList[index + 1] - speedList[index]);
                // straightforward now to convert to slider units
                return granularity * (index + fraction);
            }

            // get the two inputs
            var speedRangeInput = document.getElementById("speedRange");
            var speedLabelInput = document.getElementById("speedLabelInput");
            // update function so we can reuse it
            function updateUI(newSpeed) {
                speedLabelInput.value = newSpeed;
            }

            // change listener for the text box
            speedLabelInput.addEventListener("change", (e) => {
                try {
                    // parse the speed
                    var newSpeed = MiscUtils.parseFloat(speedLabelInput.value);
                    // okay, I guess we need some range checking
                    if (newSpeed > MetadataUI.maxPlaybackSpeed) {
                        newSpeed = MetadataUI.maxPlaybackSpeed;
                        speedLabelInput.value = newSpeed;
                    }
                    if (newSpeed < MetadataUI.minPlaybackSpeed) {
                        newSpeed = MetadataUI.minPlaybackSpeed;
                        speedLabelInput.value = newSpeed;
                    }
                    // update the playback speed
                    setPlaybackSpeed(newSpeed);
                    // convert to slider value and update the slider
                    speedRangeInput.value = speedToSlider(newSpeed);
                    Settings.setPlaybackSpeed(newSpeed);
                    // blur the text box because why doesn't it do this by default
                    speedLabelInput.blur();

                } catch (error) {
                    // if any error occurs, most likely an invalid format, then just revert
                    console.log(error);
                    speedLabelInput.value = sliderToSpeed(document.getElementById("speedRange").value);
                }

            });
            // initialize the UI with the preference playnack speed
            updateUI(playbackSpeed);

            // generate a list of snap values in slider units
            var snaps = [];
            for (var i = 0; i < speedList.length; i++) {
                snaps.push(granularity * i);
            }

            // build the slider controller
            speedSlider = new Slider(
                // elements
                document.getElementById("speedRangeContainer"),
                speedRangeInput,
                // range
                maxValue,
                // getter
                () => {
                    return speedToSlider(playbackSpeed);
                },
                // setter
                (value) => {
                    var newSpeed = sliderToSpeed(value);
                    setPlaybackSpeed(newSpeed);
                    updateUI(newSpeed);
                },
                // commiter
                (value) => {
                    Settings.setPlaybackSpeed(sliderToSpeed(value));
                },
                // snap list and distance
                snaps, 20
            );
        }


        function startPlaying() {
            // sanity check
            if (isPlaying()) return;

            if (settingsMetronomeOn) {
                console.log("stop playing metronome");
                if (!metronomeOn) {
                    setMetronomeOn(true);
                    metronomeAutoOff = true;
                }
            }
            setSettingsMetronomeOn(metronomeOn);

            // see if the track already has a playback marker placed somewhere
            playbackStartTick = Track.getPlaybackTick();
            // otherwise, check for a playback start marker
            if (playbackStartTick == null) {
                playbackStartTick = Track.getPlaybackStartTick();
            }
            // check if the track's marker is missing or after the end of the song
            if (playbackStartTick == null || playbackStartTick > song.getEndTick()) {
                // If playback speed is 1x or greater, start playback at the beginning, minus the playback lead-in
                // (which is different from the song lead-in)
                if (playbackSpeed >= 1) {
                    playbackStartTick = -Metadata.leadInTicks;

                // If playback speed < 1, adjust the lead-in, otherwise you just sit there for a long time waiting for it
                // to start.
                } else {
                    // we should adjust it relative to the song's starting tick
                    var startTick = song.getStartTick();
                    playbackStartTick = startTick - ((startTick + Metadata.leadInTicks) * playbackSpeed);
                }
            }
            //console.log("START TICK: " + playbackStartTick);

            // clear any lingering playback state in the track, this makes sure we don't animate a bunch of notes
            // we didn't mean to
            Track.clearPlayback();

            // todo: setLoading()
            // load the sound bank and start everything once its loaded
            soundBank.checkInit(() => {
                // set the audio time offset so we can schedule sounds starting from now
                ShawzinAudio.setTimeOffset();
                // get the first note to play
                nextScheduledNote = song.getFirstNoteAfter(playbackStartTick);
                // these start out the same
                nextPlayedNote = nextScheduledNote;
                //console.log("NEXT SCHEDULED START: " + nextScheduledNote.tick);
                //console.log("NEXT PLAYED START: " + nextPlayedNote.tick);
                // set UI state
                setPlaying(true);
                setPauseEnabled();
                setStopEnabled(true);
                // initialize timing tracker
                lastRealTime = 0;
                // kick off te playback loop
                playbackLoop();
            });
        }

        function setPlaybackSpeed(speed) {
            // check if we're currently playing
            if (isPlaying()) {
                // todo: looser equality/
                if (speed != (newPlaybackSpeed != null ? newPlaybackSpeed : playbackSpeed)) {
                    // schedule a playback speed change when the nexy playback loop runs
                    newPlaybackSpeed = speed;
                }
            } else {
                // not currently playing, update the playback speed immediately
                playbackSpeed = speed;
            }
        }

        function updateSpeed(realTime) {
            // check if there's an updated playback speed
            if (newPlaybackSpeed != null) {
                // get the current song tick
                var songTick = toSongTick(realTime);
                // recalculate playbackStartTick so that toSongTicks() still gives the same song tick with the new
                // playback speed
                playbackStartTick = songTick - (realTime * newPlaybackSpeed * Metadata.ticksPerSecond);
                // update the playback speed
                playbackSpeed = newPlaybackSpeed;
                //console.log("NEW PLAYBACK START TICK: " + playbackStartTick);
                // unset the temp value
                newPlaybackSpeed = null;
                // there was an update
                return true;
            } else {
                // no update
                return false;
            }
        }

        function toSongTick(realTime) {
            // convert real time to song tick
            return (realTime * playbackSpeed * Metadata.ticksPerSecond) + playbackStartTick;
        }

        function toRealTime(songTick) {
            // convert song tick to real time
            return (songTick - playbackStartTick) / (playbackSpeed * Metadata.ticksPerSecond);
        }

        function playbackLoop() {
            // sanity check, end the loop if we're no longer playing
            if (!isPlaying()) {
                //console.log("STOP TICK: " + Track.getPlaybackTick());
                return;
            }

            // get the current audio time, this is the most reliable time
            var realTime = soundBank.getCurrentTime();
            // check for a speed change
            var updatedSpeed = updateSpeed(realTime);

            if (updatedSpeed) {
                // if there was a speed change, then cancel any scheduled sounds that are still in the future
                // appending how long a loop takes seems to do a decent job of not cutting off sounds that have started
                // playing.  I'd rather double-play sounds than cut off sounds in the middle.
                soundBank.stop(realTime + realLoopTime);
                // for the metronome, too
                // todo: refactor this somehow?
                if (metronomeTrack) {
                    metronomeTrack.soundBank.stop(realTime + realLoopTime);
                }
            }

            // convert real time to song tick
            var songTick = toSongTick(realTime);
            //console.log("SONG TICK: " + songTick);

            // need to check at the beginning if we've exceeded the maximum song time
            // this can happen if we set the playback speed to something ridiculously high
            if (songTick > Metadata.maxTickLength) {
                // stop playing
                stopPlaying();
                // end the loop
                return;
            }

            // update the track and playback marker positions
            updateTrack(songTick);

            // Okay, I guess double-playing a note is better than not playing it at all
            //var songTickPlus = songTick + (realLoopTime * playbackSpeed * Metadata.ticksPerSecond);

            while (nextPlayedNote != null) {
                // calculate the note time relative to the start time
                var noteTick = nextPlayedNote.tick;
                if (noteTick > songTick) {
                    break;
                }
                nextPlayedNote = nextPlayedNote.next;
                //console.log("NEXT PLAYED: " + (nextPlayedNote ? nextPlayedNote.tick : "null"));
            }

            // if there was a speed update then we need to reschedule sounds starting
            if (updatedSpeed) {
                nextScheduledNote = nextPlayedNote;
            }

            // calculate the end of the schedule buffer in ticks, adjusted forplayback speed
            var songScheduleBufferTicks = (soundScheduleBufferTime * Metadata.ticksPerSecond * playbackSpeed);

            // check if the metronome should be on
            var metronome = metronomeEnabled && metronomeOn;
            // check if we need to either start or stop the metronome
            if ((metronomeTrack != null) != metronome) {
                // if it's present, stop it
                if (metronomeTrack) {
                    metronomeTrack.stopPlaying();
                    // and clear it out
                    metronomeTrack = null;
                // otherwise, start it
                } else {
                    metronomeTrack = new MetronomeTrack(songTick, toRealTime);
                    // meh, just make sure it's initialized in the background
                    metronomeTrack.soundBank.checkInit(null);
                }
            }

            // run the metronome, if present
            if (metronomeTrack) {
                metronomeTrack.playbackLoop(songTick, songScheduleBufferTicks);
            }

            // while we have a next note
            while (nextScheduledNote != null) {
                // calculate the note time relative to the start time
                var noteTick = nextScheduledNote.tick;
                // if the next note is farther in the future than our schedule buffer, stop scheduling notes
                if (noteTick - songTick > songScheduleBufferTicks) {
                    break;
                }

                // get the note names
                var noteNames = nextScheduledNote.toNoteNames();
                // schedule the note to play
                var noteTime = toRealTime(noteTick);
                //console.log("SCHEDULED NOTE TIME: " + noteTime);
                // worth having an optimized case for a single note name
                if (noteNames.length == 1) {
                    soundBank.play(noteNames[0], noteTime);
                } else {
                    // todo: polyphony check?
                    for (var n = 0; n < noteNames.length; n++) {
                        soundBank.play(noteNames[n], noteTime);
                    }
                }
                // go to the next note
                nextScheduledNote = nextScheduledNote.next;
                //console.log("NEXT SCHEDULED: " + (nextScheduledNote ? nextScheduledNote.tick : "null"));
            }

            // check if the current song tick is past the end of the song, and if all sounds have finished playing
            if ((songTick > song.getEndTick()) && soundBank.isIdle(realTime)) {
                // stop playing at the end of the song
                stopPlaying();

            } else {
                // schedule another loop iteration
                loopTimeout = setTimeout(playbackLoop, playbackLoopInterval)
            }
            // update loop time statistic
            realLoopTime = realTime - lastRealTime;
            lastRealTime = realTime;
        }

        function updateTrack(songTick) {
            // set the track playback marker position to the current playback time plus the start time
            Track.setPlaybackTick(songTick);
        }

        function stopCommon() {
            // stop any scheduled sounds that haven't played yet
            // get the current time
            var realTime = soundBank.getCurrentTime();
            // there's some lag with this, so some sounds might still play, and then
            // get played again when playback is resumed
            // add the loop time to avoid cutting off sounds that have started playing.
            soundBank.stop(realTime + realLoopTime);
            //console.log("STOP() TIME: " + realTime + ", loop time: " + realLoopTime);
            // might as well update the track position one last time
            var songTick = toSongTick(realTime);
            updateTrack(songTick);
            // clear out the metronome track, if present
            if (metronomeTrack) {
                metronomeTrack.stopPlaying(realTime);
                metronomeTrack = null;
            }
            setSettingsMetronomeOn(false);
            if (metronomeAutoOff) {
                setMetronomeOn(false);
                metronomeAutoOff = false;
            }
            //console.log("STOP() TICK: " + songTick);
        }

        function pausePlaying() {
            // sanity check
            if (playing) {
                // stop playing
                setPlaying(false);
                stopCommon();
                // enable the play button
                setPlayEnabled();
            }
        }

        function stopPlaying() {
            // sanity check
            if (stopEnabled) {
                // check if we're playing
                // todo: is this check necessary?
                if (playing) {
                    // stop any scheduled sounds that haven't played yet
                    // there's some lag with this, so some sounds might still play, and then
                    stopCommon();
                    // update state
                    setPlaying(false);
                }
                // clear track playback state
                Track.clearPlayback();
                // enable the play button
                setPlayEnabled();
                // disable the stop button
                setStopEnabled(false);
            }
        }

        return {
            setup: setup,
            startPlaying: startPlaying,
            setPlaybackSpeed: setPlaybackSpeed,
            pausePlaying: pausePlaying,
            stopPlaying: stopPlaying,
        };
    })();

    function playNote(noteName) {
        // just play a note immediately, this is to support clicking on the roll keyboard
        // always need to do this inside an initialization check
        soundBank.checkInit(() => {
            // play immediately
            soundBank.play(noteName);
        });
    }

    return {
        // register event listeners for UI elements
        registerEventListeners: registerEventListeners, // ()
        // notify that the shawzin has been updated
        updateShawzin: updateSoundBank, // ()
        // notify that the scale has been updated
        updateScale: updateSoundBank, // ()
        // notify that the key signature has been updated
        updateKeySig: updateKeySig, // ()
        // notify that the song structure has changed
        updateStructure: updateStructure, // ()
        // notify that the song has been updated
        setSong: setSong, // (newSong)
        // play a single note immediately
        playNote: playNote, // (noteName)

        // notify when the song setting dialog is shown or hidden so it can manage the other metronome button
        showSettingsMetronome: showSettingsMetronome, // ()
        hideSettingsMetronome: hideSettingsMetronome, // ()
    }
})();