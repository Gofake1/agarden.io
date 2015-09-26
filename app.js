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

var players = [
    { x: 100, y: 75, color: 'red' },
    { x: 300, y: 400, color: 'purple' }
];
//var board = Array.build(gridHeight, gridWidth, 0);
//var pickups = Array.build(gridHeight, gridWidth, 0);
var leaderboard = [];

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
ctx.canvas.width = window.innerWidth;
ctx.canvas.height = window.innerHeight;

// Total number of tiles in game 
var gridHeight = 50;
var gridWidth = 100;
var tileLength = 15;

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
        ctx.drawImage(sprite, xpos/scalar*tileLength+offset, ypos/scalar*tileLength+offset);
        ctx.globalAlpha = 1.0;
        ctx.scale(1/scalar, 1/scalar);
    };
}

// MAKE SURE TO SEPARATE STUFF OUT LATER!!!!!
function drawGrid() {
    var board = Array.build(gridHeight, gridWidth, 0);
    // Red Farmer
    board[3][28] = 1;
    board[3][29] = 1;
    board[4][28] = 1;
    board[5][28] = 1;
    board[4][29] = 1;
    board[5][29] = 1;
    board[3][30] = 1;

    // Purple Farmer
    board[35][70] = 2;
    board[36][70] = 2;
    board[37][70] = 2;
    board[36][71] = 2;
    board[36][72] = 2;
    board[35][71] = 2;

    for (var y = 0; y < gridHeight; y++){
        for (var x = 0; x < gridWidth; x++){
            ctx.strokeRect(x*tileLength, y*tileLength, tileLength, tileLength);
            switch (board[y][x]) {
                case (0):
                    drawSprite(x, y, 'sprites/dirt.jpg', 0.055, 0);
                    break;
                case (1):
                    ctx.fillStyle = 'red';
                    ctx.fillRect(x*tileLength, y*tileLength, tileLength, tileLength);
                    drawSprite(x, y, 'sprites/plant.png', .07, 0, .7);                    break;
                case (2):
                    ctx.fillStyle = 'purple';
                    ctx.fillRect(x*tileLength, y*tileLength, tileLength, tileLength);
                    drawSprite(x, y, 'sprites/plant.png', .07, 0, .7);
=                    break;
                default:
                    ctx.fillStyle = 'black';
                    ctx.fillRect(x*tileLength, y*tileLength, tileLength, tileLength);
                    break;
            }
        }
    }

}

function drawPickups() {
    var pickups = Array.build(gridHeight, gridWidth, 0);
    // 'w' could stand for water, currently just testing to see if it works
    pickups[3][28] = 1;
    pickups[4][29] = 1;
    pickups[7][15] = 1;

    for (var y = 0; y < gridHeight; y++) {
        for (var x = 0; x < gridWidth; x++) {
            switch (pickups[y][x]) {
                case (0):
                    break;
                case (1):
                    drawSprite(x, y, 'sprites/water_bucket.png', .07, 25);
                    break;
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
    players.forEach(function(x, y, color) {
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, 2*Math.PI, false);
        ctx.fillStyle = color;
        ctx.fill();
    });
}

// Main game loop
var lastTime;
// TODO: actually animate
// Currently static
function gameLoop() {
    drawGrid();
    drawPickups();
    drawPlayers();
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
    gameLoop();
}

gameLoop();





