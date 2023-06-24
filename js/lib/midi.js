// generic listener for MIDI events
class MidiListener {
    deviceOn(device) { }
    deviceOff(device) { }
    noteOn(device, note) { }
    noteOff(device, note) { }
    pitchBend(device, value) { }
}

// generic MIDI event library
var Midi = (function() {
    // device map
    var devices = new Map();
    // listener list
    var midiListenerList = [];

    function init() {
        try {
            // setting up MIDI access is pretty weird
            navigator.requestMIDIAccess()
                .then((access) => {
                    // Get lists of available MIDI controllers
                    console.log("found " + access.inputs.size + " midi devices");

                    // register a listener for devices connecting and disconnecting
                    access.onstatechange = (e) => {
                        handleInput(e.port);
                    };

                    // gather all devices that are already connected at startup and register handlers for them
                    access.inputs.forEach((input) => {
                        handleInput(input);
                    });
                });
        } catch (error) {
            // ignore, it's not the end of the world if MIDI support doesn't work
        }
    }

    function handleInput(input) {
        // check if we have a handler for this device
        if (!devices.has(input.id)) {
            // create a new handler and save in the map
            devices.set(input.id, new MidiDevice(input));
        }
        // run the state change handler
        devices.get(input.id).onStateChange(input.state);
    }

    function addMidiListener(listener) {
        // add a listener if not already present
        DomUtils.addToListIfNotPresent(midiListenerList, listener);
    }

    function removeMidiListener(listener) {
        // remove a listener if present
        DomUtils.removeFromList(midiListenerList, listener);
    }

    // listener list handling
    // todo: is there a better way to handle this?

    function deviceOn(device) {
        for (var i = 0; i < midiListenerList.length; i++) {
            midiListenerList[i].deviceOn(device);
        }
    }

    function deviceOff(device) {
        for (var i = 0; i < midiListenerList.length; i++) {
            midiListenerList[i].deviceOff(device);
        }
    }

    function noteOn(device, note) {
        for (var i = 0; i < midiListenerList.length; i++) {
            midiListenerList[i].noteOn(device, note);
        }
    }

    function noteOff(device, note) {
        for (var i = 0; i < midiListenerList.length; i++) {
            midiListenerList[i].noteOff(device, note);
        }
    }

    function pitchBend(device, value) {
        for (var i = 0; i < midiListenerList.length; i++) {
            midiListenerList[i].pitchBend(device, value);
        }
    }

    // handler object for a single MIDI device
    class MidiDevice {
        constructor(input) {
            // input object
            this.input = input;
            // save the id
            this.id = input.id;
            // pull out the name and manufacturer
            this.name = input.name;
            this.manufacturer = input.manufacturer;
            // start disconnected, the first event will set this to connected
            this.connected = false;
        }

        onStateChange(state) {
            // connected event
            if ("connected" == state && !this.connected) {
                // register our event listener
                this.input.onmidimessage = (e) => this.onEvent(e);
                // set state
                this.connected = true;
                // notify event listeners
                deviceOn(this.name);

            // disconnected event
            } else if ("disconnected" == state && this.connected) {
                // unregister the listener
                this.input.onmidimessage = null;
                // set state
                this.connected = false;
                // notify event listeners
                deviceOn(this.name);
            }
        }

        onEvent(e) {
            //console.log(e.data);

            if (e.data.length == 3) {
                switch (e.data.at(0)) {
                    case 144: // note down
                        noteOn(this.name, e.data.at(1));
                        // ignore the third byte, it's velocity
                        break;
                    case 128: // note up
                        noteOff(this.name, e.data.at(1));
                        // ignore the third byte, it's velocity
                        break;
                    case 224: // pitch bend
                        // unsigned little-endian, 7 bits + 7 bits, zero bend is the halfway point
                        var value0 = (e.data.at(2) * 128) + e.data.at(1) - 8192;
                        // 8192 values below zero, but only 8191 above 0
                        var value = (value0 <= 0) ? (value0 / 8192) : (value0 / 8191);
                        pitchBend(this.name, value);
                }
            }
        }
    }

//    addMidiListener(new LogMidiListener());
//
//    // debug listener, just logs stuff
//    class LogMidiListener extends MidiListener {
//        constructor() {
//            super();
//        }
//
//        deviceOff(device) {
//            console.log(device + ": off");
//        }
//
//        deviceOn(device) {
//            console.log(device + ": on");
//        }
//
//        noteOn(device, note) {
//            console.log(device + ": Note on: " + note);
//        }
//
//        noteOff(device, note) {
//            console.log(device + ": Note off: " + note);
//        }
//        pitchBend(device, value) {
//            console.log(device + ": Pitch bend: " + value);
//        }
//    }

    return {
        // init the MIDI event handlers
        init: init,
        // add an event listener
        addMidiListener: addMidiListener,
    }
})();

