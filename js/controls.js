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
            navigator.clipboard.writeText(document.getElementById("metadata-settings-code-text").value).then(
              () => { /* popup? */ },
              () => {}
            );
        }, { passive: false });

        document.getElementById("song-buttons-config").addEventListener("click", doConfigMenu, { passive: false });

        Events.setupTextInput(document.getElementById("config-meter-input"), true);
        document.getElementById("config-meter-input").addEventListener("change", commitMeterChange, { passive: false });

        document.getElementById("config-tempo-input").addEventListener("change", commitTempoChange, { passive: false });

        Events.setupTextInput(document.getElementById("config-leadin-input"), true);
        document.getElementById("config-leadin-input").addEventListener("change", commitLeadinChange, { passive: false });

        document.getElementById("toolbar-buttons-copyurl").addEventListener("click", doCopyUrlMenu, { passive: false });
        initTempoControl();
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

    function doConfigMenu() {
        var menuDiv = document.createElement("div");
        menuDiv.className = "selection-div";

        var tempoMeterDiv = document.getElementById("config-tempo-meter");
        tempoMeterDiv.remove();
        menuDiv.appendChild(tempoMeterDiv);

        var close = Menus.showMenu(menuDiv, this, "Config", false, () => {
            tempoMeterDiv.remove();
            document.getElementById("hidden-things").appendChild(tempoMeterDiv);
        });
    }

    function doCopyUrlMenu() {
        var menuDiv = document.createElement("div");
        menuDiv.className = "selection-div";

        var textField = document.createElement("input");
        textField.size = 30;
        textField.value = Model.buildUrl();
        menuDiv.appendChild(textField);

        var close = Menus.showMenu(menuDiv, this, "Copy Link", false);

        textField.focus();
        textField.select();
        textField.addEventListener("blur", close, { passive: false });
    }

    // public members

    return  {
        registerEventListeners: registerEventListeners,
        updateSongCode: updateSongCode,
    };
})();


