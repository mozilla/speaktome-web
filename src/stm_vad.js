// Webrtc_Vad integration
function SpeakToMeVAD(options) {

  var config = {
    listener: function() {
      console.error('SpeakToMeVAD: No listener configured!');
    }
  };

  if (options) {
    if (options['listener'] != undefined) {
      config.listener = options.listener;
    }
  }

  var webrtc_main = Module.cwrap("main");
  webrtc_main();

  var webrtc_setmode = Module.cwrap("setmode", "number", ["number"]);
  // set_mode defines the aggressiveness degree of the voice activity detection algorithm
  // for more info see: https://github.com/mozilla/gecko/blob/central/media/webrtc/trunk/webrtc/common_audio/vad/vad_core.h#L68
  webrtc_setmode(3);

  var webrtc_process_data = Module.cwrap("process_data", "number", [
      "number",
      "number",
      "number",
      "number",
      "number",
      "number"
  ]);

  // frame length that should be passed to the vad engine. Depends on audio sample rate
  // https://github.com/mozilla/gecko/blob/central/media/webrtc/trunk/webrtc/common_audio/vad/vad_core.h#L106
  var sizeBufferVad = 480;
  //
  var buffer_vad = new Int16Array(sizeBufferVad);
  //
  var leftovers = 0;
  //
  var finishedVoice = false;
  //
  var samplesvoice = 0;
  //
  var touchedvoice = false;
  //
  var touchedsilence = false;
  //
  var dtantes = Date.now();
  //
  var dtantesmili = Date.now();
  //
  var done = false;
  // minimum of voice (in milliseconds) that should be captured to be considered voice
  var minvoice = 250;
  // max amount of silence (in milliseconds) that should be captured to be considered end-of-speech
  var maxsilence = 1500;
  // max amount of capturing time (in seconds)
  var maxtime = 6;

  function reset() {
    buffer_vad = new Int16Array(sizeBufferVad);
    leftovers = 0;
    samplesvoice = 0;
    samplessilence = 0;
    touchedvoice = false;
    touchedsilence = false;
    dtantes = Date.now();
    dtantesmili = Date.now();
    done = false;
  }

  // function that returns if the specified buffer has silence of speech
  function isSilence(buffer_pcm) {
    // Get data byte size, allocate memory on Emscripten heap, and get pointer
    var nDataBytes = buffer_pcm.length * buffer_pcm.BYTES_PER_ELEMENT;
    var dataPtr = Module._malloc(nDataBytes);
    // Copy data to Emscripten heap (directly accessed from Module.HEAPU8)
    var dataHeap = new Uint8Array(
      Module.HEAPU8.buffer,
      dataPtr,
      nDataBytes
    );
    dataHeap.set(new Uint8Array(buffer_pcm.buffer));
    // Call function and get result
    var result = webrtc_process_data(
      dataHeap.byteOffset,
      buffer_pcm.length,
      48000,
      buffer_pcm[0],
      buffer_pcm[100],
      buffer_pcm[2000]
    );
    // Free memory
    Module._free(dataHeap.byteOffset);
    return result;
  }

  function floatTo16BitPCM(output, input) {
    for (var i = 0; i < input.length; i++) {
      var s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
  }

  function onAudioProcessingEvent(e) {
    var buffer_pcm = new Int16Array(
      e.inputBuffer.getChannelData(0).length
    );
    floatTo16BitPCM(
      buffer_pcm,
      e.inputBuffer.getChannelData(0)
    );
    // algorithm used to determine if the user stopped speaking or not
    for (
      var i = 0;
      i < Math.ceil(buffer_pcm.length / sizeBufferVad) && !done;
      i++
    ) {
      var start = i * sizeBufferVad;
      var end = start + sizeBufferVad;
      if (start + sizeBufferVad > buffer_pcm.length) {
        // store to the next buffer
        buffer_vad.set(buffer_pcm.slice(start));
        leftovers = buffer_pcm.length - start;
      } else {
        if (leftovers > 0) {
          // we have this.leftovers from previous array
          end = end - this.leftovers;
          buffer_vad.set(
            buffer_pcm.slice(start, end),
            leftovers
          );
          leftovers = 0;
        } else {
          // send to the vad
          buffer_vad.set(buffer_pcm.slice(start, end));
        }
        var vad = isSilence(buffer_vad);

        // TODO: this doesn't seem necessary, we do it in reset()
        buffer_vad = new Int16Array(sizeBufferVad);

        var dtdepois = Date.now();
        if (vad === 0) {
          if (touchedvoice) {
            samplessilence += dtdepois - dtantesmili;
            if (samplessilence > maxsilence) {
              touchedsilence = true;
            }
          }
        } else {
          samplesvoice += dtdepois - dtantesmili;
          if (samplesvoice > minvoice) {
            touchedvoice = true;
          }
        }
        dtantesmili = dtdepois;
        if (touchedvoice && touchedsilence) {
          done = true;
          onComplete("finishedvoice");
        }
        // TODO: should be an else here, yah?
        else if ((dtdepois - dtantes) / 1000 > maxtime) {
          done = true;
          if (touchedvoice) {
            onComplete("timeout");
          } else {
            onComplete("novoice");
          }
        }
      }
    }
  }

  function onComplete(why) {
    try {
      config.listener(why);
    } catch(ex) {
      console.log('SpeakToMe_VAD: onCompleteCallback exception', ex);
    }

    // Auto-reset for next input
    reset();
  }

  // TODO: something not initializing right - this shouldn't be necessary
  reset();

  // Public
  return {
    reset: reset,
    onAudioProcessingEvent: onAudioProcessingEvent
  };
}

if (typeof(module) != "undefined") {
  module.exports = SpeakToMe;
}

// TODO modularize and protect the emscripten stuff
// because it seems to depend on window globals being exposed.
//
// Also, maybe just put this and webrtc_vad.js all in one file...

// Creation of the configuration object
// that will be pick by emscripten module
var Module = {
  preRun: [],
  postRun: [],
  print: (function() {
    return function(text) {
      console.log("[webrtc_vad.js print]", text);
    };
  })(),
  printErr: function(text) {
    console.error("[webrtc_vad.js error]", text);
  },
  canvas: (function() {})(),
  setStatus: function(text) {
    console.log("[webrtc_vad.js status] ", text);
  },
  totalDependencies: 0,
  monitorRunDependencies: function(left) {
    this.totalDependencies = Math.max(this.totalDependencies, left);
    Module.setStatus(
      left
      ? "Preparing... (" +
      (this.totalDependencies - left) +
      "/" +
      this.totalDependencies +
      ")"
      : "All downloads complete."
    );
  }
};

Module.setStatus("Loading webrtc_vad...");
window.onerror = function(event) {
  // TODO: do not warn on ok events like simulating an infinite loop or exitStatus
  Module.setStatus("Exception thrown, see JavaScript console");
  Module.setStatus = function(text) {
    if (text) {
      Module.printErr("[post-exception status] " + text);
    }
  };
};
Module.noInitialRun = true;
Module["onRuntimeInitialized"] = function() {
  Module.setStatus("Webrtc_vad and SpeakToMeVad loaded");
};
