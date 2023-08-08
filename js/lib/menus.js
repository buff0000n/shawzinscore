// magic singleton pattern
var Menus = (function() {

    // menu stack
    var menus = Array();
    // need to track the last event because of reasons
    var lastMenuEvent = null;

    function getCurrentMenuLevel() {
        // how many nested menus are there
        return menus.length;
    }
    
    function clearMenus(leave = 0) {
        // go while menus are nested deeper than the given level
        while (getCurrentMenuLevel() > leave) {
            // remove the top menu
            var menu = menus.pop();
            // optionally call the callback
            if (menu.closeCallback) {
                menu.closeCallback();
            }
            // simply remove the menu element
            menu.remove();
        }
    }

    function clearLastMenu() {
        // check if there are any menus
        if (getCurrentMenuLevel() > 0) {
            // clear one menu level
            clearMenus(getCurrentMenuLevel() - 1);
            // we did something, prevent other listeners
            return true;

        } else {
            // did nothing, let other listeners handle it
            return false;
        }
    }

    // register a global key listener so escape will close the top menu, if not handled by anything else
    Events.addKeyDownListener("Escape", clearLastMenu);
    // register a global mouse listener so clicking away from a menu will close it
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
        // okay, haha, I guess we do have to prevent the same click from closing the same menu it just opened
        if (e == lastMenuEvent) return;

        // "this" is the element that was clicked, which should have a menu level set
        clearMenus(this.menuLevel);
    }

    function buildCloseMenuButton() {
        // todo: figure out how to get the close button to the top right corner
        var buttonDiv = document.createElement("td");
        // this doesn't work
        buttonDiv.style = "text-align: right";
        buttonDiv.innerHTML = `<img class="imgButton closeMenuButton" src="img/icon-close.png" srcset="img2x/icon-close.png 2x" title="Close Menu"/>`;
        buttonDiv.onclick = doCloseMenu;
        buttonDiv.menuLevel = getCurrentMenuLevel();
        return buttonDiv;
    }

    function buildMenu(contentDiv, label) {
        // top level menu container
        var menuDiv = document.createElement("div");
        menuDiv.className = "menu-container";

        // title bar container
        var titleBarDiv = document.createElement("table");
        titleBarDiv.className = "menu-title-bar";

        var titleBarDivRow = document.createElement("tr");

        // label element
        var titleDiv = document.createElement("td");
        titleDiv.className = "menu-title";
        titleDiv.innerHTML = label;
        titleBarDivRow.appendChild(titleDiv);

        // close button element
        var closeDiv = buildCloseMenuButton();
        titleBarDivRow.appendChild(closeDiv);

        // add to containers
        titleBarDiv.appendChild(titleBarDivRow);
        menuDiv.appendChild(titleBarDiv);

        // wrap the content div
        var contentContainerDiv = document.createElement("div");
        contentContainerDiv.className = "menu-content-container";
        contentContainerDiv.appendChild(contentDiv);

        // add to container
        menuDiv.appendChild(contentContainerDiv);

        // save the current level on the container
        menuDiv.menuLevel = getCurrentMenuLevel() + 1;
        // handler for the close button
        menuDiv.onclick = doCloseMenu;
        // create a function to call for closing the menu on demeand
        menuDiv.onclose = () => {
            clearMenus(menuDiv.menuLevel - 1);
        };

        return menuDiv;
    }


    function showMenuAt(menuDiv, left, top) {
        // just throw it on the top level document
        document.body.appendChild(menuDiv);

        // get the global position of the element
        var bcr = menuDiv.getBoundingClientRect();
        // get the window dimensions
        var w = window.innerWidth;
        var h = window.innerHeight;

        // snap to the left, if overlapping
        if (left < 0) left = 0;

        // snap to the top, if overlapping
        if (top < 0) top = 0;

        // snap to the right, if overlapping and it won't push it back over the left border
        if (left + bcr.width > w) {
            left = Math.max(0, w - bcr.width);
        }

        // snap to the bottom, if overlapping and it won't push it back over the top border
        if (top + bcr.height > h) {
            top = Math.max(0, h - bcr.height);
        }

        // don't mess with the width/height, yet

        // place the menu container
        menuDiv.style.left = left + "px";
        menuDiv.style.top = top + "px";

        // save to the menu stack
        menus.push(menuDiv);

        // schedule something to make it fit after it lays out its internals
        setTimeout(function() { menuPlacementHack1(menuDiv) }, 100);
    }

    // arbitrary margin between the window border and the menu container
    var placementMargin = 10;

    function menuPlacementHack1(menuDiv) {
        // we're gong to need the scroll status of the main document
        var se = document.scrollingElement;

        // get the menu position
        var bcr = menuDiv.getBoundingClientRect();
        // getBoundingClientRect is in terms of the visible window, convert to absolute global position using the scroll state
        var mTop = bcr.top + se.scrollTop;
        var mLeft = bcr.left + se.scrollLeft;
        var mHeight = bcr.height;
        var mWidth = bcr.width;

        // get a bounds for the currently viewable page portion, minus a margin
        var seTop = se.scrollTop + placementMargin;
        var seLeft = se.scrollLeft + placementMargin;
        // todo: why x5?
        var seHeight = window.innerHeight - (placementMargin * 5);
        var seWidth = window.innerWidth - (placementMargin * 5);
        
        // trim the width if its too wide for the screen
        if (mHeight > seHeight) mHeight = seHeight;
        
        // trim the height if its too tall for the screen
        if (mWidth > seWidth) mWidth = seWidth;

        // snap to the top, if it's overlapping
        if (mTop < seTop) {
            mTop = seTop;

        // otherwise snap to the bottom, if it's overlapping
        } else if (mTop + mHeight > seTop + seHeight) {
            mTop = seTop + seHeight - mHeight;
        }

        // snap to the left, if it's overlapping
        if (mLeft < seLeft) {
            mLeft = seLeft;

        // otherwise, snap to the right, if it's overlapping
        } else if (mLeft + mWidth > seLeft + seWidth) {
            mLeft = seLeft + seWidth - mWidth;
        }

        // check if we have to make changes
        if (mTop != bcr.top || mLeft != bcr.left || mHeight != bcr.height || mWidth != bcr.width) {
            //console.log(`Moved menu from ${bcr.left + se.scrollLeft}, ${bcr.top + se.scrollTop} (${bcr.width} x ${bcr.height}) to ${mLeft}, ${mTop} (${mWidth} x ${mHeight})`);
            // apply position changes
            menuDiv.style.top = mTop + "px";
            menuDiv.style.left = mLeft + "px";
            menuDiv.style.height = mHeight + "px";
            menuDiv.style.width = mWidth + "px";
            // If we're reducing the dimensions of the element, add scrollbars
            if (mHeight < bcr.height || mWidth < bcr.width) {
                menuDiv.style.overflow = "auto";
            }
        }
    }

    function getMenuCoordsFromElement(element, fullWidth = false) {
        // get the elements view position
        var elementBcr = element.getBoundingClientRect();
        // todo: some other way to specify the direction of the menu popup?
        // if this is the first menu, open underneath the element
//        if (getCurrentMenuLevel() == 0) {
            var left = fullWidth ? 0 : elementBcr.left;
            var top = elementBcr.bottom;

        // otherwise, open to the right of the element
//        } else {
//            var left = fullWidth ? 0 : elementBcr.right;
//            var top = elementBcr.top;
//        }

        // check the last event
        if (window.event && window.event.clientY) {
            // get the vertical position
            var eventY = window.event.clientY;
            // if the last event's vertical position is really far above the menu starting position, move the menu
            // so it starts at the event and not under the element
            // the threshold here is arbitrary
            if (top - eventY > 50) {
                left = window.event.clientX;
                top = eventY;
            }
        }

        // get the main scroll element
        var s = document.scrollingElement;
        // adjust the position to be in global page coordinates
        return [left + s.scrollLeft, top + s.scrollTop];
    }

    function showMenu(contentDiv, element, title, fullWidth = false, closeCallback = null) {
        // build the menu element
        var menuDiv = buildMenu(contentDiv, title);
        // save the close callback, if present
        menuDiv.closeCallback = closeCallback;
        // get the starting position from the element
        var [left, top] = getMenuCoordsFromElement(element, fullWidth);
        // show the menu
        showMenuAt(menuDiv, left, top);
        // save the last event so we don't accidentally close the menu immediately
        lastMenuEvent = window.event;
        // return the callback to close the menu
        return menuDiv.onclose;
    }

    // public members
    return  {
        // Wrap the given div in a menu and pop it up under the given element with a title,
        // optionally full width, and with an optional callback when the menu is closed
        showMenu: showMenu, // (contentDiv, element, title, fullWidth = false, closeCallback = null)
    }
})();
