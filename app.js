var socket = io();

var Board = function(numRows, numCols, value) {
    this.array = new Array;
    for (var i = 0; i < numRows; i++) {
        var column = new Array;
        for (var j = 0; j < numCols; j++) {
            column.push(value);
        }
        this.array.push(column);
    }
    return this.array;
}

// Player movement stuff
// http://www.html5gamedev.de/2013/07/29/basic-movement-follow-and-face-mouse-with-easing/
var delta = 1;
var angle = 0;

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
ctx.canvas.width = window.innerWidth;
ctx.canvas.height = window.innerHeight;

// Total number of tiles in game 
var gridHeight = 50;
var gridWidth = 100;
var numTiles_x_start = 20;
var numTiles_x_max = 30;
// number of visible tiles (width)
var numTiles_x = numTiles_x_start;
var tileLength = window.innerWidth / numTiles_x;

//  Global variables
var board = Board(gridHeight, gridWidth, 0);
var overlayer = Board(gridHeight, gridWidth, 0);
var leaderboard = [];

// Describes this specific player
// http://www.html5gamedev.de/2013/07/29/basic-movement-follow-and-face-mouse-with-easing/
var player = {
    x: ctx.canvas.width/2,
    y: ctx.canvas.height/2,
    speed: 25,
    target: {x: ctx.canvas.width/2, y: ctx.canvas.height/2},
    color: 'blue'
};

// Might not need this in the long run
var otherPlayers = [
    { x: 100, y: 75, color: 'red' },
    { x: 300, y: 400, color: 'purple' }
];

// Array of all players, don't think we need this in the long run
var players = [
    { x: 100, y: 75, color: 'red' },
    { x: 300, y: 400, color: 'purple' }
];

document.addEventListener('mousemove', mouseInput, false);

// This may be obsolete with the introduction of drawSprite_exact()
// Draws a sprite at a specified location
function drawSprite(xpos, ypos, src, scalar, offset, alpha) {
    var sprite = new Image();
    sprite.src = src;
    sprite.onload = function() {
        // Scale down the canvas to draw the image, draw it, then scale back up
        ctx.scale(scalar, scalar);
        ctx.globalAlpha = alpha;
        ctx.drawImage(sprite, xpos/scalar+offset, ypos/scalar+offset);
        ctx.globalAlpha = 1.0;
        ctx.scale(1/scalar, 1/scalar);
        ctx.globalAlpha = 1;
    };
}

// This function will draw an image in the exact dimensions we want.
// It will be useful for resizing tiles as the window resizes
function drawSprite_exact(src, x, y, w, h, alpha)
{
    var sprite = new Image();
    sprite.src = src;
    sprite.onload = function()
    ctx.globalAlpha = alpha;
    {
        ctx.drawImage(sprite, x, y, w, h);
    }
    ctx.globalAlpha = 1;
}

// MAKE SURE TO SEPARATE STUFF OUT LATER!!!!!
function drawGrid(xmin, ymin, xmax, ymax, tileLength)
{
    // Red Farmer
    board[3][8] = 1;
    board[3][9] = 1;
    board[4][8] = 1;
    board[5][8] = 1;
    board[4][9] = 1;
    board[5][9] = 1;
    board[3][10] = 1;

    // Purple Farmer
    board[35][70] = 2;
    board[36][70] = 2;
    board[37][70] = 2;
    board[36][71] = 2;
    board[36][72] = 2;
    board[35][71] = 2;

    for (var y = 0; y < gridHeight; y++)
    {
        for (var x = 0; x < gridWidth; x++)
        {
            if (x*tileLength>=xmin-tileLength && x*tileLength<xmax && y*tileLength>=ymin-tileLength && y*tileLength<ymax)
            {
                ctx.strokeRect(x*tileLength-xmin, y*tileLength-ymin, tileLength, tileLength);
                switch (board[y][x]) 
                {
                case (0): // DIRT
                    drawSprite_exact('sprites/dirt.jpg', x*tileLength-xmin, y*tileLength-ymin, tileLength, tileLength, 1);
                    break;
                case (1): // RED PLANT
                    ctx.fillStyle = 'red';
                    ctx.fillRect(x*tileLength-xmin, y*tileLength-ymin, tileLength-1, tileLength-1);
                    drawSprite_exact('sprites/plant.png', x*tileLength-xmin, y*tileLength-ymin, tileLength, tileLength, .6);
                    break;
                case (2): // PURPLE PLANT
                    ctx.fillStyle = 'purple';
                    ctx.fillRect(x*tileLength-xmin, y*tileLength-ymin, tileLength-1, tileLength-1);
                    drawSprite_exact('sprites/plant.png', x*tileLength-xmin, y*tileLength-ymin, tileLength, tileLength, .6);
                    break;
                default: // UNKNOWN
                    ctx.fillStyle = 'black';
                    ctx.fillRect(x*tileLength-xmin, y*tileLength-ymin, tileLength, tileLength);
                    break;
                }
            }
        }
    }
}

