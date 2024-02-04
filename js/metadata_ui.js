class ControlKey {
    constructor(id, altText, diag_x=null, diag_y=null, imgBase = ("control/key_" + id)) {
        this.id = id;
        this.altText = altText;
        this.diag_x = diag_x;
        this.diag_y = diag_y;
        this.imgBase = imgBase;
    }
}

class ControlScheme {
    constructor(id, name, description, platformId, img, string1, string2, string3, fret1, fret2, fret3, custom=false) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.platformId = platformId;
        this.img = img;
        this.strings = {"1": string1, "2": string2, "3": string3};
        this.frets = {"1": fret1, "2": fret2, "3": fret3};
        this.custom = custom;
    }
}

var MetadataUI = (function() {
    var tickSpacing = 20;

    var tabStringXOffsets = {
        "1": 58,
        "2": 170,
        "3": 282,
    };

    var tabFretOffsets = {
        "1": [-22, 0],
        "2": [0, 22],
        "3": [22, 0],
    };

    var tabFretOffsets_Old = {
        "1": [-34, -38],
        "2": [0, -38],
        "3": [34, -38],
    };

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

    platforms = {
        pc: {
            id: "pc",
            name: "PC",
            console: false,
            image: "icon-control-scheme-pc.png",
            diagram: null,
            keys: {
                up: new ControlKey("up", "\u2191", 0, 0, "control/key_u"),
                down: new ControlKey("down", "\u2193", 0, 0, "control/key_d"),
                left: new ControlKey("left", "\u2190", 0, 0, "control/key_l"),
                right: new ControlKey("right", "\u2192", 0, 0, "control/key_r"),
                one: new ControlKey("one", "1", 0, 0, "control/key_1"),
                two: new ControlKey("two", "2", 0, 0, "control/key_2"),
                three: new ControlKey("three", "3", 0, 0, "control/key_3"),
                // I'm not putting in one for every dang key.
            }
        },
        psn: {
            id: "psn",
            name: "Playstation",
            console: true,
            image: "icon-control-scheme-psn.png",
            diagram: {
                image: "control/diagram_psn.png",
                width: 672,
                height: 312
            },
            defaultTemplate: "psn2",
            keys: {
                du: new ControlKey("du", "\u2191", 128, 128),
                dd: new ControlKey("dd", "\u2193", 128, 176),
                dl: new ControlKey("dl", "\u2190", 128, 152),
                dr: new ControlKey("dr", "\u2192", 128, 200),
                l1: new ControlKey("l1", "LB", 128, 72),
                l2: new ControlKey("l2", "LT", 128, 48),
                r1: new ControlKey("r1", "RB", 544, 72),
                r2: new ControlKey("r2", "RT", 544, 48),
                square: new ControlKey("square", "\u25A1", 544, 184),
                cross: new ControlKey("cross", "\u2A2F", 544, 160),
                circle: new ControlKey("circle", "\u25EF", 544, 136),
                triangle: new ControlKey("triangle", "\u25B3", 544, 112),
                ls: new ControlKey("ls", "LS", 128, 256),
                rs: new ControlKey("rs", "RS", 544, 256),
            }
        },
        xbx: {
            id: "xbx",
            name: "XBox",
            console: true,
            image: "icon-control-scheme-xbx.png",
            diagram: {
                image: "control/diagram_xbx.png",
                width: 672,
                height: 312
            },
            defaultTemplate: "xbx2",
            // Thanks to (XBOX)cubeof11 for these unicode characters
            keys: {
                du: new ControlKey("du", "\uE3E1", 128, 184),
                dd: new ControlKey("dd", "\uE3DF", 128, 264),
                dl: new ControlKey("dl", "\uE3DE", 128, 208),
                dr: new ControlKey("dr", "\uE3E0", 128, 288),
                xl1: new ControlKey("xl1", "\uE3ED", 128, 80),
                xl2: new ControlKey("xl2", "\uE3E6", 128, 48),
                xr1: new ControlKey("xr1", "\uE3EB", 544, 80),
                xr2: new ControlKey("xr2", "\uE3E4", 544, 48),
                a: new ControlKey("a", "\uE3CE", 544, 168),
                b: new ControlKey("b", "\uE3CD", 544, 144),
                x: new ControlKey("x", "\uE3CB", 544, 192),
                y: new ControlKey("y", "\uE3CC", 544, 120),
                ls: new ControlKey("ls", "\uE3E7", 128, 160),
                rs: new ControlKey("rs", "\uE3E8", 544, 288), // guessing at the unicode
            }
        },
        nsw: {
            id: "nsw",
            name: "Nintendo Switch",
            console: true,
            image: "icon-control-scheme-nsw.png",
            diagram: {
                image: "control/diagram_nsw.png",
                width: 672,
                height: 312
            },
            defaultTemplate: "nsw2",
            keys: {
                du: new ControlKey("du", "\u2191", 128, 176),
                dd: new ControlKey("dd", "\u2193", 128, 224),
                dl: new ControlKey("dl", "\u2190", 128, 200),
                dr: new ControlKey("dr", "\u2192", 128, 248),
                l1: new ControlKey("l1", "LB", 128, 72),
                l2: new ControlKey("l2", "LT", 128, 48),
                r1: new ControlKey("r1", "RB", 544, 72),
                r2: new ControlKey("r2", "RT", 544, 48),
                a: new ControlKey("a", "A", 544, 128),
                b: new ControlKey("b", "B", 544, 152),
                x: new ControlKey("x", "X", 544, 104),
                y: new ControlKey("y", "Y", 544, 176),
                ls: new ControlKey("ls", "LS", 128, 152),
                rs: new ControlKey("rs", "RS", 544, 224),
            }
        }
    };

    var controlSchemes = {
        "pc": new ControlScheme(
            "pc", 
            "PC Standard",
            "Standard PC control scheme",
            "pc",
            platforms.pc.image,
            platforms.pc.keys.one, platforms.pc.keys.two, platforms.pc.keys.three,
            platforms.pc.keys.left, platforms.pc.keys.down, platforms.pc.keys.right
        ),
        "pc2": new ControlScheme(
            "pc2", 
            "PC Swapped",
            "PC control scheme with numbers for frets and arrows for strings",
            "pc",
            platforms.pc.image,
            platforms.pc.keys.left, platforms.pc.keys.down, platforms.pc.keys.right,
            platforms.pc.keys.one, platforms.pc.keys.two, platforms.pc.keys.three
        ),
        "psn": new ControlScheme(
            "psn", 
            "PSN 2018",
            "Standard Playstation control scheme before Duviri",
            "psn",
            platforms.psn.image,
            platforms.psn.keys.square, platforms.psn.keys.cross, platforms.psn.keys.circle,
            platforms.psn.keys.l1, platforms.psn.keys.r1, platforms.psn.keys.r2
        ),
        "psn2": new ControlScheme(
            "psn2", 
            "PSN 2023",
            "Standard Playstation control scheme after Duviri",
            "psn",
            platforms.psn.image,
            platforms.psn.keys.square, platforms.psn.keys.cross, platforms.psn.keys.circle,
            platforms.psn.keys.dl, platforms.psn.keys.dd, platforms.psn.keys.dr
        ),
        "xbx": new ControlScheme(
            "xbx", 
            "XBX 2018",
            "Standard XBox control scheme before Duviri",
            "xbx",
            platforms.xbx.image,
            platforms.xbx.keys.x, platforms.xbx.keys.a, platforms.xbx.keys.b,
            platforms.xbx.keys.xl1, platforms.xbx.keys.xr1, platforms.xbx.keys.xr2
        ),
        "xbx2": new ControlScheme(
            "xbx2", 
            "XBX 2023",
            "Standard XBox control scheme after Duviri",
            "xbx",
            platforms.xbx.image,
            platforms.xbx.keys.x, platforms.xbx.keys.a, platforms.xbx.keys.b,
            platforms.xbx.keys.dl, platforms.xbx.keys.dd, platforms.xbx.keys.dr
        ),
        "nsw": new ControlScheme(
            "nsw", 
            "NSW 2018",
            "Standard Nintendo Switch control scheme before Duviri",
            "nsw",
            platforms.nsw.image,
            platforms.nsw.keys.y, platforms.nsw.keys.b, platforms.nsw.keys.a,
            platforms.nsw.keys.l1, platforms.nsw.keys.r1, platforms.nsw.keys.r2
        ),
        "nsw2": new ControlScheme(
            "nsw2",
            "NSW 2023",
            "Standard Nintendo Switch control scheme after Duviri",
            "nsw",
            platforms.nsw.image,
            platforms.nsw.keys.y, platforms.nsw.keys.b, platforms.nsw.keys.a,
            platforms.nsw.keys.dl, platforms.nsw.keys.dd, platforms.nsw.keys.dr
        ),
    };

    var noFret = new ControlKey("f0", "no fret", 0, 0, "fret_0");
    var noFretImg = noFret.imgBase + "_s.png";

    var defaultMeter = "4/4";
    var defaultTempo = 120;
    var tempoList = [
        60,
        80,
        96,
        120,
        160,
        240,
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
    var minVolume = 0;
    var maxVolume = 2;

    var midiNoteC = 48;
    var midiNoteChord1 = 44;
    var midiNoteChord2 = 46

    return {
        // UI metadata
        tickSpacing: tickSpacing,
        tabStringXOffsets: tabStringXOffsets,
        tabFretOffsets: tabFretOffsets,
        tabFretOffsets_Old: tabFretOffsets_Old,
        noFret: noFret,
        noFretImg: noFretImg,
        fretToRollColors: fretToRollColors,
        platforms: platforms,
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
        minVolume: minVolume,
        maxVolume: maxVolume,
        midiNoteC: midiNoteC,
        midiNoteChord1: midiNoteChord1,
        midiNoteChord2: midiNoteChord2,
    }
})()