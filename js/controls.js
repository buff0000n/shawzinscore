var Controls = (function() {

    function registerEventListeners() {
        document.body.addEventListener("resize", PageUtils.doonresize);

        document.getElementById("select-shawzin").addEventListener("click", doShawzinSelect, { passive: false });
        document.getElementById("select-scale").addEventListener("click", doScaleSelect, { passive: false });

        function commitNameChange() {
            var input = document.getElementById("metadata-settings-title-text");
            input.blur();
            Model.setSongName(input.value);
        }
        document.getElementById("metadata-settings-title-text").addEventListener("change", commitNameChange, { passive: false });
        document.getElementById("metadata-settings-title-text").addEventListener("keydown", (e) => {
            if ("Enter" == e.code) {
                commitNameChange();
            }
        }, { passive: false });

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
        document.getElementById("metadata-settings-code-text").addEventListener("change", commitSongCodeChange, { passive: false });
        document.getElementById("metadata-settings-code-text").addEventListener("keydown", (e) => {
            if ("Enter" == e.code) {
                commitSongCodeChange();
            }
        }, { passive: false });

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

            // todo: get icon file name from metadata?
            tr.innerHTML = `
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


    // public members
    return  {
        registerEventListeners: registerEventListeners,
        updateSongCode: updateSongCode,
    };
})();


