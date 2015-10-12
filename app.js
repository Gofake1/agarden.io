var socket = io();

var Board = function(numRows, numCols, value) {
    this.array = [];
    for (var i = 0; i < numRows; i++) {
        var column = [];
        for (var j = 0; j < numCols; j++) {
            column.push(value);
        }
        this.array.push(column);
    }
    return this.array;
};

var thisPlayer = { x:80, y:80, name:'Guest', speed:125, color:'blue', score:0, powerup:'' };

// var Map = {
//     // Total number of tiles in game 
//     gridHeight : 50,
//     gridWidth : 100,
//     board : Board(gridHeight, gridWidth, 0),
//     overlayer : Board(gridHeight, gridWidth, 0)
// }

// var Viewport = {
//     numTiles_x_start : 2,
//     numTiles_x_max : 30,

//     boardTileLength : window.innerWidth / numTiles_x,
//     objective_tileLength : 20,

//     numTiles_x : numTiles_x_start,
//     numTiles_y : window.innerHeight / boardTileLength + 1,

//     vizmin_x : null,
//     vizmin_y : null,
//     vizmax_x : null,
//     vizmax_y : null
// }

// class Plant {
//     this.stage = 1;
//     this.health = 100;
//     this.strength = 1;
// }

// class Game {
//    
//}

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
ctx.canvas.width = window.innerWidth;
ctx.canvas.height = window.innerHeight;

var gridHeight = 50;    //
var gridWidth = 100;    //

var numTiles_x_start = 20;  //
var numTiles_x_max = 30;    //

// Number of visible tiles (width)
var numTiles_x = numTiles_x_start;  //
var numTiles_y = window.innerHeight / boardTileLength + 1; //
var boardTileLength = window.innerWidth / numTiles_x;  //

// For syncing player movement with board
var objective_tileLength = 20;  //

// Record the board's visible bounds
var vizmin_x = null;    //    
var vizmin_y = null;    //
var vizmax_x = null;    //
var vizmax_y = null;    //

// Game variables
var initGrowthAlpha = 0.8;
var board = Board(gridHeight, gridWidth, 0);
var plantRanks = Board(gridHeight, gridWidth, 0);
var overlayer = Board(gridHeight, gridWidth, 0);
var allPlayers = {};
var leaderboard = [];

// Sprites
var dirt = new Image();
var plant = new Image();
var waterBucket = new Image();
var house = new Image();

var mouseX = null;
var mouseY = null;

// Updates global variables for board drawing
function updateBoardVars() {
    // Number of visible tiles
    numTiles_y = window.innerHeight / boardTileLength;

    // Relate player objective scale to drawing scale
    var xPos = thisPlayer.x / objective_tileLength * boardTileLength;
    var yPos = thisPlayer.y / objective_tileLength * boardTileLength;

    // Record the board's visible bounds
    // X
    if (xPos < boardTileLength*numTiles_x / 2)
        vizmin_x = 0;
    else if (xPos > boardTileLength*gridWidth - boardTileLength*numTiles_x / 2)
        vizmin_x = boardTileLength*gridWidth - boardTileLength*2*numTiles_x / 2;
    else
        vizmin_x = xPos-boardTileLength*numTiles_x / 2;
    // Y
    if (yPos < boardTileLength*numTiles_y / 2)
        vizmin_y = 0;
    else if (yPos > boardTileLength*gridHeight - boardTileLength*numTiles_y / 2)
        vizmin_y = boardTileLength*gridHeight - boardTileLength*2*numTiles_y / 2;
    else
        vizmin_y = yPos-boardTileLength*numTiles_y / 2;

    vizmax_x = vizmin_x+boardTileLength*numTiles_x;
    vizmax_y = vizmin_y+boardTileLength*numTiles_y;
}

// Gets the player's entered name
function getName() {
    var pname = document.getElementById("pname").value;
    // TODO:
    // WERE GOING TO WANT TO REMOVE THIS AFTER THE DEMO
    window.setInterval(processBoard, 10000);
    //window.setInterval(plantGrowth, 5000);

    window.addEventListener('mousemove', mouseInput, false);
    window.addEventListener('keypress', keyInput, false);
    socket.emit('newPlayer', {name: pname});
}

// This function will draw an image in the exact dimensions we want.
// It will be useful for resizing tiles as the window resizes
function drawSprite(img, x, y, w, h, alpha) {
    ctx.globalAlpha = alpha; // The site doesn't work with this line for me
    ctx.drawImage(img, x, y, w, h);
    ctx.globalAlpha = 1;
}

