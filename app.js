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

// var Plant = function(rank, pid, power) {
//     var plant;
//     plant.rank  = rank;
//     plant.pid   = pid;
//     plant.power = power;
//     plant.powerTime = 0;
//     return plant;
// };

var thisPlayer = {
    id:       null,
    x:        null,
    y:        null,
    name:     '',
    speed:    125,
    color:    null,
    powerup:  '',
    connected:true,
    powerupsUsed: 0,
    captured: null
};

var Map = {
    // Total number of tiles in game 
    gridHeight:50,
    gridWidth: 100,
    board:     null,
    overlayer: null
};

var Viewport = {
    // Start and end values are for viewport expansion
    numTiles_x_start:20,
    numTiles_x_max:  30,

    numTiles_x:this.numTiles_x_start, // Number of visible tiles (width)
    board_tileLength:window.innerWidth / this.numTiles_x,
    objective_tileLength:20, // For syncing player movement with Map.board
    numTiles_y:window.innerHeight / this.board_tileLength + 1,

    // Record the Map.board's visible bounds
    vizmin_x:null,
    vizmin_y:null,
    vizmax_x:null,
    vizmax_y:null
};

var canvas        = document.getElementById('canvas');
var ctx           = canvas.getContext('2d');
ctx.canvas.width  = window.innerWidth;
ctx.canvas.height = window.innerHeight;

// Game variables
var initGrowthAlpha = 0.8;
var plants          = Board(Map.gridHeight, Map.gridWidth, 0);
var allPlayers      = {};
var scores          = {};
var leaderboard     = [];
var deadColor       = '#BCBCBC';
var scoreHistory    = {};
var startTime;
var endTime;

// Sprites
var dirt        = new Image();
var plant       = new Image();
var waterBucket = new Image();
var boots       = new Image();
var house       = new Image();
var tilled      = new Image();
var seeds       = new Image();

var mouseX = null;
var mouseY = null;

// Updates global variables for Map.board drawing
function updateBoardVars() {
    Viewport.board_tileLength = window.innerWidth / numTiles_x;

    // Number of visible tiles
    Viewport.numTiles_y = window.innerHeight / Viewport.board_tileLength;

    // Relate player objective scale to drawing scale
    var xPos = thisPlayer.x / Viewport.objective_tileLength * Viewport.board_tileLength;
    var yPos = thisPlayer.y / Viewport.objective_tileLength * Viewport.board_tileLength;

    // Record the Map.board's visible bounds
    // X
    if (xPos < Viewport.board_tileLength*numTiles_x / 2)
        Viewport.vizmin_x = 0;
    else if (xPos > Viewport.board_tileLength*Map.gridWidth -
                    Viewport.board_tileLength*numTiles_x / 2)
        Viewport.vizmin_x = Viewport.board_tileLength*Map.gridWidth -
                            Viewport.board_tileLength*2*numTiles_x / 2;
    else
        Viewport.vizmin_x = xPos-Viewport.board_tileLength*numTiles_x / 2;
    // Y
    if (yPos < Viewport.board_tileLength*Viewport.numTiles_y / 2)
        Viewport.vizmin_y = 0;
    else if (yPos > Viewport.board_tileLength*Map.gridHeight -
                    Viewport.board_tileLength*Viewport.numTiles_y / 2)
        Viewport.vizmin_y = Viewport.board_tileLength*Map.gridHeight -
                            Viewport.board_tileLength*2*Viewport.numTiles_y / 2;
    else
        Viewport.vizmin_y = yPos-Viewport.board_tileLength*Viewport.numTiles_y / 2;

    Viewport.vizmax_x = Viewport.vizmin_x+Viewport.board_tileLength*numTiles_x;
    Viewport.vizmax_y = Viewport.vizmin_y+Viewport.board_tileLength*Viewport.numTiles_y;
}

// Gets the player's entered name
function getName() {
    thisPlayer.name = document.getElementById('pname').value;

    // Enable game inputs
    window.addEventListener('mousemove', mouseInput, false);
    window.addEventListener('keypress', keyInput, false);
    window.addEventListener('click', mouseClick, false);
    socket.emit('newPlayer', {name: thisPlayer.name});
}

