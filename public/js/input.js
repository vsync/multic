var input = (function() {

  const G_BOARD_SIZE = 64;
  const MOVE_SENSITIVITY = 10;

  var mouseDown = false;
  var touch = vec3.create();
  var rawTouch = {x: null, y: null};

  var onMouseDown = function(event) {
    mouseDown = true;

    rawTouch.x = event.offsetX;
    rawTouch.y = event.offsetY;

    var pos = renderer.camera.unproject(event.offsetX, event.offsetY);
    vec2.set(touch, pos.x, pos.y, 0);
  };

  var onMouseMove = function(event) {
    if(!mouseDown) {
      return;
    }

    var tmp = renderer.camera.unproject(event.offsetX, event.offsetY);
    var pos = vec3.fromValues(tmp.x, tmp.y, 0);

    vec3.sub(pos, pos, touch);

    vec3.add(renderer.camera.position, renderer.camera.position, pos);
  };

  var onMouseUp = function(event) {
    mouseDown = false;

    var x = event.offsetX;
    var y = event.offsetY;

    if(x > rawTouch.x - MOVE_SENSITIVITY && x < rawTouch.x + MOVE_SENSITIVITY) {
      if(y > rawTouch.y - MOVE_SENSITIVITY && y < rawTouch.y + MOVE_SENSITIVITY) {
        var tmp = renderer.camera.unproject(x, y);

        var x = Math.trunc(tmp.x + G_BOARD_SIZE / 2);
        var y = Math.trunc(-tmp.y + G_BOARD_SIZE / 2);

        renderer.add(x, y, 0);
      }
    }
  };

  var onMouseOut = function(event) {
    mouseDown = false;
  };

  var onWheel = function(event) {
    var delta = event.deltaY;
    if(event.deltaMode === 1) {
      delta *= 30;
    }

    delta *= 0.002;

    renderer.camera.zoom(delta);
  };

  return {
    onMouseDown: onMouseDown,
    onMouseMove: onMouseMove,
    onMouseUp: onMouseUp,
    onMouseOut: onMouseOut,
    onWheel: onWheel,
  };

})();
