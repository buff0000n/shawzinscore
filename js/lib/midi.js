// generic listener for MIDI events
class MidiListener {
    // notify a device was connected
    deviceOn(device) { }
    // notify a device was disconnected
    deviceOff(device) { }
    // notify a note was started, the note for middle C is Midi.middleC
    noteOn(device, note) { }
    // notify a note was stopped, the note for middle C is Midi.middleC
    noteOff(device, note) { }
    // notify the pitch bend was changed. Value ranges from -1 to 1, with 0 being no pitch bend
    pitchBend(device, value) { }
}

// generic MIDI event library
var Midi = (function() {
    // misc constants
    var middleC = 60;

    // device map
    var devices = {};
    // listener list
    var midiListenerList = [];
    // midi access object
    var midiAccess = null;

    function init() {
        // sanity check
        if (midiAccess) return;
        try {
            // setting up MIDI access is pretty weird
            navigator.requestMIDIAccess()
                .then((access) => {
                    // Get lists of available MIDI controllers
                    if (access.inputs.size > 0) {
                        console.log("found " + access.inputs.size + " midi devices");
                    }

                    // register a listener for devices connecting and disconnecting
                    access.onstatechange = (e) => {
                        handleInput(e.port);
                    };

                    // gather all devices that are already connected at startup and register handlers for them
                    access.inputs.forEach((input) => {
                        handleInput(input);
                    });
                    // save so we can disable midi, also serves as the initialization flag
                    midiAccess = access;
                });
        } catch (error) {
            console.log(error);
            // ignore, it's not the end of the world if MIDI support doesn't work
        }
    }

    function disable() {
        // sanity check
        if (!midiAccess) return;

        // clear the midi state listener
        midiAccess.onstatechange = null;

        // clear device listeners
        for (var id in devices) {
            devices[id].disconnect();
        }

        // clear the device handler map
        devices = {};
        // clear the main midi object
        midiAccess = null;
    }

    function handleInput(input) {
        // check if we have a handler for this device
        if (!devices.hasOwnProperty(input.id)) {
            // create a new handler and save in the map
            devices[input.id] = new MidiDevice(input);
        }
        // run the state change handler
        devices[input.id].onStateChange(input.state);
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
            if ("connected" == state) {
                // connect to the device
                this.connect();

            // disconnected event
            } else if ("disconnected" == state) {
                // disconnect from the device
                this.disconnect();
            }
        }

        connect() {
            if (!this.connected) {
                // register our event listener
                this.input.onmidimessage = (e) => this.onEvent(e);
                // set state
                this.connected = true;
                // notify event listeners
                deviceOn(this.name);
            }
        }

        disconnect() {
            if (this.connected) {
                // unregister the listener
                this.input.onmidimessage = null;
                // set state
                this.connected = false;
                // notify event listeners
                deviceOff(this.name);
            }
        }

        onEvent(e) {
            //console.log(e.data);

            if (e.data.length == 3) {
                switch (e.data.at(0)) {
                    case 144: // note down
                        // if the velocity is 0 then it's a note up event
                        if (e.data.at(2) == 0) {
                            noteOff(this.name, e.data.at(1));
                        } else {
                            // otherwise, it's a note down
                            noteOn(this.name, e.data.at(1));
                        }
                        break;
                    case 128: // note up
                        noteOff(this.name, e.data.at(1));
                        // ignore the third byte, it's release velocity
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
        // enable and init the MIDI event handlers
        init: init,
        // disable midi, clear event handlers
        disable: disable,
        // add an event listener
        addMidiListener: addMidiListener,
        // misc constants
        middleC: middleC,
    }
})();