function drawOverlayer(xmin, ymin, xmax, ymax, tileLength)
{
    // Temp variable to curb ridiculously long lines
    var tl = tileLength;
    // 'w' could stand for water, currently just testing to see if it works
    overlayer[3][28] = 1;
    overlayer[4][29] = 1;
    overlayer[7][7] = 1;
    overlayer[4][8] = 'H';

    for (var y = 0; y < gridHeight; y++) 
    {
        for (var x = 0; x < gridWidth; x++) 
        {
        	if (x*tileLength>=xmin-tl && x*tl<xmax && y*tl>=ymin-tl && y*tl<ymax)
            {
	            switch (overlayer[y][x]) 
	            {
	                case (0):
	                    break;
	                case (1):
                        drawSprite_exact('sprites/water_bucket.png', x*tl-xmin+tl/9, y*tl-ymin+tl/9, tl*3/4, tl*3/4, 1);
	                    break;
	                case ('H'):
						// This is the case where the tile is a house space
						drawSprite_exact( 'sprites/house.png',x*tl-xmin, y*tl-ymin, tl, tl, 1);
						break;
	            }
	        }
        }
    }
}

// MAKE THIS DYNAMIC, GLOBAL CONSTANTS
function drawLeaderboard() {
    ctx.globalAlpha = 0.4;
    ctx.strokeRect(window.innerWidth-300, 30, 250, 250);
    ctx.fillStyle = 'black';
    ctx.fillRect(window.innerWidth-300, 30, 250, 250);

    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText('Leaderboard', window.innerWidth-225, 50);

    leaderboard.forEach(function() {
        // Print player and score
    });
}

// MAKE THIS DYNAMIC
function drawScore() {
    ctx.globalAlpha = 0.4;
    ctx.strokeRect(10, window.innerHeight-60, 200, 50);
    ctx.fillStyle = "black";
    ctx.fillRect(10, window.innerHeight-60, 200, 50);

    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText('Score: ', 15, window.innerHeight-30);
}

function drawCurrentPowerup() {
    ctx.globalAlpha = 0.4;
    ctx.strokeRect(10, 10, 275, 50);
    ctx.fillStyle = 'black';
    ctx.fillRect(10, 10, 275, 50);

    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText('Current powerup: ', 15, 35);
}

// TODO: Make this dynamic
// When we actually make this work we should probably draw a circle when a player connects
// That player can then move their own circle around the game
function drawPlayers() {
    var i = 0;
    otherPlayers.forEach(function() {
        ctx.beginPath();
        ctx.arc(otherPlayers[i].x, otherPlayers[i].y, 10, 0, 2*Math.PI);
        ctx.fillStyle = otherPlayers[i].color;
        ctx.arc(x, y, 10, 0, 2*Math.PI, false);
        ctx.fillStyle = color;
        ctx.fill();
        i++;
    });
}

function drawPlayer(xmin, ymin) {
	ctx.beginPath();
	ctx.arc(player.x-xmin, player.y-ymin, tileLength/2.25, 0, 2*Math.PI, false);
	ctx.fillStyle = player.color;
	ctx.fill();
}

// Handles mouse movement
// http://www.html5gamedev.de/2013/07/29/basic-movement-follow-and-face-mouse-with-easing/
function mouseInput(mouse) {
    if (isNaN(delta) || delta <= 0) {
        return;
    }
    else {
        var distX = mouse.clientX - (player.x);
        var distY = mouse.clientY - (player.y);
    }

    if (distX !== 0 && distY !== 0) {
        angle = Math.atan2(distX, distY*-1);
        player.x -= (player.x - (mouse.clientX/player.speed));
        player.y -= (player.y - (mouse.clientY/player.speed));
    }
}


function keyInput() {

}

// This function will dynamically follow the player, drawing the board
// around him/her as he moves in realtime
function drawPlayerWindow()  {
    var numTiles_y = window.innerHeight / tileLength + 1;
    var halfX = numTiles_x / 2;
    var halfY = numTiles_y / 2;

    // Record the board's visible bounds
    var min_x = player.x<tileLength*halfX ? 0 : player.x-tileLength*halfX;
    var min_y = player.y<tileLength*halfY ? 0 : player.y-tileLength*halfY;
    var max_x = min_x+tileLength*numTiles_x;
    var max_y = min_y+tileLength*numTiles_y;

    // Draw that board!
    drawGrid(min_x, min_y, max_x, max_y, tileLength);
    drawOverlayer(min_x, min_y, max_x, max_y, tileLength);

    // And the player too!
    drawPlayer(min_x, min_y);
}

// This function will be used to load images prior to their use
// so that there is no draw delay
// Draw delay obscures the leaderboard and other text overlay
function init_images() {

}

// Calculates a new delta
// http://www.html5gamedev.de/2013/07/29/basic-movement-follow-and-face-mouse-with-easing/
function setDelta() {
    // Need a now and a then
    // Maybe set these as globals
    // delta = (now-then)/1000;

    now = (new Date()).getTime();
    delta = (now-then)/1000;    // WHAT IS THEN?
    then = now;
}

// Calls all needed object update functions
function update() {

}

// Calls all needed object rendering functions
// http://www.html5gamedev.de/2013/07/29/basic-movement-follow-and-face-mouse-with-easing/
function render() {

}

// Main game loop
// TODO: actually animate
function gameLoop() {
    drawGrid();
    drawPickups();
    drawPlayers();
    drawPlayer();
    drawLeaderboard();
    drawScore();
    drawCurrentPowerup();
  
    var now = Date.now();
    var dt = (now - lastTime) / 1000.0;
    update(dt);
    lastTime = now;
    requestAnimationFrame(gameLoop);
}

function init() {
	// Fill the canvas with green
	ctx.fillStyle = 'green';
	ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
    // document.getElementById('play-again').addEventListener('click', function() {
    //     reset();
    // });
    // reset();
    lastTime = Date.now();
    // init_images();
    gameLoop();
}

// Socket
socket.on('connected')

var lastTime;
init();
