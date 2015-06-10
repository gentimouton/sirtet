// TODO
// wall kick
// score when dropping
// cookie for auth

var model;

// ------------- MODEL ---------------
function Model() {

  this.COLS = 10;
  this.ROWS = 20 + 1; // top row is hidden so I, L, and J rotations can happen
  this.board = []; // matrix[y][x]. Empty cells are 0, filled are 1.
  this.curPiece = {};
  this.nextPieceName = null;
  this.linesCleared = 0;
  this.level = 1;
  this.LEVELREQ = 5; // increase game speed every X lines. Must be > 4.
  this.score = 0;
  this.gameOver = false;
  this.paused = false;
  this.tickTimer = null;
  this.tickDelay = 1000; // milliseconds between two model ticks.
  this.eventQueue = []; // Events for the view. The view pops them.
  this.linesClearedScores = [ 100, 200, 400, 800 ]

  // perform user command onto model
  // commands: 'left', 'right', 'down', 'rotate', 'menu', 'harddrop'
  this.pressKey = function(cmdStr) {
    switch (cmdStr) {
    case 'left':
      this.tryMove(-1, 0, false);
      break;
    case 'right':
      this.tryMove(1, 0, false);
      break;
    case 'rotate':
      this.tryMove(0, 0, true);
      break;
    case 'down':
      this.tryDescent();
      break;
    case 'harddrop':
      this.hardDrop();
      break;
    case 'menu':
      if (this.paused) {
        this.resume();
      } else {
        this.pause();
      }
      break;
    }
  }

  // Make a copy of current piece, and left/right/down/rotate the copy.
  // If the copy is in a valid position, replace current piece by the copy.
  // Return whether the copy's position is valid.
  this.tryMove = function(dx, dy, rotate) {
    // Make a copy, and move/rotate it to its new position.
    var p = JSON.parse(JSON.stringify(this.curPiece)); // copy
    var pdata = PD.pieces[p.name];
    var nShapes = pdata.configs.length;
    p.orientation = (p.orientation + rotate) % nShapes; // abuse true = 1
    var pConfig = pdata.configs[p.orientation]; // piece configuration
    var shape = pConfig.shape;
    p.x += dx + rotate * pConfig.rotOffset[0];
    p.y += dy + rotate * pConfig.rotOffset[1];
    // check if the copy's position is valid
    var validPosition = true;
    var cx, cy; // store board coordinates of each cell of the updated piece
    for ( var j = 0; j < shape.length; j++) {
      for ( var i = 0; i < shape[j].length; i++) {
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
    if (validPosition) {
      this.curPiece = p
    }
    return validPosition;
  }

  // Make the current piece drop by one cell.
  this.tryDescent = function() {
    var valid = this.tryMove(0, 1, false);
    if (!valid) {
      this.integrateCurPiece();
      this.clearFullRows();
    }
    return valid;
  }

  // Make the current piece descend until it can't anymore.
  this.hardDrop = function() {
    this.eventQueue.push({
      'eventType' : 'hardDrop'
    });
    var numDescents = 0;
    while (this.tryDescent()) {
      numDescents++;
    }
    this.score += numDescents * 2 * this.level;
  }

  // Integrate the current piece into the board, and create new current piece.
  this.integrateCurPiece = function() {
    var p = this.curPiece;
    var shape = PD.pieces[p.name].configs[p.orientation].shape;
    var ccx, ccy; // board coords of each cell of the current piece
    for ( var jj = 0; jj < shape.length; jj++) {
      for ( var ii = 0; ii < shape[jj].length; ii++) {
        ccx = p.x + ii;
        ccy = p.y + jj;
        if (shape[jj][ii]) { // only look at full cells of the piece
          this.board[ccy][ccx] = p.name;
        }
      }
    }
    this.newPiece();
  }

  // Detect and remove full rows.
  this.clearFullRows = function() {
    // detect full rows
    var fullRows = []; // list of rows to be removed
    for ( var y = 0; y < this.board.length; y++) {
      var rowFull = true; // is the current row full?
      for ( var x = 0; x < this.board[y].length; x++) {
        if (this.board[y][x] == 0) {
          rowFull = false;
          break;
        }
      }
      if (rowFull) { // add the current row to the remove list.
        fullRows.push(y);
      }
    }
    if (fullRows.length > 0) {
      // Remove full rows. 
      fullRows.sort(function(a, b) { // Make sure the highest rows come first. 
        return a - b;
      }); 
      for ( var index in fullRows) {
        var rowNum = fullRows[index];
        for ( var y = rowNum - 1; y >= 0; y--) { // for all rows above me
          for ( var x = 0; x < this.board[y].length; x++) {
            this.board[y + 1][x] = this.board[y][x]; // move the row down
          }
        }
      }
      // increase score
      this.score += this.linesClearedScores[fullRows.length - 1] * this.level;
      this.eventQueue.push({
        'eventType' : 'clear',
        'rows' : fullRows
      });
      var prevCleared = this.linesCleared;
      this.linesCleared += fullRows.length;
      // If level up, increase game speed.
      // Level up <=> (num lines before) mod 10 > (num lines after) mod 10
      if (prevCleared % this.LEVELREQ > this.linesCleared % this.LEVELREQ) {
        this.tickDelay = Math.max(this.tickDelay - 50, 100); // cap at 100ms
        clearInterval(this.tickTimer); // recreate timer
        this.tickTimer = setInterval(this.tryDescent.bind(this), this.tickDelay);
      }
    }
  }

  // user pressed the escape key
  this.pause = function() {
    this.paused = true;
    clearInterval(this.tickTimer);
    this.eventQueue.push({
      'eventType' : 'pause'
    });
  }

  // user pressed ESC key again.
  this.resume = function() {
    this.paused = false;
    // setInterval is bound to the global context, ie the window object.
    // We need to bind the model as this.
    // http://stackoverflow.com/a/21712258/856897
    this.tickTimer = setInterval(this.tryDescent.bind(this), this.tickDelay);
    this.eventQueue.push({
      'eventType' : 'resume'
    });
  }

  // create board
  this.newBoard = function() {
    this.board = [];
    for ( var y = 0; y < this.ROWS; y++) { // 1-row top buffer for i rotations
      this.board[y] = [];
      for ( var x = 0; x < this.COLS; x++) {
        this.board[y][x] = 0;
      }
    }
  }

  // Place a new piece at the top. Detect game over.
  this.newPiece = function() {
    var pname = this.nextPieceName;
    this.nextPieceName = PD.nextPieceName();
    var offset = PD.pieces[pname].configs[0].startOffset;
    // place piece at the center-top of the screen
    this.curPiece = {
      'name' : pname,
      'orientation' : 0,
      'x' : Math.floor(this.COLS / 2) - offset[0],
      'y' : 1 - offset[1]
    };

    // game over if the piece collides with the board
    var p = this.curPiece;
    var shape = PD.pieces[p.name].configs[p.orientation].shape;
    var validPosition = true;
    var cx, cy; // store board coordinates of each cell of the updated piece
    for ( var j = 0; j < shape.length; j++) {
      for ( var i = 0; i < shape[j].length; i++) {
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
    if (!validPosition) { // game over
      this.eventQueue.push({
        'eventType' : 'gameOver'
      });
      this.pause();
      this.init();
    } else { // game continues
      this.eventQueue.push({
        'eventType' : 'newPiece'
      });

    }
  }

  this.init = function() {
    this.score = 0;
    this.linesCleared = 0;
    this.level = 1;
    this.tickDelay = 1000;
    this.newBoard();
    this.nextPieceName = PD.nextPieceName();
    this.newPiece();
    this.resume();
  }

} // end of model
