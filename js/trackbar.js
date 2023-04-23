var TrackBar = (function() {

    function registerEventListeners() {
    }

    function updateScale() {
        var shawzin = Model.getShawzin();
        var scale = Model.getScale();
        var src = Metadata.shawzinList[shawzin].scales[scale].config.img;

        var img = document.getElementById("roll-keyboard");
        PageUtils.setImgSrc(img, src);
    }

    return {
        registerEventListeners: registerEventListeners,
        updateScale: updateScale,
    };
})();