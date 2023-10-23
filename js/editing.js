var Editing = (function() {
    var editing = false;

    function registerEventListeners() {
        document.getElementById("edit-bar").addEventListener("click", toggleEditing, { passive: false });

    }

    function toggleEditing() {
        editing = !editing;

        var buttonImg = document.getElementById("edit-bar-img");
        var toolbar = document.getElementById("edit-toolbar");
        var songScroll = document.getElementById("song-scroll");


        if (editing) {
            PageUtils.setImgSrc(buttonImg, "icon-dropup.png");
            toolbar.style.display = "block";
            songScroll.classList.remove("cursor-pointer");

        } else {
            PageUtils.setImgSrc(buttonImg, "icon-dropdown.png");
            toolbar.style.display = "none";
            songScroll.classList.add("cursor-pointer");
        }

        Track.setEditing(editing);
    }

    return {
        registerEventListeners: registerEventListeners,
    };
})();