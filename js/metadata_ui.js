class ControlKey {
    constructor(name, altText, imgBase = ("key_" + name)) {
        this.name = name;
        this.altText = altText;
        this.imgBase = imgBase;
    }
}

class ControlScheme {
    constructor(name, img, string1, string2, string3, fret1, fret2, fret3) {
        this.name = name;
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
//    var tabFretYOffset = -38;
//    var tabFretXOffsets = {
//        "1": -34,
//        "2": 0,
//        "3": 34,
//    };

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

    var noteRollOffset = 2;
    var noteRollWidth = 12;
    var noteToRollOffsets = {};
    for (var n = 0; n < Metadata.noteOrder.length; n++) {
        noteToRollOffsets[Metadata.noteOrder[n]] = noteRollOffset + (noteRollWidth * n);
    }
    var noteRollWidth = 12;

    var noteKeyboardBoxes = {
        "c1": {"left": 2, "top": 55, "width": 20, "height": 41},
            "cs1": {"left": 9, "top": 0, "width": 23, "height": 55},
        "d1": {"left": 22, "top": 55, "width": 21, "height": 41},
            "ds1": {"left": 32, "top": 0, "width": 23, "height": 55},
        "e1": {"left": 43, "top": 55, "width": 20, "height": 41},
        "f1": {"left": 63, "top": 55, "width": 21, "height": 41},
            "fs1": {"left": 71, "top": 0, "width": 23, "height": 55},
        "g1": {"left": 84, "top": 55, "width": 21, "height": 41},
            "gs1": {"left": 94, "top": 0, "width": 22, "height": 55},
        "a1": {"left": 105, "top": 55, "width": 20, "height": 41},
            "as1": {"left": 116, "top": 0, "width": 23, "height": 55},
        "b1": {"left": 125, "top": 55, "width": 21, "height": 41},
        "c2": {"left": 146, "top": 55, "width": 20, "height": 41},
            "cs2": {"left": 154, "top": 0, "width": 23, "height": 55},
        "d2": {"left": 166, "top": 55, "width": 21, "height": 41},
            "ds2": {"left": 177, "top": 0, "width": 23, "height": 55},
        "e2": {"left": 187, "top": 55, "width": 21, "height": 41},
        "f2": {"left": 208, "top": 55, "width": 20, "height": 41},
            "fs2": {"left": 215, "top": 0, "width": 23, "height": 55},
        "g2": {"left": 228, "top": 55, "width": 21, "height": 41},
            "gs2": {"left": 238, "top": 0, "width": 22, "height": 55},
        "a2": {"left": 249, "top": 55, "width": 20, "height": 41},
            "as2": {"left": 260, "top": 0, "width": 23, "height": 55},
        "b2": {"left": 269, "top": 55, "width": 21, "height": 41},
        "c3": {"left": 290, "top": 55, "width": 21, "height": 41},
            "cs3": {"left": 298, "top": 0, "width": 23, "height": 55},
        "d3": {"left": 311, "top": 55, "width": 21, "height": 41},
            "ds3": {"left": 321, "top": 0, "width": 23, "height": 55},
    }

    var key_pc = {
        up: new ControlKey("u", "\u2191"),
        down: new ControlKey("d", "\u2193"),
        left: new ControlKey("l", "\u2190"),
        right: new ControlKey("r", "\u2192"),
        one: new ControlKey("1", "1"),
        two: new ControlKey("2", "2"),
        three: new ControlKey("2", "2"),
        // I'm not putting in one for every dang key.
    }

    // Thanks to (XBOX)cubeof11 for these
    var key_xbx = {
        up: new ControlKey("u", "\uE3E1"),
        down: new ControlKey("d", "\uE3DF"),
        left: new ControlKey("l", "\uE3DE"),
        right: new ControlKey("r", "\uE3E0"),
        l1: new ControlKey("l1", "\uE3ED"),
        l2: new ControlKey("l2", "\uE3E6"),
        r1: new ControlKey("r1", "\uE3EB"),
        r2: new ControlKey("r2", "\uE3E4"),
        a: new ControlKey("a", "\uE3CE"),
        b: new ControlKey("b", "\uE3CD"),
        x: new ControlKey("x", "\uE3CB"),
        y: new ControlKey("y", "\uE3CC"),
    }

    var key_psn = {
        up: new ControlKey("u", "\u2191"),
        down: new ControlKey("d", "\u2193"),
        left: new ControlKey("l", "\u2190"),
        right: new ControlKey("r", "\u2192"),
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
        up: new ControlKey("u", "\u2191"),
        down: new ControlKey("d", "\u2193"),
        left: new ControlKey("l", "\u2190"),
        right: new ControlKey("r", "\u2192"),
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
            "icon-control-scheme-pc.png",
            key_pc.one, key_pc.two, key_pc.three,
            key_pc.left, key_pc.down, key_pc.right
        ),
        "psn": new ControlScheme(
            "PSN (Old)",
            "icon-control-scheme-psn.png",
            key_psn.square, key_psn.cross, key_psn.circle,
            key_psn.l1, key_psn.r1, key_psn.r2
        ),
        "psn2": new ControlScheme(
            "PSN (New)",
            "icon-control-scheme-psn.png",
            key_psn.square, key_psn.cross, key_psn.circle,
            key_psn.left, key_psn.down, key_psn.right
        ),
        "xbx": new ControlScheme(
            "XBX (Old)",
            "icon-control-scheme-xbx.png",
            key_xbx.x, key_xbx.a, key_xbx.b,
            key_xbx.l1, key_xbx.r1, key_xbx.r2
        ),
        "xbx2": new ControlScheme(
            "XBX (New)",
            "icon-control-scheme-xbx.png",
            key_xbx.x, key_xbx.a, key_xbx.b,
            key_xbx.left, key_xbx.down, key_xbx.right
        ),
        "nsw": new ControlScheme(
            "NSW (Old)",
            "icon-control-scheme-nsw.png",
            key_nsw.y, key_nsw.b, key_nsw.a,
            key_nsw.l1, key_nsw.r1, key_nsw.r2
        ),
        "nsw2": new ControlScheme(
            "NSW (New)",
            "icon-control-scheme-nsw.png",
            key_nsw.y, key_nsw.b, key_nsw.a,
            key_nsw.left, key_nsw.down, key_nsw.right
        ),
    };

    return {
        // UI metadata
        tickSpacing: tickSpacing,
        tabStringXOffsets: tabStringXOffsets,
        tabFretOffsets: tabFretOffsets,
        noteToRollOffsets: noteToRollOffsets,
        noteRollWidth: noteRollWidth,
        fretToRollColors: fretToRollColors,
        noteKeyboardBoxes: noteKeyboardBoxes,
        controlSchemes: controlSchemes,
    }
})()