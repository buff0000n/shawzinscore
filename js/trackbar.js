var TrackBar = (function() {

    trackReversed = false;
    fretEnabled = [false, false, false, false];

    rollKeyButtonDiv = null;

    function registerEventListeners() {
        var dirDiv = document.getElementById("track-direction");
        dirDiv.addEventListener("click", () => {
            var newReversed = !Settings.isTrackReversed();
            setTrackDirection(newReversed);
            Settings.setTrackReversed(newReversed);
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

        setTrackDirection(Settings.isTrackReversed());
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
        // todo: optimize this mess
        rollKeyButtonDiv = document.createElement("div");
        rollKeyButtonDiv.style.position="relative;";
        for (var noteName in scaleMd.notes) {
            var note = scaleMd.notes[noteName];
            var boxStyle = MetadataUI.noteKeyboardBoxes[note];
            var box = document.createElement("div");
            box.className = "roll-keyboard-note";
            box.style.left = boxStyle.left + "px";
            box.style.top = boxStyle.top + "px";
            box.style.width = boxStyle.width + "px";
            box.style.height = boxStyle.height + "px";
            box.noteName = noteName;
            box.boxStyle = boxStyle;
            box.addEventListener("click", (e) => {
                var noteName = e.target.noteName;
                Playback.playNote(noteName);

                var noteBoxStyle = e.target.boxStyle;
                var playBox = document.createElement("div");
                // todo: better way to get the fret and color
                var color = MetadataUI.fretToRollColors[noteName.split("-")[0]];
                playBox.className = "roll-note playRollNote";
                playBox.style.left = (noteBoxStyle.left + (noteBoxStyle.width/2))+ "px";
                playBox.style.top = noteBoxStyle.top + "px";
                playBox.style.width = noteBoxStyle.width + "px";
                playBox.style.height = noteBoxStyle.height + "px";
                playBox.style.backgroundColor = color;
                rollKeyButtonDiv.appendChild(playBox);

                // cleanup
                setTimeout(() => {
                    playBox.remove();
                }, 1000);

            });
            rollKeyButtonDiv.appendChild(box);
        }
        document.getElementById("song-bar-roll").appendChild(rollKeyButtonDiv);
    }

    function setTrackDirection(reverse) {
        if (trackReversed == reverse) return;

        var dirDiv = document.getElementById("track-direction");
        var chordDiv = document.getElementById("roll-chord-button");

        var songBarDiv = document.getElementById("song-bar");
        var songScrollDiv = document.getElementById("song-scroll");

        if (reverse) {
            PageUtils.setImgSrc(dirDiv.children[0], "icon-dropup.png");
            dirDiv.style.top = "0px";
            dirDiv.style.bottom = "";

            PageUtils.setImgSrc(chordDiv.children[0], "icon-chord-up.png");

            songBarDiv.remove();
            DomUtils.insertAfter(songBarDiv, songScrollDiv);

        } else {
            PageUtils.setImgSrc(dirDiv.children[0], "icon-dropdown.png");
            dirDiv.style.top = "";
            dirDiv.style.bottom = "0px";

            PageUtils.setImgSrc(chordDiv.children[0], "icon-chord-down.png");

            songBarDiv.remove();
            DomUtils.insertBefore(songBarDiv, songScrollDiv);
        }

        trackReversed = reverse;
        Track.setReversed(reverse);
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