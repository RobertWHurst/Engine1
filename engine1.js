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
	var views = {};
	var sprites = {};
	var elements = {
		"global": {}
	};
	var hooks = {};
	var errors = [];
	var events = {};

	//environment
	var version = "0.04";
	var stageSize = [0, 0];
	var windowSize = [0, 0];
	var paused = false;
	var fps = 0;
	var iFps = 0;
	var mousePosition = [0, 0];
	var mouseDown = false;
	var container = jQuery('<div id="engine1"></div>');
	var stage = jQuery('<div id="stage"></div>');

	/* --------------------------------------------------
	    PREP ENVIRONMENT
	   -------------------------------------------------- */
	container.append(stage);
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
		stageSize = [
			stage.width(),
			stage.height()
		];
		windowSize = [
			container.width(),
			container.height()
		];
	});

	function getStageSize() {
		return stageSize;
	}

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
						if (currentEvent && typeof currentEvent.callbacks[1] === "function") {
							currentEvent.callbacks[1]();
						}

						//make the next event the current event
						currentEvents[type] = currentEvent = nextEvent;

						//fire the first callback of the current event
						if (currentEvent && typeof currentEvent.callbacks[0] === "function") {
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
		//TODO: see if you can remove the actions and hooks for scene states.
		//create a new shadow DOM
		scenes[sceneName] = {
			"shadowDOM": document.createDocumentFragment()
		};

		//create the element space
		elements[sceneName] = {};

		/**
		 * Loads the next scene
		 * @param sceneName
		 */
		function loadScene(sceneName) {
			hook(sceneName + '-setup');
		}


		/* --------------------------------------------------
		    SCENE API CONSTRUCTOR FUNCTIONS
		   -------------------------------------------------- */
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

		function LoadingScreenElement(text, logo) {
			var LoadingScreen = Element('global', 'loadingScreen');
			LoadingScreen.size('full', 'full');
			LoadingScreen.addClass('loadingScreen');
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

		function newView(viewName) {
			return View(sceneName, viewName);
		}

		/* --------------------------------------------------
		    SCENE STAGE CONTROL
		   -------------------------------------------------- */

		function setup() {
			hook('scene-setup-' + sceneName);
		}

		/**
		 * Advances to the 'run' stage of the scene
		 */
		function run() {
			var hasRun = false;
			stage.attr('class', sceneName);
			//clone the shadow dom to the view
			action('core-loop', 'scene-' + sceneName + '-DOM', function (api) {
				//copy the shadowDOM into the stage
				stage.empty();
				stage.append(scenes[sceneName].shadowDOM.cloneNode(true));
				//fire the 'scene-update' hook
				hook('scene-update');
				if(!hasRun){
					hook('scene-run-' + sceneName);
					hasRun = true;
				}
			});
			var i =0;
		}

		/**
		 * Advances to the 'exit' stage of the scene
		 */
		function exit() {
			hook('scene-exit-' + sceneName, arguments[0]);

			//delete the all actions for scene update
			clearHook('scene-update');

			//loop through the elements and delete them
			for (var elementName in elements[sceneName]) {
				var element = elements[sceneName][elementName];

				//delete the element's node
				jQuery(element.node).remove();

				//delete the element
				delete elements[sceneName][elementName];

			}

		}

		/* --------------------------------------------------
		    SCENE STAGE CALLBACKS
		   -------------------------------------------------- */

		/**
		 * Runs a callback for preparing a scene
		 * @param callback {function}
		 */
		function onSetup(callback) {

			//clone the base api
			var callbackApi = {
				"loadingScreen": LoadingScreenElement,
				"newSpriteSheet": newSpriteSheet,
				"run": run,
				"exit": exit
			};

			action('scene-setup-' + sceneName, 'scene-setup-' + sceneName, function () {
				clearAction('scene-setup-' + sceneName, 'scene-setup-' + sceneName);
				callback(callbackApi);
			});
		}

		/**
		 * Runs a callback when running the scene
		 * @param callback {function}
		 */
		function onRun(callback) {

			var callbackApi = {
				"newElement": newElement,
				"newTextElement": newTextElement,
				"newStaticElement": newStaticElement,
				"newView": newView,
				"exit": exit
			};
			
			action('scene-run-' + sceneName, 'scene-run-' + sceneName, function (aApi) {
				clearAction('scene-run-' + sceneName, 'scene-run-' + sceneName);
				callback(callbackApi);
			});
		}

		/**
		 * Runs a callback when cleaning up the scene
		 * @param callback {function}
		 */
		function onExit(callback) {

			var callbackApi = {
				"loadScene": loadScene
			};
			
			action('scene-exit-' + sceneName, 'scene-exit-' + sceneName, function (args) {
				clearAction('scene-exit-' + sceneName, 'scene-exit-' + sceneName);
				callback(callbackApi, args);
			});
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
			"go": setup,
			"onSetup": onSetup,
			"onRun": onRun,
			"onExit": onExit,
			"height": stage.height,
			"width": stage.width
		}
	}

	/**
	 * Creates a new view of a scene.
	 * @param sceneName {string}
	 * @param viewName {string}
	 */
	function View(sceneName, viewName) {
		//TODO: Write
		//CLOSURE
		return function () {

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
			if(sprites[spriteSheetName].size && sprites[spriteSheetName].image) {
				//create the canvas
				var canvas = document.createElement('canvas');
				var context = canvas.getContext('2d');

				//get the image
				var image = sprites[spriteSheetName].image;
				var spriteSize = sprites[spriteSheetName].size;

				//map the image size to the canvas
				canvas.width = image.width;
				canvas.height = image.height;

				//blit on the image
				context.drawImage(image, 0, 0, canvas.width, canvas.height);

				//get the total number of sprites per axis
				var spritesCountX = Math.floor(image.width / spriteSize[0]);
				var spritesCountY = Math.floor(image.height / spriteSize[1]);

				//loop through the sprites
				sprites[spriteSheetName].alphaData = [];
				for (var currentSpriteX = 0; currentSpriteX < spritesCountX; currentSpriteX += 1) {
					//make the sprite row array
					sprites[spriteSheetName].alphaData[currentSpriteX] = [];
					for (var currentSpriteY = 0; currentSpriteY < spritesCountY; currentSpriteY += 1) {
						//make the sprite column array
						sprites[spriteSheetName].alphaData[currentSpriteX][currentSpriteY] = [];

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
							if(!sprites[spriteSheetName].alphaData[currentSpriteX][currentSpriteY][row]){
								sprites[spriteSheetName].alphaData[currentSpriteX][currentSpriteY][row] = [];
							}
							sprites[spriteSheetName].alphaData[currentSpriteX][currentSpriteY][row][col] = imageData[pixelDataAlpha + 3];
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
	 */
	function Element(sceneName, elementName) {

		if (typeof elements[sceneName][elementName] !== "undefined") {
			throwError('Cannot create Element "' + elementName + '". It already exists', 'failure');
			return false;
		}

		elements[sceneName][elementName] = {
			"position": [0, 0, 0, false, false],
			"size": [0, 0, false, false],
			"customCSS": {},
			"CSS": {},
			"spriteSheet": false,
			"sequence": [[0, 0]],
			"interval": 1,
			"currentFrame": 0,
			"loop": false,
			"CSSUpdated": false,
			"node": jQuery('<div id="' + elementName + '"></div>')[0],
			"events": {}
		};

		var actions = {
			"sprite": {},
			"motion": {},
			"dom": {}
		};

		//add the element to the scene's dom
		if (sceneName !== 'global') {
			scenes[sceneName].shadowDOM.appendChild(elements[sceneName][elementName].node);
			var hookName = 'scene-update';
		} else {
			container.append(elements[sceneName][elementName].node);
			var hookName = 'core-loop';
		}

		//create an element runtime
		action(hookName, 'update-element-' + elementName, function(){

			if (elements[sceneName][elementName].CSSUpdated){
				elements[sceneName][elementName].CSSUpdated = false;

				//check the size
				var fullWidth = elements[sceneName][elementName].size[2];
				var fullHeight = elements[sceneName][elementName].size[3];

				//if the size is full
				if (fullWidth) {
					elements[sceneName][elementName].size[0] = stageSize[0];
					elements[sceneName][elementName].CSSUpdated = true;
				}
				if (fullHeight) {
					elements[sceneName][elementName].size[1] = stageSize[1];
					elements[sceneName][elementName].CSSUpdated = true;
				}

				//check the centering
				var centerX = elements[sceneName][elementName].position[3];
				var centerY = elements[sceneName][elementName].position[4];

				//if the position is center
				if (centerX) {
					elements[sceneName][elementName].position[0] = Math.floor((stageSize[0] - elements[sceneName][elementName].size[0]) / 2);
					elements[sceneName][elementName].CSSUpdated = true;
				}
				if (centerY) {
					elements[sceneName][elementName].position[1] = Math.floor((stageSize[1] - elements[sceneName][elementName].size[1]) / 2);
					elements[sceneName][elementName].CSSUpdated = true;
				}

				//calculate the element anchor
				var anchorX = 'left';
				var anchorY = 'top';
				var positionX = elements[sceneName][elementName].position[0];
				var positionY = elements[sceneName][elementName].position[1];
				var positionZ = elements[sceneName][elementName].position[2];

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
				elements[sceneName][elementName].CSS = jQuery.extend(elements[sceneName][elementName].customCSS, {
					"z-index": positionZ,
					"width": elements[sceneName][elementName].size[0],
					"height": elements[sceneName][elementName].size[1],
					"position": "absolute"
				});

				if (anchorX === "left") {
					delete elements[sceneName][elementName].CSS["right"];
				} else {
					delete elements[sceneName][elementName].CSS["left"];
				}
				if (anchorY === "top") {
					delete elements[sceneName][elementName].CSS["bottom"];
				} else {
					delete elements[sceneName][elementName].CSS["top"];
				}


				elements[sceneName][elementName].CSS[anchorX] = positionX;
				elements[sceneName][elementName].CSS[anchorY] = positionY;

				jQuery(elements[sceneName][elementName].node).attr('style', '').css(elements[sceneName][elementName].CSS);
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
			return elements[sceneName][elementName].node;
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
				elements[sceneName][elementName].position[3] = true;
			}
			if(y === "center"){
				elements[sceneName][elementName].position[4] = true;
			}

			//check for valid positioning
			if(typeof x === "number") {
				elements[sceneName][elementName].position[0] = x;
				bool = true;
			}
			if(typeof y === "number") {
				elements[sceneName][elementName].position[1] = y;
				bool = true;
			}
			if(typeof z === "number") {
				elements[sceneName][elementName].position[2] = z;
				bool = true;
			}

			elements[sceneName][elementName].CSSUpdated = bool || elements[sceneName][elementName].CSSUpdated;

			//if 'bool' is true return true, else return the element's position
			return (bool || elements[sceneName][elementName].position);
		}

		/**
		 * Sets the element's size
		 * @param width {int}
		 * @param height {int}
		 */
		function size(width, height){
			var bool = false;
			if (width === "full") {
				elements[sceneName][elementName].size[2] = true;
			}
			if (height === "full") {
				elements[sceneName][elementName].size[3] = true;
			}
			if (typeof width === "number" || width === 'auto') {
				elements[sceneName][elementName].size[0] = width;
				bool = true;
			}
			if (typeof height === "number" || height === 'auto') {
				elements[sceneName][elementName].size[1] = height;
				bool = true;
			}
			elements[sceneName][elementName].CSSUpdated = bool || elements[sceneName][elementName].CSSUpdated;
			//if 'bool' is true return true, else return the element's position
			return (bool || elements[sceneName][elementName].size);
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
					elements[sceneName][elementName].customCSS[cssObject] = value
				} else {
					elements[sceneName][elementName].customCSS = jQuery.extend(elements[sceneName][elementName].customCSS, cssObject);
				}
				elements[sceneName][elementName].CSSUpdated = true;
				return true;
			}
			return false;
		}

		/**
		 * Adds a class to the element
		 * @param className
		 */
		function addClass(className) {
			action('core-loop', 'add-class-element-' + elementName, function () {
				clearAction('core-loop', 'add-class-element-' + elementName);
				jQuery(elements[sceneName][elementName].node).addClass(className);
			});
		}

		/**
		 * Removes a class from the element
		 * @param className
		 */
		function removeClass(className) {
			action('core-loop', 'remove-class-element-' + elementName, function () {
				clearAction('core-loop', 'remove-class-element-' + elementName);
				jQuery(elements[sceneName][elementName].node).removeClass(className);
			});
		}

		/**
		 * Injects html in to element
		 * @param html {string}
		 */
		function html(html){
			if (typeof html === "string") {
				jQuery(elements[sceneName][elementName].node).html(html);
			}
		}

		function spriteAnimate(sequence, interval, loop) {
			
			var i = 0;
			var fI = 0;
			var lastBGUrl = '';
			var lastBGPosition = [];
			var actionId = 'sprite-animation-element-' + elementName;
			var element = elements[sceneName][elementName];

			//create the animation
			action('scene-update', actionId, function (api) {

				//get the element and its sprite
				var element = elements[sceneName][elementName];
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
							elements[sceneName][elementName].CSS['background'] = 'url(' + BGUrl + ')';
							lastBGUrl = BGUrl;
						}

						if (lastBGPosition !== pos) {
							elements[sceneName][elementName].CSS['background-position'] = '-' + pos[0] + 'px -' + pos[1] + 'px';
							lastBGPosition = pos;
						}

						fI += 1;
					} else {
						if (loop) {
							fI = 0;
						} else {
							clearAction('scene-update', actionId);
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
				elements[sceneName][elementName].spriteSheet = spriteName;
				elements[sceneName][elementName].CSS['background'] = 'url(' + sprites[spriteName].url + ')';
			}
		}

		function motionSequence(sequence, frameInterval, callback, useRelativeMotion) {

			var i = 0;
			var iF = 0;
			var element = elements[sceneName][elementName];

			//create an action for the tween
			action('scene-update', 'motion-sequence-' + elementName, function (api) {

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
					elements[sceneName][elementName].position[0] = xy[0];
					elements[sceneName][elementName].position[1] = xy[1];
					elements[sceneName][elementName].position[2] = xy[2];

					if (iF + 1 < sequence.length) {
						//advance the current frame
						iF += 1;
					} else {
						//kill the process
						clearAction('scene-update', 'motion-sequence-' + elementName);

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

			var element = elements[sceneName][elementName];

			var framesLeft = tweenDuration;

			//if center or centered
			if(finalPosition[0] === 'center'){
				finalPosition[0] = (stage.width() - element.size[0]) / 2;
			}
			if(finalPosition[1] === 'center'){
				finalPosition[1] = (stage.height() - element.height()) / 2;
			}

			//create a process
			action('scene-update', 'motion-tween-' + elementName, function (api) {

				var distance = [];

				//calculate each axis
				for (var i = 0; i < 3; i += 1) {
					//find the total distance to travel in the remaining frames
					//NOTE: end coords minus current coords
					var totalDistance = (finalPosition[i] || 0) - element.position[i];

					//find the distance to travel this frame in this axis
					distance[i] = Math.round(( totalDistance / framesLeft ) + element.position[i]);
				}

				//apply the new location
				element.position[0] = distance[0];
				element.position[1] = distance[1];
				element.position[2] = distance[2];

				if ( framesLeft > 1 ) {
					//remove one frame from the frameLength
					framesLeft -= 1;
				} else {

					//kill the process
					clearAction('scene-update', 'motion-tween-' + elementName);
					
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
					"z": elements[sceneName][elementName].position[2],
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
			if (event === "hover" || event === "click") {
				for(var i = 0; i < events.length; i += 1) {
					if (events[i].elementName === elementName && events[i].type === type) {
						delete events[i];
						bool = true;
					}
				}
			}
			return bool;
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
			"unbind": unbind
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

		staticElement.css('border', '1px solid #000');

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
	 */
	function hook(hookName) {

		//make the arguments array into an array
		var args = Array.prototype.slice.call(arguments, 0);
		args.shift();

		//get the hook requested
		if (hooks[hookName]) {
			for (var action in hooks[hookName]) {
				if (hooks[hookName].hasOwnProperty(action)) {
					hooks[hookName][action](args);
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
		delete hooks[hookName][actionName];
	}

	/**
	 * Clear all actions attached to a hook
	 * @param hookName
	 */
	function clearHook(hookName) {
		delete hooks[hookName];
	}

	// ENGINE API
	return {
		//NEW SCENE
		"newScene": Scene,
		//NEW HOOK
		"hook": hook,
		//NEW ACTION
		"action": action,
		//GET STAGE SIZE
		"getStageSize": getStageSize,
		//GET WINDOW SIZE
		"getWindowSize": getWindowSize,
		//WINDOWBLUR
		"windowFocus": windowFocus,
		//WINDOWBLUR
		"windowBlur": windowBlur,
		//GET VERSION
		"version": version
	};
}
	
/* --------------------------------------------------
	BORROWED BITS
   -------------------------------------------------- */

// Array Remove - By John Resig (MIT Licensed)
Array.prototype.remove = function(from, to) {
	var rest = this.slice((to || from) + 1 || this.length);
	this.length = from < 0 ? this.length + from : from;
	return this.push.apply(this, rest);
};