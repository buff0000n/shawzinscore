// Wrapper class for persistent settings

var Settings = (function() {

    // local storage key
    var key = "shawzinscore:settings";

    // default setting values
    var trackReversed = false;
    var controlScheme = MetadataUI.controlSchemes["pc"];
    var darkMode = false;
    var oldMode = false;

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
            if (props.controlScheme != null) {
                controlScheme = props.controlScheme;
            }
            if (props.darkMode != null) {
                darkMode = props.darkMode;
            }
            if (props.oldMode != null) {
                oldMode = props.oldMode;
            }
        }
    }

    function clear() {
        window.localStorage.removeItem(key);
    }

    function save() {
        // build something we can JSONify
        var props = {
            "trackReversed": trackReversed,
            "controlScheme": controlScheme,
            "darkMode": darkMode,
            "oldMode": oldMode,
        }
        // format as JSON and save to local storage
        window.localStorage.setItem(key, JSON.stringify(props));
    }

    return {
        load: load,
        clear: clear,
        isTrackReversed: function() { return trackReversed; },
        setTrackReversed: function(v) { if (v != trackReversed) { trackReversed = v; save(); } },
        getControlScheme: function() { return controlScheme; },
        setControlScheme: function(v) { if (v != controlScheme) { controlScheme = v; save(); } },
        getDarkMode: function() { return darkMode; },
        setDarkMode: function(v) { if (v != darkMode) { darkMode = v; save(); } },
        getOldMode: function() { return oldMode; },
        setOldMode: function(v) { if (v != oldMode) { oldMode = v; save(); } },
    }
})()
