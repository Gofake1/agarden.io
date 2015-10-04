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

// Describes the local player
var thisPlayer = {x:550, y:550, speed:25, color:'blue'}

// Might not need this in the long run
var otherPlayers = [
    { x: 100, y: 75, color: 'red' },
    { x: 300, y: 400, color: 'purple' }
];

// Setup mouse listener
document.addEventListener('mousemove', mouseInput, false);

// Player movement stuff
// http://www.html5gamedev.de/2013/07/29/basic-movement-follow-and-face-mouse-with-easing/
var now = (new Date()).getTime();
var then = (new Date()).getTime()-1;
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

// Number of visible tiles (width)
var numTiles_x = numTiles_x_start;
var numTiles_y = window.innerHeight / tileLength + 1;
var tileLength = window.innerWidth / numTiles_x;
var halfX = numTiles_x / 2;
var halfY = numTiles_y / 2;

// Record the board's visible bounds
var min_x = thisPlayer.x<tileLength*halfX ? 0 : thisPlayer.x-tileLength*halfX;
var min_y = thisPlayer.y<tileLength*halfY ? 0 : thisPlayer.y-tileLength*halfY;
var max_x = min_x+tileLength*numTiles_x;
var max_y = min_y+tileLength*numTiles_y;

// Global variables
var board = Board(gridHeight, gridWidth, 0);
var overlayer = Board(gridHeight, gridWidth, 0);
var leaderboard = [];

// Sprites
var dirt = new Image();
var plant = new Image();
var waterBucket = new Image();
var house = new Image();

document.addEventListener('mousemove', mouseInput, false);
var mouse_x = 0;
var mouse_y = 0;

// Updates global variables for board drawing
function updateBoardVars() {
    // Record the board's visible bounds
    min_x = thisPlayer.x<tileLength*halfX ? 0 : thisPlayer.x-tileLength*halfX;
    min_y = thisPlayer.y<tileLength*halfY ? 0 : thisPlayer.y-tileLength*halfY;
    max_x = min_x+tileLength*numTiles_x;
    max_y = min_y+tileLength*numTiles_y;

    // Number of visible tiles
    numTiles_y = window.innerHeight / tileLength + 1;
    halfX = numTiles_x / 2;
    halfY = numTiles_y / 2;
}

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
function drawSprite_exact(img, x, y, w, h, alpha) {
    ctx.globalAlpha = alpha; // The site doesn't work with this line for me
    {
        ctx.drawImage(img, x, y, w, h);
    }
    ctx.globalAlpha = 1;
}

