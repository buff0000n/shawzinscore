var DuviriMetadata = (function() {
    var joy = "Joy";
    var anger = "Anger";
    var envy = "Envy";
    var sorrow = "Sorrow";
    var fear = "Fear";

    var moodList = [
        joy, fear, sorrow, anger, envy
    ]
    var difficultyColors = [
        "green", "chartreuse", "yellow", "orange", "red"
    ];
    var stations = [
        {
            "name": "Amphitheater",
            "location": "Amphitheater, right in the middle on stage",
            "coordinates": {"x": 124, "y": 496},
            "moods": [joy, anger, envy, fear],
            "pics": ["1-amp-1", "1-amp-2", "1-amp-3", "1-amp-4"],
            "difficulty": 4,
            "song": {
                "name": "The Day The Earth Bled",
                "code": {
                    "normal": "7BAASAIC//SAYC//BAgSAoC//SA4C//0BAE//xBQB//BCASCIC//SCYC//BCgSCoC//SC4C//0DAE//xDQB//REAREQREgMEwRFAMFQKFYKFgRGASGQRGgKGw0HAk//xHQh//",
                    "virtuoso": "7BAASAIUAQSAYBAgSAoUAwSA40BAk//yBFi//xBKh//xBQh//BCASCIUCQSCYBCgSCoUCwSC40DAk//yDFi//xDKh//xDQh//REASEFUEKREQREgSElUEqMEwRFASFFUFKMFQKFYKFgRGASGFUGKSGQRGgSGlUGqKGw0HAk//yHFi//xHKh//xHQh//"
                },
               "meter": "4/4",
               "tempo": "120"
           }
        },
        {
            "name": "Roalstead Pastures",
            "location": "Roalstead Pastures north of the the roundabout in the middle with the statue",
            "coordinates": {"x": 194, "y": 274},
            "moods": [joy, anger, envy, sorrow, fear],
            "pics": ["2-xroad-1", "2-xroad-2", "2-xroad-3", "2-xroad-4"],
            "difficulty": 1,
            "song": {
                "name": "Verdant Plains",
                "code": {
                    "normal": "9BAAJAQMAgJAwBBAJBQJBgBCAJCQMCgJCwcDAM//ZDQJ//BEAJEQMEgJEwBFAJFQUFgSFwBGAJGQMGgJGwpHAR//qHQS//0Hgk//",
                    "virtuoso": "9BAAJAIJAQKAYMAgKAsJAwBBAJBIJBQKBYJBgqBwS//BCAJCIJCQKCYMCgKCsJCwcDAM//aDIK//ZDQJ//qDgS//BEAJEIJEQKEYMEgKEsJEwBFAJFIJFQKFYUFgSFmRFrSFwBGAJGIJGQKGYMGgKGsJGwpHAR//qHQS//0Hgk//"
               },
               "meter": "4/4",
               "tempo": "120"
            }
        },
        {
            "name": "Archarbor",
            "location": "Archarbor, on the third level next to the bridge",
            "coordinates": {"x": 447, "y": 123},
            "moods": [joy, envy, sorrow],
            "pics": ["3-arch-1", "3-arch-2", "3-arch-3", "3-arch-4"],
            "difficulty": 3,
            "song": {
                "name": "Elegy of the Dolls",
                "code": {
                    "normal": "6SAASAQUAYkAohAwkBAiBISBgSBwUB4kCIUCQE//yDAi//yDYi//0Dwk//0EIk//yEgi//iE40FQk//SGASGQUGYkGohGwkHAiHISHgSHwUH4kIIUIQE//SIoC//",
                    "virtuoso": "6SAARAMSAQUAYkAohAwkBAiBISBgRBsSBwUB4kCIUCQkC4yDAi//kDQyDYi//kDo0Dwk//0EIk//kEYyEgi//kEwiE4kFI0FQk//SGARGMSGQUGYkGohGwkHAiHISHgRHsSHwUH4kIIUIQSIo"
               },
               "meter": "3/4",
               "tempo": "120"
            }
        },
        {
            "name": "Northwind Village",
            "location": "Northwind Village, the statue on the right, southwest of the biggest pool",
            "coordinates": {"x": 361, "y": 354},
            "moods": [joy, anger, envy, sorrow, fear],
            "pics": ["4-stats-1", "4-stats-2", "4-stats-3", "4-stats-4"],
            "difficulty": 3,
            "song": {
                "name": "Passing Days",
                "code": {
                    "normal": "5BAACAMEAQCAYKAgKAoKAwZBIJ//BBgCBsEBwCB4KCAKCIKCQcCoM//0DAk//yDYi//xDwh//cEIM//MEgJEwKE4kFAE//hFQB//ZFoJ//",
                    "virtuoso": "5BAACAMEAQCAYKAgKAoKAwaBAK//ZBIJ//BBgCBsEBwCB4KCAKCIKCQaCgK//cCoM//0DAk//0DQk//yDYi//xDwh//kEAcEIM//MEgKEsJEwKE4kFAiFIhFQZFoJ//"
               },
               "meter": "3/4",
               "tempo": "120"
            }
        },
        {
            "name": "Orion Tower",
            "location": "Orion Tower, northwest side",
            "coordinates": {"x": 446, "y": 346},
            "moods": [joy, anger, envy, sorrow, fear],
            "pics": ["5-tower-1", "5-tower-2", "5-tower-3", "5-tower-4"],
            "difficulty": 3,
            "song": {
                "name": "Dax's March",
                "code": {
                    "normal": "8BAAMAMKAQJAgBAwMA8KBAJBQKBYcBgM//ZBwJ//BCQMCcKCgJCwBDAMDMKDQJDgKDocDwM//yEAi//SEgSEwSFAkFQSFwBGAMGMKGQJGgcGwM//yHAi//yHQi//JHgiIA",
                    "virtuoso": "8BAAMAMKAQKAYJAgBAwMA8KBAKBIJBQKBYcBgM//aBoK//ZBwJ//ZCAJ//BCQMCcKCgKCoJCwBDAMDMKDQKDYJDgKDocDwM//xD4h//yEAi//yEQi//SEgUEsSEwRE4SFAkFQiFchFgUFoSFwBGAMGMKGQKGYJGgKGocGwM//xG4h//yHAi//yHQi//JHgiIA"
               },
               "meter": "6/4",
               "tempo": "120"
            }
        },
        {
            "name": "Lonesome Outlook",
            "location": "Lonesome Outlook, Eastern edge by the tree",
            "coordinates": {"x": 542, "y": 491},
            "moods": [joy, anger, envy, sorrow, fear],
            "pics": ["6-outlook-1", "6-outlook-2", "6-outlook-3", "6-outlook-4"],
            "difficulty": 2,
            "song": {
                "name": "Verula Sings",
                "code": {
                    "normal": "2BAABAICAMEAQBAYCAgJAoB//JAwB//BBABBICBMEBQBBYCBgBCABCICCMECQBCYMCgE//KCoC//JCwB//BDABDICDMEDQCDYBDgJEAJEIMEQJEYKEgKEoKEwJFAJFIMFQJFYKFgBGABGICGMEGQBGYCGgJGoB//JGwB//JHAB//EHQBHg",
                    "virtuoso": "2BAABAICAMEAQBAYCAgyAoi//yAwi//BBABBICBMEBQBBYCBgBCABCICCMECQBCY8CgU//6CoS//5CwR//BDABDICDMEDQBDYCDgEDwJEAJEEJEIKEMMEQKEUJEYKEgKEwJFAJFEJFIKFMMFQKFUJFYKFgMFoMFwBGABGICGMEGQBGYCGgyGoS//yGwS//BHABHICHMEHQCHYBHg"
               },
               "meter": "4/4",
               "tempo": "120"
            }
        },
        {
            "name": "Fair Shores Hamlet",
            "location": "Fair Shores Hamlet, on the building at the north side the bridge that goes over the road",
            "coordinates": {"x": 494, "y": 586},
            "moods": [joy, anger, envy, sorrow, fear],
            "pics": ["7-ham-1", "7-ham-2", "7-ham-3", "7-ham-4"],
            "difficulty": 5,
            "song": {
                "name": "Sky Ever Changing",
                "code": {
                    "normal": "6BAAJAQKAYJAoBAwJBAKBIBBgJBwKB4RCISCQUCgSCo0DAk//yDYi//0Dwk//yEIi//0Egk//yE4i//SFQUFghFoB//BGAJGQKGYBGwJHAKHIBHgJHwKH4RIISIQMIYE//KIgC//JIoB//",
                    "virtuoso": "6BAAJAQMAUKAYJAoBAwJBAMBEKBIBBgJBwMB0KB4RCISCQUCgSCo0DAk//yDYi//0Dwk//kEAyEIi//0Egk//yE4i//SFISFQUFghFoBGAJGQMGUKGYJGoBGwJHAMHEKHIBHgJHwMH0KH4RIISIQRIUMIYKIgJIo"
               },
               "meter": "3/4",
               "tempo": "120"
            }
        },
        {
            "name": "The Agora",
            "location": "The Agora, west side of the central island",
            "coordinates": {"x": 428, "y": 560},
            "moods": [joy, anger, envy, sorrow, fear],
            "pics": ["8-ago-1", "8-ago-2", "8-ago-3", "8-ago-4"],
            "difficulty": 5,
            "song": {
                "name": "Galleria Delights",
                "code": {
                    "normal": "5SAAUAIhAQB//hAYB//SAwUA4hBAB//hBIB//SBgUBohBwB//iB4C//hCAB//UCIE//SCQC//RCYB//UCgE//hCoB//SDAUDIhDQB//hDYB//SDwUD4hEAB//hEIB//SEgUEohEwB//iE4C//hFAB//UFIE//SFQC//RFYB//KFgC//SFo",
                    "virtuoso": "5SAAUAI0AQk//0AYk//SAwUA40BAk//0BIk//SBgUBohBwiB4hCAUCISCQRCYyCgi//0Cok//SDAUDI0DQk//0DYk//SDwUD40EAk//0EIk//SEgUEohEwiE4hFAUFISFQRFYKFgSFo"
               },
               "meter": "3/4",
               "tempo": "120"
            }
        },
        {
            "name": "Primrose Village",
            "location": "Primrose Village, east of the village at the top of the hill, under a tree",
            "coordinates": {"x": 336, "y": 639},
            "moods": [joy, anger, envy, sorrow, fear],
            "pics": ["9-hill-1", "9-hill-2", "9-hill-3", "9-hill-4"],
            "difficulty": 4,
            "song": {
                "name": "Lorn Echoes",
                "code": {
                    "normal": "8RAAUAQkAYE//iAgC//kAwE//RBAUBQkBYE//hBgB//RCAUCQkCYE//iCgC//hCwB//RDAUDQkDYE//hDgB//yEAi//0EYk//xEgh//yFAi//0FYk//cFgE//RGAUGQkGYE//iGgC//kGwE//0HAk//xHQh//aHgK//ZHwJ//SIAJIg",
                    "virtuoso": "8RAASAIUAQkAYiAgkAwRBASBIUBQkBYhBgRCASCIUCQkCYiCghCwRDASDIUDQkDYhDgyEAi//yEIi//yEQi//0EYk//xEgh//xEwh//yFAi//yFIi//yFQi//0FYk//cFgM//RGASGIUGQkGYiGgkGw0HAk//yHIi//xHQh//cHYM//aHgK//ZHwJ//SIAJIg"
               },
               "meter": "4/4",
               "tempo": "120"
            }
        },
        {
            "name": "The King's Palace",
            "location": "The King's Palace, on the building at the southeast corner of the central plaza, near the bridge with dining tables on it",
            "coordinates": {"x": 190, "y": 735},
            "moods": [joy, anger, envy, sorrow, fear],
            "pics": ["10-town-1", "10-town-2", "10-town-3", "10-town-4"],
            "difficulty": 3,
            "song": {
                "name": "Watcher's Eye",
                "code": {
                    "normal": "1BAABAMCAYEAcJAgB//JAwB//BBABBMCBYEBcKBgC//JBwB//BCABCMCCYECcJCgB//JCwB//kDASDQSDYSDgUDskEASEQSEYSEgREsBFABFMCFYEFcJFgB//JFwB//BGABGMCGYEGcBGg",
                    "virtuoso": "1BAABAMCAYEAcyAgi//yAwi//BBABBMCBYEBc0Bgk//yBwi//BCABCMCCYECcyCgi//yCwi//kDAiDFhDKSDQSDYSDgUDskEAiEFhEKSEQSEYSEgUEkREskFAiFFhFKSFQSFYSFgUFsBGABGMCGYEGcyGgi//yGwi//BHABHMCHYEHcBHg"
               },
               "meter": "4/4",
               "tempo": "120"
            }
        },
        {
            "name": "Titan's Rest",
            "location": "Titan's Rest, to the southeast and underneath, on the balconies by the caves",
            "coordinates": {"x": 739, "y": 727},
            "moods": [joy, anger, envy, sorrow, fear],
            "pics": ["11-under-1", "11-under-2", "11-under-3", "11-under-4"],
            "difficulty": 3,
            "song": {
                "name": "There Came A Stranger",
                "code": {
                    "normal": "1BAAMAIE//JAQB//KAYC//BAgMAoE//JAwB//BBAMBIE//JBQB//KBYC//RBgB//UBwE//BCAMCIE//JCQB//KCYC//BCgMCoE//JCwB//BDAMDIE//JDQB//KDYC//RDgB//UDwE//yEAi//xEQh//yEgi//xEwh//cFAM//aFQK//cFgM//aFwK//BGAMGIE//JGQB//KGYC//BGgMGoE//JGwB//BHAMHIE//JHQB//EHgCHoBHw",
                    "virtuoso": "1BAAMAIKAMJAQKAYBAgMAoKAsJAwBBAMBIKBMJBQKBYRBgSBoUBwBCAMCIKCMJCQKCYBCgMCoKCsJCwBDAMDIKDMJDQKDYRDgSDoUDwhD4yEAi//xEQh//yEgi//xEwh//cFAM//aFQK//cFgM//aFwK//BGAMGIKGMJGQKGYBGgMGoKGsJGwBHAMHIKHMJHQKHYMHcEHgCHoBHw"
               },
               "meter": "4/4",
               "tempo": "120"
            }
        },
        {
            "name": "Chamber of the Muses",
            "location": "Chamber of the Muses, southeast and just south of the opera singer's stage",
            "coordinates": {"x": 827, "y": 834},
            "moods": [joy, anger, envy, sorrow, fear],
            "pics": ["12-muse-1", "12-muse-2", "12-muse-3", "12-muse-4"],
            "difficulty": 2,
            "song": {
                "name": "Spirits of Manipura",
                "code": {
                    "normal": "2JAAMAIKAQJAgMAoKAwUBASBIUBgRBoSBwJCAMCIKCQJCgMCoKCwUDASDIUDgRDoSDwMEAMEQREgMFARFQSFgJGAMGIKGQJGgMGoKGwUHARHQMHg",
                    "virtuoso": "2JAAMAIKAQJAgMAoKAwUBASBIUBgSBkRBoSBwJCAMCIKCQJCgMCoKCwUDASDIUDgRDoSDwaEAK//aEQK//cEgM//aFAK//cFQM//xFgh//JGAMGIKGQJGgMGoKGwUHASHERHIMHMKHQJHYMHg"
               },
               "meter": "4/4",
               "tempo": "120"
            }
        }
    ];
    return {
        stations: stations,
        moodList: moodList,
        difficultyColors: difficultyColors
    }
})();
