var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = 3000;

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

// Plant Class definition
var Plant = function(rank, pid, power) {
    this.rank = rank;
    this.pid = pid;
    this.power = power;
    this.powerTime = 0;
};

// Total number of tiles in game 
var gridHeight = 50;
var gridWidth  = 100;
var tileLength = 15;
   
// Global variables
var users       = {};
var scores      = {};
var tilled      = {}; // Dict of tilled dirt timers
var leaderboard = [];
var board       = Board(gridHeight, gridWidth, 0);
var plants      = Board(gridHeight, gridWidth, 0);
var overlayer   = Board(gridHeight, gridWidth, 0);
var numPowerups = 0;
var deadColor   = '#BCBCBC';

function addNewPlayer(id, name) {
    var i = true;
    while (i) {
        color = '#'+(Math.random().toString(16)+'000000').slice(2,8);
        if (color != deadColor) {
            i = false; 
        }
    }
    // TODO: check if start position is valid
    x = Math.floor(Math.random()*gridWidth*tileLength);
    y = Math.floor(Math.random()*gridHeight*tileLength);
    newPlayer = { id:id, x:x, y:y, name:name, speed:125, color:color, powerup:'house', connected:true };
    users[id] = newPlayer;
    scores[id] = 0;
    leaderboard.push(id); // Remove this later
    return newPlayer;
}

// Updates the order of the leaderboard
function updateLeaderboard() {
    // Get the highest score at the front of the array
    // http://www.w3schools.com/jsref/jsref_sort.asp
    if (Object.keys(scores).length > 1) {
        leaderboard.sort(function(a, b) {return (scores[b]-scores[a]);});
        var slicedLeaderboard = leaderboard.slice(0, 9);
        io.emit('leaderboardUpdate', slicedLeaderboard);
    }
}

// Randomly populates board with a number of powerups
function addPowerups() {
    while (numPowerups < 45)
    {
        var x = Math.floor(Math.random() * gridWidth);
        var y = Math.floor(Math.random() * gridHeight);
        var puptype = Math.floor(Math.random() * 3) + 2;
        if (overlayer[y][x] === 0) {
            overlayer[y][x] = puptype;
            numPowerups++;
        }
    }
}

function powerupSpecificPlant(x, y, powerup) {
    // only power up a plant if it exists in the game
    if (board[y][x] === 1)
    {
        (plants[y][x]).power = powerup;
        (plants[y][x]).powerTime = 30;
        io.emit("plantsUpdate", {x:x, y:y, plant:plants[y][x]});
    }
}

// Gives a boost to some plants
function powerupPlant(x, y, powerup) {
    powerupSpecificPlant(x,y,powerup);
    powerupSpecificPlant(x+1,y,powerup);
    powerupSpecificPlant(x-1,y,powerup);
    powerupSpecificPlant(x,y+1,powerup);
    powerupSpecificPlant(x+1,y+1,powerup);
    powerupSpecificPlant(x-1,y+1,powerup);
    powerupSpecificPlant(x,y-1,powerup);
    powerupSpecificPlant(x+1,y-1,powerup);
    powerupSpecificPlant(x-1,y-1,powerup);
}


// Called when a house is captured, changes ownership of plants
function changePlant(changeID, newID) {
    for (var y = 0; y < gridHeight; y++) {
        for (var x = 0; x < gridWidth; x++) {
            if (plants[y][x] === changeID) {
                plants[y][x] = newID; 
            }
        }
    }
    //users[changeID].connected = false;
    //socket.disconnect();
    io.emit('aDisconnect', users);

    // trigger a game over screen for users[changeID]
    // socket.emit('gameOver', changeID);
}

function attackPlant(attackingType, strength, power, powerTime, x, y) {
    if ((plants[y][x]).rank > 0.1) {
        // This plant is too strong to take over, attack
        (plants[y][x]).rank -= strength;
        if (plants[y][x].rank <= 0)
            plants[y][x].rank = .01;
    }
    else if ((plants[y][x]).rank <= 0.15) {
        // This plant is weak, take it over!!!
        var temp = plants[y][x].pid; 
        plants[y][x].pid = attackingType;
        plants[y][x].rank = .2;
        plants[y][x].power = power;
        plants[y][x].powerTime = powerTime;

        // if we're capturing a house
        if (overlayer[y][x] === 1) {
            overlayer[y][x] = 0; 
            changePlant(temp, attackingType);
        }
    }
}

