// magic singleton pattern
var Menus = (function() {
    
    var menus = Array();
    var lastMenuEvent = null;

    function getCurrentMenuLevel() {
        return menus.length;
    }
    
    function clearMenus(leave = 0) {
        while (getCurrentMenuLevel() > leave) {
            var menu = menus.pop();
            if (menu.closeCallback) {
                menu.closeCallback();
            }
            menu.remove();
            // check if the menu had an undo action associated with it
//            if (menu.undoAction) {
//                // handle the undo action
//                if (menu.actionSuccess) {
//                    if (menu.undoAction.isAChange()) {
//                        addUndoAction(menu.undoAction);
//                    }
//                } else {
//                    menu.undoAction.undoAction();
//                }
//                saveModelToUrl();
//            }
//
//            // check if the menu had a close callback associated with it
        }
        // might as well clear all popups
//        clearErrors();
        // only clear debug if it's not explicitly enabled
//        if (!debugEnabled) {
//            hideDebug();
//        }
    }

    function clearLastMenu() {
        if (getCurrentMenuLevel() > 0) {
            clearMenus(getCurrentMenuLevel() - 1);
            return true;

        } else {
            return false;
        }
    }

    Events.addKeyDownListener("Escape", clearLastMenu);
    Events.addMouseDownListener((e) => {
        // check if there are menus
        if (getCurrentMenuLevel() > 0) {
            // get the clicked target
            var element = e.target;
            // iterate over the target and its parents
            while (element) {
                // look for a menu level.  This will be set on the top level menu div
                if (element.menuLevel) {
                    // see if it's less than the current menu level
                    if (element.menuLevel != getCurrentMenuLevel()) {
                        // clear menus back to the clicked menu
                        clearMenus(element.menuLevel);
                        // we did something, prevent other listeners
                        return true;
                    }
                    // clicked on the current menu, let other listeners handle it
                    return false;
                }
                // proceed to the parent
                element = element.parentElement;
            }
            // got all the way to the top level body with no menu found
            // click was off any menu, so clear everything
            clearMenus();
            // we did something, prevent other listeners
            return true;
        }
        // no menus, let other listeners handle it
        return false;
    });

    function doCloseMenu(e) {
        // just let the event play through in case someone clicks on an input
//        if (e) {
//            e.preventDefault();
//        }
        // okay, I guess we do have to prevent the same click from closing the same menu it just opened
        if (e == lastMenuEvent) return;

        // "this" is the element that was clicked, which should have a menu level set
        clearMenus(this.menuLevel);
    }

    function buildCloseMenuButton() {
        var buttonDiv = document.createElement("td");
        // todo: there are some weird cases where the right hand column is wider than
        // the icon for no apparent reason, just right-justify the button so it
        // doesn't look dumb
        buttonDiv.style = "text-align: right";
    //    buttonDiv.className = "field";
        buttonDiv.innerHTML = `<img class="imgButton closeMenuButton" src="img/icon-close.png" srcset="img2x/icon-close.png 2x" title="Close Menu"/>`;
        buttonDiv.onclick = doCloseMenu;
        buttonDiv.menuLevel = getCurrentMenuLevel();
        return buttonDiv;
    }

    function buildMenu(contentDiv, label) {
        var menuDiv = document.createElement("div");
        menuDiv.className = "menu-container";

        var titleBarDiv = document.createElement("table");
        titleBarDiv.className = "menu-title-bar";

        var titleBarDivRow = document.createElement("tr");

        var titleDiv = document.createElement("td");
        titleDiv.className = "menu-title";
        titleDiv.innerHTML = label;
        titleBarDivRow.appendChild(titleDiv);

        var closeDiv = buildCloseMenuButton();
        titleBarDivRow.appendChild(closeDiv);

        titleBarDiv.appendChild(titleBarDivRow);
        menuDiv.appendChild(titleBarDiv);

        var contentContainerDiv = document.createElement("div");
        contentContainerDiv.className = "menu-content-container";
        contentContainerDiv.appendChild(contentDiv);

        menuDiv.appendChild(contentContainerDiv);

        menuDiv.menuLevel = getCurrentMenuLevel() + 1;
        menuDiv.onclick = doCloseMenu;
        menuDiv.onclose = () => {
            clearMenus(menuDiv.menuLevel - 1);
        };
        // todo: why?
//        menuDiv.addEventListener("mousedown", (e) => {
//            e.preventDefault();
//        });

        return menuDiv;
    }

//    function buildMenuLabel(label, colSpan, suffix=null) {
//        var td = document.createElement("td");
//        if (suffix == null) {
//            td.className = "label";
//            td.innerHTML = label;
//
//        } else {
//            var span = document.createElement("span");
//            span.className = "label";
//            span.innerHTML = label;
//            td.appendChild(span);
//
//            var span2 = document.createElement("span");
//            span2.innerHTML = suffix;
//            td.appendChild(span2);
//        }
//        td.colSpan = "" + colSpan;
//        return td;
//    }
//
//    function buildBlank(colSpan = 1) {
//        var td = document.createElement("td");
//        td.colSpan = "" + colSpan;
//        return td;
//    }
//
//    function buildIconCell(icon) {
//        var iconTd = document.createElement("td");
//        if (icon) {
//            iconTd.innerHTML = `<img src="icons/${icon}.png" srcset="icons2x/${icon}.png 2x"/>`;
//        }
//        // class="imgButton"
//        return iconTd;
//    }
//
//    function buildMenuHeaderLine(title, colSpan, icon = null, className = "menu-button") {
//        var tr = document.createElement("tr");
//        tr.appendChild(buildIconCell(icon));
//        tr.appendChild(buildMenuLabel(title, colSpan - 2));
//        tr.appendChild(buildCloseMenuButton());
//        return tr;
//    }


    function showMenuAt(menuDiv, left, top) {
        document.body.appendChild(menuDiv);

        var bcr = menuDiv.getBoundingClientRect();
        var w = window.innerWidth;
        var h = window.innerHeight;

        if (left < 0) left = 0;

        if (top < 0) top = 0;

        if (left + bcr.width > w) {
            left = Math.max(0, w - bcr.width);
        }
        if (top + bcr.height > h) {
            top = Math.max(0, h - bcr.height);
        }

        menuDiv.style.left = left + "px";
        menuDiv.style.top = top + "px";

        menus.push(menuDiv);

        setTimeout(function() { menuPlacementHack1(menuDiv) }, 100);
    }
    
    var placementMargin = 10;

    function menuPlacementHack1(menuDiv) {
        var se = document.scrollingElement;

        var bcr = menuDiv.getBoundingClientRect();
        var mTop = bcr.top + se.scrollTop;
        var mLeft = bcr.left + se.scrollLeft;
        var mHeight = bcr.height;
        var mWidth = bcr.width;

        var seTop = se.scrollTop + placementMargin;
        var seLeft = se.scrollLeft + placementMargin;
        // todo: why x5?
        var seHeight = window.innerHeight - (placementMargin * 5);
        var seWidth = window.innerWidth - (placementMargin * 5);
        
        if (mHeight > seHeight) mHeight = seHeight;
        
        if (mWidth > seWidth) mWidth = seWidth;

        if (mTop < seTop) {
            mTop = seTop;
        } else if (mTop + mHeight > seTop + seHeight) {
            mTop = seTop + seHeight - mHeight;
        }
        
        if (mLeft < seLeft) {
            mLeft = seLeft;
        } else if (mLeft + mWidth > seLeft + seWidth) {
            mLeft = seLeft + seWidth - mWidth;
        }

        if (mTop != bcr.top || mLeft != bcr.left || mHeight != bcr.height || mWidth != bcr.width) {
            //console.log(`Moved menu from ${bcr.left + se.scrollLeft}, ${bcr.top + se.scrollTop} (${bcr.width} x ${bcr.height}) to ${mLeft}, ${mTop} (${mWidth} x ${mHeight})`);
            menuDiv.style.top = mTop + "px";
            menuDiv.style.left = mLeft + "px";
            menuDiv.style.height = mHeight + "px";
            menuDiv.style.width = mWidth + "px";
            menuDiv.style.overflow = "auto";
        }
    }

    function getMenuCoordsFromElement(element, fullWidth = false) {
        var elementBcr = element.getBoundingClientRect();
        if (getCurrentMenuLevel() == 0) {
            var left = fullWidth ? 0 : elementBcr.left;
            var top = elementBcr.bottom;

        } else {
            var left = fullWidth ? 0 : elementBcr.right;
            var top = elementBcr.top;
        }
        var s = document.scrollingElement;
        return [left + s.scrollLeft, top + s.scrollTop];
    }

    function showMenu(contentDiv, element, title, fullWidth = false, closeCallback = null) {
        var menuDiv = buildMenu(contentDiv, title);
        menuDiv.closeCallback = closeCallback;
        var [left, top] = getMenuCoordsFromElement(element, fullWidth);
        showMenuAt(menuDiv, left, top);
        lastMenuEvent = window.event;
        return menuDiv.onclose;
    }

    // public members
    return  {
        showMenu: showMenu,
    }
})();