// This function will draw an image in the exact dimensions we want.
// It will be useful for resizing tiles as the window resizes
function drawSprite(img, x, y, w, h, alpha) {
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, x, y, w, h);
    ctx.globalAlpha = 1;
}

// MAKE SURE TO SEPARATE STUFF OUT LATER!!!!!
function drawGrid(xmin, ymin, xmax, ymax, board_tileLength) {
    for (var y = 0; y < Map.gridHeight; y++) {
        for (var x = 0; x < Map.gridWidth; x++) {
            xLength = x*Viewport.board_tileLength;
            yLength = y*Viewport.board_tileLength;
            if (xLength>=xmin-Viewport.board_tileLength && xLength<xmax && 
                yLength>=ymin-Viewport.board_tileLength && yLength<ymax) {
                ctx.strokeRect(xLength-xmin, yLength-ymin, Viewport.board_tileLength, Viewport.board_tileLength);
                switch (Map.board[y][x]) {
                    // We can use characters to represent non-plant tiles
                    case ('t'):
                        drawSprite(tilled, xLength-xmin, yLength-ymin, Viewport.board_tileLength, Viewport.board_tileLength, 1);
                        break;
                    case (0): // Dirt
                        drawSprite(dirt, xLength-xmin, yLength-ymin, Viewport.board_tileLength, Viewport.board_tileLength, 1);
                        break;
                    case (1): // Plant
                        var plantHere = plants[y][x];
                        if (allPlayers[plantHere.pid]) {
                            ctx.fillStyle = allPlayers[plantHere.pid].color;
                            ctx.fillRect(xLength-xmin, yLength-ymin, Viewport.board_tileLength, Viewport.board_tileLength);
                            drawSprite(tilled, xLength-xmin, yLength-ymin, Viewport.board_tileLength, Viewport.board_tileLength, 0.8 - plantHere.rank*1.5);
                            drawSprite(plant, xLength-xmin, yLength-ymin, Viewport.board_tileLength, Viewport.board_tileLength, plantHere.rank*0.75);
                        }
                        break;
                }
            }
        }
    }
}

