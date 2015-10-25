var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var Board = function(numRows, numCols, value) {
    var array = [];
    for (var i = 0; i < numRows; i++) {
        var column = [];
        for (var j = 0; j < numCols; j++) {
            column[j] = value;
        }
        array[i] = column;
    }
    return array;
};

// Total number of tiles in game 
var gridHeight = 50;
var gridWidth = 100;
var tileLength = 15;
   
// Global variables
var users = {};
var leaderboard = [];
var board = Board(gridHeight, gridWidth, 0);
var plantRanks = Board(gridHeight, gridWidth, 0);
var overlayer = Board(gridHeight, gridWidth, 0);
var numPowerups = 0;

// TODO: check that name, position, color are unique
function addNewPlayer(id, name) {
    color = '#'+(Math.random().toString(16)+'000000').slice(2,8);
    // TODO: check if start position is valid
    x = Math.floor(Math.random()*gridWidth*tileLength);
    y = Math.floor(Math.random()*gridHeight*tileLength);
    newPlayer = { id:id, x:x, y:y, name:name, speed:125, color:color, score:0, powerup:'house' };
    users[id] = newPlayer;
    leaderboard.push(name); // Remove this later
    return newPlayer;
}

// Updates the order of the leaderboard
function updateLeaderboard() {
    // Get the highest score at the front of the array
    // http://www.w3schools.com/jsref/jsref_sort.asp
    if (Object.keys(users).length > 1) {
        console.log('updating leaderboard');

        // Keep getting TypeError: Cannot read property 'score' of undefined
        // at users[b].score
        leaderboard.sort(function(a, b){return users[b].score - users[a].score});
        io.emit('leaderboardUpdate', leaderboard);
    }

}

// Randomly populates board with 15 powerups
function addPowerups() {
    var x = Math.floor(Math.random() * gridWidth);
    var y = Math.floor(Math.random() * gridHeight);
    var type = Math.floor(Math.random() * 3) + 2;

    if (numPowerups < 15) {
        if (board[y][x] === 0 && overlayer[y][x] === 0) {
            overlayer[y][x] = type;
            numPowerups++;
        }
    }
}

// Gives a boost to a specific plant
function powerupWaterBucket(x, y) {
    // TODO: implement area of effect

}

// Gives an AOE boost to plants
function powerupSeeds(x, y) {

}

// Temporarily makes a player move faster
// Put here for consistency, though the server doesn't necessarily need to know about it
// Could just be implemented in app.js 
function powerupBoots() {

    // Set player's speed higher for a set amount of time
    // Thomas said something about a timer function he saw that would be helpful

}

function attackPlant(newBoard, attackingType, strength, x, y) {
    if (plantRanks[y][x] > 0.1) {
        // This plant is too strong to take over, attack
        plantRanks[y][x] -= strength;
    }
    else if (plantRanks[y][x] <= 0.15) {
        // This plant is weak, take it over
        newBoard[y][x] = attackingType;
    }
}

// Handles a single plant expansion
function expandPlant(newBoard, type, x, y) {
    var expand_choice = Math.floor(Math.random() * 5);
    var i; var j;
    // Randomized switch guarantees only one expansion per iteration per plant
    // Selects target tile
    switch (expand_choice) {
        case(0):
            i = -1; j = 0;
            // Up
            break;
        case(1):
            i = 0; j = -1;
            // Left
            break;
        case(2):
            i = 0; j = 0;
            // Center (no action)
            break;
        case(3):
            i = 0; j = 1;
            // Right
            break;
        case(4):
            i = 1; j = 0;
            // Down
            break;
    }

    if (plantRanks[y][x] > 0.5) {
        if (y+i>gridHeight-1 || y+i<0 || x+j>gridWidth-1 || x+j<0) {
            /* out of bounds, take no action */
        }
        else if (board[y+i][x+j] == 't') {
            // Tilled land, expansion
            // Don't do anything to alter the center tile
            if (i !== 0 || j !== 0) {
                // Expand plant
                newBoard[y+i][x+j] = type;
                plantRanks[y+i][x+j] = 0.1;

                // Score keeping
                // Users who have left the game no longer earn points, but their plants can still expand
                if (users[type]) {
                    users[type].score++;
                }
            }
        }
        else if (!isNaN(board[y+i][x+j]) && board[y+i][x+j] === 0) {
            // This is a dirt tile, retry
            expandPlant(newBoard, type, x+j, y+i);
        }
        // The following two branches are not being taken for some reason
        // (Their console logging messages are never logged to the console)
        else if (board[y+i][x+j] == type) {
            // This is a plant tile of the same player, retry
            expandPlant(newBoard, type, x+j, y+i);
        }
        else if (board[y+i][x+j] != type) {
            // This is a plant tile of a different player (to attack)
            attackPlant(newBoard, type, plantRanks[y][x]-0.1, x, y);
        }
    }
}