// MAKE SURE TO SEPARATE STUFF OUT LATER!!!!!
function drawGrid(xmin, ymin, xmax, ymax, tileLength) {
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

    for (var y = 0; y < gridHeight; y++) {
        for (var x = 0; x < gridWidth; x++) {
            if (x*tileLength>=xmin-tileLength && x*tileLength<xmax && y*tileLength>=ymin-tileLength && y*tileLength<ymax) {
                ctx.strokeRect(x*tileLength-xmin, y*tileLength-ymin, tileLength, tileLength);
                switch (board[y][x]) {
                    case (0): // DIRT
                        drawSprite_exact(dirt, x*tileLength-xmin, y*tileLength-ymin, tileLength, tileLength, 1);
                        break;
                    case (1): // RED PLANT
                        ctx.fillStyle = 'red';
                        ctx.fillRect(x*tileLength-xmin, y*tileLength-ymin, tileLength-1, tileLength-1);
                        drawSprite_exact(plant, x*tileLength-xmin, y*tileLength-ymin, tileLength, tileLength, .6);
                        break;
                    case (2): // PURPLE PLANT
                        ctx.fillStyle = 'purple';
                        ctx.fillRect(x*tileLength-xmin, y*tileLength-ymin, tileLength-1, tileLength-1);
                        drawSprite_exact(plant, x*tileLength-xmin, y*tileLength-ymin, tileLength, tileLength, .6);
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

function drawOverlayer(xmin, ymin, xmax, ymax, tileLength) {
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
                        drawSprite_exact(waterBucket, x*tl-xmin+tl/9, y*tl-ymin+tl/9, tl*3/4, tl*3/4, 1);
                        break;
                    case ('H'):
                        // This is the case where the tile is a house space
                        drawSprite_exact(house, x*tl-xmin, y*tl-ymin, tl, tl, 1);
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
// function drawPlayers() {
//     var i = 0;
//     otherPlayers.forEach(function() {
//         ctx.beginPath();
//         ctx.arc(otherPlayers[i].x, otherPlayers[i].y, 10, 0, 2*Math.PI);
//         ctx.fillStyle = otherPlayers[i].color;
//         ctx.arc(x, y, 10, 0, 2*Math.PI, false);
//         ctx.fillStyle = color;
//         ctx.fill();
//         i++;
//     });
// }

// Draws this specific player as opposed to the opposing players
function drawPlayer(xmin, ymin) {
    ctx.beginPath();
    ctx.arc(thisPlayer.x-xmin, thisPlayer.y-ymin, tileLength/2.25, 0, 2*Math.PI, false);
    ctx.fillStyle = thisPlayer.color;
    ctx.fill();
}

// Handles mouse movement
// http://www.html5gamedev.de/2013/07/29/basic-movement-follow-and-face-mouse-with-easing/
function mouseInput(mouse) {
    mouse_x = mouse.clientX;
    mouse_y = mouse.clientY;
}

function playerMove(){
    updateBoardVars();

    var mov_x = max_x - min_x;
    var mov_y = max_y - min_y;

    if (isNaN(delta) || delta <= 0) {
        return;
    }
    else {
        var distX = mouse_x - (thisPlayer.x-mov_x/2);
        var distY = mouse_y - (thisPlayer.y-mov_y/2);
    }

    if (distX !== 0 && distY !== 0) {
        console.log(distX);

        angle = Math.atan2(distX, distY*-1);
        thisPlayer.x -= (((thisPlayer.x - mov_x/2) - mouse_x)/thisPlayer.speed);
        thisPlayer.y -= (((thisPlayer.y - mov_y/2) - mouse_y)/thisPlayer.speed);
    }
}

// Handles keyboard input
function keyInput() {

}

// This function will dynamically follow the player, drawing the board
// around him/her as he moves in realtime
function drawPlayerWindow() {
    updateBoardVars();

    // Draw that board!
    drawGrid(min_x, min_y, max_x, max_y, tileLength);
    drawOverlayer(min_x, min_y, max_x, max_y, tileLength);

    // And the player too!
    drawPlayer(min_x, min_y);
}

// This function will be used to load images prior to their use
// so that there is no draw delay
// Draw delay obscures the leaderboard and other text overlay
function initImages() {
    dirt.src = 'sprites/dirt.jpg';
    plant.src = 'sprites/plant.png';
    waterBucket.src = 'sprites/water_bucket.png';
    house.src = 'sprites/house.png';
}

function initSocket(socket) {

}

// Calculates a new delta
// http://www.html5gamedev.de/2013/07/29/basic-movement-follow-and-face-mouse-with-easing/
function setDelta() {
    now = (new Date()).getTime();
    delta = (now-then)/1000;
    then = now;
}

// Calls all needed object update functions
function update() {

}

// I'm not sure if we need to use render() for player movement, the tutorial only seems to use it for rotations
// Calls all needed object rendering functions
// http://www.html5gamedev.de/2013/07/29/basic-movement-follow-and-face-mouse-with-easing/
function render(ctx) {
    // save the current context so we can set options without touching all the other rendered objects
    ctx.save();

    // draw image


    // restore the old context
    ctx.restore();
}

// Main game loop
// TODO: actually animate
function gameLoop() {
    drawPlayerWindow();
    //drawPickups();
    // drawPlayers();
    // drawPlayer();
    drawLeaderboard();
    drawScore();
    drawCurrentPowerup();
    playerMove();
  
    var now = Date.now();
    var dt = (now - lastTime) / 1000.0;
    update(dt);
    render(ctx);
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
    initImages();
    initSocket(socket);
    gameLoop();
}

// Socket
socket.on('connected')

var lastTime;
init();
