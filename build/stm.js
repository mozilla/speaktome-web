(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.SpeakToMe = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){

},{}],2:[function(_dereq_,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,_dereq_('_process'))
},{"_process":3}],3:[function(_dereq_,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],4:[function(_dereq_,module,exports){
/*

TODO:

* fix VAD re-use

states/events

* ready
* listening
* processing
* sending
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

  function getmediaStream() {
    return mediaStream;
  }
  // Public API
  return {
    listen: listen,
    stop: stopListening,
    setListener: function(l) {
      config.listener = l;
    },
    getmediaStream : getmediaStream
  };

}

if (typeof(module) != "undefined") {
  module.exports = SpeakToMe;
}

},{}],5:[function(_dereq_,module,exports){
// Webrtc_Vad integration
function SpeakToMeVAD(options) {

  var config = {
    listener: function() {
      console.error('SpeakToMeVAD: No listener configured!');
    },
    maxSilence: 500
  };

  if (options) {
    if (options['listener'] != undefined) {
      config.listener = options.listener;
    }
    if (options['maxSilence'] != undefined) {
      console.log('MAXSILDNECE', options.maxSilence)
      config.maxSilence = options.maxSilence;
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
  var maxsilence = config.maxSilence;
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

},{}],6:[function(_dereq_,module,exports){
var Module;if(!Module)Module=(typeof Module!=="undefined"?Module:null)||{};var moduleOverrides={};for(var key in Module){if(Module.hasOwnProperty(key)){moduleOverrides[key]=Module[key]}}var ENVIRONMENT_IS_WEB=false;var ENVIRONMENT_IS_WORKER=false;var ENVIRONMENT_IS_NODE=false;var ENVIRONMENT_IS_SHELL=false;if(Module["ENVIRONMENT"]){if(Module["ENVIRONMENT"]==="WEB"){ENVIRONMENT_IS_WEB=true}else if(Module["ENVIRONMENT"]==="WORKER"){ENVIRONMENT_IS_WORKER=true}else if(Module["ENVIRONMENT"]==="NODE"){ENVIRONMENT_IS_NODE=true}else if(Module["ENVIRONMENT"]==="SHELL"){ENVIRONMENT_IS_SHELL=true}else{throw new Error("The provided Module['ENVIRONMENT'] value is not valid. It must be one of: WEB|WORKER|NODE|SHELL.")}}else{ENVIRONMENT_IS_WEB=typeof window==="object";ENVIRONMENT_IS_WORKER=typeof importScripts==="function";ENVIRONMENT_IS_NODE=typeof process==="object"&&typeof _dereq_==="function"&&!ENVIRONMENT_IS_WEB&&!ENVIRONMENT_IS_WORKER;ENVIRONMENT_IS_SHELL=!ENVIRONMENT_IS_WEB&&!ENVIRONMENT_IS_NODE&&!ENVIRONMENT_IS_WORKER}if(ENVIRONMENT_IS_NODE){if(!Module["print"])Module["print"]=console.log;if(!Module["printErr"])Module["printErr"]=console.warn;var nodeFS;var nodePath;Module["read"]=function read(filename,binary){if(!nodeFS)nodeFS=_dereq_("fs");if(!nodePath)nodePath=_dereq_("path");filename=nodePath["normalize"](filename);var ret=nodeFS["readFileSync"](filename);return binary?ret:ret.toString()};Module["readBinary"]=function readBinary(filename){var ret=Module["read"](filename,true);if(!ret.buffer){ret=new Uint8Array(ret)}assert(ret.buffer);return ret};Module["load"]=function load(f){globalEval(read(f))};if(!Module["thisProgram"]){if(process["argv"].length>1){Module["thisProgram"]=process["argv"][1].replace(/\\/g,"/")}else{Module["thisProgram"]="unknown-program"}}Module["arguments"]=process["argv"].slice(2);if(typeof module!=="undefined"){module["exports"]=Module}process["on"]("uncaughtException",(function(ex){if(!(ex instanceof ExitStatus)){throw ex}}));Module["inspect"]=(function(){return"[Emscripten Module object]"})}else if(ENVIRONMENT_IS_SHELL){if(!Module["print"])Module["print"]=print;if(typeof printErr!="undefined")Module["printErr"]=printErr;if(typeof read!="undefined"){Module["read"]=read}else{Module["read"]=function read(){throw"no read() available"}}Module["readBinary"]=function readBinary(f){if(typeof readbuffer==="function"){return new Uint8Array(readbuffer(f))}var data=read(f,"binary");assert(typeof data==="object");return data};if(typeof scriptArgs!="undefined"){Module["arguments"]=scriptArgs}else if(typeof arguments!="undefined"){Module["arguments"]=arguments}if(typeof quit==="function"){Module["quit"]=(function(status,toThrow){quit(status)})}}else if(ENVIRONMENT_IS_WEB||ENVIRONMENT_IS_WORKER){Module["read"]=function read(url){var xhr=new XMLHttpRequest;xhr.open("GET",url,false);xhr.send(null);return xhr.responseText};if(ENVIRONMENT_IS_WORKER){Module["readBinary"]=function read(url){var xhr=new XMLHttpRequest;xhr.open("GET",url,false);xhr.responseType="arraybuffer";xhr.send(null);return xhr.response}}Module["readAsync"]=function readAsync(url,onload,onerror){var xhr=new XMLHttpRequest;xhr.open("GET",url,true);xhr.responseType="arraybuffer";xhr.onload=function xhr_onload(){if(xhr.status==200||xhr.status==0&&xhr.response){onload(xhr.response)}else{onerror()}};xhr.onerror=onerror;xhr.send(null)};if(typeof arguments!="undefined"){Module["arguments"]=arguments}if(typeof console!=="undefined"){if(!Module["print"])Module["print"]=function print(x){console.log(x)};if(!Module["printErr"])Module["printErr"]=function printErr(x){console.warn(x)}}else{var TRY_USE_DUMP=false;if(!Module["print"])Module["print"]=TRY_USE_DUMP&&typeof dump!=="undefined"?(function(x){dump(x)}):(function(x){})}if(ENVIRONMENT_IS_WORKER){Module["load"]=importScripts}if(typeof Module["setWindowTitle"]==="undefined"){Module["setWindowTitle"]=(function(title){document.title=title})}}else{throw"Unknown runtime environment. Where are we?"}function globalEval(x){eval.call(null,x)}if(!Module["load"]&&Module["read"]){Module["load"]=function load(f){globalEval(Module["read"](f))}}if(!Module["print"]){Module["print"]=(function(){})}if(!Module["printErr"]){Module["printErr"]=Module["print"]}if(!Module["arguments"]){Module["arguments"]=[]}if(!Module["thisProgram"]){Module["thisProgram"]="./this.program"}if(!Module["quit"]){Module["quit"]=(function(status,toThrow){throw toThrow})}Module.print=Module["print"];Module.printErr=Module["printErr"];Module["preRun"]=[];Module["postRun"]=[];for(var key in moduleOverrides){if(moduleOverrides.hasOwnProperty(key)){Module[key]=moduleOverrides[key]}}moduleOverrides=undefined;var Runtime={setTempRet0:(function(value){tempRet0=value;return value}),getTempRet0:(function(){return tempRet0}),stackSave:(function(){return STACKTOP}),stackRestore:(function(stackTop){STACKTOP=stackTop}),getNativeTypeSize:(function(type){switch(type){case"i1":case"i8":return 1;case"i16":return 2;case"i32":return 4;case"i64":return 8;case"float":return 4;case"double":return 8;default:{if(type[type.length-1]==="*"){return Runtime.QUANTUM_SIZE}else if(type[0]==="i"){var bits=parseInt(type.substr(1));assert(bits%8===0);return bits/8}else{return 0}}}}),getNativeFieldSize:(function(type){return Math.max(Runtime.getNativeTypeSize(type),Runtime.QUANTUM_SIZE)}),STACK_ALIGN:16,prepVararg:(function(ptr,type){if(type==="double"||type==="i64"){if(ptr&7){assert((ptr&7)===4);ptr+=4}}else{assert((ptr&3)===0)}return ptr}),getAlignSize:(function(type,size,vararg){if(!vararg&&(type=="i64"||type=="double"))return 8;if(!type)return Math.min(size,8);return Math.min(size||(type?Runtime.getNativeFieldSize(type):0),Runtime.QUANTUM_SIZE)}),dynCall:(function(sig,ptr,args){if(args&&args.length){return Module["dynCall_"+sig].apply(null,[ptr].concat(args))}else{return Module["dynCall_"+sig].call(null,ptr)}}),functionPointers:[],addFunction:(function(func){for(var i=0;i<Runtime.functionPointers.length;i++){if(!Runtime.functionPointers[i]){Runtime.functionPointers[i]=func;return 2*(1+i)}}throw"Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS."}),removeFunction:(function(index){Runtime.functionPointers[(index-2)/2]=null}),warnOnce:(function(text){if(!Runtime.warnOnce.shown)Runtime.warnOnce.shown={};if(!Runtime.warnOnce.shown[text]){Runtime.warnOnce.shown[text]=1;Module.printErr(text)}}),funcWrappers:{},getFuncWrapper:(function(func,sig){assert(sig);if(!Runtime.funcWrappers[sig]){Runtime.funcWrappers[sig]={}}var sigCache=Runtime.funcWrappers[sig];if(!sigCache[func]){if(sig.length===1){sigCache[func]=function dynCall_wrapper(){return Runtime.dynCall(sig,func)}}else if(sig.length===2){sigCache[func]=function dynCall_wrapper(arg){return Runtime.dynCall(sig,func,[arg])}}else{sigCache[func]=function dynCall_wrapper(){return Runtime.dynCall(sig,func,Array.prototype.slice.call(arguments))}}}return sigCache[func]}),getCompilerSetting:(function(name){throw"You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work"}),stackAlloc:(function(size){var ret=STACKTOP;STACKTOP=STACKTOP+size|0;STACKTOP=STACKTOP+15&-16;return ret}),staticAlloc:(function(size){var ret=STATICTOP;STATICTOP=STATICTOP+size|0;STATICTOP=STATICTOP+15&-16;return ret}),dynamicAlloc:(function(size){var ret=HEAP32[DYNAMICTOP_PTR>>2];var end=(ret+size+15|0)&-16;HEAP32[DYNAMICTOP_PTR>>2]=end;if(end>=TOTAL_MEMORY){var success=enlargeMemory();if(!success){HEAP32[DYNAMICTOP_PTR>>2]=ret;return 0}}return ret}),alignMemory:(function(size,quantum){var ret=size=Math.ceil(size/(quantum?quantum:16))*(quantum?quantum:16);return ret}),makeBigInt:(function(low,high,unsigned){var ret=unsigned?+(low>>>0)+ +(high>>>0)*+4294967296:+(low>>>0)+ +(high|0)*+4294967296;return ret}),GLOBAL_BASE:8,QUANTUM_SIZE:4,__dummy__:0};Module["Runtime"]=Runtime;var ABORT=0;var EXITSTATUS=0;function assert(condition,text){if(!condition){abort("Assertion failed: "+text)}}function getCFunc(ident){var func=Module["_"+ident];if(!func){try{func=eval("_"+ident)}catch(e){}}assert(func,"Cannot call unknown function "+ident+" (perhaps LLVM optimizations or closure removed it?)");return func}var cwrap,ccall;((function(){var JSfuncs={"stackSave":(function(){Runtime.stackSave()}),"stackRestore":(function(){Runtime.stackRestore()}),"arrayToC":(function(arr){var ret=Runtime.stackAlloc(arr.length);writeArrayToMemory(arr,ret);return ret}),"stringToC":(function(str){var ret=0;if(str!==null&&str!==undefined&&str!==0){var len=(str.length<<2)+1;ret=Runtime.stackAlloc(len);stringToUTF8(str,ret,len)}return ret})};var toC={"string":JSfuncs["stringToC"],"array":JSfuncs["arrayToC"]};ccall=function ccallFunc(ident,returnType,argTypes,args,opts){var func=getCFunc(ident);var cArgs=[];var stack=0;if(args){for(var i=0;i<args.length;i++){var converter=toC[argTypes[i]];if(converter){if(stack===0)stack=Runtime.stackSave();cArgs[i]=converter(args[i])}else{cArgs[i]=args[i]}}}var ret=func.apply(null,cArgs);if(returnType==="string")ret=Pointer_stringify(ret);if(stack!==0){if(opts&&opts.async){EmterpreterAsync.asyncFinalizers.push((function(){Runtime.stackRestore(stack)}));return}Runtime.stackRestore(stack)}return ret};var sourceRegex=/^function\s*[a-zA-Z$_0-9]*\s*\(([^)]*)\)\s*{\s*([^*]*?)[\s;]*(?:return\s*(.*?)[;\s]*)?}$/;function parseJSFunc(jsfunc){var parsed=jsfunc.toString().match(sourceRegex).slice(1);return{arguments:parsed[0],body:parsed[1],returnValue:parsed[2]}}var JSsource=null;function ensureJSsource(){if(!JSsource){JSsource={};for(var fun in JSfuncs){if(JSfuncs.hasOwnProperty(fun)){JSsource[fun]=parseJSFunc(JSfuncs[fun])}}}}cwrap=function cwrap(ident,returnType,argTypes){argTypes=argTypes||[];var cfunc=getCFunc(ident);var numericArgs=argTypes.every((function(type){return type==="number"}));var numericRet=returnType!=="string";if(numericRet&&numericArgs){return cfunc}var argNames=argTypes.map((function(x,i){return"$"+i}));var funcstr="(function("+argNames.join(",")+") {";var nargs=argTypes.length;if(!numericArgs){ensureJSsource();funcstr+="var stack = "+JSsource["stackSave"].body+";";for(var i=0;i<nargs;i++){var arg=argNames[i],type=argTypes[i];if(type==="number")continue;var convertCode=JSsource[type+"ToC"];funcstr+="var "+convertCode.arguments+" = "+arg+";";funcstr+=convertCode.body+";";funcstr+=arg+"=("+convertCode.returnValue+");"}}var cfuncname=parseJSFunc((function(){return cfunc})).returnValue;funcstr+="var ret = "+cfuncname+"("+argNames.join(",")+");";if(!numericRet){var strgfy=parseJSFunc((function(){return Pointer_stringify})).returnValue;funcstr+="ret = "+strgfy+"(ret);"}if(!numericArgs){ensureJSsource();funcstr+=JSsource["stackRestore"].body.replace("()","(stack)")+";"}funcstr+="return ret})";return eval(funcstr)}}))();Module["ccall"]=ccall;Module["cwrap"]=cwrap;function setValue(ptr,value,type,noSafe){type=type||"i8";if(type.charAt(type.length-1)==="*")type="i32";switch(type){case"i1":HEAP8[ptr>>0]=value;break;case"i8":HEAP8[ptr>>0]=value;break;case"i16":HEAP16[ptr>>1]=value;break;case"i32":HEAP32[ptr>>2]=value;break;case"i64":tempI64=[value>>>0,(tempDouble=value,+Math_abs(tempDouble)>=+1?tempDouble>+0?(Math_min(+Math_floor(tempDouble/+4294967296),+4294967295)|0)>>>0:~~+Math_ceil((tempDouble- +(~~tempDouble>>>0))/+4294967296)>>>0:0)],HEAP32[ptr>>2]=tempI64[0],HEAP32[ptr+4>>2]=tempI64[1];break;case"float":HEAPF32[ptr>>2]=value;break;case"double":HEAPF64[ptr>>3]=value;break;default:abort("invalid type for setValue: "+type)}}Module["setValue"]=setValue;function getValue(ptr,type,noSafe){type=type||"i8";if(type.charAt(type.length-1)==="*")type="i32";switch(type){case"i1":return HEAP8[ptr>>0];case"i8":return HEAP8[ptr>>0];case"i16":return HEAP16[ptr>>1];case"i32":return HEAP32[ptr>>2];case"i64":return HEAP32[ptr>>2];case"float":return HEAPF32[ptr>>2];case"double":return HEAPF64[ptr>>3];default:abort("invalid type for setValue: "+type)}return null}Module["getValue"]=getValue;var ALLOC_NORMAL=0;var ALLOC_STACK=1;var ALLOC_STATIC=2;var ALLOC_DYNAMIC=3;var ALLOC_NONE=4;Module["ALLOC_NORMAL"]=ALLOC_NORMAL;Module["ALLOC_STACK"]=ALLOC_STACK;Module["ALLOC_STATIC"]=ALLOC_STATIC;Module["ALLOC_DYNAMIC"]=ALLOC_DYNAMIC;Module["ALLOC_NONE"]=ALLOC_NONE;function allocate(slab,types,allocator,ptr){var zeroinit,size;if(typeof slab==="number"){zeroinit=true;size=slab}else{zeroinit=false;size=slab.length}var singleType=typeof types==="string"?types:null;var ret;if(allocator==ALLOC_NONE){ret=ptr}else{ret=[typeof _malloc==="function"?_malloc:Runtime.staticAlloc,Runtime.stackAlloc,Runtime.staticAlloc,Runtime.dynamicAlloc][allocator===undefined?ALLOC_STATIC:allocator](Math.max(size,singleType?1:types.length))}if(zeroinit){var ptr=ret,stop;assert((ret&3)==0);stop=ret+(size&~3);for(;ptr<stop;ptr+=4){HEAP32[ptr>>2]=0}stop=ret+size;while(ptr<stop){HEAP8[ptr++>>0]=0}return ret}if(singleType==="i8"){if(slab.subarray||slab.slice){HEAPU8.set(slab,ret)}else{HEAPU8.set(new Uint8Array(slab),ret)}return ret}var i=0,type,typeSize,previousType;while(i<size){var curr=slab[i];if(typeof curr==="function"){curr=Runtime.getFunctionIndex(curr)}type=singleType||types[i];if(type===0){i++;continue}if(type=="i64")type="i32";setValue(ret+i,curr,type);if(previousType!==type){typeSize=Runtime.getNativeTypeSize(type);previousType=type}i+=typeSize}return ret}Module["allocate"]=allocate;function getMemory(size){if(!staticSealed)return Runtime.staticAlloc(size);if(!runtimeInitialized)return Runtime.dynamicAlloc(size);return _malloc(size)}Module["getMemory"]=getMemory;function Pointer_stringify(ptr,length){if(length===0||!ptr)return"";var hasUtf=0;var t;var i=0;while(1){t=HEAPU8[ptr+i>>0];hasUtf|=t;if(t==0&&!length)break;i++;if(length&&i==length)break}if(!length)length=i;var ret="";if(hasUtf<128){var MAX_CHUNK=1024;var curr;while(length>0){curr=String.fromCharCode.apply(String,HEAPU8.subarray(ptr,ptr+Math.min(length,MAX_CHUNK)));ret=ret?ret+curr:curr;ptr+=MAX_CHUNK;length-=MAX_CHUNK}return ret}return Module["UTF8ToString"](ptr)}Module["Pointer_stringify"]=Pointer_stringify;function AsciiToString(ptr){var str="";while(1){var ch=HEAP8[ptr++>>0];if(!ch)return str;str+=String.fromCharCode(ch)}}Module["AsciiToString"]=AsciiToString;function stringToAscii(str,outPtr){return writeAsciiToMemory(str,outPtr,false)}Module["stringToAscii"]=stringToAscii;var UTF8Decoder=typeof TextDecoder!=="undefined"?new TextDecoder("utf8"):undefined;function UTF8ArrayToString(u8Array,idx){var endPtr=idx;while(u8Array[endPtr])++endPtr;if(endPtr-idx>16&&u8Array.subarray&&UTF8Decoder){return UTF8Decoder.decode(u8Array.subarray(idx,endPtr))}else{var u0,u1,u2,u3,u4,u5;var str="";while(1){u0=u8Array[idx++];if(!u0)return str;if(!(u0&128)){str+=String.fromCharCode(u0);continue}u1=u8Array[idx++]&63;if((u0&224)==192){str+=String.fromCharCode((u0&31)<<6|u1);continue}u2=u8Array[idx++]&63;if((u0&240)==224){u0=(u0&15)<<12|u1<<6|u2}else{u3=u8Array[idx++]&63;if((u0&248)==240){u0=(u0&7)<<18|u1<<12|u2<<6|u3}else{u4=u8Array[idx++]&63;if((u0&252)==248){u0=(u0&3)<<24|u1<<18|u2<<12|u3<<6|u4}else{u5=u8Array[idx++]&63;u0=(u0&1)<<30|u1<<24|u2<<18|u3<<12|u4<<6|u5}}}if(u0<65536){str+=String.fromCharCode(u0)}else{var ch=u0-65536;str+=String.fromCharCode(55296|ch>>10,56320|ch&1023)}}}}Module["UTF8ArrayToString"]=UTF8ArrayToString;function UTF8ToString(ptr){return UTF8ArrayToString(HEAPU8,ptr)}Module["UTF8ToString"]=UTF8ToString;function stringToUTF8Array(str,outU8Array,outIdx,maxBytesToWrite){if(!(maxBytesToWrite>0))return 0;var startIdx=outIdx;var endIdx=outIdx+maxBytesToWrite-1;for(var i=0;i<str.length;++i){var u=str.charCodeAt(i);if(u>=55296&&u<=57343)u=65536+((u&1023)<<10)|str.charCodeAt(++i)&1023;if(u<=127){if(outIdx>=endIdx)break;outU8Array[outIdx++]=u}else if(u<=2047){if(outIdx+1>=endIdx)break;outU8Array[outIdx++]=192|u>>6;outU8Array[outIdx++]=128|u&63}else if(u<=65535){if(outIdx+2>=endIdx)break;outU8Array[outIdx++]=224|u>>12;outU8Array[outIdx++]=128|u>>6&63;outU8Array[outIdx++]=128|u&63}else if(u<=2097151){if(outIdx+3>=endIdx)break;outU8Array[outIdx++]=240|u>>18;outU8Array[outIdx++]=128|u>>12&63;outU8Array[outIdx++]=128|u>>6&63;outU8Array[outIdx++]=128|u&63}else if(u<=67108863){if(outIdx+4>=endIdx)break;outU8Array[outIdx++]=248|u>>24;outU8Array[outIdx++]=128|u>>18&63;outU8Array[outIdx++]=128|u>>12&63;outU8Array[outIdx++]=128|u>>6&63;outU8Array[outIdx++]=128|u&63}else{if(outIdx+5>=endIdx)break;outU8Array[outIdx++]=252|u>>30;outU8Array[outIdx++]=128|u>>24&63;outU8Array[outIdx++]=128|u>>18&63;outU8Array[outIdx++]=128|u>>12&63;outU8Array[outIdx++]=128|u>>6&63;outU8Array[outIdx++]=128|u&63}}outU8Array[outIdx]=0;return outIdx-startIdx}Module["stringToUTF8Array"]=stringToUTF8Array;function stringToUTF8(str,outPtr,maxBytesToWrite){return stringToUTF8Array(str,HEAPU8,outPtr,maxBytesToWrite)}Module["stringToUTF8"]=stringToUTF8;function lengthBytesUTF8(str){var len=0;for(var i=0;i<str.length;++i){var u=str.charCodeAt(i);if(u>=55296&&u<=57343)u=65536+((u&1023)<<10)|str.charCodeAt(++i)&1023;if(u<=127){++len}else if(u<=2047){len+=2}else if(u<=65535){len+=3}else if(u<=2097151){len+=4}else if(u<=67108863){len+=5}else{len+=6}}return len}Module["lengthBytesUTF8"]=lengthBytesUTF8;var UTF16Decoder=typeof TextDecoder!=="undefined"?new TextDecoder("utf-16le"):undefined;function demangle(func){var __cxa_demangle_func=Module["___cxa_demangle"]||Module["__cxa_demangle"];if(__cxa_demangle_func){try{var s=func.substr(1);var len=lengthBytesUTF8(s)+1;var buf=_malloc(len);stringToUTF8(s,buf,len);var status=_malloc(4);var ret=__cxa_demangle_func(buf,0,0,status);if(getValue(status,"i32")===0&&ret){return Pointer_stringify(ret)}}catch(e){}finally{if(buf)_free(buf);if(status)_free(status);if(ret)_free(ret)}return func}Runtime.warnOnce("warning: build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling");return func}function demangleAll(text){var regex=/__Z[\w\d_]+/g;return text.replace(regex,(function(x){var y=demangle(x);return x===y?x:x+" ["+y+"]"}))}function jsStackTrace(){var err=new Error;if(!err.stack){try{throw new Error(0)}catch(e){err=e}if(!err.stack){return"(no stack trace available)"}}return err.stack.toString()}function stackTrace(){var js=jsStackTrace();if(Module["extraStackTrace"])js+="\n"+Module["extraStackTrace"]();return demangleAll(js)}Module["stackTrace"]=stackTrace;var HEAP;var buffer;var HEAP8,HEAPU8,HEAP16,HEAPU16,HEAP32,HEAPU32,HEAPF32,HEAPF64;function updateGlobalBufferViews(){Module["HEAP8"]=HEAP8=new Int8Array(buffer);Module["HEAP16"]=HEAP16=new Int16Array(buffer);Module["HEAP32"]=HEAP32=new Int32Array(buffer);Module["HEAPU8"]=HEAPU8=new Uint8Array(buffer);Module["HEAPU16"]=HEAPU16=new Uint16Array(buffer);Module["HEAPU32"]=HEAPU32=new Uint32Array(buffer);Module["HEAPF32"]=HEAPF32=new Float32Array(buffer);Module["HEAPF64"]=HEAPF64=new Float64Array(buffer)}var STATIC_BASE,STATICTOP,staticSealed;var STACK_BASE,STACKTOP,STACK_MAX;var DYNAMIC_BASE,DYNAMICTOP_PTR;STATIC_BASE=STATICTOP=STACK_BASE=STACKTOP=STACK_MAX=DYNAMIC_BASE=DYNAMICTOP_PTR=0;staticSealed=false;function abortOnCannotGrowMemory(){abort("Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value "+TOTAL_MEMORY+", (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which adjusts the size at runtime but prevents some optimizations, (3) set Module.TOTAL_MEMORY to a higher value before the program runs, or if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ")}function enlargeMemory(){abortOnCannotGrowMemory()}var TOTAL_STACK=Module["TOTAL_STACK"]||5242880;var TOTAL_MEMORY=Module["TOTAL_MEMORY"]||16777216;if(TOTAL_MEMORY<TOTAL_STACK)Module.printErr("TOTAL_MEMORY should be larger than TOTAL_STACK, was "+TOTAL_MEMORY+"! (TOTAL_STACK="+TOTAL_STACK+")");if(Module["buffer"]){buffer=Module["buffer"]}else{{buffer=new ArrayBuffer(TOTAL_MEMORY)}}updateGlobalBufferViews();function getTotalMemory(){return TOTAL_MEMORY}HEAP32[0]=1668509029;HEAP16[1]=25459;if(HEAPU8[2]!==115||HEAPU8[3]!==99)throw"Runtime error: expected the system to be little-endian!";Module["HEAP"]=HEAP;Module["buffer"]=buffer;Module["HEAP8"]=HEAP8;Module["HEAP16"]=HEAP16;Module["HEAP32"]=HEAP32;Module["HEAPU8"]=HEAPU8;Module["HEAPU16"]=HEAPU16;Module["HEAPU32"]=HEAPU32;Module["HEAPF32"]=HEAPF32;Module["HEAPF64"]=HEAPF64;function callRuntimeCallbacks(callbacks){while(callbacks.length>0){var callback=callbacks.shift();if(typeof callback=="function"){callback();continue}var func=callback.func;if(typeof func==="number"){if(callback.arg===undefined){Module["dynCall_v"](func)}else{Module["dynCall_vi"](func,callback.arg)}}else{func(callback.arg===undefined?null:callback.arg)}}}var __ATPRERUN__=[];var __ATINIT__=[];var __ATMAIN__=[];var __ATEXIT__=[];var __ATPOSTRUN__=[];var runtimeInitialized=false;var runtimeExited=false;function preRun(){if(Module["preRun"]){if(typeof Module["preRun"]=="function")Module["preRun"]=[Module["preRun"]];while(Module["preRun"].length){addOnPreRun(Module["preRun"].shift())}}callRuntimeCallbacks(__ATPRERUN__)}function ensureInitRuntime(){if(runtimeInitialized)return;runtimeInitialized=true;callRuntimeCallbacks(__ATINIT__)}function preMain(){callRuntimeCallbacks(__ATMAIN__)}function exitRuntime(){callRuntimeCallbacks(__ATEXIT__);runtimeExited=true}function postRun(){if(Module["postRun"]){if(typeof Module["postRun"]=="function")Module["postRun"]=[Module["postRun"]];while(Module["postRun"].length){addOnPostRun(Module["postRun"].shift())}}callRuntimeCallbacks(__ATPOSTRUN__)}function addOnPreRun(cb){__ATPRERUN__.unshift(cb)}Module["addOnPreRun"]=addOnPreRun;function addOnInit(cb){__ATINIT__.unshift(cb)}Module["addOnInit"]=addOnInit;function addOnPreMain(cb){__ATMAIN__.unshift(cb)}Module["addOnPreMain"]=addOnPreMain;function addOnExit(cb){__ATEXIT__.unshift(cb)}Module["addOnExit"]=addOnExit;function addOnPostRun(cb){__ATPOSTRUN__.unshift(cb)}Module["addOnPostRun"]=addOnPostRun;function intArrayFromString(stringy,dontAddNull,length){var len=length>0?length:lengthBytesUTF8(stringy)+1;var u8array=new Array(len);var numBytesWritten=stringToUTF8Array(stringy,u8array,0,u8array.length);if(dontAddNull)u8array.length=numBytesWritten;return u8array}Module["intArrayFromString"]=intArrayFromString;function intArrayToString(array){var ret=[];for(var i=0;i<array.length;i++){var chr=array[i];if(chr>255){chr&=255}ret.push(String.fromCharCode(chr))}return ret.join("")}Module["intArrayToString"]=intArrayToString;function writeStringToMemory(string,buffer,dontAddNull){Runtime.warnOnce("writeStringToMemory is deprecated and should not be called! Use stringToUTF8() instead!");var lastChar,end;if(dontAddNull){end=buffer+lengthBytesUTF8(string);lastChar=HEAP8[end]}stringToUTF8(string,buffer,Infinity);if(dontAddNull)HEAP8[end]=lastChar}Module["writeStringToMemory"]=writeStringToMemory;function writeArrayToMemory(array,buffer){HEAP8.set(array,buffer)}Module["writeArrayToMemory"]=writeArrayToMemory;function writeAsciiToMemory(str,buffer,dontAddNull){for(var i=0;i<str.length;++i){HEAP8[buffer++>>0]=str.charCodeAt(i)}if(!dontAddNull)HEAP8[buffer>>0]=0}Module["writeAsciiToMemory"]=writeAsciiToMemory;if(!Math["imul"]||Math["imul"](4294967295,5)!==-5)Math["imul"]=function imul(a,b){var ah=a>>>16;var al=a&65535;var bh=b>>>16;var bl=b&65535;return al*bl+(ah*bl+al*bh<<16)|0};Math.imul=Math["imul"];if(!Math["clz32"])Math["clz32"]=(function(x){x=x>>>0;for(var i=0;i<32;i++){if(x&1<<31-i)return i}return 32});Math.clz32=Math["clz32"];if(!Math["trunc"])Math["trunc"]=(function(x){return x<0?Math.ceil(x):Math.floor(x)});Math.trunc=Math["trunc"];var Math_abs=Math.abs;var Math_cos=Math.cos;var Math_sin=Math.sin;var Math_tan=Math.tan;var Math_acos=Math.acos;var Math_asin=Math.asin;var Math_atan=Math.atan;var Math_atan2=Math.atan2;var Math_exp=Math.exp;var Math_log=Math.log;var Math_sqrt=Math.sqrt;var Math_ceil=Math.ceil;var Math_floor=Math.floor;var Math_pow=Math.pow;var Math_imul=Math.imul;var Math_fround=Math.fround;var Math_round=Math.round;var Math_min=Math.min;var Math_clz32=Math.clz32;var Math_trunc=Math.trunc;var runDependencies=0;var runDependencyWatcher=null;var dependenciesFulfilled=null;function addRunDependency(id){runDependencies++;if(Module["monitorRunDependencies"]){Module["monitorRunDependencies"](runDependencies)}}Module["addRunDependency"]=addRunDependency;function removeRunDependency(id){runDependencies--;if(Module["monitorRunDependencies"]){Module["monitorRunDependencies"](runDependencies)}if(runDependencies==0){if(runDependencyWatcher!==null){clearInterval(runDependencyWatcher);runDependencyWatcher=null}if(dependenciesFulfilled){var callback=dependenciesFulfilled;dependenciesFulfilled=null;callback()}}}Module["removeRunDependency"]=removeRunDependency;Module["preloadedImages"]={};Module["preloadedAudios"]={};var ASM_CONSTS=[];STATIC_BASE=8;STATICTOP=STATIC_BASE+5408;__ATINIT__.push();allocate([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,15,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,5,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,2,0,0,0,28,17,0,0,0,4,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,255,255,255,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,82,26,28,19,153,27,59,26,115,26,41,13,222,29,23,15,140,30,98,28,156,19,10,17,114,32,101,39,94,39,47,46,67,46,165,24,1,37,99,37,127,42,157,29,244,31,59,29,122,1,40,4,237,1,70,2,176,2,81,2,218,1,185,2,219,1,176,2,165,1,199,1,43,2,249,1,55,2,12,2,73,2,207,4,253,1,60,3,236,1,4,6,55,4,82,3,8,0,4,0,3,0,14,0,7,0,5,0,24,0,21,0,24,0,57,0,48,0,57,0,37,0,32,0,37,0,100,0,80,0,100,0,6,0,3,0,2,0,9,0,5,0,3,0,82,0,78,0,82,0,29,1,4,1,29,1,94,0,94,0,94,0,76,4,26,4,76,4,34,0,62,0,72,0,66,0,53,0,25,0,94,0,66,0,56,0,62,0,75,0,103,0,48,0,82,0,45,0,87,0,50,0,47,0,80,0,46,0,83,0,41,0,78,0,81,0,6,0,8,0,10,0,12,0,14,0,16,0,128,2,0,3,32,2,32,2,64,2,64,2,64,2,64,2,128,44,128,44,0,45,0,45,0,45,0,45,0,36,128,35,0,35,128,34,0,34,128,33,0,0,201,0,146,1,91,2,36,3,237,3,182,4,126,5,71,6,16,7,217,7,161,8,106,9,50,10,251,10,195,11,139,12,83,13,27,14,227,14,171,15,114,16,57,17,0,18,199,18,142,19,85,20,27,21,225,21,167,22,109,23,51,24,248,24,189,25,130,26,70,27,11,28,207,28,147,29,86,30,25,31,220,31,159,32,97,33,35,34,228,34,166,35,103,36,39,37,231,37,167,38,103,39,38,40,229,40,163,41,97,42,30,43,219,43,152,44,84,45,16,46,204,46,134,47,65,48,251,48,180,49,109,50,38,51,222,51,150,52,77,53,3,54,185,54,111,55,36,56,216,56,140,57,63,58,242,58,164,59,86,60,7,61,183,61,103,62,22,63,197,63,115,64,32,65,205,65,121,66,37,67,208,67,122,68,35,69,204,69,116,70,28,71,195,71,105,72,14,73,179,73,87,74,250,74,157,75,63,76,224,76,128,77,32,78,191,78,93,79,250,79,151,80,51,81,206,81,104,82,1,83,154,83,50,84,201,84,95,85,244,85,137,86,29,87,176,87,66,88,211,88,99,89,243,89,129,90,15,91,156,91,40,92,179,92,61,93,198,93,79,94,214,94,93,95,226,95,103,96,235,96,110,97,240,97,113,98,241,98,112,99,238,99,107,100,231,100,98,101,221,101,86,102,206,102,69,103,188,103,49,104,165,104,25,105,139,105,252,105,108,106,219,106,74,107,183,107,35,108,142,108,248,108,97,109,201,109,48,110,149,110,250,110,94,111,192,111,34,112,130,112,225,112,64,113,157,113,249,113,84,114,174,114,6,115,94,115,181,115,10,116,94,116,177,116,3,117,84,117,164,117,243,117,64,118,141,118,216,118,34,119,107,119,179,119,249,119,63,120,131,120,198,120,8,121,73,121,137,121,199,121,4,122,65,122,124,122,181,122,238,122,37,123,92,123,145,123,196,123,247,123,41,124,89,124,136,124,182,124,226,124,14,125,56,125,97,125,137,125,176,125,213,125,249,125,28,126,62,126,94,126,126,126,156,126,185,126,212,126,239,126,8,127,32,127,55,127,76,127,97,127,116,127,134,127,150,127,166,127,180,127,193,127,205,127,215,127,224,127,232,127,239,127,245,127,249,127,252,127,254,127,255,127,254,127,252,127,249,127,245,127,239,127,232,127,224,127,215,127,205,127,193,127,180,127,166,127,150,127,134,127,116,127,97,127,76,127,55,127,32,127,8,127,239,126,212,126,185,126,156,126,126,126,94,126,62,126,28,126,249,125,213,125,176,125,137,125,97,125,56,125,14,125,226,124,182,124,136,124,89,124,41,124,247,123,196,123,145,123,92,123,37,123,238,122,181,122,124,122,65,122,4,122,199,121,137,121,73,121,8,121,198,120,131,120,63,120,249,119,179,119,107,119,34,119,216,118,141,118,64,118,243,117,164,117,84,117,3,117,177,116,94,116,10,116,181,115,94,115,6,115,174,114,84,114,249,113,157,113,64,113,225,112,130,112,34,112,192,111,94,111,250,110,149,110,48,110,201,109,97,109,248,108,142,108,35,108,183,107,74,107,219,106,108,106,252,105,139,105,25,105,165,104,49,104,188,103,69,103,206,102,86,102,221,101,98,101,231,100,107,100,238,99,112,99,241,98,113,98,240,97,110,97,235,96,103,96,226,95,93,95,214,94,79,94,198,93,61,93,179,92,40,92,156,91,15,91,129,90,243,89,99,89,211,88,66,88,176,87,29,87,137,86,244,85,95,85,201,84,50,84,154,83,1,83,104,82,206,81,51,81,151,80,250,79,93,79,191,78,32,78,128,77,224,76,63,76,157,75,250,74,87,74,179,73,14,73,105,72,195,71,28,71,116,70,204,69,35,69,122,68,208,67,37,67,121,66,205,65,32,65,115,64,197,63,22,63,103,62,183,61,7,61,86,60,164,59,242,58,63,58,140,57,216,56,36,56,111,55,185,54,3,54,77,53,150,52,222,51,38,51,109,50,180,49,251,48,65,48,134,47,204,46,16,46,84,45,152,44,219,43,30,43,97,42,163,41,229,40,38,40,103,39,167,38,231,37,39,37,103,36,166,35,228,34,35,34,97,33,159,32,220,31,25,31,86,30,147,29,207,28,11,28,70,27,130,26,189,25,248,24,51,24,109,23,167,22,225,21,27,21,85,20,142,19,199,18,0,18,57,17,114,16,171,15,227,14,27,14,83,13,139,12,195,11,251,10,50,10,106,9,161,8,217,7,16,7,71,6,126,5,182,4,237,3,36,3,91,2,146,1,201,0,0,0,55,255,110,254,165,253,220,252,19,252,74,251,130,250,185,249,240,248,39,248,95,247,150,246,206,245,5,245,61,244,117,243,173,242,229,241,29,241,85,240,142,239,199,238,0,238,57,237,114,236,171,235,229,234,31,234,89,233,147,232,205,231,8,231,67,230,126,229,186,228,245,227,49,227,109,226,170,225,231,224,36,224,97,223,159,222,221,221,28,221,90,220,153,219,217,218,25,218,89,217,153,216,218,215,27,215,93,214,159,213,226,212,37,212,104,211,172,210,240,209,52,209,122,208,191,207,5,207,76,206,147,205,218,204,34,204,106,203,179,202,253,201,71,201,145,200,220,199,40,199,116,198,193,197,14,197,92,196,170,195,249,194,73,194,153,193,234,192,59,192,141,191,224,190,51,190,135,189,219,188,48,188,134,187,221,186,52,186,140,185,228,184,61,184,151,183,242,182,77,182,169,181,6,181,99,180,193,179,32,179,128,178,224,177,65,177,163,176,6,176,105,175,205,174,50,174,152,173,255,172,102,172,206,171,55,171,161,170,12,170,119,169,227,168,80,168,190,167,45,167,157,166,13,166,127,165,241,164,100,164,216,163,77,163,195,162,58,162,177,161,42,161,163,160,30,160,153,159,21,159,146,158,16,158,143,157,15,157,144,156,18,156,149,155,25,155,158,154,35,154,170,153,50,153,187,152,68,152,207,151,91,151,231,150,117,150,4,150,148,149,37,149,182,148,73,148,221,147,114,147,8,147,159,146,55,146,208,145,107,145,6,145,162,144,64,144,222,143,126,143,31,143,192,142,99,142,7,142,172,141,82,141,250,140,162,140,75,140,246,139,162,139,79,139,253,138,172,138,92,138,13,138,192,137,115,137,40,137,222,136,149,136,77,136,7,136,193,135,125,135,58,135,248,134,183,134,119,134,57,134,252,133,191,133,132,133,75,133,18,133,219,132,164,132,111,132,60,132,9,132,215,131,167,131,120,131,74,131,30,131,242,130,200,130,159,130,119,130,80,130,43,130,7,130,228,129,194,129,162,129,130,129,100,129,71,129,44,129,17,129,248,128,224,128,201,128,180,128,159,128,140,128,122,128,106,128,90,128,76,128,63,128,51,128,41,128,32,128,24,128,17,128,11,128,7,128,4,128,2,128,1,128,2,128,4,128,7,128,11,128,17,128,24,128,32,128,41,128,51,128,63,128,76,128,90,128,106,128,122,128,140,128,159,128,180,128,201,128,224,128,248,128,17,129,44,129,71,129,100,129,130,129,162,129,194,129,228,129,7,130,43,130,80,130,119,130,159,130,200,130,242,130,30,131,74,131,120,131,167,131,215,131,9,132,60,132,111,132,164,132,219,132,18,133,75,133,132,133,191,133,252,133,57,134,119,134,183,134,248,134,58,135,125,135,193,135,7,136,77,136,149,136,222,136,40,137,115,137,192,137,13,138,92,138,172,138,253,138,79,139,162,139,246,139,75,140,162,140,250,140,82,141,172,141,7,142,99,142,192,142,31,143,126,143,222,143,64,144,162,144,6,145,107,145,208,145,55,146,159,146,8,147,114,147,221,147,73,148,182,148,37,149,148,149,4,150,117,150,231,150,91,151,207,151,68,152,187,152,50,153,170,153,35,154,158,154,25,155,149,155,18,156,144,156,15,157,143,157,16,158,146,158,21,159,153,159,30,160,163,160,42,161,177,161,58,162,195,162,77,163,216,163,100,164,241,164,127,165,13,166,157,166,45,167,190,167,80,168,227,168,119,169,12,170,161,170,55,171,206,171,102,172,255,172,152,173,50,174,205,174,105,175,6,176,163,176,65,177,224,177,128,178,32,179,193,179,99,180,6,181,169,181,77,182,242,182,151,183,61,184,228,184,140,185,52,186,221,186,134,187,48,188,219,188,135,189,51,190,224,190,141,191,59,192,234,192,153,193,73,194,249,194,170,195,92,196,14,197,193,197,116,198,40,199,220,199,145,200,71,201,253,201,179,202,106,203,34,204,218,204,147,205,76,206,5,207,191,207,122,208,52,209,240,209,172,210,104,211,37,212,226,212,159,213,93,214,27,215,218,215,153,216,89,217,25,218,217,218,153,219,90,220,28,221,221,221,159,222,97,223,36,224,231,224,170,225,109,226,49,227,245,227,186,228,126,229,67,230,8,231,205,231,147,232,89,233,31,234,229,234,171,235,114,236,57,237,0,238,199,238,142,239,85,240,29,241,229,241,173,242,117,243,61,244,5,245,206,245,150,246,95,247,39,248,240,248,185,249,130,250,74,251,19,252,220,252,165,253,110,254,55,255,1,0,128,0,2,0,64,0,3,0,192,0,4,0,32,0,5,0,160,0,6,0,96,0,7,0,224,0,8,0,16,0,9,0,144,0,10,0,80,0,11,0,208,0,12,0,48,0,13,0,176,0,14,0,112,0,15,0,240,0,17,0,136,0,18,0,72,0,19,0,200,0,20,0,40,0,21,0,168,0,22,0,104,0,23,0,232,0,25,0,152,0,26,0,88,0,27,0,216,0,28,0,56,0,29,0,184,0,30,0,120,0,31,0,248,0,33,0,132,0,34,0,68,0,35,0,196,0,37,0,164,0,38,0,100,0,39,0,228,0,41,0,148,0,42,0,84,0,43,0,212,0,44,0,52,0,45,0,180,0,46,0,116,0,47,0,244,0,49,0,140,0,50,0,76,0,51,0,204,0,53,0,172,0,54,0,108,0,55,0,236,0,57,0,156,0,58,0,92,0,59,0,220,0,61,0,188,0,62,0,124,0,63,0,252,0,65,0,130,0,67,0,194,0,69,0,162,0,70,0,98,0,71,0,226,0,73,0,146,0,74,0,82,0,75,0,210,0,77,0,178,0,78,0,114,0,79,0,242,0,81,0,138,0,83,0,202,0,85,0,170,0,86,0,106,0,87,0,234,0,89,0,154,0,91,0,218,0,93,0,186,0,94,0,122,0,95,0,250,0,97,0,134,0,99,0,198,0,101,0,166,0,103,0,230,0,105,0,150,0,107,0,214,0,109,0,182,0,110,0,118,0,111,0,246,0,113,0,142,0,115,0,206,0,117,0,174,0,119,0,238,0,121,0,158,0,123,0,222,0,125,0,190,0,127,0,254,0,131,0,193,0,133,0,161,0,135,0,225,0,137,0,145,0,139,0,209,0,141,0,177,0,143,0,241,0,147,0,201,0,149,0,169,0,151,0,233,0,155,0,217,0,157,0,185,0,159,0,249,0,163,0,197,0,167,0,229,0,171,0,213,0,173,0,181,0,175,0,245,0,179,0,205,0,183,0,237,0,187,0,221,0,191,0,253,0,199,0,227,0,203,0,211,0,207,0,243,0,215,0,235,0,223,0,251,0,239,0,247,0,1,0,64,0,2,0,32,0,3,0,96,0,4,0,16,0,5,0,80,0,6,0,48,0,7,0,112,0,9,0,72,0,10,0,40,0,11,0,104,0,12,0,24,0,13,0,88,0,14,0,56,0,15,0,120,0,17,0,68,0,18,0,36,0,19,0,100,0,21,0,84,0,22,0,52,0,23,0,116,0,25,0,76,0,26,0,44,0,27,0,108,0,29,0,92,0,30,0,60,0,31,0,124,0,33,0,66,0,35,0,98,0,37,0,82,0,38,0,50,0,39,0,114,0,41,0,74,0,43,0,106,0,45,0,90,0,46,0,58,0,47,0,122,0,49,0,70,0,51,0,102,0,53,0,86,0,55,0,118,0,57,0,78,0,59,0,110,0,61,0,94,0,63,0,126,0,67,0,97,0,69,0,81,0,71,0,113,0,75,0,105,0,77,0,89,0,79,0,121,0,83,0,101,0,87,0,117,0,91,0,109,0,95,0,125,0,103,0,115,0,111,0,123,0,100,97,116,97,91,48,93,32,61,61,32,118,97,108,48,0,109,97,105,110,46,99,0,112,114,111,99,101,115,115,95,100,97,116,97,0,100,97,116,97,91,49,48,48,93,32,61,61,32,118,97,108,49,48,48,0,100,97,116,97,91,50,48,48,48,93,32,61,61,32,118,97,108,50,48,48,48,0,112,114,111,99,101,115,115,95,100,97,116,97,58,32,100,97,116,97,32,61,61,32,78,85,76,76,32,0,100,97,116,97,95,108,101,110,103,116,104,32,62,61,32,48,0,119,101,98,114,116,99,47,99,111,109,109,111,110,95,97,117,100,105,111,47,118,97,100,47,118,97,100,95,102,105,108,116,101,114,98,97,110,107,46,99,0,87,101,98,82,116,99,86,97,100,95,67,97,108,99,117,108,97,116,101,70,101,97,116,117,114,101,115,0,100,97,116,97,95,108,101,110,103,116,104,32,60,61,32,50,52,48,0,100,97,116,97,95,105,110,32,33,61,32,78,85,76,76,0,76,111,103,79,102,69,110,101,114,103,121,0,100,97,116,97,95,108,101,110,103,116,104,32,62,32,48,0,99,104,97,110,110,101,108,32,60,32,107,78,117,109,67,104,97,110,110,101,108,115,0,119,101,98,114,116,99,47,99,111,109,109,111,110,95,97,117,100,105,111,47,118,97,100,47,118,97,100,95,115,112,46,99,0,87,101,98,82,116,99,86,97,100,95,70,105,110,100,77,105,110,105,109,117,109,0],"i8",ALLOC_NONE,Runtime.GLOBAL_BASE);var tempDoublePtr=STATICTOP;STATICTOP+=16;function ___assert_fail(condition,filename,line,func){ABORT=true;throw"Assertion failed: "+Pointer_stringify(condition)+", at: "+[filename?Pointer_stringify(filename):"unknown filename",line,func?Pointer_stringify(func):"unknown function"]+" at "+stackTrace()}function ___setErrNo(value){if(Module["___errno_location"])HEAP32[Module["___errno_location"]()>>2]=value;return value}Module["_sbrk"]=_sbrk;Module["_memset"]=_memset;function ___lock(){}function _emscripten_memcpy_big(dest,src,num){HEAPU8.set(HEAPU8.subarray(src,src+num),dest);return dest}Module["_memcpy"]=_memcpy;function _abort(){Module["abort"]()}function _pthread_once(ptr,func){if(!_pthread_once.seen)_pthread_once.seen={};if(ptr in _pthread_once.seen)return;Module["dynCall_v"](func);_pthread_once.seen[ptr]=1}var SYSCALLS={varargs:0,get:(function(varargs){SYSCALLS.varargs+=4;var ret=HEAP32[SYSCALLS.varargs-4>>2];return ret}),getStr:(function(){var ret=Pointer_stringify(SYSCALLS.get());return ret}),get64:(function(){var low=SYSCALLS.get(),high=SYSCALLS.get();if(low>=0)assert(high===0);else assert(high===-1);return low}),getZero:(function(){assert(SYSCALLS.get()===0)})};function ___syscall140(which,varargs){SYSCALLS.varargs=varargs;try{var stream=SYSCALLS.getStreamFromFD(),offset_high=SYSCALLS.get(),offset_low=SYSCALLS.get(),result=SYSCALLS.get(),whence=SYSCALLS.get();var offset=offset_low;assert(offset_high===0);FS.llseek(stream,offset,whence);HEAP32[result>>2]=stream.position;if(stream.getdents&&offset===0&&whence===0)stream.getdents=null;return 0}catch(e){if(typeof FS==="undefined"||!(e instanceof FS.ErrnoError))abort(e);return-e.errno}}function ___syscall146(which,varargs){SYSCALLS.varargs=varargs;try{var stream=SYSCALLS.get(),iov=SYSCALLS.get(),iovcnt=SYSCALLS.get();var ret=0;if(!___syscall146.buffer){___syscall146.buffers=[null,[],[]];___syscall146.printChar=(function(stream,curr){var buffer=___syscall146.buffers[stream];assert(buffer);if(curr===0||curr===10){(stream===1?Module["print"]:Module["printErr"])(UTF8ArrayToString(buffer,0));buffer.length=0}else{buffer.push(curr)}})}for(var i=0;i<iovcnt;i++){var ptr=HEAP32[iov+i*8>>2];var len=HEAP32[iov+(i*8+4)>>2];for(var j=0;j<len;j++){___syscall146.printChar(stream,HEAPU8[ptr+j])}ret+=len}return ret}catch(e){if(typeof FS==="undefined"||!(e instanceof FS.ErrnoError))abort(e);return-e.errno}}function ___syscall54(which,varargs){SYSCALLS.varargs=varargs;try{return 0}catch(e){if(typeof FS==="undefined"||!(e instanceof FS.ErrnoError))abort(e);return-e.errno}}function ___unlock(){}function ___syscall6(which,varargs){SYSCALLS.varargs=varargs;try{var stream=SYSCALLS.getStreamFromFD();FS.close(stream);return 0}catch(e){if(typeof FS==="undefined"||!(e instanceof FS.ErrnoError))abort(e);return-e.errno}}__ATEXIT__.push((function(){var fflush=Module["_fflush"];if(fflush)fflush(0);var printChar=___syscall146.printChar;if(!printChar)return;var buffers=___syscall146.buffers;if(buffers[1].length)printChar(1,10);if(buffers[2].length)printChar(2,10)}));DYNAMICTOP_PTR=allocate(1,"i32",ALLOC_STATIC);STACK_BASE=STACKTOP=Runtime.alignMemory(STATICTOP);STACK_MAX=STACK_BASE+TOTAL_STACK;DYNAMIC_BASE=Runtime.alignMemory(STACK_MAX);HEAP32[DYNAMICTOP_PTR>>2]=DYNAMIC_BASE;staticSealed=true;function invoke_iiiiiiii(index,a1,a2,a3,a4,a5,a6,a7){try{return Module["dynCall_iiiiiiii"](index,a1,a2,a3,a4,a5,a6,a7)}catch(e){if(typeof e!=="number"&&e!=="longjmp")throw e;Module["setThrew"](1,0)}}function invoke_iiii(index,a1,a2,a3){try{return Module["dynCall_iiii"](index,a1,a2,a3)}catch(e){if(typeof e!=="number"&&e!=="longjmp")throw e;Module["setThrew"](1,0)}}function invoke_vi(index,a1){try{Module["dynCall_vi"](index,a1)}catch(e){if(typeof e!=="number"&&e!=="longjmp")throw e;Module["setThrew"](1,0)}}function invoke_ii(index,a1){try{return Module["dynCall_ii"](index,a1)}catch(e){if(typeof e!=="number"&&e!=="longjmp")throw e;Module["setThrew"](1,0)}}function invoke_viiiiiii(index,a1,a2,a3,a4,a5,a6,a7){try{Module["dynCall_viiiiiii"](index,a1,a2,a3,a4,a5,a6,a7)}catch(e){if(typeof e!=="number"&&e!=="longjmp")throw e;Module["setThrew"](1,0)}}function invoke_v(index){try{Module["dynCall_v"](index)}catch(e){if(typeof e!=="number"&&e!=="longjmp")throw e;Module["setThrew"](1,0)}}function invoke_iiiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8){try{return Module["dynCall_iiiiiiiii"](index,a1,a2,a3,a4,a5,a6,a7,a8)}catch(e){if(typeof e!=="number"&&e!=="longjmp")throw e;Module["setThrew"](1,0)}}function invoke_iii(index,a1,a2){try{return Module["dynCall_iii"](index,a1,a2)}catch(e){if(typeof e!=="number"&&e!=="longjmp")throw e;Module["setThrew"](1,0)}}Module.asmGlobalArg={"Math":Math,"Int8Array":Int8Array,"Int16Array":Int16Array,"Int32Array":Int32Array,"Uint8Array":Uint8Array,"Uint16Array":Uint16Array,"Uint32Array":Uint32Array,"Float32Array":Float32Array,"Float64Array":Float64Array,"NaN":NaN,"Infinity":Infinity};Module.asmLibraryArg={"abort":abort,"assert":assert,"enlargeMemory":enlargeMemory,"getTotalMemory":getTotalMemory,"abortOnCannotGrowMemory":abortOnCannotGrowMemory,"invoke_iiiiiiii":invoke_iiiiiiii,"invoke_iiii":invoke_iiii,"invoke_vi":invoke_vi,"invoke_ii":invoke_ii,"invoke_viiiiiii":invoke_viiiiiii,"invoke_v":invoke_v,"invoke_iiiiiiiii":invoke_iiiiiiiii,"invoke_iii":invoke_iii,"___lock":___lock,"___syscall6":___syscall6,"_pthread_once":_pthread_once,"_abort":_abort,"___syscall140":___syscall140,"___setErrNo":___setErrNo,"_emscripten_memcpy_big":_emscripten_memcpy_big,"___syscall54":___syscall54,"___unlock":___unlock,"___assert_fail":___assert_fail,"___syscall146":___syscall146,"DYNAMICTOP_PTR":DYNAMICTOP_PTR,"tempDoublePtr":tempDoublePtr,"ABORT":ABORT,"STACKTOP":STACKTOP,"STACK_MAX":STACK_MAX};// EMSCRIPTEN_START_ASM
var asm=(function(global,env,buffer) {
"use asm";var a=new global.Int8Array(buffer);var b=new global.Int16Array(buffer);var c=new global.Int32Array(buffer);var d=new global.Uint8Array(buffer);var e=new global.Uint16Array(buffer);var f=new global.Uint32Array(buffer);var g=new global.Float32Array(buffer);var h=new global.Float64Array(buffer);var i=env.DYNAMICTOP_PTR|0;var j=env.tempDoublePtr|0;var k=env.ABORT|0;var l=env.STACKTOP|0;var m=env.STACK_MAX|0;var n=0;var o=0;var p=0;var q=0;var r=global.NaN,s=global.Infinity;var t=0,u=0,v=0,w=0,x=0.0,y=0,z=0,A=0,B=0.0;var C=0;var D=global.Math.floor;var E=global.Math.abs;var F=global.Math.sqrt;var G=global.Math.pow;var H=global.Math.cos;var I=global.Math.sin;var J=global.Math.tan;var K=global.Math.acos;var L=global.Math.asin;var M=global.Math.atan;var N=global.Math.atan2;var O=global.Math.exp;var P=global.Math.log;var Q=global.Math.ceil;var R=global.Math.imul;var S=global.Math.min;var T=global.Math.max;var U=global.Math.clz32;var V=env.abort;var W=env.assert;var X=env.enlargeMemory;var Y=env.getTotalMemory;var Z=env.abortOnCannotGrowMemory;var _=env.invoke_iiiiiiii;var $=env.invoke_iiii;var aa=env.invoke_vi;var ba=env.invoke_ii;var ca=env.invoke_viiiiiii;var da=env.invoke_v;var ea=env.invoke_iiiiiiiii;var fa=env.invoke_iii;var ga=env.___lock;var ha=env.___syscall6;var ia=env._pthread_once;var ja=env._abort;var ka=env.___syscall140;var la=env.___setErrNo;var ma=env._emscripten_memcpy_big;var na=env.___syscall54;var oa=env.___unlock;var pa=env.___assert_fail;var qa=env.___syscall146;var ra=0.0;
// EMSCRIPTEN_START_FUNCS
function Aa(a){a=a|0;var b=0;b=l;l=l+a|0;l=l+15&-16;return b|0}function Ba(){return l|0}function Ca(a){a=a|0;l=a}function Da(a,b){a=a|0;b=b|0;l=a;m=b}function Ea(a,b){a=a|0;b=b|0;if(!n){n=a;o=b}}function Fa(a){a=a|0;C=a}function Ga(){return C|0}function Ha(){var a=0;if((Ka(3740)|0)==-1){a=0;return a|0}a=(La(c[935]|0)|0)!=-1&1;return a|0}function Ia(a){a=a|0;return Ma(c[935]|0,a)|0}function Ja(a,d,e,f,g,h){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;if(!a)Vb(3482)|0;if((b[a>>1]|0)!=(f|0))pa(3404,3420,30,3427);if((b[a+200>>1]|0)!=(g|0))pa(3440,3420,31,3427);if((b[a+4e3>>1]|0)==(h|0))return Na(c[935]|0,e,a,d)|0;else pa(3460,3420,32,3427);return 0}function Ka(a){a=a|0;var b=0,d=0;if(!a){b=-1;return b|0}d=Wb(736)|0;c[a>>2]=d;if(!d){b=-1;return b|0}_a();c[d+732>>2]=0;b=0;return b|0}function La(a){a=a|0;return Oa(a)|0}function Ma(a,b){a=a|0;b=b|0;var d=0;if((a|0)!=0?(c[a+732>>2]|0)==42:0)d=Pa(a,b)|0;else d=-1;return d|0}function Na(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;if(!a){f=-1;return f|0}if((d|0)==0?1:(c[a+732>>2]|0)!=42){f=-1;return f|0}a:do if((b|0)>=32e3)if((b|0)<48e3)switch(b|0){case 32e3:{g=32;break a;break}default:{f=-1;return f|0}}else switch(b|0){case 48e3:{g=48;break a;break}default:{f=-1;return f|0}}else{if((b|0)<16e3){switch(b|0){case 8e3:{g=8;break a;break}default:f=-1}return f|0}switch(b|0){case 16e3:{g=16;break a;break}default:{f=-1;return f|0}}}while(0);if(!((g*30|0)==(e|0)|((g*10|0)==(e|0)|(g*20|0)==(e|0)))){f=-1;return f|0}b:do if((b|0)<32e3)if((b|0)<16e3){switch(b|0){case 8e3:break;default:{h=-1;break b}}h=Ra(a,d,e)|0;break}else{switch(b|0){case 16e3:break;default:{h=-1;break b}}h=Ta(a,d,e)|0;break}else if((b|0)<48e3){switch(b|0){case 32e3:break;default:{h=-1;break b}}h=Sa(a,d,e)|0;break}else{switch(b|0){case 48e3:break;default:{h=-1;break b}}h=Qa(a,d,e)|0;break}while(0);f=(h|0)<1?h:1;return f|0}function Oa(a){a=a|0;var d=0,e=0,f=0;if(!a){d=-1;return d|0}c[a>>2]=1;e=a+4|0;c[e>>2]=0;c[e+4>>2]=0;c[e+8>>2]=0;c[e+12>>2]=0;e=a+276|0;c[e>>2]=0;c[e+4>>2]=0;cb(a+20|0);e=0;do{b[a+180+(e<<1)>>1]=b[384+(e<<1)>>1]|0;b[a+204+(e<<1)>>1]=b[408+(e<<1)>>1]|0;b[a+228+(e<<1)>>1]=b[432+(e<<1)>>1]|0;b[a+252+(e<<1)>>1]=b[456+(e<<1)>>1]|0;e=e+1|0}while((e|0)!=12);f=0;do{b[a+476+(f<<1)>>1]=1e4;b[a+284+(f<<1)>>1]=0;f=f+1|0}while((f|0)!=96);f=a+680|0;c[f>>2]=0;c[f+4>>2]=0;c[f+8>>2]=0;c[f+12>>2]=0;c[f+16>>2]=0;c[f+20>>2]=0;c[f+24>>2]=0;b[a+668>>1]=1600;b[a+670>>1]=1600;b[a+672>>1]=1600;b[a+674>>1]=1600;b[a+676>>1]=1600;b[a+678>>1]=1600;f=a+708|0;b[f>>1]=b[240]|0;b[f+2>>1]=b[241]|0;b[f+4>>1]=b[242]|0;f=a+714|0;b[f>>1]=b[243]|0;b[f+2>>1]=b[244]|0;b[f+4>>1]=b[245]|0;f=a+720|0;b[f>>1]=b[246]|0;b[f+2>>1]=b[247]|0;b[f+4>>1]=b[248]|0;f=a+726|0;b[f>>1]=b[249]|0;b[f+2>>1]=b[250]|0;b[f+4>>1]=b[251]|0;c[a+732>>2]=42;d=0;return d|0}function Pa(a,c){a=a|0;c=c|0;var d=0;switch(c|0){case 0:{c=a+708|0;b[c>>1]=b[240]|0;b[c+2>>1]=b[241]|0;b[c+4>>1]=b[242]|0;c=a+714|0;b[c>>1]=b[243]|0;b[c+2>>1]=b[244]|0;b[c+4>>1]=b[245]|0;c=a+720|0;b[c>>1]=b[246]|0;b[c+2>>1]=b[247]|0;b[c+4>>1]=b[248]|0;c=a+726|0;b[c>>1]=b[249]|0;b[c+2>>1]=b[250]|0;b[c+4>>1]=b[251]|0;d=0;return d|0}case 1:{c=a+708|0;b[c>>1]=b[240]|0;b[c+2>>1]=b[241]|0;b[c+4>>1]=b[242]|0;c=a+714|0;b[c>>1]=b[243]|0;b[c+2>>1]=b[244]|0;b[c+4>>1]=b[245]|0;c=a+720|0;b[c>>1]=b[252]|0;b[c+2>>1]=b[253]|0;b[c+4>>1]=b[254]|0;c=a+726|0;b[c>>1]=b[255]|0;b[c+2>>1]=b[256]|0;b[c+4>>1]=b[257]|0;d=0;return d|0}case 2:{c=a+708|0;b[c>>1]=b[258]|0;b[c+2>>1]=b[259]|0;b[c+4>>1]=b[260]|0;c=a+714|0;b[c>>1]=b[261]|0;b[c+2>>1]=b[262]|0;b[c+4>>1]=b[263]|0;c=a+720|0;b[c>>1]=b[264]|0;b[c+2>>1]=b[265]|0;b[c+4>>1]=b[266]|0;c=a+726|0;b[c>>1]=b[267]|0;b[c+2>>1]=b[268]|0;b[c+4>>1]=b[269]|0;d=0;return d|0}case 3:{c=a+708|0;b[c>>1]=b[258]|0;b[c+2>>1]=b[259]|0;b[c+4>>1]=b[260]|0;c=a+714|0;b[c>>1]=b[261]|0;b[c+2>>1]=b[262]|0;b[c+4>>1]=b[263]|0;c=a+720|0;b[c>>1]=b[270]|0;b[c+2>>1]=b[271]|0;b[c+4>>1]=b[272]|0;c=a+726|0;b[c>>1]=b[273]|0;b[c+2>>1]=b[274]|0;b[c+4>>1]=b[275]|0;d=0;return d|0}default:{d=-1;return d|0}}return 0}function Qa(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,i=0;d=l;l=l+3424|0;e=d+2944|0;f=d;_b(f|0,0,2944)|0;g=(c|0)/480|0;if((c|0)>479){h=a+20|0;i=0;do{bb(b,e+(i*80<<1)|0,h,f);i=i+1|0}while((i|0)<(g|0))}g=Ra(a,e,(c|0)/6|0)|0;l=d;return g|0}function Ra(a,d,f){a=a|0;d=d|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0;g=l;l=l+112|0;h=g+88|0;i=g+64|0;j=g+40|0;k=g+16|0;m=g;n=Ua(a,d,f,m)|0;d=j;o=d+24|0;do{b[d>>1]=0;d=d+2|0}while((d|0)<(o|0));d=k;o=d+24|0;do{b[d>>1]=0;d=d+2|0}while((d|0)<(o|0));d=(f|0)==80?0:(f|0)==160?1:2;f=b[a+726+(d<<1)>>1]|0;o=b[a+714+(d<<1)>>1]|0;p=b[a+708+(d<<1)>>1]|0;if(n<<16>>16>10){n=b[a+720+(d<<1)>>1]|0;d=0;q=0;r=0;do{s=m+(q<<1)|0;t=Xa(b[s>>1]|0,b[a+180+(q<<1)>>1]|0,b[a+228+(q<<1)>>1]|0,h+(q<<1)|0)|0;u=R(b[552+(q<<1)>>1]|0,t)|0;t=Xa(b[s>>1]|0,b[a+204+(q<<1)>>1]|0,b[a+252+(q<<1)>>1]|0,i+(q<<1)|0)|0;v=R(b[576+(q<<1)>>1]|0,t)|0;t=q+6|0;w=Xa(b[s>>1]|0,b[a+180+(t<<1)>>1]|0,b[a+228+(t<<1)>>1]|0,h+(t<<1)|0)|0;x=(R(b[552+(t<<1)>>1]|0,w)|0)+u|0;w=Xa(b[s>>1]|0,b[a+204+(t<<1)>>1]|0,b[a+252+(t<<1)>>1]|0,i+(t<<1)|0)|0;s=(R(b[576+(t<<1)>>1]|0,w)|0)+v|0;w=(x|0)==0;if(w)y=0;else{z=x>>31^x;A=z>>>0>32767?0:16;B=(-8388608>>>A&z|0)==0?A|8:A;A=(-134217728>>>B&z|0)==0?B|4:B;B=(-536870912>>>A&z|0)==0?A|2:A;y=((-1073741824>>>B&z|0)==0&1)+B|0}B=(s|0)==0;if(B)C=0;else{z=s>>31^s;A=z>>>0>32767?0:16;D=(-8388608>>>A&z|0)==0?A|8:A;A=(-134217728>>>D&z|0)==0?D|4:D;D=(-536870912>>>A&z|0)==0?A|2:A;C=((-1073741824>>>D&z|0)==0&1)+D|0}D=(w?31:y)-(B?31:C)<<16;d=(R(D>>16,b[600+(q<<1)>>1]|0)|0)+d|0;r=(D>>14|0)>(n|0)?1:r;D=x>>>12;if((D<<16|0)>0){x=ab(u<<2&-16384,D&65535)|0;b[j+(q<<1)>>1]=x;E=16384-x&65535;F=t}else{E=16384;F=q}b[j+(F<<1)>>1]=E;x=s>>>12;if((x<<16|0)>0){s=ab(v<<2&-16384,x&65535)|0;b[k+(q<<1)>>1]=s;b[k+(t<<1)>>1]=16384-s}q=q+1|0}while((q|0)!=6);q=(d|0)>=(f<<16>>16|0)|r&65535;r=q&65535;f=r<<16>>16!=0;d=12800;E=0;do{F=m+(E<<1)|0;n=Za(a,b[F>>1]|0,E)|0;C=a+180+(E<<1)|0;y=552+(E<<1)|0;s=b[y>>1]|0;t=R(s,b[C>>1]|0)|0;x=C+12|0;v=b[y+12>>1]|0;y=(((n<<16>>16<<4)-(((R(v,b[x>>1]|0)|0)+t|0)>>>6)<<16>>16)*19712|0)>>>16;t=72-E|0;n=(d&65535)+640|0;D=n&65535;u=n<<16>>16;n=0;do{B=(n*6|0)+E|0;w=a+180+(B<<1)|0;z=b[w>>1]|0;A=a+204+(B<<1)|0;G=b[A>>1]|0;H=a+228+(B<<1)|0;I=b[H>>1]|0;J=a+252+(B<<1)|0;K=b[J>>1]|0;if(f)L=z;else L=(((R(b[j+(B<<1)>>1]<<5,b[h+(B<<1)>>1]|0)|0)>>16)*655>>22)+(z&65535)&65535;M=(L&65535)+y|0;N=(n<<7)+640|0;O=(M<<16|0)<(N<<16|0)?N:M;M=n+t|0;b[w>>1]=(O<<16|0)>(M<<23|0)?M<<7:O;if(f){O=b[k+(B<<1)>>1]|0;M=b[i+(B<<1)>>1]|0;w=G<<16>>16;G=(((((R(O<<5,M)|0)>>16)*6554>>21)+1|0)>>>1)+w|0;N=b[612+(n<<1)>>1]|0;P=(G<<16>>16|0)<(N<<16>>16|0)?N:G&65535;b[A>>1]=(P<<16>>16|0)>(u|0)?D:P;P=(R(((R((e[F>>1]|0)-((w+4|0)>>>3)<<16>>16,M)|0)>>3)+-4096|0,O>>2)|0)>>4;O=K<<16>>16;K=O*10&65535;if((P|0)>0)Q=ab(P,K)|0;else Q=0-(ab(0-P|0,K)|0)|0;S=((Q<<16)+8388608>>24)+O|0;T=J}else{J=((R((e[F>>1]|0)-(z<<16>>16>>>3)<<16>>16,b[h+(B<<1)>>1]|0)|0)>>3)+-4096|0;z=(R(J,(b[j+(B<<1)>>1]|0)+2>>2)|0)>>14;if((z|0)>0)U=ab(z,I)|0;else U=0-(ab(0-z|0,I)|0)|0;S=((U<<16)+2097152>>22)+(I&65535)|0;T=H}b[T>>1]=(S<<16|0)<25165824?384:S&65535;n=n+1|0}while((n|0)!=2);n=b[C>>1]|0;F=R(n<<16>>16,s)|0;D=b[x>>1]|0;u=(R(D<<16>>16,v)|0)+F|0;F=a+204+(E<<1)|0;t=576+(E<<1)|0;y=b[F>>1]|0;H=b[t>>1]|0;I=R(H,y<<16>>16)|0;z=F+12|0;B=b[z>>1]|0;J=b[t+12>>1]|0;t=(R(J,B<<16>>16)|0)+I|0;I=(t>>>9)-(u>>>9)<<16>>16;O=b[616+(E<<1)>>1]|0;if((O|0)>(I|0)){K=O-I<<16>>16;I=(K*13|0)>>>2&65535;O=I+(y&65535)|0;P=O&65535;b[F>>1]=P;M=R(O<<16>>16,H)|0;H=I+(B&65535)|0;I=H&65535;b[z>>1]=I;z=(R(H<<16>>16,J)|0)+M|0;M=0-((K*49152|0)>>>16)&65535;K=M+(n&65535)|0;J=K&65535;b[C>>1]=J;H=R(K<<16>>16,s)|0;K=M+(D&65535)|0;M=K&65535;b[x>>1]=M;V=z;W=(R(K<<16>>16,v)|0)+H|0;X=P;Y=I;Z=J;_=M}else{V=t;W=u;X=y;Y=B;Z=n;_=D}d=b[628+(E<<1)>>1]|0;D=V<<9>>16;n=d<<16>>16;if((n|0)<(D|0)){B=n-D|0;b[F>>1]=B+(X&65535);b[a+204+(E+6<<1)>>1]=(Y&65535)+B}B=W<<9>>16;F=b[640+(E<<1)>>1]|0;if((F|0)<(B|0)){D=F-B|0;b[C>>1]=(Z&65535)+D;b[a+180+(E+6<<1)>>1]=(_&65535)+D}E=E+1|0}while((E|0)!=6);E=a+276|0;c[E>>2]=(c[E>>2]|0)+1;if(r<<16>>16){r=a+282|0;E=(b[r>>1]|0)+1<<16>>16;_=E<<16>>16>6;b[r>>1]=_?6:E;b[a+280>>1]=_?o:p;$=q;aa=$<<16;ba=aa>>16;c[a>>2]=ba;l=g;return ba|0}}q=a+280|0;p=b[q>>1]|0;if(p<<16>>16>0){b[q>>1]=p+-1<<16>>16;ca=(p&65535)+2|0}else ca=0;b[a+282>>1]=0;$=ca;aa=$<<16;ba=aa>>16;c[a>>2]=ba;l=g;return ba|0}function Sa(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0;d=l;l=l+1440|0;e=d+480|0;f=d;Ya(b,e,a+12|0,c);Ya(e,f,a+4|0,c>>1);e=Ra(a,f,c>>2)|0;l=d;return e|0}function Ta(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;d=l;l=l+480|0;e=d;Ya(b,e,a+4|0,c);b=Ra(a,e,c>>1)|0;l=d;return b|0}function Ua(a,c,d,e){a=a|0;c=c|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0;f=l;l=l+736|0;g=f+720|0;h=f+480|0;i=f+240|0;j=f+120|0;k=f;b[g>>1]=0;m=d>>1;if((d|0)<=-1)pa(3510,3527,266,3568);if((d|0)>=241)pa(3596,3527,267,3568);Va(c,d,a+680|0,a+690|0,h,i);Va(h,m,a+682|0,a+692|0,j,k);c=d>>>2;Wa(j,c,176,g,e+10|0);Wa(k,c,176,g,e+8|0);Va(i,m,a+684|0,a+694|0,j,k);Wa(j,c,176,g,e+6|0);Va(k,c,a+686|0,a+696|0,h,i);c=d>>>3;Wa(h,c,272,g,e+4|0);Va(i,c,a+688|0,a+698|0,j,k);c=d>>>4;Wa(j,c,368,g,e+2|0);j=a+700|0;if(!c){Wa(h,c,368,g,e);n=b[g>>1]|0;l=f;return n|0}d=a+702|0;i=a+704|0;m=a+706|0;a=k;k=0;o=h;while(1){p=b[a>>1]|0;q=b[j>>1]|0;r=R(q<<16>>16,-13262)|0;s=b[d>>1]|0;b[d>>1]=q;b[j>>1]=b[a>>1]|0;q=b[i>>1]|0;t=((s+p|0)*6631|0)+r+((q<<16>>16)*7756|0)+(R(b[m>>1]|0,-5620)|0)|0;b[m>>1]=q;q=t>>>14&65535;b[i>>1]=q;b[o>>1]=q;k=k+1|0;if((k|0)==(c|0))break;else{a=a+2|0;o=o+2|0}}Wa(h,c,368,g,e);n=b[g>>1]|0;l=f;return n|0}function Va(a,c,d,f,g,h){a=a|0;c=c|0;d=d|0;f=f|0;g=g|0;h=h|0;var i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0;i=c>>1;c=(i|0)>0;if(c){j=0;k=g;l=a;m=e[d>>1]<<16;while(1){n=((b[l>>1]|0)*20972|0)+m|0;b[k>>1]=n>>>16;o=(R(n>>16,-20972)|0)+(b[l>>1]<<14)|0;j=j+1|0;if((j|0)==(i|0))break;else{k=k+2|0;l=l+4|0;m=o<<1}}b[d>>1]=o>>>15;o=e[f>>1]<<16;if(c){d=0;m=h;l=a+2|0;a=o;while(1){k=((b[l>>1]|0)*5571|0)+a|0;b[m>>1]=k>>>16;p=(R(k>>16,-5571)|0)+(b[l>>1]<<14)|0;d=d+1|0;if((d|0)==(i|0))break;else{m=m+2|0;l=l+4|0;a=p<<1}}b[f>>1]=p>>>15;if(c){q=h;r=0;s=g}else return;while(1){g=b[s>>1]|0;b[s>>1]=g-(e[q>>1]|0);b[q>>1]=(e[q>>1]|0)+g;r=r+1|0;if((r|0)==(i|0))break;else{q=q+2|0;s=s+2|0}}return}else t=o}else t=e[f>>1]<<16;b[f>>1]=t>>>16;return}function Wa(a,d,e,f,g){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,i=0,j=0;h=l;l=l+16|0;i=h;c[i>>2]=0;if(!a)pa(3615,3527,164,3631);if((d|0)<=0)pa(3643,3527,165,3631);j=db(a,d,i)|0;if(!j){b[g>>1]=e;l=h;return}d=j>>>0>65535?0:16;a=(-16777216>>>d&j|0)==0?d|8:d;d=(-268435456>>>a&j|0)==0?a|4:a;a=(-1073741824>>>d&j|0)==0?d|2:d;d=17-a+(((-2147483648>>>a&j|0)==0)<<31>>31)|0;a=(c[i>>2]|0)+d|0;c[i>>2]=a;i=(d|0)<0?j<<0-d:j>>>d;d=(((a<<16>>16)*24660|0)>>>9)+(((i>>>4&1023|14336)*24660|0)>>>19)|0;b[g>>1]=((d&32768|0)==0?d:0)+(e&65535);e=b[f>>1]|0;if(e<<16>>16>=11){l=h;return}b[f>>1]=(e&65535)+((a|0)>-1?11:i>>>(0-a|0));l=h;return}function Xa(a,c,d,e){a=a|0;c=c|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0;f=(ab((d<<16>>16>>1)+131072|0,d)|0)<<16;d=f>>16;g=f>>18;f=((a&65535)<<3)-(c&65535)<<16>>16;c=(R((R(g<<14,g)|0)>>16,f)|0)>>>10;b[e>>1]=c;e=(R(c<<16>>16,f)|0)>>9;if((e|0)>=22005){h=0;i=R(h,d)|0;return i|0}f=0-(((e<<16>>16)*94544|0)>>>16)|0;h=(f&1023|1024)>>>(((f<<16^-67108864)>>26)+1|0);i=R(h,d)|0;return i|0}function Ya(a,d,e,f){a=a|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;g=c[e>>2]|0;h=e+4|0;i=c[h>>2]|0;j=f>>1;if((j|0)>0){k=0;l=i;m=g;n=d;o=a}else{p=i;q=g;c[e>>2]=q;c[h>>2]=p;return}while(1){g=(((b[o>>1]|0)*5243|0)>>>14)+(m>>>1)|0;b[n>>1]=g;i=o+2|0;a=g<<16>>16;g=(b[o>>1]|0)-(a*5243>>12)|0;d=(((b[i>>1]|0)*1392|0)>>>14)+(l>>>1)<<16>>16;b[n>>1]=d+a;a=(b[i>>1]|0)-(d*1392>>12)|0;k=k+1|0;if((k|0)==(j|0)){p=a;q=g;break}else{l=a;m=g;n=n+2|0;o=o+4|0}}c[e>>2]=q;c[h>>2]=p;return}function Za(a,d,e){a=a|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0;f=e<<4;g=a+284+(f<<1)|0;h=a+476+(f<<1)|0;if((e|0)>=6)pa(3659,3682,76,3715);f=g+30|0;i=h+30|0;j=0;do{k=g+(j<<1)|0;l=b[k>>1]|0;if(l<<16>>16==100){m=j;do{n=m;m=m+1|0;b[h+(n<<1)>>1]=b[h+(m<<1)>>1]|0;b[g+(n<<1)>>1]=b[g+(m<<1)>>1]|0}while((m|0)!=16);b[f>>1]=101;b[i>>1]=1e4}else b[k>>1]=l+1<<16>>16;j=j+1|0}while((j|0)!=16);do if((b[h+14>>1]|0)>d<<16>>16)if((b[h+6>>1]|0)>d<<16>>16)if((b[h+2>>1]|0)>d<<16>>16){o=(b[h>>1]|0)<=d<<16>>16&1;p=25;break}else{o=(b[h+4>>1]|0)>d<<16>>16?2:3;p=25;break}else if((b[h+10>>1]|0)>d<<16>>16){o=(b[h+8>>1]|0)>d<<16>>16?4:5;p=25;break}else{o=(b[h+12>>1]|0)>d<<16>>16?6:7;p=25;break}else if((b[i>>1]|0)>d<<16>>16)if((b[h+22>>1]|0)>d<<16>>16)if((b[h+18>>1]|0)>d<<16>>16){o=(b[h+16>>1]|0)>d<<16>>16?8:9;p=25;break}else{o=(b[h+20>>1]|0)>d<<16>>16?10:11;p=25;break}else if((b[h+26>>1]|0)<=d<<16>>16)if((b[h+28>>1]|0)>d<<16>>16){o=14;p=25;break}else{q=15;p=27;break}else{o=(b[h+24>>1]|0)>d<<16>>16?12:13;p=25;break}while(0);if((p|0)==25){i=15;do{j=i;i=i+-1|0;b[h+(j<<1)>>1]=b[h+(i<<1)>>1]|0;b[g+(j<<1)>>1]=b[g+(i<<1)>>1]|0}while((i|0)>(o|0));q=o;p=27}if((p|0)==27){b[h+(q<<1)>>1]=d;b[g+(q<<1)>>1]=1}q=c[a+276>>2]|0;if((q|0)<=2)if((q|0)>0)r=h;else{q=a+668+(e<<1)|0;s=0;t=1600;u=q;v=b[q>>1]|0;w=s+1|0;x=v<<16>>16;y=R(x,w)|0;z=s^32767;A=t<<16>>16;B=R(z,A)|0;C=B+16384|0;D=C+y|0;E=D>>>15;F=E&65535;b[u>>1]=F;return F|0}else r=h+4|0;h=b[r>>1]|0;r=a+668+(e<<1)|0;e=b[r>>1]|0;s=h<<16>>16<e<<16>>16?6553:32439;t=h;u=r;v=e;w=s+1|0;x=v<<16>>16;y=R(x,w)|0;z=s^32767;A=t<<16>>16;B=R(z,A)|0;C=B+16384|0;D=C+y|0;E=D>>>15;F=E&65535;b[u>>1]=F;return F|0}function _a(){ia(3796,1)|0;return}function $a(){c[936]=1;c[937]=2;c[938]=3;c[939]=4;c[940]=5;c[941]=6;c[942]=1;c[943]=1;c[944]=1;c[945]=2;c[946]=1;c[947]=3;c[948]=4;return}function ab(a,b){a=a|0;b=b|0;var c=0;if(!(b<<16>>16)){c=2147483647;return c|0}c=(a|0)/(b<<16>>16|0)|0;return c|0}function bb(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0;f=e+1024|0;gb(a,480,f,d);hb(f,240,e+64|0,d+32|0);f=e+32|0;a=d+96|0;c[f>>2]=c[a>>2];c[f+4>>2]=c[a+4>>2];c[f+8>>2]=c[a+8>>2];c[f+12>>2]=c[a+12>>2];c[f+16>>2]=c[a+16>>2];c[f+20>>2]=c[a+20>>2];c[f+24>>2]=c[a+24>>2];c[f+28>>2]=c[a+28>>2];g=e+992|0;c[a>>2]=c[g>>2];c[a+4>>2]=c[g+4>>2];c[a+8>>2]=c[g+8>>2];c[a+12>>2]=c[g+12>>2];c[a+16>>2]=c[g+16>>2];c[a+20>>2]=c[g+20>>2];c[a+24>>2]=c[g+24>>2];c[a+28>>2]=c[g+28>>2];eb(f,e,80);fb(e,160,b,d+128|0);return}function cb(a){a=a|0;_b(a|0,0,160)|0;return}function db(a,d,e){a=a|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0;f=nb(a,d,d)|0;if((d|0)>0){g=0;h=0;i=a}else{j=0;c[e>>2]=f;return j|0}while(1){a=b[i>>1]|0;k=((R(a,a)|0)>>>f)+g|0;h=h+1|0;if((h|0)==(d|0)){j=k;break}else{g=k;i=i+2|0}}c[e>>2]=f;return j|0}function eb(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0;if((d|0)>0){e=a;f=b;g=0}else return;while(1){b=e+4|0;a=((c[e>>2]|0)*778|0)+16384+(R(c[b>>2]|0,-2050)|0)|0;h=e+8|0;i=e;e=e+12|0;j=i+16|0;k=i+20|0;l=a+((c[h>>2]|0)*1087|0)+((c[e>>2]|0)*23285|0)+((c[j>>2]|0)*12903|0)+(R(c[k>>2]|0,-3783)|0)|0;a=i+24|0;m=i+28|0;c[f>>2]=l+((c[a>>2]|0)*441|0)+((c[m>>2]|0)*222|0);l=((c[b>>2]|0)*222|0)+16384+((c[h>>2]|0)*441|0)+(R(c[e>>2]|0,-3783)|0)|0;h=l+((c[j>>2]|0)*12903|0)+((c[k>>2]|0)*23285|0)+((c[a>>2]|0)*1087|0)+(R(c[m>>2]|0,-2050)|0)|0;c[f+4>>2]=h+((c[i+32>>2]|0)*778|0);g=g+1|0;if((g|0)==(d|0))break;else f=f+8|0}return}function fb(a,d,e,f){a=a|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0;g=d>>1;d=(g|0)>0;if(!d)return;h=f+4|0;i=f+8|0;j=f+12|0;k=0;do{l=a+(k<<1<<2)|0;m=c[l>>2]|0;n=c[h>>2]|0;o=((m+8192-n>>14)*3050|0)+(c[f>>2]|0)|0;c[f>>2]=m;m=c[i>>2]|0;p=o-m>>14;q=(((p>>>31)+p|0)*9368|0)+n|0;c[h>>2]=o;o=q-(c[j>>2]|0)>>14;n=(((o>>>31)+o|0)*15063|0)+m|0;c[j>>2]=n;c[i>>2]=q;c[l>>2]=n>>1;k=k+1|0}while((k|0)!=(g|0));k=a+4|0;if(!d)return;i=f+20|0;j=f+16|0;h=f+24|0;n=f+28|0;f=0;do{l=k+(f<<1<<2)|0;q=c[l>>2]|0;m=c[i>>2]|0;o=((q+8192-m>>14)*821|0)+(c[j>>2]|0)|0;c[j>>2]=q;q=c[h>>2]|0;p=o-q>>14;r=(((p>>>31)+p|0)*6110|0)+m|0;c[i>>2]=o;o=r-(c[n>>2]|0)>>14;m=(((o>>>31)+o|0)*12382|0)+q|0;c[n>>2]=m;c[h>>2]=r;c[l>>2]=m>>1;f=f+1|0}while((f|0)!=(g|0));if(d)s=0;else return;do{d=s<<1;f=(c[a+((d|1)<<2)>>2]|0)+(c[a+(d<<2)>>2]|0)>>15;h=(c[a+((d|3)<<2)>>2]|0)+(c[a+((d|2)<<2)>>2]|0)>>15;d=(f|0)<32767?f:32767;b[e+(s<<1)>>1]=(d|0)>-32768?d:-32768;d=(h|0)<32767?h:32767;b[e+((s|1)<<1)>>1]=(d|0)>-32768?d:-32768;s=s+2|0}while((s|0)<(g|0));return}function gb(a,d,e,f){a=a|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0;g=d>>1;d=(g|0)>0;if(!d)return;h=f+4|0;i=f+8|0;j=f+12|0;k=0;do{l=b[a+(k<<1<<1)>>1]<<15|16384;m=c[h>>2]|0;n=((8192-m+l>>14)*3050|0)+(c[f>>2]|0)|0;c[f>>2]=l;l=c[i>>2]|0;o=n-l>>14;p=(((o>>>31)+o|0)*9368|0)+m|0;c[h>>2]=n;n=p-(c[j>>2]|0)>>14;m=(((n>>>31)+n|0)*15063|0)+l|0;c[j>>2]=m;c[i>>2]=p;c[e+(k<<2)>>2]=m>>1;k=k+1|0}while((k|0)!=(g|0));k=a+2|0;if(!d)return;d=f+20|0;a=f+16|0;i=f+24|0;j=f+28|0;f=0;do{h=b[k+(f<<1<<1)>>1]<<15|16384;m=c[d>>2]|0;p=((8192-m+h>>14)*821|0)+(c[a>>2]|0)|0;c[a>>2]=h;h=c[i>>2]|0;l=p-h>>14;n=(((l>>>31)+l|0)*6110|0)+m|0;c[d>>2]=p;p=n-(c[j>>2]|0)>>14;m=(((p>>>31)+p|0)*12382|0)+h|0;c[j>>2]=m;c[i>>2]=n;n=e+(f<<2)|0;c[n>>2]=(m>>1)+(c[n>>2]|0);f=f+1|0}while((f|0)!=(g|0));return}function hb(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0;f=b>>1;b=a+4|0;g=e+48|0;h=(f|0)>0;if(!h)return;i=e+4|0;j=e+8|0;k=e+12|0;l=g;m=0;while(1){n=c[l>>2]|0;o=c[i>>2]|0;p=((n+8192-o>>14)*3050|0)+(c[e>>2]|0)|0;c[e>>2]=n;n=c[j>>2]|0;q=p-n>>14;r=(((q>>>31)+q|0)*9368|0)+o|0;c[i>>2]=p;p=r-(c[k>>2]|0)>>14;o=(((p>>>31)+p|0)*15063|0)+n|0;c[k>>2]=o;c[j>>2]=r;r=m<<1;c[d+(r<<2)>>2]=o>>1;m=m+1|0;if((m|0)==(f|0))break;else l=b+(r<<2)|0}if(!h)return;l=e+20|0;m=e+16|0;j=e+24|0;k=e+28|0;i=0;do{r=i<<1;o=c[a+(r<<2)>>2]|0;n=c[l>>2]|0;p=((o+8192-n>>14)*821|0)+(c[m>>2]|0)|0;c[m>>2]=o;o=c[j>>2]|0;q=p-o>>14;s=(((q>>>31)+q|0)*6110|0)+n|0;c[l>>2]=p;p=s-(c[k>>2]|0)>>14;n=(((p>>>31)+p|0)*12382|0)+o|0;c[k>>2]=n;c[j>>2]=s;s=d+(r<<2)|0;c[s>>2]=(n>>1)+(c[s>>2]|0)>>15;i=i+1|0}while((i|0)!=(f|0));i=d+4|0;if(!h)return;d=e+36|0;j=e+32|0;k=e+40|0;l=e+44|0;m=0;do{s=m<<1;n=c[a+(s<<2)>>2]|0;r=c[d>>2]|0;o=((n+8192-r>>14)*3050|0)+(c[j>>2]|0)|0;c[j>>2]=n;n=c[k>>2]|0;p=o-n>>14;q=(((p>>>31)+p|0)*9368|0)+r|0;c[d>>2]=o;o=q-(c[l>>2]|0)>>14;r=(((o>>>31)+o|0)*15063|0)+n|0;c[l>>2]=r;c[k>>2]=q;c[i+(s<<2)>>2]=r>>1;m=m+1|0}while((m|0)!=(f|0));if(!h)return;h=e+52|0;m=e+56|0;k=e+60|0;e=0;do{l=e<<1;d=c[b+(l<<2)>>2]|0;j=c[h>>2]|0;a=((d+8192-j>>14)*821|0)+(c[g>>2]|0)|0;c[g>>2]=d;d=c[m>>2]|0;r=a-d>>14;s=(((r>>>31)+r|0)*6110|0)+j|0;c[h>>2]=a;a=s-(c[k>>2]|0)>>14;j=(((a>>>31)+a|0)*12382|0)+d|0;c[k>>2]=j;c[m>>2]=s;s=i+(l<<2)|0;c[s>>2]=(j>>1)+(c[s>>2]|0)>>15;e=e+1|0}while((e|0)!=(f|0));return}function ib(a,c,d,e,f,g,h){a=a|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var i=0,j=0,k=0,l=0;i=1<<f>>1;if((f|0)<0|((a|0)==0|(d|0)==0|(g|0)==0|(h|0)<1)){j=-1;return j|0}if((h|0)<=0){j=0;return j|0}k=c<<16>>16;c=e<<16>>16;e=0;do{l=R(b[a+(e<<1)>>1]|0,k)|0;b[g+(e<<1)>>1]=l+i+(R(b[d+(e<<1)>>1]|0,c)|0)>>f;e=e+1|0}while((e|0)!=(h|0));j=0;return j|0}function jb(a){a=a|0;var b=0,d=0;if(a>>>0<=10?(b=Wb(4)|0,(b|0)!=0):0){c[b>>2]=a;d=b}else d=0;return d|0}function kb(a){a=a|0;if(a|0)Xb(a);return}function lb(a,d,e){a=a|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0;f=l;l=l+4096|0;g=f;h=c[a>>2]|0;i=1<<h;if((h|0)!=31){j=0;k=0;while(1){b[g+(j<<1)>>1]=b[d+(k<<1)>>1]|0;b[g+((j|1)<<1)>>1]=0;k=k+1|0;if((k|0)>=(i|0))break;else j=j+2|0}}sb(g,h);h=pb(g,c[a>>2]|0,1)|0;$b(e|0,g|0,(i<<1)+4|0)|0;l=f;return h|0}function mb(a,d,f){a=a|0;d=d|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,m=0,n=0,o=0,p=0;g=l;l=l+4096|0;h=g;i=c[a>>2]|0;j=1<<i;k=j+2|0;$b(h|0,d|0,k<<1|0)|0;m=j<<1;if((m|0)>(k|0)){n=k;do{k=m-n|0;b[h+(n<<1)>>1]=b[d+(k<<1)>>1]|0;b[h+(n+1<<1)>>1]=0-(e[d+(k+1<<1)>>1]|0);n=n+2|0}while((m|0)>(n|0))}sb(h,i);n=qb(h,c[a>>2]|0,1)|0;if((i|0)==31){l=g;return n|0}else{o=0;p=0}while(1){b[f+(p<<1)>>1]=b[h+(o<<1)>>1]|0;p=p+1|0;if((p|0)>=(j|0))break;else o=o+2|0}l=g;return n|0}function nb(a,c,d){a=a|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;e=d>>>0>65535?16:0;f=(65280<<e&d|0)==0?e:e|8;e=(240<<f&d|0)==0?f:f|4;f=(12<<e&d|0)==0?e:e|2;e=((2<<f&d|0)!=0&1)+f|0;f=((1<<e&d|0)!=0&1)+e<<16>>16;if((c|0)>0){e=c;c=a;a=-1;d=-1;while(1){g=b[c>>1]|0;h=g<<16>>16;i=g<<16>>16>0?h:0-h|0;h=(i<<16>>16|0)>(d|0)?i&65535:a;i=h<<16>>16;if((e|0)>1){e=e+-1|0;c=c+2|0;a=h;d=i}else{j=h;k=i;break}}}else{j=-1;k=-1}d=R(k,k)|0;if(!d){l=0;m=j<<16>>16==0;n=(f|0)<(l|0);o=f-l|0;p=m|n;q=p?0:o;return q|0}k=d>>>0>32767?0:16;a=(-8388608>>>k&d|0)==0?k|8:k;k=(-134217728>>>a&d|0)==0?a|4:a;a=(-536870912>>>k&d|0)==0?k|2:k;l=((-1073741824>>>a&d|0)==0&1)+a|0;m=j<<16>>16==0;n=(f|0)<(l|0);o=f-l|0;p=m|n;q=p?0:o;return q|0}function ob(a,c,d,e,f,g,h,i){a=a|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;var j=0,k=0,l=0,m=0,n=0;j=R(e+-1|0,h)|0;k=j+i|0;if(!((e|0)>0&(g|0)>0&(k|0)<(c|0))){l=-1;return l|0}if((j|0)<0){l=0;return l|0}else{m=i;n=d}while(1){d=2048;i=0;do{d=(R(b[a+(m-i<<1)>>1]|0,b[f+(i<<1)>>1]|0)|0)+d|0;i=i+1|0}while((i|0)!=(g|0));i=d>>12;b[n>>1]=(i|0)>32767?32767:((i|0)>-32768?i:-32768)&65535;m=m+h|0;if((m|0)>(k|0)){l=0;break}else n=n+2|0}return l|0}function pb(a,c,d){a=a|0;c=c|0;d=d|0;var f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;f=1<<c;if((f|0)>1024){g=-1;return g|0}c=(f|0)>1;if(!d){if(c){h=9;i=1}else{g=0;return g|0}while(1){d=i;i=i<<1;if((d|0)>0){j=0;do{k=j<<h;if((j|0)<(f|0)){l=b[652+(k+256<<1)>>1]|0;m=0-(e[652+(k<<1)>>1]|0)<<16>>16;k=j;do{n=k+d<<1;o=a+(n<<1)|0;p=b[o>>1]|0;q=R(p,l)|0;r=a+((n|1)<<1)|0;n=b[r>>1]|0;s=q-(R(n,m)|0)>>15;q=(R(n,l)|0)+(R(p,m)|0)>>15;p=k<<1;n=a+(p<<1)|0;t=b[n>>1]|0;u=a+((p|1)<<1)|0;p=b[u>>1]|0;b[o>>1]=(t-s|0)>>>1;b[r>>1]=(p-q|0)>>>1;b[n>>1]=(s+t|0)>>>1;b[u>>1]=(q+p|0)>>>1;k=k+i|0}while((k|0)<(f|0))}j=j+1|0}while((j|0)!=(d|0))}if((i|0)>=(f|0)){g=0;break}else h=h+-1|0}return g|0}else{if(c){v=9;w=1}else{g=0;return g|0}while(1){c=w;w=w<<1;if((c|0)>0){h=0;do{i=h<<v;if((h|0)<(f|0)){d=b[652+(i+256<<1)>>1]|0;j=0-(e[652+(i<<1)>>1]|0)<<16>>16;i=h;do{k=i+c<<1;m=a+(k<<1)|0;l=b[m>>1]|0;p=R(l,d)|0;q=a+((k|1)<<1)|0;k=b[q>>1]|0;u=p+1-(R(k,j)|0)>>1;p=(R(l,j)|0)+1+(R(k,d)|0)>>1;k=i<<1;l=a+(k<<1)|0;t=a+((k|1)<<1)|0;k=b[t>>1]<<14;s=(b[l>>1]<<14)+16384|0;b[m>>1]=(s-u|0)>>>15;m=k+16384|0;b[q>>1]=(m-p|0)>>>15;b[l>>1]=(s+u|0)>>>15;b[t>>1]=(m+p|0)>>>15;i=i+w|0}while((i|0)<(f|0))}h=h+1|0}while((h|0)!=(c|0))}if((w|0)>=(f|0)){g=0;break}else v=v+-1|0}return g|0}return 0}function qb(a,d,e){a=a|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0;f=1<<d;if((f|0)>1024){g=-1;return g|0}if((f|0)<=1){g=0;return g|0}d=f<<1;h=(e|0)==0;e=0;i=9;j=1;while(1){k=za[c[936]&7](a,d)|0;l=k<<16>>16>13573;m=l&1;n=k<<16>>16>27146;k=n&1;o=m+e+k|0;p=n?(l?2:1):m;m=(l?16384:8192)<<k;k=j;j=j<<1;l=(k|0)>0;if(h){if(l){n=0;do{q=n<<i;if((n|0)<(f|0)){r=b[652+(q+256<<1)>>1]|0;s=b[652+(q<<1)>>1]|0;q=n;do{t=q+k<<1;u=a+(t<<1)|0;v=b[u>>1]|0;w=R(v,r)|0;x=a+((t|1)<<1)|0;t=b[x>>1]|0;y=w-(R(t,s)|0)>>15;w=(R(t,r)|0)+(R(v,s)|0)>>15;v=q<<1;t=a+(v<<1)|0;z=b[t>>1]|0;A=a+((v|1)<<1)|0;v=b[A>>1]|0;b[u>>1]=z-y>>p;b[x>>1]=v-w>>p;b[t>>1]=y+z>>p;b[A>>1]=w+v>>p;q=q+j|0}while((q|0)<(f|0))}n=n+1|0}while((n|0)!=(k|0))}}else if(l){n=p+14|0;q=0;do{s=q<<i;if((q|0)<(f|0)){r=b[652+(s+256<<1)>>1]|0;v=b[652+(s<<1)>>1]|0;s=q;do{w=s+k<<1;A=a+(w<<1)|0;z=b[A>>1]|0;y=R(z,r)|0;t=a+((w|1)<<1)|0;w=b[t>>1]|0;x=y+1-(R(w,v)|0)>>1;y=(R(z,v)|0)+1+(R(w,r)|0)>>1;w=s<<1;z=a+(w<<1)|0;u=a+((w|1)<<1)|0;w=b[u>>1]<<14;B=(b[z>>1]<<14)+m|0;b[A>>1]=B-x>>n;A=w+m|0;b[t>>1]=A-y>>n;b[z>>1]=B+x>>n;b[u>>1]=A+y>>n;s=s+j|0}while((s|0)<(f|0))}q=q+1|0}while((q|0)!=(k|0))}if((j|0)>=(f|0)){g=o;break}else{e=o;i=i+-1|0}}return g|0}function rb(a,d,e,f,g,h,i){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;var j=0,k=0,l=0,m=0;j=g<<16>>16;if(g<<16>>16<=0)return;g=f<<16>>16;k=i<<16>>16;i=h<<16>>16;if(f<<16>>16>0){l=0;m=a}else{_b(a|0,0,j<<2|0)|0;return}while(1){c[m>>2]=0;a=R(l,k)|0;f=0;h=0;do{h=((R(b[e+(f+a<<1)>>1]|0,b[d+(f<<1)>>1]|0)|0)>>i)+h|0;f=f+1|0}while((f|0)!=(g|0));c[m>>2]=h;l=l+1|0;if((l|0)==(j|0))break;else m=m+4|0}return}function sb(a,d){a=a|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0;if((d+-7|0)>>>0<2){e=(d|0)==8;f=e?2700:3180;g=e?240:112;e=0;do{h=a+(b[f+(e<<1)>>1]<<2)|0;i=c[h>>2]|0;j=a+(b[f+((e|1)<<1)>>1]<<2)|0;c[h>>2]=c[j>>2];c[j>>2]=i;e=e+2|0}while((e|0)<(g|0));return}g=1<<d;d=g+-1|0;if((g|0)<=1)return;e=0;f=1;do{i=d-e|0;j=g;do j=j>>1;while((j|0)>(i|0));e=(j+-1&e)+j|0;i=a+(f<<2)|0;h=a+(e<<2)|0;if((e|0)>(f|0)){k=c[i>>2]|0;c[i>>2]=c[h>>2];c[h>>2]=k}f=f+1|0}while((f|0)!=(g|0));return}function tb(a,c){a=a|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0;if((a|0)==0|(c|0)<1){d=-1;return d|0}if((c|0)>0){e=0;f=0;while(1){g=b[a+(e<<1)>>1]|0;h=g<<16>>16;i=g<<16>>16>-1?h:0-h|0;h=(i|0)>(f|0)?i:f;e=e+1|0;if((e|0)==(c|0)){j=h;break}else f=h}}else j=0;d=((j|0)<32767?j:32767)&65535;return d|0}function ub(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0;if((a|0)==0|(b|0)<1){d=-1;return d|0}if((b|0)>0){e=0;f=0;while(1){g=c[a+(f<<2)>>2]|0;h=(g|0)>-1?g:0-g|0;g=h>>>0>e>>>0?h:e;f=f+1|0;if((f|0)==(b|0)){i=g;break}else e=g}}else i=0;d=i>>>0<2147483647?i:2147483647;return d|0}function vb(a,c){a=a|0;c=c|0;var d=0,e=0,f=0,g=0,h=0;if((c|0)>0&(a|0)!=0){d=-32768;e=0}else{f=-32768;return f|0}while(1){g=b[a+(e<<1)>>1]|0;h=g<<16>>16>d<<16>>16?g:d;e=e+1|0;if((e|0)==(c|0)){f=h;break}else d=h}return f|0}function wb(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0;if((b|0)>0&(a|0)!=0){d=-2147483648;e=0}else{f=-2147483648;return f|0}while(1){g=c[a+(e<<2)>>2]|0;h=(g|0)>(d|0)?g:d;e=e+1|0;if((e|0)==(b|0)){f=h;break}else d=h}return f|0}function xb(a,c){a=a|0;c=c|0;var d=0,e=0,f=0,g=0,h=0;if((c|0)>0&(a|0)!=0){d=32767;e=0}else{f=32767;return f|0}while(1){g=b[a+(e<<1)>>1]|0;h=g<<16>>16<d<<16>>16?g:d;e=e+1|0;if((e|0)==(c|0)){f=h;break}else d=h}return f|0}function yb(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0;if((b|0)>0&(a|0)!=0){d=2147483647;e=0}else{f=2147483647;return f|0}while(1){g=c[a+(e<<2)>>2]|0;h=(g|0)<(d|0)?g:d;e=e+1|0;if((e|0)==(b|0)){f=h;break}else d=h}return f|0}function zb(){return 3800}function Ab(a){a=a|0;var b=0,d=0;b=l;l=l+16|0;d=b;c[d>>2]=Hb(c[a+60>>2]|0)|0;a=Db(ha(6,d|0)|0)|0;l=b;return a|0}function Bb(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;e=l;l=l+48|0;f=e+16|0;g=e;h=e+32|0;i=a+28|0;j=c[i>>2]|0;c[h>>2]=j;k=a+20|0;m=(c[k>>2]|0)-j|0;c[h+4>>2]=m;c[h+8>>2]=b;c[h+12>>2]=d;b=m+d|0;m=a+60|0;c[g>>2]=c[m>>2];c[g+4>>2]=h;c[g+8>>2]=2;j=Db(qa(146,g|0)|0)|0;a:do if((b|0)!=(j|0)){g=2;n=b;o=h;p=j;while(1){if((p|0)<0)break;n=n-p|0;q=c[o+4>>2]|0;r=p>>>0>q>>>0;s=r?o+8|0:o;t=(r<<31>>31)+g|0;u=p-(r?q:0)|0;c[s>>2]=(c[s>>2]|0)+u;q=s+4|0;c[q>>2]=(c[q>>2]|0)-u;c[f>>2]=c[m>>2];c[f+4>>2]=s;c[f+8>>2]=t;p=Db(qa(146,f|0)|0)|0;if((n|0)==(p|0)){v=3;break a}else{g=t;o=s}}c[a+16>>2]=0;c[i>>2]=0;c[k>>2]=0;c[a>>2]=c[a>>2]|32;if((g|0)==2)w=0;else w=d-(c[o+4>>2]|0)|0}else v=3;while(0);if((v|0)==3){v=c[a+44>>2]|0;c[a+16>>2]=v+(c[a+48>>2]|0);c[i>>2]=v;c[k>>2]=v;w=d}l=e;return w|0}function Cb(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0;e=l;l=l+32|0;f=e;g=e+20|0;c[f>>2]=c[a+60>>2];c[f+4>>2]=0;c[f+8>>2]=b;c[f+12>>2]=g;c[f+16>>2]=d;if((Db(ka(140,f|0)|0)|0)<0){c[g>>2]=-1;h=-1}else h=c[g>>2]|0;l=e;return h|0}function Db(a){a=a|0;var b=0;if(a>>>0>4294963200){c[(Eb()|0)>>2]=0-a;b=-1}else b=a;return b|0}function Eb(){return (Fb()|0)+64|0}function Fb(){return Gb()|0}function Gb(){return 8}function Hb(a){a=a|0;return a|0}function Ib(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0;f=l;l=l+32|0;g=f;c[b+36>>2]=5;if((c[b>>2]&64|0)==0?(c[g>>2]=c[b+60>>2],c[g+4>>2]=21523,c[g+8>>2]=f+16,na(54,g|0)|0):0)a[b+75>>0]=-1;g=Bb(b,d,e)|0;l=f;return g|0}function Jb(a){a=a|0;return 0}function Kb(a){a=a|0;return}function Lb(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0;f=e+16|0;g=c[f>>2]|0;if(!g)if(!(Mb(e)|0)){h=c[f>>2]|0;i=5}else j=0;else{h=g;i=5}a:do if((i|0)==5){g=e+20|0;f=c[g>>2]|0;k=f;if((h-f|0)>>>0<d>>>0){j=ta[c[e+36>>2]&7](e,b,d)|0;break}b:do if((a[e+75>>0]|0)>-1){f=d;while(1){if(!f){l=0;m=b;n=d;o=k;break b}p=f+-1|0;if((a[b+p>>0]|0)==10)break;else f=p}p=ta[c[e+36>>2]&7](e,b,f)|0;if(p>>>0<f>>>0){j=p;break a}l=f;m=b+f|0;n=d-f|0;o=c[g>>2]|0}else{l=0;m=b;n=d;o=k}while(0);$b(o|0,m|0,n|0)|0;c[g>>2]=(c[g>>2]|0)+n;j=l+n|0}while(0);return j|0}function Mb(b){b=b|0;var d=0,e=0,f=0;d=b+74|0;e=a[d>>0]|0;a[d>>0]=e+255|e;e=c[b>>2]|0;if(!(e&8)){c[b+8>>2]=0;c[b+4>>2]=0;d=c[b+44>>2]|0;c[b+28>>2]=d;c[b+20>>2]=d;c[b+16>>2]=d+(c[b+48>>2]|0);f=0}else{c[b>>2]=e|32;f=-1}return f|0}function Nb(b){b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0;d=b;a:do if(!(d&3)){e=b;f=4}else{g=b;h=d;while(1){if(!(a[g>>0]|0)){i=h;break a}j=g+1|0;h=j;if(!(h&3)){e=j;f=4;break}else g=j}}while(0);if((f|0)==4){f=e;while(1){k=c[f>>2]|0;if(!((k&-2139062144^-2139062144)&k+-16843009))f=f+4|0;else break}if(!((k&255)<<24>>24))l=f;else{k=f;while(1){f=k+1|0;if(!(a[f>>0]|0)){l=f;break}else k=f}}i=l}return i-d|0}function Ob(a,b){a=a|0;b=b|0;var c=0;c=Nb(a)|0;return ((Pb(a,1,c,b)|0)!=(c|0))<<31>>31|0}function Pb(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0;f=R(d,b)|0;g=(b|0)==0?0:d;if((c[e+76>>2]|0)>-1){d=(Jb(e)|0)==0;h=Lb(a,f,e)|0;if(d)i=h;else{Kb(e);i=h}}else i=Lb(a,f,e)|0;if((i|0)==(f|0))j=g;else j=(i>>>0)/(b>>>0)|0;return j|0}function Qb(b,e){b=b|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0,m=0,n=0,o=0;f=l;l=l+16|0;g=f;h=e&255;a[g>>0]=h;i=b+16|0;j=c[i>>2]|0;if(!j)if(!(Mb(b)|0)){k=c[i>>2]|0;m=4}else n=-1;else{k=j;m=4}do if((m|0)==4){j=b+20|0;i=c[j>>2]|0;if(i>>>0<k>>>0?(o=e&255,(o|0)!=(a[b+75>>0]|0)):0){c[j>>2]=i+1;a[i>>0]=h;n=o;break}if((ta[c[b+36>>2]&7](b,g,1)|0)==1)n=d[g>>0]|0;else n=-1}while(0);l=f;return n|0}function Rb(){ga(3864);return 3872}function Sb(){oa(3864);return}function Tb(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0;do if(a){if((c[a+76>>2]|0)<=-1){b=Ub(a)|0;break}d=(Jb(a)|0)==0;e=Ub(a)|0;if(d)b=e;else{Kb(a);b=e}}else{if(!(c[95]|0))f=0;else f=Tb(c[95]|0)|0;e=c[(Rb()|0)>>2]|0;if(!e)g=f;else{d=e;e=f;while(1){if((c[d+76>>2]|0)>-1)h=Jb(d)|0;else h=0;if((c[d+20>>2]|0)>>>0>(c[d+28>>2]|0)>>>0)i=Ub(d)|0|e;else i=e;if(h|0)Kb(d);d=c[d+56>>2]|0;if(!d){g=i;break}else e=i}}Sb();b=g}while(0);return b|0}function Ub(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0;b=a+20|0;d=a+28|0;if((c[b>>2]|0)>>>0>(c[d>>2]|0)>>>0?(ta[c[a+36>>2]&7](a,0,0)|0,(c[b>>2]|0)==0):0)e=-1;else{f=a+4|0;g=c[f>>2]|0;h=a+8|0;i=c[h>>2]|0;if(g>>>0<i>>>0)ta[c[a+40>>2]&7](a,g-i|0,1)|0;c[a+16>>2]=0;c[d>>2]=0;c[b>>2]=0;c[h>>2]=0;c[f>>2]=0;e=0}return e|0}function Vb(b){b=b|0;var d=0,e=0,f=0,g=0,h=0;d=c[63]|0;if((c[d+76>>2]|0)>-1)e=Jb(d)|0;else e=0;do if((Ob(b,d)|0)<0)f=1;else{if((a[d+75>>0]|0)!=10?(g=d+20|0,h=c[g>>2]|0,h>>>0<(c[d+16>>2]|0)>>>0):0){c[g>>2]=h+1;a[h>>0]=10;f=0;break}f=(Qb(d,10)|0)<0}while(0);if(e|0)Kb(d);return f<<31>>31|0}function Wb(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ka=0,la=0,ma=0,na=0,oa=0,pa=0,qa=0,ra=0,sa=0,ta=0,ua=0,va=0,wa=0,xa=0,ya=0,za=0,Aa=0,Ba=0;b=l;l=l+16|0;d=b;do if(a>>>0<245){e=a>>>0<11?16:a+11&-8;f=e>>>3;g=c[969]|0;h=g>>>f;if(h&3|0){i=(h&1^1)+f|0;j=3916+(i<<1<<2)|0;k=j+8|0;m=c[k>>2]|0;n=m+8|0;o=c[n>>2]|0;do if((j|0)!=(o|0)){if(o>>>0<(c[973]|0)>>>0)ja();p=o+12|0;if((c[p>>2]|0)==(m|0)){c[p>>2]=j;c[k>>2]=o;break}else ja()}else c[969]=g&~(1<<i);while(0);o=i<<3;c[m+4>>2]=o|3;k=m+o+4|0;c[k>>2]=c[k>>2]|1;q=n;l=b;return q|0}k=c[971]|0;if(e>>>0>k>>>0){if(h|0){o=2<<f;j=h<<f&(o|0-o);o=(j&0-j)+-1|0;j=o>>>12&16;p=o>>>j;o=p>>>5&8;r=p>>>o;p=r>>>2&4;s=r>>>p;r=s>>>1&2;t=s>>>r;s=t>>>1&1;u=(o|j|p|r|s)+(t>>>s)|0;s=3916+(u<<1<<2)|0;t=s+8|0;r=c[t>>2]|0;p=r+8|0;j=c[p>>2]|0;do if((s|0)!=(j|0)){if(j>>>0<(c[973]|0)>>>0)ja();o=j+12|0;if((c[o>>2]|0)==(r|0)){c[o>>2]=s;c[t>>2]=j;v=g;break}else ja()}else{o=g&~(1<<u);c[969]=o;v=o}while(0);j=(u<<3)-e|0;c[r+4>>2]=e|3;t=r+e|0;c[t+4>>2]=j|1;c[t+j>>2]=j;if(k|0){s=c[974]|0;f=k>>>3;h=3916+(f<<1<<2)|0;n=1<<f;if(v&n){f=h+8|0;m=c[f>>2]|0;if(m>>>0<(c[973]|0)>>>0)ja();else{w=m;x=f}}else{c[969]=v|n;w=h;x=h+8|0}c[x>>2]=s;c[w+12>>2]=s;c[s+8>>2]=w;c[s+12>>2]=h}c[971]=j;c[974]=t;q=p;l=b;return q|0}t=c[970]|0;if(t){j=(t&0-t)+-1|0;h=j>>>12&16;s=j>>>h;j=s>>>5&8;n=s>>>j;s=n>>>2&4;f=n>>>s;n=f>>>1&2;m=f>>>n;f=m>>>1&1;i=c[4180+((j|h|s|n|f)+(m>>>f)<<2)>>2]|0;f=(c[i+4>>2]&-8)-e|0;m=c[i+16+(((c[i+16>>2]|0)==0&1)<<2)>>2]|0;if(!m){y=i;z=f}else{n=i;i=f;f=m;while(1){m=(c[f+4>>2]&-8)-e|0;s=m>>>0<i>>>0;h=s?m:i;m=s?f:n;f=c[f+16+(((c[f+16>>2]|0)==0&1)<<2)>>2]|0;if(!f){y=m;z=h;break}else{n=m;i=h}}}i=c[973]|0;if(y>>>0<i>>>0)ja();n=y+e|0;if(y>>>0>=n>>>0)ja();f=c[y+24>>2]|0;p=c[y+12>>2]|0;do if((p|0)==(y|0)){r=y+20|0;u=c[r>>2]|0;if(!u){h=y+16|0;m=c[h>>2]|0;if(!m){A=0;break}else{B=m;C=h}}else{B=u;C=r}while(1){r=B+20|0;u=c[r>>2]|0;if(u|0){B=u;C=r;continue}r=B+16|0;u=c[r>>2]|0;if(!u)break;else{B=u;C=r}}if(C>>>0<i>>>0)ja();else{c[C>>2]=0;A=B;break}}else{r=c[y+8>>2]|0;if(r>>>0<i>>>0)ja();u=r+12|0;if((c[u>>2]|0)!=(y|0))ja();h=p+8|0;if((c[h>>2]|0)==(y|0)){c[u>>2]=p;c[h>>2]=r;A=p;break}else ja()}while(0);a:do if(f|0){p=c[y+28>>2]|0;i=4180+(p<<2)|0;do if((y|0)==(c[i>>2]|0)){c[i>>2]=A;if(!A){c[970]=t&~(1<<p);break a}}else if(f>>>0>=(c[973]|0)>>>0){c[f+16+(((c[f+16>>2]|0)!=(y|0)&1)<<2)>>2]=A;if(!A)break a;else break}else ja();while(0);p=c[973]|0;if(A>>>0<p>>>0)ja();c[A+24>>2]=f;i=c[y+16>>2]|0;do if(i|0)if(i>>>0<p>>>0)ja();else{c[A+16>>2]=i;c[i+24>>2]=A;break}while(0);i=c[y+20>>2]|0;if(i|0)if(i>>>0<(c[973]|0)>>>0)ja();else{c[A+20>>2]=i;c[i+24>>2]=A;break}}while(0);if(z>>>0<16){f=z+e|0;c[y+4>>2]=f|3;t=y+f+4|0;c[t>>2]=c[t>>2]|1}else{c[y+4>>2]=e|3;c[n+4>>2]=z|1;c[n+z>>2]=z;if(k|0){t=c[974]|0;f=k>>>3;i=3916+(f<<1<<2)|0;p=1<<f;if(g&p){f=i+8|0;r=c[f>>2]|0;if(r>>>0<(c[973]|0)>>>0)ja();else{D=r;E=f}}else{c[969]=g|p;D=i;E=i+8|0}c[E>>2]=t;c[D+12>>2]=t;c[t+8>>2]=D;c[t+12>>2]=i}c[971]=z;c[974]=n}q=y+8|0;l=b;return q|0}else F=e}else F=e}else if(a>>>0<=4294967231){i=a+11|0;t=i&-8;p=c[970]|0;if(p){f=0-t|0;r=i>>>8;if(r)if(t>>>0>16777215)G=31;else{i=(r+1048320|0)>>>16&8;h=r<<i;r=(h+520192|0)>>>16&4;u=h<<r;h=(u+245760|0)>>>16&2;m=14-(r|i|h)+(u<<h>>>15)|0;G=t>>>(m+7|0)&1|m<<1}else G=0;m=c[4180+(G<<2)>>2]|0;b:do if(!m){H=0;I=0;J=f;K=81}else{h=0;u=f;i=m;r=t<<((G|0)==31?0:25-(G>>>1)|0);s=0;while(1){j=(c[i+4>>2]&-8)-t|0;if(j>>>0<u>>>0)if(!j){L=i;M=0;N=i;K=85;break b}else{O=i;P=j}else{O=h;P=u}j=c[i+20>>2]|0;i=c[i+16+(r>>>31<<2)>>2]|0;o=(j|0)==0|(j|0)==(i|0)?s:j;j=(i|0)==0;if(j){H=o;I=O;J=P;K=81;break}else{h=O;u=P;r=r<<((j^1)&1);s=o}}}while(0);if((K|0)==81){if((H|0)==0&(I|0)==0){m=2<<G;f=p&(m|0-m);if(!f){F=t;break}m=(f&0-f)+-1|0;f=m>>>12&16;e=m>>>f;m=e>>>5&8;n=e>>>m;e=n>>>2&4;g=n>>>e;n=g>>>1&2;k=g>>>n;g=k>>>1&1;Q=0;R=c[4180+((m|f|e|n|g)+(k>>>g)<<2)>>2]|0}else{Q=I;R=H}if(!R){S=Q;T=J}else{L=Q;M=J;N=R;K=85}}if((K|0)==85)while(1){K=0;g=(c[N+4>>2]&-8)-t|0;k=g>>>0<M>>>0;n=k?g:M;g=k?N:L;N=c[N+16+(((c[N+16>>2]|0)==0&1)<<2)>>2]|0;if(!N){S=g;T=n;break}else{L=g;M=n;K=85}}if((S|0)!=0?T>>>0<((c[971]|0)-t|0)>>>0:0){n=c[973]|0;if(S>>>0<n>>>0)ja();g=S+t|0;if(S>>>0>=g>>>0)ja();k=c[S+24>>2]|0;e=c[S+12>>2]|0;do if((e|0)==(S|0)){f=S+20|0;m=c[f>>2]|0;if(!m){s=S+16|0;r=c[s>>2]|0;if(!r){U=0;break}else{V=r;W=s}}else{V=m;W=f}while(1){f=V+20|0;m=c[f>>2]|0;if(m|0){V=m;W=f;continue}f=V+16|0;m=c[f>>2]|0;if(!m)break;else{V=m;W=f}}if(W>>>0<n>>>0)ja();else{c[W>>2]=0;U=V;break}}else{f=c[S+8>>2]|0;if(f>>>0<n>>>0)ja();m=f+12|0;if((c[m>>2]|0)!=(S|0))ja();s=e+8|0;if((c[s>>2]|0)==(S|0)){c[m>>2]=e;c[s>>2]=f;U=e;break}else ja()}while(0);c:do if(k){e=c[S+28>>2]|0;n=4180+(e<<2)|0;do if((S|0)==(c[n>>2]|0)){c[n>>2]=U;if(!U){f=p&~(1<<e);c[970]=f;X=f;break c}}else if(k>>>0>=(c[973]|0)>>>0){c[k+16+(((c[k+16>>2]|0)!=(S|0)&1)<<2)>>2]=U;if(!U){X=p;break c}else break}else ja();while(0);e=c[973]|0;if(U>>>0<e>>>0)ja();c[U+24>>2]=k;n=c[S+16>>2]|0;do if(n|0)if(n>>>0<e>>>0)ja();else{c[U+16>>2]=n;c[n+24>>2]=U;break}while(0);n=c[S+20>>2]|0;if(n)if(n>>>0<(c[973]|0)>>>0)ja();else{c[U+20>>2]=n;c[n+24>>2]=U;X=p;break}else X=p}else X=p;while(0);do if(T>>>0>=16){c[S+4>>2]=t|3;c[g+4>>2]=T|1;c[g+T>>2]=T;p=T>>>3;if(T>>>0<256){k=3916+(p<<1<<2)|0;n=c[969]|0;e=1<<p;if(n&e){p=k+8|0;f=c[p>>2]|0;if(f>>>0<(c[973]|0)>>>0)ja();else{Y=f;Z=p}}else{c[969]=n|e;Y=k;Z=k+8|0}c[Z>>2]=g;c[Y+12>>2]=g;c[g+8>>2]=Y;c[g+12>>2]=k;break}k=T>>>8;if(k)if(T>>>0>16777215)_=31;else{e=(k+1048320|0)>>>16&8;n=k<<e;k=(n+520192|0)>>>16&4;p=n<<k;n=(p+245760|0)>>>16&2;f=14-(k|e|n)+(p<<n>>>15)|0;_=T>>>(f+7|0)&1|f<<1}else _=0;f=4180+(_<<2)|0;c[g+28>>2]=_;n=g+16|0;c[n+4>>2]=0;c[n>>2]=0;n=1<<_;if(!(X&n)){c[970]=X|n;c[f>>2]=g;c[g+24>>2]=f;c[g+12>>2]=g;c[g+8>>2]=g;break}n=T<<((_|0)==31?0:25-(_>>>1)|0);p=c[f>>2]|0;while(1){if((c[p+4>>2]&-8|0)==(T|0)){K=139;break}$=p+16+(n>>>31<<2)|0;f=c[$>>2]|0;if(!f){K=136;break}else{n=n<<1;p=f}}if((K|0)==136)if($>>>0<(c[973]|0)>>>0)ja();else{c[$>>2]=g;c[g+24>>2]=p;c[g+12>>2]=g;c[g+8>>2]=g;break}else if((K|0)==139){n=p+8|0;f=c[n>>2]|0;e=c[973]|0;if(f>>>0>=e>>>0&p>>>0>=e>>>0){c[f+12>>2]=g;c[n>>2]=g;c[g+8>>2]=f;c[g+12>>2]=p;c[g+24>>2]=0;break}else ja()}}else{f=T+t|0;c[S+4>>2]=f|3;n=S+f+4|0;c[n>>2]=c[n>>2]|1}while(0);q=S+8|0;l=b;return q|0}else F=t}else F=t}else F=-1;while(0);S=c[971]|0;if(S>>>0>=F>>>0){T=S-F|0;$=c[974]|0;if(T>>>0>15){_=$+F|0;c[974]=_;c[971]=T;c[_+4>>2]=T|1;c[_+T>>2]=T;c[$+4>>2]=F|3}else{c[971]=0;c[974]=0;c[$+4>>2]=S|3;T=$+S+4|0;c[T>>2]=c[T>>2]|1}q=$+8|0;l=b;return q|0}$=c[972]|0;if($>>>0>F>>>0){T=$-F|0;c[972]=T;S=c[975]|0;_=S+F|0;c[975]=_;c[_+4>>2]=T|1;c[S+4>>2]=F|3;q=S+8|0;l=b;return q|0}if(!(c[1087]|0)){c[1089]=4096;c[1088]=4096;c[1090]=-1;c[1091]=-1;c[1092]=0;c[1080]=0;S=d&-16^1431655768;c[d>>2]=S;c[1087]=S;aa=4096}else aa=c[1089]|0;S=F+48|0;d=F+47|0;T=aa+d|0;_=0-aa|0;aa=T&_;if(aa>>>0<=F>>>0){q=0;l=b;return q|0}X=c[1079]|0;if(X|0?(Y=c[1077]|0,Z=Y+aa|0,Z>>>0<=Y>>>0|Z>>>0>X>>>0):0){q=0;l=b;return q|0}d:do if(!(c[1080]&4)){X=c[975]|0;e:do if(X){Z=4324;while(1){Y=c[Z>>2]|0;if(Y>>>0<=X>>>0?(ba=Z+4|0,(Y+(c[ba>>2]|0)|0)>>>0>X>>>0):0)break;Y=c[Z+8>>2]|0;if(!Y){K=163;break e}else Z=Y}p=T-$&_;if(p>>>0<2147483647){Y=Zb(p|0)|0;if((Y|0)==((c[Z>>2]|0)+(c[ba>>2]|0)|0))if((Y|0)==(-1|0))ca=p;else{da=p;ea=Y;K=180;break d}else{fa=Y;ga=p;K=171}}else ca=0}else K=163;while(0);do if((K|0)==163){X=Zb(0)|0;if((X|0)!=(-1|0)?(t=X,p=c[1088]|0,Y=p+-1|0,U=((Y&t|0)==0?0:(Y+t&0-p)-t|0)+aa|0,t=c[1077]|0,p=U+t|0,U>>>0>F>>>0&U>>>0<2147483647):0){Y=c[1079]|0;if(Y|0?p>>>0<=t>>>0|p>>>0>Y>>>0:0){ca=0;break}Y=Zb(U|0)|0;if((Y|0)==(X|0)){da=U;ea=X;K=180;break d}else{fa=Y;ga=U;K=171}}else ca=0}while(0);do if((K|0)==171){U=0-ga|0;if(!(S>>>0>ga>>>0&(ga>>>0<2147483647&(fa|0)!=(-1|0))))if((fa|0)==(-1|0)){ca=0;break}else{da=ga;ea=fa;K=180;break d}Y=c[1089]|0;X=d-ga+Y&0-Y;if(X>>>0>=2147483647){da=ga;ea=fa;K=180;break d}if((Zb(X|0)|0)==(-1|0)){Zb(U|0)|0;ca=0;break}else{da=X+ga|0;ea=fa;K=180;break d}}while(0);c[1080]=c[1080]|4;ha=ca;K=178}else{ha=0;K=178}while(0);if(((K|0)==178?aa>>>0<2147483647:0)?(ca=Zb(aa|0)|0,aa=Zb(0)|0,fa=aa-ca|0,ga=fa>>>0>(F+40|0)>>>0,!((ca|0)==(-1|0)|ga^1|ca>>>0<aa>>>0&((ca|0)!=(-1|0)&(aa|0)!=(-1|0))^1)):0){da=ga?fa:ha;ea=ca;K=180}if((K|0)==180){ca=(c[1077]|0)+da|0;c[1077]=ca;if(ca>>>0>(c[1078]|0)>>>0)c[1078]=ca;ca=c[975]|0;do if(ca){ha=4324;while(1){ia=c[ha>>2]|0;ka=ha+4|0;la=c[ka>>2]|0;if((ea|0)==(ia+la|0)){K=190;break}fa=c[ha+8>>2]|0;if(!fa)break;else ha=fa}if(((K|0)==190?(c[ha+12>>2]&8|0)==0:0)?ca>>>0<ea>>>0&ca>>>0>=ia>>>0:0){c[ka>>2]=la+da;fa=ca+8|0;ga=(fa&7|0)==0?0:0-fa&7;fa=ca+ga|0;aa=(c[972]|0)+(da-ga)|0;c[975]=fa;c[972]=aa;c[fa+4>>2]=aa|1;c[fa+aa+4>>2]=40;c[976]=c[1091];break}aa=c[973]|0;if(ea>>>0<aa>>>0){c[973]=ea;ma=ea}else ma=aa;aa=ea+da|0;fa=4324;while(1){if((c[fa>>2]|0)==(aa|0)){K=198;break}ga=c[fa+8>>2]|0;if(!ga)break;else fa=ga}if((K|0)==198?(c[fa+12>>2]&8|0)==0:0){c[fa>>2]=ea;ha=fa+4|0;c[ha>>2]=(c[ha>>2]|0)+da;ha=ea+8|0;ga=ea+((ha&7|0)==0?0:0-ha&7)|0;ha=aa+8|0;d=aa+((ha&7|0)==0?0:0-ha&7)|0;ha=ga+F|0;S=d-ga-F|0;c[ga+4>>2]=F|3;do if((d|0)!=(ca|0)){if((d|0)==(c[974]|0)){ba=(c[971]|0)+S|0;c[971]=ba;c[974]=ha;c[ha+4>>2]=ba|1;c[ha+ba>>2]=ba;break}ba=c[d+4>>2]|0;if((ba&3|0)==1){_=ba&-8;$=ba>>>3;f:do if(ba>>>0>=256){T=c[d+24>>2]|0;X=c[d+12>>2]|0;do if((X|0)==(d|0)){U=d+16|0;Y=U+4|0;p=c[Y>>2]|0;if(!p){t=c[U>>2]|0;if(!t){na=0;break}else{oa=t;pa=U}}else{oa=p;pa=Y}while(1){Y=oa+20|0;p=c[Y>>2]|0;if(p|0){oa=p;pa=Y;continue}Y=oa+16|0;p=c[Y>>2]|0;if(!p)break;else{oa=p;pa=Y}}if(pa>>>0<ma>>>0)ja();else{c[pa>>2]=0;na=oa;break}}else{Y=c[d+8>>2]|0;if(Y>>>0<ma>>>0)ja();p=Y+12|0;if((c[p>>2]|0)!=(d|0))ja();U=X+8|0;if((c[U>>2]|0)==(d|0)){c[p>>2]=X;c[U>>2]=Y;na=X;break}else ja()}while(0);if(!T)break;X=c[d+28>>2]|0;Y=4180+(X<<2)|0;do if((d|0)!=(c[Y>>2]|0))if(T>>>0>=(c[973]|0)>>>0){c[T+16+(((c[T+16>>2]|0)!=(d|0)&1)<<2)>>2]=na;if(!na)break f;else break}else ja();else{c[Y>>2]=na;if(na|0)break;c[970]=c[970]&~(1<<X);break f}while(0);X=c[973]|0;if(na>>>0<X>>>0)ja();c[na+24>>2]=T;Y=d+16|0;U=c[Y>>2]|0;do if(U|0)if(U>>>0<X>>>0)ja();else{c[na+16>>2]=U;c[U+24>>2]=na;break}while(0);U=c[Y+4>>2]|0;if(!U)break;if(U>>>0<(c[973]|0)>>>0)ja();else{c[na+20>>2]=U;c[U+24>>2]=na;break}}else{U=c[d+8>>2]|0;X=c[d+12>>2]|0;T=3916+($<<1<<2)|0;do if((U|0)!=(T|0)){if(U>>>0<ma>>>0)ja();if((c[U+12>>2]|0)==(d|0))break;ja()}while(0);if((X|0)==(U|0)){c[969]=c[969]&~(1<<$);break}do if((X|0)==(T|0))qa=X+8|0;else{if(X>>>0<ma>>>0)ja();Y=X+8|0;if((c[Y>>2]|0)==(d|0)){qa=Y;break}ja()}while(0);c[U+12>>2]=X;c[qa>>2]=U}while(0);ra=d+_|0;sa=_+S|0}else{ra=d;sa=S}$=ra+4|0;c[$>>2]=c[$>>2]&-2;c[ha+4>>2]=sa|1;c[ha+sa>>2]=sa;$=sa>>>3;if(sa>>>0<256){ba=3916+($<<1<<2)|0;Z=c[969]|0;T=1<<$;do if(!(Z&T)){c[969]=Z|T;ta=ba;ua=ba+8|0}else{$=ba+8|0;Y=c[$>>2]|0;if(Y>>>0>=(c[973]|0)>>>0){ta=Y;ua=$;break}ja()}while(0);c[ua>>2]=ha;c[ta+12>>2]=ha;c[ha+8>>2]=ta;c[ha+12>>2]=ba;break}T=sa>>>8;do if(!T)va=0;else{if(sa>>>0>16777215){va=31;break}Z=(T+1048320|0)>>>16&8;_=T<<Z;$=(_+520192|0)>>>16&4;Y=_<<$;_=(Y+245760|0)>>>16&2;p=14-($|Z|_)+(Y<<_>>>15)|0;va=sa>>>(p+7|0)&1|p<<1}while(0);T=4180+(va<<2)|0;c[ha+28>>2]=va;ba=ha+16|0;c[ba+4>>2]=0;c[ba>>2]=0;ba=c[970]|0;p=1<<va;if(!(ba&p)){c[970]=ba|p;c[T>>2]=ha;c[ha+24>>2]=T;c[ha+12>>2]=ha;c[ha+8>>2]=ha;break}p=sa<<((va|0)==31?0:25-(va>>>1)|0);ba=c[T>>2]|0;while(1){if((c[ba+4>>2]&-8|0)==(sa|0)){K=265;break}wa=ba+16+(p>>>31<<2)|0;T=c[wa>>2]|0;if(!T){K=262;break}else{p=p<<1;ba=T}}if((K|0)==262)if(wa>>>0<(c[973]|0)>>>0)ja();else{c[wa>>2]=ha;c[ha+24>>2]=ba;c[ha+12>>2]=ha;c[ha+8>>2]=ha;break}else if((K|0)==265){p=ba+8|0;T=c[p>>2]|0;_=c[973]|0;if(T>>>0>=_>>>0&ba>>>0>=_>>>0){c[T+12>>2]=ha;c[p>>2]=ha;c[ha+8>>2]=T;c[ha+12>>2]=ba;c[ha+24>>2]=0;break}else ja()}}else{T=(c[972]|0)+S|0;c[972]=T;c[975]=ha;c[ha+4>>2]=T|1}while(0);q=ga+8|0;l=b;return q|0}ha=4324;while(1){S=c[ha>>2]|0;if(S>>>0<=ca>>>0?(xa=S+(c[ha+4>>2]|0)|0,xa>>>0>ca>>>0):0)break;ha=c[ha+8>>2]|0}ha=xa+-47|0;ga=ha+8|0;S=ha+((ga&7|0)==0?0:0-ga&7)|0;ga=ca+16|0;ha=S>>>0<ga>>>0?ca:S;S=ha+8|0;d=ea+8|0;aa=(d&7|0)==0?0:0-d&7;d=ea+aa|0;fa=da+-40-aa|0;c[975]=d;c[972]=fa;c[d+4>>2]=fa|1;c[d+fa+4>>2]=40;c[976]=c[1091];fa=ha+4|0;c[fa>>2]=27;c[S>>2]=c[1081];c[S+4>>2]=c[1082];c[S+8>>2]=c[1083];c[S+12>>2]=c[1084];c[1081]=ea;c[1082]=da;c[1084]=0;c[1083]=S;S=ha+24|0;do{d=S;S=S+4|0;c[S>>2]=7}while((d+8|0)>>>0<xa>>>0);if((ha|0)!=(ca|0)){S=ha-ca|0;c[fa>>2]=c[fa>>2]&-2;c[ca+4>>2]=S|1;c[ha>>2]=S;d=S>>>3;if(S>>>0<256){aa=3916+(d<<1<<2)|0;T=c[969]|0;p=1<<d;if(T&p){d=aa+8|0;_=c[d>>2]|0;if(_>>>0<(c[973]|0)>>>0)ja();else{ya=_;za=d}}else{c[969]=T|p;ya=aa;za=aa+8|0}c[za>>2]=ca;c[ya+12>>2]=ca;c[ca+8>>2]=ya;c[ca+12>>2]=aa;break}aa=S>>>8;if(aa)if(S>>>0>16777215)Aa=31;else{p=(aa+1048320|0)>>>16&8;T=aa<<p;aa=(T+520192|0)>>>16&4;d=T<<aa;T=(d+245760|0)>>>16&2;_=14-(aa|p|T)+(d<<T>>>15)|0;Aa=S>>>(_+7|0)&1|_<<1}else Aa=0;_=4180+(Aa<<2)|0;c[ca+28>>2]=Aa;c[ca+20>>2]=0;c[ga>>2]=0;T=c[970]|0;d=1<<Aa;if(!(T&d)){c[970]=T|d;c[_>>2]=ca;c[ca+24>>2]=_;c[ca+12>>2]=ca;c[ca+8>>2]=ca;break}d=S<<((Aa|0)==31?0:25-(Aa>>>1)|0);T=c[_>>2]|0;while(1){if((c[T+4>>2]&-8|0)==(S|0)){K=292;break}Ba=T+16+(d>>>31<<2)|0;_=c[Ba>>2]|0;if(!_){K=289;break}else{d=d<<1;T=_}}if((K|0)==289)if(Ba>>>0<(c[973]|0)>>>0)ja();else{c[Ba>>2]=ca;c[ca+24>>2]=T;c[ca+12>>2]=ca;c[ca+8>>2]=ca;break}else if((K|0)==292){d=T+8|0;S=c[d>>2]|0;ga=c[973]|0;if(S>>>0>=ga>>>0&T>>>0>=ga>>>0){c[S+12>>2]=ca;c[d>>2]=ca;c[ca+8>>2]=S;c[ca+12>>2]=T;c[ca+24>>2]=0;break}else ja()}}}else{S=c[973]|0;if((S|0)==0|ea>>>0<S>>>0)c[973]=ea;c[1081]=ea;c[1082]=da;c[1084]=0;c[978]=c[1087];c[977]=-1;S=0;do{d=3916+(S<<1<<2)|0;c[d+12>>2]=d;c[d+8>>2]=d;S=S+1|0}while((S|0)!=32);S=ea+8|0;T=(S&7|0)==0?0:0-S&7;S=ea+T|0;d=da+-40-T|0;c[975]=S;c[972]=d;c[S+4>>2]=d|1;c[S+d+4>>2]=40;c[976]=c[1091]}while(0);da=c[972]|0;if(da>>>0>F>>>0){ea=da-F|0;c[972]=ea;da=c[975]|0;ca=da+F|0;c[975]=ca;c[ca+4>>2]=ea|1;c[da+4>>2]=F|3;q=da+8|0;l=b;return q|0}}c[(Eb()|0)>>2]=12;q=0;l=b;return q|0}function Xb(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0;if(!a)return;b=a+-8|0;d=c[973]|0;if(b>>>0<d>>>0)ja();e=c[a+-4>>2]|0;a=e&3;if((a|0)==1)ja();f=e&-8;g=b+f|0;a:do if(!(e&1)){h=c[b>>2]|0;if(!a)return;i=b+(0-h)|0;j=h+f|0;if(i>>>0<d>>>0)ja();if((i|0)==(c[974]|0)){k=g+4|0;l=c[k>>2]|0;if((l&3|0)!=3){m=i;n=j;o=i;break}c[971]=j;c[k>>2]=l&-2;c[i+4>>2]=j|1;c[i+j>>2]=j;return}l=h>>>3;if(h>>>0<256){h=c[i+8>>2]|0;k=c[i+12>>2]|0;p=3916+(l<<1<<2)|0;if((h|0)!=(p|0)){if(h>>>0<d>>>0)ja();if((c[h+12>>2]|0)!=(i|0))ja()}if((k|0)==(h|0)){c[969]=c[969]&~(1<<l);m=i;n=j;o=i;break}if((k|0)!=(p|0)){if(k>>>0<d>>>0)ja();p=k+8|0;if((c[p>>2]|0)==(i|0))q=p;else ja()}else q=k+8|0;c[h+12>>2]=k;c[q>>2]=h;m=i;n=j;o=i;break}h=c[i+24>>2]|0;k=c[i+12>>2]|0;do if((k|0)==(i|0)){p=i+16|0;l=p+4|0;r=c[l>>2]|0;if(!r){s=c[p>>2]|0;if(!s){t=0;break}else{u=s;v=p}}else{u=r;v=l}while(1){l=u+20|0;r=c[l>>2]|0;if(r|0){u=r;v=l;continue}l=u+16|0;r=c[l>>2]|0;if(!r)break;else{u=r;v=l}}if(v>>>0<d>>>0)ja();else{c[v>>2]=0;t=u;break}}else{l=c[i+8>>2]|0;if(l>>>0<d>>>0)ja();r=l+12|0;if((c[r>>2]|0)!=(i|0))ja();p=k+8|0;if((c[p>>2]|0)==(i|0)){c[r>>2]=k;c[p>>2]=l;t=k;break}else ja()}while(0);if(h){k=c[i+28>>2]|0;l=4180+(k<<2)|0;do if((i|0)==(c[l>>2]|0)){c[l>>2]=t;if(!t){c[970]=c[970]&~(1<<k);m=i;n=j;o=i;break a}}else if(h>>>0>=(c[973]|0)>>>0){c[h+16+(((c[h+16>>2]|0)!=(i|0)&1)<<2)>>2]=t;if(!t){m=i;n=j;o=i;break a}else break}else ja();while(0);k=c[973]|0;if(t>>>0<k>>>0)ja();c[t+24>>2]=h;l=i+16|0;p=c[l>>2]|0;do if(p|0)if(p>>>0<k>>>0)ja();else{c[t+16>>2]=p;c[p+24>>2]=t;break}while(0);p=c[l+4>>2]|0;if(p)if(p>>>0<(c[973]|0)>>>0)ja();else{c[t+20>>2]=p;c[p+24>>2]=t;m=i;n=j;o=i;break}else{m=i;n=j;o=i}}else{m=i;n=j;o=i}}else{m=b;n=f;o=b}while(0);if(o>>>0>=g>>>0)ja();b=g+4|0;f=c[b>>2]|0;if(!(f&1))ja();if(!(f&2)){t=c[974]|0;if((g|0)==(c[975]|0)){d=(c[972]|0)+n|0;c[972]=d;c[975]=m;c[m+4>>2]=d|1;if((m|0)!=(t|0))return;c[974]=0;c[971]=0;return}if((g|0)==(t|0)){t=(c[971]|0)+n|0;c[971]=t;c[974]=o;c[m+4>>2]=t|1;c[o+t>>2]=t;return}t=(f&-8)+n|0;d=f>>>3;b:do if(f>>>0>=256){u=c[g+24>>2]|0;v=c[g+12>>2]|0;do if((v|0)==(g|0)){q=g+16|0;a=q+4|0;e=c[a>>2]|0;if(!e){p=c[q>>2]|0;if(!p){w=0;break}else{x=p;y=q}}else{x=e;y=a}while(1){a=x+20|0;e=c[a>>2]|0;if(e|0){x=e;y=a;continue}a=x+16|0;e=c[a>>2]|0;if(!e)break;else{x=e;y=a}}if(y>>>0<(c[973]|0)>>>0)ja();else{c[y>>2]=0;w=x;break}}else{a=c[g+8>>2]|0;if(a>>>0<(c[973]|0)>>>0)ja();e=a+12|0;if((c[e>>2]|0)!=(g|0))ja();q=v+8|0;if((c[q>>2]|0)==(g|0)){c[e>>2]=v;c[q>>2]=a;w=v;break}else ja()}while(0);if(u|0){v=c[g+28>>2]|0;i=4180+(v<<2)|0;do if((g|0)==(c[i>>2]|0)){c[i>>2]=w;if(!w){c[970]=c[970]&~(1<<v);break b}}else if(u>>>0>=(c[973]|0)>>>0){c[u+16+(((c[u+16>>2]|0)!=(g|0)&1)<<2)>>2]=w;if(!w)break b;else break}else ja();while(0);v=c[973]|0;if(w>>>0<v>>>0)ja();c[w+24>>2]=u;i=g+16|0;j=c[i>>2]|0;do if(j|0)if(j>>>0<v>>>0)ja();else{c[w+16>>2]=j;c[j+24>>2]=w;break}while(0);j=c[i+4>>2]|0;if(j|0)if(j>>>0<(c[973]|0)>>>0)ja();else{c[w+20>>2]=j;c[j+24>>2]=w;break}}}else{j=c[g+8>>2]|0;v=c[g+12>>2]|0;u=3916+(d<<1<<2)|0;if((j|0)!=(u|0)){if(j>>>0<(c[973]|0)>>>0)ja();if((c[j+12>>2]|0)!=(g|0))ja()}if((v|0)==(j|0)){c[969]=c[969]&~(1<<d);break}if((v|0)!=(u|0)){if(v>>>0<(c[973]|0)>>>0)ja();u=v+8|0;if((c[u>>2]|0)==(g|0))z=u;else ja()}else z=v+8|0;c[j+12>>2]=v;c[z>>2]=j}while(0);c[m+4>>2]=t|1;c[o+t>>2]=t;if((m|0)==(c[974]|0)){c[971]=t;return}else A=t}else{c[b>>2]=f&-2;c[m+4>>2]=n|1;c[o+n>>2]=n;A=n}n=A>>>3;if(A>>>0<256){o=3916+(n<<1<<2)|0;f=c[969]|0;b=1<<n;if(f&b){n=o+8|0;t=c[n>>2]|0;if(t>>>0<(c[973]|0)>>>0)ja();else{B=t;C=n}}else{c[969]=f|b;B=o;C=o+8|0}c[C>>2]=m;c[B+12>>2]=m;c[m+8>>2]=B;c[m+12>>2]=o;return}o=A>>>8;if(o)if(A>>>0>16777215)D=31;else{B=(o+1048320|0)>>>16&8;C=o<<B;o=(C+520192|0)>>>16&4;b=C<<o;C=(b+245760|0)>>>16&2;f=14-(o|B|C)+(b<<C>>>15)|0;D=A>>>(f+7|0)&1|f<<1}else D=0;f=4180+(D<<2)|0;c[m+28>>2]=D;c[m+20>>2]=0;c[m+16>>2]=0;C=c[970]|0;b=1<<D;do if(C&b){B=A<<((D|0)==31?0:25-(D>>>1)|0);o=c[f>>2]|0;while(1){if((c[o+4>>2]&-8|0)==(A|0)){E=124;break}F=o+16+(B>>>31<<2)|0;n=c[F>>2]|0;if(!n){E=121;break}else{B=B<<1;o=n}}if((E|0)==121)if(F>>>0<(c[973]|0)>>>0)ja();else{c[F>>2]=m;c[m+24>>2]=o;c[m+12>>2]=m;c[m+8>>2]=m;break}else if((E|0)==124){B=o+8|0;i=c[B>>2]|0;n=c[973]|0;if(i>>>0>=n>>>0&o>>>0>=n>>>0){c[i+12>>2]=m;c[B>>2]=m;c[m+8>>2]=i;c[m+12>>2]=o;c[m+24>>2]=0;break}else ja()}}else{c[970]=C|b;c[f>>2]=m;c[m+24>>2]=f;c[m+12>>2]=m;c[m+8>>2]=m}while(0);m=(c[977]|0)+-1|0;c[977]=m;if(!m)G=4332;else return;while(1){m=c[G>>2]|0;if(!m)break;else G=m+8|0}c[977]=-1;return}function Yb(){}function Zb(a){a=a|0;var b=0,d=0;a=a+15&-16|0;b=c[i>>2]|0;d=b+a|0;if((a|0)>0&(d|0)<(b|0)|(d|0)<0){Z()|0;la(12);return -1}c[i>>2]=d;if((d|0)>(Y()|0)?(X()|0)==0:0){la(12);c[i>>2]=b;return -1}return b|0}function _b(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0;f=b+e|0;d=d&255;if((e|0)>=67){while(b&3){a[b>>0]=d;b=b+1|0}g=f&-4|0;h=g-64|0;i=d|d<<8|d<<16|d<<24;while((b|0)<=(h|0)){c[b>>2]=i;c[b+4>>2]=i;c[b+8>>2]=i;c[b+12>>2]=i;c[b+16>>2]=i;c[b+20>>2]=i;c[b+24>>2]=i;c[b+28>>2]=i;c[b+32>>2]=i;c[b+36>>2]=i;c[b+40>>2]=i;c[b+44>>2]=i;c[b+48>>2]=i;c[b+52>>2]=i;c[b+56>>2]=i;c[b+60>>2]=i;b=b+64|0}while((b|0)<(g|0)){c[b>>2]=i;b=b+4|0}}while((b|0)<(f|0)){a[b>>0]=d;b=b+1|0}return f-e|0}function $b(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;if((e|0)>=8192)return ma(b|0,d|0,e|0)|0;f=b|0;g=b+e|0;if((b&3)==(d&3)){while(b&3){if(!e)return f|0;a[b>>0]=a[d>>0]|0;b=b+1|0;d=d+1|0;e=e-1|0}h=g&-4|0;e=h-64|0;while((b|0)<=(e|0)){c[b>>2]=c[d>>2];c[b+4>>2]=c[d+4>>2];c[b+8>>2]=c[d+8>>2];c[b+12>>2]=c[d+12>>2];c[b+16>>2]=c[d+16>>2];c[b+20>>2]=c[d+20>>2];c[b+24>>2]=c[d+24>>2];c[b+28>>2]=c[d+28>>2];c[b+32>>2]=c[d+32>>2];c[b+36>>2]=c[d+36>>2];c[b+40>>2]=c[d+40>>2];c[b+44>>2]=c[d+44>>2];c[b+48>>2]=c[d+48>>2];c[b+52>>2]=c[d+52>>2];c[b+56>>2]=c[d+56>>2];c[b+60>>2]=c[d+60>>2];b=b+64|0;d=d+64|0}while((b|0)<(h|0)){c[b>>2]=c[d>>2];b=b+4|0;d=d+4|0}}else{h=g-4|0;while((b|0)<(h|0)){a[b>>0]=a[d>>0]|0;a[b+1>>0]=a[d+1>>0]|0;a[b+2>>0]=a[d+2>>0]|0;a[b+3>>0]=a[d+3>>0]|0;b=b+4|0;d=d+4|0}}while((b|0)<(g|0)){a[b>>0]=a[d>>0]|0;b=b+1|0;d=d+1|0}return f|0}function ac(a,b,c,d,e,f,g,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;return sa[a&1](b|0,c|0,d|0,e|0,f|0,g|0,h|0)|0}function bc(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;return ta[a&7](b|0,c|0,d|0)|0}function cc(a,b){a=a|0;b=b|0;ua[a&1](b|0)}function dc(a,b){a=a|0;b=b|0;return va[a&3](b|0)|0}function ec(a,b,c,d,e,f,g,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;wa[a&1](b|0,c|0,d|0,e|0,f|0,g|0,h|0)}function fc(a){a=a|0;xa[a&1]()}function gc(a,b,c,d,e,f,g,h,i){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;return ya[a&1](b|0,c|0,d|0,e|0,f|0,g|0,h|0,i|0)|0}function hc(a,b,c){a=a|0;b=b|0;c=c|0;return za[a&7](b|0,c|0)|0}function ic(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;V(0);return 0}function jc(a,b,c){a=a|0;b=b|0;c=c|0;V(1);return 0}function kc(a){a=a|0;V(2)}function lc(a){a=a|0;V(3);return 0}function mc(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;V(4)}function nc(){V(5)}function oc(a,b,c,d,e,f,g,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;V(6);return 0}function pc(a,b){a=a|0;b=b|0;V(7);return 0}

// EMSCRIPTEN_END_FUNCS
var sa=[ic,ib];var ta=[jc,Ib,Cb,lb,mb,Bb,jc,jc];var ua=[kc,kb];var va=[lc,Ab,jb,lc];var wa=[mc,rb];var xa=[nc,$a];var ya=[oc,ob];var za=[pc,tb,ub,vb,wb,xb,yb,pc];return{_sbrk:Zb,_fflush:Tb,_main:Ha,_process_data:Ja,_memset:_b,_malloc:Wb,_emscripten_get_global_libc:zb,_memcpy:$b,_setmode:Ia,_free:Xb,___errno_location:Eb,runPostSets:Yb,stackAlloc:Aa,stackSave:Ba,stackRestore:Ca,establishStackSpace:Da,setTempRet0:Fa,getTempRet0:Ga,setThrew:Ea,stackAlloc:Aa,stackSave:Ba,stackRestore:Ca,establishStackSpace:Da,setThrew:Ea,setTempRet0:Fa,getTempRet0:Ga,dynCall_iiiiiiii:ac,dynCall_iiii:bc,dynCall_vi:cc,dynCall_ii:dc,dynCall_viiiiiii:ec,dynCall_v:fc,dynCall_iiiiiiiii:gc,dynCall_iii:hc}})


// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg,Module.asmLibraryArg,buffer);var _malloc=Module["_malloc"]=asm["_malloc"];var getTempRet0=Module["getTempRet0"]=asm["getTempRet0"];var _fflush=Module["_fflush"]=asm["_fflush"];var _main=Module["_main"]=asm["_main"];var setTempRet0=Module["setTempRet0"]=asm["setTempRet0"];var _process_data=Module["_process_data"]=asm["_process_data"];var stackSave=Module["stackSave"]=asm["stackSave"];var _memset=Module["_memset"]=asm["_memset"];var _sbrk=Module["_sbrk"]=asm["_sbrk"];var establishStackSpace=Module["establishStackSpace"]=asm["establishStackSpace"];var _emscripten_get_global_libc=Module["_emscripten_get_global_libc"]=asm["_emscripten_get_global_libc"];var _memcpy=Module["_memcpy"]=asm["_memcpy"];var _setmode=Module["_setmode"]=asm["_setmode"];var stackAlloc=Module["stackAlloc"]=asm["stackAlloc"];var setThrew=Module["setThrew"]=asm["setThrew"];var _free=Module["_free"]=asm["_free"];var stackRestore=Module["stackRestore"]=asm["stackRestore"];var ___errno_location=Module["___errno_location"]=asm["___errno_location"];var runPostSets=Module["runPostSets"]=asm["runPostSets"];var dynCall_iiiiiiii=Module["dynCall_iiiiiiii"]=asm["dynCall_iiiiiiii"];var dynCall_iiii=Module["dynCall_iiii"]=asm["dynCall_iiii"];var dynCall_vi=Module["dynCall_vi"]=asm["dynCall_vi"];var dynCall_ii=Module["dynCall_ii"]=asm["dynCall_ii"];var dynCall_viiiiiii=Module["dynCall_viiiiiii"]=asm["dynCall_viiiiiii"];var dynCall_v=Module["dynCall_v"]=asm["dynCall_v"];var dynCall_iiiiiiiii=Module["dynCall_iiiiiiiii"]=asm["dynCall_iiiiiiiii"];var dynCall_iii=Module["dynCall_iii"]=asm["dynCall_iii"];Runtime.stackAlloc=Module["stackAlloc"];Runtime.stackSave=Module["stackSave"];Runtime.stackRestore=Module["stackRestore"];Runtime.establishStackSpace=Module["establishStackSpace"];Runtime.setTempRet0=Module["setTempRet0"];Runtime.getTempRet0=Module["getTempRet0"];Module["asm"]=asm;function ExitStatus(status){this.name="ExitStatus";this.message="Program terminated with exit("+status+")";this.status=status}ExitStatus.prototype=new Error;ExitStatus.prototype.constructor=ExitStatus;var initialStackTop;var preloadStartTime=null;var calledMain=false;dependenciesFulfilled=function runCaller(){if(!Module["calledRun"])run();if(!Module["calledRun"])dependenciesFulfilled=runCaller};Module["callMain"]=Module.callMain=function callMain(args){args=args||[];ensureInitRuntime();var argc=args.length+1;function pad(){for(var i=0;i<4-1;i++){argv.push(0)}}var argv=[allocate(intArrayFromString(Module["thisProgram"]),"i8",ALLOC_NORMAL)];pad();for(var i=0;i<argc-1;i=i+1){argv.push(allocate(intArrayFromString(args[i]),"i8",ALLOC_NORMAL));pad()}argv.push(0);argv=allocate(argv,"i32",ALLOC_NORMAL);try{var ret=Module["_main"](argc,argv,0);exit(ret,true)}catch(e){if(e instanceof ExitStatus){return}else if(e=="SimulateInfiniteLoop"){Module["noExitRuntime"]=true;return}else{var toLog=e;if(e&&typeof e==="object"&&e.stack){toLog=[e,e.stack]}Module.printErr("exception thrown: "+toLog);Module["quit"](1,e)}}finally{calledMain=true}};function run(args){args=args||Module["arguments"];if(preloadStartTime===null)preloadStartTime=Date.now();if(runDependencies>0){return}preRun();if(runDependencies>0)return;if(Module["calledRun"])return;function doRun(){if(Module["calledRun"])return;Module["calledRun"]=true;if(ABORT)return;ensureInitRuntime();preMain();if(Module["onRuntimeInitialized"])Module["onRuntimeInitialized"]();if(Module["_main"]&&shouldRunNow)Module["callMain"](args);postRun()}if(Module["setStatus"]){Module["setStatus"]("Running...");setTimeout((function(){setTimeout((function(){Module["setStatus"]("")}),1);doRun()}),1)}else{doRun()}}Module["run"]=Module.run=run;function exit(status,implicit){if(implicit&&Module["noExitRuntime"]){return}if(Module["noExitRuntime"]){}else{ABORT=true;EXITSTATUS=status;STACKTOP=initialStackTop;exitRuntime();if(Module["onExit"])Module["onExit"](status)}if(ENVIRONMENT_IS_NODE){process["exit"](status)}Module["quit"](status,new ExitStatus(status))}Module["exit"]=Module.exit=exit;var abortDecorators=[];function abort(what){if(what!==undefined){Module.print(what);Module.printErr(what);what=JSON.stringify(what)}else{what=""}ABORT=true;EXITSTATUS=1;var extra="\nIf this abort() is unexpected, build with -s ASSERTIONS=1 which can give more information.";var output="abort("+what+") at "+stackTrace()+extra;if(abortDecorators){abortDecorators.forEach((function(decorator){output=decorator(output,what)}))}throw output}Module["abort"]=Module.abort=abort;if(Module["preInit"]){if(typeof Module["preInit"]=="function")Module["preInit"]=[Module["preInit"]];while(Module["preInit"].length>0){Module["preInit"].pop()()}}var shouldRunNow=true;if(Module["noInitialRun"]){shouldRunNow=false}run()





},{"fs":1,"path":2}]},{},[4,5,6])(6)
});