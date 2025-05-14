var Duviri = (function() {
    function init() {
        // javascript is working, clear the warning
        PageUtils.clearErrors();

        // register a global error handler
        window.onerror = PageUtils.windowOnError;

        // do the heavy initialization slightly later
        // this is so the "please enable javascript" warning can get hidden faster
        setTimeout(() => {
            // load preferences
            Settings.load();

            // build the mood menu
            buildMoodMenu();
            // build the map dots
            buildMapDots();
            // initialize the dots
            setMood(Settings.getDuviriMood());

            // build all the shawzin station sections
            buildStations();
            // initialize the checkbox/dot colors
            updateStationsChecked();

            // set up generic event listeners
            var resetButton = document.getElementById("duviri-reset-station-checks");
            resetButton.addEventListener("click", resetButtonClicked, { passive: "false" });

            // se need this so the normal ways of exiting a pop-up are available
            Events.registerEventListeners();

            // can't figure out how to make it resize nicely with CSS, so javascript it is
            Events.addCombinedResizeListener(resize);
        }, 100);
    }

    function buildMoodMenu() {
        // Oh man I didn't want to write three hundred lines of javascript that mostly just builds HTML
        // but here we are
        var container = document.getElementById("change-duviri-mood")
        for (var i = 0; i < DuviriMetadata.moodList.length; i++) {
            var mood = DuviriMetadata.moodList[i];
            var button = document.createElement("span");
            button.id = "duviri-mood-" + mood;
            button.class = "button";
            // event listener for mood ratio buttons
            button.mood = mood;
            button.addEventListener("click", moodClicked, { passive: false });
            container.appendChild(button);

            var input = document.createElement("input");
            input.id = "duviri-mood-input-" + mood;
            input.type = "radio";
            input.name = "duviri-mood";
            button.appendChild(input);

            var label = document.createElement("span");
            label.class = "fieldTitle";
            label.innerHTML = mood;
            button.appendChild(label);

        }
    }

    function buildMapDots() {
        var container = document.getElementById("duviri-map-container");
        container.style.position = "relative";
        // since z-index doesn't work to keep tooltips from appearing underneath other dots, add them to the
        // container so that lower dots are added before higher dots
        var list = DuviriMetadata.stations.
            // zip with the original index first so we have it for the event handler
            map(function(e, i) { return [e, i]}).
            // sort descending by y coordinates
            sort((a, b) => { return -(a[0].coordinates.y - b[0].coordinates.y); });

        for (var i = 0; i < list.length; i++) {
            var station = list[i][0];
            var stationIndex = list[i][1];

            var dot = document.createElement("div");
            dot.id = "duviri-station-dot-container-" + stationIndex;
            dot.className = "duviri-map-dot tooltip";
            // coordinate numbers are based on the full resolution images, which are the 2x ones,
            // so we have to divide them by 2
            dot.style.top = (station.coordinates.y / 2) + "px";
            dot.style.left = (station.coordinates.x / 2) + "px";
            // event listener for map dots
            dot.stationIndex = stationIndex;
            dot.addEventListener("click", mapDotClicked, { passive: false })
            container.appendChild(dot);

            var dotImg = document.createElement("img");
            dotImg.id = "duviri-station-dot-" + stationIndex;
            dotImg.src = "img/dot-red.png";
            dotImg.srcset = "img2x/dot-red.png 2x";
            dot.appendChild(dotImg);

            var tooltip = document.createElement("div");
            tooltip.className = "tooltiptextbottom";
            tooltip.innerHTML = station.name + "<br/>" + buildDifficultyStars(station);
            dot.appendChild(tooltip);
        }
    }

    function updateMapDots() {
        var mood = Settings.getDuviriMood();
        var stationsChecked = Settings.getDuviriStationsChecked();
        for (var i = 0; i < DuviriMetadata.stations.length; i++) {
            var station = DuviriMetadata.stations[i];
            var dot = document.getElementById("duviri-station-dot-" + i);
            if (stationsChecked[i] == 'Y') {
                dot.src = "img/dot-green.png";
                dot.srcset = "img2x/dot-green.png 2x";
            } else {
                dot.src = "img/dot-red.png";
                dot.srcset = "img2x/dot-red.png 2x";
            }
            if (station.moods.includes(mood)) {
                dot.style.opacity = 1.0;
            } else {
                dot.style.opacity = 0.25;
            }
        }
    }

    function setMood(mood) {
        document.getElementById("duviri-mood-input-" + mood).checked = true;

        var image = document.getElementById("duviri-map-image");

        image.src = `img/map-${mood.toLowerCase()}.jpg`;
        image.srcset = `img2x/map-${mood.toLowerCase()}.jpg 2x`;

        Settings.setDuviriMood(mood);
        updateMapDots();
    }

    function showStation(stationIndex) {
        for (var s = 0; s < DuviriMetadata.stations.length; s++) {
            var container = document.getElementById("duviri-station-" + s);
            container.style.display = s == stationIndex ? "" : "none";
        }
    }

    function buildStations() {
        var container = document.getElementById("duviri-stations");

        for (var s = 0; s < DuviriMetadata.stations.length; s++) {
            container.appendChild(buildStation(s));
        }
    }

    function buildStation(stationIndex) {
        var station = DuviriMetadata.stations[stationIndex];
        // oy
        var container = document.createElement("div");
        container.id = "duviri-station-" + stationIndex;
        container.className = "duviri-station";
        container.style.display = "none";

        {
            var titleBar = document.createElement("div");
            titleBar.className = "duviri-station-title";
            container.appendChild(titleBar);

            {
                var checkButton = document.createElement("span");
                checkButton.className = "darkButton tooltip";
                // event listener for station checkbox
                checkButton.stationIndex = stationIndex;
                checkButton.addEventListener("click", stationCheckClicked, { passive: "false" });
                titleBar.appendChild(checkButton);

                var checkBoxImage = document.createElement("img");
                checkBoxImage.id = "duviri-station-checked-" + stationIndex;
                checkBoxImage.className = "icon";
                //checkBoxImage.src = "img/check-no.png";
                //checkBoxImage.srcset = "img2x/check-no.png 2x";
                checkButton.appendChild(checkBoxImage);

                var tooltip = document.createElement("span");
                tooltip.className = "tooltiptextbottom";
                tooltip.innerHTML = "Mark this station as done";
                checkButton.appendChild(tooltip);
            }

            var title = document.createElement("span");
            title.className = "duviri-station-title-text";
            title.innerHTML = station.name;
            titleBar.appendChild(title);
        }

        {
            var thumbnailListContainer = document.createElement("div");
            thumbnailListContainer.className = "image-thumbnail-list-container";
            container.appendChild(thumbnailListContainer);

            var thumbnailList = document.createElement("div");
            thumbnailList.id = "image-thumbnail-list-" + stationIndex;
            thumbnailList.className = "image-thumbnail-list";
            thumbnailListContainer.appendChild(thumbnailList);

            var imageList = [];
            for (var t = 0; t < station.pics.length; t++) {
                var pic = station.pics[t];
                imageList.push(`img/${pic}.jpg`);
            }

            for (var t = 0; t < station.pics.length; t++) {
                var pic = station.pics[t];
                var span = document.createElement("span");
                span.className = "image-thumbnail";
                // event listener for image thumbnail
                span.imageList = imageList;
                span.imageIndex = t;
                span.title = station.name;
                span.addEventListener("click", imageClicked, { passive: "false" });
                thumbnailList.appendChild(span);

                var image = document.createElement("img");
                image.className = "image-thumbnail-image";
                image.src = `img/${pic}-thumb.jpg`;
                image.srcset = `img2x/${pic}-thumb.jpg 2x`;
                span.appendChild(image);
            }
        }

        {
            var about = document.createElement("div");
            about.className = "station-duviri-about";
            container.appendChild(about);

            var ul = document.createElement("ul");
            about.appendChild(ul);

            function buildInfoItem(name, text) {
                var li = document.createElement("li");
                var strong = document.createElement("strong");
                strong.innerHTML = name + ": ";
                li.appendChild(strong);

                var span = document.createElement("span");
                span.innerHTML = text;
                li.appendChild(span);

                return li;
            }

            ul.appendChild(buildInfoItem("Location", station.location));

            // generate a "not available" section if the station is not available in all moods
            if (station.moods.length < 5) {
                var notAvailableMoods = "";
                for (var m = 0; m < DuviriMetadata.moodList.length; m++) {
                    if (station.moods.indexOf(DuviriMetadata.moodList[m]) < 0) {
                        if (notAvailableMoods != "") notAvailableMoods += ", ";
                        notAvailableMoods += DuviriMetadata.moodList[m];
                    }
                }
                ul.appendChild(buildInfoItem("Not Available In", notAvailableMoods));
            }

            ul.appendChild(buildInfoItem("Difficulty", buildDifficultyStars(station)));

            var songLi = buildInfoItem("Song", station.song.name);
            ul.appendChild(songLi);

            var ul2 = document.createElement("ul");
            songLi.appendChild(ul2);

            function buildSongLinkItem(text, code) {
                var li = document.createElement("li");
                li.appendChild(buildSongLink(text, "courtly", station.song.name, station.song.meter, station.song.tempo, code));
                return li;
            }

            ul2.append(buildSongLinkItem("Normal", station.song.code.normal));
            ul2.append(buildSongLinkItem("Virtuoso", station.song.code.virtuoso));
        }

        return container;
    }

    function buildDifficultyStars(station) {
        var stars = "";
        var color = DuviriMetadata.difficultyColors[station.difficulty - 1];
        for (var i = 0; i < station.difficulty; i++) {
            stars += `<img class="icon" src="img/star-${color}.png" srcset="img2x/star-${color}.png 2x"/>`;
        }
        for (var i = station.difficulty; i < 5; i++) {
            stars += `<img class="icon" src="img/star-gray.png" srcset="img2x/star-gray.png 2x"/>`;
        }
        return stars;
    }

    function updateStationsChecked() {
        var stationsChecked = Settings.getDuviriStationsChecked();

        for (var s = 0; s < DuviriMetadata.stations.length; s++) {
            var checkBoxImage = document.getElementById("duviri-station-checked-" + s);
            if (stationsChecked[s] == 'Y') {
                checkBoxImage.src = "img/check-yes.png";
                checkBoxImage.srcset = "img2x/check-yes.png 2x";

            } else {
                checkBoxImage.src = "img/check-no.png";
                checkBoxImage.srcset = "img2x/check-no.png 2x";
            }
        }

        var resetButton = document.getElementById("duviri-reset-station-checks");
        resetButton.style.display = stationsChecked.indexOf("Y") >= 0 ? "" : "none";
    }

    function buildSongLink(text, shawzin, title, meter, tempo, code) {
        var map = {
            "s": shawzin,
            "n": title,
            "m": meter,
            "t": tempo,
            "c": code
        };
        var query = PageUtils.buildQueryWithMap(map)
        var link = "../" + query;

        var a = document.createElement("a");
        a.target = "_blank";
        a.href = link;
        a.innerHTML = text;
        return a;
    }

    function replaceChar(string, index, char) {
        // ugh why not work
        // string[index] = char;
        return string.slice(0, index) + char + string.slice(index + 1);
    }

    function toggleStationChecked(stationIndex) {
        var stationsChecked = Settings.getDuviriStationsChecked();
        var checkBoxImage = document.getElementById("duviri-station-checked-" + stationIndex);
        if (stationsChecked[stationIndex] == 'Y') {
            stationsChecked = replaceChar(stationsChecked, stationIndex, 'N');

        } else {
            stationsChecked = replaceChar(stationsChecked, stationIndex, 'Y');
        }

        Settings.setDuviriStationsChecked(stationsChecked);

        updateMapDots();
        updateStationsChecked();
    }

    // flag for when loading an image is in progress
    var imageLoading = false;

    // todo: this should probably be its own module
    function showFullImage(button, title, imageList, startIndex) {
        // short circuit
        if (imageLoading) return;

        // state
        // current image index
        var currentIndex = startIndex;
        // currently image
        var img = null;
        // pending next image
        var nextImg = null;
        // menu close callback
        var close = null;

        // left and right arrows
        var arrowImgLeft = document.createElement("img");
        arrowImgLeft.className = "icon-button";
        arrowImgLeft.srcset = "img2x/arrow-left-big.png 2x";
        arrowImgLeft.src = "img/icon-arrow-left-big.png";

        var arrowImgRight = document.createElement("img");
        arrowImgRight.className = "icon-button";
        arrowImgRight.srcset = "img2x/arrow-right-big.png 2x";
        arrowImgRight.src = "img/icon-arrow-right-big.png";

        // use the ResizeObserver API to find out when the image's parent is resized
        var resizeObserver = new ResizeObserver((list) => {
            // we get a list, it's only gonna have one element in it
            for (var e of list) {
                // get the target element
                var target = e.target;
                // get the element's bounds
                var bcr = target.getBoundingClientRect();
                // scroll so the center of the image is in the center of the containing element
                target.scrollTo(img.width/2 - bcr.width/2, img.height/2 - bcr.height/2);

                var bcr2 = target.parentElement.getBoundingClientRect();
                // subtract the container padding, scrollbar width, arrow placement
                arrowImgRight.style.left = (bcr2.width - 8 - 32) + "px";
                // add the container padding, arrow placement
                arrowImgLeft.style.left = (8 + 32) + "px";
                // arrow vertical placing is easy
                arrowImgRight.style.top = (bcr2.height/2) + "px";
                arrowImgLeft.style.top = (bcr2.height/2) + "px";
            }
        });

        // register an onload function.  We can't lay out the pop-up menu unless the image is loaded and we
        // know how big it is
        function firstOnLoad() {
            img = nextImg;
            // create a menu around the image
            close = Menus.showMenu(img, button, title, true, () => {
                // not sure this necessary, but clean up the resize observer when the menu is closed
                resizeObserver.unobserve(img.parentElement);
                Events.removeKeyDownListener("ArrowLeft", moveLeft);
                Events.removeKeyDownListener("ArrowRight", moveRight);
            });
            var parent = img.parentElement;
            // start observing the image's parent, which should exist at this point
            resizeObserver.observe(parent);

            // hack: switch the scroll div's parent to relative and add arrow buttons
            parent.parentElement.style.position = "relative";
            parent.parentElement.appendChild(arrowImgRight);
            parent.parentElement.appendChild(arrowImgLeft);

            // clean up UI and state
            loadingDone();
        }

        // subsequent onloads just need to switch out the img
        function secondOnLoad() {
            // get the current img parent
            var parent = img.parentElement;
            // remove the old image and add the new one
            parent.removeChild(img);
            parent.appendChild(nextImg);
            // update state
            img = nextImg;

            // clean up UI and state
            loadingDone();
        }

        // event handlers for arrow buttons and arrow keys
        function moveLeft(e) {
            if (currentIndex > 0) startLoading(currentIndex - 1);
            return false;
        }

        function moveRight(e) {
            if (currentIndex < imageList.length - 1) startLoading(currentIndex + 1);
            return false;
        }

        // register event handlers
        arrowImgLeft.addEventListener("click", moveLeft, { passive: "false" });
        arrowImgRight.addEventListener("click", moveRight, { passive: "false" });
        Events.addKeyDownListener("ArrowLeft", moveLeft);
        Events.addKeyDownListener("ArrowRight", moveRight);

        function loadingDone() {
            // reset the flag
            imageLoading = false;
            // reset cursors
            button.style.cursor = "pointer";
            img.style.cursor = "";
            arrowImgLeft.style.cursor = "pointer";
            arrowImgRight.style.cursor = "pointer";
            // update which arrow buttons are displayed based in the index
            arrowImgLeft.style.display = (currentIndex > 0) ? "" : "none";
            arrowImgRight.style.display = (currentIndex < imageList.length - 1) ? "" : "none";
            // event listener to close the menu if the image is clicked
            img.addEventListener("click", close, { passive: "false" });
        }

        function startLoading(index) {
            // set the flag
            imageLoading = true;
            // lazy way: just set the cursor styles everywhere to signify something is loading
            button.style.cursor = "wait";
            arrowImgLeft.style.cursor = "wait";
            arrowImgRight.style.cursor = "wait";
            if (img) img.style.cursor = "wait";

            // update state
            currentIndex = index;
            // create new image element
            nextImg = document.createElement("img");
            // set the onload callback depending on whether this is the first image or a change in image
            nextImg.onload = !img ? firstOnLoad : secondOnLoad;

            // setting src starts the loading process and will cause the onload callback to be called once loaded
            nextImg.src = imageList[index];
        }

        // initialize with the starting image
        startLoading(startIndex);
    }

    // event listener functions

    // recalculate map and thumbnail box sizes
    function resize(w, h) {
        {
            // todo: not a fudge
            var margin = 100;
            var width = w - margin;

            var image = document.getElementById("duviri-map-image");
            var mapWidth = 500;
            var mapHeight = 450;

            var scale = width > mapWidth ? 1.0 : width / mapWidth;
            image.width = mapWidth * scale;
            image.height = mapHeight * scale;
            // have to relocate and scale the dots without also scaling their tooltips
            for (var i = 0; i < DuviriMetadata.stations.length; i++) {
                var station = DuviriMetadata.stations[i];
                var dot = document.getElementById("duviri-station-dot-container-" + i);
                dot.style.top = ((station.coordinates.y / 2) * scale) + "px";
                dot.style.left = ((station.coordinates.x / 2) * scale) + "px";

                var dotImg = document.getElementById("duviri-station-dot-" + i);
                dotImg.style.scale = (100 * scale) + "%";
            }
        }

        {
            // todo: not a fudge
            var margin = 80;
            var width = w - margin;
            var maxWidth = 750;

            if (width > maxWidth) {
                width = maxWidth;
            }

            for (var i = 0; i < DuviriMetadata.stations.length; i++) {
                var tnl = document.getElementById("image-thumbnail-list-" + i);
                tnl.style.width = width + "px";
            }
        }
    }

    function stationCheckClicked(e) {
        var e = e || window.event;
        var stationIndex = e.currentTarget.stationIndex;
        toggleStationChecked(stationIndex);
    }

    function moodClicked(e) {
        var e = e || window.event;
        var mood = e.currentTarget.mood;
        setMood(mood);
    }

    function mapDotClicked() {
        var e = e || window.event;
        var stationIndex = e.currentTarget.stationIndex;
        showStation(stationIndex);
    }

    function checkButtonClicked() {
        var e = e || window.event;
        var stationIndex = e.currentTarget.stationIndex;
        toggleStationChecked(stationIndex);
    }

    function imageClicked() {
        var e = e || window.event;
        var imageList = e.currentTarget.imageList;
        var imageIndex = e.currentTarget.imageIndex;
        var title = e.currentTarget.title;
        showFullImage(e.currentTarget, title, imageList, imageIndex);
    }

    function resetButtonClicked() {
        Settings.setDuviriStationsChecked("NNNNNNNNNNNN");
        updateMapDots();
        updateStationsChecked();
    }

    return {
        init: init
    }
})();

var init = Duviri.init;