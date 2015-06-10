// TODO
// speed increase
// wall kick
// score when dropping
// cookie for auth

// Tetris spec: http://www.colinfahey.com/tetris/tetris.html
// iterationDelay = ((11 - actualLevel) * 0.05);  // [seconds]
// pointAward = ( (21 + (3 * actualLevel)) - heightDropped );


var model;

// ------------- MODEL ---------------
function Model() {

  this.COLS = 10;
  this.ROWS = 20 + 1; // top row is hidden so I, L, and J rotations can happen
  this.board = []; // matrix[y][x]. Empty cells are 0, filled are 1.
  this.curPiece = {};
  this.nextPieceName = null;
  this.linesCleared = 0;
  this.LEVELREQ = 5; // increase game speed every X lines. Must be > 4.
  this.score = 0;
  this.gameOver = false;
  this.paused = false;
  this.tickTimer = null;
  this.tickDelay = 1000; // milliseconds
  this.eventQueue = []; // Events for the view. The view pops them.

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
      while (this.tryDescent()) {
      } // drop until you can't
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

  // Make a copy of current piece, and left/right/rotate the copy.
  // If the copy is in a valid position, replace current piece by the copy.
  this.tryAction = function(dx, rotate) {
    var p = JSON.parse(JSON.stringify(this.curPiece)); // copy of current piece
    var pdata = PD.pieces[p.name];
    var nShapes = pdata.configs.length;
    p.orientation = (p.orientation + rotate) % nShapes; // abuse true = 1
    var pConfig = pdata.configs[p.orientation]; // piece configuration
    var shape = pConfig.shape;
    p.x += dx + rotate * pConfig.rotOffset[0];
    p.y += rotate * pConfig.rotOffset[1];

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

    if (validPosition) { // updated copy is valid
      this.curPiece = p;
    }
  }

  // Make a copy of the current piece. Try descending the copy.
  // If the copy is in a valid position, replace current piece by the copy.
  // If not, fixate the current piece and create a new one.
  // Return whether the move is valid.
  this.tryDescent = function() {
    var p = JSON.parse(JSON.stringify(this.curPiece)); // copy of current piece
    var shape = PD.pieces[p.name].configs[p.orientation].shape;
    p.y += 1;

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

    if (validPosition) { // updated copy is valid
      this.curPiece = p;
    } else { // fixate piece into the board, and create a new piece
      var ccx, ccy; // board coords of each cell of the current piece
      for ( var jj = 0; jj < shape.length; jj++) {
        for ( var ii = 0; ii < shape[jj].length; ii++) {
          ccx = this.curPiece.x + ii;
          ccy = this.curPiece.y + jj;
          if (shape[jj][ii]) { // only look at full cells of the piece
            this.board[ccy][ccx] = p.name;
          }
        }
      }
      this.score += 1; // TODO: should depend on height dropped
      // find full rows
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
      // remove full rows
      fullRows.sort(); // make sure the highest rows come first
      for ( var index in fullRows) {
        var rowNum = fullRows[index];
        for ( var y = rowNum - 1; y >= 0; y--) { // for all rows above me
          for ( var x = 0; x < this.board[y].length; x++) {
            this.board[y + 1][x] = this.board[y][x]; // move the row down
          }
        }
      }
      // increase score if cleared row(s)
      if (fullRows.length > 0) {
        this.score += fullRows.length * 5; // TODO: more points if more lines
        this.eventQueue.push({
          'eventType' : 'clear',
          'rows' : fullRows
        });
        var oldClears = this.linesCleared;
        this.linesCleared += fullRows.length;
        if (oldClears % this.LEVELREQ > this.linesCleared % this.LEVELREQ) {
          this.tickDelay -= 50;
        }
        clearInterval(this.tickTimer);
        this.tickTimer = setInterval(this.tryDescent.bind(this), this.tickDelay);
      }
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

  // user pressed ESC key again.
  this.resume = function() {
    this.paused = false;
    // setInterval is bound to the global context, ie the window object.
    // We need to bind the model as this.
    // http://stackoverflow.com/a/21712258/856897
    this.tickTimer = setInterval(this.tryDescent.bind(this), this.tickDelay);
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

  // place a new piece at the top
  this.newPiece = function() {
    var pname = this.nextPieceName;
    this.nextPieceName = PD.nextPieceName();
    var offset = PD.pieces[pname].configs[0].startOffset;
    // place piece at the center-top of the screen
    this.curPiece = {
      'name' : pname,
      'orientation' : 0,
      'x' : 5 - offset[0],
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
    } else {
      this.eventQueue.push({
        'eventType' : 'newPiece'
      });

    }
  }

  this.init = function() {
    this.score = 0;
    this.linesCleared = 0;
    this.tickDelay = 1000;
    this.newBoard();
    this.nextPieceName = PD.nextPieceName();
    this.newPiece();
    this.resume();
  }

} // end of model
