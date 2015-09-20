var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var users = [];
var leaderboard = [];
var sockets = [];

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {
    console.log('A user connected');
    socket.on('disconnect', function() {
        console.log('A user disconnected');
    })
});

function movePlayer(player) {
    var x
}

function gameLoop() {
    if (users.length > 0) {
        users.sort(function(a, b) {return b.score - a.score;});
    }
    // TODO: calculate plant growth
}

http.listen(3000);