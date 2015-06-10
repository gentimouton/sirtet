var PD;

// PieceData is a self-contained model data structure.
// It also returns random piece names.

function PieceData() {
  // startOffset is the position of the piece's top-left block compared to the
  // board's (5, 1) cell, when the piece is created.
  // rotOffset is how I have to translate the piece when I rotate it.
  this.pieces = {
    'l': {'configs': [ {'shape': [[1,0],
                                  [1,1]], 
                         'startOffset': [1,0], 
                         'rotOffset': [0,0]},
                       {'shape': [[0,1],
                                  [1,1]], 
                         'startOffset': [1,0], 
                         'rotOffset': [0,0]},
                       {'shape': [[1,1],
                                  [0,1]], 
                         'startOffset': [1,0], 
                         'rotOffset': [0,0]},
                       {'shape': [[1,1],
                                  [1,0]], 
                         'startOffset': [1,0], 
                         'rotOffset': [0,0]}
                         ],
           'color': 'orange'
    },
    
    'i': {'configs': [ {'shape':[[1,1,1]],
                        'startOffset': [1,0], 
                        'rotOffset': [-1,1]},
                        {'shape':[[1],
                                  [1],
                                  [1]], 
                          'startOffset': [0,1], 
                          'rotOffset': [1,-1]},
                        
                        ],
          'color': 'cyan'
    }    
  };
  
  // pieces available in this game
  this.pieceList = ['l','i'];

  // RNG with seed from http://stackoverflow.com/a/19303725/856897
  this.rngIndex = 0;
  this.nextPieceName = function() {
    var x = Math.sin(this.rngIndex++) * 10000;
    var randFloat = x - Math.floor(x);
    return this.pieceList[Math.floor(randFloat * this.pieceList.length)]
  };
  
};
