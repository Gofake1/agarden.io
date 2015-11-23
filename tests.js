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

function powerupSpecificPlant(x, y, powerup) {
    // only power up a plant if it exists in the game
    if (board[y][x] === 1)
    {
        (plants[y][x]).power = powerup;
        (plants[y][x]).powerTime = 30;
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

function usePowerup(data) {
    switch (data.powerup) {
    case 'house':
        overlayer[data.y][data.x] = 1;
        board[data.y][data.x] = 1;
        plants[data.y][data.x] = new Plant(0.5, data.playerid, 0);
        break;
    case 'waterbucket':
        if (board[data.y][data.x] === 1)
            powerupPlant(data.x, data.y, 2);
        break;
    case 'seeds':
        if (board[data.y][data.x] === 1)
            powerupPlant(data.x, data.y, 1);
        break;
    case 'boots':
        break;
    default:
        break;
    }
}

function incrementPowerupsUsed() {
    
}

function timeAlive(player) {

}

//////// END FUNCTIONS FOR TESTS ///////////////////


//////// START TESTING FUNCTIONS ///////////////////

// Tests

QUnit.test('Regression Tests: addNewPlayer', function(assert) {
	function testAddPlayer(id, name, newPlayer) {
		var testPlayer = addNewPlayer(id, name);
		assert.equal(testPlayer.name, newPlayer.name);
        assert.equal(testPlayer.id, newPlayer.id);
        assert.equal(users[id].name, newPlayer.name);
	}

	var newPlayer = { id:1, x:0, y:0, name:'Spencer', speed:125, color:'red', powerup:'house', connected:true };
	testAddPlayer(1, 'Spencer', newPlayer);
});


QUnit.test('Regression Tests: attackPlant', function(assert) {
    function testAttackPlant() {
        // Hard code board values for tests
        var attacking_id = '0';
        var defending_id = '1';
        var defending_health_start = 1;
        var strength = 0.3;
        plants[0][0] = new Plant(1, attacking_id, 0);
        plants[0][1] = new Plant(1, attacking_id, 0);
        plants[1][0] = new Plant(0.10, defending_id, 0);
        plants[1][1] = new Plant(defending_health_start, defending_id, 0);
        assert.equal(defending_id, plants[1][0].pid);
        assert.equal(defending_health_start, plants[1][1].rank);
        attackPlant(attacking_id, strength, 0, 0, 0, 1);
        attackPlant(attacking_id, strength, 0, 0, 1, 1);
        assert.equal(attacking_id, plants[0][1].pid);
        assert.equal(defending_health_start-strength, plants[1][1].rank);
    }

    testAttackPlant();
});

QUnit.test('Regression Tests: usePowerup', function(assert) {
    function testUsePowerup() {
        var original_overlayer_spot = 0;
        var house_value = 1;
        var no_powerup = 0;
        var water_powerup = 2;
        var seeds_powerup = 1;
        overlayer[0][0] = original_overlayer_spot;
        board[1][1] = 1;
        board[1][5] = 1;
        plants[1][1] = new Plant(1, '1', 0);
        plants[1][5] = new Plant(1, '1', 0);
        var dataHouse = {playerid:'1', powerup:'house', x:0, y:0};
        var dataWaterBucket = {playerid:'1', powerup:'waterbucket', x:1, y:1};
        var dataSeeds = {playerid:'1', powerup:'seeds', x:5, y:1};

        assert.equal(original_overlayer_spot, overlayer[0][0]);
        assert.equal(plants[1][1].power, no_powerup);
        assert.equal(plants[1][5].power, no_powerup);

        usePowerup(dataHouse);
        usePowerup(dataWaterBucket);
        usePowerup(dataSeeds);

        assert.equal(house_value, overlayer[0][0]);
        assert.equal(water_powerup, plants[1][1].power);
        assert.equal(seeds_powerup, plants[1][5].power);
    }

    testUsePowerup();
});

QUnit.test('New Feature Tests: incrementPowerupsUsed', function(assert) {
    function testIncrementPowerupsUsed() {

    var thisPlayer = {
    id:       null,
    x:        null,
    y:        null,
    name:     '',
    speed:    125,
    color:    null,
    powerup:  '',
    connected:true,
    powerupsUsed: 0
    //captured: null
    };
    var powerupsBefore = thisPlayer.powerupsUsed;

    incrementPowerupsUsed();

    assert.equal(thisPlayer.powerupsUsed, powerupsBefore+1);

    }

    testIncrementPowerupsUsed();
});

QUnit.test('Regression Tests: Increment Captured', function(assert) {
    function testCaptureCount() {
         // Hard code board values for tests
        var attacking_id = '0';
        var defending_id = '1';
        var defending_health_start = 1;
        var strength = 0.3;
        assert.equal(0, users[attacking_id].captured);
        plants[0][0] = new Plant(1, attacking_id, 0);
        plants[0][1] = new Plant(1, attacking_id, 0);
        plants[1][0] = new Plant(0.10, defending_id, 0);
        plants[1][1] = new Plant(defending_health_start, defending_id, 0);
        attackPlant(attacking_id, strength, 0, 0, 0, 1);
        attackPlant(attacking_id, strength, 0, 0, 1, 1);
        assert.equal(1, users[attacking_id].captured);

    }

    testCaptureCount();
});

QUnit.test('New Feature Tests: timeAlive', function(assert) {
    function testTimeAlive() {
        addNewPlayer(1337, "Foo");
        setTimeout(function() {
            removePlayer(1337);
        }, 5000);
        assert.equal(timeAlive(1337), 5000);
    }

    testTimeAlive();
});