class ControlKey {
    constructor(name, altText, imgBase = ("control/key_" + name)) {
        this.name = name;
        this.altText = altText;
        this.imgBase = imgBase;
    }
}

class ControlScheme {
    constructor(name, description, img, string1, string2, string3, fret1, fret2, fret3) {
        this.name = name;
        this.description = description;
        this.img = img;
        this.strings = {"1": string1, "2": string2, "3": string3};
        this.frets = {"1": fret1, "2": fret2, "3": fret3};
    }
}

var MetadataUI = (function() {
    var tickSpacing = 20;

    var tabStringXOffsets = {
        "1": 58,
        "2": 170,
        "3": 282,
    }

    var tabFretOffsets = {
        "1": [-22, 0],
        "2": [0, 22],
        "3": [22, 0],
    }

    var fretToRollColors = {
        "": "#BF8340",
        "0": "#BF8340",
        "1": "#C03F3F",
        "2": "#3FC03F",
        "3": "#00B4FF",
        "12": "#D4D41B",
        "23": "#20BA9F",
        "13": "#7B609F",
        "123": "#E27119",
    };

    var key_pc = {
        up: new ControlKey("u", "\u2191"),
        down: new ControlKey("d", "\u2193"),
        left: new ControlKey("l", "\u2190"),
        right: new ControlKey("r", "\u2192"),
        one: new ControlKey("1", "1"),
        two: new ControlKey("2", "2"),
        three: new ControlKey("3", "3"),
        // I'm not putting in one for every dang key.
    }

    // Thanks to (XBOX)cubeof11 for these
    var key_xbx = {
        up: new ControlKey("du", "\uE3E1"),
        down: new ControlKey("dd", "\uE3DF"),
        left: new ControlKey("dl", "\uE3DE"),
        right: new ControlKey("dr", "\uE3E0"),
        l1: new ControlKey("xl1", "\uE3ED"),
        l2: new ControlKey("xl2", "\uE3E6"),
        r1: new ControlKey("xr1", "\uE3EB"),
        r2: new ControlKey("xr2", "\uE3E4"),
        a: new ControlKey("a", "\uE3CE"),
        b: new ControlKey("b", "\uE3CD"),
        x: new ControlKey("x", "\uE3CB"),
        y: new ControlKey("y", "\uE3CC"),
    }

    var key_psn = {
        up: new ControlKey("du", "\u2191"),
        down: new ControlKey("dd", "\u2193"),
        left: new ControlKey("dl", "\u2190"),
        right: new ControlKey("dr", "\u2192"),
        l1: new ControlKey("l1", "LB"),
        l2: new ControlKey("l2", "LT"),
        r1: new ControlKey("r1", "RB"),
        r2: new ControlKey("r2", "RT"),
        square: new ControlKey("square", "\u25A1"),
        cross: new ControlKey("cross", "\u2A2F"),
        circle: new ControlKey("circle", "\u25EF"),
        triangle: new ControlKey("triangle", "\u25B3"),
    }

    var key_nsw = {
        up: new ControlKey("du", "\u2191"),
        down: new ControlKey("dd", "\u2193"),
        left: new ControlKey("dl", "\u2190"),
        right: new ControlKey("dr", "\u2192"),
        l1: new ControlKey("l1", "LB"),
        l2: new ControlKey("l2", "LT"),
        r1: new ControlKey("r1", "RB"),
        r2: new ControlKey("r2", "RT"),
        a: new ControlKey("a", "A"),
        b: new ControlKey("b", "B"),
        x: new ControlKey("x", "X"),
        y: new ControlKey("y", "Y"),
    };

    var controlSchemes = {
        "pc": new ControlScheme(
            "PC Standard",
            "Standard PC control scheme",
            "icon-control-scheme-pc.png",
            key_pc.one, key_pc.two, key_pc.three,
            key_pc.left, key_pc.down, key_pc.right
        ),
        "pc2": new ControlScheme(
            "PC Swapped",
            "PC control scheme with numbers for frets and arrows for strings",
            "icon-control-scheme-pc.png",
            key_pc.left, key_pc.down, key_pc.right,
            key_pc.one, key_pc.two, key_pc.three
        ),
        "psn": new ControlScheme(
            "PSN 2018",
            "Standard Playstation control scheme before Duviri",
            "icon-control-scheme-psn.png",
            key_psn.square, key_psn.cross, key_psn.circle,
            key_psn.l1, key_psn.r1, key_psn.r2
        ),
        "psn2": new ControlScheme(
            "PSN 2023",
            "Standard Playstation control scheme after Duviri",
            "icon-control-scheme-psn.png",
            key_psn.square, key_psn.cross, key_psn.circle,
            key_psn.left, key_psn.down, key_psn.right
        ),
        "xbx": new ControlScheme(
            "XBX 2018",
            "Standard XBox control scheme before Duviri",
            "icon-control-scheme-xbx.png",
            key_xbx.x, key_xbx.a, key_xbx.b,
            key_xbx.l1, key_xbx.r1, key_xbx.r2
        ),
        "xbx2": new ControlScheme(
            "XBX 2023",
            "Standard XBox control scheme after Duviri",
            "icon-control-scheme-xbx.png",
            key_xbx.x, key_xbx.a, key_xbx.b,
            key_xbx.left, key_xbx.down, key_xbx.right
        ),
        "nsw": new ControlScheme(
            "NSW 2018",
            "Standard Nintendo Switch control scheme before Duviri",
            "icon-control-scheme-nsw.png",
            key_nsw.y, key_nsw.b, key_nsw.a,
            key_nsw.l1, key_nsw.r1, key_nsw.r2
        ),
        "nsw2": new ControlScheme(
            "NSW 2023",
            "Standard Nintendo Switch control scheme after Duviri",
            "icon-control-scheme-nsw.png",
            key_nsw.y, key_nsw.b, key_nsw.a,
            key_nsw.left, key_nsw.down, key_nsw.right
        ),
    };

    var noFret = new ControlKey("f0", "no fret", "fret_0");
    var noFretImg = noFret.imgBase + "_s.png";

    var defaultMeter = "4/4";
    var defaultTempo = 120;
    var tempoList = [
        120,
        160,
        240,
        192,
        96,
        80,
        60
    ];

    var defaultUnitsPerLine = 4;
    var maxUnitsPerLine = 100;
    var maxBeatsPerMeasure = 20;

    var playbackSpeeds = [
        0.25,
        0.50,
        1.00,
        1.50,
        2.00
    ];
    var minPlaybackSpeed = 0.1;
    var maxPlaybackSpeed = 10;

    var midiNoteC = 48;
    var midiNoteChord1 = 44;
    var midiNoteChord2 = 46

    return {
        // UI metadata
        tickSpacing: tickSpacing,
        tabStringXOffsets: tabStringXOffsets,
        tabFretOffsets: tabFretOffsets,
        noFret: noFret,
        noFretImg: noFretImg,
        fretToRollColors: fretToRollColors,
        controlSchemes: controlSchemes,
        defaultMeter: defaultMeter,
        defaultTempo: defaultTempo,
        tempoList: tempoList,
        defaultUnitsPerLine: defaultUnitsPerLine,
        maxUnitsPerLine: maxUnitsPerLine,
        maxBeatsPerMeasure: maxBeatsPerMeasure,
        playbackSpeeds: playbackSpeeds,
        minPlaybackSpeed: minPlaybackSpeed,
        maxPlaybackSpeed: maxPlaybackSpeed,
        midiNoteC: midiNoteC,
        midiNoteChord1: midiNoteChord1,
        midiNoteChord2: midiNoteChord2,
    }
})()