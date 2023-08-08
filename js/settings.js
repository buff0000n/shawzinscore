// Wrapper class for persistent settings
var Settings = (function() {

    // local storage key
    var key = "shawzinscore:settings";

    // default setting values
    var trackReversed = true;
    var showFrets = false;
    var controlScheme = null;
    var darkMode = false;
    var oldMode = false;
    var playbackSpeed = 1.0;
    var oldFretLayout = false;

    function load() {
        // load the local storage item
        var json = window.localStorage.getItem(key);
        if (json) {
            // parse json
            var props = JSON.parse(json);

            // check for each setting and override the default if present
            if (props.trackReversed != null) {
                trackReversed = props.trackReversed;
            }
            if (props.showFrets != null) {
                showFrets = props.showFrets;
            }
            if (props.controlScheme != null) {
                controlScheme = props.controlScheme;
            }
            if (props.darkMode != null) {
                darkMode = props.darkMode;
            }
            if (props.oldMode != null) {
                oldMode = props.oldMode;
            }
            if (props.playbackSpeed != null) {
                playbackSpeed = props.playbackSpeed;
            }
            if (props.oldFretLayout != null) {
                oldFretLayout = props.oldFretLayout;
            }
        }
    }

    // clear all settings, doesn't take effect until a reload
    function clear() {
        window.localStorage.removeItem(key);
    }

    function save() {
        // build something we can JSONify
        var props = {
            "trackReversed": trackReversed,
            "showFrets": showFrets,
            "controlScheme": controlScheme,
            "darkMode": darkMode,
            "oldMode": oldMode,
            "playbackSpeed": playbackSpeed,
            "oldFretLayout": oldFretLayout,
        }
        // format as JSON and save to local storage
        window.localStorage.setItem(key, JSON.stringify(props));
    }

    return {
        // load settings, called once when the page is loaded
        load: load,
        // clear all settings, not actually called from the UI but useful for testing
        clear: clear,
        // getter/setter for track direction setting
        isTrackReversed: function() { return trackReversed; },
        setTrackReversed: function(v) { if (v != trackReversed) { trackReversed = v; save(); } },
        // getter/setter for show frets/strings setting
        isShowFrets: function() { return showFrets; },
        setShowFrets: function(v) { if (v != showFrets) { showFrets = v; save(); } },
        // getter/setter for control scheme setting
        getControlScheme: function() { return controlScheme; },
        setControlScheme: function(v) { if (v != controlScheme) { controlScheme = v; save(); } },
        // getter/setter for shawzin tab dark mode setting
        getDarkMode: function() { return darkMode; },
        setDarkMode: function(v) { if (v != darkMode) { darkMode = v; save(); } },
        // getter/setter for shawzin tab old mode setting
        getOldMode: function() { return oldMode; },
        setOldMode: function(v) { if (v != oldMode) { oldMode = v; save(); } },
        // getter/setter for shawzin tab old mode setting
        getPlaybackSpeed: function() { return playbackSpeed; },
        setPlaybackSpeed: function(v) { if (v != playbackSpeed) { playbackSpeed = v; save(); } },
        // getter/setter for old fret layout
        getOldFretLayout: function() { return oldFretLayout; },
        setOldFretLayout: function(v) { if (v != oldFretLayout) { oldFretLayout = v; save(); } },
    }
})()
