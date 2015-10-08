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

var thisPlayer = {x:80, y:80, name:'Guest', speed:125, color:'blue', score:0, powerup:0};
var otherPlayers = [];

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
var numTiles_y = window.innerHeight / board_tileLength + 1;
var board_tileLength = window.innerWidth / numTiles_x;
var halfX = numTiles_x / 2;
var halfY = numTiles_y / 2;

// For syncing player movement with board
var objective_tileLength = 20;
var objective_xboard = gridWidth*objective_tileLength;
var objective_yboard = gridHeight*objective_tileLength;

// Record the board's visible bounds
var vizmin_x = thisPlayer.x<board_tileLength*halfX ? 0 : thisPlayer.x-board_tileLength*halfX;
var vizmin_y = thisPlayer.y<board_tileLength*halfY ? 0 : thisPlayer.y-board_tileLength*halfY;
var vizmax_x = vizmin_x+board_tileLength*numTiles_x;
var vizmax_y = vizmin_y+board_tileLength*numTiles_y;

// Game variables
var initGrowthAlpha = 0.8;
var board = Board(gridHeight, gridWidth, 0);
var plantRanks = Board(gridHeight, gridWidth, 0);
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

     // Red Farmer
    plantRanks[3][8] = initGrowthAlpha;
    plantRanks[3][9] = initGrowthAlpha;
    plantRanks[4][8] = initGrowthAlpha;
    plantRanks[5][8] = initGrowthAlpha;
    plantRanks[4][9] = initGrowthAlpha;
    plantRanks[5][9] = initGrowthAlpha;
    plantRanks[3][10] = initGrowthAlpha;
    // Purple Farmer
    plantRanks[35][70] = initGrowthAlpha;
    plantRanks[36][70] = initGrowthAlpha;
    plantRanks[37][70] = initGrowthAlpha;
    plantRanks[36][71] = initGrowthAlpha;
    plantRanks[36][72] = initGrowthAlpha;
    plantRanks[35][71] = initGrowthAlpha;

var overlayer = Board(gridHeight, gridWidth, 0);
    overlayer[3][28] = 1;
    overlayer[4][29] = 1;
    overlayer[7][7] = 1;
    overlayer[4][8] = 2;

var leaderboard = [];

// Sprites
var dirt = new Image();
var plant = new Image();
var waterBucket = new Image();
var house = new Image();

window.addEventListener('keypress', keyInput, false);
var mouseX = 0;
var mouseY = 0;

// Updates global variables for board drawing
function updateBoardVars() {
    // Number of visible tiles
    numTiles_y = window.innerHeight / board_tileLength;
    halfX = numTiles_x / 2;
    halfY = numTiles_y / 2;

    // Relate player objective scale to drawing scale
    var xPos = thisPlayer.x / objective_tileLength * board_tileLength;
    var yPos = thisPlayer.y / objective_tileLength * board_tileLength;

    // Record the board's visible bounds
    // X
    if (xPos < board_tileLength*halfX)
    	vizmin_x = 0;
    else if (xPos > board_tileLength*gridWidth - board_tileLength*halfX)
    	vizmin_x = board_tileLength*gridWidth - board_tileLength*2*halfX;
    else
    	vizmin_x = xPos-board_tileLength*halfX;
    // Y
    if (yPos < board_tileLength*halfY)
    	vizmin_y = 0;
    else if (yPos > board_tileLength*gridHeight - board_tileLength*halfY)
    	vizmin_y = board_tileLength*gridHeight - board_tileLength*2*halfY;
    else
    	vizmin_y = yPos-board_tileLength*halfY;

    vizmax_x = vizmin_x+board_tileLength*numTiles_x;
    vizmax_y = vizmin_y+board_tileLength*numTiles_y;
}

// Gets the player's entered name
function getName() {
            var pname = document.getElementById("pname").value;
            //console.log(pname);
            leaderboard.push(pname);

            window.addEventListener('mousemove', mouseInput, false);

            // TODO:
            // WERE GOING TO WANT TO REMOVE THIS AFTER THE DEMO
            window.setInterval(processBoard, 10000);
            //window.setInterval(plantGrowth, 5000);
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
                    case (0): // DIRT
                        drawSprite(dirt, xLength-xmin, yLength-ymin, board_tileLength, board_tileLength, 1);
                        break;
                    case (1): // RED PLANT
                        ctx.fillStyle = 'red';
                        ctx.fillRect(xLength-xmin, yLength-ymin, board_tileLength-1, board_tileLength-1);
                        drawSprite(plant, xLength-xmin, yLength-ymin, board_tileLength, board_tileLength, plantRanks[y][x]); //0.6);
                        break;
                    case (2): // PURPLE PLANT
                        ctx.fillStyle = 'purple';
                        ctx.fillRect(xLength-xmin, yLength-ymin, board_tileLength-1, board_tileLength-1);
                        drawSprite(plant, xLength-xmin, yLength-ymin, board_tileLength, board_tileLength, plantRanks[y][x]);
                        break;
                    default: // UNKNOWN
                        ctx.fillStyle = 'black';
                        ctx.fillRect(xLength-xmin, yLength-ymin, board_tileLength, board_tileLength);
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
                        drawSprite(waterBucket, x*tl-xmin+tl/9, y*tl-ymin+tl/9, tl*3/4, tl*3/4, 1);
                        break;
                    case (2):
                        drawSprite(house, x*tl-xmin, y*tl-ymin, tl, tl, 1);
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
    ctx.fillText('Score: ', 15, window.innerHeight-30);
}

