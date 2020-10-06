/**
 * renderer.js
 *
 * Manipulates DOM elements to display game objects. Has helper functions for
 * moving viewport (game camera) around 2D space efficiently.
 *
 * The critical functions
 * renderer.moveViewport(x, y, zoom) zooms you in to an x, y position with a zoom.
 * renderer.zoomOutMax() zooms out the maximum possible distance.
 * renderer.draw(imageName, whereX, whereY) "draws" in an image in the viewport.
 *
 * "shift" means currentX += deltaX as in shiftTile, shiftViewport
 * "move" means currentX = newX as in moveTile, moveViewport
 *
 * @author jvillemare
 * @date 2019-10-04
 */

// structure of the renderer influenced by https://stackoverflow.com/a/2206630/13158722

var defaultViewportState = {
	x: 0, // horizontal position of viewport
	y: 0, // vertical position of viewport
	zoom: 0, // current zoom level of viewport
	maxZoom: 10, // max zoom level
	minZoom: 0 // min zoom level
}

/**
 * Constructor. By default, pass the ID of the viewport.
 *
 * @param 	{selector} viewport 	Think of this as the game window, because it
 *									is.
 * @param 	{selector} tileSource 	Where the tiles come from to draw from.
 * @param 	{dictionary} settings 	Settings for the camera behavior. Change if
 *									you need to.
 * @return nothing.
 */
var Renderer = function(viewport, tileSource, settings=defaultViewportState) {
	this.viewport = document.getElementById(viewport);
	this.tileSource = document.getElementById(tileSource);
	this.settings = settings; // settings is more like the state of the viewport
	this.tiles = []; // where tiles are virtually tracked

	window.onresize = function() {
		renderer.viewport.setAttribute('style', 'width: ' + window.innerWidth + 'px; height: ' + window.innerHeight + 'px;');
	};
}

// ============================= VIEWPORT / CAMERA =============================

/**
 * Internal function to double check that the zoom level is valid.
 *
 * @param 	{int}	zoom 	Zoom level being checked.
 * @return nothing.
 * @throws 2 exceptions.
 */
Renderer.prototype.checkZoom = function(zoom) {
	if(zoom > this.settings.maxZoom || zoom < this.settings.minZoom)
		throw 'Specified zoom level is beyond max/mins.';
	if(this.settings.maxZoom < this.settings.minZoom)
		throw 'Renderer settings maxZoom is less than minZoom';
}

/**
 * Change the camera's zoom level.
 *
 * @param 	{int}	zoom	viewportState.minZoom < zoom < viewportState.maxZoom
 * @return nothing
 */
Renderer.prototype.setZoom = function(zoom) {
	this.checkZoom(zoom);
	this.settings.zoom = zoom;
	this.updateViewport();
}

/**
 * Helper function. Updates the viewport CSS to the new state.
 * @return nothing
 */
Renderer.prototype.updateViewport = function() {
	this.viewport.setAttribute(
		'style',
		'transform: ' +
		this.generateZoomCSS(this.settings.zoom) + ' ' +
		this.generateTranslateCSS(this.settings.x, this.settings.y) + ';'
	);
}

/**
 * Generate the necessary CSS scale function.
 *
 * @param 	{int}	zoom 	Current zoom level.
 * @return the CSS that zooms in the viewport.
 */
Renderer.prototype.generateZoomCSS = function(zoom) {
	var zoomCSS = '';
	if(zoom == this.settings.minZoom) {
		zoomCSS = 'scale(1.0)';
	} else {
		zoomCSS = 'scale(' +
		(
			(this.settings.maxZoom - this.settings.minZoom)
			/
			(this.settings.maxZoom - zoom)
		) + ')';
	}
	return zoomCSS;
}

/**
 * Generate the necessary CSS translate function to move the viewport.
 *
 * @param 	{int}	whereX 		Horizontal position.
 * @param 	{int}	whereY 		Vertical position.
 * @return nothing.
 */
Renderer.prototype.generateTranslateCSS = function(whereX, whereY) {
	// -1 to invert the positions since translate is normally opposite what we
	// want to translate to.
	return 'translate(' + (-1 * whereX) + 'px, ' + (-1 * whereY) + 'px)';
}

/**
 * Zoom and move viewport to a position and magnification.
 *
 * @param 	{int}	x 		Horizontal.
 * @param 	{int}	y 		Vertical.
 * @param 	{int}	zoom	viewportState.minZoom < zoom < viewportState.maxZoom
 * @return nothing
 */
Renderer.prototype.moveViewport = function(x, y, zoom) {
	this.checkZoom(zoom);
	this.settings.x = x;
	this.settings.y = y;
	this.settings.zoom = zoom;
	this.updateViewport();
}

/**
 * Zoom and move viewport to a new position.
 *
 * @param 	{int}	x 		Horizontal.
 * @param 	{int}	y 		Vertical.
 * @param 	{int}	zoom	viewportState.minZoom < zoom < viewportState.maxZoom
 * @return nothing
 */
Renderer.prototype.moveViewport = function(x, y) {
	this.settings.x = x;
	this.settings.y = y;
	this.updateViewport();
}

/**
 * Shift the current viewport position by a translational amount.
 *
 * @param 	{int}	x 		Horizontal translation.
 * @param 	{int}	y 		Vertical translation.
 * @param 	{int}	zoom	viewportState.minZoom < zoom < viewportState.maxZoom
 * @return nothing
 */
Renderer.prototype.shiftViewport = function(dx, dy) {
	this.settings.x += dx;
	this.settings.y += dy;
	this.updateViewport();
}

/**
 * Zoom out to the maximum distance.
 * @return nothing
 */