// Handles a single plant expansion
function expandPlant(newBoard, pid, x, y) {
    var iterations = 1;
    var options = 5;
    var strength = (plants[y][x]).rank - 0.1;
    if ((plants[y][x]).power === 1)   // Seeds
    {   
        options = 9;
        iterations = 4;
    }
    if ((plants[y][x]).power === 2)   // Waterbucket
    {
        strength += 0.25;
        iterations = 9;
    }

    while (iterations > 0) {
        iterations--;
        var expand_choice = Math.floor(Math.random() * options);
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
            case(5):
                i = -1; j = -1;
                // Up-left
                break;
            case(6):
                i = -1; j = 1;
                // Up-right
                break;
            case(7):
                i = 1; j = -1;
                // Down-Left
                break;
            case(8):
                i = 1; j = 1;
                // Down-Right
                break;
        }

        if ((plants[y][x]).rank > 0.5) {
            if (y+i>gridHeight-1 || y+i<0 || x+j>gridWidth-1 || x+j<0) {
                /* out of bounds, take no action */
            }
            else if (board[y+i][x+j] == 't') {
                // Tilled land, expansion
                // Don't do anything to alter the center tile
                if (i !== 0 || j !== 0) {
                    // Expand plant
                    newBoard[y+i][x+j] = 1;
                    // Create a plant at that location
                    plants[y+i][x+j] = new Plant(0.15, pid, 0);

                    // Score keeping
                    // Users who have left the game no longer earn points, 
                    // but their plants can still expand
                    if (users[pid]) {
                        scores[pid]++;
                        io.emit('scoreUpdate', scores);
                    }
                }
            }
            else if (!isNaN(board[y+i][x+j]) && board[y+i][x+j] === 0) {
                // This is a dirt tile, fail
                // expandPlant(newBoard, pid, x+j, y+i);
            }
            else if ((plants[y+i][x+j]).pid == pid) {
                // This is a plant tile of the same player, retry
                // expandPlant(newBoard, pid, x+j, y+i);
            }
            else if ((plants[y+i][x+j]).pid != pid) {
                // This is a plant tile of a different player (to attack)
                attackPlant(pid, strength, plants[y][x].power, plants[y][x].powerTime, x+j, y+i);
            }
        }
    }
}

function agePlant(newBoard, x, y) {
    // Grow the plant
    var iterations = 1;
    if (plants[y][x].power === 2) // waterbucket
        iterations += 2;
    while (iterations)
    {
        iterations--;
        if((plants[y][x]).rank <= 0.5) {
            (plants[y][x]).rank += 0.03;
        }
    }
    if (plants[y][x].powerTime > 0)
    {
        plants[y][x].powerTime--;
        if (plants[y][x].powerTime === 0)
        {
            plants[y][x].power = 0;
        }
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
                        expandPlant(newBoard, (plants[y][x]).pid, x, y);
                        agePlant(newBoard, x, y);
                        break;
                    case ('t'):
                        // If tilled for more than 120 seconds, untill
                        if (Date.now() - tilled[y.toString()+x.toString()] > 120000) {
                            board[y][x] = 0;
                            delete tilled[y.toString()+x.toString()];
                        }
                        break;
                }
            }
        }
    }
    board = newBoard;
    io.emit('boardUpdateAll', { board:board, plants:plants });
}

function gameLoop() {
    processBoard();
    addPowerups();
    updateLeaderboard();
}

app.get('/', function(req, res) {
    res.sendFile(__dirname+'/index.html');
});

// Socket messages
io.on('connection', function(socket) {
    console.log('A user connected');

    socket.on('newPlayer', function(data) {
        console.log('socket.on:newPlayer');
        newPlayer = addNewPlayer(socket.id, data.name);
        socket.emit('playerCreated', newPlayer);
        socket.emit('setup', {
            users:      users,
            scores:     scores,
            leaderboard:leaderboard,
            board:      board,
            overlayer:  overlayer,
            deadColor:  deadColor
        });
        io.emit('newJoin', newPlayer);
    });

    socket.on('requestUsers', function() {
        console.log('socket.on:requestUsers');
        socket.emit('usersUpdate', {users:users});
    });

    socket.on('0', function() { // Heartbeat
        console.log('socket.on:0');
        // TODO: kick a player if haven't received a heartbeat in a while
        socket.emit('gameOver', {});
    });

    socket.on('1', function(data) { // Till
        //console.log('socket.on:1');
        board[data.y][data.x] = 't';
        tilled[data.y.toString()+data.x.toString()] = new Date();
        io.emit("boardUpdate", {x:data.x, y:data.y, value:'t'});
    });

    socket.on('2', function(data) { // Use power up
        console.log('socket.on:2');
        switch (data.powerup) {
        case 'house':
            console.log('House placed at x:'+data.x+' and y:'+data.y);
            overlayer[data.y][data.x] = 1;
            board[data.y][data.x] = 1;
            plants[data.y][data.x] = new Plant(0.5, data.playerid, 0);
            io.emit('overlayerUpdate', {x:data.x, y:data.y, value:data.id});
            break;
        case 'waterbucket':
            console.log('Water bucket used');
            if (board[data.y][data.x] === 1)
                powerupPlant(data.x, data.y, 2);
            break;
        case 'seeds':
            console.log('Seeds used');
            if (board[data.y][data.x] === 1)
                powerupPlant(data.x, data.y, 1);
            break;
        case 'boots':
            console.log("Boots used");
            break;
        default:
            break;
        }
        socket.emit('powerupUsed', data);
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
        // Remove player from usersd
        if (users[socket.id]) {
            // delete users[socket.id];

            // set to a gray-ish color on disconnect
            // colors aren't quite coming out right but they do change at least
            users[socket.id].color = deadColor;
            users[socket.id].connected = false;
        }
        socket.disconnect();
        io.emit('aDisconnect', users);
    });

});

setInterval(gameLoop, 1000);
app.use(express.static(__dirname));
http.listen(port);
console.log('Listening on port '+ port);