var Model = (function() {

    var shawzin = null;
    var song = null;
    var songName = null;

    var updateDelay = 1000;
    var scheduledUpdate = null;

    function init(url) {
        shawzin = PageUtils.getQueryParam("s");
        if (!shawzin) shawzin = Metadata.shawzinOrder[0];
        doSetShawzin(shawzin);

        songName = PageUtils.getQueryParam("n");
        doSetSongName(songName); // can be null

        // todo: compressed format?
        songCode = PageUtils.getQueryParam("c");
        if (songCode) {
            var newSong = new Song();
            newSong.fromString(songCode);
            doSetSong(newSong);
            doUpdateSongCode();
        } else {
            song = new Song();
            doSetScale(Metadata.scaleOrder[0]);
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
    }

    function doUpdateSongCode() {
        var songCode = doGetSongCode();
        var codeField = document.getElementById("metadata-settings-code-text");
        codeField.value = songCode;
        return songCode;
    }

    function doUpdate() {
        var songCode = doUpdateSongCode();
        PageUtils.setQueryParam("n", songName);
        PageUtils.setQueryParam("s", shawzin);
        // todo: compressed format?
        PageUtils.setQueryParam("c", songCode);
    }

    function doSetShawzin(name) {
        shawzin = name;

        var image = document.getElementById("toolbar-shawzin-img");
        image.src = `img/shawzin-${name}-large.png`;
        image.srcset = `img2x/shawzin-${name}-large.png 2x`;

        var text = document.getElementById("select-shawzin-text");
        text.innerHTML = Metadata.shawzinList[shawzin].config.name;
    }

    function getScale() {
        return song.getScale();
    }

    function updateScale() {
        var text = document.getElementById("select-scale-text");
        var scale = song.getScale();
        text.innerHTML = Metadata.shawzinList[shawzin].scales[scale].config.name;
    }

    function doSetScale(name) {
        song.setScale(name);
        updateScale();
    }

    function doSetSongName(name) {
        if (name && name.length == 0) name = null;
        songName = name;
        var text = document.getElementById("metadata-settings-title-text");
        text.value = name;
    }

    function doGetSongCode() {
        return song ? song.toString() : "";
    }

    function doSetSong(newSong) {
//        Track.clearSong();

        song = newSong;
        updateScale();

//        Track.setSong(this.song );
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

        getSongCode: doGetSongCode,
        setSongCode: function(newCode) {
            if (newCode.length == 0) {
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
                    () => { doSetSong(newSong); scheduleUpdate(); },
                    () => { doSetSong(currentSong); scheduleUpdate(); },
                    "Set Song Code"
                );
            }
        },

        stupidPlay: function() {
            // let's just hear something I don't care how dumb this is
            var sb = ShawzinAudio.getSoundBank(shawzin, getScale());
            sb.checkInit(() => {
                ShawzinAudio.setTimeOffset();
                for (var n = 0; n < song.notes.length; n++) {
                    var note = song.notes[n];
                    var noteName = note.toNoteName();
                    var time = note.time / 16;
                    sb.play(noteName, time);
                }
            });
        },

    };
})();


