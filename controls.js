// ------------- ONLOAD -----------------
$(function() { // when DOM is loaded
  model = new Model();
  view = new View();
  model.init();
  view.init();
}); // end jquery onload

// ------------- CONTROLS ---------------
$(document).keydown(function(e) { // if broken, try keyup or keypress
    var keymap = {
        37: 'left',
        39: 'right',
        40: 'down',
        38: 'rotate',
        27: 'menu',
        32: 'harddrop'
    };
    var key = e.which;
    if (key in keymap) {
        model.pressKey(keymap[key]);
    };
});