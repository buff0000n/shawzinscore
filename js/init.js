
// entrypoint for the app, register event listeners and initialize the model
function initModel() {
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
        Events.registerEventListeners();
        Controls.registerEventListeners();
        Undo.registerEventListeners();
        Track.registerEventListeners();
        TrackBar.registerEventListeners();
        Playback.registerEventListeners();
        ControlSchemeUI.registerEventListeners();
        Editing.registerEventListeners();
        Midi.init();

        // initialize the model from the page URL
        Model.init();
    }, 100);
}

// toggle the help section
function about() {
    // get the help container
    var container = document.getElementById("lotsOfWordsContainer")

    // check if it's hidden
    if (container.style.display === "none") {
        // cripes, doesn't seem to be any way to do this without math
        // calculate the height of enbedded help page by taking the screen height and subtracting
        // the height of bottom bar without the help page, also subtract an extra 25 for no obvious reason
        var embedHeight = window.innerHeight - document.getElementById("bottomBar").getBoundingClientRect().height - 25;
        // embed the help hage
        container.innerHTML = `<embed id="helpEmbed" src="help.html"/>`;
        // set the embed height so the entier bottom bar just fills the screen
        document.getElementById("helpEmbed").style.height = embedHeight + "px";
        // unhide it
        container.style.display = "block";
        // scroll to it
        document.scrollingElement.scrollTo(0, document.scrollingElement.scrollTop + document.getElementById("bottomBar").getBoundingClientRect().top);

    // otherwise, it's not hidden
    } else {
        // hide it
        container.style.display = "none";
        // remove the help page
        container.innerHTML = ``;
    }
}
