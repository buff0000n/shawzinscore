class MTEvent {
    constructor(original, isTouch, currentTarget, clientX, clientY, altKey, shiftKey, ctrlKey, buttons) {
        this.original = original;
        this.isTouch = isTouch;
        this.currentTarget = currentTarget;
        this.target = currentTarget;
        this.clientX = clientX;
        this.clientY = clientY;
        this.altKey = altKey;
        this.shiftKey = shiftKey;
        this.ctrlKey = ctrlKey;
        this.buttons = buttons;
    }

    preventDefault() {
        this.original.preventDefault();
    }
}

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

    function preventDefault(e) {
        e.preventDefault();
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

    function setupTextInput(textInput, autoSelect=false) {
        textInput.addEventListener("focus", autoSelect ? textInputFocusSelect : textInputFocus);
        textInput.addEventListener("keydown", textInputKeyDown);
    }

    function textInputFocus(e) {
        e.target.lastValue = e.target.value;
    }

    function textInputFocusSelect(e) {
        textInputFocus(e);
        e.target.select();
    }

    function textInputKeyDown(e) {
        if ("Enter" == e.code) {
            e.target.blur();
        } else if ("Escape" == e.code) {
            e.target.value = e.target.lastValue;
            e.target.blur();
        }
    };

    function disableScrollEvents(element) {
        element.addEventListener('DOMMouseScroll', preventDefault, { passive: false }); // older FF
        element.addEventListener('wheel', preventDefault, { passive: false }); // modern desktop
        element.addEventListener('mousewheel', preventDefault, { passive: false }); // modern desktop
        element.addEventListener('touchmove', preventDefault, { passive: false }); // mobile
    }

    function enableScrollEvents(element) {
        element.removeEventListener('DOMMouseScroll', preventDefault, { passive: false }); // older FF
        element.removeEventListener('wheel', preventDefault, { passive: false }); // modern desktop
        element.removeEventListener('mousewheel', preventDefault, { passive: false }); // modern desktop
        element.removeEventListener('touchmove', preventDefault, { passive: false }); // mobile
    }

    // combined mouse/touch event handling
    var lastMTEvent = null;
    var lastTouchEvent = null;

    function mouseEventToMTEvent(e, overrideTarget=null) {
        var event = new MTEvent(e, false,
            overrideTarget ? overrideTarget : e.currentTarget,
            e.clientX, e.clientY,
            e.altKey, e.shiftKey, e.ctrlKey || e.metaKey,
            e.buttons);
        lastMTEvent = event;
        return event;
    }

    function touchEventToMTEvent(e, overrideTarget=null) {
        // this gets tricky because the first touch in the list may not necessarily be the first touch, and
        // you can end multi-touch with a different touch than the one you started with
        var primary = null;

        if (e.touches.length > 0) {
            // meh, just make the first one in the list the primary, no need to get fancy with multi-touch
            primary = e.touches[0];
        }

        if (primary) {
            // we can generate an event, yay our team
            lastTouchEvent = new MTEvent(e, true,
                overrideTarget ? overrideTarget : primary.target,
                primary.clientX, primary.clientY,
                e.altKey, e.shiftKey, e.touches.length);
            lastMTEvent = lastTouchEvent;
            return lastTouchEvent;

        } else if (lastTouchEvent != null) {
            // If a touch ends then we need to look at last event to know where the touch was when it ended
            return lastTouchEvent;

        } else {
            console.log("bogus touch event");
        }
    }

    // public members
    return  {
        registerEventListeners: registerEventListeners,
        addKeyDownListener: addKeyDownListener,
        addMouseDownListener: addMouseDownListener,
        setupTextInput: setupTextInput,
        disableScrollEvents: disableScrollEvents,
        enableScrollEvents: enableScrollEvents,
        mouseEventToMTEvent: mouseEventToMTEvent,
        touchEventToMTEvent: touchEventToMTEvent,
    }
})();

class DragDropListener {
    onStart(e, element) { }
    onDrag(e, element) { }
    onDrop(e, element) { }
}

