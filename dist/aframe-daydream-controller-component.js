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
/***/ function(module, exports, __webpack_require__) {

	/* global AFRAME */

	if (typeof AFRAME === 'undefined') {
	  throw new Error('Component attempted to register before AFRAME was available.');
	}

	var bind = AFRAME.utils.bind;
	var trackedControlsUtils = AFRAME.utils.trackedControls;

	var DAYDREAM_CONTROLLER_MODEL_OBJ_URL = 'https://cdn.aframe.io/controllers/vive/vr_controller_vive.obj';
	var DAYDREAM_CONTROLLER_MODEL_OBJ_MTL = 'https://cdn.aframe.io/controllers/vive/vr_controller_vive.mtl';

	var GAMEPAD_ID_PREFIX = 'Daydream Controller';

	/* grab smus' orientation arm model constructor */
	var OrientationArmModel = __webpack_require__(1).default;

	/**
	 * Daydream Controller component for A-Frame.
	 */
	AFRAME.registerComponent('daydream-controller', {

	  /**
	   * Set if component needs multiple instancing.
	   */
	  multiple: false,

	  schema: {
	    controller: {default: 0},
	    id: {default: 'Match none by default!'},
	    rotationOffset: {default: 0},
	    hand: {default: 'left'},
	    buttonColor: {default: '#FAFAFA'},  // Off-white.
	    buttonTouchedColor: {default: 'yellow'},  // Light blue.
	    buttonPressedColor: {default: 'orange'},  // Light blue.
	    model: {default: true},
	    rotationOffset: {default: 0}, // use -999 as sentinel value to auto-determine based on hand
	    gestureTimeoutLimit: {default: 100}, //if gesture doesn't complete within this timeframe, reset
	    gestureTolerance: {default: 0.2} //percentage of the trackpad a gesture must traverse
	  },

	  // buttonId
	  // 0 - trackpad
	  mapping: {
	    axis0: 'trackpad',
	    axis1: 'trackpad',
	    button0: 'trackpad',
	    // button1: 'menu',
	    // button2: 'system'
	  },

	  bindMethods: function () {
	    this.onModelLoaded = bind(this.onModelLoaded, this);
	    this.onControllersUpdate = bind(this.onControllersUpdate, this);
	    this.checkIfControllerPresent = bind(this.checkIfControllerPresent, this);
	    this.removeControllersUpdateListener = bind(this.removeControllersUpdateListener, this);
	    this.onGamepadConnected = bind(this.onGamepadConnected, this);
	    this.onGamepadDisconnected = bind(this.onGamepadDisconnected, this);
	  },

	  /**
	   * Called once when component is attached. Generally for initial setup.
	   */
	  init: function () {
	    var self = this;
	    this.animationActive = 'pointing';
	    this.onButtonChanged = bind(this.onButtonChanged, this);
	    this.onButtonDown = function (evt) { self.onButtonEvent(evt.detail.id, 'down'); };
	    this.onButtonUp = function (evt) { self.onButtonEvent(evt.detail.id, 'up'); };
	    this.onButtonTouchStart = function (evt) { self.onButtonEvent(evt.detail.id, 'touchstart'); };
	    this.onButtonTouchEnd = function (evt) { self.onButtonEvent(evt.detail.id, 'touchend'); };
	    this.onAxisMove = bind(this.onAxisMove, this);
	    this.controllerPresent = false;
	    this.everGotGamepadEvent = false;
	    this.lastControllerCheck = 0;
	    this.bindMethods();
	    this.isControllerPresent = trackedControlsUtils.isControllerPresent; // to allow mock
	    this.axisGestureTimeoutLimit = 100; //minimum
	    this.axisGestureVelocity = 100; // minimum velocity in %/ms
	    this.axisGestureThreshold = 0.1; // minimum % moved to recognize a gesture
	    this.buttonStates = {};
	    this.previousAxis = [];
	    this.previousControllerPosition = new THREE.Vector3();
	    this.armModel = new OrientationArmModel();
	  },

	  addEventListeners: function () {
	    var el = this.el;
	    el.addEventListener('buttonchanged', this.onButtonChanged);
	    el.addEventListener('buttondown', this.onButtonDown);
	    el.addEventListener('buttonup', this.onButtonUp);
	    el.addEventListener('touchstart', this.onButtonTouchStart);
	    el.addEventListener('axismove', this.onAxisMove);
	    el.addEventListener('touchend', this.onButtonTouchEnd);
	    el.addEventListener('model-loaded', this.onModelLoaded);
	  },

	  removeEventListeners: function () {
	    var el = this.el;
	    el.removeEventListener('buttonchanged', this.onButtonChanged);
	    el.removeEventListener('buttondown', this.onButtonDown);
	    el.removeEventListener('buttonup', this.onButtonUp);
	    el.removeEventListener('touchstart', this.onButtonTouchStart);
	    el.removeEventListener('axismove', this.onAxisMove);
	    el.removeEventListener('touchend', this.onButtonTouchEnd);
	    el.removeEventListener('model-loaded', this.onModelLoaded);
	  },

	  /**
	   * Called when a component is removed (e.g., via removeAttribute).
	   * Generally undoes all modifications to the entity.
	   */
	  // TODO ... remove: function () { },

	  getControllerIfPresent: function () {
	    // The 'Gear VR Touchpad' gamepad exposed by Carmel has no pose,
	    // so it won't show up in the tracked-controls system controllers.
	    var gamepads = this.getGamepadsByPrefix(GAMEPAD_ID_PREFIX);
	    if (!gamepads || !gamepads.length) { return undefined; }
	    return gamepads[0];
	  },

	  checkIfControllerPresent: function () {
	    var data = this.data;
	    var isPresent = this.isControllerPresent(this.el.sceneEl, GAMEPAD_ID_PREFIX, {});
	    if (isPresent === this.controllerPresent) { return; }
	    this.controllerPresent = isPresent;
	    if (isPresent) {
	      this.injectTrackedControls(); // inject track-controls
	      this.addEventListeners();
	    } else {
	      this.removeEventListeners();
	    }
	  },

	  onGamepadConnected: function (evt) {
	    // for now, don't disable controller update listening, due to
	    // apparent issue with FF Nightly only sending one event and seeing one controller;
	    // this.everGotGamepadEvent = true;
	    // this.removeControllersUpdateListener();
	    this.checkIfControllerPresent();
	  },

	  onGamepadDisconnected: function (evt) {
	    // for now, don't disable controller update listening, due to
	    // apparent issue with FF Nightly only sending one event and seeing one controller;
	    // this.everGotGamepadEvent = true;
	    // this.removeControllersUpdateListener();
	    this.checkIfControllerPresent();
	  },

	  tick: function () {
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
	    this.addControllersUpdateListener();
	  },

	  /**
	   * Called when entity pauses.
	   * Use to stop or remove any dynamic or background behavior such as events.
	   */
	  pause: function () {
	    window.removeEventListener('gamepadconnected', this.onGamepadConnected, false);
	    window.removeEventListener('gamepaddisconnected', this.onGamepadDisconnected, false);
	    this.removeControllersUpdateListener();
	    this.removeEventListeners();
	  },

	  injectTrackedControls: function () {
	    var el = this.el;
	    var data = this.data;
	    var objUrl = DAYDREAM_CONTROLLER_MODEL_OBJ_URL;
	    var mtlUrl = DAYDREAM_CONTROLLER_MODEL_OBJ_MTL;

	    this.controller = trackedControlsUtils.getGamepadsByPrefix(GAMEPAD_ID_PREFIX)[0]

	    // if we have an OpenVR Gamepad, use the fixed mapping
	    // el.setAttribute('tracked-controls', {id: GAMEPAD_ID_PREFIX, rotationOffset: data.rotationOffset});

	    if (!data.model) { return; }
	    el.setAttribute('obj-model', {obj: objUrl, mtl: mtlUrl});
	  },

	  addControllersUpdateListener: function () {
	    this.el.sceneEl.addEventListener('controllersupdated', this.onControllersUpdate, false);
	  },

	  removeControllersUpdateListener: function () {
	    this.el.sceneEl.removeEventListener('controllersupdated', this.onControllersUpdate, false);
	  },

	  onControllersUpdate: function () {
	    if (!this.everGotGamepadEvent) { this.checkIfControllerPresent(); }
	  },

	  onButtonChanged: function (evt) {
	    var button = this.mapping['button' + evt.detail.id];
	    var buttonMeshes = this.buttonMeshes;
	    var value;
	    value = evt.detail.state.value;
	  },

	  onAxisMove: function (evt) {
	    // this.axisPosition
	    //
	    console.log('axismove',evt.detail);
	    // this.lastAxisMovement = {
	    //   time: Date.now(),
	    //   x: 0,
	    //   y: 0
	    // }
	  },

	  onModelLoaded: function (evt) {
	    var controllerObject3D = evt.detail.model;
	    var buttonMeshes;
	    if (!this.data.model) { return; }
	    buttonMeshes = this.buttonMeshes = {};
	    buttonMeshes.menu = controllerObject3D.getObjectByName('menubutton');
	    buttonMeshes.system = controllerObject3D.getObjectByName('systembutton');
	    buttonMeshes.trackpad = controllerObject3D.getObjectByName('touchpad');
	    // Offset pivot point
	    controllerObject3D.position.set(0, -0.015, 0.04);
	  },

	  onButtonEvent: function (id, evtName) {
	    var buttonName = this.mapping['button' + id];
	    var i;
	    if (Array.isArray(buttonName)) {
	      for (i = 0; i < buttonName.length; i++) {
	        this.el.emit(buttonName[i] + evtName);
	      }
	    } else {
	      this.el.emit(buttonName + evtName);
	    }
	    this.updateModel(buttonName, evtName);
	  },

	  updateModel: function (buttonName, evtName) {
	    var i;
	    if (!this.data.model) { return; }
	    if (Array.isArray(buttonName)) {
	      for (i = 0; i < buttonName.length; i++) {
	        this.updateButtonModel(buttonName[i], evtName);
	      }
	    } else {
	      this.updateButtonModel(buttonName, evtName);
	    }
	  },

	  updateButtonModel: function (buttonName, state) {
	    var color = this.data.buttonColor;
	    if (state === 'touchstart' || state === 'up' ) {
	      color = this.data.buttonTouchedColor;
	    } else if (state === 'down') {
	      color = this.data.buttonPressedColor;
	    }
	    var buttonMeshes = this.buttonMeshes;
	    if (!buttonMeshes) { return; }
	    buttonMeshes[buttonName].material.color.set(color);
	  },

	  /*  */

	  updatePose: (function () {
	    var controllerEuler = new THREE.Euler();
	    var controllerPosition = new THREE.Vector3();
	    var controllerQuaternion = new THREE.Quaternion();
	    var deltaControllerPosition = new THREE.Vector3();
	    var dolly = new THREE.Object3D();
	    var standingMatrix = new THREE.Matrix4();
	    controllerEuler.order = 'YXZ';
	    return function () {
	      var pose;
	      var orientation;
	      var position;
	      var el = this.el;
	      var controller = this.controller;
	      if (!this.controller) { return; }
	      pose = controller.pose;
	      orientation = pose.orientation || [0, 0, 0, 1];
	      position = pose.position || [0, 0, 0];
	      var camera = this.el.sceneEl.camera;
	      controllerQuaternion.fromArray(orientation);
	      // Feed camera and controller into the arm model.
	      this.armModel.setHeadOrientation(camera.quaternion);
	      this.armModel.setHeadPosition(camera.position);
	      this.armModel.setControllerOrientation(controllerQuaternion);
	      this.armModel.update();
	      // Get resulting pose and configure the renderer.
	      var modelPose = this.armModel.getPose();
	      controllerEuler.setFromQuaternion(modelPose.orientation)
	      el.setAttribute('rotation', {
	        x: THREE.Math.radToDeg(controllerEuler.x),
	        y: THREE.Math.radToDeg(controllerEuler.y),
	        z: THREE.Math.radToDeg(controllerEuler.z) + this.data.rotationOffset
	      });
	      console.log(modelPose.position);
	      el.setAttribute('position', {
	        x: modelPose.position.x,
	        y: modelPose.position.y,
	        z: modelPose.position.z
	      });
	    }
	  })(),

	  updateButtons: function () {
	   var i;
	   var buttonState;
	   var controller = this.controller;
	   if (!this.controller) { return; }
	   for (i = 0; i < controller.buttons.length; ++i) {
	     buttonState = controller.buttons[i];
	     this.handleButton(i, buttonState);
	   }
	   this.handleAxes(controller.axes);
	 },

	 handleAxes: function (controllerAxes) {
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

	 handleButton: function (id, buttonState) {
	   var changed = false;
	   changed = changed || this.handlePress(id, buttonState);
	   changed = changed || this.handleTouch(id, buttonState);
	   changed = changed || this.handleValue(id, buttonState);
	   if (!changed) { return; }
	   this.el.emit('buttonchanged', {id: id, state: buttonState});
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
	   var previousButtonState = buttonStates[id] = buttonStates[id] || {};
	   if (buttonState.pressed === previousButtonState.pressed) { return false; }
	   if (buttonState.pressed) {
	     evtName = 'down';
	   } else {
	     evtName = 'up';
	   }
	   this.el.emit('button' + evtName, {id: id});
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
	 handleTouch: function (id, buttonState) {
	   var buttonStates = this.buttonStates;
	   var evtName;
	   var previousButtonState = buttonStates[id] = buttonStates[id] || {};
	   if (buttonState.touched === previousButtonState.touched) { return false; }
	   if (buttonState.touched) {
	     evtName = 'start';
	   } else {
	     evtName = 'end';
	   }
	   previousButtonState.touched = buttonState.touched;
	   this.el.emit('touch' + evtName, {id: id, state: previousButtonState});
	   return true;
	 },

	 /**
	  * Determine whether a button value has changed.
	  *
	  * @param {string} id - id of the button to check.
	  * @param {object} buttonState - state of the button to check.
	  * @returns {boolean} true if button value changed, false otherwise.
	  */
	 handleValue: function (id, buttonState) {
	   var buttonStates = this.buttonStates;
	   var previousButtonState = buttonStates[id] = buttonStates[id] || {};
	   if (buttonState.value === previousButtonState.value) { return false; }
	   previousButtonState.value = buttonState.value;
	   return true;
	 }
	});


/***/ },
/* 1 */
/***/ function(module, exports) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	/*
	 * Copyright 2016 Google Inc. All Rights Reserved.
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */

	var HEAD_ELBOW_OFFSET = new THREE.Vector3(0.155, -0.465, -0.15);
	var ELBOW_WRIST_OFFSET = new THREE.Vector3(0, 0, -0.25);
	var WRIST_CONTROLLER_OFFSET = new THREE.Vector3(0, 0, 0.05);
	var ARM_EXTENSION_OFFSET = new THREE.Vector3(-0.08, 0.14, 0.08);

	var ELBOW_BEND_RATIO = 0.4; // 40% elbow, 60% wrist.
	var EXTENSION_RATIO_WEIGHT = 0.4;

	var MIN_ANGULAR_SPEED = 0.61; // 35 degrees per second (in radians).

	/**
	 * Represents the arm model for the Daydream controller. Feed it a camera and
	 * the controller. Update it on a RAF.
	 *
	 * Get the model's pose using getPose().
	 */

	var OrientationArmModel = function () {
	  function OrientationArmModel() {
	    _classCallCheck(this, OrientationArmModel);

	    this.isLeftHanded = false;

	    // Current and previous controller orientations.
	    this.controllerQ = new THREE.Quaternion();
	    this.lastControllerQ = new THREE.Quaternion();

	    // Current and previous head orientations.
	    this.headQ = new THREE.Quaternion();

	    // Current head position.
	    this.headPos = new THREE.Vector3();

	    // Positions of other joints (mostly for debugging).
	    this.elbowPos = new THREE.Vector3();
	    this.wristPos = new THREE.Vector3();

	    // Current and previous times the model was updated.
	    this.time = null;
	    this.lastTime = null;

	    // Root rotation.
	    this.rootQ = new THREE.Quaternion();

	    // Current pose that this arm model calculates.
	    this.pose = {
	      orientation: new THREE.Quaternion(),
	      position: new THREE.Vector3()
	    };
	  }

	  /**
	   * Methods to set controller and head pose (in world coordinates).
	   */


	  _createClass(OrientationArmModel, [{
	    key: 'setControllerOrientation',
	    value: function setControllerOrientation(quaternion) {
	      this.lastControllerQ.copy(this.controllerQ);
	      this.controllerQ.copy(quaternion);
	    }
	  }, {
	    key: 'setHeadOrientation',
	    value: function setHeadOrientation(quaternion) {
	      this.headQ.copy(quaternion);
	    }
	  }, {
	    key: 'setHeadPosition',
	    value: function setHeadPosition(position) {
	      this.headPos.copy(position);
	    }
	  }, {
	    key: 'setLeftHanded',
	    value: function setLeftHanded(isLeftHanded) {
	      // TODO(smus): Implement me!
	      this.isLeftHanded = isLeftHanded;
	    }

	    /**
	     * Called on a RAF.
	     */

	  }, {
	    key: 'update',
	    value: function update() {
	      this.time = performance.now();

	      // If the controller's angular velocity is above a certain amount, we can
	      // assume torso rotation and move the elbow joint relative to the
	      // camera orientation.
	      var headYawQ = this.getHeadYawOrientation_();
	      var timeDelta = (this.time - this.lastTime) / 1000;
	      var angleDelta = this.quatAngle_(this.lastControllerQ, this.controllerQ);
	      var controllerAngularSpeed = angleDelta / timeDelta;
	      if (controllerAngularSpeed > MIN_ANGULAR_SPEED) {
	        // Attenuate the Root rotation slightly.
	        this.rootQ.slerp(headYawQ, angleDelta / 10);
	      } else {
	        this.rootQ.copy(headYawQ);
	      }

	      // We want to move the elbow up and to the center as the user points the
	      // controller upwards, so that they can easily see the controller and its
	      // tool tips.
	      var controllerEuler = new THREE.Euler().setFromQuaternion(this.controllerQ, 'YXZ');
	      var controllerXDeg = THREE.Math.radToDeg(controllerEuler.x);
	      var extensionRatio = this.clamp_((controllerXDeg - 11) / (50 - 11), 0, 1);

	      // Controller orientation in camera space.
	      var controllerCameraQ = this.rootQ.clone().inverse();
	      controllerCameraQ.multiply(this.controllerQ);

	      // Calculate elbow position.
	      var elbowPos = this.elbowPos;
	      elbowPos.copy(this.headPos).add(HEAD_ELBOW_OFFSET);
	      var elbowOffset = new THREE.Vector3().copy(ARM_EXTENSION_OFFSET);
	      elbowOffset.multiplyScalar(extensionRatio);
	      elbowPos.add(elbowOffset);

	      // Calculate joint angles. Generally 40% of rotation applied to elbow, 60%
	      // to wrist, but if controller is raised higher, more rotation comes from
	      // the wrist.
	      var totalAngle = this.quatAngle_(controllerCameraQ, new THREE.Quaternion());
	      var totalAngleDeg = THREE.Math.radToDeg(totalAngle);
	      var lerpSuppression = 1 - Math.pow(totalAngleDeg / 180, 4); // TODO(smus): ???

	      var elbowRatio = ELBOW_BEND_RATIO;
	      var wristRatio = 1 - ELBOW_BEND_RATIO;
	      var lerpValue = lerpSuppression * (elbowRatio + wristRatio * extensionRatio * EXTENSION_RATIO_WEIGHT);

	      var wristQ = new THREE.Quaternion().slerp(controllerCameraQ, lerpValue);
	      var invWristQ = wristQ.inverse();
	      var elbowQ = controllerCameraQ.clone().multiply(invWristQ);

	      // Calculate our final controller position based on all our joint rotations
	      // and lengths.
	      /*
	      position_ =
	        root_rot_ * (
	          controller_root_offset_ +
	      2:      (arm_extension_ * amt_extension) +
	      1:      elbow_rot * (kControllerForearm + (wrist_rot * kControllerPosition))
	        );
	      */
	      var wristPos = this.wristPos;
	      wristPos.copy(WRIST_CONTROLLER_OFFSET);
	      wristPos.applyQuaternion(wristQ);
	      wristPos.add(ELBOW_WRIST_OFFSET);
	      wristPos.applyQuaternion(elbowQ);
	      wristPos.add(this.elbowPos);

	      var offset = new THREE.Vector3().copy(ARM_EXTENSION_OFFSET);
	      offset.multiplyScalar(extensionRatio);

	      var position = new THREE.Vector3().copy(this.wristPos);
	      position.add(offset);
	      position.applyQuaternion(this.rootQ);

	      var orientation = new THREE.Quaternion().copy(this.controllerQ);

	      // Set the resulting pose orientation and position.
	      this.pose.orientation.copy(orientation);
	      this.pose.position.copy(position);

	      this.lastTime = this.time;
	    }

	    /**
	     * Returns the pose calculated by the model.
	     */

	  }, {
	    key: 'getPose',
	    value: function getPose() {
	      return this.pose;
	    }

	    /**
	     * Debug methods for rendering the arm model.
	     */

	  }, {
	    key: 'getForearmLength',
	    value: function getForearmLength() {
	      return ELBOW_WRIST_OFFSET.length();
	    }
	  }, {
	    key: 'getElbowPosition',
	    value: function getElbowPosition() {
	      var out = this.elbowPos.clone();
	      return out.applyQuaternion(this.rootQ);
	    }
	  }, {
	    key: 'getWristPosition',
	    value: function getWristPosition() {
	      var out = this.wristPos.clone();
	      return out.applyQuaternion(this.rootQ);
	    }
	  }, {
	    key: 'getHeadYawOrientation_',
	    value: function getHeadYawOrientation_() {
	      var headEuler = new THREE.Euler().setFromQuaternion(this.headQ, 'YXZ');
	      headEuler.x = 0;
	      headEuler.z = 0;
	      var destinationQ = new THREE.Quaternion().setFromEuler(headEuler);
	      return destinationQ;
	    }
	  }, {
	    key: 'clamp_',
	    value: function clamp_(value, min, max) {
	      return Math.min(Math.max(value, min), max);
	    }
	  }, {
	    key: 'quatAngle_',
	    value: function quatAngle_(q1, q2) {
	      var vec1 = new THREE.Vector3(0, 0, -1);
	      var vec2 = new THREE.Vector3(0, 0, -1);
	      vec1.applyQuaternion(q1);
	      vec2.applyQuaternion(q2);
	      return vec1.angleTo(vec2);
	    }
	  }]);

	  return OrientationArmModel;
	}();

	exports.default = OrientationArmModel;


/***/ }
/******/ ]);