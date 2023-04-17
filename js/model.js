var Model = (function() {

    var shawzin = null;
    var scale = null;

    function setShawzin(name) {
        shawzin = name;

        var image = document.getElementById("toolbar-shawzin-img");
        image.src = `img/shawzin-${name}-large.png`;
        image.srcset = `img2x/shawzin-${name}-large.png 2x`;

        var text = document.getElementById("select-shawzin-text");
        text.innerHTML = Metadata.shawzinList[shawzin].config.name;
    }


    function setScale(name) {
        scale = name;

        var text = document.getElementById("select-scale-text");
        text.innerHTML = Metadata.shawzinList[shawzin].scales[scale].config.name;
    }

    function initDefaults() {
        setShawzin(Metadata.shawzinOrder[0]);
        setScale(Metadata.scaleOrder[0]);
    }

    // public members
    return  {
        initDefaults: initDefaults,
        getShawzin: function() { return shawzin; },
        setShawzin: setShawzin,
        getScale: function() { return scale; },
        setScale: setScale,
    };
})();


