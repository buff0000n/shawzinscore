// magic singleton pattern
var Menus = (function() {
    
    var menus = Array();

    function getCurrentMenuLevel() {
        return menus.length;
    }
    
    function clearMenus(leave = 0) {
        while (getCurrentMenuLevel() > leave) {
            var menu = menus.pop();
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
//            if (menu.closeCallback) {
//                menu.closeCallback();
//            }
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

    Events.addKeyDownHandler("Escape", clearLastMenu);
    Events.addMouseDownHandler((e) => {
        if (getCurrentMenuLevel() > 0) {
            var element = e.target;
            while (element) {
                if (element.menuLevel) {
                    if (element.menuLevel != getCurrentMenuLevel()) {
                        clearMenus(element.menuLevel);
                        e.preventDefault();
                        return true;
                    }
                    return false;
                }
                element = element.parentElement;
            }
            clearMenus();
            return true;
        }
        return false;
    });

    function doCloseMenu(e) {
        if (e) {
            e.preventDefault();
        }
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
        menuDiv.addEventListener("mousedown", (e) => {
            e.preventDefault();
        });

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

    function menuPlacementHack1(menuDiv) {
        var bcr = menuDiv.getBoundingClientRect();
        // pulled from events.js
    //	var windowWidth;
    //	var windowHeight;

        if (bcr.right > windowWidth) {
            menuDiv.style.left = "";
            menuDiv.style.right = "0px";
        }

        setTimeout(function() { menuPlacementHack2(menuDiv) }, 100);
    }

    function menuPlacementHack2(menuDiv) {
        var bcr = menuDiv.getBoundingClientRect();
        // pulled from events.js
    //	var windowWidth;
    //	var windowHeight;

        if (bcr.bottom > windowHeight) {
            menuDiv.style.top = "";
            menuDiv.style.bottom = "0px";
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
        return [left, top];
    }

    function showMenu(contentDiv, element, title, fullWidth = false) {
        var menuDiv = buildMenu(contentDiv, title);
        var [left, top] = getMenuCoordsFromElement(element, fullWidth);
        showMenuAt(menuDiv, left, top);
        return menuDiv.onclose;
    }

    // public members
    return  {
        showMenu: showMenu,
    }
})();
