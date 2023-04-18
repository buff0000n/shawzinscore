// magic singleton pattern
var Events = (function() {
    var keyDownListeners = {};
    var mouseDownListeners = [];

    function registerEventListeners() {
        var body = document.body;
        body.addEventListener("keydown", keyDown);
        body.addEventListener("mousedown", mouseDown);
    }

    function addKeyDownListener(key, listener) {
        if (!keyDownListeners[key]) {
            keyDownListeners[key] = [];
        }
        keyDownListeners[key].push(listener);
    }

    function addMouseDownListener(listener) {
        mouseDownListeners.push(listener);
    }

    function runListeners(e, listeners) {
        if (listeners) {
            for (var i = 0; i < listeners.length; i++) {
                if (listeners[i](e)) {
                    e.preventDefault();
                    break;
                }
            }
        }
    }

    function keyDown(e) {
        e = e || window.event;

        // ignore typing in a text box
        nodeName = e.target.nodeName;
        if (nodeName == "TEXTAREA" || nodeName == "INPUT") {
            return;
        }

        runListeners(e, keyDownListeners[e.code]);
    }

    function mouseDown(e) {
        runListeners(e, mouseDownListeners);
    }

    // public members
    return  {
        registerEventListeners: registerEventListeners,
        addKeyDownListener: addKeyDownListener,
        addMouseDownListener: addMouseDownListener,
    }
})();
