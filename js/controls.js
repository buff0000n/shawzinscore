var Controls = (function() {

    function registerEventListeners() {
        document.body.addEventListener("resize", PageUtils.doonresize);

        document.getElementById("select-shawzin").addEventListener("click", doShawzinSelect, { passive: false });
        document.getElementById("select-scale").addEventListener("click", doScaleSelect, { passive: false });
        document.getElementById("select-control-scheme").addEventListener("click", doControlSchemeSelect, { passive: false });

        Events.setupTextInput(document.getElementById("metadata-settings-title-text"));
        document.getElementById("metadata-settings-title-text").addEventListener("change", commitNameChange, { passive: false });

        Events.setupTextInput(document.getElementById("metadata-settings-code-text"), true);
        document.getElementById("metadata-settings-code-text").addEventListener("change", commitSongCodeChange, { passive: false });

        document.getElementById("pasteCodeButton").addEventListener("click", (e) => {
            navigator.clipboard.readText().then((text) => {
                try {
                    document.getElementById("metadata-settings-code-text").value = text;
                    commitSongCodeChange();
                } catch (e) {
                    PageUtils.showError(e);
                }
            });
        }, { passive: false });

        document.getElementById("copyCodeButton").addEventListener("click", (e) => {
            copyToClipboard(document.getElementById("metadata-settings-code-text").value);
        }, { passive: false });

        document.getElementById("song-buttons-config").addEventListener("click", doConfigMenu, { passive: false });

        Events.setupTextInput(document.getElementById("config-meter-input"), true);
        document.getElementById("config-meter-input").addEventListener("change", commitMeterChange, { passive: false });

        document.getElementById("config-tempo-input").addEventListener("change", commitTempoChange, { passive: false });

        Events.setupTextInput(document.getElementById("config-leadin-input"), true);
        document.getElementById("config-leadin-input").addEventListener("change", commitLeadinChange, { passive: false });

        document.getElementById("toolbar-buttons-shawzintab-download").addEventListener("click", doShawzinTabLink, { passive: false });
        Events.setupTextInput(document.getElementById("config-line-units-input"), true);
        document.getElementById("config-line-units-input").addEventListener("change", commitLineUnitsChange, { passive: false });
        document.getElementById("config-darkmode-input").addEventListener("change", commitDarkModeChange, { passive: false });
        document.getElementById("config-darkmode-input").checked = Settings.getDarkMode();
        document.getElementById("config-oldmode-input").addEventListener("change", commitOldModeChange, { passive: false });
        document.getElementById("config-oldmode-input").checked = Settings.getOldMode();

        document.getElementById("toolbar-buttons-copyurl").addEventListener("click", doCopyUrlMenu, { passive: false });
        document.getElementById("toolbar-buttons-shawzintab").addEventListener("click", doShawzinTab, { passive: false });

        initTempoControl();
    }

    function copyToClipboard(value) {
        // wat
        navigator.clipboard.writeText(value).then(
          () => { /* popup? */ },
          () => {}
        );
    }

    function commitNameChange() {
        var input = document.getElementById("metadata-settings-title-text");
        input.blur();
        Model.setSongName(input.value);
    }

    function commitSongCodeChange() {
        var input = document.getElementById("metadata-settings-code-text");
        var value = input.value;

        if (value != Model.getSongCode()) {
            Model.setSongCode(value);
            // do this after checking if the code has changed, this kicks off another change event for some reason
            input.blur();
            updateSongCode(value);
        }
    }

    function initTempoControl() {
        var input = document.getElementById("config-tempo-input");

        var option = document.createElement("option");
        option.selected = true;
        option.value = "";
        option.innerHTML = `None`;
        input.appendChild(option);

        for (var i = 0; i < MetadataUI.tempoList.length; i++) {
            var tempo = MetadataUI.tempoList[i];
            var option = document.createElement("option");
            option.value = `${tempo}`;
            option.innerHTML = option.value;
            input.appendChild(option);
        }
    }

    function updateSongCode(songCode) {
        var codeField = document.getElementById("metadata-settings-code-text");
        if (codeField.value != songCode) {
            codeField.value = songCode;
        }
        if (songCode && songCode.length > 0) {
            var button = document.getElementById("copyCodeButton");
            button.className = "smallButton";
            button.children[0].className = "icon";
        } else {
            var button = document.getElementById("copyCodeButton");
            button.className = "smallButton-disabled";
            button.children[0].className = "icon-disabled";
        }
    }

    function doShawzinSelect() {
        var selectionDiv = document.createElement("div");
        selectionDiv.className = "selection-div";

        function createSelection(name) {
            var sm = Metadata.shawzinList[name];

            var tr = document.createElement("div");
            tr.className = "selection-item";

            // todo: get icon file name from metadata?
            // todo: tooltip with description?
            tr.innerHTML = `
                <img class="icon" src="img/icon-shawzin-${name}.png" srcset="img2x/icon-shawzin-${name}.png 2x"/>
                ${sm.config.name}
            `;

            tr.onclick = () => {
                Model.setShawzin(name);
                close();
            };

            return tr;
        }

        for (var i = 0; i < Metadata.shawzinOrder.length; i++) {
            var name = Metadata.shawzinOrder[i];
            selectionDiv.appendChild(createSelection(name));
        }

        var close = Menus.showMenu(selectionDiv, this, "Select Shawzin");
    }

    function doScaleSelect() {
        var sm = Metadata.shawzinList[Model.getShawzin()];

        var selectionDiv = document.createElement("div");
        selectionDiv.className = "selection-div";

        function createSelection(name) {
            var tr = document.createElement("div");
            tr.className = "selection-item";

            tr.innerHTML = `
                <img src="img/${sm.scales[name].config.img}" srcset="img2x/${sm.scales[name].config.img} 2x" class="icon" style="height: 2ex; width: auto; margin: 0.5ex;"/>
                ${sm.scales[name].config.name}
            `;

            tr.onclick = () => {
                Model.setScale(name);
                close();
            };

            return tr;
        }


        for (var i = 0; i < Metadata.scaleOrder.length; i++) {
            var name = Metadata.scaleOrder[i];
            selectionDiv.appendChild(createSelection(name));
        }

        var close = Menus.showMenu(selectionDiv, this, "Select Scale");
    }

    function doControlSchemeSelect() {
        var sm = MetadataUI.controlSchemes;

        var selectionDiv = document.createElement("div");
        selectionDiv.className = "selection-div";

        function createSelection(name) {
            var tr = document.createElement("div");
            tr.className = "selection-item";

            tr.innerHTML = `
                <img src="img/${sm[name].img}" srcset="img2x/${sm[name].img} 2x" class="icon" style="margin: 0.5ex;"/>
                ${sm[name].name}
            `;

            tr.onclick = () => {
                Model.setControlScheme(sm[name]);
                close();
            };

            return tr;
        }


        for (var csn in sm) {
            selectionDiv.appendChild(createSelection(csn));
        }

        var close = Menus.showMenu(selectionDiv, this, "Select Control Scheme");
    }

    function commitMeterChange() {
        var input = document.getElementById("config-meter-input");
        var value = input.value ? input.value.trim() : null;

        Model.setMeter(value == null ? null : value.trim());
    }

    function commitTempoChange() {
        var input = document.getElementById("config-tempo-input");
        var value = input.value ? input.value.trim() : null;
        var intValue = (value == null || value.length == 0) ? null : MiscUtils.parseInt(value.trim());

        Model.setTempo(intValue);
    }

    function commitLeadinChange() {
        var input = document.getElementById("config-leadin-input");
        var value = input.value ? input.value.trim() : null;

        Model.setLeadin(value);
    }

    function commitLineUnitsChange() {
        var input = document.getElementById("config-line-units-input");
        var value = input.value ? input.value.trim() : null;

        Model.setUnitsPerLine(value);
        ShawzinTab.setUnitsPerLine(Model.getUnitsPerLine());
        ShawzinTab.render();
    }

    function commitDarkModeChange() {
        var input = document.getElementById("config-darkmode-input");
        var value = input.checked;

        Settings.setDarkMode(value);
        ShawzinTab.setDarkMode(value);
        ShawzinTab.render();
    }

    function commitOldModeChange() {
        var input = document.getElementById("config-oldmode-input");
        var value = input.checked;

        Settings.setOldMode(value);
        ShawzinTab.setOldMode(value);
        ShawzinTab.render();
    }

    function doConfigMenu() {
        var menuDiv = document.createElement("div");
        menuDiv.className = "selection-div";

        var structureDiv = document.getElementById("config-structure");
        structureDiv.remove();
        menuDiv.appendChild(structureDiv);

        var close = Menus.showMenu(menuDiv, this, "Config", false, () => {
            structureDiv.remove();
            document.getElementById("hidden-things").appendChild(structureDiv);
        });
    }

    function doCopyUrlMenu() {
        var menuDiv = document.createElement("div");
        menuDiv.className = "selection-div";

        var textField = document.createElement("input");
        textField.size = 30;
        textField.value = Model.buildUrl();
        menuDiv.appendChild(textField);

        var copyDiv = document.createElement("span");
        copyDiv.classList.add("smallButton");
        copyDiv.classList.add("icon");
        copyDiv.innerHTML = `<img src="img/icon-copy-code.png" srcset="img2x/icon-copy-code.png 2x" class="icon"/>`;
        copyDiv.addEventListener("click", (e) => { copyToClipboard(textField.value); });
        menuDiv.appendChild(copyDiv);

        var close = Menus.showMenu(menuDiv, this, "Copy Link", false);

        textField.focus();
        textField.select();
        textField.scrollLeft = 0;
    }

    function doShawzinTab() {
        var menuDiv = document.createElement("div");
        menuDiv.className = "selection-div";

        var ticksPerBeat = Model.getTempo() ? ((Metadata.ticksPerSecond * 60) / Model.getTempo()) : null;
        if (ticksPerBeat) {
            document.getElementById("config-line-units-label-measures").style.display = "block";
            document.getElementById("config-line-units-label-seconds").style.display = "none";
        } else {
            document.getElementById("config-line-units-label-measures").style.display = "none";
            document.getElementById("config-line-units-label-seconds").style.display = "block";
        }

        var canvas = document.createElement("canvas");
        canvas.width = 1000;
        canvas.height = 1000;
        var container = document.getElementById("shawzintab-container");
        container.innerHTML = "";
        container.appendChild(canvas);

        ShawzinTab.init(
            canvas,
            Model.getSong(),
            Model.getControlScheme(),
            Model.getSongName(),
            ticksPerBeat,
            Model.getMeterTop()
        );

        var unitsPerLine = Model.getUnitsPerLine();
        ShawzinTab.setUnitsPerLine(unitsPerLine ? unitsPerLine : MetadataUI.defaultUnitsPerLine);
        ShawzinTab.setDarkMode(Settings.getDarkMode());
        ShawzinTab.setOldMode(Settings.getOldMode());

        var shawzinTabDiv = document.getElementById("config-shawzintab");
        shawzinTabDiv.remove();
        menuDiv.appendChild(shawzinTabDiv);


        var close = Menus.showMenu(menuDiv, this, "Shawzin Tab", true, () => {
            shawzinTabDiv.remove();
            ShawzinTab.close();
            document.getElementById("hidden-things").appendChild(shawzinTabDiv);
        });

        setTimeout(() => { ShawzinTab.render(); }, 200);
    }

    function doShawzinTabLink() {
        var menuDiv = document.createElement("div");
        menuDiv.className = "selection-div";
        var link = ShawzinTab.generateLink();
        menuDiv.appendChild(link);
        var close = Menus.showMenu(menuDiv, this, "Download Shawzin Tab", false);
    }

    // public members

    return  {
        registerEventListeners: registerEventListeners,
        updateSongCode: updateSongCode,
    };
})();


