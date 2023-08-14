var Editing = (function() {
    var editing = false;

    function registerEventListeners() {
        document.getElementById("edit-bar").addEventListener("click", toggleEditing, { passive: false });

    }

    function toggleEditing() {
        editing = !editing;

        var buttonImg = document.getElementById("edit-bar-img");
        var toolbar = document.getElementById("edit-toolbar");

        if (editing) {
            PageUtils.setImgSrc(buttonImg, "icon-dropup.png");
            toolbar.style.display = "block";

        } else {
            PageUtils.setImgSrc(buttonImg, "icon-dropdown.png");
            toolbar.style.display = "none";
        }

        Track.setEditing(editing);
    }

    return {
        registerEventListeners: registerEventListeners,
    };
})();