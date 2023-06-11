// unified event object for mouse and touch events
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
    // global key and mouse listeners
    var keyDownListeners = {};
    var mouseDownListeners = [];

    function registerEventListeners() {
        var body = document.body;
        // Just have one main listener for document key and mouse events
        body.addEventListener("keydown", keyDown);
        body.addEventListener("mousedown", mouseDown);
    }

    // add a global listener for a specific key
    // The listener returns true if it did something
    function addKeyDownListener(key, listener) {
        // lazily create a listener list for this key
        if (!keyDownListeners[key]) {
            keyDownListeners[key] = [];
        }
        // add the listener
        keyDownListeners[key].push(listener);
    }

    // add a global listener for mouse events
    // The listener returns true if it did something
    function addMouseDownListener(listener) {
        // add the listener
        mouseDownListeners.push(listener);
    }

    // convenient handler function to call preventDefault
    function preventDefault(e) {
        e.preventDefault();
    }

    // run a list of listeners, stopping at the first one that does something
    function runListeners(e, listeners) {
        // sanity check
        if (listeners) {
            // run the listeners in order
            for (var i = 0; i < listeners.length; i++) {
                // run the listener and check if it did something
                if (listeners[i](e)) {
                    // prevent anything else from handling the event
                    e.preventDefault();
                    break;
                }
            }
        }
    }

    // main key event handler
    function keyDown(e) {
        // fallback to get events
        // is this necessary any more?
        e = e || window.event;

        // ignore typing in a text box
        nodeName = e.target.nodeName;
        if (nodeName == "TEXTAREA" || nodeName == "INPUT") {
            return;
        }

        // run the global key listeners for this specific key
        runListeners(e, keyDownListeners[e.code]);
    }

    function mouseDown(e) {
        // run the global mouse listeners
        runListeners(e, mouseDownListeners);
    }

    function setupTextInput(textInput, autoSelect=false) {
        // set up a listener for when the text box gets focus
        textInput.addEventListener("focus", autoSelect ? textInputFocusSelect : textInputFocus);
        // set up a key listener on the textbox for enter and escape
        textInput.addEventListener("keydown", textInputKeyDown);
    }

    function textInputFocus(e) {
        // save the starting value in case we need to revert it
        e.target.lastValue = e.target.value;
    }

    function textInputFocusSelect(e) {
        // normal action
        textInputFocus(e);
        // also select the contents
        e.target.select();
    }

    function textInputKeyDown(e) {
        if ("Enter" == e.code) {
            // if enter is pressed, blur the text box, which also commits any changes
            e.target.blur();
        } else if ("Escape" == e.code) {
            // if escape is pressed, revert the value and then blur the text box
            e.target.value = e.target.lastValue;
            e.target.blur();
        }
    };

    function setupCheckbox(checkbox) {
        checkbox.addEventListener("change", checkboxBlur, { passive: false });
    }

    function checkboxBlur(e) {
        e.target.blur();
    }

    function disableScrollEvents(element) {
        // we can't just dsable scrolling, we have to disable the events that trigger scrolling
        // disable various mousewheel events
        element.addEventListener('DOMMouseScroll', preventDefault, { passive: false }); // older FF
        element.addEventListener('wheel', preventDefault, { passive: false }); // modern desktop
        element.addEventListener('mousewheel', preventDefault, { passive: false }); // modern desktop
        // disable various touch scroll events
        element.addEventListener('touchmove', preventDefault, { passive: false }); // mobile
    }

    function enableScrollEvents(element) {
        // re-enable scroll events
        element.removeEventListener('DOMMouseScroll', preventDefault, { passive: false }); // older FF
        element.removeEventListener('wheel', preventDefault, { passive: false }); // modern desktop
        element.removeEventListener('mousewheel', preventDefault, { passive: false }); // modern desktop
        element.removeEventListener('touchmove', preventDefault, { passive: false }); // mobile
    }

    // combined mouse/touch event handling
    var lastMTEvent = null;
    var lastTouchEvent = null;

    function mouseEventToMTEvent(e, overrideTarget=null) {
        // todo: what was override taget for?
        var event = new MTEvent(e, false,
            overrideTarget ? overrideTarget : e.currentTarget,
            e.clientX, e.clientY,
            e.altKey, e.shiftKey,
            // combine windows control key with mac command key
            e.ctrlKey || e.metaKey,
            e.buttons);
        lastMTEvent = event;
        return event;
    }

    function touchEventToMTEvent(e, overrideTarget=null) {
        // todo: what was override taget for?
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
                // can altKey and shiftKey happen on mobile?
                e.altKey, e.shiftKey,
                e.touches.length);
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
        // initialization
        registerEventListeners: registerEventListeners, // ()
        // add a global listener for a particular key
        addKeyDownListener: addKeyDownListener, // (key, listener)
        // add a global listener for mosue events
        addMouseDownListener: addMouseDownListener, // (listener)
        // setup a text box so that:
        //  * focusing on the text box optionally selects its contents
        //  * pressing enter blurs the text box and commits any changes
        //  * pressing escape blurs the text box and reverts any changes
        setupTextInput: setupTextInput, // (textInput, autoSelect=false)
        // setup a checkbox because apparently it gets keyboard focus when you click on it
        setupCheckbox: setupCheckbox, // (checkbox)
        // disable scroll events for an element
        disableScrollEvents: disableScrollEvents, // (element)
        // re-enable scroll events for an element
        enableScrollEvents: enableScrollEvents, // (element)
        // convert a mouse event to a unified event object
        mouseEventToMTEvent: mouseEventToMTEvent, // (e, overrideTarget=null)
        // convert a touch event to a unified event object
        touchEventToMTEvent: touchEventToMTEvent, // (e, overrideTarget=null)
    }
})();

