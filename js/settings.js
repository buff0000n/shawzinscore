// Wrapper class for persistent settings

var Settings = (function() {

    // local storage key
    var key = "shawzinscore:settings";

    // default setting values
    var trackReversed = false;

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
        }
    }

    function clear() {
        window.localStorage.removeItem(key);
    }

    function save() {
        // build something we can JSONify
        var props = {
            "trackReversed": trackReversed
        }
        // format as JSON and save to local storage
        window.localStorage.setItem(key, JSON.stringify(props));
    }

    return {
        load: load,
        clear: clear,
        isTrackReversed: function() { return trackReversed; },
        setTrackReversed: function(v) { if (v != trackReversed) { trackReversed = v; save(); } },
    }
})()
