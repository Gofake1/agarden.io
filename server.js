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
var users = [];
var board = Board(gridHeight, gridWidth, 0);
var powerups = Board(gridWidth, gridHeight, 0);
var leaderboard = [];

// TODO: check that name, position, color are unique
function addPlayer(name) {
    color = '#'+(Math.random().toString(16)+'000000').slice(2,8);
    // TODO: check if start position is valid
    x = Math.floor(Math.random()*gridWidth*tileLength);
    y = Math.floor(Math.random()*gridHeight*tileLength);
    users.push( { name: name, x: x, y: y, color: color } );
}

function gameLoop() {
    if (users.length > 0) {
        users.sort(function(a, b) { return b.score - a.score; });
    }
    // TODO: calculate plant growth
}

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {
    var type = socket.handshake.query.type;
    console.log('A user connected ' + type);
    socket.emit('setup', {

    });

    socket.on('disconnect', function() {
        console.log('A user disconnected');
    });

    socket.on('0', function() { // Heartbeat

    });

    socket.on('1', function() { // Till

    });

    socket.on('2', function() { // Use power up

    });
});

app.use(express.static(__dirname));
http.listen(3000);