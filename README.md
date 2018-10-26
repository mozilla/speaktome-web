# SpeakToMe API

[![Version](http://img.shields.io/npm/v/speaktome-api.svg?style=flat-square)](https://npmjs.org/package/speaktome-api)
[![License](http://img.shields.io/npm/l/speaktome-api.svg?style=flat-square)](https://npmjs.org/package/speaktome-api)

JavaScript module for Mozilla's SpeakToMe API.

## Installation

### Browser

Install and use by directly including the [browser files](build):

```html
<head>
  <title>My Speech-enabled Web Page</title>
  <script src="stm_web.min.js"></script>
</head>

<body>
<script>
	var stm = SpeakToMe({
		listener: listener
	});

	function listener(msg) {
		console.log('listener', msg);
	}
	stm.listen();
</script>
</body>
```
