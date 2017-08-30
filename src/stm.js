/*

TODO:

* fix VAD re-use
* add support for continuous listening
* break out API separate from web, for node env module

states/events

* ready
* listening
* processing
* sending
* waitingonserver
* result


*/

var STT_SERVER_URL = 'https://speaktome.services.mozilla.com';

var RECORDING_TIMEOUT = 3000;

var RECORDING_BITS_PER_SECOND = 16000;

var RECORDING_MIME_TYPE = 'audio/ogg';

(function initCompat() {
  // Older browsers might not implement mediaDevices at all, so we set an empty object first
  if (navigator.mediaDevices === undefined) {
    navigator.mediaDevices = {};
  }

  // Some browsers partially implement mediaDevices. We can't just assign an object
  // with getUserMedia as it would overwrite existing properties.
  // Here, we will just add the getUserMedia property if it's missing.
  if (navigator.mediaDevices.getUserMedia === undefined) {
    navigator.mediaDevices.getUserMedia = function(constraints) {

      // First get ahold of the legacy getUserMedia, if present
      var getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

      // Some browsers just don't implement it - return a rejected promise with an error
      // to keep a consistent interface
      if (!getUserMedia) {
        return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
      }

      // Otherwise, wrap the call to the old navigator.getUserMedia with a Promise
      return new Promise(function(resolve, reject) {
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    }
  }
})();

function SpeakToMe(options) {

  // Default config
  var config = {
    vad: true,
    timeout: RECORDING_TIMEOUT,
    continuous: false,
    serverURL: STT_SERVER_URL,
    listener: null
  };

  // Caller options
  if (options) {
    if (options.vad === false) {
      config.vad = false;
    }
    if (options.timeout) {
      // TODO: validate
      config.timeout = options.timeout;
    }
    if (options.listener) {
      config.listener = options.listener;
    }
  }

  /*

  States:

  * ready: recorder inactive
  * listening: recorder active
  * sending: sending recording
  * waitingonserver: sent recording, waiting for response
  * result: received result

  */
  var state = 'ready';

  // Lazy initialized in listen()
  var VAD = null;

  // Recording bits
  // initialized in listen, and destroyed
  // in stopListening
  var audioContext,
      sourceNode,
      analyzerNode,
      outputNode,
      scriptProcessor,
      mediaRecorder,
      mediaStream,
      vadReason;

  // Start recording
  function listen() {
    // Callers should only listen after receiving
    // the 'ready' state event, so we can ignore
    // their requests if we're not ready.
    if (state != 'ready') {
      console.warn('Listen() called when not ready');
      return;
    }

    // Lazy init VAD on first-use
    // TODO: Fix VAD re-use. Fails for some reason on successive use.
    /*
    if (config.vad && !VAD) {
      function onVADComplete(reason) {
        console.log('onVADComplete', reason);
        vadReason = reason;
        stopListening();
      }
      VAD = SpeakToMeVAD({
        listener: onVADComplete
      });
    }
    */

    // Configure constraints
    var constraints = { audio: true };

    // Start listening
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(onStream)
      .catch(function(err) {
        console.error(err);
      });
  }

  function onStream(stream) {
    mediaStream = stream;
    updateState({ state: 'listening'});

    // Build the WebAudio graph we'll be using
    audioContext = new AudioContext();
    sourceNode = audioContext.createMediaStreamSource(stream);
    analyzerNode = audioContext.createAnalyser();
    outputNode = audioContext.createMediaStreamDestination();

    // make sure we're doing mono everywhere
    sourceNode.channelCount = 1;
    analyzerNode.channelCount = 1;
    outputNode.channelCount = 1;

    // connect the nodes together
    sourceNode.connect(analyzerNode);
    analyzerNode.connect(outputNode);

    if (config.vad) {
      // Initialize VAD
      // TODO: Re-use VAD instead of initializing on each use.
      function onVADComplete(reason) {
        //console.log('onVADComplete', reason);
        vadReason = reason;
        stopListening();
      }
      VAD = SpeakToMeVAD({
        listener: onVADComplete
      });

      // Reset last VAD reason
      vadReason = '';

      var bufferSize = 2048;
      // create a javascript node
      scriptprocessor = audioContext.createScriptProcessor(
          bufferSize, 1, 1);

      // Send audio events to VAD, which will call onVADComplete
      // when either voice input ends, none is detected, or neither (timeout).
      scriptprocessor.onaudioprocess = VAD.onAudioProcessingEvent;

      // connect stream to our recorder
      sourceNode.connect(scriptprocessor);
    }

    // Set up the recorder
    var options = {
      audioBitsPerSecond: RECORDING_BITS_PER_SECOND,
      mimeType: RECORDING_MIME_TYPE
    };

    // MediaRecorder initialization
    mediaRecorder = new MediaRecorder(
      outputNode.stream,
      options
    );

    mediaRecorder.start();

    // If VAD is disabled, stop recording on a timeout
    if (!config.vad) {
      setTimeout(stopListening, config.timeout);
    }

    mediaRecorder.onstop = function(e) {
      // We stopped the recording, process the results
      updateState({ state: 'processing'});

      // No voice detected from VAD
      if (config.vad && vadReason == 'novoice' ||
        // Or nothing recorded
        !chunks[0].size) {
        updateState({ state: 'result', data: []});
        updateState({ state: 'ready'});
      }
      else {
        // Create blob from recording, for upload
        var blob = new Blob(chunks, {
          type: "audio/ogg; codecs=opus"
        });

        // Send to server
        sendRecordingToServer(blob);
      }

      // Reset recording buffer
      chunks = [];

      // Clean up
      mediaRecorder = null;
      audioContext = null;
      sourceNode = null;
      analyzerNode = null;
      outputNode = null;
      stream = null;
      scriptprocessor = null;
    };

    // Stored data from mediarecorder
    var chunks = [];

    mediaRecorder.ondataavailable = function(e) {
      chunks.push(e.data);
    };
  }

  function sendRecordingToServer(blob) {
    updateState({ state: 'sending'});

    fetch(config.serverURL, {
      method: "POST",
      body: blob
    })
    .then(function(response) {
      return response.json();
    })
    .then(function(json) {
      if (json.status === "ok") {
        updateState({ state: 'result', data: json.data});
        updateState({ state: 'ready'});
      }
      else {
        console.error('Error parsing JSON response:', error);
      }
    })
    .catch(function(error) {
      console.error('Fetch error:', error);
    });
  }

  function stopListening() {
    if (state != 'listening') {
      console.warn("stopListening(): stopping but not listening?!");
      return;
    }

    mediaStream.getAudioTracks()[0].stop();
    mediaRecorder.stop();
    sourceNode.disconnect(scriptprocessor);
    sourceNode.disconnect(analyzerNode);
    analyzerNode.disconnect(outputNode);
  }

  function updateState(msg) {
    state = msg.state;

    if (!config.listener) {
      console.warn('SpeakToMe: You need to initialize SpeakToMe with an event listener!');
      return;
    }

    try {
      config.listener(msg);
    }
    catch(ex) {
      console.error('SpeakToMe: Listener error', ex);
    }
  }

  // Public API
  return {
    listen: listen,
    stop: stopListening,
    setListener: function(l) {
      config.listener = l;
    }
  };

}

if (typeof(module) != "undefined") {
  module.exports = SpeakToMe;
}