// MAKE SURE TO SEPARATE STUFF OUT LATER!!!!!
function drawGrid(xmin, ymin, xmax, ymax, boardTileLength) {
    for (var y = 0; y < gridHeight; y++) {
        for (var x = 0; x < gridWidth; x++) {
            xLength = x*boardTileLength;
            yLength = y*boardTileLength;
            if (xLength>=xmin-boardTileLength && xLength<xmax && yLength>=ymin-boardTileLength && yLength<ymax) {
                ctx.strokeRect(xLength-xmin, yLength-ymin, boardTileLength, boardTileLength);
                switch (board[y][x]) {
                    case (0): // Dirt
                        drawSprite(dirt, xLength-xmin, yLength-ymin, boardTileLength, boardTileLength, 1);
                        break;
                    default: // Player's color
                        ctx.fillStyle = allPlayers[board[y][x]].color;
                        ctx.fillRect(xLength-xmin, yLength-ymin, boardTileLength, boardTileLength);
                        drawSprite(plant, xLength-xmin, yLength-ymin, boardTileLength, boardTileLength, plantRanks[y][x]);
                        break;
                }
            }
        }
    }
}

function drawOverlayer(xmin, ymin, xmax, ymax, boardTileLength) {
    // Temp variable to curb ridiculously long lines
    var tl = boardTileLength;
    // For each tile
    for (var y = 0; y < gridHeight; y++) {
        for (var x = 0; x < gridWidth; x++) {
            if (x*boardTileLength>=xmin-tl && x*tl<xmax && y*tl>=ymin-tl && y*tl<ymax) {
                switch (overlayer[y][x]) {
                    case (1):
                        drawSprite(house, x*tl-xmin, y*tl-ymin, tl, tl, 1);
                        break;
                    case (2):
                        drawSprite(waterBucket, x*tl-xmin+tl/9, y*tl-ymin+tl/9, tl*3/4, tl*3/4, 1);
                        break;
                    default:
                        break;
                }
            }
        }
    }
}

// MAKE THIS DYNAMIC, GLOBAL CONSTANTS
function drawLeaderboard() {
    ctx.globalAlpha = 0.4;
    ctx.strokeRect(window.innerWidth-250, 10, 240, 300);
    ctx.fillStyle = 'black';
    ctx.fillRect(window.innerWidth-250, 10, 240, 300);

    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Leaderboard', window.innerWidth-190, 40);

    var newLineHeight = 50;
    leaderboard.forEach(function(value, index) {
        newLineHeight += 20;
        var rank = index+1;
        ctx.fillText(rank+'. '+value, window.innerWidth-230, newLineHeight);
    });
}

// MAKE THIS DYNAMIC
function drawScore() {
    ctx.globalAlpha = 0.4;
    ctx.strokeRect(10, window.innerHeight-60, 250, 50);
    ctx.fillStyle = "black";
    ctx.fillRect(10, window.innerHeight-60, 250, 50);

    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Score: '+thisPlayer.score, 15, window.innerHeight-30);
}

function drawCurrentPowerup() {
    ctx.globalAlpha = 0.4;
    ctx.strokeRect(10, 10, 300, 55);
    ctx.fillStyle = 'black';
    ctx.fillRect(10, 10, 300, 55);

    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';

    // create the powerup string
    var powstring = 'Current Powerup: ';
    switch (thisPlayer.powerup) {
        case (''):
            powstring += '--';
            break;
        case ('house'):
            powstring = 'Place farmhouse';
            break;
        case ('waterbucket'):
            drawSprite(waterBucket, 175, 10, board_tileLength*3/4, board_tileLength*3/4, 1);
            break;
        default:
            powstring += 'ERROR!!!';
            break;
    }
    ctx.fillText(powstring, 15, 45);
}

// Draws this specific player as opposed to the opposing players
function drawPlayer(xmin, ymin) {
    // Convert player pos to board pos
    var xPos = thisPlayer.x / objective_tileLength * boardTileLength;
    var yPos = thisPlayer.y / objective_tileLength * boardTileLength;

    ctx.beginPath();
    ctx.arc(xPos-xmin, yPos-ymin, boardTileLength/2.25, 0, 2*Math.PI, false);
    ctx.fillStyle = thisPlayer.color;
    ctx.fill();
}

// This function will dynamically follow the player, drawing the board
// around him/her as he moves in realtime
function drawViewport() {
    updateBoardVars();

    // This should not be working. vizmin_x and vizmin_y are out of scope here

    // Draw that board!
    drawGrid(vizmin_x, vizmin_y, vizmax_x, vizmax_y, boardTileLength);
    drawOverlayer(vizmin_x, vizmin_y, vizmax_x, vizmax_y, boardTileLength);

    // And the player too!
    drawPlayer(vizmin_x, vizmin_y);
}

// Handles keyboard input
function keyInput(key) {
    // Use powerup on space or enter key
    if ((key.keyCode == 13 || key.keyCode == 32) && thisPlayer.powerup !== '') {
        var xTile = Math.floor(thisPlayer.x / objective_tileLength);
        var yTile = Math.floor(thisPlayer.y / objective_tileLength);
        data = {id:thisPlayer.id, powerup:thisPlayer.powerup, x:xTile, y:yTile};
        socket.emit('2', data);
        thisPlayer.powerup = '';
    }
}

