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

var thisPlayer = {
    x:null,
    y:null,
    name:'',
    speed:125,
    color:null,
    score:0,
    powerup:''
};

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

//     board_tileLength : window.innerWidth / numTiles_x,
//     objective_tileLength : 20,

//     numTiles_x : numTiles_x_start,
//     numTiles_y : window.innerHeight / board_tileLength + 1,

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
// }

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
ctx.canvas.width = window.innerWidth;
ctx.canvas.height = window.innerHeight;

var gridHeight = 50;   //
var gridWidth = 100;   //

var numTiles_x_start = 20;  //
var numTiles_x_max = 30;    //

// Number of visible tiles (width)
var numTiles_x = numTiles_x_start;  //
var numTiles_y = window.innerHeight / board_tileLength + 1; //
var board_tileLength = window.innerWidth / numTiles_x;  //

// For syncing player movement with board
var objective_tileLength = 20;  //

// Record the board's visible bounds
var vizmin_x = null;   //    
var vizmin_y = null;   //
var vizmax_x = null;   //
var vizmax_y = null;   //

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
var tilled = new Image();

var mouseX = null;
var mouseY = null;

// Updates global variables for board drawing
function updateBoardVars() {
    board_tileLength = window.innerWidth / numTiles_x;

    // Number of visible tiles
    numTiles_y = window.innerHeight / board_tileLength;

    // Relate player objective scale to drawing scale
    var xPos = thisPlayer.x / objective_tileLength * board_tileLength;
    var yPos = thisPlayer.y / objective_tileLength * board_tileLength;

    // Record the board's visible bounds
    // X
    if (xPos < board_tileLength*numTiles_x / 2)
        vizmin_x = 0;
    else if (xPos > board_tileLength*gridWidth - board_tileLength*numTiles_x / 2)
        vizmin_x = board_tileLength*gridWidth - board_tileLength*2*numTiles_x / 2;
    else
        vizmin_x = xPos-board_tileLength*numTiles_x / 2;
    // Y
    if (yPos < board_tileLength*numTiles_y / 2)
        vizmin_y = 0;
    else if (yPos > board_tileLength*gridHeight - board_tileLength*numTiles_y / 2)
        vizmin_y = board_tileLength*gridHeight - board_tileLength*2*numTiles_y / 2;
    else
        vizmin_y = yPos-board_tileLength*numTiles_y / 2;

    vizmax_x = vizmin_x+board_tileLength*numTiles_x;
    vizmax_y = vizmin_y+board_tileLength*numTiles_y;
}

// Gets the player's entered name
function getName() {
    thisPlayer.name = document.getElementById("pname").value;

    window.addEventListener('mousemove', mouseInput, false);
    window.addEventListener('keypress', keyInput, false);
    window.addEventListener('click', mouseClick, false);
    socket.emit('newPlayer', {name: thisPlayer.name});
}

// This function will draw an image in the exact dimensions we want.
// It will be useful for resizing tiles as the window resizes
function drawSprite(img, x, y, w, h, alpha) {
    ctx.globalAlpha = alpha; // The site doesn't work with this line for me
    ctx.drawImage(img, x, y, w, h);
    ctx.globalAlpha = 1;
}

// MAKE SURE TO SEPARATE STUFF OUT LATER!!!!!
function drawGrid(xmin, ymin, xmax, ymax, board_tileLength) {
    for (var y = 0; y < gridHeight; y++) {
        for (var x = 0; x < gridWidth; x++) {
            xLength = x*board_tileLength;
            yLength = y*board_tileLength;
            if (xLength>=xmin-board_tileLength && xLength<xmax && yLength>=ymin-board_tileLength && yLength<ymax) {
                ctx.strokeRect(xLength-xmin, yLength-ymin, board_tileLength, board_tileLength);
                switch (board[y][x]) {
                    // We can use characters to represent non-plant tiles
                    case ('t'):
                        drawSprite(tilled, xLength-xmin, yLength-ymin, board_tileLength, board_tileLength, 1);
                        break;
                    case (0): // Dirt
                        drawSprite(dirt, xLength-xmin, yLength-ymin, board_tileLength, board_tileLength, 1);
                        break;
                    default: // Player's color
                        if (allPlayers[board[y][x]]) {
                            ctx.fillStyle = allPlayers[board[y][x]].color;
                        }
                        ctx.fillRect(xLength-xmin, yLength-ymin, board_tileLength, board_tileLength);
                        drawSprite(tilled, xLength-xmin, yLength-ymin, board_tileLength, board_tileLength, 0.8 - (plantRanks[y][x])*1.5);
                        drawSprite(plant, xLength-xmin, yLength-ymin, board_tileLength, board_tileLength, plantRanks[y][x]*0.75);
                        break;
                }
            }
        }
    }
}

