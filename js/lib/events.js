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
    var keyUpListeners = {};
    var mouseDownListeners = [];
    var resizeListeners = [];
    var visualResizeListeners = [];

    function registerEventListeners() {
        var body = document.body;
        // Just have one main listener for document key and mouse events
        body.addEventListener("keydown", keyDown);
        body.addEventListener("keyup", keyUp);
        body.addEventListener("mousedown", mouseDown);

        // one listener for resize events
        window.addEventListener("resize", resize);
        // one listener for mobile visual resize events
        window.visualViewport.addEventListener('resize', visualResize);
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

    // remove a previously added global listener for a specific key
    function removeKeyDownListener(key, listener) {
        // check for the existence of a listener list for that key
        if (keyDownListeners[key]) {
            // remove the listener
            DomUtils.removeFromList(keyDownListeners[key], listener);
        }
    }

    // add a global listener for a specific key
    // The listener returns true if it did something
    function addKeyUpListener(key, listener) {
        // lazily create a listener list for this key
        if (!keyUpListeners[key]) {
            keyUpListeners[key] = [];
        }
        // add the listener
        keyUpListeners[key].push(listener);
    }

    // remove a previously added global listener for a specific key
    function removeKeyUpListener(key, listener) {
        // check for the existence of a listener list for that key
        if (keyUpListeners[key]) {
            // remove the listener
            DomUtils.removeFromList(keyUpListeners[key], listener);
        }
    }

    // add a global listener for mouse events
    // The listener returns true if it did something
    function addMouseDownListener(listener) {
        // add the listener
        mouseDownListeners.push(listener);
    }

    // remove a previously added global listener for mouse events
    function removeMouseDownListener(listener) {
        // remove the listener
        DomUtils.removeFromList(mouseDownListeners, listener);
    }

    // add a global listener for resize events
    // The listener takes (width, height) and returns true if it did something
    function addResizeListener(listener) {
        var wrapper = (e) => {
            var w = Math.max(document.documentElement.clientWidth, window.innerWidth);
            var h = Math.max(document.documentElement.clientHeight, window.innerHeight);
            //PageUtils.showDebug("Layout: " + w + " x " + h);
            return listener(w, h);
        }
        // add the listener
        resizeListeners.push(wrapper);
        // special: initialize the listener with a starting event
        wrapper(null);
    }

    // add a global listener for visual viewport resize events (mobile pinch-zooming)
    // The listener takes (width, height) and returns true if it did something
    function addVisualResizeListener(listener) {
        var wrapper = (e) => {
            var w = window.visualViewport.width;
            var h = window.visualViewport.height;
            //PageUtils.showDebug("Visual: " + w + " x " + h);
            return listener(w, h);
        }
        // add the listener
        visualResizeListeners.push(wrapper);
        // special: initialize the listener with a starting event
        wrapper(null);
    }

    // add a global listener for both viewport and visual viewport size changes
    // the minimum height and width between the view viewports will be send to the listener
    // The listener takes (width, height) and returns true if it did something
    function addCombinedResizeListener(listener) {
        var wrapper = new CombinedResizeListener(listener);
        // do the visual one first, as it's probably smaller
        addVisualResizeListener((w, h) => { return wrapper.onVisualResize(w, h) });
        addResizeListener((w, h) => { return wrapper.onResize(w, h) });
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

        // ignore typing in a text box or any input that's not a slider
        nodeName = e.target.nodeName;
        if (nodeName == "TEXTAREA" || (nodeName == "INPUT" && e.target.type != 'range')) {
            return;
        }

        // run the global key listeners for this specific key
        runListeners(e, keyDownListeners[e.code]);
    }

    // main key event handler
    function keyUp(e) {
        // fallback to get events
        // is this necessary any more?
        e = e || window.event;

        // ignore typing in a text box or any input that's not a slider
        nodeName = e.target.nodeName;
        if (nodeName == "TEXTAREA" || (nodeName == "INPUT" && e.target.type != 'range')) {
            return;
        }

        // run the global key listeners for this specific key
        runListeners(e, keyUpListeners[e.code]);
    }

    function mouseDown(e) {
        // run the global mouse listeners
        runListeners(e, mouseDownListeners);
    }

    function resize(e) {
        // run the global resize listeners
        runListeners(e, resizeListeners);
    }

    function visualResize(e) {
        // run the global visual resize listeners
        runListeners(e, visualResizeListeners);
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

    function preventDefaultIfNotZoom(e) {
        // we gotta allow pinch-zooming, which requires more than 1 touch
        if (e.touches.length <= 1) {
            preventDefault(e);
        }
    }

    function disableScrollEvents(element) {
        // we can't just dsable scrolling, we have to disable the events that trigger scrolling
        // disable various mousewheel events
        element.addEventListener('DOMMouseScroll', preventDefault, { passive: false }); // older FF
        element.addEventListener('wheel', preventDefault, { passive: false }); // modern desktop
        element.addEventListener('mousewheel', preventDefault, { passive: false }); // modern desktop
        // disable various touch scroll events
        element.addEventListener('touchmove', preventDefaultIfNotZoom, { passive: false }); // mobile
    }

    function enableScrollEvents(element) {
        // re-enable scroll events
        element.removeEventListener('DOMMouseScroll', preventDefault, { passive: false }); // older FF
        element.removeEventListener('wheel', preventDefault, { passive: false }); // modern desktop
        element.removeEventListener('mousewheel', preventDefault, { passive: false }); // modern desktop
        element.removeEventListener('touchmove', preventDefaultIfNotZoom, { passive: false }); // mobile
    }

    // combined mouse/touch event handling
    var lastMTEvent = null;
    var lastTouchEvent = null;

    function mouseEventToMTEvent(e, overrideTarget=null) {
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

    function getActualTarget(e) {
        // get the actual target from the event's coordinates
        // todo: save the last result and optimize?
        var target = document.elementFromPoint(e.clientX, e.clientY);
        //PageUtils.showDebug("target at " + e.clientX + "," + e.clientY + ": " + target.className);
        return target;
    }

    function touchEventToMTEvent(e, overrideTarget=false) {
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
                // for touch move events, the target of the event is always the first element touched, not the current
                // element being touched.  To make it work like mouse events, use the coordinates of the event to
                // find the touched element.
                overrideTarget ? getActualTarget(primary) : primary.target,
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

    // helper class to keep track of and reconcile the two different view dimensions, layout and visual
    class CombinedResizeListener {
        constructor(listener) {
            // delegate listener
            this.listener = listener;
            // keep track of layout and visual dimensions
            this.lastWidth = 0;
            this.lastHeight = 0;
            this.lastVisualWidth = 0;
            this.lastVisualHeight = 0;
        }

        callListener() {
            // todo: prevent double-calling when the resulting dimensons don't change
            // if we have both layout and visual dimensions then use the smallest of each
            if (this.lastWidth > 0 && this.lastVisualWidth > 0) {
                var w = Math.min(this.lastWidth, this.lastVisualWidth);
                var h = Math.min(this.lastHeight, this.lastVisualHeight);
            // just layout dimensions
            } else if (this.lastWidth > 0) {
                var w = this.lastWidth;
                var h = this.lastHeight;
            // just visual dimensions
            } else if (this.lastVisualWidth > 0) {
                var w = this.lastVisualWidth;
                var h = this.lastVisualHeight;
            // no dimensions. how are we here?
            } else {
                return;
            }
            //PageUtils.showDebug("Resize: " + w + " x " + h);
            // notify the delegate listener
            this.listener(w, h);
        }

        // handle a layout resize event
        onResize(w, h) {
            // save the dimensions
            this.lastWidth = w;
            this.lastHeight = h;
            // call the listener
            this.callListener();
            // allow other listeners to run
            return false;
        }

        // handle a layout resize event
        onVisualResize(w, h) {
            // save the dimensions
            this.lastVisualWidth = w;
            this.lastVisualHeight = h;
            // call the listener
            this.callListener();
            // allow other listeners to run
            return false;
        }
    }

    // public members
    return  {
        // initialization
        registerEventListeners: registerEventListeners, // ()
        // add a global listener for a particular key
        addKeyDownListener: addKeyDownListener, // (key, listener)
        // remove a previously added listener
        removeKeyDownListener: removeKeyDownListener, // (key, listener)
        // add a global listener for a particular key
        addKeyUpListener: addKeyUpListener, // (key, listener)
        // remove a previously added listener
        removeKeyUpListener: removeKeyUpListener, // (key, listener)
        // add a global listener for mouse events
        addMouseDownListener: addMouseDownListener, // (listener)
        // remove a previously added listener
        removeMouseDownListener: removeMouseDownListener, // (listener)
        // add a global listener for resize events
        // The listener takes (width, height) and returns true if it did something
        addResizeListener: addResizeListener, // (function(width, height): Boolean)
        // add a global listener for visual viewport resize events (mobile pinch-zooming)
        // The listener takes (width, height) and returns true if it did something
        addVisualResizeListener: addVisualResizeListener, // (function(width, height): Boolean)
        // add a global listener for both viewport and visual viewport size changes
        // the minimum height and width between the view viewports will be send to the listener
        // The listener takes (width, height) and returns true if it did something
        addCombinedResizeListener: addCombinedResizeListener, // (function(width, height): Boolean)
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
        touchEventToMTEvent: touchEventToMTEvent, // (e, overrideTarget=false)
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
        runDrag(Events.touchEventToMTEvent(e, true), null, currentDragDropListener);
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
        runDrop(Events.touchEventToMTEvent(e, true), null, currentDragDropListener);
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
        // ugh we have to save a reference to each one of these so we can make removeDragDropListener work.

        // add the start dragging event handlers
        element.listener_mousedown = (e) => { startDrag(Events.mouseEventToMTEvent(e), element, dragDropListener); };
        element.addEventListener("mousedown", element.listener_mousedown, { "passive": false} );

        element.listener_touchstart = (e) => { startDrag(Events.touchEventToMTEvent(e), element, dragDropListener); };
        element.addEventListener("touchstart", element.listener_touchstart, { "passive": false} );

        // add drag handlers for this specific element
        element.listener_mousemove = (e) => { runDrag(Events.mouseEventToMTEvent(e), element, dragDropListener); };
        element.addEventListener("mousemove", element.listener_mousemove, { "passive": false} );

        element.listener_mouseup = (e) => { runDrop(Events.mouseEventToMTEvent(e), element, dragDropListener); };
        element.addEventListener("mouseup", element.listener_mouseup, { "passive": false} );

        element.listener_touchmove = (e) => {
            var mte = Events.touchEventToMTEvent(e, true);
            runDrag(mte, mte.target, dragDropListener);
        };
        element.addEventListener("touchmove", element.listener_touchmove, { "passive": false} );

        element.listener_touchend = (e) => {
            var mte = Events.touchEventToMTEvent(e, true);
            runDrop(mte, mte.target, dragDropListener);
        };
        element.addEventListener("touchend", element.listener_touchend, { "passive": false} );
    }

    function removeDragDropListener(element, dragDropListener) {
        element.removeEventListener("mousedown", element.listener_mousedown);
        element.listener_mousedown = null;

        element.removeEventListener("touchstart", element.listener_touchstart);
        element.listener_touchstart = null;

        element.removeEventListener("mousemove", element.listener_mousemove);
        element.listener_mousemove = null;

        element.removeEventListener("mouseup", element.listener_mouseup);
        element.listener_mouseup = null;

        element.removeEventListener("touchmove", element.listener_touchmove);
        element.listener_touchmove = null;

        element.removeEventListener("touchend", element.listener_touchend);
        element.listener_touchend = null;
    }


    return {
        // set up an element for initiating a drag/drop session with the given DragDropListener
        addDragDropListener: addDragDropListener, // (element, dragDropListener)
    };
})()