function growPlant(newBoard, type, x, y) {
    // This should be in a different place (doesn't have to do with expansion)
    // Add code for separating plant tiers (growing / fully grown)
    // Grow the plant
    if(plantRanks[y][x] <= 0.5) {
        plantRanks[y][x] += 0.03;
    }
}

// Process the board's plant expansion (rudimentery for vert prototype)
function processBoard() {
    newBoard = Board(gridHeight, gridWidth, 0);
    newBoard = board;
    for (var y = 0; y < gridHeight; y++) {
        for (var x = 0; x < gridWidth; x++) {
            if (x>100 || x<0 || y>50 || y<0) {
               // do nothing, out of bounds
            }
            else {
                switch (board[y][x]) {
                    case (0): // DIRT
                        // Board is already full of zeros, no need for operation
                        break;
                    case (1):
                        break;
                    default: // TODO: grow plant for any player
                        if (board[y][x] != 't')
                            expandPlant(newBoard, board[y][x], x, y);
                            growPlant(newBoard, board[y][x], x, y);
                        break;
                }
            }
        }
    }
    board = newBoard;
    io.emit('boardUpdateAll', { board:board, plantRanks:plantRanks });
}

function updateLeaderboard() {
    // Get the highest score at the front of the array
    // http://www.w3schools.com/jsref/jsref_sort.asp
    if (users.length > 0) {
        leaderboard.sort(function(a, b){ return b.score - a.score; });
        console.log(leaderboard[0].score);
    }
}

function gameLoop() {
    processBoard();
    addPowerups();
    updateLeaderboard();
}

app.get('/', function(req, res) {
    res.sendFile(__dirname+'/index.html');
});

io.on('connection', function(socket) {
    console.log('A user connected');

    socket.on('newPlayer', function(data) {
        console.log('socket.on:newPlayer');
        newPlayer = addNewPlayer(socket.id, data.name);
        socket.emit('playerCreated', newPlayer);
        socket.emit('setup', {
            users:users,
            leaderboard:leaderboard,
            board:board,
            overlayer:overlayer
        });
        io.emit('newJoin', {leaderboard: leaderboard, newPlayer: newPlayer});
    });

    socket.on('0', function() { // Heartbeat
        console.log('socket.on:0');
        // TODO: kick a player if haven't received a heartbeat in a while
    });

    socket.on('1', function(data) { // Till
        console.log('socket.on:1');
        board[data.y][data.x] = 't';
        io.emit("boardUpdate", {x:data.x, y:data.y, value:'t'});
    });

    socket.on('2', function(data) { // Use power up
        console.log('socket.on:2');
        if (data.powerup == 'house') {
            console.log('House placed at x:'+data.x+' and y:'+data.y);
            overlayer[data.y][data.x] = 1;
            board[data.y][data.x] = data.playerid;
            plantRanks[data.y][data.x] = 0.5;
            io.emit('overlayerUpdate', {x:data.x, y:data.y, value:data.id});
        } 
        else if (data.powerup == 'waterbucket') {
            console.log('Water bucket used');
            powerupWaterBucket(data.x, data.y);
        }
        else if (data.powerup == 'seeds') {
            console.log('Seeds used');
            powerupSeeds(data.x, data.y);
        }
        else if (data.power == 'boots') {
            console.log('Boots used');
        }
        io.emit('powerupUsed', data);
    });

    socket.on('3', function(data) {
        console.log('socket.on:3');
        console.log('A user has picked up a powerup');
        overlayer[data.y][data.x] = 0;
        io.emit("overlayerUpdate", {x:data.x, y:data.y, value:0});
        numPowerups--;
    });

    socket.on('disconnect', function() {
        console.log('A user disconnected');
        socket.disconnect();
        // Remove player from users
        if (users[socket.id] !== null) {
            delete users[socket.id];
        }
        io.emit('aDisconnect', users);
    });

});

setInterval(gameLoop, 1000);

app.use(express.static(__dirname));
http.listen(3000);