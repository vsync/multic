var renderer = (function() {
  const G_BOARD_SIZE = 64;

  var vsUrl = 'http://localhost:3000/public/shader/default.vs';
  var fsUrl = 'http://localhost:3000/public/shader/default.fs';

  var canvas;
  var gl;

  // Entities
  var background;
  var grid;
  var meshes = [];
  var entities = [];

  var modelMatrix = new Float32Array(16);

  var load = function() {
    canvas = document.getElementById('surface');
    gl = canvas.getContext('webgl2');

    if(!gl) {
      console.log('ERROR: WebGL2 not supported');
      return;
    }

    helpers.loadFile(vsUrl, function(error, vs) {
      if(error) {
        alert('ERROR: Failed to fetch shader file. (See console for more information)');
        console.error('ERROR: ' + error);

        return null;
      } else {
        helpers.loadFile(fsUrl, function(error, fs) {
          if(error) {
            alert('ERROR: Failed to fetch shader file. (See console for more information)');
            console.error('ERROR: ' + error);
          } else {
            init(vs, fs);
          }
        });
      }
    });
  };

  var init = function(vs, fs) {
    if(shader.init(vs, fs) === 0) {
      return;
    }

    // Create Uniforms
    shader.createUniform('projectionMatrix');
    shader.createUniform('viewMatrix');
    shader.createUniform('modelMatrix');
    shader.createUniform('textureSampler');
    shader.createUniform('hasTexture');
    shader.createUniform('color');

    initMeshes();
    reset();

    camera.init(canvas.width, canvas.height);

    gl.clearColor(1, 1, 1, 1);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    run();
  };

  var run = function() {
    // Render loop
    var loop = function() {
      update();

      prepare();

      shader.bind();

      shader.setUniformMatrix('projectionMatrix', camera.projectionMatrix);
      shader.setUniformMatrix('viewMatrix', camera.viewMatrix);

      shader.setUniform1i('textureSampler', 0);

      render(background);
      render(grid);

      for(var i = 0; i < entities.length; i++) {
        render(entities[i]);
      }

      shader.unbind();

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  };

  var update = function() {
    camera.update();
  };

  var prepare = function() {
    gl.clear(gl.COLOR_BUFFER_BIT);
  };

  var render = function(entity) {
    mesh = entity.mesh;

    mat4.fromTranslation(modelMatrix, entity.position);
    shader.setUniformMatrix('modelMatrix', modelMatrix);

    gl.bindVertexArray(mesh.vaoId);

    if(mesh.hasTexture === 1) {
      shader.setUniform1i('hasTexture', 1);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, mesh.texId);
    } else {
      shader.setUniform1i('hasTexture', 0);
      shader.setUniform4fv('color', mesh.color);
    }

    gl.drawElements(mesh.drawMode, mesh.vertexCount, gl.UNSIGNED_SHORT, 0);

    if(mesh.hasTexture === 1) {
      gl.bindTexture(gl.TEXTURE_2D, null);
    }

    gl.bindVertexArray(null);
  }

  var initMeshes = function() {
    background = {
      position: vec3.create(),
      mesh: meshBuilder.buildQuad(G_BOARD_SIZE, G_BOARD_SIZE, 5, 'http://localhost:3000/public/img/image-background.png')
    };

    grid = {
      position: vec3.create(),
      mesh: meshBuilder.buildGrid()
    };

    // Create meshes
    xMesh = meshBuilder.buildQuad(1, 1, 1, 'http://localhost:3000/public/img/image-x.png');
    meshes.push(xMesh);

    oMesh = meshBuilder.buildQuad(1, 1, 1, 'http://localhost:3000/public/img/image-o.png');
    meshes.push(oMesh);

    tMesh = meshBuilder.buildQuad(1, 1, 1, 'http://localhost:3000/public/img/image-t.png');
    meshes.push(tMesh);

    sMesh = meshBuilder.buildQuad(1, 1, 1, 'http://localhost:3000/public/img/image-s.png');
    meshes.push(sMesh);
  };

  var reset = function() {
    entities = [];
  };

  var add = function(x, y, s) {

    wx = x - G_BOARD_SIZE / 2;
    wy = -y + G_BOARD_SIZE / 2;

    wx += 0.5;
    wy -= 0.5;

    entities.push({
      position: vec3.fromValues(wx, wy, 0),
      mesh: meshes[s]
    });
  };

  // Scoped "classes" below
  // ----------------------

  // Shader-program
  var shader = (function() {
    // Ids
    var programId;
    var vertexShaderId;
    var fragmentShaderId;

    // Uniforms
    var uniforms = [];

    var init = function(vs, fs) {
      programId = gl.createProgram();
      if(!programId) {
        console.error('ERROR: Failed to instantiate shader program')

        return 0;
      }

      vertexShaderId = loadShader(vs, gl.VERTEX_SHADER);
      if(vertexShaderId === null) {
        return 0;
      }

      fragmentShaderId = loadShader(fs, gl.FRAGMENT_SHADER);
      if(fragmentShaderId === null) {
          return 0;
      }

      gl.attachShader(programId, vertexShaderId);
      gl.attachShader(programId, fragmentShaderId);

      gl.linkProgram(programId);
      if(!gl.getProgramParameter(programId, gl.LINK_STATUS)) {
        console.error('ERROR: Failed to link shader program: ' + gl.getProgramInfoLog(programId));

        return 0;
      }

      gl.validateProgram(programId);
      if(!gl.getProgramParameter(programId, gl.VALIDATE_STATUS)) {
        console.error('ERROR: Failed to validate shader program: ' + gl.getProgramInfoLog(programId));

        return 0;
      }

      // Return 1 for success
      return 1;
    };

    // Helper function to load a shader
    var loadShader = function(data, type) {
      var id = gl.createShader(type);
      if(!id) {
        console.error('ERROR: Failed to create shader, type: ' + type);
      }

      gl.shaderSource(id, data);
      gl.compileShader(id);
      if(!gl.getShaderParameter(id, gl.COMPILE_STATUS)) {
        console.error('ERROR: Failed to compile shader, type: ' + type + ': ' + gl.getShaderInfoLog(id));

        return null;
      }

      return id;
    };

    var bind = function() {
      gl.useProgram(programId);
    };

    var unbind = function() {
      gl.useProgram(null);
    };

    var createUniform = function(name) {
      var location = gl.getUniformLocation(programId, name);
      uniforms[name] = location;
    };

    var setUniform1i = function(name, value) {
      gl.uniform1i(uniforms[name], value);
    };

    var setUniform4fv = function(name, value) {
      gl.uniform4fv(uniforms[name], value);
    };

    // We only have 4x4 matrices
    var setUniformMatrix = function(name, value) {
      gl.uniformMatrix4fv(uniforms[name], false, value);
    };

    return {
      init: init,
      bind: bind,
      unbind: unbind,
      createUniform: createUniform,
      setUniform1i: setUniform1i,
      setUniform4fv: setUniform4fv,
      setUniformMatrix: setUniformMatrix
    };

  })();

  // Mesh builder
  var meshBuilder = (function() {
    const meshDefaultColor = [0, 0, 0, 1];  // Default color for the mesh, black

    var create = function(positions, indices) {
      var vaoId = gl.createVertexArray();
      gl.bindVertexArray(vaoId);

      // Position buffer
      var vboPosId = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vboPosId);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

      // indices
      var vboIndId = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vboIndId);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

      gl.bindBuffer(gl.ARRAY_BUFFER, null);

      gl.bindVertexArray(null);

      var mesh = {
        vertexCount: indices.length,
        vaoId: vaoId,
        vboPosId: vboPosId,
        vboIndId: vboIndId,
        vboTexId: null,
        texId: null,
        hasTexture: 0,
        color: meshDefaultColor,
        drawMode: gl.TRIANGLES
      };

      return mesh;
    };

    var loadTexture = function(mesh, texCoords, imageUrl) {
      // Texture coordinates VBO
      gl.bindVertexArray(mesh.vaoId);

      mesh.vboTexId = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vboTexId);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.bindVertexArray(null);

      // Texture buffer
      // Create a temporary 1x1 texture, so we can use it immediately
      // before the image has been downloaded
      const texId = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texId);

      const level = 0;
      const border = 0;
      const format = gl.RGBA;
      const type = gl.UNSIGNED_BYTE;
      const pixel = new Uint8Array([0, 0, 255, 255]);

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      gl.texImage2D(gl.TEXTURE_2D, level, format, 1, 1, border, format, type, pixel);

      const image = new Image();
      image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, texId);
        gl.texImage2D(gl.TEXTURE_2D, level, format, format, type, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.bindTexture(gl.TEXTURE_2D, null);
      };

      image.src = imageUrl;

      // Store texture id
      mesh.texId = texId;
      mesh.hasTexture = 1;

      gl.bindTexture(gl.TEXTURE_2D, null);
    };

    var buildQuad = function(w, h, tr, imageUrl) {
      hw = w / 2;
      hh = h / 2;

      positions = [
        -hw, hh, 0,
        -hw, -hh, 0,
        hw, -hh, 0,
        hw, hh, 0
      ];

      indices = [
        0, 1, 3,
        3, 1, 2
      ];

      texCoords = [
        0, 0,
        0, tr,
        tr, tr,
        tr, 0
      ];

      var mesh = create(positions, indices);

      loadTexture(mesh, texCoords, imageUrl);

      return mesh;
    };

    var buildGrid = function() {
      var lines = G_BOARD_SIZE + 1;
      var size = lines * 4;

      var positions = [];
      var indices = [];

      // Vertical lines
      for(var i = 0; i < G_BOARD_SIZE + 1; i++) {
        var x = -G_BOARD_SIZE / 2 + i;

        positions.push(x);
        positions.push(G_BOARD_SIZE / 2);
        positions.push(0);

        positions.push(x);
        positions.push(-G_BOARD_SIZE / 2);
        positions.push(0);
      }

      // Horizontal lines
      for(var i = 0; i < G_BOARD_SIZE + 1; i++) {
        y = -G_BOARD_SIZE / 2 + i;

        positions.push(G_BOARD_SIZE / 2);
        positions.push(y);
        positions.push(0);

        positions.push(-G_BOARD_SIZE / 2);
        positions.push(y);
        positions.push(0);
      }

      for(var i = 0; i < size; i++) {
        indices.push(i);
      }

      var mesh = create(positions, indices);
      mesh.drawMode = gl.LINES;

      return mesh;
    };

    return {buildQuad: buildQuad, buildGrid: buildGrid};

  })();

  // Camera
  var camera = (function() {
    // Viewport config
    const V_HEIGHT = 15;
    const V_ZNEAR = -1;
    const V_ZFAR = 1;

    const V_MIN_ZOOM = 0.75;
    const V_MAX_ZOOM = 4;

    // Matrices
    var projectionMatrix = new Float32Array(16);
    var viewMatrix = new Float32Array(16);
    var ivp = new Float32Array(16);

    // Position
    var position = vec3.create();

    var zoomFactor = 1;

    // Viewport size
    var viewport = [];
    var screen = [];

    var init = function(w, h) {
      screen.width = w;
      screen.height = h;

      updateViewMatrix();
      updateProjectionMatrix(w, h);
    };

    var updateViewMatrix = function() {
      mat4.identity(viewMatrix);
      mat4.translate(viewMatrix, viewMatrix, position);

      mat4.identity(ivp);
      mat4.mul(ivp, projectionMatrix, viewMatrix);
      mat4.invert(ivp, ivp);
    };

    var updateProjectionMatrix = function(w, h) {
      screen.width = w;
      screen.height = h;

      var aspectRatio = w / h;

      var height = V_HEIGHT;
      var width = V_HEIGHT * aspectRatio;

      mat4.identity(projectionMatrix);
      mat4.ortho(projectionMatrix, -width / 2 * zoomFactor, width / 2 * zoomFactor, -height / 2 * zoomFactor, height / 2 * zoomFactor, V_ZNEAR, V_ZFAR);

      viewport.width = width;
      viewport.height = height;
    };

    var update = function() {
      var wh = viewport.width / 2;
      var hh = viewport.height / 2;

      var bsh = G_BOARD_SIZE / 2;

      // Keep camera within boundaries
      if(position[0] - wh < -bsh) {
        position[0] = -bsh + wh;
      } else if(position[0] + wh > bsh) {
        position[0] = bsh - wh;
      }

      if(position[1] - hh < -bsh) {
        position[1] = -bsh + hh;
      } else if(position[1] + hh > bsh) {
        position[1] = bsh - hh;
      }

      updateViewMatrix();
    };

    var unproject = function(sx, sy) {
      x = (sx / screen.width) * 2 - 1;
      y = 1 - (sy / screen.height) * 2;

      var v = vec4.fromValues(x, y, 0, 1);
      vec4.transformMat4(v, v, ivp);

      return {
        x: v[0],
        y: v[1]
      };
    };

    var zoom = function(delta) {
      zoomFactor -= delta;

      if(zoomFactor < V_MIN_ZOOM) {
        zoomFactor = V_MIN_ZOOM;
      } else if(zoomFactor > V_MAX_ZOOM) {
        zoomFactor = V_MAX_ZOOM;
      }

      updateProjectionMatrix(screen.width, screen.height);
    }

    var reset = function() {
      vec3.set(position, 0, 0, 0);
    };

    return {
        init: init,
        update: update,
        reset: reset,
        unproject: unproject,
        zoom: zoom,
        position: position,
        projectionMatrix: projectionMatrix,
        viewMatrix: viewMatrix
    };

  })();

  // Util/helper functions
  var helpers = (function() {

    var loadFile = function(url, callback) {
      var req = new XMLHttpRequest();
      req.open('GET', url, true);
      req.onload = function() {
        if(req.status < 200 || req.status > 299) {
          callback('ERROR: HTTP Status ' + req.status + ' on resource: ' + url, null);
        } else {
          callback(null, req.responseText);
        }
      };
      req.send();
    }

    return {loadFile: loadFile};

  })();

  return {
    load: load,
    reset: reset,
    camera: camera,
    add: add
  };

})();
