// adapted from here because this crap is a pain in the neck
// https://www.html5rocks.com/en/tutorials/webaudio/intro/js/buffer-loader.js

class BufferLoader {
    // construct an audio buffer loader for the given context with a list or URLs to load a callback to call when it's done
    // callback(<map from URL to audio buffer>)
    constructor(context, urlList, callback) {
        this.context = context;
        this.urlList = urlList;
        this.onload = callback;
        // running map of URL to audio buffer
        this.bufferMap = {};
        // count to know when we're done
        this.loadCount = 0;
    }

    loadBuffer(url) {
        // build an async request to load the buffer
        // It's called XMLHttpRequest but it doesn't have to be XML or a request
        var request = new XMLHttpRequest();
        request.open("GET", url, true);
        request.responseType = "arraybuffer";

        // we won't have access to "this" inside the event handler
        var loader = this;

        // add a callback for when the buffer is loaded
        request.onload = function() {
            // Asynchronously decode the audio file data in request.response
            loader.context.decodeAudioData(
                request.response,
                // callback
                function(buffer) {
                    if (!buffer) {
                        var e = 'error decoding file data: ' + url;
                        PageUtils.showError(e);
                        throw e;
                        //return;
                    }
                    // save audio buffer to the map under the URL
                    loader.bufferMap[url] = buffer;
                    // increment the count and see if that's all of them
                    if (++loader.loadCount == loader.urlList.length) {
                        // call the callback
                        loader.onload(loader.bufferMap);
                    }
                },
                // error callback
                function(error) {
                    // meh
                    var e = error != null ? ("Audio format not supported: " + error) : "Audio format not supported";
                    PageUtils.showError(e);
                    throw e;
                }
            );
        }

        // add a callback for errors
        request.onerror = function() {
            var e = 'Error requesting audio file';
            PageUtils.showError(e);
            throw e;
        }

        // start the request
        request.send();
    }

    // start the loading process for all the sound files
    load() {
        for (var i = 0; i < this.urlList.length; ++i) {
            this.loadBuffer(this.urlList[i]);
        }
    }
}