function drawOverlayer(xmin, ymin, xmax, ymax, board_tileLength) {
    // Temp variable to curb ridiculously long lines
    var tl = Viewport.board_tileLength;
    // For each tile
    for (var y = 0; y < Map.gridHeight; y++) {
        for (var x = 0; x < Map.gridWidth; x++) {
            if (x*Viewport.board_tileLength>=xmin-tl && x*tl<xmax && y*tl>=ymin-tl && y*tl<ymax) {
                switch (Map.overlayer[y][x]) {
                    case (1):
                        drawSprite(house, x*tl-xmin, y*tl-ymin, tl, tl, 1);
                        break;
                    case (2):
                        drawSprite(waterBucket, x*tl-xmin+tl/9, y*tl-ymin+tl/9, tl*3/4, tl*3/4, 1);
                        break;
                    case (3):
                        drawSprite(seeds, x*tl-xmin+tl/9, y*tl-ymin+tl/9, tl*3/4, tl*3/4, 1);
                        break;
                    case (4):
                        drawSprite(boots, x*tl-xmin, y*tl-ymin, tl, tl, 1);
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
    ctx.fillStyle   = 'black';
    ctx.fillRect(window.innerWidth-250, 10, 240, 300);

    ctx.globalAlpha = 0.9;
    ctx.fillStyle   = 'white';
    ctx.font        = '20px Arial';
    ctx.textAlign   = 'left';
    ctx.fillText('Leaderboard', window.innerWidth-190, 40);

    var newLineHeight = 50;
    var rank = 1;
    leaderboard.forEach(function(value, index) {
        if (allPlayers[value] && scores[value] > 0)
        {
            if (allPlayers[value].connected !== false && allPlayers[value].color !== deadColor) {
                newLineHeight += 20;
                //ctx.fillStyle = allPlayers[value].color;
                ctx.fillText(rank+'. '+allPlayers[value].name, window.innerWidth-230, newLineHeight);
                ctx.beginPath();
                ctx.arc(window.innerWidth-50, newLineHeight-9, 9, 0, 2*Math.PI, false);
                ctx.fillStyle = allPlayers[value].color;
                ctx.fill();
                ctx.fillStyle ='white';
                rank++;
            }
        }
    });
}

function drawScore() {
    ctx.globalAlpha = 0.4;
    ctx.strokeRect(10, window.innerHeight-60, 250, 50);
    ctx.fillStyle   = 'black';
    ctx.fillRect(10, window.innerHeight-60, 250, 50);

    ctx.globalAlpha = 0.9;
    ctx.fillStyle   = 'white';
    ctx.font        = '20px Arial';
    ctx.textAlign   = 'left';
    ctx.fillText('Score: '+((scores[thisPlayer.id]=='undefined') ? scores[thisPlayer.id]:0) , 15, window.innerHeight-30);
}

function drawCurrentPowerup() {
    ctx.globalAlpha = 0.4;
    ctx.strokeRect(10, 10, 300, 55);
    ctx.fillStyle   = 'black';
    ctx.fillRect(10, 10, 300, 55);

    ctx.globalAlpha = 0.9;
    ctx.fillStyle   = 'white';
    ctx.font        = '20px Arial';
    ctx.textAlign   = 'left';

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
        case ('seeds'):
            drawSprite(seeds, 185, 18, 40, 40);
            break;
        case ('boots'):
            drawSprite(boots, 185, 18, 40, 40);
            break;
        default:
            powstring += 'ERROR!!!';
            break;
    }
    ctx.fillText(powstring, 15, 45);
}

// Draws this specific player as opposed to the opposing players
function drawPlayer(xmin, ymin) {
    // Convert player pos to Map.board pos
    var xPos = thisPlayer.x / Viewport.objective_tileLength * Viewport.board_tileLength;
    var yPos = thisPlayer.y / Viewport.objective_tileLength * Viewport.board_tileLength;

    ctx.beginPath();
    ctx.arc(xPos-xmin, yPos-ymin, Viewport.board_tileLength/2.25, 0, 2*Math.PI, false);
    ctx.fillStyle = thisPlayer.color;
    ctx.fill();
}

// This function will dynamically follow the player, drawing the Map.board
// around him/her as he moves in realtime
function drawViewport() {
    // Draw this if the player is ready
    if (thisPlayer.color !== null) {
        updateBoardVars();
        drawGrid(Viewport.vizmin_x, Viewport.vizmin_y, Viewport.vizmax_x, Viewport.vizmax_y, Viewport.board_tileLength);
        drawOverlayer(Viewport.vizmin_x, Viewport.vizmin_y, Viewport.vizmax_x, Viewport.vizmax_y, Viewport.board_tileLength);
        // And the player too!
        drawPlayer(Viewport.vizmin_x, Viewport.vizmin_y);
    } else {
        numTiles_x = Map.gridWidth * 0.5;
        updateBoardVars();
        drawGrid(0, 0, Map.gridWidth*Viewport.board_tileLength, Map.gridHeight*Viewport.board_tileLength, Viewport.board_tileLength);
        drawOverlayer(Viewport.vizmin_x, Viewport.vizmin_y, Viewport.vizmax_x, Viewport.vizmax_y, Viewport.board_tileLength);
        numTiles_x = Viewport.numTiles_x_start;
    }
}

function boostSpeed() {
    thisPlayer.speed = 75;
    setTimeout(function() {thisPlayer.speed = 125;}, 10000);
}

// Use powerup on space or enter key
function keyInput(key) {
    var xTile = Math.floor(thisPlayer.x / Viewport.objective_tileLength);
    var yTile = Math.floor(thisPlayer.y / Viewport.objective_tileLength);
    if ((key.charCode == 13 || key.charCode == 32) && thisPlayer.powerup !== '' && xTile < Map.gridWidth && xTile >= 0 && yTile < Map.gridHeight && yTile >= 0)
    {
        if (!(thisPlayer.powerup === 'house' && Map.board[yTile][xTile] === 1))
        {
            data = {playerid:thisPlayer.id, powerup:thisPlayer.powerup, x:xTile, y:yTile};
            if (thisPlayer.powerup === 'boots')
                boostSpeed();
            socket.emit('2', data);
            incrementPowerupsUsed();
            thisPlayer.powerup = '';
        }
    }
}

// Set movement direction on mouse position
function mouseInput(mouse) {
    mouseX = mouse.clientX;
    mouseY = mouse.clientY;
}

// Till land on mouse click
function mouseClick() {
    if (thisPlayer.id !== null)
    {
        xTile = Math.floor(thisPlayer.x / Viewport.objective_tileLength);
        yTile = Math.floor(thisPlayer.y / Viewport.objective_tileLength);
        if (xTile < Map.gridWidth && xTile >= 0 && yTile < Map.gridHeight && yTile >= 0)
        {
            if (Map.board[yTile][xTile] === 0) {
                Map.board[yTile][xTile] = 't';
                socket.emit('1', {x:xTile, y:yTile});
            }
        }
    }
}

// Moves the player
function playerMove() {
    if (mouseX !== null) {
        // This should not work, Viewport.vizmin_x and Viewport.vizmin_y are still out of scope
        updateBoardVars();

        // mov is the player diameter
        var mov = 2*(Viewport.board_tileLength/2.25);
        // Distances in x and y of mouse from player, player pos needs to be converted to 
        // Reflect relative Map.board vision (thisPlayer.x is objective position)
        relPosX = thisPlayer.x / Viewport.objective_tileLength * Viewport.board_tileLength - Viewport.vizmin_x;
        relPosY = thisPlayer.y / Viewport.objective_tileLength * Viewport.board_tileLength - Viewport.vizmin_y;
        var distX = mouseX - (relPosX-mov/2);
        var distY = mouseY - (relPosY-mov/2);

        if (distX !== 0 && distY !== 0) {
            angle = Math.atan2(distX, distY*-1);
            thisPlayer.x -= (((relPosX - mov/2) - mouseX + Viewport.board_tileLength/2)/thisPlayer.speed);
            thisPlayer.y -= (((relPosY - mov/2) - mouseY + Viewport.board_tileLength/2)/thisPlayer.speed);
        }
    }
}

function incrementPowerupsUsed() {
    thisPlayer.powerupsUsed += 1;
}

function timeAlive(start, end) {
    return (end - start)/1000;
}

// This function will be used to load images prior to their use
// so that there is no draw delay
// Draw delay obscures the leaderboard and other text overlay
function initImages() {
    dirt.src        = 'sprites/dirt.jpg';
    plant.src       = 'sprites/plant.png';
    waterBucket.src = 'sprites/water_bucket.png';
    boots.src       = 'sprites/boots.png';
    house.src       = 'sprites/house.png';
    tilled.src      = 'sprites/tilled.jpg';
    seeds.src       = 'sprites/seeds.png';
}

function initSocket(socket) {
    socket.on('playerCreated', function(data) {
        console.log('console.on:playerCreated');
        thisPlayer = data;
    });

    socket.on('setup', function(data) {
        console.log('console.on:setup');
        allPlayers    = data.users;
        scores        = data.scores;
        leaderboard   = data.leaderboard;
        Map.board     = data.board;
        Map.overlayer = data.overlayer;
        deadColor     = data.deadColor;
        startTime     = new Date();
    });

    socket.on('newJoin', function(data) {
        console.log('socket.on:newJoin');
        allPlayers[data.id] = data;
    });

    socket.on('aDisconnect', function(data) {
        console.log('socket.on:aDisconnect');
        allPlayers = data;
    });

    socket.on('powerupUsed', function(data) {
        console.log('socket.on:powerupUsed');
        if (data.powerup == 'house') {
            Map.overlayer[data.y][data.x] = 1;
        } else if (data.powerup == 'waterbucket') {
            
        } else if (data.powerup == 'boots') {
            
        }
    });

    socket.on('powerupSpawned', function(data) {
        console.log('socket.on:powerupSpaned');
        if (data.powerup == 'waterbucket') {
            Map.overlayer[data.y][data.x] = 2;
        }
    });

    socket.on('overlayerUpdate', function(data) {
        console.log('socket.on:overlayerUpdate');
        Map.overlayer[data.y][data.x] = 0;
    });

    socket.on('boardUpdateAll', function(data) {
        console.log('socket.on:boardUpdateAll');
        Map.board = data.board;
        plants = data.plants;
    });

    socket.on('plantsUpdate', function(data) {
        console.log('socket.on:boardUpdateAll');
        plants[data.y][data.x] = data.plant;
    });

    socket.on('boardUpdate', function(data) {
        console.log('socket.on:boardUpdate');
        Map.board[data.y][data.x] = data.value;
    });

    socket.on('leaderboardUpdate', function(data) {
        // commented out for now to make console debugging easier
        //console.log('socket.on:leaderboardUpdate');
        leaderboard = data;
    });

    socket.on('scoreUpdate', function(data) {
        scores = data;
    });

    socket.on('usersUpdate', function(data) {
        allPlayers = data.users;
    });

    socket.on('playerLost', function(data) {
       if (data.id === thisPlayer.id) {
            $('#gameoverScreen').modal();
            endTime = new Date();
            printTimeAlive();
            printScore();
            printPlantsCaptured();
            printPowerupsUsed();
       }
    });
}

// Picks up whatever item the player is standing on
// if the player is standing
function processOverlayer() {
    // thisPlayer.x = the current objective position of the player
    var xTile = Math.floor(thisPlayer.x / Viewport.objective_tileLength);
    var yTile = Math.floor(thisPlayer.y / Viewport.objective_tileLength);

    // The object of the tile you are currently standing on
    if (thisPlayer.powerup === '' && xTile < Map.gridWidth && xTile >= 0 && yTile < Map.gridHeight && yTile >= 0)
    {
        current = Map.overlayer[yTile][xTile];
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
                Map.overlayer[yTile][xTile] = 0;
                socket.emit('3', { x:xTile, y:yTile });
                break;
            case (3):
                // Seeds
                thisPlayer.powerup = 'seeds';
                Map.overlayer[yTile][xTile] = 0;
                socket.emit('3', { x:xTile, y:yTile });
                break;
            case (4):
                // Boots
                thisPlayer.powerup = 'boots';
                Map.overlayer[yTile][xTile] = 0;
                socket.emit('3', { x:xTile, y:yTile });
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
    Map.board = Board(Map.gridHeight, Map.gridWidth, 0);
    Map.overlayer = Board(Map.gridHeight, Map.gridWidth, 0);

    initImages();
    initSocket(socket);
    socket.emit('requestUsers');
    gameLoop();
}

// Start a new game
function replay() {
    socket.emit('resetPlayer', {name: thisPlayer.name});
}

// Prints the time alive to the game over modal
function printTimeAlive() {
    var timeStr = "Time Alive: " + timeAlive(startTime, endTime) + " seconds";
    document.getElementById("time").innerHTML = timeStr;
}

// Prints the score to the game over modal
function printScore() {
    var score = scores[thisPlayer.id];
    var scoreStr = "Largest Size: " + score;
    document.getElementById("score").innerHTML = scoreStr;
}

// Prints the number of plants captured to the game over modal
function printPlantsCaptured() {
    var plants = thisPlayer.captured;
    plantStr = "Plants Captured: " + plants;
    document.getElementById("plants").innerHTML = plantStr;
}

// Prints the number of powerups used to the game over modal
function printPowerupsUsed() {
    var used = thisPlayer.powerupsUsed;
    powerupStr = "Powerups Used: " + used;
    document.getElementById("powerups").innerHTML = powerupStr;
}

socket.on('connected');
var lastTime;
init();
