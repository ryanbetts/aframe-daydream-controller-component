## aframe-daydream-controller-component

A daydream-controller component for [A-Frame](https://aframe.io).

### Usage

This component requires a Daydream compatible device with a Daydream controller.

If you do not have a Daydream compatible device or controller, you can still prototype
Daydream interactions using my remote emulator system called Dayframe: https://github.com/ryanbetts/dayframe

#### Device & Browser setup

1. You should have gone through the Daydream setup steps on your Daydream
compatible Android phone.
2. Download and install Chrome Beta 56: https://www.google.com/chrome/browser/beta.html
3. In Chrome Beta, navigate to `chrome://flags` and enable both WebVR and the Gamepad API.

You are now ready to drive your Aframe experience with the Daydream controller.

#### Activating the remote

In the regular 2D view of your page, the remote will not be connected. The
Gamepad API only observes the remote when you are in WebVR. Launch VR mode and
after everything has loaded you should see the controller in your scene.

#### Controller positioning and orientation

Because the remote doesn't have 6DOF positional tracking, we need to make an
educated guess about where it is positioned based on the orientation of the remote
and the hand you are holding it in. Otherwise, things feel awkward.

Right now, we are using the OrientationArmModel class from Boris Smus' (Google)
Ray Input library: https://github.com/borismus/ray-input/blob/master/src/orientation-arm-model.js

### API

| Property | Description | Default Value |
| -------- | ----------- | ------------- |
|          |             |               |

### Installation

#### Browser

Install and use by directly including the [browser files](dist):

```html
<head>
  <title>My A-Frame Scene</title>
  <script src="https://aframe.io/releases/0.4.0/aframe.min.js"></script>
  <script src="https://rawgit.com/ryanbetts/aframe-daydream-controller-component/master/dist/.min.js"></script>
</head>

<body>
  <a-scene>
    <a-entity daydream-controller></a-entity>
  </a-scene>
</body>
```

#### npm

Install via npm:

```bash
npm install aframe-daydream-controller-component
```

Then require and use.

```js
require('aframe');
require('aframe-daydream-controller-component');
```

### To do

+ Dayframe integration: let Dayframe work with this component for a better prototyping experience. ie. accept a stream from a dayframe socket connection instead of observing the gamepads. 
