// magic singleton pattern
var Events = (function() {
    var keyDownHandlers = {};
    var mouseDownHandlers = [];

    function registerEventListeners() {
        var body = document.body;
        body.addEventListener("keydown", keyDown);
        body.addEventListener("mousedown", mouseDown);
    }

    function addKeyDownHandler(key, handler) {
        if (!keyDownHandlers[key]) {
            keyDownHandlers[key] = [];
        }
        keyDownHandlers[key].push(handler);
    }

    function addMouseDownHandler(handler) {
        mouseDownHandlers.push(handler);
    }

    function runHandlers(e, handlers) {
        if (handlers) {
            for (var i = 0; i < handlers.length; i++) {
                if (handlers[i](e)) {
                    break;
                }
            }
        }
    }

    function keyDown(e) {
        e = e || window.event;

        // ignore typing in a text box
        nodeName = e.target.nodeName;
        if (nodeName == "TEXTAREA") {
            return;
        }

        runHandlers(e, keyDownHandlers[e.code]);
    }

    function mouseDown(e) {
        runHandlers(e, mouseDownHandlers);
    }

    // public members
    return  {
        registerEventListeners: registerEventListeners,
        addKeyDownHandler: addKeyDownHandler,
        addMouseDownHandler: addMouseDownHandler,
    }
})();