Renderer.prototype.zoomOutMax = function() {
	this.setZoom(this.settings.minZoom);
	this.settings.zoom = this.settings.maxZoom;
}

// ================================== DRAWING ==================================

/**
 * Remove all "drawn" tiles from the screen.
 * @returns 	nothing.
 */
Renderer.prototype.clear = function() {
	this.viewport.innerHTML = '';
	this.tiles = [];
}

/**
 * Draw a "sprite" (sub-image) from a tileset at an x and y.
 *
 * @param 	{int}	tileID 		ID of tilesheet in tileSource.
 * @param 	{int}	spriteID	ID of sprite in tilesheet.
 * @param 	{int} 	whereX 		Horizontal position to draw.
 * @param 	{int} 	whereY			Vertical position to draw.
 * @return	{int} 	ID of drawn sprite in renderer. Is used when moving drawn
 *					sprites with Renderer.moveTile
 */
Renderer.prototype.drawFromTileset = function(tileID, spriteID, whereX, whereY) {
	var newSprite = document.createElement('div');
	var newID = this.tiles.length + 1;
	var spriteID = 't' + tileID;
	newSprite.id = newID;
	newSprite.classList = spriteID; // game object class, see main.css
	newSprite.setAttribute(
		'style',
		'top: ' + whereY + // update virtual positions and DOM
		'px; left: ' + whereX + 'px;'
	);
	this.viewport.appendChild(newImage);
	this.tiles[this.tiles.length + 1] = {
		image: imageName,
		x: whereX,
		y: whereY
	};
	return newID;
}

/**
 * Draw map to viewport from map data.
 *
 * @param	{url} 	mapSource 	JSON containing map data.
 * @return nothing.
 */
Renderer.prototype.drawMap = function(mapSource) {
	var map = fetch(mapSource).then(response => response.json());
	var width = map.layers[0].width, height = map.layers[0].height;
	map = map.layers[0].data; // extract just map data

	map.forEach(function(element, index) {
		if(element != 0) {
			// ...
		}
	});
}

/**
 * Move an existing tile from its current position by a specified amount.
 *
 * @param 	{int} 	id	ID of tile given by drawAt() function.
 * @param 	{int}	x 	Delta horizontal (change in position.)
 * @param 	{int}	y 	Delta vertical (change in position.)
 */
Renderer.prototype.moveTile = function(id, x, y) {
	this.viewport.children[id].setAttribute(
		'style',
		'top: ' + (this.tiles[id].y = y) + // update virtual positions and DOM
		'px; left: ' + (this.tiles[id].x = x) + 'px;'
	);
}

/**
 * Shift an existing tile from its current position by a specified amount.
 *
 * @param 	{int}	id 	ID of tile given by drawAt() function.
 * @param 	{int}	dx	Delta horizontal (change in position.)
 * @param 	{int}	dy	Delta vertical (change in position.)
 */
Renderer.prototype.shiftTile = function(id, dx, dy) {
	this.viewport.children[id].setAttribute(
		'style',
		'top: ' + (this.tiles[id].y += dy) + // update virtual positions and DOM
		'px; left: ' + (this.tiles[id].x += dx) + 'px;'
	);
}

/**
 * "Draw" a tile on screen. Note: Image must already be present as an img tag in
 * the #tiles div in index.html
 *
 * @param 	{int}	imageName 	ID name of image.
 * @param 	{int}	whereX 		Horizontal position to draw.
 * @param 	{int}	whereY 		Vertical position to draw.
 * @returns {int}	id of tile. Used in moveTile for faster performance.
 */
Renderer.prototype.draw = function(imageName, whereX, whereY) {
	var newImage = document.createElement('img');
	var newID = this.tiles.length + 1;
	newImage.id = newID;
	newImage.src = this.tileSource.children[imageName].src;
	newImage.width = this.tileSource.children[imageName].width;
	newImage.height = this.tileSource.children[imageName].height;
	newImage.classList = 'go'; // game object class, see main.css
	newImage.setAttribute(
		'style',
		'top: ' + whereY + // update virtual positions and DOM
		'px; left: ' + whereX + 'px;'
	);
	this.viewport.appendChild(newImage);
	this.tiles[newID] = {
		image: imageName,
		x: whereX,
		y: whereY
	};
	return newID;
}

// ================================== HELPERS ==================================

/**
 * Attached to window.onresize, automatically resizes the viewport to the full
 * screen width and height.
 * @return nothing.
 */
Renderer.prototype.resizeViewport = function() {
	renderer.viewport.setAttribute('style', 'width: ' + document.width + 'px; height: ' + document.height + 'px;');
}

/**
 * Checks to see if the requested tile at all visible in the current viewport.
 * Is used for hiding tiles that are no longer visible.
 * @returns 	{bool}	True if visible, false if not.
 */
Renderer.prototype.isTileInViewport = function(tile) {
	// ...
}

// ================================== GETTERS ==================================

/**
 * Getter.
 * @returns 	{int}	Horizontal position of viewport, center of screen.
 */
Renderer.prototype.getX = function() { return this.settings.x; }

/**
 * Getter.
 * @returns 	{int}	Vertical position of viewport, center of screen.
 */
Renderer.prototype.getY = function() { return this.settings.y; }

/**
 * Getter.
 * @returns 	{int}	Zoom of viewport, center of screen.
 */
Renderer.prototype.getZoom = function() {
	return this.settings.zoom;
}

/**
 * Getter.
 * @returns 	{array}	All the tiles currently "rendered" in the viewport.
 */
Renderer.prototype.getTiles = function() {
	return this.tiles;
}