function drawCurrentPowerup() {
    ctx.globalAlpha = 0.4;
    ctx.strokeRect(10, 10, 250, 50);
    ctx.fillStyle = 'black';
    ctx.fillRect(10, 10, 400, 50);

    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';

    // create the powerup string
    var powstring = "Current Powerup: ";
    switch (thisPlayer.powerup)
    {
    case(0):
    	// No powerup
    	powstring += "--";
    	break;
    case(1):
    	// water bucket
    	powstring += "Water Bucket";
    	break;
    default:
    	powstring += "ERROR!!!";
    	break;
    }
    ctx.fillText(powstring, 15, 40);
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
    // Convert player pos to board pos
    var xPos = thisPlayer.x / objective_tileLength * board_tileLength;
    var yPos = thisPlayer.y / objective_tileLength * board_tileLength;

    ctx.beginPath();
    ctx.arc(xPos-xmin, yPos-ymin, board_tileLength/2.25, 0, 2*Math.PI, false);
    ctx.fillStyle = thisPlayer.color;
    ctx.fill();
}

// Handles keyboard input
function keyInput(key) {
    // Use powerup
    if (key.keyCode == 32) {
        alert('Powerup used!');
        thisPlayer.powerup = 0;
    }
}

// Handles mouse movement
function mouseInput(mouse) {
    mouseX = mouse.clientX;
    mouseY = mouse.clientY;
}

// Moves the player
function playerMove() {

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
        // console.log('mouseX');
        // console.log(mouseX);
        // console.log('mouseY');
        // console.log(mouseY);
        // console.log('playerX');
        // console.log(thisPlayer.x);
        // console.log('playerY');
        // console.log(thisPlayer.y);
        angle = Math.atan2(distX, distY*-1);

        thisPlayer.x -= (((relPosX - mov/2) - mouseX)/thisPlayer.speed);
        thisPlayer.y -= (((relPosY - mov/2) - mouseY)/thisPlayer.speed);
    }
}

// This function will dynamically follow the player, drawing the board
// around him/her as he moves in realtime
function drawViewport() {
    updateBoardVars();

    // This should not be working. vizmin_x and vizmin_y are out of scope here

    // Draw that board!
    drawGrid(vizmin_x, vizmin_y, vizmax_x, vizmax_y, board_tileLength);
    drawOverlayer(vizmin_x, vizmin_y, vizmax_x, vizmax_y, board_tileLength);

    // And the player too!
    drawPlayer(vizmin_x, vizmin_y);
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
    socket.on('init', function(playerData) {
        player = playerData;
    });
}

// Picks up whatever item the player is standing on
// if the player is standing
function processOverlayer()
{
	// thisPlayer.x = the current objective position of the player
	xTile = Math.floor(thisPlayer.x / objective_tileLength);
	yTile = Math.floor(thisPlayer.y / objective_tileLength);

	// The object of the tile you are currently standing on
	current = overlayer[yTile][xTile];
	switch (current)
	{
	case(0):
		// Empty, do nothing
		break;
	case(1):
		// water bucket
		thisPlayer.powerup = 1;
        overlayer[yTile][xTile] = 0;
		break;
    case(2):
        // This is the house
        break;
	default:
		break;
	}
}

// Handles a single plant expansion
function expandPlant(b, type, x, y)
{
    grow = 0;
	b[y][x] = type;
	for (var i=-1; i<=1; i+=2) {
		for (var j=-1; j<=1; j+=2) {
            if (y+i>50 || y+i<0 || x+j>100 || x+j<0) {
                // do nothing, out of bounds
            }
			else if (board[y+i][x+j] == 0 && grow == 0) {
				b[y+i][x+j] = type;
                plantRanks[y+i][x+j] = 0.6;
                grow = 1;
            }
            else if(plantRanks[y+i][x+j] > 0.5) {
                plantRanks[y+i][x+j] -= 0.1;
            }
        }
    }
}

// Basic plant growth handling
function plantGrowth() {
    if (growthAlpha > 0.5) {
        growthAlpha -= 0.1; 
    }
}

// Process the board's plant expansion (rudimentery for vert prototype)
function processBoard()
{
	newBoard = Board(gridHeight, gridWidth, 0);
	for (var y = 0; y < gridHeight; y++) {
        for (var x = 0; x < gridWidth; x++) {
            xLength = x*board_tileLength;
            yLength = y*board_tileLength;
            switch (board[y][x]) {
                case (0): // DIRT
                	// Board is already full of zeros, no need for operation
                    break;
                case (1): // RED PLANT
                	expandPlant(newBoard,1,x,y);
                    break;
                case (2): // PURPLE PLANT
                	expandPlant(newBoard,2,x,y);
                    break;
                default: // UNKNOWN
                    break;
                
            }
        }
    }
    board = newBoard;
}


// Calls all needed object update functions
function update(dt) {
	processOverlayer();
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

function gameLoop() {
    drawViewport();
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
