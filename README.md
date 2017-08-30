# SpeakToMe

<!--
[![Version](http://img.shields.io/npm/v/speaktomejs.svg?style=flat-square)](https://npmjs.org/package/speaktomejs)
[![License](http://img.shields.io/npm/l/speaktomejs.svg?style=flat-square)](https://npmjs.org/package/speaktomejs)
-->

JavaScript module for Mozilla&#39;s SpeakToMe API.

## Installation

### Browser

Install and use by directly including the [browser files](dist):

```html
<head>
  <title>My Speech-enabled Web Page</title>
  <script src="stm.min.js"></script>
  <script src="webrtc_vad.js"></script>
</head>

<body>
<script>
var stm = SpeakToMe({
  listener: listener
});

function listener(msg) {
	console.log('listener', msg);---------------------------------------------------------------------
}
</script>
</body>
```
