// playback handling/tracking lib
var Playback = (function() {

    // Basically the framerate for the playback UI, currently set to roughly 60 fps
    // todo: Mobile Chrome has some kind of limit, you get maybe 5fps
    var playbackLoopInterval = Math.floor(1000/60);
    // how many seconds ahead to schedule sounds
    // this limits the load on the audio system scheduler and how many sounds we have to cancel when playback is stopped early
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
    // tracks the time location where playback started, we need this to schedule notes offset by that starting time
    var playbackStartTick = null;
    // the next note to be played
    var playbackNote = null;

    // track whether the stop button is enabled
    var stopEnabled = false;
    // setTimeout cancel callback for the playback loop
    var loopTimeout = null;

    function registerEventListeners() {
        // set up button event listeners
        document.getElementById("song-buttons-play").addEventListener("click", togglePlay, { passive: false });
        document.getElementById("song-buttons-stop").addEventListener("click", stop, { passive: false });
        document.getElementById("song-buttons-rewind").addEventListener("click", rewind, { passive: false });
        document.getElementById("song-buttons-ff").addEventListener("click", fastForward, { passive: false });

        // set up global key listener for the spacebar
        Events.addKeyDownListener("Space", (e) => {
            if (e.shiftKey) {
                // shift-spacebar plays from the beginning regardless of the current state
                stop();
                start();
            } else {
                // regular spacebar starts from wherever it left off if paused, otherwise starts from the beginning
                togglePlay();
            }
            return true;
        }, { passive: false });

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
            start();

        // pause if we are playing
        } else {
            pause();
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
        div.className = enabled ? "smallButton" : "smallButton-disabled";
        img.className = enabled ? "icon" : "icon-disabled";
        // save the state
        stopEnabled = enabled;
    }

    function rewind() {
        // track whether we were playing or not
        var wasPlaying = isPlaying();
        // stop playing
        stop();
        // if we were playing, then start playback over from the beginning
        if (wasPlaying) {
            start();
        // if we weren't playing, then just scroll back to the beginning
        } else {
            Track.scrollToTick(0);
        }
    }

    function fastForward() {
        // stop playing
        stop();
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
        }
    }

    function setSong(newSong) {
        // if someone sets the song, stop playing
        stop();
        // save the song object
        song = newSong;
    }

    function start() {
        // sanity check
        if (isPlaying()) return;

        // see if the track already has a playback marker placed somewhere
        playbackStartTick = Track.getPlaybackTick();
        // check if the track's marker is missing or after the end of the song
        if (playbackStartTick == null || playbackStartTick > song.getEndTick()) {
            // start playback at the beginnine, minus the playback lead-in (which is different from the song lead-in)
            playbackStartTick = -Metadata.leadInTicks;
            // clear any lingering playback state in the track
            Track.clearPlayback();
        }

        // todo: setLoading()
        // load the sound bank and start everything once its loaded
        soundBank.checkInit(() => {
            // set the audio time offset so we can schedule sounds starting from now
            ShawzinAudio.setTimeOffset();
            // get the first note to play
            playbackNote = song.getFirstNoteAfter(playbackStartTick);
            // set UI state
            setPlaying(true);
            setPauseEnabled();
            setStopEnabled(true);
            // kick off te playback loop
            playbackLoop();
        });
    }
    
    function playbackLoop() {
        // sanity check, end the loop if we're no longer playing
        if (!isPlaying()) return;

        // get the current audio time, this is the most reliable time
        var currentTime = soundBank.getCurrentTime();
        // update the track and playback marker positions
        updateTrack(currentTime);

        // while we have a next note
        while (playbackNote != null) {
            // calculate the note time relative to the start time
            var time = (playbackNote.tick - playbackStartTick) / Metadata.ticksPerSecond;
            // if the next note is farther in the future than our schedule buffer, stop scheduling notes
            if (time - currentTime > soundScheduleBufferTime) {
                break;
            }

            // get the note name
            var noteName = playbackNote.toNoteName();
            // schedule the note to play
            soundBank.play(noteName, time);
            // go to the next note
            playbackNote = playbackNote.next;
        }

        // check if the current time, adjusted for the starting time, is past the end of the song, and if all sounds have finished playing
        if ((currentTime * Metadata.ticksPerSecond) + playbackStartTick > song.getEndTick() && soundBank.isIdle(currentTime)) {
            // stop playing at the end of the song
            stop();

        } else {
            // schedule another loop iteration
            loopTimeout = setTimeout(playbackLoop, playbackLoopInterval)
        }
    }

    function updateTrack(currentTime) {
        // set the track playback marker position to the current playback time plus the start time
        Track.setPlaybackTick((currentTime * Metadata.ticksPerSecond) + playbackStartTick);
    }

    function pause() {
        // sanity check
        if (playing) {
            // stop playing
            setPlaying(false);
            // stop any scheduled sounds that haven't played yet
            // there's some lag with this, so some sounds might still play, and then
            // get played again when playback is resumed
            soundBank.stop();
            // might as well update the track position one last time
            updateTrack(soundBank.getCurrentTime());
            // enable the play button
            setPlayEnabled();
        }
    }

    function stop() {
        // sanity check
        if (stopEnabled) {
            // check if we're playing
            // todo: is this check necessary?
            if (playing) {
                // stop any scheduled sounds that haven't played yet
                // there's some lag with this, so some sounds might still play, and then
                soundBank.stop();
                // might as well update the track position one last time
                updateTrack(soundBank.getCurrentTime());
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
        // notify that the song has been updated
        setSong: setSong, // (newSong)
        // play a single note immediately
        playNote: playNote, // (noteName)

        // not actually used externally
//        // check if we're currently playing
//        isPlaying: isPlaying, // ()
//        // start playback
//        start: start, // ()
//        // pause playback, calling start() again will resume from where it was paused
//        pause: pause, // ()
//        // stop playback entirely.  calling start() again will start from the beginning
//        stop: stop, // ()
    }
})();