// Wrapper class for persistent settings
var Settings = (function() {

    // local storage key
    var key = "shawzinscore:settings";

    // default setting values
    var trackReversed = true;
    var controlScheme = null;
    var darkMode = false;
    var oldMode = false;
    var playbackSpeed = 1.0;
    var oldFretLayout = false;
    var metronomeOn = false;
    var shawzinVolume = 100;
    var metronomeVolume = 100;
    var midiEnabled = false;
    var flareSpoilerLevel = 1;
    var flareDay = 0;

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
            if (props.playbackSpeed != null) {
                playbackSpeed = props.playbackSpeed;
            }
            if (props.oldFretLayout != null) {
                oldFretLayout = props.oldFretLayout;
            }
            if (props.metronomeOn != null) {
                metronomeOn = props.metronomeOn;
            }
            if (props.shawzinVolume != null) {
                shawzinVolume = props.shawzinVolume;
            }
            if (props.metronomeVolume != null) {
                metronomeVolume = props.metronomeVolume;
            }
            if (props.midiEnabled != null) {
                midiEnabled = props.midiEnabled;
            }
            if (props.flareSpoilerLevel != null) {
                flareSpoilerLevel = props.flareSpoilerLevel;
            }
            if (props.flareDay != null) {
                flareDay = props.flareDay;
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
            "controlScheme": controlScheme,
            "darkMode": darkMode,
            "oldMode": oldMode,
            "playbackSpeed": playbackSpeed,
            "oldFretLayout": oldFretLayout,
            "metronomeOn": metronomeOn,
            "shawzinVolume": shawzinVolume,
            "metronomeVolume": metronomeVolume,
            "midiEnabled": midiEnabled,
            "flareSpoilerLevel": flareSpoilerLevel,
            "flareDay": flareDay,
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
        // getter/setter for metronome enabled
        getMetronomeOn: function() { return metronomeOn; },
        setMetronomeOn: function(v) { if (v != metronomeOn) { metronomeOn = v; save(); } },
        // getter/setter for shawzin volume
        getShawzinVolume: function() { return shawzinVolume; },
        setShawzinVolume: function(v) { if (v != shawzinVolume) { shawzinVolume = v; save(); } },
        // getter/setter for metronome volume
        getMetronomeVolume: function() { return metronomeVolume; },
        setMetronomeVolume: function(v) { if (v != metronomeVolume) { metronomeVolume = v; save(); } },
        // getter/setter for midi enabled
        getMidiEnabled: function() { return midiEnabled; },
        setMidiEnabled: function(v) { if (v != midiEnabled) { midiEnabled = v; save(); } },
        // getter/setter for flare spoiler level
        getFlareSpoilerLevel: function() { return flareSpoilerLevel; },
        setFlareSpoilerLevel: function(v) { if (v != flareSpoilerLevel) { flareSpoilerLevel = v; save(); } },
        // getter/setter for flare open day
        getFlareDay: function() { return flareDay; },
        setFlareDay: function(v) { if (v != flareDay) { flareDay = v; save(); } },
    }
})()
