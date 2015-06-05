var view;

function View() {

  this.BW = 30; // block width in pixels
  this.BH = 30; // block height in pixels
  this.ctxW = model.COLS * this.BW; // 300 px
  this.ctxH = model.ROWS * this.BH; // 600 px
  // var canvas = document.getElementsByTagName('canvas')[0];
  this.boardCtx = document.getElementById('board').getContext('2d');
  this.sideCtx = document.getElementById('nextPiece').getContext('2d');

  // draw in canvas ctx at (x, y) a single block of color c
  this.drawBlock = function(ctx, y, x, c) {
    ctx.fillStyle = c || 'black';
    ctx.strokeStyle = 'black'; // black outline
    var sx = this.BW * x + 1; // +1 so we still see the grid  
    var sy = this.BH * (y - 1) + 1; // y-1 because we hide the top line
    ctx.fillRect(sx, sy, this.BW - 1, this.BH - 1);
    ctx.strokeRect(sx, sy, this.BW - 1, this.BH - 1); // for outline
  }

  // draw the background grid
  this.drawGrid = function() {
    var ctx = this.boardCtx;
    ctx.strokeStyle = "#AAAAAA"; // gray
    ctx.lineWidth = 1; // 1 pixel
    ctx.beginPath();
    for ( var i = 1; i < model.COLS; i++) {
      ctx.moveTo(i * this.BW + .5, 0);
      ctx.lineTo(i * this.BW + .5, this.ctxH);
      ctx.stroke();
    }
    for ( var j = 1; j < model.ROWS - 1; j++) { // ROWS-1 to hide top row
      ctx.moveTo(0, j * this.BH + .5);
      ctx.lineTo(this.ctxW, j * this.BH + .5);
      ctx.stroke();
    }
  }

  // draw the blocks that are already part of the board
  this.drawBoard = function() {
    var b = model.board;
    for ( var j = 1; j < b.length; j++) { // start at 1 to hide top row
      for ( var i = 0; i < b[j].length; i++) {
        if (b[j][i]) {
          var color = PD.pieces[b[j][i]].color;
          this.drawBlock(this.boardCtx, j, i, color);
        }
      }
    }
  }

  // draw the current piece
  this.drawCurPiece = function() {
    var curP = model.curPiece;
    var shape = PD.pieces[curP.name].configs[curP.orientation].shape;
    var color = PD.pieces[curP.name].color;
    for ( var y = 0; y < shape.length; y++) {
      for ( var x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          this.drawBlock(this.boardCtx, curP.y + y, curP.x + x, color);
        }
      }
    }
  }

  // draw the background grid of the side canvas
  this.drawSideGrid = function() {
    var ctx = this.sideCtx;
    ctx.strokeStyle = "#AAAAAA"; // gray
    ctx.lineWidth = 1; // 1 pixel
    ctx.beginPath();
    for ( var i = 1; i < 4; i++) {
      ctx.moveTo(i * this.BW + .5, 0);
      ctx.lineTo(i * this.BW + .5, this.ctxH);
      ctx.stroke();
    }
    for ( var j = 1; j < 4; j++) {
      ctx.moveTo(0, j * this.BH + .5);
      ctx.lineTo(this.ctxW, j * this.BH + .5);
      ctx.stroke();
    }
  }

  // draw the next piece to come
  this.drawNextPiece = function() {
    var npn = model.nextPieceName;
    var shape = PD.pieces[npn].configs[0].shape;
    var color = PD.pieces[npn].color;
    var xOffset = (shape[0].length == 4) ? 0 : 1; // make the ---- shape fit
    for ( var y = 0; y < shape.length; y++) {
      for ( var x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          this.drawBlock(this.sideCtx, y + 2, x + xOffset, color);
        }
      }
    }
  }

  // update the score
  this.updateScore = function() {
    $('#scoreBox').html(model.score);
  }

  // draw the settled pieces and the current piece
  this.renderBoard = function() {
    this.boardCtx.clearRect(0, 0, this.ctxW, this.ctxH);
    this.sideCtx.clearRect(0, 0, 120, 120);
    //this.drawGrid();
    this.drawBoard();
    this.drawCurPiece();
    //this.drawSideGrid();
    this.drawNextPiece();
    this.updateScore();
  }

  this.init = function() {
    // setInterval is bound to global context,
    // so we need to bind the view as this.
    // http://stackoverflow.com/a/21712258/856897
    setInterval(this.renderBoard.bind(this), 30);// milliseconds
  }

} // end view