function drawOverlayer(xmin, ymin, xmax, ymax, board_tileLength) {
    // Temp variable to curb ridiculously long lines
    var tl = board_tileLength;
    // For each tile
    for (var y = 0; y < gridHeight; y++) {
        for (var x = 0; x < gridWidth; x++) {
            if (x*board_tileLength>=xmin-tl && x*tl<xmax && y*tl>=ymin-tl && y*tl<ymax) {
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
    var powstring = ' Current Powerup: ';
    switch (thisPlayer.powerup) {
        case (''):
            powstring += '  --';
            break;
        case ('house'):
            powstring = ' Place Farmhouse ';
            drawSprite(house, 190, 17, 40, 40);
            break;
        case ('waterbucket'):
            drawSprite(waterBucket, 185, 18, 40, 40);
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
    var xPos = thisPlayer.x / objective_tileLength * board_tileLength;
    var yPos = thisPlayer.y / objective_tileLength * board_tileLength;

    ctx.beginPath();
    ctx.arc(xPos-xmin, yPos-ymin, board_tileLength/2.25, 0, 2*Math.PI, false);
    ctx.fillStyle = thisPlayer.color;
    ctx.fill();
}

// This function will dynamically follow the player, drawing the board
// around him/her as he moves in realtime
function drawViewport() {
    // Draw this if the player is ready
    if (thisPlayer.color !== null) {
        updateBoardVars();
        drawGrid(vizmin_x, vizmin_y, vizmax_x, vizmax_y, board_tileLength);
        drawOverlayer(vizmin_x, vizmin_y, vizmax_x, vizmax_y, board_tileLength);
        // And the player too!
        drawPlayer(vizmin_x, vizmin_y);
    } else {
        numTiles_x = gridWidth * 0.5;
        updateBoardVars();
        drawGrid(0, 0, gridWidth*board_tileLength, gridHeight*board_tileLength, board_tileLength);
        drawOverlayer(vizmin_x, vizmin_y, vizmax_x, vizmax_y, board_tileLength);
        numTiles_x = numTiles_x_start;
    }
}

// Use powerup on space or enter key
function keyInput(key) {
    if ((key.charCode == 13 || key.charCode == 32) && thisPlayer.powerup !== '') {
        var xTile = Math.floor(thisPlayer.x / objective_tileLength);
        var yTile = Math.floor(thisPlayer.y / objective_tileLength);
        data = {playerid:thisPlayer.id, powerup:thisPlayer.powerup, x:xTile, y:yTile};
        socket.emit('2', data);
        thisPlayer.powerup = '';
    }
}

// Set movement direction on mouse position
function mouseInput(mouse) {
    mouseX = mouse.clientX;
    mouseY = mouse.clientY;
}

// Till land on mouse click
function mouseClick() {
    xTile = Math.floor(thisPlayer.x / objective_tileLength);
    yTile = Math.floor(thisPlayer.y / objective_tileLength);
    if (board[yTile][xTile] === 0) {
        board[yTile][xTile] = 't';
        socket.emit('1', {x:xTile, y:yTile});
    }
}

// Moves the player
function playerMove() {
    if (mouseX !== null) {
        // This should not work, vizmin_x and vizmin_y are still out of scope
        updateBoardVars();

        // mov is the player diameter
        var mov = 2*(board_tileLength/2.25);
        // distances in x and y of mouse from player, player pos needs to be converted to 
        // reflect relative board vision (thisPlayer.x is objective position)
        relPosX = thisPlayer.x / objective_tileLength * board_tileLength - vizmin_x;
        relPosY = thisPlayer.y / objective_tileLength * board_tileLength - vizmin_y;
        var distX = mouseX - (relPosX-mov/2);
        var distY = mouseY - (relPosY-mov/2);

        if (distX !== 0 && distY !== 0) {
            angle = Math.atan2(distX, distY*-1);

            thisPlayer.x -= (((relPosX - mov/2) - mouseX + board_tileLength/2)/thisPlayer.speed);
            thisPlayer.y -= (((relPosY - mov/2) - mouseY + board_tileLength/2)/thisPlayer.speed);
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
    tilled.src = 'sprites/tilled.jpg';
}

function initSocket(socket) {
    socket.on('playerCreated', function(data) {
        console.log('console.on:playerCreated');
        thisPlayer = data;
    });

    socket.on('setup', function(data) {
        console.log('console.on:setup');
        allPlayers = data.users;
        leaderboard = data.leaderboard;
        board = data.board;
        overlayer = data.overlayer;
    });

    socket.on('newJoin', function(data) {
        console.log('socket.on:newJoin');
        allPlayers[data.newPlayer.id] = data.newPlayer;
        leaderboard = data.leaderboard;
    });

    socket.on('aDisconnect', function(data) {
        console.log('socket.on:aDisconnect');
        // TODO: remove disconnected player from local allPlayers
    });

    socket.on('powerupUsed', function(data) {
        console.log('socket.on:powerupUsed');
        if (data.powerup == 'house') {
            overlayer[data.y][data.x] = 1;
        } else if (data.powerup == 'waterbucket') {
            
        } else if (data.powerup == 'boots') {
            
        }
    });

    socket.on('powerupSpawned', function(data) {
        console.log('socket.on:powerupSpaned');
        if (data.powerup == 'waterbucket') {
            overlayer[data.y][data.x] = 2;
        }
    });

    socket.on('overlayerUpdate', function(data) {
        console.log('socket.on:overlayerUpdate');
        overlayer[data.y][data.x]=0;
    });

    socket.on('boardUpdateAll', function(data) {
        console.log('socket.on:boardUpdateAll');
        board = data.board;
        plantRanks = data.plantRanks;
    });

    socket.on('boardUpdate', function(data) {
        console.log('socket.on:boardUpdate');
        board[data.y][data.x] = data.value;
    });

    socket.on('leaderboardUpdate', function(data) {
        console.log('socket.on:leaderboardUpdate');
        leaderboard = data;
        console.log(allPlayers[leaderboard[0]].score);
    });
}

// Picks up whatever item the player is standing on
// if the player is standing
function processOverlayer() {
    // thisPlayer.x = the current objective position of the player
    var xTile = Math.floor(thisPlayer.x / objective_tileLength);
    var yTile = Math.floor(thisPlayer.y / objective_tileLength);

    // The object of the tile you are currently standing on
    if (thisPlayer.powerup === '') {
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
            socket.emit('3', {x:xTile, y:yTile});
            break;
        case (3):
            // Seeds
            break;
        case (4):
            // Boots
            break;
        default:
            break;
        }
    }
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
