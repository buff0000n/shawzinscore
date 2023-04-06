// Generic Audio handler library
// Supports a bank of sounds where each sound can br triggered by name either now or at some time in the future
// Supports mono groups, where playing one sound in the group stops any other sound in the group
var Audio = (function() {

    // we will initialize the context at the last possible moment, inside a user event,
    // because that's what some browsers require
    var context;
    // The context's timer starts when its created and just keeps going as long as the page is open
    // Save an offset so we can zero out the playback timer without worrying about the context's current time
    var timeOffset = 0;
    // grace period for comparing sound times because they're all floating point
    var timeUlp = 0.01;
    // grace period for canceling sounds so we don't have some audibly cut off.
    var dropGracePeriod = 0.1;

    function initAudioContext() {
        // init the audio context if it's not initialized
        if (context == null) {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            context = new AudioContext();
            // if the time offset has already been set, reset it now that we have an audio context
            if (timeOffset != 0) {
                setTimeOffset(timeOffset);
            }
        }
    }

    function setTimeOffset(offset=0) {
        if (context != null) {
            // the given offset is assumed to be relative to the current time
            timeOffset = context.currentTime + offset;

        } else {
            // save for when the audio context is initialized
            timeOffset = offset;
        }
    }

    var SoundCache = (function() {
        // map from URL to buffer
        var cache = {};

        // When finished, calls callback({url: buffer, url: buffer, ...});
        function loadSounds(urlList, callback) {
            // collect cache hits imediately
            var cacheHits = {};
            // anything else is queued for loading
            var loadUrlList = [];
            // go through the URL list and separate into "already cached" and "not cached"
            for (var i = 0; i < urlList.length; i++) {
                if (cache[urlList[i]]) {
                    cacheHits[urlList[i]] = cache[urlList[i]];
                } else {
                    loadUrlList.push(urlList[i]);
                }
            }

            // all URLs were cache hits, return the sounds directly
            if (loadUrlList.length == 0) {
                callback(cacheHits);
                return;
            }

            // start a loader to load and decode the uncached sounds
            new BufferLoader(context, urlList, (urlToBuffer) => {
                // put each loaded sound into the cache hits and our actual cache
                for (var url in urlToBuffer) {
                    var buffer = urlToBuffer[url];
                    cacheHits[url] = buffer;
                    cache[url] = buffer;
                }
                // return the sounds
                callback(cacheHits);
            }).load();
        }

        return {
            loadSounds: loadSounds
        };
    }());

    // sound event, starts/schedules an instance of a sound and tracks everything we might need to cut it off or cancel it
    class SoundEvent {
        constructor(name, buffer, volume, startTime, duration, monoFadeTime) {
            // sound data
            this.name = name;
            this.buffer = buffer;
            this.volume = volume;
            this.startTime = startTime;
            this.endTime = startTime + duration;
            this.monoFadeTime = monoFadeTime;

            // audio context objects
            this.source = null;
            this.gain = null;
        }

        play() {
            // create a source node
            this.source = context.createBufferSource();
            this.source.buffer = this.buffer;

            // create a volume node
            this.gain = context.createGain();
            // set the volume on the gain node
            this.gain.gain.value = this.volume;

            // connect the nodes to the audio context output
            this.source.connect(this.gain);
            this.gain.connect(context.destination);

            // schedule the sound
            console.log("Playing at " + this.startTime + ": " + this.name);
            this.source.start(this.startTime);
        }

        stopAt(time) {
            // schedule the stop
            // We can't just stop the sound instantly because there will be an audible pop
            // schedule the start of a fade
            this.gain.gain.setValueAtTime(this.volume, time);
            // schedule a very quick fade, down to 0.01 volume because it doesn't like 0.
            this.gain.gain.exponentialRampToValueAtTime(0.01, time + this.monoFadeTime);
            // stop the source at the end of the fade
            this.source.stop(time + this.monoFadeTime);
            // update the event stop time
            // don't include the fade time, so it doesn't try to reset its end time to later and cause audio glitches
            this.endTime = time

            console.log("Stopping at " + time + ": " + this.name);
        }

        cancel() {
            // should only be called if the sound hasn't been started yet
            this.source.cancel();
        }
    }

    // event queue for sounds, takes care of handling mono and canceling unplayed sounds
    class SoundEventQueue {
        constructor(mono=false) {
            // mono flag
            this.mono = mono;
            // event queue
            this.queue = [];
        }

        clear() {
            // just start over
            this.queue = [];
        }

        clean(currentTime) {
            // clean up and events that are past their end time
            var index = 0;
            // iterate from the beginning until the start time is past the current time
            while (index < this.queue.length && this.queue[index].startTime < currentTime + timeUlp) {
                // check to see if this event is past its end time
                if (this.queue[index].endTime < currentTime) {
                    this.queue.splice(index, 1);
                    // repeat the index
                } else {
                    // increment the index
                    index++;
                }
            }
        }

        dropAfter(currentTime) {
            // add some grace time
            currentTime += dropGracePeriod;
            // iterate from the end until the start time is before the current time
            while (this.queue[this.queue.length - 1].startTime > currentTime - timeUlp) {
                // remove the event and cancel it
                var event = this.queue.pop();
                event.cancel();
            }
        }

        insert(currentTime, soundEvent) {
            // do cleanup
            this.clean(currentTime);
            // if we're mono, stop any existing sounds playing at that time.
            if (this.mono) {
                this.stopAt(soundEvent.startTime);
            }

            // find the correct index to insert the sound, just a simple linear search
            var index = 0;
            while (index < this.queue.length && this.queue[index].startTime < soundEvent.startTime + timeUlp) {
                index++;
            }
            // insert
            this.queue.splice(index, 0, soundEvent);
        }

        stopAt(stopTime) {
            // get all events that are playing at the given time
            var soundEvents = this.getAt(stopTime);
            // stop each one at that time
            for (var i = 0; i < soundEvents.length; i++) {
                soundEvents[i].stopAt(stopTime);
            }
        }

        getAt(getTime) {
            // start a list
            var got = [];
            // iterate from the beginning until the start time is past the given time
            var index = 0;
            while (index < this.queue.length && this.queue[index].startTime < getTime + timeUlp) {
                // if the end time is past the given time then this sound is playing
                if (this.queue[index].endTime > getTime) {
                    got.push(this.queue[index]);
                }
                index++;
            }
            return got;
        }
    }

    // object wrapping a single sound and keeping track of its source, volume, and play state.
    class SoundEntry {
        constructor(name, urlList, soundEventQueue, monoFadeTime=0.05) {
            // sound data
            this.name = name;
            this.urlList = urlList;

            // fade time for stopping a sound
            // we can't just stop a sound instantly because there will be an audible pop.
            this.monoFadeTime = monoFadeTime;

            // the sound event queue, multiple sounds can share the same queue.
            this.soundEventQueue = soundEventQueue;

            // tracker for cycling through alternate sounds
            this.bufferIndex = 0;

            // default volume
            this.volume = 1.0;
        }

        init(buffers) {
            // sound buffers
            this.buffers = buffers;

            // calculate buffer durations
            this.durations = [];
            for (var b = 0; b < this.buffers.length; b++) {
                var bufferDuration = this.buffers[b].length / this.buffers[b].sampleRate
                this.durations.push(bufferDuration);
            }
        }

        setVolume(volume) {
            if (volume != this.volume) {
                this.volume = volume;
            }
        }

        play(currentTime, time=null) {
            if (time == null) {
                // play immediately
                time = currentTime;

            } else {
                // offset playtime to be in the context's time
                time += timeOffset;
            }

            // short circuit
            if (this.volume == 0) {
                return;
            }

            // pull the cycle's current buffer and duration
            var buffer = this.buffers[this.bufferIndex];
            var duration = this.durations[this.bufferIndex];

            // cycle
            this.bufferIndex++;
            if (this.bufferIndex >= this.buffers.length) {
                this.bufferIndex = 0;
            }

            // build a sound event
            var soundEvent = new SoundEvent(this.name, buffer, this.volume, time, duration, this.monoFadeTime);
            // insert in the queue
            this.soundEventQueue.insert(currentTime, soundEvent);
            // start it
            // todo: do this automatically in the soundEventQueue?
            soundEvent.play();
        }
    }

    class SoundBank {
        constructor() {
            // init flag
            this.initialized = false;
            // map of sound entries
            this.nameToSoundEntry = {};
            // map of mono group event queues
            this.monoSoundEventQueues = {};
            // one event queue for sounds that aren't in a mono group
            this.polySoundEventQueue = null;

            this.volume = 1.0;
        }

        addSound(name, urlList, monoGroup=null, monoFadeTime=0) {
            // console.log("Adding sound " + name + ", monoGroup: " + monoGroup + ", monoFadeTime: " + monoFadeTime);
            // get the right sound event queue
            var soundEventQueue = null;
            if (monoGroup) {
                // create a sound event queue for this mono group if it doesn't exist
                if (!this.monoSoundEventQueues[monoGroup]) {
                    this.monoSoundEventQueues[monoGroup] = new SoundEventQueue(true);
                }
                soundEventQueue = this.monoSoundEventQueues[monoGroup];
            } else {
                // create a non-mono sound event queue, if it doesn't exist
                if (this.polySoundEventQueue == null) {
                    this.polySoundEventQueue = new SoundEventQueue(false);
                }
                soundEventQueue = this.polySoundEventQueue;
            }
            // build the sound entry
            this.nameToSoundEntry[name] = new SoundEntry(name, urlList, soundEventQueue, monoFadeTime);
        }

        checkInit(callback) {
            // short-circuit if we're initialized
            if (this.initialized) {
                callback();
                return;
            }

            // make sure the audio context is initialized.  This has to be done first while handling a UI event
            initAudioContext();

            // put together a list of all URLs from all sounds
            var urlList = [];
            for (var name in this.nameToSoundEntry) {
                var soundEntry = this.nameToSoundEntry[name];
                for (var j = 0; j < soundEntry.urlList.length; j++) {
                    urlList.push(soundEntry.urlList[j]);
                }
            }

            // load the sounds
            SoundCache.loadSounds(urlList, (urlToBuffer) => {
                // correlate the sounds back to their sound entries
                for (var name in this.nameToSoundEntry) {
                    var soundEntry = this.nameToSoundEntry[name];
                    var soundUrlList = soundEntry.urlList;
                    var buffers = [];
                    // pull the entry's sounds from the loaded sounds
                    for (var i = 0; i < soundUrlList.length; i++) {
                        buffers.push(urlToBuffer[soundUrlList[i]]);
                    }
                    // update the entry
                    soundEntry.init(buffers);
                }

                // init volume
                this.setVolume(this.volume);
                // set the flag
                this.initialized = true;

                // return
                callback();
            });
        }

        play(name, time=null) {
            this.checkInit(() => {
                // get the current time for reasons
                var currentTime = context.currentTime;
                // find the sound entry
                var soundEntry = this.nameToSoundEntry[name];
                // play the sound
                soundEntry.play(currentTime, time);
            });
        }

        setVolume(volume) {
            // store the volume
            this.volume = volume;
            // propagate to sound entries
            if (this.nameToSoundEntry) {
                for (name in this.nameToSoundEntry) {
                    this.nameToSoundEntry[name].setVolume(volume);
                }
            }
        }
    }


//    // object wrapping a bank of sounds from a single source
//    class SoundBankSource {
//        constructor(sourceName, sources, mono=null) {
//            // source data
//            this.sourceName = sourceName;
//            this.sources = sources;
//            this.mono = mono;
//            // intialized flag
//            this.initialized = false;
//
//            // create the sound entries
//            this.sounds = Array();
//            for (var i = 0; i < this.sources.length; i++) {
//                this.sounds.push(new SoundEntry(this.mono ? this.mono.fadeTime : 0));
//            }
//        }
//
//        getSourceList() {
//            var sourceList = Array();
//            for (var i = 0; i < this.sounds.length; i++) {
//                // add a sound path to the list for each entry in the source for that sound
//                // these will be the keys in the map passed to applySourceBuffers()
//                for (var j = 0; j < this.sources[i].length; j++) {
//                    sourceList.push(this.sources[i][j]);
//                }
//            }
//            return sourceList;
//        }
//
//        getMaxDuration() {
//            if (!this.maxDuration) {
//                this.maxDuration = 0;
//                for (var s = 0; s < this.sounds.length; s++) {
//                    var soundDuration = this.sounds[s].getMaxDuration();
//                    if (soundDuration > this.maxDuration) {
//                        this.maxDuration = soundDuration;
//                    }
//                }
//            }
//            return this.maxDuration;
//        }
//
//        applySourceBuffers(bufferMap) {
//            for (var i = 0; i < this.sounds.length; i++) {
//                // collect the buffers for this sound
//                var soundBuffers = Array();
//                for (var j = 0; j < this.sources[i].length; j++) {
//                    // the key is the original source path
//                    soundBuffers.push(bufferMap[this.sources[i][j]]);
//                }
//                // set the sound buffers, concatenate the sound file paths for a name
//                this.sounds[i].setBuffers(soundBuffers, this.sources[i].join());
//            }
//            // this sound bank source is now initialized and will stay that way
//            this.initialized = true;
//        }
//
//        setVolume(volume) {
//            // propagate song-level volume to each sound
//            for (var i = 0; i < this.sounds.length; i++) {
//                this.sounds[i].setVolume(volume);
//            }
//        }
//
//        setMixVolume(index, mixVolume) {
//            // propagate mixer volume to the relevant sound
//            this.sounds[index].setMixVolume(mixVolume);
//        }
//
//        setMasterVolume(masterVolume) {
//            // propagate master volume to each sound
//            for (var index = 0; index < this.sounds.length; index++) {
//                this.sounds[index].setMasterVolume(masterVolume);
//            }
//        }
//
//        playLater(index, time, context=audioContext) {
//            if (this.mono) {
//                // if this bank is mono then schedule any currently playing sounds to stop
//                if (this.mono.perTone) {
//                    // per-tone mono: just stop the sound about to play,
//                    this.sounds[index].stopLater(time, context);
//
//                } else {
//                    // otherwise stop all sounds in the bank
//                    for (var i = 0; i < this.sounds.length; i++) {
//                        this.sounds[i].stopLater(time, context);
//                    }
//                }
//            }
//            // play the sound
//            this.sounds[index].triggerLater(time, context);
//        }
//
//        stop() {
//            // stop all sounds in this bank
//            for (var i = 0; i < this.sounds.length; i++) {
//                this.sounds[i].stop();
//            }
//        }
//
//        clearStops() {
//            // clear all stoppable sounds in this bank.  This is because we can't know on our own when a sound
//            // has started playing
//            for (var i = 0; i < this.sounds.length; i++) {
//                this.sounds[i].clearStop();
//            }
//        }
//    }
//
//    // object wrapping a collections of sounds from the same logical source
//    class SoundBank {
//        constructor(name, size) {
//            // source cache
//            this.name = name;
//            this.sources = {};
//            this.currentSource = null;
//            this.volume = null;
//
//            // enabled status is also an array
//            this.enabled = Array();
//            for (var i = 0; i < size; i++) {
//                this.enabled.push(true);
//            }
//
//            // initialization state
//            this.initialized = false;
//        }
//
//        precacheSource(sourceName, sources, mono=null) {
//            if (!this.sources[sourceName]) {
//                // create a new, uninitialized  bank source if it doesn't exist
//                this.sources[sourceName] = new SoundBankSource(sourceName, sources, mono);
//            }
//            return this.sources[sourceName];
//        }
//
//        setSource(sourceName, sources, mono=null, precache=false) {
//            // don't do anything if it's the source we already have
//            if (this.currentSource && this.currentSource.sourceName == sourceName) {
//                return;
//            }
//
//            // get or create a bank source and set it as the current
//            var bankSource = this.precacheSource(sourceName, sources, mono);
//            // check if it's initialized
//            if (!bankSource.initialized) {
//                // reset the init flag.
//                // we can't actually do anything until there's an explicit user action.
//                // abuse of auto-play video and audio is why we can't have nice things.
//                this.initialized = false;
//                // clear out any pending loaders
//                // this can happen if sound packs are changed really fast by holding down undo/redo
//                this.loader = null;
//
//            }
//
//            if (!precache) {
//                this.currentSource = bankSource;
//                // make sure the song-level volume is correct
//                if (this.volume != null) {
//                    this.currentSource.setVolume(this.volume);
//                }
//            }
//
//        }
//
//        initialize(callback=null) {
//            // check if we're already initialized or in the process of initialization
//            if (this.initialized || this.loader != null) {
//                // call the callback directly
//                if (callback != null) callback();
//                // short circuit
//                return;
//            }
//
//            // finally we can init the audio context now that we're theoretically inside a user event handler
//            initAudioContext();
//            if (this.sources != null) {
//                // collect the source paths from all unintialized bank sources
//                var originalSourceList = Array();
//                for (var sourceName in this.sources) {
//                    var source = this.sources[sourceName];
//                    if (!source.initialized) {
//                        // append the source paths into one big list
//                        originalSourceList = originalSourceList.concat(source.getSourceList());
//                    }
//                }
//                // build a corresponding array of the full source paths
//                var sourceList = Array();
//                for (var i = 0; i < originalSourceList.length; i++) {
//                    sourceList.push(soundPath + originalSourceList[i]);
//                }
//                // start a background loader with a callback because that's how things work
//                this.loader = new BufferLoader(audioContext, sourceList,
//                    (loader, bufferList) => this.loaded(loader, originalSourceList, bufferList, callback));
//                this.loader.bank = this;
//                this.loader.load();
//            }
//        }
//
//        loaded(loader, originalSourceList, bufferList, callback) {
//            if (loader != this.loader) {
//                // ignore, things have changed since this loader was started
//                return;
//            }
//            // build a map of source path to buffer
//            var bufferMap = {};
//            for (var i = 0; i < originalSourceList.length; i++) {
//                // order is preserved, set the key for each buffer using the corresponding original path entry
//                bufferMap[originalSourceList[i]] = bufferList[i];
//            }
//
//            // set the loaded sources into each sound entry
//            for (var sourceName in this.sources) {
//                var source = this.sources[sourceName];
//                if (!source.initialized) {
//                    // Each source will pull the buffers they need from the map
//                    source.applySourceBuffers(bufferMap);
//                }
//            }
//            // set the initialized state
//            this.loader = null;
//            this.initialized = true;
//
//            // hit the callback if provided
//            if (callback != null) callback();
//        }
//
//        getMaxDuration() {
//            return this.currentSource.getMaxDuration();
//        }
//
//
//        setVolume(volume) {
//            // change check
//            if (this.volume == volume) {
//                return;
//            }
//
//            // save the volume
//            this.volume = volume;
//            // pass on the setting to the current bank source
//            // no need to set it on all sources
//            if (this.currentSource) {
//                this.currentSource.setVolume(this.volume);
//            }
//        }
//
//        setMixVolume(index, mixVolume) {
//            // pass on the mixer setting to each of the bank sources
//            // mixer settings typically don't change that often and this is easier than
//            // saving and reinitializing mixer settings every time the bank source changes
//            for (var sourceName in this.sources) {
//                var source = this.sources[sourceName];
//                source.setMixVolume(index, mixVolume);
//            }
//        }
//
//        setMasterVolume(masterVolume) {
//            // pass on the mixer setting to each of the bank sources
//            for (var sourceName in this.sources) {
//                var source = this.sources[sourceName];
//                source.setMasterVolume(masterVolume);
//            }
//        }
//
//        setEnabled(index, enabled) {
//            // enable/disable sound
//            this.enabled[index] = enabled;
//        }
//
//        isEnabled(index) {
//            return this.enabled[index];
//        }
//
//        play(index) {
//            // play the sound immediately
//            this.playLater(index, 0);
//        }
//
//        playLater(index, time, context=audioContext) {
//            // check if the given sound is enabled
//            if (this.enabled[index]) {
//                // make sure we're initialized.  Regardless of whether it's from clicking a note or starting playback,
//                // the first sound must be played directly inside a user event handler so we're allowed to init the
//                // audio context
//                this.initialize();
//                if (this.currentSource) {
//                    this.currentSource.playLater(index, time, context);
//                }
//                return true;
//
//            } else {
//                return false;
//            }
//        }
//
//        stop() {
//            // stop the current bank source
//            if (this.currentSource) {
//                this.currentSource.stop();
//            }
//        }
//
//        clearStops() {
//            // clear all stoppable sounds in the current bank source.
//            // This is because we can't know on our own when a sound has started playing
//            if (this.currentSource) {
//                this.currentSource.clearStops();
//            }
//        }
//    }
//
//    // This object wraps three sound banks, one each for percussion, bass, and melody
//    class SoundPlayer {
//        constructor() {
//            // data structures
//            this.banks = {};
//            this.indexToBank = {};
//            this.numBanks = 0;
//
//            for (var name in sectionMetaData) {
//                var m = sectionMetaData[name];
//                if (!m.all) {
//                    // create a new bank with the section's number of notes and sound file suffixes
//                    var bank = new SoundBank(name, m.rowStop - m.rowStart + 1);
//                    // store an extra row start property, we'll need this later
//                    bank.rowStart = m.rowStart;
//                    // reference the bank by name
//                    this.banks[name] = bank;
//                    // also reference the bank by the row index of each note it plays
//                    for (var i = m.rowStart; i <= m.rowStop; i++) {
//                        this.indexToBank[i] = bank;
//                    }
//                    // it's hard to get the size of a dict, so just keep it handy
//                    this.numBanks++;
//                }
//            }
//
//            // special error sound for when the max number of notes in a section is exceeded
//            this.bzzt = new SoundBank("bzzt", 1);
//            // the suffix is the whole path
//            this.bzzt.setSource(bzztSoundFile, [[bzztSoundFile]], true);
//
//            // initialization flag
//            this.initialized = false;
//        }
//
//        setSource(section, source, mono=null, precache=false) {
//            var m = sectionMetaData[section];
//            var soundFiles = instrumentNameToPack[source].soundFiles
//            // set the source on the given section
//            this.banks[section].setSource(source, soundFiles.slice(m.rowStart, m.rowStop + 1), mono, precache);
//            // go ahead and reset the initialized flag
//            this.initialized = false;
//        }
//
//        getMaxDuration() {
//            var duration = 0;
//            for (var section in this.banks) {
//                var bankDuration = this.banks[section].getMaxDuration();
//                if (bankDuration > duration) {
//                    duration = bankDuration;
//                }
//            }
//            return duration;
//        }
//
//        setVolume(section, volume) {
//            // set the volume on the given section
//            this.banks[section].setVolume(volume);
//        }
//
//        setMixVolume(index, mixVolume) {
//            // find the correct section
//            var bank = this.indexToBank[index];
//            // set the specified sound's volume
//            return bank.setMixVolume(index - bank.rowStart, mixVolume);
//        }
//
//        setMasterVolume(masterVolume) {
//            for (var section in this.banks) {
//                this.banks[section].setMasterVolume(masterVolume);
//            }
//        }
//
//        setEnabled(index, enabled) {
//            var bank = this.indexToBank[index];
//            // enable or disable playback for the given row
//            bank.setEnabled(index - bank.rowStart, enabled);
//        }
//
//        isEnabled(index) {
//            // determine if the row is enabled
//            var bank = this.indexToBank[index];
//            return bank.isEnabled(index - bank.rowStart);
//        }
//
//        allBanksInitialized() {
//            // short circuit
//            if (this.initialized) {
//                return true;
//            }
//            // check to see if every bank is initialized
//            for (var section in this.banks) {
//                if (!this.banks[section].initialized) {
//                    // found an uninitialized one
//                    return false;
//                }
//            }
//            // short circuit in the future
//            this.initialized = true;
//            // we are initialized
//            return true;
//        }
//
//        initialize(callback) {
//            // short-circuit if we're already initialized
//            if (this.allBanksInitialized()) {
//                callback();
//                return;
//            }
//
//            // loop over the sections
//            for (var section in this.banks) {
//                // initialize each section with a callback
//                this.banks[section].initialize(() => {
//                    // if we've hit all banks then run the callback
//                    if (this.allBanksInitialized()) {
//                        callback();
//                    }
//                });
//            }
//        }
//
//        playSound(index) {
//            // play a sound now
//            this.playSoundLater(index, 0);
//        }
//
//        playSoundLater(index, time) {
//            // find the correct section
//            var bank = this.indexToBank[index];
//            // play the sound, reindexing according to the section's starting row index
//            // use the offline context if present, otherwise play live
//            return bank.playLater(index - bank.rowStart, time, this.offlineCtx ? this.offlineCtx : audioContext);
//        }
//
//        clearStops() {
//            // This is because we can't tell when a sound has started playing, and we don't want to cut sounds off
//            // in the middle when we stop playback.
//            for (var section in this.banks) {
//                this.banks[section].clearStops();
//            }
//        }
//
//        stop() {
//            // stop any pending scheduled sounds in every bank
//            for (var section in this.banks) {
//                this.banks[section].stop();
//            }
//        }
//
//        playBzzt(index) {
//            // play the error sound immediately
//            this.bzzt.play(0);
//        }
//
//        initRendering(duration, callback) {
//            this.resetOfflineProgress();
//            // assume 44100 sample rate
//            var sampleRate = 44100;
//
//            this.resetOfflineProgress();
//
//            this.initialize(() => {
//                // use the base duration and append the length of our longest sound
//                this.offlineCtx = new OfflineAudioContext(2, (duration * sampleRate) + this.getMaxDuration(), sampleRate);
//                this.renderingDuration = duration;
//                callback();
//            });
//        }
//
//        startRendering(callback) {
//            // console.log("Started audio rendering");
//            this.offlineCtx.startRendering().then((buffer) => {
//                // make sure it wasn't canceled
//                if (this.offlineCtx) {
//                    // console.log("Finished audio rendering");
//                    this.finishOfflineProgress();
//                    callback(buffer);
//                }
//            });
//
//            return () => { return this.getOfflineContextProgress(); };
//        }
//
//        cancelRendering() {
//            if (this.offlineCtx) {
//                console.log("Canceling audio rendering");
//                this.offlineCtx.suspend(this.offlineCtx.currentTime + 1);
//                this.offlineCtx = null;
//                this.renderingDuration = null;
//            }
//        }
//
//        finishOfflineProgress() {
//            this.offlineCtx = null;
//            this.offlineCtxFinished = true;
//        }
//
//        resetOfflineProgress() {
//            this.offlineCtx = null;
//            this.offlineCtxFinished = false;
//        }
//
//        getOfflineContextProgress() {
//            if (this.offlineCtx) {
//                return (this.offlineCtx.currentTime * this.offlineCtx.sampleRate) / this.offlineCtx.length;
//
//            } else if (this.offlineCtxFinished) { return 1; }
//
//            else { return 0; }
//        }
//
//        renderSongList(bufferList, spacing, callback) {
//            // assume 44100 sample rate
//            var sampleRate = 44100;
//            // calculate the total samples to the end of the last buffer
//            // assume no earlier buffer lasts past the end of the last buffer
//            var totalSamples = (((bufferList.length - 1) * spacing) * sampleRate) + bufferList[bufferList.length - 1].length
//
//            this.resetOfflineProgress();
//
//            setTimeout(() => {
//                var context = new OfflineAudioContext(2, totalSamples, sampleRate);
//
//                // to allow canceling
//                this.offlineCtx = context;
//
//                // don't bother with a progress bar for this
//                for (var i = 0; i < bufferList.length; i++) {
//                    var source = context.createBufferSource();
//                    source.buffer = bufferList[i];
//                    source.connect(context.destination);
//                    source.start(i * spacing);
//                }
//
//                context.startRendering().then((buffer) => {
//                    // make sure it wasn't canceled
//                    if (this.offlineCtx) {
//                        console.log("Finished audio rendering");
//                        this.finishOfflineProgress();
//                        callback(buffer);
//                    }
//                });
//            }, 1);
//
//            return () => { return this.getOfflineContextProgress(); };
//        }
//    }


    // public members
    return  {
        createSoundBank: function() {
            return new SoundBank()
        },
        setTimeOffset: setTimeOffset
    };
})();


