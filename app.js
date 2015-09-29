// Start screen modal
$(document).ready(function() {
    $('#startScreen').modal();
});

// TODO: Trigger game screen modal when player dies
// For the demo, clicking anywhere triggers the game over modal
$('#canvas').click(function() {
    $('#gameoverScreen').modal();
});

var socket = io();

// Initialize game array
Array.build = function(numRows, numCols, value) {
    var array = [];
    for (var i = 0; i < numRows; i++){
        var column = [];
        for (var j = 0; j < numCols; j++){
            column[j] = value;
        }
        array[i] = column;
    }
    return array;
}

var thisPlayer = {x:550, y:550, color:'blue'}

var otherPlayers = [
    { x: 100, y: 75, color: 'red' },
    { x: 300, y: 400, color: 'purple' }
];

//var board = Array.build(gridHeight, gridWidth, 0);
//var overLayer = Array.build(gridHeight, gridWidth, 0);
var leaderboard = [];

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
ctx.canvas.width = window.innerWidth;
ctx.canvas.height = window.innerHeight;

// Total number of tiles in game 
var gridHeight = 50;
var gridWidth = 100;
var tileLength_start = 50;
var tileLength_min = 25;

ctx.fillStyle = 'green';
ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
var lineColor = '#000000';

// Draws a sprite at a specified location
function drawSprite(xpos, ypos, src, scalar, offset, alpha=1) {
    var sprite = new Image();
    sprite.src = src;
    sprite.onload = function() {
        // Scale down the canvas to draw the image, draw it, then scale back up
        ctx.scale(scalar, scalar);
        ctx.globalAlpha = alpha;
        ctx.drawImage(sprite, xpos/scalar+offset, ypos/scalar+offset);
        ctx.scale(1/scalar, 1/scalar);
        ctx.globalAlpha = 1;
    };
}

// MAKE SURE TO SEPARATE STUFF OUT LATER!!!!!
function drawGrid(xmin, ymin, xmax, ymax, tileLength)
{
    var board = Array.build(gridHeight, gridWidth, 0);
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
                case (0):
                    drawSprite(x*tileLength-xmin, y*tileLength-ymin, 'sprites/dirt.jpg', .191, 0);
                    break;
                case (1):
                    ctx.fillStyle = 'red';
                    ctx.fillRect(x*tileLength-xmin, y*tileLength-ymin, tileLength-1, tileLength-1);
                    drawSprite(x*tileLength-xmin, y*tileLength-ymin, 'sprites/plant.png', .245, 0, .6);
                    break;
                case (2):
                    ctx.fillStyle = 'purple';
                    ctx.fillRect(x*tileLength-xmin, y*tileLength-ymin, tileLength-1, tileLength-1);
                    drawSprite(x*tileLength-xmin, y*tileLength-ymin, 'sprites/plant.png', .245, 0, .6);
                    break;                
                default:
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
    var overLayer = Array.build(gridHeight, gridWidth, 0);
    // 'w' could stand for water, currently just testing to see if it works
    overLayer[3][28] = 1;
    overLayer[4][29] = 1;
    overLayer[7][7] = 1;
    overLayer[4][8] = 'H';

    for (var y = 0; y < gridHeight; y++) 
    {
        for (var x = 0; x < gridWidth; x++) 
        {
        	if (x*tileLength>=xmin-tileLength && x*tileLength<xmax && y*tileLength>=ymin-tileLength && y*tileLength<ymax)
            {
	            switch (overLayer[y][x]) 
	            {
	                case (0):
	                    break;
	                case (1):
	                    drawSprite(x*tileLength, y*tileLength, 'sprites/water_bucket.png', .25, 22);
	                    break;
	                case ('H'):
						// This is the case where the tile is a house space
						drawSprite(x*tileLength-xmin, y*tileLength-ymin, 'sprites/house.png', .245, 15);
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

// When we actually make this work we should probably draw a circle when a player connects
// That player can then move their own circle around the game
function drawPlayers() {
    var i = 0;
    otherPlayers.forEach(function() {
        ctx.beginPath();
        ctx.arc(otherPlayers[i].x, otherPlayers[i].y, 10, 0, 2*Math.PI);
        ctx.fillStyle = otherPlayers[i].color;
        ctx.fill();
        i++;
    });
}

// This function will dynamically follow the player, drawing the board
// around him/her as he moves in realtime
function drawPlayerWindow()  {
    // Record the board's visible bounds
    var min_x = thisPlayer.x<tileLength_start*10 ? 0 : thisPlayer.x-tileLength_start*10;
    var min_y = thisPlayer.y<tileLength_start*10 ? 0 : thisPlayer.y-tileLength_start*10;
    var max_x = min_x+tileLength_start*30;
    var max_y = min_y+tileLength_start*30;

    drawGrid(min_x, min_y, max_x, max_y, tileLength_start);
    drawOverlayer(min_x, min_y, max_x, max_y, tileLength_start);
}

// This function is used to load images prior to their use
// so that there is no draw delay
function init_images()
{

}

// Main game loop
var lastTime;
// TODO: actually animate
// Currently static
function gameLoop()
{
    drawPlayerWindow();
    drawOverlayer(tileLength_start);
    // drawPlayers(); // obsolete function call
    drawLeaderboard();
    drawScore();
    drawCurrentPowerup();
    // var now = Date.now();
    // var dt = (now - lastTime) / 1000.0;
    // update(dt);
    // render();
    // lastTime = now;
    // requestAnimationFrame(gameLoop);
}

function init() {
    // document.getElementById('play-again').addEventListener('click', function() {
    //     reset();
    // });
    reset();
    lastTime = Date.now();
    init_images();
    gameLoop();
}

gameLoop();