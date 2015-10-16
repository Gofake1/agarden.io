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
var powerups = Board(gridHeight, gridWidth, 0);

// DEMO: random water buckets
var i = 0;
while (i < 15) {
    var x = Math.floor(Math.random() * (gridWidth + 1));
    var y = Math.floor(Math.random() * (gridHeight + 1));
    if (board[y][x] === 0 && overlayer[y][x] === 0){
        overlayer[y][x] = 2;
        i++;
    }
}

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

// Handles a single plant expansion
function expandPlant(newBoard, type, x, y) {
    grow = 0;
    newBoard[y][x] = type;
    for (var i=-1; i<=1; i+=1) { /* i is to y */
        for (var j=-1; j<=1; j+=1) { /* as j is to x */
            if (y+i>gridHeight-1 || y+i<0 || x+j>gridWidth-1 || x+j<0) {
                // do nothing, out of bounds
            }

            // Expand to a new tile
            else if (board[y+i][x+j] === 0 && grow === 0) {
                newBoard[y+i][x+j] = type;
                plantRanks[y+i][x+j] = 0.6;
                grow = 1;
                // Will have to accomodate for score keeping later
                // thisPlayer.score += 1;
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
            if (x>100 || x<0 || y>50 || y<0) {
               // do nothing, out of bounds
            }
            else {
                 switch (board[y][x]) {
                    case (0): // DIRT
                        // Board is already full of zeros, no need for operation
                        break;
                    case (1):

                    default: // TODO: grow plant for any player
                        expandPlant(newBoard, board[y][x], x, y)
                        break;
                }
            }
        }
    }
    board = newBoard;
    io.emit('boardUpdateAll', {board:board, plantRanks:plantRanks})
}

function gameLoop() {
    // TODO: update leaderboard
    // if (users.length > 0) {
    //     users.sort(function(a, b) { return b.score - a.score; });
    // }

    // TODO: calculate plant growth

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
            //powerups:powerups
        });
        io.emit('newJoin', {leaderboard: leaderboard, newPlayer: newPlayer});
    });

    socket.on('0', function() { // Heartbeat
        console.log('socket.on:0');
        // TODO: kick a player if haven't received a heartbeat in a while
    });

    socket.on('1', function() { // Till
        console.log('socket.on:1');
    });

    socket.on('2', function(data) { // Use power up
        console.log('socket.on:2');
        if (data.powerup == 'house') {
            console.log('House placed at x:'+data.x+' and y:'+data.y);
            overlayer[data.y][data.x] = 1;
            board[data.y][data.x] = data.playerid;
            io.emit("overlayerUpdate", {x:data.x, y:data.y, value:data.id});
        } 
        else if (data.powerup == 'waterbucket') {
            //
        }
        io.emit('powerupUsed', data);
    });

    socket.on('disconnect', function() {
        console.log('socket.on:disconnect');
        console.log('A user disconnected');
        socket.disconnect();
        io.emit('aDisconnect', leaderboard);
    });

    socket.on('powerupGrabbed', function(data) {
        console.log('socket.on:powerupGrabbed');
        console.log('A user has picked up a powerup');
        overlayer[data.y][data.x] = 0;
        io.emit("overlayerUpdate", {x:data.x, y:data.y, value:0});
    });

});

setInterval(processBoard, 10000);

app.use(express.static(__dirname));
http.listen(3000);