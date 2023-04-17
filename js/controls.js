var Controls = (function() {

    function registerEventListeners() {
        document.getElementById("select-shawzin").addEventListener("click", doShawzinSelect, { passive: false });
        document.getElementById("select-scale").addEventListener("click", doScaleSelect, { passive: false });
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
        registerEventListeners: registerEventListeners
    };
})();


