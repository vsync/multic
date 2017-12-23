var client = (function() {

  var socket;

  var init = function() {
    socket = io.connect();
  };

  return {
    init: init
  };

})();
