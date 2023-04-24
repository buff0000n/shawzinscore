var TrackBar = (function() {

    trackReverse = false;
    fretEnabled = [false, false, false, false];

    rollKeyButtonDiv = null;

    function registerEventListeners() {
        var dirDiv = document.getElementById("track-direction");
        dirDiv.addEventListener("click", () => {
            setTrackDirection(!trackReverse);
        });

        var chordDiv = document.getElementById("roll-chord-button");
        chordDiv.addEventListener("click", selectChord);

        for (var fret = 0; fret < 4; fret++) {
            var fretDiv = document.getElementById("tab-fret-" + fret);
            fretDiv.fret = fret;
            fretDiv.addEventListener("click", (e) => {
                var topDiv = DomUtils.getParent(e.target, "tab-fret-div");
                toggleFretEnabled(topDiv.fret);
            });
        }

        Events.addKeyDownListener("ArrowLeft", (e) => {
            toggleFretEnabled(1);
            return true;
        }, { passive: false });
        Events.addKeyDownListener("ArrowDown", (e) => {
            toggleFretEnabled(2);
            return true;
        }, { passive: false });
        Events.addKeyDownListener("ArrowRight", (e) => {
            toggleFretEnabled(3);
            return true;
        }, { passive: false });

    }

    function updateScale() {
        var shawzin = Model.getShawzin();
        var scale = Model.getScale();
        var scaleMd = Metadata.shawzinList[shawzin].scales[scale];
        var src = scaleMd.config.img;

        var img = document.getElementById("roll-keyboard");
        PageUtils.setImgSrc(img, src);

        if (rollKeyButtonDiv) {
            rollKeyButtonDiv.remove();
        }
        rollKeyButtonDiv = document.createElement("div");
        rollKeyButtonDiv.style.position="relative;";
        for (var noteName in scaleMd.notes) {
            var note = scaleMd.notes[noteName];
            var boxStyle = Metadata.noteKeyboardBoxes[note];
            var box = document.createElement("div");
            box.className = "roll-keyboard-note";
            box.style = boxStyle;
            box.noteName = noteName;
            box.addEventListener("click", (e) => {
                var noteName = e.target.noteName;
                Playback.playNote(noteName);
            });
            rollKeyButtonDiv.appendChild(box);
        }
        document.getElementById("song-header-roll").appendChild(rollKeyButtonDiv);
    }

    function setTrackDirection(reverse) {
        if (trackReverse == reverse) return;

        var dirDiv = document.getElementById("track-direction");
        var chordDiv = document.getElementById("roll-chord-button");

        if (reverse) {
            PageUtils.setImgSrc(dirDiv.children[0], "icon-dropdown.png");
            dirDiv.style.top = "";
            dirDiv.style.bottom = "0px";

            PageUtils.setImgSrc(chordDiv.children[0], "icon-chord-up.png");
            chordDiv.style.top = "0px";
            chordDiv.style.bottom = "";

        } else {
            PageUtils.setImgSrc(dirDiv.children[0], "icon-dropup.png");
            dirDiv.style.top = "0px";
            dirDiv.style.bottom = "";

            PageUtils.setImgSrc(chordDiv.children[0], "icon-chord-down.png");
            chordDiv.style.top = "";
            chordDiv.style.bottom = "0px";
        }
        trackReverse = reverse;
    }

    function selectChord() {
        console.log("select chord");
    }

    function toggleFretEnabled(fret) {
        setFretEnabled(fret, !fretEnabled[fret]);
    }

    function setFretEnabled(fret, enabled) {
        if (fretEnabled[fret] == enabled) return;
        var div = document.getElementById("tab-fret-" + fret);
        PageUtils.setImgSrc(div.children[0], "fret-" + (enabled ? "enabled-" : "") + fret + ".png");
        if (fret > 0) {
            setFretEnabled(0, false);
            div.children[1].className = enabled ? "tab-fret-button-enabled" : "tab-fret-button";
        } else {
            for (var f = 1; f < 4; f++) {
                setFretEnabled(f, false);
            }
        }
        fretEnabled[fret] = enabled;
    }

    return {
        registerEventListeners: registerEventListeners,
        updateScale: updateScale,
    };
})();