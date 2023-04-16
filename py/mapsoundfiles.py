# hell no I didn't sit down and record 1062 individual shawzin sounds
# I downloaded the .wavs from kasumata and built this script to convert/reorganize them

import os
from pathlib import Path
import argparse

parser = argparse.ArgumentParser(description="yeah")
parser.add_argument("--destdir", dest="destdir", action="store", required=True)
args = parser.parse_args()
destdir = args.destdir

shawzinNoteMap = {
    "OneC": "c1",
    "OneCSharp": "cs1",
    "OneD": "d1",
    "OneDSharp": "ds1",
    "OneE": "e1",
    "OneF": "f1",
    "OneFSharp": "fs1",
    "OneG": "g1",
    "OneGSharp": "gs1",
    "OneA": "a1",
    "OneASharp": "as1",
    "OneB": "b1",
    "TwoC": "c2",
    "TwoCSharp": "cs2",
    "TwoD": "d2",
    "TwoDSharp": "ds2",
    "TwoE": "e2",
    "TwoF": "f2",
    "TwoFSharp": "fs2",
    "TwoG": "g2",
    "TwoGSharp": "gs2",
    "TwoA": "a2",
    "TwoASharp": "as2",
    "TwoB": "b2",
    "ThreeC": "c3",
    "ThreeCSharp": "cs3",
    "ThreeD": "d3",
    "ThreeDSharp": "ds3",
}

shawzinChordMap = {
    "A": "12-1",
    "B": "12-2",
    "C": "12-3",
    "G": "23-1",
    "H": "23-2",
    "I": "23-3",
    "D": "13-1",
    "E": "13-2",
    "F": "13-3",
    "J": "123-1",
    "K": "123-2",
    "L": "123-3",
}

shawzinNameMap = {
    "PrimeShawzin": "aristei",
    "LotusShawzin": "nelumbo",
    "SentientShawzin": "tiamat",
    "Shawzin": "dax",
    "NarmerShawzin": "narmer",
    "GrineerShawzin": "corbu",
    "ZarimanVoidShawzin": "void",
    "ZarimanShawzin": "kira"
}

shawzinScaleNameMap = {
    "PentMin": "pmin",
    "PentMaj": "pmaj",
    "Chromatic": "chrom",
    "Blues": "hex",
    "Maj": "maj",
    "Min": "min",
    "Phrygian": "phry",
    "Hirajoshi": "hira",
    "Yo": "yo",
}

shawzinAltPrefix = "Flourish"
shawzinSlapPrefix = "SlapOct"
shawzinNotePrefix = "Oct"
shawzinChordPrefix = "Chord"


def convertfilename(path):
    basename = os.path.basename(path)[:-4]
    for shawzinprefix in shawzinNameMap:
        if basename.startswith(shawzinprefix):
            shawzin = shawzinNameMap[shawzinprefix]
            basename = basename[len(shawzinprefix):]

            if shawzinChordPrefix in basename:
                scale = "unknown"
                for scaleprefix in shawzinScaleNameMap:
                    if basename.startswith(scaleprefix):
                        scale = shawzinScaleNameMap[scaleprefix]
                        basename = basename[len(scaleprefix):]
                        break
                basename = basename[len(shawzinChordPrefix):]
                chord = shawzinChordMap[basename]
                return os.path.join(shawzin, "chord", scale, chord)

            else:
                if basename.startswith(shawzinAltPrefix):
                    suffix = "-alt"
                    basename = basename[len(shawzinAltPrefix):]
                else:
                    suffix = ""

                if basename.startswith(shawzinSlapPrefix):
                    type = "slap"
                    basename = basename[len(shawzinSlapPrefix):]
                elif basename.startswith(shawzinNotePrefix):
                    type = "note"
                    basename = basename[len(shawzinNotePrefix):]
                else:
                    type = "unknown"
                note = shawzinNoteMap[basename]
                return os.path.join(shawzin, type, note + suffix)
    return "unknown"


currentDir = "."
walkdir = os.path.abspath(currentDir)
ffmpegline = "ffmpeg -i {0} -vn -b:a 192k {1}"

for root, subdirs, files in os.walk(walkdir):
    for filename in files:
        filepath = os.path.join(root, filename)
        newfilepath = os.path.join(destdir, convertfilename(filepath) + ".mp3")
        if not os.path.isfile(newfilepath):
            newdir = os.path.dirname(newfilepath)
            Path(newdir).mkdir(parents=True, exist_ok=True)
            os.system(ffmpegline.format(filepath, newfilepath))
        else:
            print("skipped " + newfilepath)
