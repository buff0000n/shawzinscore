var Flare = (function() {
    function init() {
        // javascript is working, clear the warning
        PageUtils.clearErrors();

        // register a global error handler
        window.onerror = PageUtils.windowOnError;

        // do the heavy initialization slightly later
        // this is so the "please enable javascript" warning can get hidden faster
        setTimeout(() => {
            // load preferences
            Settings.load();

            // set up event listeners and other UI crap
            buildTranscript();
            registerListeners();
            refreshSpoilers(Settings.getFlareSpoilerLevel());
            showDay(Settings.getFlareDay());
        }, 100);
    }

    function registerListeners() {
        document.getElementById("spoiler-level-1-input").addEventListener("change", updateSpoilers, { passive: false });
        document.getElementById("spoiler-level-2-input").addEventListener("change", updateSpoilers, { passive: false });
        document.getElementById("spoiler-level-3-input").addEventListener("change", updateSpoilers, { passive: false });

        document.getElementById("spoiler-level-1-input").level = 1;
        document.getElementById("spoiler-level-2-input").level = 2;
        document.getElementById("spoiler-level-3-input").level = 3;
    }

    function updateSpoilers(e) {
        var e = e || window.event;
        var level = e.currentTarget.level;
        refreshSpoilers(level);
    }

    function setSpoilerLevel(element, level) {
        element.classList.append("spoiler" + level);
    }

    function getSpoilerLevel(element) {
        for (var i = 0; i < element.classList.length; i++) {
            var c = element.classList.item(i);
            if (c.startsWith("spoiler")) return parseInt(c.substring("spoiler".length));
            if (c.startsWith("unspoiler")) return -parseInt(c.substring("unspoiler".length));
        };
        return 1;
    }

    function refreshSpoilers(level) {
        // console.log("LEVEL: " + level);
        document.getElementById("spoiler-level-" + level + "-input").checked = true;

        var container = document.getElementById("transcript");

        function elementWalk(element) {
            var elementSpoilerLevel = getSpoilerLevel(element);
            if (elementSpoilerLevel > level) {
                // console.log("Hiding element with level " + elementSpoilerLevel);
                element.style.display = "none";
            } else if (elementSpoilerLevel > 1 && elementSpoilerLevel <= level) {
                // console.log("Showing element with level " + elementSpoilerLevel);
                element.style.display = "";
            } if (elementSpoilerLevel < -1 && -elementSpoilerLevel > level) {
                // console.log("showing element with level " + elementSpoilerLevel);
                element.style.display = "";
            } else if (elementSpoilerLevel < -1 && -elementSpoilerLevel <= level) {
                // console.log("Hiding element with level " + elementSpoilerLevel);
                element.style.display = "none";
            }

            for (var i = 0; i < element.children.length; i++) {
                elementWalk(element.children.item(i));
            }
        }

        elementWalk(container);

        Settings.setFlareSpoilerLevel(level);
        return true;
    }

    function setDay(day) {
        var currentDay = Settings.getFlareDay();
        // toggle off if clicked again
        if (day == currentDay) day = 0;
        if (day > 0) {
            var dayElement = document.getElementById("chat_day_" + day);
            // save old screen position, this is relative to scrollTop
            var screenPosition = dayElement.getBoundingClientRect().top;
        }
        showDay(day);
        Settings.setFlareDay(day);
        if (day > 0) {
            // calculate the new scroll top to put the element in the same screen position
            // first get the current absolute position of the element, the subtract its previous screen position
            var newScreenPosition = document.documentElement.scrollTop + dayElement.getBoundingClientRect().top - screenPosition;
            console.log("scrolling from " + document.documentElement.scrollTop + " to " + newScreenPosition);
            document.documentElement.scrollTo(0, newScreenPosition);
        }
    }

    function showDay(day) {
        var script = Transcript.script;

        for (var d = 0; d < script.days.length; d++) {
            var dayNum = script.days[d].day;
            var dayTable = document.getElementById("chat_day_" + dayNum + "_table");
            var dayDots = document.getElementById("chat_day_" + dayNum + "_dots");
            var arrowUp = document.getElementById("chat_day_" + dayNum + "_arrow_up");
            var arrowDown = document.getElementById("chat_day_" + dayNum + "_arrow_down");

            if (dayNum == day) {
                dayTable.style.display = "";
                dayDots.style.display = "none";
                arrowUp.style.display = "";
                arrowDown.style.display = "none";

            } else {
                dayTable.style.display = "none";
                dayDots.style.display = "";
                arrowUp.style.display = "none";
                arrowDown.style.display = "";
            }
        }
    }


    function buildTranscript() {
        var container = document.getElementById("transcript");
        var script = Transcript.script;

        for (var d = 0; d < script.days.length; d++) {
            container.appendChild(buildChatDay(script.days[d], script.name_npc, script.name_player));
        }
    }

    function buildChatDay(day, name_npc, name_player) {
        var dayNumber = day.day;
        var dayDiv = document.createElement("div");
        dayDiv.className = "chat_day";
        dayDiv.id = "chat_day_" + dayNumber;

        var dayHeader = document.createElement("table");
        dayHeader.className = "chat_day_header";
        dayHeader.day = dayNumber;
        dayHeader.addEventListener("click", dayToggleClick, { passive: false });
        dayDiv.appendChild(dayHeader);

        var dayHeaderRow = document.createElement("tr");
        dayHeaderRow.className = "chat_day_header_row";
        dayHeader.appendChild(dayHeaderRow);

        var dayLabel = document.createElement("td");
        dayLabel.className = "chat_day_label";
        dayLabel.innerHTML = `Day ${dayNumber}`;
        dayHeaderRow.appendChild(dayLabel);

        var dayArrow = document.createElement("td");
        dayArrow.className = "chat_day_arrow";
        dayArrow.innerHTML = `<img src="../img/icon-dropdown.png" srcset="../img2x/icon-dropdown.png 2x" class="icon" id="chat_day_${dayNumber}_arrow_down"/>` +
                             `<img src="../img/icon-dropup.png" srcset="../img2x/icon-dropup.png 2x" class="icon" style="display: none;" id="chat_day_${dayNumber}_arrow_up"/>`;
        dayHeaderRow.appendChild(dayArrow);

        var tableDiv = document.createElement("div");
        tableDiv.className = "chat_day_table_div";
        dayDiv.appendChild(tableDiv);

        {
            var table = document.createElement("table");
            table.className = "chat_day_table";
            tableDiv.appendChild(table);

            var firstChat = buildChatItem(day.chat[0]);
            table.appendChild(firstChat);

            var chatDots = buildChatDots(dayNumber);
            chatDots.id = "chat_day_" + dayNumber + "_dots";
            chatDots.style.display = "none";
            table.appendChild(chatDots);
        }

        {
            var table = document.createElement("table");
            table.className = "chat_day_table";
            table.id = "chat_day_" + dayNumber + "_table";
            tableDiv.appendChild(table);

            var lastName = null;
            for (var c = 1; c < day.chat.length; c++) {
                var chat = day.chat[c];
                var nextChat = buildChatItem(chat);

                if (chat.name == name_npc) {
                    // any npc line after the first one of the day is a level 3 spoiler
                    nextChat.classList.add("spoiler3");
                    nextChat.style.display = "none";
                } else if (chat.name == name_player && lastName == name_player) {
                    // any player line after the first one in a chain of player lines is a level 2 spoiler
                    nextChat.classList.add("spoiler2");
                    nextChat.style.display = "none";
                }
                lastName = chat.name;

                table.appendChild(nextChat);
            }
        }

        return dayDiv;
    }

    function buildChatItem(chat) {
        var chatTr = document.createElement("tr");
        chatTr.className = "chat_item";

        var iconTd = document.createElement("td");
        iconTd.className = "chat_icon";
        chatTr.appendChild(iconTd);

        var iconImg = document.createElement("img");
        iconImg.className = "chat_icon_img";
        iconImg.width = 48;
        iconImg.height = 48;
        iconImg.src = `img/icon_${chat.name}.png`;
        iconImg.srcset = `img2x/icon_${chat.name}.png 2x`;
        iconTd.appendChild(iconImg);

        var chatTd = document.createElement("td");
        chatTd.className = "chat_text";
        chatTr.appendChild(chatTd);

        var nameDiv = document.createElement("div");
        nameDiv.className = `chat_name chat_name_${chat.name}`;
        nameDiv.innerHTML = `${chat.name}:`;
        chatTd.appendChild(nameDiv);

        var p = redactLine(chat.text);
        if (chat.gold) {
            p.className = "chat_gold";
        }
        chatTd.appendChild(p);

        return chatTr;
    }

    function redactLine(line, words=3) {
        var index = 0, wc = 0;
        while (index >= 0 && wc < words) {
            index = line.indexOf(" ", index + 1);
            wc += 1;
        }

        var p = document.createElement("p");
        if (index < 0) {
            p.innerHTML = line;
            return p;

        } else {
            // this is more of a pain in the ass than it should be
            p.appendChild(document.createTextNode(line.substring(0, index)));

            var unspoilerSpan = document.createElement("span");
            unspoilerSpan.className = "unspoiler2 dotsButton";
            unspoilerSpan.addEventListener("click", unspoilerClick, { passive: false });
            unspoilerSpan.innerHTML = "...";
            p.appendChild(unspoilerSpan);

            var spoilerSpan = document.createElement("span");
            spoilerSpan.className = "spoiler2";
            spoilerSpan.display = "none";
            spoilerSpan.innerHTML = line.substring(index);
            p.appendChild(spoilerSpan);

            return p;
        }
    }

    function buildChatDots(day) {
        var chatTr = document.createElement("tr");
        chatTr.className = "chat_dots";

        var dotsTd = document.createElement("td");
        dotsTd.className = "chat_dots_text";
        dotsTd.colSpan = 2;
        chatTr.appendChild(dotsTd);

        var dotsSpan = document.createElement("span");
        dotsSpan.className = "dotsButton";
        dotsSpan.day = day;
        dotsSpan.addEventListener("click", dayToggleClick, { passive: false });
        dotsSpan.innerHTML = "...";
        dotsTd.appendChild(dotsSpan);

        return chatTr;
    }

    function unspoilerClick() {
        var e = e || window.event;
        var unspoilerElement = e.currentTarget;
        var spoilerElement = DomUtils.getFirstChild(unspoilerElement.parentNode, "spoiler2");

        unspoilerElement.style.display = "none";
        spoilerElement.style.display = "";
    }

    function dayToggleClick() {
        var e = e || window.event;
        var element = e.currentTarget;
        var day = element.day;
        console.log("day: " + day);
        setDay(day);
    }

    return {
        init: init
    }
})();

var init = Flare.init;