var Track = (function() {

    var tab = null;
    var roll = null;
    var viewHeight = null;
    var visibleTicks = null;
    var tickSpacing = Metadata.tickSpacing;

    var bpm = null;
    var meterBar = null;
    var meterBeat = null;

    var capBar = null;

    var bars = [];
    var tickCapacity = 0;

    function registerEventListeners() {
        scroll = document.getElementById("song-scroll");
        tab = document.getElementById("song-scroll-tab");
        roll = document.getElementById("song-scroll-roll");

        scroll.addEventListener("scroll", onscroll);

        resize();
        capBar = [
            buildBar(true, "tab"),
            buildBar(true, "roll")
        ];

        tab.appendChild(capBar[0]);
        roll.appendChild(capBar[1]);

        bpm = 120;
        meterBar = 4;
        meterBeat = 4;
        ensureTickCapacity(visibleTicks - 1);
    }

    function resize() {
        viewHeight = scroll.getBoundingClientRect().height;
        visibleTicks = Math.ceil(viewHeight / tickSpacing);
    }

    function onscroll() {
        var startTick = Math.ceil(scroll.scrollTop / tickSpacing);
        var endTick = startTick + visibleTicks;
        if (endTick >= tickCapacity) {
            ensureTickCapacity(startTick + visibleTicks);
        } else if (endTick < tickCapacity) {
            // check for notes present
            trimTickCapacity(startTick + visibleTicks);
        }
    }

    function buildMarker(png, top) {
        var marker = document.createElement("img");
        marker.src = "img/" + png;
        marker.srcset="img2x/" + png + " 2x";
        marker.className = "measure-marker";
        marker.style.top = top + "px";
        return marker;
    }

    function buildBar(first, pngSuffix) {
        var div = document.createElement("div");
        div.className = "measure-spacer";

        if (!bpm) {
            var ticks = visibleTicks;
            div.style.height = (ticks * tickSpacing) + "px";
            if (first) {
                div.appendChild(buildMarker("measure-marker-1-" + pngSuffix + ".png", 0));
            }
            div.ticks = ticks;

        } else {
            var ticksPerBeat = (60 * Metadata.ticksPerSecond) / bpm;
            var beats = meterBar;
            div.style.height = (beats * ticksPerBeat * tickSpacing) + "px";
            div.appendChild(buildMarker("measure-marker-1-" + pngSuffix + ".png", 0));

            for (var b = 1; b < beats; b++) {
                div.appendChild(buildMarker("measure-marker-2-" + pngSuffix + ".png", b * ticksPerBeat * tickSpacing));
            }

            div.ticks = ticksPerBeat * beats;
        }

        return div;
    }

    function insertBar() {
        var bar = [
            buildBar(bars.length == 1, "tab"),
            buildBar(bars.length == 1, "roll")
        ];

        bars.push(bar);
        capBar[0].parentNode.insertBefore(bar[0], capBar[0]);
        capBar[1].parentNode.insertBefore(bar[1], capBar[1]);
        tickCapacity += bar[0].ticks;
    }

    function removeBar() {
        var bar = bars.pop();
        bar[0].remove();
        bar[1].remove();
        tickCapacity -= bar[0].ticks;
    }

    function ensureTickCapacity(ticks) {
        while (tickCapacity < Metadata.maxTickLength && tickCapacity <= ticks) {
            insertBar();
        }
    }

    function trimTickCapacity(ticks) {
        while (tickCapacity > ticks + visibleTicks) {
            removeBar();
        }
    }



    // public members
    return  {
        registerEventListeners: registerEventListeners
    };
})();


