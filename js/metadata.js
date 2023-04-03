// magic singleton pattern
var Metadata = (function() {
    var note = {
        C1: "c1",
            Cs1: "cs1", Db1: "cs1",
        D1: "d1",
            Ds1: "ds1", Eb1: "ds1",
        E1: "e1",
        F1: "c1",
            Fs1: "fs1", Gb1: "fs1",
        G1: "g1",
            Gs1: "gs1", Ab1: "gs1",
        A1: "a1",
            As1: "as1", Bb1: "as1",
        B1: "b1",
        C2: "c2",
            Cs2: "cs2", Db2: "cs2",
        D2: "d2",
            Ds2: "ds2", Eb2: "ds2",
        E2: "e2",
        F2: "c2",
            Fs2: "fs2", Gb2: "fs2",
        G2: "g2",
            Gs2: "gs2", Ab2: "gs2",
        A2: "a2",
            As2: "as2", Bb2: "as2",
        B2: "b2",
        C3: "c3",
            Cs3: "cs3", Db3: "cs3",
        D3: "d3",
            Ds3: "ds3", Eb3: "ds3"
    };

    var noteOrder = [
        note.C1,
            note.Cs1,
        note.D1,
            note.Ds1,
        note.E1,
        note.F1,
            note.Fs1,
        note.G1,
            note.Gs1,
        note.A1,
            note.As1,
        note.B1,
        note.C2,
            note.Cs2,
        note.D2,
            note.Ds2,
        note.E2,
        note.F2,
            note.Fs2,
        note.G2,
            note.Gs2,
        note.A2,
            note.As2,
        note.B2,
        note.C3,
            note.Cs3,
        note.D3,
            note.Ds3
    ];
//    var scaleList = [
//        {"id": "pmin",  "name":  "Pentatonic Minor"},
//        {"id": "pmaj",  "name":  "Pentatonic Major"},
//        {"id": "chrom", "name":  "Chromatic"},
//        {"id": "hex",   "name":  "Hexatonic"},
//        {"id": "maj",   "name":  "Major"},
//        {"id": "min",   "name":  "Minor"},
//        {"id": "hira",  "name":  "Hirajoshi"},
//        {"id": "phry",  "name":  "Phrygian Dominant"},
//        {"id": "yo",    "name":  "Yo"},
//    ];
//
//    var shawzinList = [
//        {"id": "dax",  "name":  "Dax's Shawzin", "Note": "Include Dawn, Mimica, Day of the Dead"},
//        {"id": "nel",  "name":  "Nelumbo Shawzin"},
//        {"id": "corb", "name":  "Corbu Shawzin"},
//        {"id": "tia",  "name":  "Tiamat Shawzin"},
//        {"id": "ari",  "name":  "Aristei Shawzin"},
//        {"id": "nar",  "name":  "Narmer Shawzin"},
//        {"id": "kira", "name":  "Kira's Shawzin"},
//        {"id": "void", "name":  "Void's Song Shawzin"},
//    ];

    var shawzinOrder = [ "dax", "nelumbo", "corbu", "tiamat", "aristei", "narmer", "kira", "void" ];
    var scaleOrder = ["pmin", "pmaj", "chrom", "hex", "maj", "min", "hira", "phry", "yo"];
    var scaleNoteOrder = [ "0-1", "0-2", "0-3", "1-1", "1-2", "1-3", "2-1", "2-2", "2-3", "3-1", "3-2", "3-3" ];
    var scaleChordOrder = [ "12-1", "12-2", "12-3", "23-1", "23-2", "23-3", "13-1", "13-2", "13-3", "123-1", "123-2", "123-3" ];

    var flat = "\u266D";
    var sharp = "\u266F";

//    var imagePrefix = ["img/scales/", "img2x/scales/"];
//
//    var soundPrefix = "sounds/";
//    var noteSoundPrefix = "note/";
//    var chordSoundPrefix = "chord/";

    var standardShawzin  = {
        "config": {
            // metadata, override this
            "name": "",
            "comment": "",
            "shawzinSoundPrefix": "",
            // options
            "type": "polyphonic", // (polyphonic, monophonic, duophonic)
            "slap": "false", // tiamat is its own thing
        },
        "notes": {
            "length": 2
            // todo: individual lengths of each note?  The answer is no
        },
        "scales": {

            "pmin": {
                "img": "standard/pmin/scale.png",
                "notes": {
                    "0-1": note.C1,
                    "0-2": note.Eb1,
                    "0-3": note.F1,
                    "1-1": note.G1,
                    "1-2": note.Bb1,
                    "1-3": note.C2,
                    "2-1": note.Eb2,
                    "2-2": note.F2,
                    "2-3": note.G2,
                    "3-1": note.Bb2,
                    "3-2": note.C3,
                    "3-3": note.Eb3
                },
                "chords": {
                    "12-1": {
                        "name": "Cm<sup>7</sup>sus4",
                        "img": "standard/pmin/chord-12-1.png",
                        "length": 2,
                        "notes": [note.C1, note.F1, note.Bb1]
                    },
                    "12-2": {
                        "name": "Cm/E\u266D",
                        "img": "standard/pmin/chord-12-2.png",
                        "length": 2,
                        "notes": [note.Eb1, note.G1, note.C2]
                    },
                    "12-3": {
                        "name": "Fm<sup>7</sup>sus4",
                        "img": "standard/pmin/chord-12-3.png",
                        "length": 2,
                        "notes": [note.F1, note.Bb1, note.Eb2]
                    },
                    "23-1": {
                        "name": "Gm<sup>7</sup>sus4",
                        "img": "standard/pmin/chord-23-1.png",
                        "length": 2,
                        "notes": [note.G1, note.C2, note.F2]
                    },
                    "23-2": {
                        "name": "E\u266D/B\u266D",
                        "img": "standard/pmin/chord-23-2.png",
                        "length": 2,
                        "notes": [note.Bb1, note.Eb2, note.G2]
                    },
                    "23-3": {
                        "name": "Cm<sup>7</sup>sus4",
                        "img": "standard/pmin/chord-23-3.png",
                        "length": 2,
                        "notes": [note.C2, note.F2, note.Bb2]
                    },
                    "13-1": {
                        "name": "Cm",
                        "img": "standard/pmin/chord-13-1.png",
                        "length": 2,
                        "notes": [note.C1, note.Eb1, note.G1]
                    },
                    "13-2": {
                        "name": "E\u266Dsus2",
                        "img": "standard/pmin/chord-13-2.png",
                        "length": 2,
                        "notes": [note.Eb1, note.F1, note.Bb1]
                    },
                    "13-3": {
                        "name": "Fmsus2",
                        "img": "standard/pmin/chord-13-3.png",
                        "length": 2,
                        "notes": [note.F1, note.G1, note.C2]
                    },
                    "123-1": {
                        "name": "E\u266D/G",
                        "img": "standard/pmin/chord-123-1.png",
                        "length": 2,
                        "notes": [note.G1, note.Bb1, note.Eb2]
                    },
                    "123-2": {
                        "name": "B\u266D/sus2",
                        "img": "standard/pmin/chord-123-2.png",
                        "length": 2,
                        "notes": [note.Bb1, note.C2, note.F2]
                    },
                    "123-3": {
                        "name": "Cm",
                        "img": "standard/pmin/chord-123-3.png",
                        "length": 2,
                        "notes": [note.C2, note.Eb2, note.G2]
                    }
                }
            },

            "pmaj": {
                "img": "standard/pmaj/scale.png",
                "notes": {
                    "0-1": note.C1,
                    "0-2": note.D1,
                    "0-3": note.E1,
                    "1-1": note.G1,
                    "1-2": note.A1,
                    "1-3": note.C2,
                    "2-1": note.D2,
                    "2-2": note.E2,
                    "2-3": note.G2,
                    "3-1": note.A2,
                    "3-2": note.C3,
                    "4-3": note.D3
                },
                "chords": {
                    "12-1": {
                        "name": "Am/C",
                        "img": "standard/pmaj/chord-12-1.png",
                        "length": 2,
                        "notes": [note.C1, note.E1, note.A1]
                    },
                    "12-2": {
                        "name": "Dm<sup>7</sup>sus4",
                        "img": "standard/pmaj/chord-12-2.png",
                        "length": 2,
                        "notes": [note.D1, note.G1, note.C2]
                    },
                    "12-3": {
                        "name": "Em<sup>7</sup>sus4",
                        "img": "standard/pmaj/chord-12-3.png",
                        "length": 2,
                        "notes": [note.E1, note.A1, note.D2]
                    },
                    "23-1": {
                        "name": "C/G",
                        "img": "standard/pmaj/chord-23-1.png",
                        "length": 2,
                        "notes": [note.G1, note.C2, note.E2]
                    },
                    "23-2": {
                        "name": "Am<sup>7</sup>sus4",
                        "img": "standard/pmaj/chord-23-2.png",
                        "length": 2,
                        "notes": [note.A1, note.D2, note.G2]
                    },
                    "23-3": {
                        "name": "Am/C",
                        "img": "standard/pmaj/chord-23-3.png",
                        "length": 2,
                        "notes": [note.C2, note.E2, note.A2]
                    },
                    "13-1": {
                        "name": "Csus2",
                        "img": "standard/pmaj/chord-13-1.png",
                        "length": 2,
                        "notes": [note.C1, note.D1, note.G1]
                    },
                    "13-2": {
                        "name": "Dmsus2",
                        "img": "standard/pmaj/chord-13-2.png",
                        "length": 2,
                        "notes": [note.D1, note.E1, note.A1]
                    },
                    "13-3": {
                        "name": "C/E",
                        "img": "standard/pmaj/chord-13-3.png",
                        "length": 2,
                        "notes": [note.E1, note.G1, note.C2]
                    },
                    "123-1": {
                        "name": "Gsus2",
                        "img": "standard/pmaj/chord-123-1.png",
                        "length": 2,
                        "notes": [note.G1, note.A1, note.D2]
                    },
                    "123-2": {
                        "name": "Am",
                        "img": "standard/pmaj/chord-123-2.png",
                        "length": 2,
                        "notes": [note.A1, note.C2, note.E2]
                    },
                    "123-3": {
                        "name": "Csus2",
                        "img": "standard/pmaj/chord-123-3.png",
                        "length": 2,
                        "notes": [note.C2, note.D2, note.G2]
                    }
                }
            },

            "chrom": {
                "img": "standard/chrom/scale.png",
                "notes": {
                    "0-1": note.C1,
                    "0-2": note.Cs1,
                    "0-3": note.D1,
                    "1-1": note.Ds1,
                    "1-2": note.E1,
                    "1-3": note.F1,
                    "2-1": note.Fs1,
                    "2-2": note.G1,
                    "2-3": note.Gs1,
                    "3-1": note.A1,
                    "3-2": note.As1,
                    "3-3": note.B1
                },
                "chords": {
                    "12-1": {
                        "name": "C",
                        "img": "standard/chrom/chord-12-1.png",
                        "length": 2,
                        "notes": [note.C1, note.G1, note.C2]
                    },
                    "12-2": {
                        "name": "C\u266F",
                        "img": "standard/chrom/chord-12-2.png",
                        "length": 2,
                        "notes": [note.Gs1, note.Gs1, note.Cs2]
                    },
                    "12-3": {
                        "name": "D",
                        "img": "standard/chrom/chord-12-3.png",
                        "length": 2,
                        "notes": [note.D1, note.A1, note.D2]
                    },
                    "23-1": {
                        "name": "D\u266F",
                        "img": "standard/chrom/chord-23-1.png",
                        "length": 2,
                        "notes": [note.Ds1, note.As1, note.Ds2]
                    },
                    "23-2": {
                        "name": "E",
                        "img": "standard/chrom/chord-23-2.png",
                        "length": 2,
                        "notes": [note.E1, note.B1, note.E2]
                    },
                    "23-3": {
                        "name": "F",
                        "img": "standard/chrom/chord-23-3.png",
                        "length": 2,
                        "notes": [note.F1, note.C2, note.F2]
                    },
                    "13-1": {
                        "name": "F\u266F",
                        "img": "standard/chrom/chord-13-1.png",
                        "length": 2,
                        "notes": [note.Cs1, note.Fs1, note.Cs2],
                        "comment": "Not sure why this one is different"
                    },
                    "13-2": {
                        "name": "G",
                        "img": "standard/chrom/chord-13-2.png",
                        "length": 2,
                        "notes": [note.G1, note.D2, note.G2]
                    },
                    "13-3": {
                        "name": "G\u266F",
                        "img": "standard/chrom/chord-13-3.png",
                        "length": 2,
                        "notes": [note.Gs1, note.Ds2, note.Gs2]
                    },
                    "123-1": {
                        "name": "A",
                        "img": "standard/chrom/chord-123-1.png",
                        "length": 2,
                        "notes": [note.A1, note.E2, note.A2]
                    },
                    "123-2": {
                        "name": "A\u266F",
                        "img": "standard/chrom/chord-123-2.png",
                        "length": 2,
                        "notes": [note.As1, note.F2, note.As2]
                    },
                    "123-3": {
                        "name": "B",
                        "img": "standard/chrom/chord-123-3.png",
                        "length": 2,
                        "notes": [note.B1, note.Fs2, note.B2]
                    }
                }
            },

            "hex": {
                "img": "standard/hex/scale.png",
                "notes": {
                    "0-1": note.C1,
                    "0-2": note.Eb1,
                    "0-3": note.F1,
                    "1-1": note.Gb1,
                    "1-2": note.G1,
                    "1-3": note.Bb1,
                    "2-1": note.C2,
                    "2-2": note.Eb2,
                    "2-3": note.F2,
                    "3-1": note.Gb2,
                    "3-2": note.G2,
                    "3-3": note.Bb2
                },
                "chords": {
                    "12-1": {
                        "name": "Cm",
                        "img": "standard/hex/chord-12-1.png",
                        "length": 2,
                        "notes": [note.C1, note.Eb1, note.G1]
                    },
                    "12-2": {
                        "name": "E\u266D",
                        "img": "standard/hex/chord-12-2.png",
                        "length": 2,
                        "notes": [note.Eb1, note.G1, note.Bb1]
                    },
                    "12-3": {
                        "name": "Fmsus2",
                        "img": "standard/hex/chord-12-3.png",
                        "length": 2,
                        "notes": [note.F1, note.G1, note.C2]
                    },
                    "23-1": {
                        "name": "E\u266D/G\u266D",
                        "img": "standard/hex/chord-23-1.png",
                        "length": 2,
                        "notes": [note.Gb1, note.Bb1, note.Eb2]
                    },
                    "23-2": {
                        "name": "E\u266D/G",
                        "img": "standard/hex/chord-23-2.png",
                        "length": 2,
                        "notes": [note.G1, note.Bb1, note.Eb2]
                    },
                    "23-3": {
                        "name": "B\u266Dsus4",
                        "img": "standard/hex/chord-23-3.png",
                        "length": 2,
                        "notes": [note.Bb1, note.F2, note.G2]
                    },
                    "13-1": {
                        "name": "Cdim",
                        "img": "standard/hex/chord-13-1.png",
                        "length": 2,
                        "notes": [note.C1, note.Eb1, note.Gs1]
                    },
                    "13-2": {
                        "name": "E\u266Dsus2",
                        "img": "standard/hex/chord-13-2.png",
                        "length": 2,
                        "notes": [note.Eb1, note.F1, note.Bb1]
                    },
                    "13-3": {
                        "name": "Gm<sup>7</sup>/F",
                        "img": "standard/hex/chord-13-3.png",
                        "length": 2,
                        "notes": [note.F1, note.G1, note.Bb1]
                    },
                    "123-1": {
                        "name": "Cm<sup>7</sup>\u266D5/G\u266D",
                        "img": "standard/hex/chord-123-1.png",
                        "length": 2,
                        "notes": [note.Gb1, note.Bb1, note.C2]
                    },
                    "123-2": {
                        "name": "Gm7sus4",
                        "img": "standard/hex/chord-123-2.png",
                        "length": 2,
                        "notes": [note.G1, note.Bb1, note.C2]
                    },
                    "123-3": {
                        "name": "Cm<sup>7</sup>/B\u266D",
                        "img": "standard/hex/chord-123-3.png",
                        "length": 2,
                        "notes": [note.G1, note.Bb2, note.C2]
                    }
                }
            },

            "maj": {
                "img": "standard/maj/scale.png",
                "notes": {
                    "0-1": note.C1,
                    "0-2": note.D1,
                    "0-3": note.E1,
                    "1-1": note.F1,
                    "1-2": note.G1,
                    "1-3": note.A1,
                    "2-1": note.B1,
                    "2-2": note.C2,
                    "2-3": note.D2,
                    "3-1": note.E2,
                    "3-2": note.F2,
                    "3-3": note.G2
                },
                "chords": {
                    "12-1": {
                        "name": "C",
                        "img": "standard/maj/chord-12-1.png",
                        "length": 2,
                        "notes": [note.C1, note.E1, note.G1]
                    },
                    "12-2": {
                        "name": "Dm",
                        "img": "standard/maj/chord-12-2.png",
                        "length": 2,
                        "notes": [note.D1, note.F1, note.A1]
                    },
                    "12-3": {
                        "name": "Em",
                        "img": "standard/maj/chord-12-3.png",
                        "length": 2,
                        "notes": [note.E1, note.G1, note.B1]
                    },
                    "23-1": {
                        "name": "F",
                        "img": "standard/maj/chord-23-1.png",
                        "length": 2,
                        "notes": [note.F1, note.A1, note.C2]
                    },
                    "23-2": {
                        "name": "G",
                        "img": "standard/maj/chord-23-2.png",
                        "length": 2,
                        "notes": [note.G1, note.B1, note.D2]
                    },
                    "23-3": {
                        "name": "Am",
                        "img": "standard/maj/chord-23-3.png",
                        "length": 2,
                        "notes": [note.A1, note.C2, note.E2]
                    },
                    "13-1": {
                        "name": "Dm<sup>7</sup>/C",
                        "img": "standard/maj/chord-13-1.png",
                        "length": 2,
                        "notes": [note.C1, note.D1, note.F1]
                    },
                    "13-2": {
                        "name": "Em<sup>7</sup>/C",
                        "img": "standard/maj/chord-13-2.png",
                        "length": 2,
                        "notes": [note.D1, note.E1, note.G1]
                    },
                    "13-3": {
                        "name": "Fmaj/E",
                        "img": "standard/maj/chord-13-3.png",
                        "length": 2,
                        "notes": [note.E1, note.F1, note.A1]
                    },
                    "123-1": {
                        "name": "G<sup>7</sup>/F",
                        "img": "standard/maj/chord-123-1.png",
                        "length": 2,
                        "notes": [note.F1, note.G1, note.B1]
                    },
                    "123-2": {
                        "name": "Am<sup>7</sup>/G",
                        "img": "standard/maj/chord-123-2.png",
                        "length": 2,
                        "notes": [note.G1, note.A1, note.C2]
                    },
                    "123-3": {
                        "name": "Gsus2/A",
                        "img": "standard/maj/chord-123-3.png",
                        "length": 2,
                        "notes": [note.G1, note.A1, note.C2]
                    }
                }
            },

            "min": {
                "img": "standard/min/scale.png",
                "notes": {
                    "0-1": note.C1,
                    "0-2": note.D1,
                    "0-3": note.Eb1,
                    "1-1": note.F1,
                    "1-2": note.G1,
                    "1-3": note.Ab1,
                    "2-1": note.Bb1,
                    "2-2": note.C2,
                    "2-3": note.D2,
                    "3-1": note.Eb2,
                    "3-2": note.F2,
                    "3-3": note.G2
                },
                "chords": {
                    "12-1": {
                        "name": "Cm",
                        "img": "standard/min/chord-12-1.png",
                        "length": 2,
                        "notes": [note.C1, note.Eb1, note.G1]
                    },
                    "12-2": {
                        "name": "B\u266D/D",
                        "img": "standard/min/chord-12-2.png",
                        "length": 2,
                        "notes": [note.D1, note.F1, note.Ab1]
                    },
                    "12-3": {
                        "name": "E\u266D",
                        "img": "standard/min/chord-12-3.png",
                        "length": 2,
                        "notes": [note.Eb1, note.G1, note.Bb1]
                    },
                    "23-1": {
                        "name": "Fm",
                        "img": "standard/min/chord-23-1.png",
                        "length": 2,
                        "notes": [note.F1, note.Bb1, note.D2]
                    },
                    "23-2": {
                        "name": "Gm",
                        "img": "standard/min/chord-23-2.png",
                        "length": 2,
                        "notes": [note.G1, note.Bb1, note.D2]
                    },
                    "23-3": {
                        "name": "A\u266D",
                        "img": "standard/min/chord-23-3.png",
                        "length": 2,
                        "notes": [note.Ab1, note.C2, note.Eb2]
                    },
                    "13-1": {
                        "name": "Cmsus2sus4",
                        "img": "standard/min/chord-13-1.png",
                        "length": 2,
                        "notes": [note.C1, note.D1, note.F1]
                    },
                    "13-2": {
                        "name": "E\u266Dmaj7/D",
                        "img": "standard/min/chord-13-2.png",
                        "length": 2,
                        "notes": [note.D1, note.Eb1, note.G1]
                    },
                    "13-3": {
                        "name": "Fm<sup>7</sup>/E\u266D",
                        "img": "standard/min/chord-13-3.png",
                        "length": 2,
                        "notes": [note.Eb1, note.F1, note.Ab1]
                    },
                    "123-1": {
                        "name": "Gm<sup>7</sup>/F",
                        "img": "standard/min/chord-123-1.png",
                        "length": 2,
                        "notes": [note.F1, note.G1, note.Bb1]
                    },
                    "123-2": {
                        "name": "A\u266Dmaj7/G",
                        "img": "standard/min/chord-123-2.png",
                        "length": 2,
                        "notes": [note.G1, note.Ab1, note.C2]
                    },
                    "123-3": {
                        "name": "B\u266D<sup>7</sup>/A\u266D",
                        "img": "standard/min/chord-123-3.png",
                        "length": 2,
                        "notes": [note.Ab1, note.Bb1, note.D2]
                    }
                }
            },

            "hira": {
                "img": "standard/hira/scale.png",
                "notes": {
                    "0-1": note.C1,
                    "0-2": note.Db1,
                    "0-3": note.F1,
                    "1-1": note.Gb1,
                    "1-2": note.Bb1,
                    "1-3": note.C2,
                    "2-1": note.Db2,
                    "2-2": note.F2,
                    "2-3": note.Gb2,
                    "3-1": note.A2,
                    "3-2": note.C3,
                    "3-3": note.Db3
                },
                "chords": {
                    "12-1": {
                        "name": "Cm7sus4",
                        "img": "standard/hira/chord-12-1.png",
                        "length": 2,
                        "notes": [note.C1, note.F1, note.Bb1]
                    },
                    "12-2": {
                        "name": "???",
                        "img": "standard/hira/chord-12-2.png",
                        "length": 2,
                        "notes": [note.F1, note.Gb1, note.C2]
                    },
                    "12-3": {
                        "name": "B\u266Dm/F",
                        "img": "standard/hira/chord-12-3.png",
                        "length": 2,
                        "notes": [note.F1, note.Bb1, note.Db2]
                    },
                    "23-1": {
                        "name": "???",
                        "img": "standard/hira/chord-23-1.png",
                        "length": 2,
                        "notes": [note.Gb1, note.C2, note.F2]
                    },
                    "23-2": {
                        "name": "G\u266D/B\u266D",
                        "img": "standard/hira/chord-23-2.png",
                        "length": 2,
                        "notes": [note.Bb1, note.Db2, note.Gb2]
                    },
                    "23-3": {
                        "name": "Cm7sus4",
                        "img": "standard/hira/chord-23-3.png",
                        "length": 2,
                        "notes": [note.C2, note.F2, note.Bb2]
                    },
                    "13-1": {
                        "name": "???",
                        "img": "standard/hira/chord-13-1.png",
                        "length": 2,
                        "notes": [note.C1, note.Db1, note.Gb1]
                    },
                    "13-2": {
                        "name": "B\u266Dm/D\u266D",
                        "img": "standard/hira/chord-13-2.png",
                        "length": 2,
                        "notes": [note.Db1, note.F1, note.Bb1]
                    },
                    "13-3": {
                        "name": "???",
                        "img": "standard/hira/chord-13-3.png",
                        "length": 2,
                        "notes": [note.F1, note.Gb1, note.C2]
                    },
                    "123-1": {
                        "name": "G\u266D",
                        "img": "standard/hira/chord-123-1.png",
                        "length": 2,
                        "notes": [note.Gb1, note.Bb1, note.Db2]
                    },
                    "123-2": {
                        "name": "B\u266Dmsus2",
                        "img": "standard/hira/chord-123-2.png",
                        "length": 2,
                        "notes": [note.Bb1, note.C2, note.F2]
                    },
                    "123-3": {
                        "name": "???",
                        "img": "standard/hira/chord-123-3.png",
                        "length": 2,
                        "notes": [note.C2, note.Db2, note.Gb2]
                    }
                }
            },

            "phry": {
                "img": "standard/phry/scale.png",
                "notes": {
                    "0-1": note.C1,
                    "0-2": note.Db1,
                    "0-3": note.E1,
                    "1-1": note.F1,
                    "1-2": note.A1,
                    "1-3": note.Ab1,
                    "2-1": note.Bb1,
                    "2-2": note.C2,
                    "2-3": note.Db2,
                    "3-1": note.E2,
                    "3-2": note.F2,
                    "3-3": note.G2
                },
                "chords": {
                    "12-1": {
                        "name": "C",
                        "img": "standard/phry/chord-12-1.png",
                        "length": 2,
                        "notes": [note.C1, note.E1, note.G2]
                    },
                    "12-2": {
                        "name": "D\u266D",
                        "img": "standard/phry/chord-12-2.png",
                        "length": 2,
                        "notes": [note.Db1, note.F1, note.Ab1]
                    },
                    "12-3": {
                        "name": "C<sup>7</sup>/E",
                        "img": "standard/phry/chord-12-3.png",
                        "length": 2,
                        "notes": [note.E1, note.G1, note.Bb1]
                    },
                    "23-1": {
                        "name": "Fm",
                        "img": "standard/phry/chord-23-1.png",
                        "length": 2,
                        "notes": [note.F1, note.Ab1, note.C2]
                    },
                    "23-2": {
                        "name": "Gdim",
                        "img": "standard/phry/chord-23-2.png",
                        "length": 2,
                        "notes": [note.G1, note.Bb1, note.Db2]
                    },
                    "23-3": {
                        "name": "A\u266Daug",
                        "img": "standard/phry/chord-23-3.png",
                        "length": 2,
                        "notes": [note.Ab1, note.C2, note.E2]
                    },
                    "13-1": {
                        "name": "D\u266Dma7j/C",
                        "img": "standard/phry/chord-13-1.png",
                        "length": 2,
                        "notes": [note.C1, note.Db1, note.F1]
                    },
                    "13-2": {
                        "name": "D\u266Ddim",
                        "img": "standard/phry/chord-13-2.png",
                        "length": 2,
                        "notes": [note.Db1, note.E1, note.G1]
                    },
                    "13-3": {
                        "name": "D\u266D",
                        "img": "standard/phry/chord-13-3.png",
                        "length": 2,
                        "notes": [note.Db1, note.F1, note.Ab1]
                    },
                    "123-1": {
                        "name": "Fmsus2sus4",
                        "img": "standard/phry/chord-123-1.png",
                        "length": 2,
                        "notes": [note.F1, note.G1, note.Bb1]
                    },
                    "123-2": {
                        "name": "A\u266Dmaj7/G",
                        "img": "standard/phry/chord-123-2.png",
                        "length": 2,
                        "notes": [note.G1, note.Ab1, note.C2]
                    },
                    "123-3": {
                        "name": "B\u266Dm<sup>7</sup>/A\u266D",
                        "img": "standard/phry/chord-123-3.png",
                        "length": 2,
                        "notes": [note.Ab1, note.Bb1, note.Db2]
                    }
                }
            },

            "yo": {
                "img": "standard/yo/scale.png",
                "notes": {
                    "0-1": note.Db1,
                    "0-2": note.Eb1,
                    "0-3": note.Gb1,
                    "1-1": note.Ab2,
                    "1-2": note.Bb1,
                    "1-3": note.Db2,
                    "2-1": note.Eb2,
                    "2-2": note.Gb2,
                    "2-3": note.Ab2,
                    "3-1": note.Bb1,
                    "3-2": note.Db3,
                    "3-3": note.Eb3
                },
                "chords": {
                    "12-1": {
                        "name": "G\u266D/D\u266D",
                        "img": "standard/yo/chord-12-1.png",
                        "length": 2,
                        "notes": [note.Db1, note.Gb1, note.Bb1]
                    },
                    "12-2": {
                        "name": "E\u266Dm<sup>7</sup>sus4",
                        "img": "standard/yo/chord-12-2.png",
                        "length": 2,
                        "notes": [note.Eb1, note.Ab1, note.Db2]
                    },
                    "12-3": {
                        "name": "E\u266Dm/G\u266D",
                        "img": "standard/yo/chord-12-3.png",
                        "length": 2,
                        "notes": [note.Gb1, note.Bb1, note.Eb2]
                    },
                    "23-1": {
                        "name": "A\u266Dm7sus4",
                        "img": "standard/yo/chord-23-1.png",
                        "length": 2,
                        "notes": [note.Ab1, note.Db2, note.Gb2]
                    },
                    "23-2": {
                        "name": "B\u266Dm7sus4",
                        "img": "standard/yo/chord-23-2.png",
                        "length": 2,
                        "notes": [note.Bb1, note.Eb2, note.Ab2]
                    },
                    "23-3": {
                        "name": "G\u266D/D\u266D",
                        "img": "standard/yo/chord-23-3.png",
                        "length": 2,
                        "notes": [note.Db2, note.Gb2, note.Bb2]
                    },
                    "13-1": {
                        "name": "D\u266Dmsus2sus4",
                        "img": "standard/yo/chord-13-1.png",
                        "length": 2,
                        "notes": [note.Db1, note.Eb1, note.Gb1]
                    },
                    "13-2": {
                        "name": "E\u266Dmsus4",
                        "img": "standard/yo/chord-13-2.png",
                        "length": 2,
                        "notes": [note.Eb1, note.Gb1, note.Ab1]
                    },
                    "13-3": {
                        "name": "G\u266D",
                        "img": "standard/yo/chord-13-3.png",
                        "length": 2,
                        "notes": [note.Gb1, note.Bb1, note.Db1]
                    },
                    "123-1": {
                        "name": "A\u266Dmsus2sus4",
                        "img": "standard/yo/chord-123-1.png",
                        "length": 2,
                        "notes": [note.Ab1, note.Bb1, note.Db1]
                    },
                    "123-2": {
                        "name": "B\u266Dmsus4",
                        "img": "standard/yo/chord-123-2.png",
                        "length": 2,
                        "notes": [note.Bb1, note.Db2, note.Eb2]
                    },
                    "123-3": {
                        "name": "D\u266Dmsus2sus4",
                        "img": "standard/yo/chord-123-3.png",
                        "length": 2,
                        "notes": [note.Db2, note.Eb2, note.Gb2]
                    }
                }
            }

        }
    };

    var daxShawzin = merge(standardShawzin, {
        "config": {
            "name": "Dax's Shawzin",
            "comment": "Based on a shamisen. Also includes Dawn, Mimica, and Day of the Dead skins.",
            "shawzinSoundPrefix": "dax/"
        }
    });

    var nelumboShawzin = merge(standardShawzin, {
        "config": {
            "name": "Nelumbo Shawzin",
            "comment": "Based on an acoustic guitar.",
            "shawzinSoundPrefix": "nelumbo/"
        }
    });

    var corbuShawzin = merge(standardShawzin, {
        "config": {
            "name": "Corbu Shawzin",
            "comment": "Based on djent-style electric guitar.",
            "shawzinSoundPrefix": "corbu/",
            "type": "monophonic",
        },
        "notes": {
            "length": 10
        },
        "scales": {

            "pmin": {
                "chords": {
                    "12-1": {
                        "name": "C",
                        "img": "corbu/pmin/chord-12-1.png",
                        "length": 12,
                        "notes": [note.C1, note.G1, note.C1]
                    },
                    "12-2": {
                        "name": "E\u266D",
                        "img": "corbu/pmin/chord-12-2.png",
                        "length": 12,
                        "notes": [note.Eb1, note.G1, note.C2]
                    },
                    "12-3": {
                        "name": "F",
                        "img": "corbu/pmin/chord-12-3.png",
                        "length": 12,
                        "notes": [note.F1, note.C2, note.F2]
                    },
                    "23-1": {
                        "name": "G",
                        "img": "corbu/pmin/chord-23-1.png",
                        "length": 12,
                        "notes": [note.G1, note.D2, note.G2]
                    },
                    "23-2": {
                        "name": "B\u266D",
                        "img": "corbu/pmin/chord-23-2.png",
                        "length": 12,
                        "notes": [note.Bb1, note.Eb2, note.Bb2]
                    },
                    "23-3": {
                        "name": "C",
                        "img": "corbu/pmin/chord-23-3.png",
                        "length": 12,
                        "notes": [note.C2, note.G2, note.C3]
                    },
                    "13-1": {
                        "name": "Cm",
                        "img": "corbu/pmin/chord-13-1.png",
                        "length": 32,
                        "notes": [note.C1, note.C2]
                    },
                    "13-2": {
                        "name": "E\u266D",
                        "img": "corbu/pmin/chord-13-2.png",
                        "length": 32,
                        "notes": [note.Eb1, note.Eb1]
                    },
                    "13-3": {
                        "name": "F",
                        "img": "corbu/pmin/chord-13-3.png",
                        "length": 32,
                        "notes": [note.F1, note.F2]
                    },
                    "323-1": {
                        "name": "G",
                        "img": "corbu/pmin/chord-323-1.png",
                        "length": 32,
                        "notes": [note.G1, note.G2]
                    },
                    "323-2": {
                        "name": "B\u266D",
                        "img": "corbu/pmin/chord-323-2.png",
                        "length": 32,
                        "notes": [note.Bb1, note.Bb2]
                    },
                    "323-3": {
                        "name": "C",
                        "img": "corbu/pmin/chord-323-3.png",
                        "length": 32,
                        "notes": [note.C2, note.C3]
                    }
                }
            },

            "pmaj": {
                "chords": {
                    "12-1": {
                        "name": "C",
                        "img": "corbu/pmaj/chord-12-1.png",
                        "length": 12,
                        "notes": [note.C1, note.G1, note.C2]
                    },
                    "12-2": {
                        "name": "D",
                        "img": "corbu/pmaj/chord-12-2.png",
                        "length": 12,
                        "notes": [note.D1, note.A1, note.D2]
                    },
                    "12-3": {
                        "name": "E",
                        "img": "corbu/pmaj/chord-12-3.png",
                        "length": 12,
                        "notes": [note.E1, note.B1, note.E2]
                    },
                    "23-1": {
                        "name": "G",
                        "img": "corbu/pmaj/chord-23-1.png",
                        "length": 12,
                        "notes": [note.G1, note.D2, note.G2]
                    },
                    "23-2": {
                        "name": "A",
                        "img": "corbu/pmaj/chord-23-2.png",
                        "length": 12,
                        "notes": [note.A1, note.E2, note.A2]
                    },
                    "23-3": {
                        "name": "C",
                        "img": "corbu/pmaj/chord-23-3.png",
                        "length": 12,
                        "notes": [note.C2, note.G2, note.C3]
                    },
                    "13-1": {
                        "name": "C",
                        "img": "corbu/pmaj/chord-13-1.png",
                        "length": 32,
                        "notes": [note.C1, note.C2]
                    },
                    "13-2": {
                        "name": "D",
                        "img": "corbu/pmaj/chord-13-2.png",
                        "length": 32,
                        "notes": [note.D1, note.D2]
                    },
                    "13-3": {
                        "name": "E",
                        "img": "corbu/pmaj/chord-13-3.png",
                        "length": 32,
                        "notes": [note.E1, note.E2]
                    },
                    "123-1": {
                        "name": "G",
                        "img": "corbu/pmaj/chord-123-1.png",
                        "length": 32,
                        "notes": [note.G1, note.G2]
                    },
                    "123-2": {
                        "name": "A",
                        "img": "corbu/pmaj/chord-123-2.png",
                        "length": 32,
                        "notes": [note.A1, note.A2]
                    },
                    "123-3": {
                        "name": "C",
                        "img": "corbu/pmaj/chord-123-3.png",
                        "length": 32,
                        "notes": [note.C2, note.C3]
                    }
                }
            },

            "chrom": {
                "chords": {
                    "12-1": {
                        "name": "C",
                        "img": "corbu/chrom/chord-12-1.png",
                        "length": 12,
                        "notes": [note.C1, note.G1, note.C2]
                    },
                    "12-2": {
                        "name": "C\u266F",
                        "img": "corbu/chrom/chord-12-2.png",
                        "length": 12,
                        "notes": [note.Gs1, note.Gs1, note.Cs2]
                    },
                    "12-3": {
                        "name": "D",
                        "img": "corbu/chrom/chord-12-3.png",
                        "length": 12,
                        "notes": [note.D1, note.A1, note.D2]
                    },
                    "23-1": {
                        "name": "D\u266F",
                        "img": "corbu/chrom/chord-23-1.png",
                        "length": 12,
                        "notes": [note.Ds1, note.As1, note.Ds2]
                    },
                    "23-2": {
                        "name": "E",
                        "img": "corbu/chrom/chord-23-2.png",
                        "length": 12,
                        "notes": [note.E1, note.B1, note.E2]
                    },
                    "23-3": {
                        "name": "F",
                        "img": "corbu/chrom/chord-23-3.png",
                        "length": 12,
                        "notes": [note.F1, note.C2, note.F2]
                    },
                    "13-1": {
                        "name": "F\u266F",
                        "img": "corbu/chrom/chord-13-1.png",
                        "length": 12,
                        "notes": [note.Fs1, note.Cs2, note.FS2],
                        // todo: figure out a better way to remove this during the merge
                        "comment": ""
                    },
                    "13-2": {
                        "name": "G",
                        "img": "corbu/chrom/chord-13-2.png",
                        "length": 12,
                        "notes": [note.G1, note.D2, note.G2]
                    },
                    "13-3": {
                        "name": "G\u266F",
                        "img": "corbu/chrom/chord-13-3.png",
                        "length": 12,
                        "notes": [note.Gs1, note.Ds2, note.Gs2]
                    },
                    "123-1": {
                        "name": "A",
                        "img": "corbu/chrom/chord-123-1.png",
                        "length": 12,
                        "notes": [note.A1, note.E2, note.A2]
                    },
                    "123-2": {
                        "name": "A\u266F",
                        "img": "corbu/chrom/chord-123-2.png",
                        "length": 12,
                        "notes": [note.As1, note.F2, note.As2]
                    },
                    "123-3": {
                        "name": "B",
                        "img": "corbu/chrom/chord-123-3.png",
                        "length": 12,
                        "notes": [note.B1, note.Fs2, note.B2]
                    }
                }
            },

            "hex": {
                "chords": {
                    "comment": "Same as the pentatonic minor chords",
                    "12-1": {
                        "name": "C",
                        "img": "corbu/pmin/chord-12-1.png",
                        "length": 12,
                        "notes": [note.C1, note.G1, note.C1]
                    },
                    "12-2": {
                        "name": "E\u266D",
                        "img": "corbu/pmin/chord-12-2.png",
                        "length": 12,
                        "notes": [note.Eb1, note.G1, note.C2]
                    },
                    "12-3": {
                        "name": "F",
                        "img": "corbu/pmin/chord-12-3.png",
                        "length": 12,
                        "notes": [note.F1, note.C2, note.F2]
                    },
                    "23-1": {
                        "name": "G",
                        "img": "corbu/pmin/chord-23-1.png",
                        "length": 12,
                        "notes": [note.G1, note.D2, note.G2]
                    },
                    "23-2": {
                        "name": "B\u266D",
                        "img": "corbu/pmin/chord-23-2.png",
                        "length": 12,
                        "notes": [note.Bb1, note.Eb2, note.Bb2]
                    },
                    "23-3": {
                        "name": "C",
                        "img": "corbu/pmin/chord-23-3.png",
                        "length": 12,
                        "notes": [note.C2, note.G2, note.C3]
                    },
                    "13-1": {
                        "name": "Cm",
                        "img": "corbu/pmin/chord-13-1.png",
                        "length": 32,
                        "notes": [note.C1, note.C2]
                    },
                    "13-2": {
                        "name": "E\u266D",
                        "img": "corbu/pmin/chord-13-2.png",
                        "length": 32,
                        "notes": [note.Eb1, note.Eb1]
                    },
                    "13-3": {
                        "name": "F",
                        "img": "corbu/pmin/chord-13-3.png",
                        "length": 32,
                        "notes": [note.F1, note.F2]
                    },
                    "323-1": {
                        "name": "G",
                        "img": "corbu/pmin/chord-323-1.png",
                        "length": 32,
                        "notes": [note.G1, note.G2]
                    },
                    "323-2": {
                        "name": "B\u266D",
                        "img": "corbu/pmin/chord-323-2.png",
                        "length": 32,
                        "notes": [note.Bb1, note.Bb2]
                    },
                    "323-3": {
                        "name": "C",
                        "img": "corbu/pmin/chord-323-3.png",
                        "length": 32,
                        "notes": [note.C2, note.C3]
                    }
                }
            },

            "maj": {
                "chords": {
                    "12-1": {
                        "name": "C",
                        "img": "corbu/maj/chord-12-1.png",
                        "length": 12,
                        "notes": [note.C1, note.G1, note.C2]
                    },
                    "12-2": {
                        "name": "D",
                        "img": "corbu/maj/chord-12-2.png",
                        "length": 12,
                        "notes": [note.D1, note.A1, note.D2]
                    },
                    "12-3": {
                        "name": "E",
                        "img": "corbu/maj/chord-12-3.png",
                        "length": 12,
                        "notes": [note.E1, note.B1, note.E2]
                    },
                    "23-1": {
                        "name": "F",
                        "img": "corbu/maj/chord-23-1.png",
                        "length": 12,
                        "notes": [note.F1, note.C2, note.F2]
                    },
                    "23-2": {
                        "name": "G",
                        "img": "corbu/maj/chord-23-2.png",
                        "length": 12,
                        "notes": [note.G1, note.D2, note.G2]
                    },
                    "23-3": {
                        "name": "A",
                        "img": "corbu/maj/chord-23-3.png",
                        "length": 12,
                        "notes": [note.A1, note.E2, note.A2]
                    },
                    "13-1": {
                        "name": "C",
                        "img": "corbu/maj/chord-13-1.png",
                        "length": 32,
                        "notes": [note.C1, note.C2]
                    },
                    "13-2": {
                        "name": "D",
                        "img": "corbu/maj/chord-13-2.png",
                        "length": 32,
                        "notes": [note.D1, note.D2]
                    },
                    "13-3": {
                        "name": "E",
                        "img": "corbu/maj/chord-13-3.png",
                        "length": 32,
                        "notes": [note.E1, note.E2]
                    },
                    "123-1": {
                        "name": "F",
                        "img": "corbu/maj/chord-123-1.png",
                        "length": 32,
                        "notes": [note.F1, note.C2, note.F2]
                    },
                    "123-2": {
                        "name": "G",
                        "img": "corbu/maj/chord-123-2.png",
                        "length": 32,
                        "notes": [note.G1, note.G2]
                    },
                    "123-3": {
                        "name": "A",
                        "img": "corbu/maj/chord-123-3.png",
                        "length": 32,
                        "notes": [note.G1, note.G2]
                    }
                }
            },

            "min": {
                "chords": {
                    "12-1": {
                        "name": "C",
                        "img": "corbu/min/chord-12-1.png",
                        "length": 12,
                        "notes": [note.C1, note.G1, note.C2]
                    },
                    "12-2": {
                        "name": "E\u266D",
                        "img": "corbu/min/chord-12-2.png",
                        "length": 12,
                        "notes": [note.Eb1, note.Bb1, note.Eb2]
                    },
                    "12-3": {
                        "name": "F",
                        "img": "corbu/min/chord-12-3.png",
                        "length": 12,
                        "notes": [note.F1, note.C2, note.F2]
                    },
                    "23-1": {
                        "name": "G",
                        "img": "corbu/min/chord-23-1.png",
                        "length": 12,
                        "notes": [note.G1, note.D2, note.G2]
                    },
                    "23-2": {
                        "name": "A\u266D",
                        "img": "corbu/min/chord-23-2.png",
                        "length": 12,
                        "notes": [note.Ab1, note.Eb1, note.Ab2]
                    },
                    "23-3": {
                        "name": "B\u266D",
                        "img": "corbu/min/chord-23-3.png",
                        "length": 12,
                        "notes": [note.Ab1, note.C2, note.Eb2]
                    },
                    "13-1": {
                        "name": "C",
                        "img": "corbu/min/chord-13-1.png",
                        "length": 32,
                        "notes": [note.C1, note.C2]
                    },
                    "13-2": {
                        "name": "E\u266D",
                        "img": "corbu/min/chord-13-2.png",
                        "length": 32,
                        "notes": [note.Eb1, note.Eb2]
                    },
                    "13-3": {
                        "name": "F",
                        "img": "corbu/min/chord-13-3.png",
                        "length": 32,
                        "notes": [note.F1, note.F2]
                    },
                    "123-1": {
                        "name": "G",
                        "img": "corbu/min/chord-123-1.png",
                        "length": 32,
                        "notes": [note.G1, note.G2]
                    },
                    "123-2": {
                        "name": "A\u266D",
                        "img": "corbu/min/chord-123-2.png",
                        "length": 32,
                        "notes": [note.Ab1, note.Ab2]
                    },
                    "123-3": {
                        "name": "B\u266D",
                        "img": "corbu/min/chord-123-3.png",
                        "length": 32,
                        "notes": [note.Bb1, note.Bb2]
                    }
                }
            },

            "hira": {
                "chords": {
                    "12-1": {
                        "name": "C",
                        "img": "corbu/hira/chord-12-1.png",
                        "length": 12,
                        "notes": [note.C1, note.G1, note.C2]
                    },
                    "12-2": {
                        "name": "D\u266D",
                        "img": "corbu/hira/chord-12-2.png",
                        "length": 12,
                        "notes": [note.Db1, note.Ab1, note.Db2]
                    },
                    "12-3": {
                        "name": "F",
                        "img": "corbu/hira/chord-12-3.png",
                        "length": 12,
                        "notes": [note.F1, note.C2, note.F2]
                    },
                    "23-1": {
                        "name": "G\u266D",
                        "img": "corbu/hira/chord-23-1.png",
                        "length": 12,
                        "notes": [note.Gb1, note.Db2, note.Gb2]
                    },
                    "23-2": {
                        "name": "B\u266D",
                        "img": "corbu/hira/chord-23-2.png",
                        "length": 12,
                        "notes": [note.Bb1, note.F2, note.Bb2]
                    },
                    "23-3": {
                        "name": "C",
                        "img": "corbu/hira/chord-23-3.png",
                        "length": 12,
                        "notes": [note.C2, note.G2, note.C3]
                    },
                    "13-1": {
                        "name": "C",
                        "img": "corbu/hira/chord-13-1.png",
                        "length": 32,
                        "notes": [note.C1, note.C2]
                    },
                    "13-2": {
                        "name": "D\u266D",
                        "img": "corbu/hira/chord-13-2.png",
                        "length": 32,
                        "notes": [note.Db1, note.Db2]
                    },
                    "13-3": {
                        "name": "F",
                        "img": "corbu/hira/chord-13-3.png",
                        "length": 32,
                        "notes": [note.F1, note.F2]
                    },
                    "123-1": {
                        "name": "G\u266D",
                        "img": "corbu/hira/chord-123-1.png",
                        "length": 32,
                        "notes": [note.Gb1, note.Db1, note.Gb2]
                    },
                    "123-2": {
                        "name": "B\u266D",
                        "img": "corbu/hira/chord-123-2.png",
                        "length": 32,
                        "notes": [note.Bb1, note.Bb2]
                    },
                    "123-3": {
                        "name": "C",
                        "img": "corbu/hira/chord-123-3.png",
                        "length": 32,
                        "notes": [note.C2, note.C3]
                    }
                }
            },

            "phry": {
                "chords": {
                    "12-1": {
                        "name": "C",
                        "img": "corbu/phry/chord-12-1.png",
                        "length": 12,
                        "notes": [note.C1, note.G1, note.C2]
                    },
                    "12-2": {
                        "name": "D\u266D",
                        "img": "corbu/phry/chord-12-2.png",
                        "length": 12,
                        "notes": [note.Db1, note.Ab1, note.Db2]
                    },
                    "12-3": {
                        "name": "F",
                        "img": "corbu/phry/chord-12-3.png",
                        "length": 12,
                        "notes": [note.F1, note.C2, note.F2]
                    },
                    "23-1": {
                        "name": "G",
                        "img": "corbu/phry/chord-23-1.png",
                        "length": 12,
                        "notes": [note.G1, note.D2, note.G2]
                    },
                    "23-2": {
                        "name": "A\u266D",
                        "img": "corbu/phry/chord-23-2.png",
                        "length": 12,
                        "notes": [note.Ab1, note.Eb1, note.Ab2]
                    },
                    "23-3": {
                        "name": "B\u266D",
                        "img": "corbu/phry/chord-23-3.png",
                        "length": 12,
                        "notes": [note.Bb1, note.F2, note.Bb2]
                    },
                    "13-1": {
                        "name": "C",
                        "img": "corbu/phry/chord-13-1.png",
                        "length": 32,
                        "notes": [note.C1, note.C2]
                    },
                    "13-2": {
                        "name": "D\u266D",
                        "img": "corbu/phry/chord-13-2.png",
                        "length": 32,
                        "notes": [note.Db1, note.Db2]
                    },
                    "13-3": {
                        "name": "F",
                        "img": "corbu/phry/chord-13-3.png",
                        "length": 32,
                        "notes": [note.F1, note.F2]
                    },
                    "123-1": {
                        "name": "G",
                        "img": "corbu/phry/chord-123-1.png",
                        "length": 32,
                        "notes": [note.G1, note.G2]
                    },
                    "123-2": {
                        "name": "A\u266D",
                        "img": "corbu/phry/chord-123-2.png",
                        "length": 32,
                        "notes": [note.Ab1, note.Ab2]
                    },
                    "123-3": {
                        "name": "B\u266D",
                        "img": "corbu/phry/chord-123-3.png",
                        "length": 32,
                        "notes": [note.Bb1, note.Bb2]
                    }
                }
            },

            "yo": {
                "chords": {
                    "comment": "These are all down a half-tone from the scale for some reason",
                    "12-1": {
                        "name": "C",
                        "img": "corbu/yo/chord-12-1.png",
                        "length": 12,
                        "notes": [note.C1, note.G1, note.C2]
                    },
                    "12-2": {
                        "name": "D",
                        "img": "corbu/yo/chord-12-2.png",
                        "length": 12,
                        "notes": [note.D1, note.A1, note.D2]
                    },
                    "12-3": {
                        "name": "F",
                        "img": "corbu/yo/chord-12-3.png",
                        "length": 12,
                        "notes": [note.F1, note.C2, note.F2]
                    },
                    "23-1": {
                        "name": "G",
                        "img": "corbu/yo/chord-23-1.png",
                        "length": 12,
                        "notes": [note.G1, note.D2, note.G2]
                    },
                    "23-2": {
                        "name": "A",
                        "img": "corbu/yo/chord-23-2.png",
                        "length": 12,
                        "notes": [note.A1, note.E1, note.A2]
                    },
                    "23-3": {
                        "name": "C",
                        "img": "corbu/yo/chord-23-3.png",
                        "length": 12,
                        "notes": [note.C2, note.G2, note.C3]
                    },
                    "13-1": {
                        "name": "C",
                        "img": "corbu/yo/chord-13-1.png",
                        "length": 32,
                        "notes": [note.C1, note.C2]
                    },
                    "13-2": {
                        "name": "D",
                        "img": "corbu/yo/chord-13-2.png",
                        "length": 32,
                        "notes": [note.D1, note.D2]
                    },
                    "13-3": {
                        "name": "F",
                        "img": "corbu/yo/chord-13-3.png",
                        "length": 32,
                        "notes": [note.F1, note.F2]
                    },
                    "123-1": {
                        "name": "G",
                        "img": "corbu/yo/chord-123-1.png",
                        "length": 32,
                        "notes": [note.G1, note.G2]
                    },
                    "123-2": {
                        "name": "A",
                        "img": "corbu/yo/chord-123-2.png",
                        "length": 32,
                        "notes": [note.A1, note.A2]
                    },
                    "123-3": {
                        "name": "C",
                        "img": "corbu/yo/chord-123-3.png",
                        "length": 32,
                        "notes": [note.C1, note.C2]
                    }
                }
            }
        }
    });

    var tiamatShawzin = merge(standardShawzin, {
        "config": {
            "name": "Tiamat Shawzin",
            "comment": "Based on an electric bass.",
            "shawzinSoundPrefix": "tiamat/",
            "type": "monophonic",
            "slap": "true",
        },
        "notes": {
            "length": 10
        },
        "slap": {
            "length": 4
        }
    });

    var aristeiShawzin = merge(standardShawzin, {
        "config": {
            "name": "Aristei Shawzin",
            "comment": "Based on harp.",
            "shawzinSoundPrefix": "aristei/",
        },
        "scales": {
            "phry": {
                "chords": {
                    "123-2": {
                        "name": "B\u266Dsus2",
                        "img": "standard/pmin/chord-123-2.png",
                        "length": 2,
                        "notes": [note.Bb1, note.C2, note.F2],
                        "comment": "Probably a bug, this is the 123-2 chord from the pmin and hiro scales"
                    }
                }
            }
        }
    });

    var narmerShawzin = merge(standardShawzin, {
        "config": {
            "name": "Narmer Shawzin",
            "comment": "Based on a lead electric guitar.",
            "shawzinSoundPrefix": "narmer/",
            "type": "monophonic",
        },
        "notes": {
            "length": 10
        },
        "scales": {
            "pmin": {
                "chords": {
                    "12-1": { "length": 12 },
                    "12-2": { "length": 12 },
                    "12-3": { "length": 12 },
                    "23-1": { "length": 12 },
                    "23-2": { "length": 12 },
                    "23-3": { "length": 12 },
                    "13-1": { "length": 12 },
                    "13-2": { "length": 12 },
                    "13-3": { "length": 12 },
                    "123-1": { "length": 12 },
                    "123-2": { "length": 12 },
                    "123-3": { "length": 12 }
                }
            },
            "pmaj": {
                "chords": {
                    "12-1": { "length": 12 },
                    "12-2": { "length": 12 },
                    "12-3": { "length": 12 },
                    "23-1": { "length": 12 },
                    "23-2": { "length": 12 },
                    "23-3": { "length": 12 },
                    "13-1": { "length": 12 },
                    "13-2": { "length": 12 },
                    "13-3": { "length": 12 },
                    "123-1": { "length": 12 },
                    "123-2": { "length": 12 },
                    "123-3": { "length": 12 }
                }
            },
            "chrom": {
                "chords": {
                    "12-1": { "length": 12 },
                    "12-2": { "length": 12 },
                    "12-3": { "length": 12 },
                    "23-1": { "length": 12 },
                    "23-2": { "length": 12 },
                    "23-3": { "length": 12 },
                    "13-1": { "length": 12 },
                    "13-2": { "length": 12 },
                    "13-3": { "length": 12 },
                    "123-1": { "length": 12 },
                    "123-2": { "length": 12 },
                    "123-3": { "length": 12 }
                }
            },
            "hex": {
                "chords": {
                    "12-1": { "length": 12 },
                    "12-2": { "length": 12 },
                    "12-3": { "length": 12 },
                    "23-1": { "length": 12 },
                    "23-2": { "length": 12 },
                    "23-3": { "length": 12 },
                    "13-1": { "length": 12 },
                    "13-2": { "length": 12 },
                    "13-3": { "length": 12 },
                    "123-1": { "length": 12 },
                    "123-2": { "length": 12 },
                    "123-3": { "length": 12 }
                }
            },
            "maj": {
                "chords": {
                    "12-1": { "length": 12 },
                    "12-2": { "length": 12 },
                    "12-3": { "length": 12 },
                    "23-1": { "length": 12 },
                    "23-2": { "length": 12 },
                    "23-3": { "length": 12 },
                    "13-1": { "length": 12 },
                    "13-2": { "length": 12 },
                    "13-3": { "length": 12 },
                    "123-1": { "length": 12 },
                    "123-2": { "length": 12 },
                    "123-3": { "length": 12 }
                }
            },
            "min": {
                "chords": {
                    "12-1": { "length": 12 },
                    "12-2": { "length": 12 },
                    "12-3": { "length": 12 },
                    "23-1": { "length": 12 },
                    "23-2": { "length": 12 },
                    "23-3": { "length": 12 },
                    "13-1": { "length": 12 },
                    "13-2": { "length": 12 },
                    "13-3": { "length": 12 },
                    "123-1": { "length": 12 },
                    "123-2": { "length": 12 },
                    "123-3": { "length": 12 }
                }
            },
            "hira": {
                "chords": {
                    "12-1": { "length": 12 },
                    "12-2": { "length": 12 },
                    "12-3": { "length": 12 },
                    "23-1": { "length": 12 },
                    "23-2": { "length": 12 },
                    "23-3": { "length": 12 },
                    "13-1": { "length": 12 },
                    "13-2": { "length": 12 },
                    "13-3": { "length": 12 },
                    "123-1": { "length": 12 },
                    "123-2": { "length": 12 },
                    "123-3": { "length": 12 }
                }
            },
            "phry": {
                "chords": {
                    "12-1": { "length": 12 },
                    "12-2": { "length": 12 },
                    "12-3": { "length": 12 },
                    "23-1": { "length": 12 },
                    "23-2": { "length": 12 },
                    "23-3": { "length": 12 },
                    "13-1": { "length": 12 },
                    "13-2": { "length": 12 },
                    "13-3": { "length": 12 },
                    "123-1": { "length": 12 },
                    "123-2": { "length": 12 },
                    "123-3": { "length": 12 }
                }
            },
            "yo": {
                "chords": {
                    "12-1": { "length": 12 },
                    "12-2": { "length": 12 },
                    "12-3": { "length": 12 },
                    "23-1": { "length": 12 },
                    "23-2": { "length": 12 },
                    "23-3": { "length": 12 },
                    "13-1": { "length": 12 },
                    "13-2": { "length": 12 },
                    "13-3": { "length": 12 },
                    "123-1": { "length": 12 },
                    "123-2": { "length": 12 },
                    "123-3": { "length": 12 }
                }
            }
        }
    });

    var kiraShawzin = merge(standardShawzin, {
        "config": {
            "name": "Kira's Shawzin",
            "comment": "Based on a keytar/synthesizer.",
            "shawzinSoundPrefix": "kira/"
        }
    });

    var voidShawzin = merge(standardShawzin, {
        "config": {
            "name": "Void's Song Shawzin",
            "comment": "Based on vocals/vocaloid.",
            "shawzinSoundPrefix": "void/",
            "type": "duophonic",
        },
        "notes": {
            "length": 22
        },
        "scales": {
            "pmin": {
                "chords": {
                    "12-1": { "length": 32 },
                    "12-2": { "length": 32 },
                    "12-3": { "length": 32 },
                    "23-1": { "length": 32 },
                    "23-2": { "length": 32 },
                    "23-3": { "length": 32 },
                    "13-1": { "length": 32 },
                    "13-2": { "length": 32 },
                    "13-3": { "length": 32 },
                    "123-1": { "length": 32 },
                    "123-2": { "length": 32 },
                    "123-3": { "length": 32 }
                }
            },
            "pmaj": {
                "chords": {
                    "12-1": { "length": 32 },
                    "12-2": { "length": 32 },
                    "12-3": { "length": 32 },
                    "23-1": { "length": 32 },
                    "23-2": { "length": 32 },
                    "23-3": { "length": 32 },
                    "13-1": { "length": 32 },
                    "13-2": { "length": 32 },
                    "13-3": { "length": 32 },
                    "123-1": { "length": 32 },
                    "123-2": { "length": 32 },
                    "123-3": { "length": 32 }
                }
            },
            "chrom": {
                "chords": {
                    "12-1": { "length": 32 },
                    "12-2": { "length": 32 },
                    "12-3": { "length": 32 },
                    "23-1": { "length": 32 },
                    "23-2": { "length": 32 },
                    "23-3": { "length": 32 },
                    "13-1": { "length": 32 },
                    "13-2": { "length": 32 },
                    "13-3": { "length": 32 },
                    "123-1": { "length": 32 },
                    "123-2": { "length": 32 },
                    "123-3": { "length": 32 }
                }
            },
            "hex": {
                "chords": {
                    "12-1": { "length": 32 },
                    "12-2": { "length": 32 },
                    "12-3": { "length": 32 },
                    "23-1": { "length": 32 },
                    "23-2": { "length": 32 },
                    "23-3": { "length": 32 },
                    "13-1": { "length": 32 },
                    "13-2": { "length": 32 },
                    "13-3": { "length": 32 },
                    "123-1": { "length": 32 },
                    "123-2": { "length": 32 },
                    "123-3": { "length": 32 }
                }
            },
            "maj": {
                "chords": {
                    "12-1": { "length": 32 },
                    "12-2": { "length": 32 },
                    "12-3": { "length": 32 },
                    "23-1": { "length": 32 },
                    "23-2": { "length": 32 },
                    "23-3": { "length": 32 },
                    "13-1": { "length": 32 },
                    "13-2": { "length": 32 },
                    "13-3": { "length": 32 },
                    "123-1": { "length": 32 },
                    "123-2": {
                        "name": "G<sup>7</sup>/D",
                        "img": "aristei/maj/chord-123-1.png",
                        "length": 32,
                        "notes": [note.D1, note.F1, note.B1],
                        "comment": "Has a low D instead of a G, still functional as a G<sup>7</sup> but just weirdly different"
                    },
                    "123-3": { "length": 32 }
                }
            },
            "min": {
                "chords": {
                    "12-1": { "length": 32 },
                    "12-2": { "length": 32 },
                    "12-3": { "length": 32 },
                    "23-1": { "length": 32 },
                    "23-2": { "length": 32 },
                    "23-3": { "length": 32 },
                    "13-1": { "length": 32 },
                    "13-2": { "length": 32 },
                    "13-3": { "length": 32 },
                    "123-1": {
                        "name": "B\u266D/F",
                        "img": "aristei/min/chord-123-1.png",
                        "length": 32,
                        "notes": [note.F1, note.Bb1, note.D2],
                        "comment": "Has a high D instead of a G, turning it into an inverted B\u266D chord"
                    },
                    "123-2": {
                        "name": "A\u266Dmaj7/G",
                        "img": "aristei/min/chord-123-2.png",
                        "length": 32,
                        "notes": [note.G1, note.C2, note.Ab2],
                        "comment": "The middle A\u266D is up an octave, changing the feel of this chord"
                    },
                    "123-3": {
                        "name": "B\u266D<sup>7</sup>/A\u266D",
                        "img": "aristei/min/chord-123-3.png",
                        "length": 32,
                        "notes": [note.Ab1, note.D2, note.Bb2],
                        "comment": "The middle B\u266D is up an octave, changing the feel of this chord"
                    }
                }
            },
            "hira": {
                "chords": {
                    "12-1": { "length": 32 },
                    "12-2": { "length": 32 },
                    "12-3": { "length": 32 },
                    "23-1": { "length": 32 },
                    "23-2": { "length": 32 },
                    "23-3": { "length": 32 },
                    "13-1": { "length": 32 },
                    "13-2": { "length": 32 },
                    "13-3": { "length": 32 },
                    "123-1": { "length": 32 },
                    "123-2": { "length": 32 },
                    "123-3": { "length": 32 }
                }
            },
            "phry": {
                "chords": {
                    "12-1": { "length": 32 },
                    "12-2": { "length": 32 },
                    "12-3": { "length": 32 },
                    "23-1": { "length": 32 },
                    "23-2": { "length": 32 },
                    "23-3": { "length": 32 },
                    "13-1": { "length": 32 },
                    "13-2": { "length": 32 },
                    "13-3": { "length": 32 },
                    "123-1": { "length": 32 },
                    "123-2": { "length": 32 },
                    "123-3": { "length": 32 }
                }
            },
            "yo": {
                "chords": {
                    "12-1": { "length": 32 },
                    "12-2": { "length": 32 },
                    "12-3": { "length": 32 },
                    "23-1": { "length": 32 },
                    "23-2": { "length": 32 },
                    "23-3": { "length": 32 },
                    "13-1": { "length": 32 },
                    "13-2": { "length": 32 },
                    "13-3": { "length": 32 },
                    "123-1": { "length": 32 },
                    "123-2": { "length": 32 },
                    "123-3": { "length": 32 }
                }
            }
        }
    });

    return  {
        shawzinOrder: shawzinOrder,
        noteOrder: noteOrder,
        scaleOrder: scaleOrder,
        scaleNoteOrder: scaleNoteOrder,
        scaleChordOrder: scaleChordOrder,
        shawzinList: {
            "dax": daxShawzin,
            "nelumbo": nelumboShawzin,
            "corbu": corbuShawzin,
            "tiamat": tiamatShawzin,
            "aristei": aristeiShawzin,
            "narmer" :narmerShawzin,
            "kira": kiraShawzin,
            "void": voidShawzin
        }
    }
})();
