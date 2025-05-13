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
        }
    ];
    return {
        stations: stations,
        moodList: moodList,
        difficultyColors: difficultyColors
    }
})();
