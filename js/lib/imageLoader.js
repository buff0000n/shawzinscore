class ImageLoader {
    constructor(keyToPath) {
        this.keyToPath = keyToPath;

        this.loadedCount = 0;
        this.totalCount = 0;
        this.ready = false;

        this.callback = null;
        this.imgMap = {};

        for (var key in keyToPath) {
            var path = keyToPath[key];
            this.totalCount += 1;
            var img = new Image();
            img.loader = this;
            this.imgMap[key] = img;
            img.onload = () => {
                this.loadedCount += 1;
                this.checkCallback();
            }
            img.src = path;
        }

        this.ready = true;
    }

    checkCallback() {
        if (this.callback && this.ready && this.loadedCount >= this.totalCount) {
            this.callback(this.imgMap);
        }
    }

    waitForImages(callback) {
        this.callback = callback;
        this.checkCallback();
    }

}
