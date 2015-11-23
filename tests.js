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
}

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

/////// START FUNCTIONS FOR TESTS

function addNewPlayer(id, name) {
    var i = true;
    var color;
    while (i) {
        color = '#'+(Math.random().toString(16)+'000000').slice(2,8);
        if (color != deadColor) {
            i = false; 
        }
    }
    // TODO: check if start position is valid
    var x = Math.floor(Math.random()*gridWidth*tileLength);
    var y = Math.floor(Math.random()*gridHeight*tileLength);
    var newPlayer = { id:id, x:x, y:y, name:name, speed:125, color:color, powerup:'house', connected:true };
    users[id] = newPlayer;
    scores[id] = 0;
    leaderboard.push(id); // Remove this later
    return newPlayer;
}

function attackPlant(attackingType, strength, power, powerTime, x, y) {
    if ((plants[y][x]).rank > 0.1) {
        // This plant is too strong to take over, attack
        (plants[y][x]).rank -= strength;
        if (plants[y][x].rank <= 0)
            plants[y][x].rank = 0.01;
    }
    else if ((plants[y][x]).rank <= 0.15) {
        // This plant is weak, take it over!!!
        var temp = plants[y][x].pid; 
        plants[y][x].pid = attackingType;
        plants[y][x].rank = 0.2;
        plants[y][x].power = power;
        plants[y][x].powerTime = powerTime;

        // if we're capturing a house
        if (overlayer[y][x] === 1) {
            overlayer[y][x] = 0; 
            io.emit("overlayerUpdate", {x:x, y:y, value:0});
            changePlant(temp, attackingType);
        }
    }
}

//////// END FUNCTIONS FOR TESTS ///////////////////


//////// START TESTING FUNCTIONS ///////////////////

// Tests

QUnit.test('Regression 1) addNewPlayer tests', function(assert) {
	function testAddPlayer(id, name, newPlayer) {
		var testPlayer = addNewPlayer(id, name);
		assert.equal(testPlayer.name, newPlayer.name);
        assert.equal(testPlayer.id, newPlayer.id);
        assert.equal(users[id].name, newPlayer.name);
	}

	var newPlayer = { id:1, x:0, y:0, name:'Spencer', speed:125, color:'red', powerup:'house', connected:true };
	testAddPlayer(1, 'Spencer', newPlayer);

});

QUnit.test('Regression 2) attackPlant tests', function(assert) {
    function testAddPlayer(id, name, newPlayer) {
        // Hard code board values for tests
        var attacking_id = '0';
        var defending_id = '1';
        var defending_health_start = 1;
        var strength = .3;
        plants[0][0] = new Plant(1, attacking_id, 0);
        plants[0][1] = new Plant(1, attacking_id, 0);
        plants[1][0] = new Plant(.10, defending_id, 0);
        plants[1][1] = new Plant(defending_health_start, defending_id, 0);
        assert.equal(defending_id, plants[1][0].pid);
        assert.equal(defending_health_start, plants[1][1].rank);
        attackPlant(attacking_id, strength, 0, 0, 0, 1);
        attackPlant(attacking_id, strength, 0, 0, 1, 1);
        assert.equal(attacking_id, plants[0][1].pid);
        assert.equal(defending_health_start-strength, plants[1][1].rank);
    }

    var newPlayer = { id:1, x:0, y:0, name:'Spencer', speed:125, color:'red', powerup:'house', connected:true };
    testAddPlayer(1, 'Spencer', newPlayer);
});

// Expand plant
// Key Input