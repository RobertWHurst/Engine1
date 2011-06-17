/* --------------------------------------------------
    ENGINE 1                            Version 0.04
   -------------------------------------------------- */

// ENGINE 1
function Engine1(args) {
	//use ES5
	"use strict";

	/* --------------------------------------------------
	    Core Configuration
	   -------------------------------------------------- */
	var config = jQuery.extend({
		"fps": 60,
		"debug": false,
		"paused": false,
		"blockOnFocusOut": false,
		"minHeight": 600,
		"minWidth": 800
	}, args);


	/* --------------------------------------------------
	    Core Variables
	   -------------------------------------------------- */
	//containers
	var scenes = {};
	var maps = {};
	var tiles = {};
	var sprites = {};
	var elements = {
		"global": {}
	};
	var hooks = {};
	var errors = [];
	var events = {};

	//environment
	var version = "0.04";
	var windowSize = [0, 0];
	var paused = false;
	var fps = 0;
	var iFps = 0;
	var mousePosition = [0, 0];
	var mouseDown = false;
	var container = jQuery('<div id="engine1"></div>');
	var laterIterator = 0;

	/* --------------------------------------------------
	    PREP ENVIRONMENT
	   -------------------------------------------------- */
	$('body').html('').append(container);

	/* --------------------------------------------------
	    JQUERY CHECK
	   -------------------------------------------------- */
	if (!jQuery || !jQuery.ui || jQuery.ui.version < "1.6.1" || jQuery().jquery < "1.6.1") {
		throwError('Engine1 failed to initialize. jQuery or jQueryUI is missing or out of date.');
	}

	/* --------------------------------------------------
	    CORE LOOP
	   -------------------------------------------------- */
	function CORELOOP(){
		// If the loop is paused, exit this cycle
		if (paused || config.paused){
			return;
		}
		//execute the loop hook
		hook('core-loop');
	} CORELOOP(); //first init at 0ms
	var CORELOOPTIMER = setInterval(CORELOOP, Math.ceil(1000 / config.fps));

	/* --------------------------------------------------
	    SECOND BASED LOOP
	   -------------------------------------------------- */
	//per second actions
	function SECLOOP() {
		// If the loop is paused, exit this cycle
		if (paused || config.paused){
			return;
		}
		//execute the loop hook
		hook('second-loop');
	} SECLOOP(); //first init at 0ms
	var SECLOOPTIMER = setInterval(SECLOOP, 1000);

	/* --------------------------------------------------
	    MOUSE MOVE EVENT
	   -------------------------------------------------- */
	jQuery(document).mousemove(function (event) {
		mousePosition = [event.pageX, event.pageY];
		hook('mousemove', event);
	});

	/* --------------------------------------------------
	    MOUSE DOWN EVENT
	   -------------------------------------------------- */
	jQuery(document).mousedown(function (event) {
		mouseDown = true;
		hook('mousedown', event);
	});

	/* --------------------------------------------------
	    MOUSE UP EVENT
	   -------------------------------------------------- */
	jQuery(document).mouseup(function(event){
		mouseDown = false;
		hook('mouseup', event);
	});

	/* --------------------------------------------------
	    WINDOW PROPERTIES
	   -------------------------------------------------- */
	action('core-loop', 'window-dim-counter', function(){
		windowSize = [
			container.width(),
			container.height()
		];
	});

	function getWindowSize() {
		return windowSize;
	}

	/* --------------------------------------------------
	    FRAME COUNT
	   -------------------------------------------------- */
	//create an frame count iterator
	action('core-loop', 'fps-counter', function () {
		//add the frame
		iFps += 1;
	});

	//per frame actions
	action('second-loop', 'fps-setter', function () {
		//set the fps
		//Note: convert from 0 based to 1 based.
		fps = iFps + 1;
		iFps = 0;
	});

	/* --------------------------------------------------
	    EVENT HANDLING
	   -------------------------------------------------- */
	(function eventHandler() {
		var eventTypes = {

			//click events
			"click": {
				"requiresMouseDown": true,
				"requiresAlphaCheck": false
			},
			"alphaclick": {
				"requiresMouseDown": true,
				"requiresAlphaCheck": true
			},

			//hover events
			"hover": {
				"requiresMouseDown": false,
				"requiresAlphaCheck": false
			},
			"alphahover": {
				"requiresMouseDown": false,
				"requiresAlphaCheck": true
			}
		};

		function checkAlpha(event) {

			//get the element
			var e = elements[event.sceneName][event.elementName];

			//get the minimum alpha
			var mA = event.minAlpha;

			//get the sprite sheet
			var s = sprites[e.spriteSheet];

			//get the element position
			var ePX = e.position[0];
			var ePY = e.position[1];

			//get the element size
			var ePW = e.size[0];
			var ePH = e.size[1];

			//get the mouse position
			var mPX = mousePosition[0];
			var mPY = mousePosition[1];

			//get the pixel row and col
			var col = mPX - ePX;
			var row = mPY - ePY;
			if(mPX < 0) col = 0;
			if(col > ePW - 1) col = ePW - 1;
			if(mPY < 0) row = 0;
			if(row > ePH - 1) row = ePH - 1;

			//get the current frame position
			var fP = e.sequence[e.currentFrame];

			//get the alphaMap
			var aM = s.alphaData[fP[0]][fP[1]];

			//get the pixel alpha
			var pA = aM[row][col];

			//return the result
			return (pA >= mA);

		}

		function isEvent(event) {

			//check for the event type given
			if(typeof eventTypes[event.type] !== "undefined"){
				var eventType = eventTypes[event.type];

				//check mouse down
				if (eventType.requiresMouseDown && !mouseDown) {
					return false;
				}

				//check alpha
				if (eventType.requiresAlphaCheck && !checkAlpha(event)) {
					return false;
				}

				//passed
				return true;
			}

			return false;

		}


		var currentEvents = {};
		function handleEvents() {

			for (var type in events) {
				if (events.hasOwnProperty(type)) {

					//set the current event
					var currentEvent = currentEvents[type] || false;

					//set cycle defaults
					var topZ = -1;
					var nextEvent = false;

					//loop the events registered
					for (var i = 0; i < events[type].length; i += 1) {

						//define/reset some loop vars
						var event = events[type][i];

						//get the element
						var element = elements[event.sceneName][event.elementName];

						//get the element limits
						var limits = [
							element.position[0],
							element.position[0] + element.size[0],
							element.position[1],
							element.position[1] + element.size[1]
						];

						//check the position of the mouse in relation to the limits of the event
						if (
							//mouse x
							(mousePosition[0] >= limits[0] && mousePosition[0] <= limits[1]) &&

							//mouse y
							(mousePosition[1] >= limits[2] && mousePosition[1] <= limits[3]) &&

							//element z
							(event.z > topZ) &&

							//event requirements
							isEvent(event)
						) {

							//set the new top z
							topZ = event.z;

							//set the event as next to run
							nextEvent = event;
						}
					}

					if (currentEvent.elementName !== nextEvent.elementName) {

						//fire the last callback of the current event
						if (currentEvent) {
							if(typeof currentEvent.callbacks[1] === "function") {
								currentEvent.callbacks[1]();
							} else if (typeof currentEvent.callbacks[0] === "function") {
								currentEvent.callbacks[0]();
							}
						}

						//make the next event the current event
						currentEvents[type] = currentEvent = nextEvent;

						//fire the first callback of the current event
						if (currentEvent && typeof currentEvent.callbacks[0] === "function" && typeof currentEvent.callbacks[1] === "function") {
							currentEvent.callbacks[0]();
						}
					}
				}
			}
		}

		action('mousedown', 'event-mousedown-handler', handleEvents);
		action('mouseup', 'event-mouseup-handler', handleEvents);
		action('mousemove', 'event-mousemove-handler', handleEvents);

	})();

	/* --------------------------------------------------
	    BLOCK ON FOCUS OUT
	   -------------------------------------------------- */
	function windowBlur(){
		paused = true;
		hook('window-blur');
	}function windowFocus(){
		hook('window-focus');
		paused = false;
	}
	if (config.blockOnFocusOut) {
		jQuery(document).bind('focus focusin', windowFocus);
		jQuery(document).bind('blur focusout', windowBlur);
	}

	/* --------------------------------------------------
	    DEBUGGER
	   -------------------------------------------------- */
	if (config.debug) {
		debug();
	}

	/* --------------------------------------------------
	    CLOSURE CONSTRUCTORS
	   -------------------------------------------------- */
	/**
	 * Creates a new Scene
	 * @param sceneName {string}
	 */
	function Scene(sceneName) {
		//create a new shadow DOM
		var scene = {
			"node": jQuery('<div id="scene-' + sceneName + '"></div>'),
			"position": [0, 0],
			"size": [0, 0, true, true],
			"CSS": {},
			"CSSUpdated": true,
			"onSetup": function(){},
			"onRun": function(){},
			"onExit": function(){}
		};

		scenes[sceneName] = scene;
		elements[sceneName] = {};
		maps[sceneName] = {};

		//add the scene to the dom
		container.append(scene.node);

		//add the name of the scene as a class
		addClass('scene ' + sceneName);

		action('core-loop', 'scene-DOM-' + sceneName, function () {

			//update css
			if (scene.CSSUpdated){
				scene.CSSUpdated = false;

				//check the size
				var fullWidth = scene.size[2];
				var fullHeight = scene.size[3];

				//reference the position
				var positionX = scene.position[0];
				var positionY = scene.position[1];
				var positionZ = scene.position[2];

				//if the size is full (useful for menus)
				if (fullWidth) {
					scene.size[0] = windowSize[0] + positionX;
					scene.CSSUpdated = true;

				//if not using full screen update the size based on size of the contents
				} else {
					scene.size[0] = scene.node.width();
				}
				
				//if the size is full (useful for menus)
				if (fullHeight) {
					scene.size[1] = windowSize[1] + positionY;
					scene.CSSUpdated = true;

				//if not using full screen update the size based on size of the contents
				} else {
					scene.size[0] = scene.node.height();
				}

				//calculate the element anchor
				var anchorX = 'left';
				var anchorY = 'top';

				//update the elements css
				scene.CSS = jQuery.extend(scene.customCSS, {
					"z-index": positionZ,
					"width": scene.size[0],
					"height": scene.size[1],
					"position": "absolute"
				});

				//clear conflicting anchors
				if (anchorX === "left") {
					delete scene.CSS["right"];
				} else {
					delete scene.CSS["left"];
				}
				if (anchorY === "top") {
					delete scene.CSS["bottom"];
				} else {
					delete scene.CSS["top"];
				}

				//set the anchor and the offset
				//NOTE: the x and y are negative because the scene is often bigger than the viewport
				scene.CSS[anchorX] = -positionX;
				scene.CSS[anchorY] = -positionY;

				//clear and re apply the css
				//TODO When a css engine is added replace below with the engine's generating function
				scene.node.attr('style', '').css(scene.CSS);

			}

			//fire the 'scene' hook
			hook('scene-' + sceneName);

		});

		/* --------------------------------------------------
		    SCENE STAGE CONTROL
		   -------------------------------------------------- */

		function setup(passedArguments) {

			//clone the base api
			var callbackApi = {
				"loadingScreen": newScreenElement,
				"newSpriteSheet": newSpriteSheet,
				"run": run,
				"exit": exit
			};

			scene.onSetup(callbackApi, passedArguments);

		}

		/**
		 * Advances to the 'run' stage of the scene
		 */
		function run(passedArguments) {

			var callbackApi = {
				"newElement": newElement,
				"newTextElement": newTextElement,
				"newStaticElement": newStaticElement,
				"newIsoMap": newIsoMap,
				"exit": exit
			};

			later(function(){
				scene.onRun(callbackApi, passedArguments);
			}, 1);
		}

		/**
		 * Advances to the 'exit' stage of the scene
		 */
		function exit(passedArguments) {

			var callbackApi = {
				//TODO Add useful api
			};

			scene.onExit(callbackApi, passedArguments);

			//delete the all actions for scene update
			clearHook('scene-' + sceneName);
			clearAction('core-loop', 'scene-DOM-' + sceneName);

			//delete the scene
			scene.node.remove();

			//clear the scene's data
			events = {};
			delete elements[sceneName];
			delete maps[sceneName];
			delete scenes[sceneName];

		}

		/* --------------------------------------------------
		    SCENE STAGE CALLBACKS
		   -------------------------------------------------- */

		/**
		 * Runs a callback for preparing a scene
		 * @param callback {function}
		 */
		function onSetup(callback) {
			if(typeof callback === "function"){
				scene.onSetup = callback;
			}
		}

		/**
		 * Runs a callback when running the scene
		 * @param callback {function}
		 */
		function onRun(callback) {
			if(typeof callback === "function"){
				scene.onRun = callback;
			}
		}

		/**
		 * Runs a callback when cleaning up the scene
		 * @param callback {function}
		 */
		function onExit(callback) {
			if(typeof callback === "function"){
				scene.onExit = callback;
			}
		}


		/* --------------------------------------------------
		    SCENE API CONSTRUCTOR FUNCTIONS
		   -------------------------------------------------- */
		function pan(x, y) {
			scene.CSS['left'] = '-' + x;
			scene.CSS['top'] = '-' + y;
			var limits = [x, y, x + scene.size[0], y + scene.size[1]];
			hook('scene-pan-' + sceneName, limits);
		};

		function size(w, h) {
			if (typeof w === "number") {
				scene.size[0] = w;
				scene.size[2] = false;
			} else if (w === "full") {
				scene.size[0] = 0;
				scene.size[2] = true;
			}
			if (typeof h === "number") {
				scene.size[1] = h;
				scene.size[3] = false;
			} else if (h === "full") {
				scene.size[1] = 0;
				scene.size[3] = true;
			}
			scene.CSSUpdated = true;
		}

		function position(z) {
			scene.CSS['z-index'] = '-' + z;
		}

		/**
		 * Adds a class to the element
		 * @param className
		 */
		function addClass(className) {
			later(function (){
				scene.node.addClass(className);
			}, 1);
		}

		/**
		 * Removes a class from the element
		 * @param className
		 */
		function removeClass(className) {
			later(function (){
				scene.node.removeClass(className);
			}, 1);
		}

		/**
		 *  Creates a new sprite sheet
		 * @param name {string}
		 * @param url {string}
		 * @param width {int}
		 * @param height {int}
		 * @param callback {function}
		 */
		function newSpriteSheet(name, url, width, height, callback) {

			//create and configure the spriteSheet
			var spriteSheet = SpriteSheet(name);
			spriteSheet.spriteSize(width, height);
			spriteSheet.loadImage(url, function(){

				//map the alpha and delete the queue record
				spriteSheet.mapAlpha();

				if (typeof callback === "function") {
					callback();
				}
			});

			//return the sprite sheet
			return spriteSheet;
		}

		/**
		 * Create a screen
		 * @param text
		 * @param logo
		 */
		function newScreenElement(html) {
			var loadingScreen = Element('global', 'loadingScreen');
			loadingScreen.size('full', 'full');
			loadingScreen.addClass('loadingScreen');
			loadingScreen.html(html);
			return loadingScreen;
		}

		function newElement(name, spriteSheet, position, size){

			//create the element and configure
			var element = Element(sceneName, name);
			element.sprite.sheet(spriteSheet);
			element.position(position[0], position[1]);
			element.size(size[0], size[1]);

			//return the element
			return element;
		}

		function newStaticElement(name, spriteUrl, position, size){

			//create the element and configure
			var staticElement = StaticElement(sceneName, name);
			staticElement.spriteUrl(spriteUrl);
			staticElement.position(position[0], position[1]);
			staticElement.size(size[0], size[1]);

			//return the element
			return staticElement;
		}

		function newTextElement(elementName, text, position, size, className) {
			var textElement = TextElement(sceneName, elementName);
			textElement.position(position[0], position[1]);
			textElement.size(size[0], size[1]);
			textElement.html(text);
			textElement.addClass(className);
			textElement.hover(function () {
				textElement.addClass('hover');
			}, function() {
				textElement.removeClass('hover');
			});
			return textElement;
		}

		function newIsoMap(name, position, cellSize, spriteSheetName) {

			//create the map
			var map = IsoMap(sceneName, name);

			//set the cell size
			map.position(position[0], position[1]);
			map.cellSize(cellSize[0], cellSize[1]);
			map.sprite.sheet(spriteSheetName);

			return map;

		}

		/**
		 * Returns the scene name.
		 */
		function name() {
			return sceneName;
		}

		//SCENE API
		return {
			"name": name,
			"init": setup,
			"pan": pan,
			"size": size,
			"position": position,
			"onSetup": onSetup,
			"onRun": onRun,
			"onExit": onExit,
			"addClass": addClass,
			"removeClass": removeClass
		}
	}

	/**
	 * Creates a new sprite sheet to animate elements with.
	 * @param spriteSheetName {string}
	 */
	function SpriteSheet(spriteSheetName) {
		//create a new sprite sheet entry
		sprites[spriteSheetName] = {
			"size": false,
			"image": false,
			"url": ''
		};

		function spriteSize(width, height){
			if (!sprites[spriteSheetName].size) {
				sprites[spriteSheetName].size = [width, height];
				return true;
			}
			return false;
		}

		function loadImage(url, callback) {
			if (!sprites[spriteSheetName].image) {

				//create the image and set its source
				var image = new Image();
				image.src = url;

				//save the image url
				sprites[spriteSheetName].url = url;

				//bind a load event
				jQuery(image).error(function(){
					image.url = false;
					throwError('Cannot load sprite image. invalid url "' + url + '"', 'warning');
				});
				jQuery(image).load(function () {
					//add the image and execute the callback
					sprites[spriteSheetName].image = image;
					if(typeof callback === "function"){
						callback();
					}
				});
				return true;
			}
			return false;
		}

		function mapAlpha() {

			//get the sprite
			var sprite = sprites[spriteSheetName];

			//make sure the sprite size and the image are defined
			if(sprite.size && sprite.image) {
				//create the canvas
				var canvas = document.createElement('canvas');
				var context = canvas.getContext('2d');

				//get the image
				var image = sprite.image;
				var spriteSize = sprite.size;

				//map the image size to the canvas
				canvas.width = image.width;
				canvas.height = image.height;

				//blit on the image
				context.drawImage(image, 0, 0, canvas.width, canvas.height);

				//get the total number of sprites per axis
				var spritesCountX = Math.floor(image.width / spriteSize[0]);
				var spritesCountY = Math.floor(image.height / spriteSize[1]);

				//loop through the sprites
				sprite.alphaData = [];
				for (var currentSpriteX = 0; currentSpriteX < spritesCountX; currentSpriteX += 1) {
					//make the sprite row array
					sprite.alphaData[currentSpriteX] = [];
					for (var currentSpriteY = 0; currentSpriteY < spritesCountY; currentSpriteY += 1) {
						//make the sprite column array
						sprite.alphaData[currentSpriteX][currentSpriteY] = [];

						//get the current sprite's image data
						var spritePositionX = spriteSize[0] * currentSpriteX;
						var spritePositionY = spriteSize[1] * currentSpriteY;
						var imageData = context.getImageData(spritePositionX, spritePositionY, spriteSize[0], spriteSize[1]).data;

						//extract the pixel data
						for (var pixelDataAlpha = 0; pixelDataAlpha < imageData.length; pixelDataAlpha += 4) {
							var pixel = pixelDataAlpha / 4;
							//get the current pixel position
							var row = Math.floor(pixel / spriteSize[0]);
							var col = pixel - (spriteSize[0] * row);
							//extract the pixel's alpha
							if(!sprite.alphaData[currentSpriteX][currentSpriteY][row]){
								sprite.alphaData[currentSpriteX][currentSpriteY][row] = [];
							}
							sprite.alphaData[currentSpriteX][currentSpriteY][row][col] = imageData[pixelDataAlpha + 3];
						}
					}
				}
				return true;
			}
			return false;
		}

		return {
			"spriteSize": spriteSize,
			"loadImage": loadImage,
			"mapAlpha": mapAlpha
		};
	}

	/**
	 * Creates a new element for a scene
	 * @param sceneName {string}
	 * @param elementName {string}
	 * @param tilePosition {object} [optional] inserts the element in a map instead of a scene
	 */
	function Element(sceneName, elementName, tilePosition) {

		if (typeof element !== "undefined") {
			throwError('Cannot create Element "' + elementName + '". It already exists', 'failure');
			return false;
		}

		var element = {
			"position": [0, 0, 0, false, false],
			"size": [0, 0, false, false],
			"customCSS": {},
			"CSS": {},
			"spriteSheet": false,
			"sequence": [[0, 0]],
			"interval": 1,
			"currentFrame": 0,
			"loop": false,
			"CSSUpdated": true,
			"node": jQuery('<div id="' + elementName + '"></div>'),
			"events": {}
		};

		//copy the element object into the element stack
		elements[sceneName][elementName] = element;

		var scene;
		var hookName;

		if (sceneName !== 'global') {
			scene = scenes[sceneName];
			scene.node.append(element.node);
			hookName = 'scene-' + sceneName;

		//add the element to the global scene
		} else {
			container.append(element.node);
			hookName = 'core-loop';
		}

		//create an element runtime
		action(hookName, 'element-' + elementName, function(){

			if (element.CSSUpdated){
				element.CSSUpdated = false;

				//check the size
				var fullWidth = element.size[2];
				var fullHeight = element.size[3];

				//if the size is full
				if (fullWidth) {
					element.size[0] = scene.size[0];
					element.CSSUpdated = true;
				}
				if (fullHeight) {
					element.size[1] = scene.size[1];
					element.CSSUpdated = true;
				}

				//check the centering
				var centerX = element.position[3];
				var centerY = element.position[4];

				//if the position is center
				if (centerX) {
					element.position[0] = Math.floor((scene.size[0] - element.size[0]) / 2);
					element.CSSUpdated = true;
				}
				if (centerY) {
					element.position[1] = Math.floor((scene.size[1] - element.size[1]) / 2);
					element.position[1] = Math.floor((scene.size[1] - element.size[1]) / 2);
					element.CSSUpdated = true;
				}

				//calculate the element anchor
				var anchorX = 'left';
				var anchorY = 'top';
				var positionX = element.position[0];
				var positionY = element.position[1];
				var positionZ = element.position[2];

				//if the position is negative then convert it to bottom or right based positioning
				//Note: -1 is converted to 0 from the right or left.
				if (positionX < 0) {
					positionX = -(positionX + 1);
					anchorX = 'right';
				}
				if (positionY < 0) {
					positionY = -(positionY + 1);
					anchorY = 'bottom';
				}

				//update the elements css
				//elements[elementName].CSS = jQuery.extend(elements[elementName].customCSS, {
				element.CSS = jQuery.extend(element.customCSS, {
					"z-index": positionZ,
					"width": element.size[0],
					"height": element.size[1],
					"position": "absolute"
				});

				if (anchorX === "left") {
					delete element.CSS["right"];
				} else {
					delete element.CSS["left"];
				}
				if (anchorY === "top") {
					delete element.CSS["bottom"];
				} else {
					delete element.CSS["top"];
				}


				element.CSS[anchorX] = positionX;
				element.CSS[anchorY] = positionY;

				jQuery(element.node).attr('style', '').css(element.CSS);
			}
		});

		/**
		 * Returns the name of the element
		 */
		function name() {
			return elementName;
		}

		/**
		 * Returns the name of the element's scene
		 */
		function scene() {
			return sceneName;
		}

		/**
		 * Returns the element's node
		 */
		function node() {
			return element.node;
		}

		/**
		 * Sets the element's coordinates
		 * @param x {int}
		 * @param y {int}
		 * @param z {int} [optional]
		 */
		function position(x, y, z){
			var bool = false;

			//check for centering
			if(x === "center"){
				element.position[3] = true;
			}
			if(y === "center"){
				element.position[4] = true;
			}

			//check for valid positioning
			if(typeof x === "number") {
				element.position[0] = x;
				bool = true;
			}
			if(typeof y === "number") {
				element.position[1] = y;
				bool = true;
			}
			if(typeof z === "number") {
				element.position[2] = z;
				bool = true;
			}

			element.CSSUpdated = bool || element.CSSUpdated;

			//if 'bool' is true return true, else return the element's position
			return (bool || element.position);
		}

		/**
		 * Sets the element's size
		 * @param width {int}
		 * @param height {int}
		 */
		function size(width, height){
			var bool = false;
			if (width === "full") {
				element.size[2] = true;
			}
			if (height === "full") {
				element.size[3] = true;
			}
			if (typeof width === "number" || width === 'auto') {
				element.size[0] = width;
				bool = true;
			}
			if (typeof height === "number" || height === 'auto') {
				element.size[1] = height;
				bool = true;
			}
			element.CSSUpdated = bool || element.CSSUpdated;
			//if 'bool' is true return true, else return the element's position
			return (bool || element.size);
		}

		/**
		 * Adds custom CSS rules to the element
		 *
		 * Note: Overriding position and size is not possible.
		 *
		 * @param cssObject {object|string}
		 * @param value {int|string} [optional]
		 */
		function css(cssObject, value) {
			if(typeof cssObject === "string" || typeof cssObject === "object") {
				//check for string input or object input
				if (typeof cssObject === "string") {
					element.customCSS[cssObject] = value
				} else {
					element.customCSS = jQuery.extend(element.customCSS, cssObject);
				}
				element.CSSUpdated = true;
				return true;
			}
			return false;
		}

		/**
		 * Adds a class to the element
		 * @param className
		 */
		function addClass(className) {
			later(function (){
				element.node.addClass(className);
			}, 1);
		}

		/**
		 * Removes a class from the element
		 * @param className
		 */
		function removeClass(className) {
			later(function (){
				element.node.removeClass(className);
			}, 1);
		}

		/**
		 * Injects html in to element
		 * @param html {string}
		 */
		function html(html){
			if (typeof html === "string") {
				element.node.html(html);
			}
		}

		function spriteAnimate(sequence, interval, loop) {

			var sequence = sequence || element.sequence;
			var interval = interval || 0;
			var loop = loop || 0;

			var i = 0;
			var fI = 0;
			var lastBGUrl = '';
			var lastBGPosition = [];
			var actionId = 'sprite-animation-element-' + elementName;

			//create the animation
			action(hookName, actionId, function (api) {

				//get the element and its sprite
				var sprite = sprites[element.spriteSheet];

				if(i < interval) {
					i += 1;
				} else {
					if(fI < sequence.length){

						//get the current frame
						var cF = sequence[fI];

						//get the frame x and y
						var pos = [
							sprite.size[0] * cF[0],
							sprite.size[1] * cF[1]
						];

						//get the background url
						var BGUrl = sprite.url;

						if (lastBGUrl !== BGUrl) {
							element.CSS['background'] = 'url(' + BGUrl + ')';
							element.CSSUpdated = true;
							lastBGUrl = BGUrl;
						}

						if (lastBGPosition !== pos) {
							element.CSS['background-position'] = '-' + pos[0] + 'px -' + pos[1] + 'px';
							element.CSSUpdated = true;
							lastBGPosition = pos;
						}

						fI += 1;
					} else {
						if (loop) {
							fI = 0;
						} else {
							clearAction(hookName, actionId);
						}
					}
					i = 0;
				}

			});

			return true;
		}

		function spriteSheet(spriteName) {
			//find the sprite
			if (typeof sprites[spriteName] !== "undefined") {
				element.spriteSheet = spriteName;
				element.CSS['background'] = 'url(' + sprites[spriteName].url + ')';
			}
		}

		function motionSequence(sequence, frameInterval, callback, useRelativeMotion) {

			var i = 0;
			var iF = 0;

			//create an action for the tween
			action(hookName, 'motion-sequence-' + elementName, function (api) {

				if(i < frameInterval) {
					i += 1;
				} else {

					//grab the current frame
					var frame = sequence[iF];

					var xy = [];

					//calculate the new position of the element
					if (useRelativeMotion) {

						//get the current position before the current frame is applied
						var _xy = element.position;

						//calculate the new pos
						xy = [
							_xy[0] + frame[0],
							_xy[1] + frame[1]
						];

						//if supplied add the z-index
						if (frame[2]) {
							xy[2] = _xy[2] + frame[2];
						}

					} else {
						//calculate the new position
						xy = frame;
					}

					//move the elements position
					element.position[0] = xy[0];
					element.position[1] = xy[1];
					element.position[2] = xy[2];

					if (iF + 1 < sequence.length) {
						//advance the current frame
						iF += 1;
					} else {
						//kill the process
						clearAction(hookName, 'motion-sequence-' + elementName);

						//run the call back
						if (typeof callback === "funtion") {
							callback();
						}
					}
					i = 0;
				}

			});
		}

		function motionTween(finalPosition, tweenDuration, callback) {

			var framesLeft = tweenDuration;

			//if center or centered
			if(finalPosition[0] === 'center'){
				finalPosition[0] = (scene.size[0] - element.size[0]) / 2;
			}
			if(finalPosition[1] === 'center'){
				finalPosition[1] = (scene.size[1] - element.size[1]) / 2;
			}

			//create a process
			action(hookName, 'motion-tween-' + elementName, function (api) {

				var distance = [];

				//calculate each axis
				for (var i = 0; i < 3; i += 1) {
					//find the total distance to travel in the remaining frames
					//NOTE: end coords minus current coords
					var totalDistance = (finalPosition[i] || 0) - element.position[i];

					//find the distance to travel this frame in this axis
					distance[i] = Math.round( totalDistance / framesLeft ) + element.position[i];
				}

				//apply the new location
				element.position[0] = distance[0];
				element.position[1] = distance[1];
				element.position[2] = distance[2];
				element.CSSUpdated = true;

				if ( framesLeft > 1 ) {
					//remove one frame from the frameLength
					framesLeft -= 1;
				} else {

					//kill the process
					clearAction(hookName, 'motion-tween-' + elementName);

					//run the callback
					if (callback) {
						callback();
					}
				}
			});
		}

		function bind(type, callback1, callback2, minAlpha) {
			//check the arguments
			if (
				type === "click" ||
				type === "hover" ||
				type === "alphaclick" ||
				type === "alphahover"
			) {
				if (typeof events[type] === "undefined") events[type] = [];
				events[type].push({
					"elementName": elementName,
					"sceneName": sceneName,
					"type": type,
					"minAlpha": minAlpha || 255,
					"z": element.position[2],
					"callbacks": [callback1, callback2]
				});
			}
		}

		//bind a click event
		function click(callback1, callback2) {
			bind('click', callback1, callback2);
		}

		//bind a hover event
		function hover(callback1, callback2) {
			bind('hover', callback1, callback2);
		}

		//bind a alpha click event
		function alphaClick(minAlpha, callback1, callback2) {
			bind('alphaclick', callback1, callback2, minAlpha);
		}

		//bind a alpha hover event
		function alphaHover(minAlpha, callback1, callback2) {
			bind('alphahover', callback1, callback2, minAlpha);
		}

		function unbind(type) {
			var bool = false;
			if (
				event === "hover" ||
				event === "click" ||
				event === "alphahover" ||
				event === "alphaclick"
			) {
				for(var i = 0; i < events.length; i += 1) {
					if (events[i].elementName === elementName && events[i].type === type) {
						delete events[i];
						bool = true;
					}
				}
			}
			return bool;
		}

		/**
		 * Remove the element
		 */
		function remove() {

			// remove the element's events
			for(var i = 0; i < events.length; i += 1) {
				if (events[i].elementName === elementName) {
					delete events[i];
				}
			}

			//remove actions for the element
			clearAction('scene-' + hookName, 'add-class-element-' + elementName);
			clearAction('scene-' + hookName, 'remove-class-element-' + elementName);
			clearAction('scene-' + hookName, 'element-' + elementName);
			clearAction('scene-' + hookName, 'sprite-animation-element-' + elementName);
			clearAction('scene-' + hookName, 'motion-tween-' + elementName);
			clearAction('scene-' + hookName, 'motion-sequence-' + elementName);

			//remove the element's node
			element.node.remove();

			//delete the element's data object
			delete elements[sceneName][elementName];
		}

		// ELEMENT API
		var elementAPI = {
			"name": name,
			"scene": scene,
			"node": node,
			"position": position,
			"size": size,
			"css": css,
			"addClass": addClass,
			"removeClass": removeClass,
			"html": html,
			"sprite": {
				"sheet": spriteSheet,
				"animate": spriteAnimate
			},
			"motion": {
				"sequence": motionSequence,
				"tween": motionTween
			},
			"bind": bind,
			"click": click,
			"alphaClick": alphaClick,
			"hover": hover,
			"alphaHover": alphaHover,
			"unbind": unbind,
			"remove": remove
		};

		// ELEMENT HOOKS
		hook('create-element', elementAPI);
		hook('create-element-' + elementName, elementAPI);

		return elementAPI;
	}

	/**
	 * Creates a global element for containing debug info
	 * @param elementName
	 */
	function DebugElement(elementName){
		//create the element
		var debugElement = Element('global', 'debug-' + elementName);

		//set the properties
		debugElement.size('auto', 'auto');
		debugElement.addClass('debugElement');

		//DEBUG ELEMENT API
		return {
			"position": debugElement.position,
			"html": debugElement.html
		}
	}

	/**
	 * Creates a global element for containing debug info
	 * @param elementName
	 */
	function StaticElement(sceneName, elementName){
		//create the element
		var staticElement = Element(sceneName, elementName);

		function spriteUrl (url) {
			staticElement.css('background', 'url(' + url + ')');
		}

		function spritePosition (x, y) {
			var size = staticElement.size();
			staticElement.css('background-position', '-' + (x * size[0]) + 'px -' + (y * size[1]) + 'px');
		}

		//STATIC ELEMENT API
		return {
			"size": staticElement.size,
			"position": staticElement.position,
			"bind": staticElement.bind,
			"click": staticElement.click,
			"hover": staticElement.hover,
			"unbind": staticElement.unbind,
			"spriteUrl": spriteUrl,
			"spritePosition": spritePosition,
			"css": staticElement.css
		}
	}

	/**
	 * Creates a text element
	 * @param sceneName
	 * @param elementName
	 */
	function TextElement(sceneName, elementName) {
		var textElement = Element(sceneName, 'text-' + elementName);
		return {
			"html": textElement.html,
			"size": textElement.size,
			"position": textElement.position,
			"addClass": textElement.addClass,
			"removeClass": textElement.removeClass,
			"hover": textElement.hover,
			"click": textElement.click
		};
	}


	/* --------------------------------------------------
	    ISO MAPS
	   -------------------------------------------------- */

	/**
	 * Create an isometric map
	 * @param sceneName
	 * @param name
	 */
	function IsoMap (sceneName, mapName) {

		//create a new map object
		var map = {
			//x, y, z
			"position": [0, 0, 0],
			//w, h
			"cellSize": [0, 0],
			"spriteSheetName": '',
			"node": jQuery('<div id="iso-map-' + mapName + '"></div>'),
			"rotation": 0,
			"CSS": {},
			"customCSS": {},
			"CSSUpdated": true,
			"tilesUpdated": false
		};

		maps[sceneName][mapName] = map;

		scenes[sceneName].node.append(map.node);

		//fill the tiles in view
		//TODO: Only load tiles in view
		//action('scene-pan', 'map-fill-tiles', function (limits) {

		//});

		//create an update loop
		action('scene-' + sceneName, 'map', function () {

			if (map.CSSUpdated) {
				map.CSSUpdated = false;

				//calculate the element anchor
				var anchorX = 'left';
				var anchorY = 'top';
				var positionX = map.position[0];
				var positionY = map.position[1];
				var positionZ = map.position[2];

				//if the position is negative then convert it to bottom or right based positioning
				//Note: -1 is converted to 0 from the right or left.
				if (positionX < 0) {
					positionX = -(positionX + 1);
					anchorX = 'right';
				}
				if (positionY < 0) {
					positionY = -(positionY + 1);
					anchorY = 'bottom';
				}

				//update the elements css
				map.CSS = jQuery.extend(map.customCSS, {
					"z-index": positionZ,
					"position": "absolute"
				});

				if (anchorX === "left") {
					delete map.CSS["right"];
				} else {
					delete map.CSS["left"];
				}
				if (anchorY === "top") {
					delete map.CSS["bottom"];
				} else {
					delete map.CSS["top"];
				}

				map.CSS[anchorX] = positionX;
				map.CSS[anchorY] = positionY;

				map.node.attr('style', '').css(map.CSS);
			}

			//execute the map hook
			hook('map');

		});

		/* --------------------------------------------------
		    Tile Related
		   -------------------------------------------------- */

		/**
		 * Retrieve a tile by its grid position
		 * @param x {int}
		 * @param y {int}
		 * @param z {int}
		 */
		function getTile(x, y, z) {
			return tiles[sceneName][mapName][x][y][z];
		}

		/**
		 * Set a tile's css.
		 * @param x {int}
		 * @param y {int}
		 * @param z {int}
		 * @param css {object} An object containing the css properties and their values, or a css property name
		 * @param value {string|int} [optional]
		 */
		function tileCSS(x, y, z, css, value) {
			var tile = getTile(x, y, z);
			if (typeof css === "string") {
				tile.CSS[css] = value;
			} else {
				for (var property in css) {
					if (css.hasOwnProperty(property)) {
						tile.CSS[property] = css[property];
					}
				}
			}
			tile.CSSUpdated = true;
		}

		/**
		 * Set the position of a tile's sprite in its sprite sheet
		 * @param x {int}
		 * @param y {int}
		 * @param z {int}
		 * @param spritePos {object} an array containing the x and y of the sprite
		 */
		function tileSpritePosition(x, y, z, spritePos) {
			z = z || 0;
			var tile = getTile(x, y, z);
			tile.spritePosition = spritePos;
			tile.CSSUpdated = true;
		}


		/* --------------------------------------------------
		    Map Related
		   -------------------------------------------------- */

		/**
		 *  Set the map position.
		 * @param x {int}
		 * @param y {int}
		 */
		function position(x, y) {
			map.position = [x, y];
		}

		/**
		 * Set the cell size
		 * @param w {int}
		 * @param h {int}
		 */
		function cellSize(w, h) {
			map.cellSize = [w, h];
		}

		/**
		 * Set the map limits
		 * @param size {object}
		 * @param startPosition {object}
		 */
		function tileCreate(size, startPosition) {

			if(!size[2]) size[2] = 1;

			var x = startPosition[0];
			var y = startPosition[1];
			var z = startPosition[2] || 0;

			//get the sprite sheet
			var spriteSheet = sprites[maps[mapName].spriteSheetName];

			for (var zI = 0; zI < size[2]; zI += 1) {
				for (var yI = 0; yI < size[1]; yI += 1) {
					for (var xI = 0; xI < size[0]; xI += 1) {
						var tile = IsoTile(sceneName, mapName, [x + xI, y + yI, z + zI]);

						//set the background
						tile.CSS["background"] = 'url(' + spriteSheet.url + ')';
						tile.CSS["width"] = map.cellSize[0] + "px";
						tile.CSS["height"] = map.cellSize[1] + "px";
						tile.CSSUpdated = true;

					}
				}
			}
		}

		/**
		 * Set the sprite sheet for the tiles
		 * @param spriteSheetName {string}
		 */
		function spriteSheet(spriteSheetName) {
			map.spriteSheetName = spriteSheetName;
		}

		//add the map to the maps object
		maps[mapName] = map;

		//return API
		return {
			"position": position,
			"cellSize": cellSize,
			"tile": {
				"create": tileCreate,
				"css": tileCSS
			},
			"sprite": {
				"sheet": spriteSheet
			}
		}
	}

	/**
	 * Creates an isometric tile in a map
	 * @param sceneName {string}
	 * @param mapName {string}
	 * @param gridPos {object} an array containing the x and y position
	 */
	function IsoTile(sceneName, mapName, gridPos) {

		//define a tile name for conversation sake
		var tileName = gridPos[0] + '-' + gridPos[1] + '-' + gridPos[2];

		//create tile
		var tile = {
			//x, y, map layer
			"gridPosition": gridPos,
			//sprite x, y
			"spritePosition": [0, 0],
			//nw, ne, sw, se, above, below
			"neighbors": [false, false, false, false],
			"node": jQuery('<div id="iso-tile-' + tileName + '"></div>'),
			"CSSUpdated": true,
			"CSS": {},
			"data": {}
		};

		var map = maps[sceneName][mapName];
		map.node.append(tile.node);
		map.tilesUpdated = true;

		//run the tile update every map update
		action('map', 'tile-' + tileName, function () {

			//update the css
			if (tile.CSSUpdated) {
				jQuery(tile.node).css(tile.CSS);
				map.tilesUpdated = false;
			}

			//check for neighbor tiles
			var tileNPos = [
				//nw
				[gridPos[0], gridPos[1] - 1, gridPos[2]],
				//ne
				[gridPos[0] - 1, gridPos[1], gridPos[2]],
				//sw
				[gridPos[0] + 1, gridPos[1], gridPos[2]],
				//se
				[gridPos[0], gridPos[1] + 1, gridPos[2]],
				//above
				[gridPos[0], gridPos[1], gridPos[2] + 1],
				//below
				[gridPos[0], gridPos[1], gridPos[2] - 1]
			];

			//find/update the references to neighboring tiles
			for (var i = 0; i < 6; i += 1) {
				//get the current position
				var naPos = tileNPos[i];
				//see if there is a tile available
				if (
					tiles[sceneName] &&
					tiles[sceneName][mapName] &&
					tiles[sceneName][mapName][naPos[0]] &&
					tiles[sceneName][mapName][naPos[0]][naPos[1]] &&
					tiles[sceneName][mapName][naPos[0]][naPos[1]][naPos[2]]
				) {
					//get the neighbor and stash it
					tile.neighbors[i] = tiles[sceneName][mapName][naPos[0]][naPos[1]][naPos[2]];
				} else {
					tile.neighbors[i] = false;
				}
			}

			//call the actions for the tile
			hook('tile-' + tileName);
		});

		//build the tile's data structure if missing
		if (!tiles[sceneName]) {
			tiles[sceneName] = {};
		}
		if (!tiles[sceneName][mapName]) {
			tiles[sceneName][mapName] = [];
		}
		if (!tiles[sceneName][mapName][gridPos[0]]) {
			tiles[sceneName][mapName][gridPos[0]] = [];
		}
		if (!tiles[sceneName][mapName][gridPos[0]][gridPos[1]]) {
			tiles[sceneName][mapName][gridPos[0]][gridPos[1]] = [];
		}

		//add the tile to the tile stack and return it
		tiles[sceneName][mapName][gridPos[0]][gridPos[1]][gridPos[2]] = tile;
		
		return tile;
	}

	/* --------------------------------------------------
	    Functions
	   -------------------------------------------------- */
	/**
	 * Displays information about engine 1 in screen
	 */
	function debug () {

		(function fpsElement() {
			//create the fps element
			var FPSElement = DebugElement('fps');
			FPSElement.position(20, 20, 1000000);
			FPSElement.html('<h1>FPS ' + config.fps + '=>?</h1>');
			action('second-loop', 'debug-fps-OSD', function () {
				//update the fps counter
				FPSElement.html('<h1>FPS ' + config.fps + '=>' + fps + '</h1>');
			});
			action('window-blur', 'debug-fps-blur-handler', function () {
				FPSElement.html('<h1>FPS 0=>PAUSED</h1>');
			});
		})();

		(function hooksElement() {

			//creates html list tree of all system actions and hooks
			function buildHtml() {
				var title = '<h1>System Hooks</h1>\n';
				var tableHead = '<thead><tr><td>Hook Name</td><td>Action Name</td></tr></thead>\n';

				//loop through the hooks
				var rows = '';
				for (var hookName in hooks) {
					var hook = hooks[hookName];

					//loop through the action stack
					var iA = 0;
					for (var ActionName in hook) {
						var action = hook[ActionName];


						//hook's row
						if ( iA < 1) {
							rows += '<tr><td class="hook">' + hookName + '</td><td class="action first">' + ActionName + '</td></tr>\n';
						} else {
							rows += '<tr><td></td><td class="action">' + ActionName + '</td></tr>\n';
						}

						iA += 1;
					}
				}

				return title + '<table class="hooks">' + tableHead + rows + '</table>';
			}

			//create the hooks element
			var hooksElement = DebugElement('hooks');
			hooksElement.position(-20, -20, 1000000);
			action('second-loop', 'debug-hooks', function () {
				//update the fps counter
				hooksElement.html(buildHtml());
			});
		})();

		(function versionMarker() {
			//create the version element
			var versionElement = DebugElement('version');
			versionElement.position(-20, 20, 1000000);
			versionElement.html('<h1>Engine1 version ' + version + '</h1><p>&copy; ' + new Date().getFullYear() + ' Robert Hurst</p>');
		})();
	}

	/**
	 * Logs an error, warning, or failure
	 * @param description {string}
	 * @param type {string} [optional]
	 */
	function throwError(description, type) {
		//add the error
		errors.push({
			"type": type,
			"description": description,
			"time": new Date()
		});
		if(console && typeof console.log === "function"){
			console.error('ENGINE 1 ' + type + ', - ' + description);
		}
		if (type === 'failure') {
			alert('Engine 1 Has suffered a complete system failure: "' + description + '"');
			//if the error type is failure, end execution of the core
			clearInterval(CORELOOPTIMER);
			clearInterval(SECLOOPTIMER);
		}
	}

	/**
	 * Run all actions attached to a hook
	 * @param hookName {string}
	 * @param passedArgument {string|object} [optional]
	 */
	function hook(hookName, passedArgument) {

		//get the hook requested
		if (hooks[hookName]) {
			for (var action in hooks[hookName]) {
				if (hooks[hookName].hasOwnProperty(action)) {
					hooks[hookName][action](passedArgument);
				}
			}
		}
	}

	/**
	 * Attach an action to a hook
	 * @param hookName {string}
	 * @param actionName {string}
	 * @param callback {function}
	 */
	function action(hookName, actionName, callback) {

		//EXECUTE ACTION
		function exec(args) {

			if (typeof callback === "function") {
				callback(args);
			} else {
				clearAction(hookName, actionName);
			}

		}

		//create the hook if it does not exist
		if(!hooks[hookName]) {
			hooks[hookName] = {};
		}

		hooks[hookName][actionName] = exec;

	}

	/**
	 * Clear an action
	 * @param hookName
	 * @param actionName
	 */
	function clearAction(hookName, actionName) {
		if(hooks[hookName][actionName]){
			delete hooks[hookName][actionName];
		}
	}

	/**
	 * Clear all actions attached to a hook
	 * @param hookName
	 */
	function clearHook(hookName) {
		delete hooks[hookName];
	}

	function later(callback, frameDelay, hookName) {

		//set the default hook name
		hookName = hookName || 'core-loop';

		//advance the iterator
		laterIterator += 1;

		//make the id
		var id = 'later-' + laterIterator;

		//define the execution function
		function exec() {

			//if the
			if (frameDelay < 1) {
				clearAction(hookName, id);
				laterIterator -= 1;
				callback();
			} else if(typeof frameDelay === "number"){
				frameDelay -= 1;
			} else {
				throwError("Tried to setup a 'later' call with an invalid delay.", "failure");
			}
		}
		action(hookName, id, exec);
	}

	/**
	 * Return's Engine1's current version
	 */
	function getVersion() {
		return version;
	}

	// ENGINE API
	return {
		//NEW SCENE
		"newScene": Scene,
		//NEW HOOK
		"hook": hook,
		//NEW ACTION
		"action": action,
		//GET WINDOW SIZE
		"getWindowSize": getWindowSize,
		//WINDOWBLUR
		"windowFocus": windowFocus,
		//WINDOWBLUR
		"windowBlur": windowBlur,
		//THROW ERROR
		"throwError": throwError,
		//GET VERSION
		"engine1": getVersion
	};
}