// Handles mouse movement
function mouseInput(mouse) {
    mouseX = mouse.clientX;
    mouseY = mouse.clientY;
}

// Moves the player
function playerMove() {
    if (mouseX !== null) {
        // This should not work, vizmin_x and vizmin_y are still out of scope
        updateBoardVars();

        // mov is the player diameter
        var mov = 2*(boardTileLength/2.25);
        // distances in x and y of mouse from player, player pos needs to be converted to 
        // reflect relative board vision (thisPlayer.x is objective position)
        relPosX = thisPlayer.x / objective_tileLength * boardTileLength - vizmin_x;
        relPosY = thisPlayer.y / objective_tileLength * boardTileLength - vizmin_y;
        var distX = mouseX - (relPosX-mov/2);
        var distY = mouseY - (relPosY-mov/2);

        if (distX !== 0 && distY !== 0) {
            angle = Math.atan2(distX, distY*-1);

            thisPlayer.x -= (((relPosX - mov/2) - mouseX)/thisPlayer.speed);
            thisPlayer.y -= (((relPosY - mov/2) - mouseY)/thisPlayer.speed);
        }
    }
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
    socket.on('playerCreated', function(data) {
        thisPlayer = data;
    });

    socket.on('setup', function(data) {
        allPlayers = data.users;
        leaderboard = data.leaderboard;
        board = data.board;
        overlayer = data.overlayer;
    });

    socket.on('newJoin', function(data) {
        allPlayers[data.newPlayer.id] = data.newPlayer;
        leaderboard = data.leaderboard;
    });

    socket.on('aDisconnect', function(data) {
        // TODO: remove disconnected player from local allPlayers
    });

    socket.on('powerupUsed', function(data) {
        if (data.powerup == 'house') {
            overlayer[data.y][data.x] = 1;
        } else if (data.powerup == 'waterbucket') {
            
        }
    });

    socket.on('powerupSpawned', function(data) {
        if (data.powerup == 'waterbucket') {
            overlayer[data.x][data.y] = 2;
        }
    });
}

// Picks up whatever item the player is standing on
// if the player is standing
function processOverlayer() {
    // thisPlayer.x = the current objective position of the player
    var xTile = Math.floor(thisPlayer.x / objective_tileLength);
    var yTile = Math.floor(thisPlayer.y / objective_tileLength);

    // The object of the tile you are currently standing on
    if (thisPlayer.powerup === 0) {
        current = overlayer[yTile][xTile];
        switch (current) {
        case (0):
            // Empty, do nothing
            break;
        case (1):
            // House, do nothing
            break;
        case (2):
            // Water bucket
            thisPlayer.powerup = 'waterbucket';
            overlayer[yTile][xTile] = 0;
            break;
        default:
            break;
        }
    }
}

// Handles a single plant expansion
function expandPlant(b, type, x, y) {
    grow = 0;
    b[y][x] = type;
    for (var i=-1; i<=1; i+=2) {
        for (var j=-1; j<=1; j+=2) {
            if (y+i>gridHeight-1 || y+i<0 || x+j>gridWidth-1 || x+j<0) {
                // do nothing, out of bounds
            }

            // Expand to a new tile
			else if (board[y+i][x+j] === 0 && grow === 0) {
				b[y+i][x+j] = type;
                plantRanks[y+i][x+j] = 0.6;
                grow = 1;
                thisPlayer.score += 1;
            }

            // Grow the plant
            else if(plantRanks[y+i][x+j] > 0.5) {
                plantRanks[y+i][x+j] -= 0.1;
            }
        }
    }
}

// Process the board's plant expansion (rudimentery for vert prototype)
function processBoard() {
    newBoard = Board(gridHeight, gridWidth, 0);
    for (var y = 0; y < gridHeight; y++) {
        for (var x = 0; x < gridWidth; x++) {
            xLength = x*boardTileLength;
            yLength = y*boardTileLength;
            if (x>100 || x<0 || y>50 || y<0) {
               // do nothing, out of bounds
            }
            else {
                 switch (board[y][x]) {
                    case (0): // DIRT
                        // Board is already full of zeros, no need for operation
                        break;
                    default: // TODO: grow plant for any player

                        break;
                }
            }
        }
    }
    board = newBoard;
}

// Calls all needed object update functions
function update(dt) {
    processOverlayer();
}

function gameLoop() {
    drawViewport();
    drawLeaderboard();
    drawScore();
    drawCurrentPowerup();
    playerMove();
  
    var now = Date.now();
    var dt = (now - lastTime) / 1000.0;
    update(dt);
    lastTime = now;
    requestAnimationFrame(gameLoop);
}

function init() {
    // Fill the canvas with green
    ctx.fillStyle = 'green';
    // Fill entire canvas
    ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
    // document.getElementById('play-again').addEventListener('click', function() {
    //     reset();
    // });
    // reset();
    initImages();
    initSocket(socket);
    gameLoop();
}

socket.on('connected');
var lastTime;
init();