var DragEvents = (function() {
    currentDragDropListener = null;
    lastEvent = null;

    function runDrag(e, target, dragDropListener) {
        if (!currentDragDropListener || currentDragDropListener != dragDropListener || e.original == lastEvent) return;
        //console.log("rundrag: " + e);
        currentDragDropListener.onDrag(e, target);
        e.preventDefault();
        lastEvent = e.original;
    }

    function runDrop(e, target, dragDropListener) {
        if (!currentDragDropListener || currentDragDropListener != dragDropListener || e.original == lastEvent) return;
        //console.log("rundrop: " + e);
        currentDragDropListener.onDrop(e, target);
        e.preventDefault();
        lastEvent = e.original;
        stopDrag();
    }

    function onDrag(e, element, dragDropListener) {
        runDrag(e, e.target);
    }

    function onDrop(e, element, dragDropListener) {
        runDrop(e, e.target);
    }

    function onMouseDragExternal(e) {
        //console.log("ondragExternal: " + e);
        runDrag(Events.mouseEventToMTEvent(e), null, currentDragDropListener);
    }

    function onTouchDragExternal(e) {
        //console.log("ondragExternal: " + e);
        runDrag(Events.touchEventToMTEvent(e), null, currentDragDropListener);
    }

    function onMouseDropExternal(e) {
        //console.log("ondropExternal: " + e);
        runDrop(Events.mouseEventToMTEvent(e), null, currentDragDropListener);
    }

    function onTouchDropExternal(e) {
        //console.log("ondropExternal: " + e);
        runDrop(Events.touchEventToMTEvent(e), null, currentDragDropListener);
    }

    function startDrag(e, element, dragDropListener) {
        //console.log("startdrag: " + e);
        if (currentDragDropListener && dragDropListener != dragDropListener) {
            currentDragDropListener.onDrop(e, null);
            stopDrag();

        } else if (currentDragDropListener) {
            currentDragDropListener.onDrag(e, element);

        } else {
            currentDragDropListener = dragDropListener;
            currentDragDropListener.onStart(e, element);
        }

        // set up drag listeners on the document itself
        // touch events don't work across DOM elements unless you go all the way
        // to the document level
        document.addEventListener("mousemove", onMouseDragExternal, { "passive": false} );
        document.addEventListener("mouseup", onMouseDropExternal, { "passive": false} );
        document.addEventListener("touchmove", onTouchDragExternal, { "passive": false} );
        document.addEventListener("touchend", onTouchDropExternal, { "passive": false} );

        e.preventDefault();
    }

    function stopDrag() {
        //console.log("stopdrag");
        // remove drag/drop listeners from the document
        document.removeEventListener("mousemove", onMouseDragExternal, { "passive": false} );
        document.removeEventListener("mouseup", onMouseDropExternal, { "passive": false} );
        document.removeEventListener("touchmove", onTouchDragExternal, { "passive": false} );
        document.removeEventListener("touchend", onTouchDropExternal, { "passive": false} );
        currentDragDropListener = null;
        lastEvent = null;
    }

    function addDragDropListener(element, dragDropListener) {
        element.addEventListener("mousedown", (e) => { startDrag(Events.mouseEventToMTEvent(e), element, dragDropListener); }, { "passive": false} );
        element.addEventListener("touchstart", (e) => { startDrag(Events.touchEventToMTEvent(e), element, dragDropListener); }, { "passive": false} );

        element.addEventListener("mousemove", (e) => { runDrag(Events.mouseEventToMTEvent(e), element, dragDropListener); }, { "passive": false} );
        element.addEventListener("mouseup", (e) => { runDrop(Events.mouseEventToMTEvent(e), element, dragDropListener); }, { "passive": false} );
        element.addEventListener("touchmove", (e) => { runDrag(Events.touchEventToMTEvent(e), element, dragDropListener); }, { "passive": false} );
        element.addEventListener("touchend", (e) => { runDrop(Events.touchEventToMTEvent(e), element, dragDropListener); }, { "passive": false} );
    }

    return {
        addDragDropListener: addDragDropListener,
    };
})()