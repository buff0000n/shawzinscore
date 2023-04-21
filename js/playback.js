var Playback = (function() {

    // meh
    var playbackLoopInterval = Math.floor(1000/20);
    var soundScheduleBufferTime = 1.0;

    var shawzin = null;
    var scale = null;
    var song = null;

    var soundBank = null;
    var playing = false;
    var playbackStartTick = null;
    var playbackNote = null;
    
    var stopEnabled = false;
    var loopTimeout = null;

    function registerEventListeners() {
        document.getElementById("song-buttons-play").addEventListener("click", togglePlay);

        document.getElementById("song-buttons-stop").addEventListener("click", stop);

        Events.addKeyDownListener("Space", () => {
            togglePlay();
            return true;
        });

    }

    function togglePlay() {
        if (!playing) {
            start();

        } else {
            pause();
        }

        setStopEnabled(true);
    }

    function setPlayEnabled() {
        var div = document.getElementById("song-buttons-play");
        var img = div.children[0];
        PageUtils.setImgSrc(img, "icon-play.png");
    }

    function setPauseEnabled() {
        var div = document.getElementById("song-buttons-play");
        var img = div.children[0];
        PageUtils.setImgSrc(img, "icon-pause.png");
    }

    function setStopEnabled(enabled) {
        var div = document.getElementById("song-buttons-stop");
        var img = div.children[0];
        div.className = enabled ? "smallButton" : "smallButton-disabled";
        img.className = enabled ? "icon" : "icon-disabled";
        stopEnabled = enabled;
    }

    function updateSoundBank() {
        var shawzin = Model.getShawzin();
        var scale = Model.getScale();
        if (shawzin && scale) {
            soundBank = ShawzinAudio.getSoundBank(shawzin, scale);
        }
    }

    function setSong(newSong) {
        if (playing) {
            stop();
        }
        song = newSong;
    }

    function start() {
        if (playing) return;

        playbackStartTick = Track.getPlaybackTick();
        if (playbackStartTick == null || playbackStartTick > song.getEndTick()) {
            playbackStartTick = -Metadata.leadInTicks;
            Track.clearPlayback();
        }

        // todo: setLoading()
        soundBank.checkInit(() => {
            ShawzinAudio.setTimeOffset();
            playbackNote = song.getFirstNoteAfter(playbackStartTick);
            playing = true;
            setPauseEnabled();
            setStopEnabled(true);
            playbackLoop();
        });


    }
    
    function playbackLoop() {
        if (!playing) return;

        var currentTime = soundBank.getCurrentTime();
        updateTrack(currentTime);

        while (playbackNote != null) {
            var time = (playbackNote.tick - playbackStartTick) / Metadata.ticksPerSecond;
            if (time - currentTime > soundScheduleBufferTime) {
                break;
            }

            var noteName = playbackNote.toNoteName();
            soundBank.play(noteName, time);
            playbackNote = playbackNote.next;
        }

        if ((currentTime * Metadata.ticksPerSecond) + playbackStartTick > song.getEndTick() && soundBank.isIdle(currentTime)) {
            stop();

        } else {
            loopTimeout = setTimeout(playbackLoop, playbackLoopInterval)
        }
    }

    function updateTrack(currentTime) {
        Track.setPlaybackTick((currentTime * Metadata.ticksPerSecond) + playbackStartTick);
    }

    function pause() {
        if (playing) {
            playing = false;
            soundBank.stop();
            updateTrack(soundBank.getCurrentTime());
            setPlayEnabled();
        }
    }

    function stop() {
        if (stopEnabled) {
            if (playing) {
                soundBank.stop();
                updateTrack(soundBank.getCurrentTime());
                playing = false;
            }
            Track.clearPlayback();
            setPlayEnabled();
            setStopEnabled(false);
        }
    }


    return {
        registerEventListeners: registerEventListeners,
        updateShawzin: updateSoundBank,
        updateScale: updateSoundBank,
        setSong: setSong,
        isPlaying: function() { return playing; },
        start: start,
        pause: pause,
        stop: stop,
    }
})();