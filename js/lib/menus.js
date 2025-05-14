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

    function buildMenu(contentDiv, label = null) {
        // top level menu container
        var menuDiv = document.createElement("div");
        menuDiv.className = "menu-container";

        if (label) {
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
        }

        // wrap the content div
        var contentContainerDiv = document.createElement("div");
        contentContainerDiv.className = "menu-content-container";

        var scrollDiv = document.createElement("div");
        scrollDiv.className = "menu-content-scroll";

        // add content to scroll div
        scrollDiv.appendChild(contentDiv);

        // add scroll div to content container
        contentContainerDiv.appendChild(scrollDiv);

        // add content container div to container
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

    // arbitrary margin between the window border and the menu container
    var placementMargin = 10;
    // guessing at the space we need to leave below and to the left of a menu to account for the window scrollbars
    var scrollbarSizeGuess = 16;
    // delay in running rounds 2 and three of the layout mechanism.
    var menuDelay = 50;

    function showMenuAt(menuDiv, left, top, scrollEnabled = true) {
        // Cripes on a cracker this is way harder than it should be.

        // get the window dimensions before adding the menu
        var wx1 = window.scrollX + placementMargin;
        var wx2 = window.scrollX + window.innerWidth - (placementMargin * 2) - scrollbarSizeGuess;
        var wy1 = window.scrollY + placementMargin;
        var wy2 = window.scrollY + window.innerHeight - (placementMargin * 2) - scrollbarSizeGuess;

        // initialize the menu location
        menuDiv.style.left = left + "px";
        menuDiv.style.top = top + "px";
        // just throw it on the top level document
        document.body.appendChild(menuDiv);

        // save to the menu stack
        menus.push(menuDiv);

        // let the browser lay it out where we put it, then we'll adjust
        setTimeout(function() {
            // get the global position of the element
            var bcr = menuDiv.getBoundingClientRect();
            var left = bcr.left + window.scrollX;
            var top = bcr.top + window.scrollY;
            var width = bcr.width;
            var height = bcr.height;

            // snap to the left, if overlapping
            if (left < wx1) left = wx1;

            // snap to the top, if overlapping
            if (top < wy1) top = wy1;

            // snap to the right, if overlapping and it won't push it back over the left border
            if (left + width > wx2) {
                left = Math.max(wx1, wx2 - width);
            }

            // snap to the bottom, if overlapping and it won't push it back over the top border
            if (top + height > wy2) {
                top = Math.max(wy1, wy2 - height);
            }

            // place the menu container
            if (left != bcr.left) menuDiv.style.left = left + "px";
            if (top != bcr.top) menuDiv.style.top = top + "px";

            // check to see if it's still too wide
            if (left + width > wx2) {
                width = wx2 - wx1;
            }

            // check to see if it's still too tall
            if (top + height > wy2) {
                height = wy2 - wy1;
            }

            // scrollbar flags
            var needsScrollY = false;
            var needsScrollX = false;

            // check if we need to resize vertically
            if (height != bcr.height) {
                menuDiv.style.height = height + "px";
                needsScrollY = true;
            }

            // check if we need to resize horizontally
            if (width != bcr.width) {
                menuDiv.style.width = width + "px";
                needsScrollX = true;
            }

            // check if the scrollbar is enabled and we need it
            if (scrollEnabled && (needsScrollX || needsScrollY)) {
                // give the browser one more chance to lay things out before resizing
                setTimeout(function() {
                    // sigh, we need to account for the vertical size if the title bar, if present
                    var titleBar = DomUtils.getFirstChild(menuDiv, "menu-title-bar", 1);
                    // get the scrollbar container
                    var scroll = DomUtils.getFirstChild(menuDiv, "menu-content-scroll", 3);

                    // get the top level menu div size
                    var bcr = menuDiv.getBoundingClientRect();
                    // get the height of the title bar, if present
                    var titleHeight = titleBar ? titleBar.getBoundingClientRect().height : 0;

                    // 8px margin and 8px padding on both sides
                    var totalPadding = 32;

                    if (needsScrollY) {
                        // enable vertical scrollbar
                        scroll.style.overflowY = "scroll";
                        // explicitly set the height of the scrollbar div
                        // this is the only way I've found to reliably keep the scroll section inside the menu div
                        scroll.style.height = (bcr.height - totalPadding - titleHeight) + "px";
                    }
                    if (needsScrollX) {
                        // enable horizontal scrollbar
                        scroll.style.overflowX = "scroll";
                        // explicitly set the width of the scrollbar div
                        scroll.style.width = (bcr.width - totalPadding) + "px";
                    }
                }, menuDelay);
            }
        }, menuDelay);
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

    function showMenu(contentDiv, left, top, title = null, fullWidth = false, closeCallback = null, scrollEnabled = true) {
        // build the menu element
        var menuDiv = buildMenu(contentDiv, title);
        // save the close callback, if present
        menuDiv.closeCallback = closeCallback;
        // show the menu
        showMenuAt(menuDiv, left, top, scrollEnabled);
        // save the last event so we don't accidentally close the menu immediately
        lastMenuEvent = window.event;
        // return the callback to close the menu
        return menuDiv.onclose;
    }

    function showMenuAtElement(contentDiv, element, title = null, fullWidth = false, closeCallback = null, scrollEnabled = true) {
        // get the starting position from the element
        var [left, top] = getMenuCoordsFromElement(element, fullWidth);
        return showMenu(contentDiv, left, top, title, fullWidth, closeCallback, scrollEnabled);
    }

    function showMenuAtEvent(contentDiv, e, title = null, fullWidth = false, closeCallback = null, scrollEnabled = true) {
        // get the starting position from the event
        return showMenu(contentDiv, e.clientX + window.scrollX, e.clientY + window.scrollY, title, fullWidth, closeCallback);
    }

    // public members
    return  {
        // Wrap the given div in a menu and pop it up under the given element with a title,
        // optionally full width, and with an optional callback when the menu is closed
        showMenu: showMenuAtElement, // (contentDiv, element, title, fullWidth = false, closeCallback = null, scrollEnabled = true)
        // show a menu at the location of the given event
        showMenuAtEvent: showMenuAtEvent, // (contentDiv, event, title, fullWidth = false, closeCallback = null, scrollEnabled = true, )
    }
})();
