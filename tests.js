// var Board = function(numRows, numCols, value) {
//     var array = [];
//     for (var i = 0; i < numRows; i++) {
//         var column = [];
//         for (var j = 0; j < numCols; j++) {
//             column[j] = value;
//         }
//         array[i] = column;
//     }
//     return array;
// };


// // Total number of tiles in game 
// var gridHeight = 50;
// var gridWidth  = 100;
// var tileLength = 15;
   
// // Global variables
// var users       = {};
// var scores      = {};
// var tilled      = {}; // Dict of tilled dirt timers
// var leaderboard = [];
// var board       = Board(gridHeight, gridWidth, 0);
// var plants      = Board(gridHeight, gridWidth, 0);
// var overlayer   = Board(gridHeight, gridWidth, 0);
// var numPowerups = 0;
// var deadColor   = '#BCBCBC';

// function addNewPlayer(id, name) {
//     var i = true;
//     var color;
//     while (i) {
//         color = '#'+(Math.random().toString(16)+'000000').slice(2,8);
//         if (color != deadColor) {
//             i = false; 
//         }
//     }
//     // TODO: check if start position is valid
//     var x = Math.floor(Math.random()*gridWidth*tileLength);
//     var y = Math.floor(Math.random()*gridHeight*tileLength);
//     var newPlayer = { id:id, x:x, y:y, name:name, speed:125, color:color, powerup:'house', connected:true };
//     users[id] = newPlayer;
//     scores[id] = 0;
//     leaderboard.push(id); // Remove this later
//     return newPlayer;
// }

// Tests

QUnit.test('addNewPlayer tests', function(assert) {
	function testAddPlayer(id, name, newPlayer) {
		var testPlayer = addNewPlayer(id, name);
		assert.equal(testPlayer.name, newPlayer.name);
	}

	var newPlayer = { id:1, x:0, y:0, name:'Spencer', speed:125, color:'red', powerup:'house', connected:true };
	testAddPlayer(1, 'Spencer', newPlayer);

});

