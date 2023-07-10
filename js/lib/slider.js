// "kinda" generic slider control object
class Slider {
    constructor(container, slider, range, getFunc, setFunc, commitFunc, snapValues = [], snapDistance = 0) {
        // slider container element
        this.container = container;
        // slider input element
        this.slider = slider;
        // max numeric value
        this.range = range;
        // function for getting the current value to display
        this.getFunc = getFunc;
        // function for receiving the updated value
        this.setFunc = setFunc;
        // function for committing the updated value when the slider is released
        this.commitFunc = commitFunc;
        // list of values to snap to
        this.snapValues = snapValues;
        // minimum distance to snap to a snap value
        this.snapDistance = snapDistance;

        // initialize the current value
        this.currentValue = this.getFunc();
        // provide a way to disable snapping
        this.snapDisabled = snapValues.length == 0;
        this.buildUi();
    }
    
    setSnapDisabled(disabled) {
        this.snapDisabled = disabled;
    }

    buildUi() {
        // escape will be ignored by the default key event handler because it's
        // in an input element
        // todo: need this?
        //addEscapeListener(slider);

        // ugh
        var thiz = this;

        var bcr = this.slider.getBoundingClientRect();
        var sliderWidth = bcr.width;
        // sigh, just have to know these I guess?
        var sliderHeight = 24;
        var sliderThumbWidth = 12;
        var snapTickHeight = 12;
        var snapTickWidth = 2;

        // add snap markers
        for (var h = 0; h < this.snapValues.length; h++) {
            // just make a div
            var snapDiv = document.createElement("div");
            snapDiv.className = "rangeSnap";
            // have to tweak the horizontal position to account for the slider's width
            snapDiv.style = `
                left: ${(sliderThumbWidth/2) + ((this.snapValues[h] * ((sliderWidth - sliderThumbWidth)/this.range))) - (snapTickWidth/2) - 0.5}px;
                top: ${(sliderHeight/2) - (snapTickHeight/2) + 1}px;
                width: ${snapTickWidth}px;
                height: ${snapTickHeight}px;
            `;
            this.container.appendChild(snapDiv);
        }

        // initialize the starting value
        this.slider.min = 0;
        this.slider.max = this.range;
        this.slider.value = this.currentValue;

        // event handler for changes to the slider
        function onChange(func) {
            // get the value
            var sliderValue = parseInt(thiz.slider.value);
            if (!thiz.snapDisabled) {
                // find the nearest snap Value
                var snapValue = null;
                // initialize distance to the max value
                var distance = thiz.range;
                // iterate over snap values
                for (var c = 0; c < thiz.snapValues.length; c++) {
                    // get the distance to the snap value
                    var d = Math.abs(sliderValue - thiz.snapValues[c]);
                    // check against the current closest
                    if (d < distance) {
                        // save as the new closest snap value
                        snapValue = thiz.snapValues[c];
                        distance = d;
                    }
                }
                // if we have a snap values the nearest sliderValue is under the snap distance then snap to that sliderValue
                if (snapValue != null && distance <= thiz.snapDistance) {
                    // change the local copy of the value
                    sliderValue = snapValue;
                    // and update the UI
                    thiz.slider.value = snapValue;
                }
            }
            if (sliderValue != thiz.currentValue) {
                // save the value
                thiz.currentValue = sliderValue;
                // call the listener
                func(sliderValue);
            }
        }
        // register the listener for both change and input values, not sure change is necessary
        this.slider.addEventListener("input", (e) => { onChange(this.setFunc); });
        this.slider.addEventListener("change", (e) => { onChange(this.setFunc); });
        // register listeners for letting go of the slider
        this.slider.addEventListener("mouseup", (e) => { this.commitFunc(this.currentValue); });
        this.slider.addEventListener("touchup", (e) => { this.commitFunc(this.currentValue); });

        // key listener on the input itself for disabling snap
        this.slider.addEventListener("keydown", (e) => {
            switch (e.code) {
                case "ShiftLeft" :
                case "ShiftRight" :
                    thiz.setSnapDisabled(true);
                    break;
            }
        });
        // letting up on shift re-enables snapping
        this.slider.addEventListener("keyup", (e) => {
            switch (e.code) {
                case "ShiftLeft" :
                case "ShiftRight" :
                    thiz.setSnapDisabled(false);
                    break;
            }
        });
        // initialize the snap disabled flag using the onclick listener, just in case someone holds down shift before
        // clicking on the slider
        this.slider.addEventListener("mousedown", (e) => { this.setSnapDisabled(e.shiftKey); });
    }
}
