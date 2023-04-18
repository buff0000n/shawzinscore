var Model = (function() {

    var shawzin = null;
    var scale = null;
    var songName = null;
    var song;

    function doSetShawzin(name) {
        shawzin = name;

        var image = document.getElementById("toolbar-shawzin-img");
        image.src = `img/shawzin-${name}-large.png`;
        image.srcset = `img2x/shawzin-${name}-large.png 2x`;

        var text = document.getElementById("select-shawzin-text");
        text.innerHTML = Metadata.shawzinList[shawzin].config.name;
    }


    function doSetScale(name) {
        scale = name;

        var text = document.getElementById("select-scale-text");
        text.innerHTML = Metadata.shawzinList[shawzin].scales[scale].config.name;
    }

    function doSetSongName(name) {
        songName = name;
        var text = document.getElementById("metadata-settings-title-text");
        text.value = name;
    }

    function initDefaults() {
        doSetShawzin(Metadata.shawzinOrder[0]);
        doSetScale(Metadata.scaleOrder[0]);
    }

    // public members
    return  {
        initDefaults: initDefaults,

        getShawzin: function() { return shawzin; },
        setShawzin: function(newShawzin) {
            var current = shawzin;
            if (newShawzin != current) {
                Undo.doAction(
                    () => { doSetShawzin(newShawzin); },
                    () => { doSetShawzin(current); },
                    "Set Shawzin"
                );
            }
        },

        getScale: function() { return scale; },
        setScale: function(newScale) {
            var current = scale;
            if (newScale != current) {
                Undo.doAction(
                    () => { doSetScale(newScale); },
                    () => { doSetScale(current); },
                    "Set Scale"
                );
            }
        },

        getSongName: function() { return songName; },
        setSongName : function(newName) {
            var current = songName;
            if (newName != current) {
                Undo.doAction(
                    () => { doSetSongName(newName); },
                    () => { doSetSongName(current); },
                    "Set Song Name"
                );
            }
        },

    };
})();


