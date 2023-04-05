// adapted from here because this crap is a pain in the neck
// https://www.html5rocks.com/en/tutorials/webaudio/intro/js/buffer-loader.js

function BufferLoader(context, urlList, callback) {
  this.context = context;
  this.urlList = urlList;
  this.onload = callback;
  this.bufferMap = {};
  this.loadCount = 0;
}

BufferLoader.prototype.loadBuffer = function(url) {
  // Load buffer asynchronously
  var request = new XMLHttpRequest();
  request.open("GET", url, true);
  request.responseType = "arraybuffer";

  var loader = this;

  request.onload = function() {
    // Asynchronously decode the audio file data in request.response
    loader.context.decodeAudioData(
      request.response,
      function(buffer) {
        if (!buffer) {
          var e = 'error decoding file data: ' + url;
          showError(e);
          throw e;
          //return;
        }
        loader.bufferMap[url] = buffer;
        if (++loader.loadCount == loader.urlList.length)
          loader.onload(loader.bufferMap);
      },
      function(error) {
        var e = error != null ? ("Audio format not supported: " + error) : "Audio format not supported";
        showError(e);
        throw e;
      }
    );
  }

  request.onerror = function() {
    var e = 'Error requesting audio file';
    showError(e);
    throw e;
  }

  request.send();
}

BufferLoader.prototype.load = function() {
  for (var i = 0; i < this.urlList.length; ++i)
  this.loadBuffer(this.urlList[i]);
}
