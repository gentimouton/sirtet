// TODO
// piece preview
// wall kick
// score when dropping
// cookie for auth

// Tetris spec: http://www.colinfahey.com/tetris/tetris.html
// iterationDelay = ((11 - actualLevel) * 0.05);  // [seconds]
// pointAward = ( (21 + (3 * actualLevel)) - heightDropped );

// RNG with seed from http://stackoverflow.com/a/19303725/856897
function RNG(s) {
  this.seed = s || 0;
  this.index = this.seed;
  this.next = function() {
    var x = Math.sin(this.index++) * 10000;
    return x - Math.floor(x);
  };
}
var rng = new RNG();

var model;

// ------------- MODEL ---------------
function Model() {

  this.pieceList = ['o','i','s','z','l','j','t'];
  //this.pieceList = ['o','i','s'];
  // startOffset is the position of the piece's top-left block compared to the
  // board's (5, 1) cell, when the piece is created.
  // rotOffset is how I have to translate the piece when I rotate it.
  this.pieces = {
    'o':[ {'shape': [[1,1],
                     [1,1]], 'startOffset': [1,0], 'rotOffset': [0,0]} ],
    'i': [ {'shape': [[1,1,1,1]], 'startOffset': [2,0], 'rotOffset': [-2,1]},
           {'shape':[[1],
                     [1],
                     [1],
                     [1]], 'startOffset': [0,1], 'rotOffset': [2,-1]} ],
    's': [ {'shape': [[0,1,1],
                      [1,1,0]], 'startOffset': [1,0], 'rotOffset': [-1,1]},
           {'shape':[[1,0],
                     [1,1],
                     [0,1]], 'startOffset': [0,1], 'rotOffset': [1,-1]} ],
    'z': [ {'shape': [[1,1,0],
                      [0,1,1]], 'startOffset': [1,0], 'rotOffset': [-1,1]},
           {'shape': [[0,1],
                      [1,1],
                      [1,0]], 'startOffset': [0,1], 'rotOffset': [1,-1]} ],
    'l': [ {'shape': [[1,1,1],
                      [1,0,0]], 'startOffset': [1,0], 'rotOffset': [0,1]},
           {'shape': [[1,0],
                      [1,0],
                      [1,1]], 'startOffset': [0,1], 'rotOffset': [1,-1]},
           {'shape': [[0,0,1],
                      [1,1,1]], 'startOffset': [1,-1], 'rotOffset': [-1,0]},
           {'shape': [[1,1],
                      [0,1],
                      [0,1]], 'startOffset': [1,1], 'rotOffset': [0,0]} ],
    'j': [ {'shape': [[1,1,1],
                      [0,0,1]], 'startOffset': [1,0], 'rotOffset': [0,1]},
           {'shape': [[1,1],
                      [1,0],
                      [1,0]], 'startOffset': [0,1], 'rotOffset': [1,-1]},
           {'shape': [[1,0,0],
                      [1,1,1]], 'startOffset': [1,1], 'rotOffset': [-1,0]},
           {'shape': [[0,1],
                      [0,1],
                      [1,1]], 'startOffset': [1,1], 'rotOffset': [0,0]} ],
    't': [ {'shape': [[1,1,1],
                      [0,1,0]], 'startOffset': [1,0], 'rotOffset': [0,1]},
           {'shape': [[1,0],
                      [1,1],
                      [1,0]], 'startOffset': [0,1], 'rotOffset': [1,-1]},
           {'shape': [[0,1,0],
                      [1,1,1]], 'startOffset': [1,1], 'rotOffset': [-1,0]},
           {'shape': [[0,1],
                      [1,1],
                      [0,1]], 'startOffset': [1,1], 'rotOffset': [0,0]} ]
  }
  
  this.COLS = 10;
  this.ROWS = 20+1;   // top row is hidden so I, L, and J rotations can happen
  this.board = [];    // matrix[y][x]. Empty cells are 0, filled are 1.
  this.curPiece = {};
  this.nextPieceName = null;
  this.score = 0;
  this.gameOver = false;
  this.paused = false;
  this.tickTimer = null;

  // perform user command onto model
  // commands: 'left', 'right', 'down', 'rotate', 'menu', 'harddrop'
  this.pressKey = function(cmdStr) {
    switch (cmdStr) {
      case 'left':
        this.tryAction(-1, false);
        break;
      case 'right':
        this.tryAction(1, false);
        break;
      case 'rotate':
        this.tryAction(0, true);
        break;
      case 'down':
        this.tryDescent();
        break;
      case 'harddrop':
        while(this.tryDescent()) {} // drop until you can't
        break;
      case 'menu':
        if(this.paused) {
          this.resume();
        } else {
          this.pause();
        }
        break;
    }
  }
  
  // Make a copy of current piece, and left/right/rotate the copy.
  // If the copy is in a valid position, replace current piece by the copy.
  this.tryAction = function(dx, rotate) {
    var p = JSON.parse(JSON.stringify(this.curPiece)); // copy of current piece
    var nShapes = this.pieces[p.name].length;
    p.orientation = (p.orientation + rotate) % nShapes; // abuse true = 1
    var pConfig = this.pieces[p.name][p.orientation]; // piece configuration
    var shape = pConfig.shape;
    p.x += dx + rotate * pConfig.rotOffset[0];
    p.y += rotate * pConfig.rotOffset[1];
    
    var validPosition = true;
    var cx, cy; // store board coordinates of each cell of the updated piece
    for (var j = 0; j < shape.length; j++) {
      for (var i = 0; i < shape[j].length; i++) {
        if (shape[j][i]) { // only look at full cells of the piece
          cx = p.x + i;
          cy = p.y + j;
          if (cx < 0 || cx >= this.COLS || cy < 0 // left, right, top walls
              || cy >= this.ROWS || this.board[cy][cx]) { // floor or obstructed
            validPosition = false;
            break;
          }
        }
      }
    }
    
    if(validPosition) { // updated copy is valid
      this.curPiece = p;
    }
  }
  
  // Make a copy of the current piece. Try descending the copy.
  // If the copy is in a valid position, replace current piece by the copy.
  // If not, fixate the current piece and create a new one.
  // Return whether the move is valid.
  this.tryDescent = function() {
    var p = JSON.parse(JSON.stringify(this.curPiece)); // copy of current piece
    var pConfig = this.pieces[p.name][p.orientation]; // piece configuration
    var shape = pConfig.shape;
    p.y += 1;
    
    var validPosition = true;
    var cx, cy; // store board coordinates of each cell of the updated piece
    for (var j = 0; j < shape.length; j++) {
      for (var i = 0; i < shape[j].length; i++) {
        if (shape[j][i]) { // only look at full cells of the piece
          cx = p.x + i;
          cy = p.y + j;
          if (cy >= this.ROWS || this.board[cy][cx]) { // floor or blocked
            validPosition = false;
            break;
          }
        }
      }
    }
    
    if(validPosition) { // updated copy is valid
      this.curPiece = p;
    }
    else { // fixate piece into the board, and create a new piece
      var ccx, ccy; // board coords of each cell of the current piece
      for (var jj = 0; jj < shape.length; jj++) {
        for (var ii = 0; ii < shape[jj].length; ii++) {
          ccx = this.curPiece.x + ii;
          ccy = this.curPiece.y + jj;
          if (shape[jj][ii]) { // only look at full cells of the piece
            this.board[ccy][ccx] = shape[jj][ii];
          }
        }
      }
      this.score += 1; // TODO: should depend on height dropped
      // find full rows
      var fullRows = []; // list of rows to be removed
      for (var y = 0; y < this.board.length; y ++) {
        var rowFull = true; // is the current row full?
        for (var x = 0; x < this.board[y].length; x++) {
          if (this.board[y][x] == 0) {
            rowFull = false;
            break;
          }
        }
        if(rowFull) { // add the current row to the remove list.
          fullRows.push(y);
        }
      }
      // remove full rows
      fullRows.sort(); // make sure the highest rows come first
      for (var index in fullRows) {
        var rowNum = fullRows[index];
        for (var y = rowNum-1; y >=0; y--) { // for all rows above me
          for (var x = 0; x < this.board[y].length; x ++) {
            this.board[y+1][x] = this.board[y][x]; // move the row down
          }
        }
      }
      this.score += fullRows.length * 5; // TODO: more points if more lines 
      // create a new piece
      this.newPiece();
    }
    return validPosition;
  }
  
  // user pressed the escape key
  this.pause = function() {
    this.paused = true;
    clearInterval(this.tickTimer);
  }

  this.tick = function() {
    return this.tryDescent();
  }

  // user pressed ESC key again
  this.resume = function() {
    this.paused = false;
    // setInterval is bound to the global context, ie the window object. 
    // We need to bind the model as this.
    // http://stackoverflow.com/a/21712258/856897
    this.tickTimer = setInterval(this.tick.bind(this), 1000); // milliseconds
  }

  // create board
  this.newBoard = function() {
    this.board = [];
    for (var y = 0; y < this.ROWS; y++) { // 1-row top buffer for i rotations
      this.board[y] = [];
      for (var x = 0; x < this.COLS; x++) {
        this.board[y][x] = 0;
      }
    }
  }

  // place a new piece at the top
  this.newPiece = function() {
    var name = this.nextPieceName;
    this.nextPieceName = this.pieceList[Math.floor(rng.next() * this.pieceList.length)];
    var offset = this.pieces[name][0].startOffset;
    // place piece at the center-top of the screen
    this.curPiece = {'name': name, 
                      'orientation': 0, 
                      'x': 5 - offset[0], 'y': 1 - offset[1]};
    // game over if the piece collides with the board
    var p = this.curPiece;
    var pConfig = this.pieces[p.name][p.orientation]; // piece configuration
    var shape = pConfig.shape;
    var validPosition = true;
    var cx, cy; // store board coordinates of each cell of the updated piece
    for (var j = 0; j < shape.length; j++) {
      for (var i = 0; i < shape[j].length; i++) {
        if (shape[j][i]) { // only look at full cells of the piece
          cx = p.x + i;
          cy = p.y + j;
          if (cy >= this.ROWS || this.board[cy][cx]) { // floor or blocked
            validPosition = false;
            break;
          }
        }
      }
    }
    if(!validPosition) { // game over
      this.pause();
      this.init();
    }
  }

  this.init = function() {
    this.score = 0;
    this.newBoard();
    this.nextPieceName = this.pieceList[Math.floor(rng.next() * this.pieceList.length)];
    this.newPiece();
    this.resume();
  }
  
} // end of model