/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports) {

	/* global AFRAME */

	if (typeof AFRAME === 'undefined') {
	  throw new Error('Component attempted to register before AFRAME was available.');
	}

	var bind = AFRAME.utils.bind;
	var trackedControlsUtils = AFRAME.utils.trackedControls;
	var THREE = AFRAME.THREE;

	var DAYDREAM_CONTROLLER_MODEL_OBJ_URL = 'https://raw.githubusercontent.com/TechnoBuddhist/VR-Controller-Daydream/master/vr_controller_daydream.obj';
	var DAYDREAM_CONTROLLER_MODEL_OBJ_MTL = 'https://raw.githubusercontent.com/TechnoBuddhist/VR-Controller-Daydream/master/vr_controller_daydream.mtl';

	var GAMEPAD_ID_PREFIX = 'Daydream Controller';

	/**
	 * Daydream Controller component for A-Frame.
	 */
	AFRAME.registerComponent('daydream-controller', {
	  /**
	   * Set if component needs multiple instancing.
	   */
	  multiple: false,

	  schema: {
	    buttonColor: {default: '#FAFAFA'},  // Off-white.
	    buttonTouchedColor: {default: 'yellow'},  // Light blue.
	    buttonPressedColor: {default: 'orange'},  // Light blue.
	    model: {default: true},
	    rotationOffset: {default: 0}, // use -999 as sentinel value to auto-determine based on hand
	    eyesToElbow: {default: {x: 0.175, y: -0.3, z: -0.03}}, // vector from eyes to elbow (divided by user height)
	    forearm: {default: {x: 0, y: 0, z: -0.175}}, // vector from eyes to elbow (divided by user height)
	    defaultUserHeight: {type: 'number', default: 1.6} // default user height (for cameras with zero)
	  },

	  // buttonId
	  // 0 - trackpad
	  mapping: {
	    axis0: 'trackpad',
	    axis1: 'trackpad',
	    button0: 'trackpad',
	    button1: 'menu',
	    button2: 'system'
	  },

	  /**
	   * Called once when component is attached. Generally for initial setup.
	   */
	  init: function () {
	    this.controllerPresent = false;
	    this.isControllerPresent = trackedControlsUtils.isControllerPresent; // to allow mock
	    this.buttonStates = {};
	    this.previousAxis = [];
	    this.onModelLoaded = bind(this.onModelLoaded, this);
	    this.checkIfControllerPresent = bind(this.checkIfControllerPresent, this);
	    this.onGamepadConnected = bind(this.onGamepadConnected, this);
	    this.onGamepadDisconnected = bind(this.onGamepadDisconnected, this);
	  },

	  tick: function (time, delta) {
	    if (!this.controller) return;
	    var mesh = this.el.getObject3D('mesh');
	    // Update mesh animations.
	    if (mesh && mesh.update) { mesh.update(delta / 1000); }
	    this.updatePose();
	    this.updateButtons();
	  },

	  /**
	   * Called when entity resumes.
	   * Use to continue or add any dynamic or background behavior such as events.
	   */
	  play: function () {
	    this.checkIfControllerPresent();
	    window.addEventListener('gamepadconnected', this.onGamepadConnected, false);
	    window.addEventListener('gamepaddisconnected', this.onGamepadDisconnected, false);
	  },

	  /**
	   * Called when entity pauses.
	   * Use to stop or remove any dynamic or background behavior such as events.
	   */
	  pause: function () {
	    window.removeEventListener('gamepadconnected', this.onGamepadConnected, false);
	    window.removeEventListener('gamepaddisconnected', this.onGamepadDisconnected, false);
	  },

	  /**
	   * Called when a component is removed (e.g., via removeAttribute).
	   * Generally undoes all modifications to the entity.
	   */
	  // TODO ... remove: function () { },

	  checkIfControllerPresent: function () {
	    var isPresent = this.isControllerPresent(this.el.sceneEl, GAMEPAD_ID_PREFIX, {});
	    if (isPresent === this.controllerPresent) { return; }
	    this.controllerPresent = isPresent;
	    if (isPresent) {
	      this.el.addEventListener('model-loaded', this.onModelLoaded);
	      this.controller = trackedControlsUtils.getGamepadsByPrefix(GAMEPAD_ID_PREFIX)[0];
	      if (!this.data.model) { return; }
	      this.el.setAttribute('obj-model', {
	        obj: DAYDREAM_CONTROLLER_MODEL_OBJ_URL,
	        mtl: DAYDREAM_CONTROLLER_MODEL_OBJ_MTL
	      });
	    } else {
	      this.controller = null;
	      this.el.removeAttribute('obj-model');
	      this.el.removeEventListener('model-loaded', this.onModelLoaded);
	    }
	  },

	  onGamepadConnected: function (evt) {
	    this.checkIfControllerPresent();
	  },

	  onGamepadDisconnected: function (evt) {
	    this.checkIfControllerPresent();
	  },

	  onModelLoaded: function (evt) {
	    var controllerObject3D = evt.detail.model;
	    var buttonMeshes;
	    if (!this.data.model) { return; }
	    buttonMeshes = this.buttonMeshes = {};
	    buttonMeshes.menu = controllerObject3D.getObjectByName('AppButton_AppButton_Cylinder.004');
	    buttonMeshes.system = controllerObject3D.getObjectByName('HomeButton_HomeButton_Cylinder.005');
	    buttonMeshes.trackpad = controllerObject3D.getObjectByName('TouchPad_TouchPad_Cylinder.003');
	    // Offset pivot point
	    controllerObject3D.position.set(0, 0, -0.04);
	  },

	  updateButtonModel: function (buttonName, state) {
	    var color = this.data.buttonColor;
	    if (state === 'touchstart' || state === 'up') {
	      color = this.data.buttonTouchedColor;
	    } else if (state === 'down') {
	      color = this.data.buttonPressedColor;
	    }
	    var buttonMeshes = this.buttonMeshes;
	    if (!buttonMeshes) { return; }
	    buttonMeshes[buttonName].material.color.set(color);
	  },

	  updatePose: (function () {
	    var offset = new THREE.Vector3();
	    var position = new THREE.Vector3();
	    var controllerQuaternion = new THREE.Quaternion();
	    var controllerEuler = new THREE.Euler(0, 0, 0, 'YXZ');
	    return function () {
	      var controller = this.controller;
	      var pose = controller.pose;
	      var el = this.el;
	      var camera = this.el.sceneEl.camera;
	      var cameraComponent = camera.el.components.camera;
	      var eyesToElbow = this.data.eyesToElbow;
	      var forearm = this.data.forearm;

	      // get camera position
	      position.copy(camera.el.object3D.position);

	      // set offset for degenerate "arm model" to elbow
	      offset.set(
		this.data.hand === 'left' ? -eyesToElbow.x : eyesToElbow.x, // hand is to your left, or right
	        eyesToElbow.y, // lower than your eyes
	        eyesToElbow.z); // slightly out in front
	      // scale offset by user height
	      offset.multiplyScalar(cameraComponent.data.userHeight || this.data.defaultUserHeight);
	      // apply camera Y rotation (not X or Z, so you can look down at your hand)
	      offset.applyAxisAngle(camera.el.object3D.up, camera.el.object3D.rotation.y);
	      // apply rotated offset to camera position
	      position.add(offset);

	      // set offset for degenerate "arm model" forearm
	      offset.set(forearm.x, forearm.y, forearm.z); // forearm sticking out from elbow
	      // scale offset by user height
	      offset.multiplyScalar(cameraComponent.data.userHeight || this.data.defaultUserHeight);
	      // apply controller X and Y rotation (tilting up/down/left/right is usually moving the arm)
	      controllerQuaternion.fromArray(pose.orientation || [0, 0, 0, 1]);
	      controllerEuler.setFromQuaternion(controllerQuaternion);
	      controllerEuler.set(controllerEuler.x, controllerEuler.y, 0);
	      offset.applyEuler(controllerEuler);
	      // apply rotated offset to camera position
	      position.add(offset);

	      // set as controller position
	      el.setAttribute('position', { x: position.x, y: position.y, z: position.z });

	      // set controller rotation directly from pose, if any (NO EULER!)
	      el.object3D.quaternion.copy(controllerQuaternion);
	    };
	  })(),

	  updateButtons: function () {
	    if (!this.controller) { return; }
	    this.handleTrackpadButton();
	    this.handleTrackpadGestures();
	  },

	  handleTrackpadGestures: function () {
	    var controllerAxes = this.controller.axes;
	    var previousAxis = this.previousAxis;
	    var changed = false;
	    var i;
	    for (i = 0; i < controllerAxes.length; ++i) {
	      if (previousAxis[i] !== controllerAxes[i]) {
	        changed = true;
	        break;
	      }
	    }
	    if (!changed) { return; }
	    this.previousAxis = controllerAxes.slice();
	    this.el.emit('axismove', {axis: this.previousAxis});
	  },

	  handleTrackpadButton: function () {
	    // handle all button states
	    var id = 0;
	    var buttonState = this.controller.buttons[id];
	    var changed = false;
	    changed = changed || this.handlePress(id, buttonState);
	    changed = changed || this.handleTrackpadTouch(id, buttonState);
	    if (!changed) { return; }
	    this.el.emit('buttonchanged', {id: id, state: buttonState});
	  },

	  handleMenuButton: function () {
	    // TODO: implement when Gamepad API starts returning menu button state
	  },

	  handleSystemButton: function () {
	    // TODO: implement when Gamepad API starts returning system button state
	  },

	  /**
	  * Determine whether a button press has occured and emit events as appropriate.
	  *
	  * @param {string} id - id of the button to check.
	  * @param {object} buttonState - state of the button to check.
	  * @returns {boolean} true if button press state changed, false otherwise.
	  */
	  handlePress: function (id, buttonState) {
	    var buttonStates = this.buttonStates;
	    var evtName;
	    var buttonName;
	    var previousButtonState = buttonStates[id] = buttonStates[id] || {};
	    if (buttonState.pressed === previousButtonState.pressed) { return false; }
	    if (buttonState.pressed) {
	      evtName = 'down';
	    } else {
	      evtName = 'up';
	    }
	    this.el.emit('button' + evtName, {id: id});
	    buttonName = this.mapping['button' + id];
	    this.updateButtonModel(buttonName, evtName);
	    previousButtonState.pressed = buttonState.pressed;
	    return true;
	  },

	  /**
	  * Determine whether a button touch has occured and emit events as appropriate.
	  *
	  * @param {string} id - id of the button to check.
	  * @param {object} buttonState - state of the button to check.
	  * @returns {boolean} true if button touch state changed, false otherwise.
	  */
	  handleTrackpadTouch: function (id, buttonState) {
	    var buttonStates = this.buttonStates;
	    var evtName;
	    var buttonName;
	    var previousButtonState = buttonStates[id] = buttonStates[id] || {};
	    if (buttonState.touched === previousButtonState.touched) { return false; }
	    if (buttonState.touched) {
	      evtName = 'start';
	    } else {
	      evtName = 'end';
	    }
	    previousButtonState.touched = buttonState.touched;
	    this.el.dispatchEvent(new CustomEvent('touch' + evtName, {
	      'touches': [], // avoid exception in TouchPanner due to namespace collision
	      'detail': {
	        id: id,
	        state: previousButtonState,
	        axis: this.controller.axes
	      }
	    }));
	    buttonName = this.mapping['button' + id];
	    this.updateButtonModel(buttonName, 'touch' + evtName);
	    return true;
	  }
	});


/***/ }
/******/ ]);