// base class for a listener object for drag/drop events
class DragDropListener {
    onStart(e, element) { }
    onDrag(e, element) { }
    onDrop(e, element) { }
}

var DragEvents = (function() {
    // we can only have one listener at a time
    currentDragDropListener = null;
    // we need to track the last event to avoid double-processing it
    lastEvent = null;

    function runDrag(e, target, dragDropListener) {
        // check that the given listener is our current one and that we haven't already handled this event
        if (!currentDragDropListener || currentDragDropListener != dragDropListener || e.original == lastEvent) return;
        //console.log("rundrag: " + e);
        // run the listener
        currentDragDropListener.onDrag(e, target);
        // prevent normal handling
        e.preventDefault();
        // save for later
        lastEvent = e.original;
    }

    function runDrop(e, target, dragDropListener) {
        // check that the given listener is our current one and that we haven't already handled this event
        if (!currentDragDropListener || currentDragDropListener != dragDropListener || e.original == lastEvent) return;
        //console.log("rundrop: " + e);
        // run the listener
        currentDragDropListener.onDrop(e, target);
        // prevent normal handling
        e.preventDefault();
        // save for later
        lastEvent = e.original;
        // clean up global listeners
        stopDrag();
    }

    // convenience function for handling a mouse drag event on an element that doesn't have its own handler
    function onMouseDragExternal(e) {
        //console.log("ondragExternal: " + e);
        // target is null
        runDrag(Events.mouseEventToMTEvent(e), null, currentDragDropListener);
    }

    // convenience function for handling a touch drag event on an element that doesn't have its own handler
    function onTouchDragExternal(e) {
        //console.log("ondragExternal: " + e);
        // target is null
        runDrag(Events.touchEventToMTEvent(e), null, currentDragDropListener);
    }

    // convenience function for handling a mouse drop event on an element that doesn't have its own handler
    function onMouseDropExternal(e) {
        //console.log("ondropExternal: " + e);
        // target is null
        runDrop(Events.mouseEventToMTEvent(e), null, currentDragDropListener);
    }

    // convenience function for handling a touch end event on an element that doesn't have its own handler
    function onTouchDropExternal(e) {
        //console.log("ondropExternal: " + e);
        // target is null
        runDrop(Events.touchEventToMTEvent(e), null, currentDragDropListener);
    }

    function startDrag(e, element, dragDropListener) {
        //console.log("startdrag: " + e);
        // check if we already have a different listener
        // todo: should this be an error or warning?
        if (currentDragDropListener && dragDropListener != dragDropListener) {
            // gracefully end the previous drag/drop session
            // simulate drop event
            currentDragDropListener.onDrop(e, null);
            // clean up global listeners
            stopDrag();

        // check if we're somehow starting a new drag session with the same listener
        // todo: should this be an error or warning?
        } else if (currentDragDropListener) {
            currentDragDropListener.onDrag(e, element);

        } else {
            // okay, normal operations.  Set our listener and run the start event.
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

        // prevent normal handling
        e.preventDefault();
    }

    function stopDrag() {
        //console.log("stopdrag");
        // remove global drag/drop listeners
        document.removeEventListener("mousemove", onMouseDragExternal, { "passive": false} );
        document.removeEventListener("mouseup", onMouseDropExternal, { "passive": false} );
        document.removeEventListener("touchmove", onTouchDragExternal, { "passive": false} );
        document.removeEventListener("touchend", onTouchDropExternal, { "passive": false} );
        // clear state
        currentDragDropListener = null;
        lastEvent = null;
    }

    function addDragDropListener(element, dragDropListener) {
        // add the start dragging event handlers
        element.addEventListener("mousedown", (e) => { startDrag(Events.mouseEventToMTEvent(e), element, dragDropListener); }, { "passive": false} );
        element.addEventListener("touchstart", (e) => { startDrag(Events.touchEventToMTEvent(e), element, dragDropListener); }, { "passive": false} );

        // add drag handlers for this specific element
        element.addEventListener("mousemove", (e) => { runDrag(Events.mouseEventToMTEvent(e), element, dragDropListener); }, { "passive": false} );
        element.addEventListener("mouseup", (e) => { runDrop(Events.mouseEventToMTEvent(e), element, dragDropListener); }, { "passive": false} );
        element.addEventListener("touchmove", (e) => { runDrag(Events.touchEventToMTEvent(e), element, dragDropListener); }, { "passive": false} );
        element.addEventListener("touchend", (e) => { runDrop(Events.touchEventToMTEvent(e), element, dragDropListener); }, { "passive": false} );
    }

    return {
        // set up an element for initiating a drag/drop session with the given DragDropListener
        addDragDropListener: addDragDropListener, // (element, dragDropListener)
    };
})()