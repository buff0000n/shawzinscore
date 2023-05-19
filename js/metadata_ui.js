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

    var key = {
        // common
        up: "u",
        down: "d",
        left: "l",
        right: "r",
        // pc
        one: "1",
        two: "2",
        three: "3",
        // console common
        l1: "l1",
        l2: "l2",
        r1: "r1",
        r2: "r2",
        // psn
        square: "square",
        cross: "cross",
        circle: "circle",
        triangle: "triangle",
        // xbx, nsw
        a: "a",
        b: "b",
        x: "x",
        y: "y",
    };

    var controlSchemes = {
        "pc": new ControlScheme(
            "PC Standard",
            "icon-control-scheme-pc.png",
            key.one, key.two, key.three,
            key.left, key.down, key.right
        ),
        "psn": new ControlScheme(
            "PSN Standard",
            "icon-control-scheme-psn.png",
            key.square, key.cross, key.circle,
            key.l1, key.r1, key.r2
        ),
        "xbx": new ControlScheme(
            "XBX Standard",
            "icon-control-scheme-xbx.png",
            key.x, key.a, key.b,
            key.l1, key.r1, key.r2
        ),
        "nsw": new ControlScheme(
            "NSW Standard",
            "icon-control-scheme-nsw.png",
            key.y, key.b, key.a,
            key.l1, key.r1, key.r2
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