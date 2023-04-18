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

var Undo = (function() {
    var undoStack = Array();
    var redoStack = Array();
    var maxUndoStackSize = 250;
    var undoCombos = [];
    
    function registerEventListeners() {
        document.getElementById("button-undo").addEventListener("click", doUndo, { passive: false });
        document.getElementById("button-redo").addEventListener("click", doRedo, { passive: false });

        Events.addKeyDownListener("KeyZ", (e) => {
			// only enable undo/redo key shortcut if there is no menu visible and no dragging operation
//			if (nothingElseGoingOn()) {
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
//			}
			return false;
        });
        Events.addKeyDownListener("KeyY", (e) => {
			// only enable undo/redo key shortcut if there is no menu visible and no dragging operation
//			if (nothingElseGoingOn()) {
				// ctrlKey on Windows, metaKey on Mac
				if (e.ctrlKey || e.metaKey) {
					// ctrl/meta + Y: redo
					doRedo();
					return true;
				}
//			}
			return false;
        });
    }

    function updateUndoRedoButton(button, stack, prefix) {
        if (stack.length > 0) {
            button.className = "smallButton";
            button.children[0].className = "icon";
            button.children[0].title = prefix + " " + stack[stack.length - 1].toString();

        } else {
            button.className = "smallButton-disabled";
            button.children[0].className = "icon-disabled";
            button.alt = prefix;
        }
    }
    
    function updateButtons() {
        updateUndoRedoButton(document.getElementById("button-undo"), undoStack, "Undo");
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
        undoCombos.push([]);
    }
    
    function endUndoCombo(description=null) {
        var undoList = undoCombos.pop()
        var action = null;
        if (undoList.length >1) {
            action = new CompositeAction(undoList, description);
    
        } else if (undoList.length == 1) {
            action = undoList[0];
        }
    
        if (action) {
            if (undoCombos.length > 0) {
                undoCombos.push(action);
            } else {
                addUndoAction(action)
            }
        }
    }
    
    function endAllUndoCombos() {
        while (undoCombos.length > 0) {
            endUndoCombo();
        }
    }
    
    function cancelUndoCombo() {
        var undoList = undoCombos.pop()
        for (var i = undoList.length - 1; i >= 0; i--) {
            undoList[i].undoAction();
        }
    }
    
    function cancelAllUndoCombos() {
        while (undoCombos.length > 0) {
            cancelUndoCombo();
        }
    }
    
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
    }
    
    class CompositeAction extends Action {
        constructor(actions, description=null) {
            super();
            this.actions = actions;
        }
    
        undoAction() {
            for (var a = this.actions.length - 1; a >= 0; a--) {
                this.actions[a].undoAction();
            }
        }
    
        redoAction() {
            for (var a = 0; a < this.actions.length; a++) {
                this.actions[a].redoAction();
            }
        }
    
        toString() {
            return this.description ? this.description : this.actions.length + " action(s)";
        }
    }

    class AdhocUndoAction extends Action {
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
        var action = new AdhocUndoAction(doFunc, undoFunc, description);
        startUndoCombo();
        addUndoAction(action);
        action.redoAction();
        endUndoCombo();
    }

    // public members
    return  {
        registerEventListeners: registerEventListeners,
        addUndoAction: addUndoAction,
        startUndoCombo: startUndoCombo,
        endUndoCombo: endUndoCombo,
        endAllUndoCombos: endAllUndoCombos,
        cancelUndoCombo: cancelUndoCombo,
        cancelAllUndoCombos: cancelAllUndoCombos,
        doUndo: doUndo,
        doRedo: doRedo,

        doAction: doAction,
    };
})();




