// convenience class to load a bunch of images because this is hard apparently
class ImageLoader {
    // initialize with a map of URLs
    constructor(keyToPath) {
        this.keyToPath = keyToPath;

        // state
        this.loadedCount = 0;
        this.totalCount = 0;
        this.ready = false;

        // to be set later
        this.callback = null;
        // loaded image map
        this.imgMap = {};

        for (var key in keyToPath) {
            // get the image path
            var path = keyToPath[key];
            // increment the total count, I guess it's hard to get the size of a map
            this.totalCount += 1;
            // build a new image object
            var img = new Image();
            // save to the map
            this.imgMap[key] = img;
            // set an onload listener
            img.onload = () => {
                // increment the count
                this.loadedCount += 1;
                // check if we're done and have a callback
                this.checkCallback();
            }
            // setting src starts the load process
            img.src = path;
        }

        // done initializing
        this.ready = true;
    }

    checkCallback() {
        // check if we have a callback, initializatin is done, and all the images are loaded
        if (this.callback && this.ready && this.loadedCount >= this.totalCount) {
            // call the callback
            this.callback(this.imgMap);
        }
    }

    waitForImages(callback) {
        // set the callback
        this.callback = callback;
        // check if we've already loaded all the images
        this.checkCallback();
    }

}
