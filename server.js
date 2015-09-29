var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var users = [];
var board = [];
var powerups = [];
var leaderboard = [];

// Build 2d array
var Board = function(numRows, numCols, value) {
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

// TODO: check that name, position, color are unique
function addPlayer(name) {
    color = '#'+(Math.random().toString(16)+'000000').slice(2,8);
    users.push( { name: name, position: startPos, color: color } );
}

function gameLoop() {
    if (users.length > 0) {
        users.sort(function(a, b) { return b.score - a.score; });
    }
    // TODO: calculate plant growth
}

function init() {
    board
}

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {
    var type = socket.handshake.query.type;
    console.log('A user connected', type);
    socket.on('disconnect', function() {
        console.log('A user disconnected');
    })
});

app.use(express.static(__dirname));
http.listen(3000);