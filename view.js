var view;

function View() {

  this.BW = 30; // block width in pixels
  this.BH = 30; // block height in pixels
  this.ctxW = model.COLS * this.BW; // 300 px
  this.ctxH = model.ROWS * this.BH; // 600 px
  var canvas = document.getElementsByTagName('canvas')[0];
  //var $canvas = $('canvas'); // the DOM must be loaded for this to work
  //$canvas.attr({width: ctxW, height: ctxH});
  //var ctx = $canvas[0].getContext('2d');
  this.ctx = canvas.getContext('2d');

  // draw a single block at (x, y)
  this.drawBlock = function(y, x) {
    // y-1 because we hide the top line
    this.ctx.fillRect(this.BW * x, this.BH * (y-1), this.BW, this.BH);
    this.ctx.strokeRect(this.BW * x, this.BH * (y-1), this.BW, this.BH);
  }
  
  // draw the background grid
  this.drawGrid = function() {
    var ctx = this.ctx;
    ctx.strokeStyle = "#AAAAAA"; // gray
    ctx.lineWidth = 1; // 1 pixel
    ctx.beginPath();
    for (var i = 1; i < model.COLS; i++) {
      ctx.moveTo(i * this.BW+.5, 0);
      ctx.lineTo(i * this.BW+.5, this.ctxH);
      ctx.stroke();
    }
    for (var j = 1; j < model.ROWS-1; j++) { // ROWS-1 to hide top row 
      ctx.moveTo(0, j * this.BH+.5);
      ctx.lineTo(this.ctxW, j * this.BH+.5);
      ctx.stroke();
    }
  }

  // draw the blocks that are already part of the board
  this.drawBoard = function () {
    var b = model.board;
    for (var j = 1; j < b.length; j++) { // start at 1 to hide top row
      for (var i = 0; i < b[j].length; i++) {
        if (b[j][i]) {
          this.drawBlock(j, i);
        }
      }
    }
  }
  
  // draw the current piece
  this.drawCurPiece = function () {
    var curP = model.curPiece;
    var p = model.pieces[curP.name][curP.orientation];
    var shape = p.shape;
    for(var y = 0; y < shape.length; y++) {
      for (var x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          this.drawBlock(curP.y + y, curP.x + x);
        }
      }
    }
  }
  
  // draw the settled pieces and the current piece
  this.render = function() {
    var ctx = this.ctx;
    ctx.clearRect(0, 0, this.ctxW, this.ctxH);
    this.drawGrid();
    this.drawBoard();
    this.drawCurPiece();
  }

  this.init = function() {
    // setInterval is bound to global context, 
    // so we need to bind the view as this.
    // http://stackoverflow.com/a/21712258/856897
    setInterval(this.render.bind(this), 30);// milliseconds
  }
} // end view
