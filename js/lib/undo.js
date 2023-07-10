var Undo = (function() {
    // stack of undo actions
    var undoStack = Array();
    // corresponding stack of redo actions
    var redoStack = Array();
    // max undo actions to store before dropping them
    var maxUndoStackSize = 250;
    // stack for nested actions while building an undo action
    var undoCombos = [];
    
    function registerEventListeners() {
        // set up the undo and redo buttons
        document.getElementById("button-undo").addEventListener("click", doUndo, { passive: false });
        document.getElementById("button-redo").addEventListener("click", doRedo, { passive: false });

        // add a global key listener for Z
        Events.addKeyDownListener("KeyZ", (e) => {
            // ctrlKey on Windows, metaKey on Mac
            if (e.ctrlKey || e.metaKey) {
                if (e.shiftKey) {
                    // ctrl/meta + shift + Z: redo
                    doRedo();
                    return true;
                } else {
                    // ctrl/meta + Z: undo
                    doUndo();
                    return true;
                }
            }
			return false;
        }, { passive: false });
        // add a global key listener for Y
        Events.addKeyDownListener("KeyY", (e) => {
            // ctrlKey on Windows, metaKey on Mac
            if (e.ctrlKey || e.metaKey) {
                // ctrl/meta + Y: redo
                doRedo();
                return true;
            }
			return false;
        }, { passive: false });
    }

    function updateUndoRedoButton(button, stack, prefix) {
        // If there's actions in the stack
        if (stack.length > 0) {
            // enable the button
            button.className = "smallButton";
            button.children[0].className = "icon";
            // set the alt-text to the description of the first action on the stack
            button.children[0].title = prefix + " " + stack[stack.length - 1].toString();

        // if there action stack is empty
        } else {
            // disable the button
            button.className = "smallButton-disabled";
            button.children[0].className = "icon-disabled";
            // reset the alt text
            button.alt = prefix;
        }
    }
    
    function updateButtons() {
        // update the undo button with the undo action stack
        updateUndoRedoButton(document.getElementById("button-undo"), undoStack, "Undo");
        // update the redo button with the redo action stack
        updateUndoRedoButton(document.getElementById("button-redo"), redoStack, "Redo");
    }
    
    function addUndoAction(action) {
        // check if there's a combo in progress
        if (undoCombos.length > 0) {
            // put in the combo
            undoCombos[undoCombos.length - 1].push(action);
            return;
        }
    
        // add to the stack
        undoStack.push(action);
        // trim the back of the stack if it's exceeded the max size
        while (undoStack.length > maxUndoStackSize) {
            undoStack.shift();
        }
        // clear the redo stack
        redoStack = Array();
        // update UI
        updateButtons();
    }
    
    function startUndoCombo() {
        // push a new list on the top of the nested action stack
        undoCombos.push([]);
    }
    
    function endUndoCombo(description=null) {
        // pop the last combo list off the stack
        var undoList = undoCombos.pop()
        var action = null;
        // if there's more than one action, build a composite action
        if (undoList.length >1) {
            action = new CompositeAction(undoList, description);

        // if there's exactly one action then just use that one
        } else if (undoList.length == 1) {
            action = undoList[0];
        }

        // check if there actually was an action
        if (action) {
            // if there are still open nested actions then add this action to the next level down.
            if (undoCombos.length > 0) {
                undoCombos.push(action);
            // otherwise, there are no more nested actions and we can add this to our undo stack
            } else {
                addUndoAction(action)
            }
        }
    }

    // not sure if I'm going to need these
//    function endAllUndoCombos() {
//        while (undoCombos.length > 0) {
//            endUndoCombo();
//        }
//    }
//
    function cancelUndoCombo() {
        var undoList = undoCombos.pop()
        for (var i = undoList.length - 1; i >= 0; i--) {
            undoList[i].undoAction();
        }
    }

//    function cancelAllUndoCombos() {
//        while (undoCombos.length > 0) {
//            cancelUndoCombo();
//        }
//    }
    
    function doUndo() {
        // pop the last action
        var action = undoStack.pop();
        // make sure there was a last action
        if (action) {
            // undo the action
            action.undoAction();
            // put it on the redo stack
            redoStack.push(action);
    
            // update UI
            updateButtons();
        }
        // seems like a good time to clear any errors
        PageUtils.clearErrors();
    }
    
    function doRedo() {
        // pop the next action
        var action = redoStack.pop();
        // make sure is a next action
        if (action) {
            // redo the action
            action.redoAction();
            // put it back on the undo stack
            undoStack.push(action);
            // update UI
            updateButtons();
        }
        // seems like a good time to clear any errors
        PageUtils.clearErrors();
    }
    
    // base class for an action
    class Action {
        constructor() {
        }
    
        redoAction() {
            throw "not implemented";
        }
    
        undoAction() {
            throw "not implemented";
        }
    
        toString() {
            throw "not implemented";
        }
    }

    // for combining multiple actions into one
    class CompositeAction extends Action {
        constructor(actions, description=null) {
            super();
            this.actions = actions;
        }
    
        undoAction() {
            // iterate over the action list in reverse order to undo
            for (var a = this.actions.length - 1; a >= 0; a--) {
                this.actions[a].undoAction();
            }
        }
    
        redoAction() {
            // iterate over the action list in original order to redo
            for (var a = 0; a < this.actions.length; a++) {
                this.actions[a].redoAction();
            }
        }
    
        toString() {
            // stock description
            return this.description ? this.description : this.actions.length + " action(s)";
        }
    }

    // wrapper for a pair of anonymous do and undo functions
    class SimpleAction extends Action {
        constructor(doFunc, undoFunc, description) {
            super();
            this.doFunc = doFunc;
            this.undoFunc = undoFunc;
            this.description = description;
        }

        undoAction() {
            this.undoFunc();
        }

        redoAction() {
            this.doFunc();
        }

        toString() {
            return this.description;
        }

    }

    function doAction(doFunc, undoFunc, description) {
        // wrap the functions in an action
        var action = new SimpleAction(doFunc, undoFunc, description);
        // just in case the action recursively calls doAction(), start a combo stack
        startUndoCombo();
        // add the action
        addUndoAction(action);
        try {
            // perform the action
            action.redoAction();

        } catch (error) {
            // cancel the undo combo and undo any actions that might already be in it
            cancelUndoCombo();
            // propagate the error
            throw error;
        }
        // end the nested combo
        endUndoCombo(description);
        // seems like a good time to clear any errors
        PageUtils.clearErrors();
    }

    // public members
    return  {
        // initialization
        registerEventListeners: registerEventListeners, // ()
        // I guess we don't need these?
//        endAllUndoCombos: endAllUndoCombos,
//        cancelUndoCombo: cancelUndoCombo,
//        cancelAllUndoCombos: cancelAllUndoCombos,
//        doUndo: doUndo,
//        doRedo: doRedo,
//        addUndoAction: addUndoAction,

        startUndoCombo: startUndoCombo, // ()
        endUndoCombo: endUndoCombo, // (description)
        // perform an action and store it, along with an undo action and a description, in the undo stack
        // If this action recursively calls doAction() with another action then it will all be combined
        // into a single undo action when the top-level undo action exits
        doAction: doAction, // (doFunc, undoFunc, description)
    };
})();




