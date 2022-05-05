import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

interface Buffer {
  position: WebGLBuffer;
  color: WebGLBuffer;
}

interface ProgramInfo {
  program: WebGLProgram;
  attribLocations: {
    vertexPosition: number;
    vertexColor: number;
  }
}

//
// initBuffers
//
// Initialize the buffers we'll need. For this demo, we just
// have one object -- a simple two-dimensional square.
//
function initBuffers(gl: WebGL2RenderingContext): Buffer {
  // Create a buffer for the square's positions.

  const positionBuffer = gl.createBuffer();

  // Select the positionBuffer as the one to apply buffer
  // operations to from here out.

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // Now create an array of positions for the square.

  const positions = [
    1.0, 1.0,
    -1.0, 1.0,
    1.0, -1.0,
    -1.0, -1.0,
  ];

  // Now pass the list of positions into WebGL to build the
  // shape. We do this by creating a Float32Array from the
  // JavaScript array, then use it to fill the current buffer.

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  // Now set up the colors for the vertices

  const colors = [
    1.0, 1.0, 1.0, 1.0, // white
    1.0, 0.0, 0.0, 1.0, // red
    0.0, 1.0, 0.0, 1.0, // green
    0.0, 0.0, 1.0, 1.0, // blue
  ];

  const colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

  return {
    position: positionBuffer,
    color: colorBuffer,
  };
}

//
// Draw the scene.
//
function drawScene(gl: WebGL2RenderingContext, programInfo: ProgramInfo, buffers: Buffer): void {
  gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
  gl.clearDepth(1.0); // Clear everything
  gl.enable(gl.DEPTH_TEST); // Enable depth testing
  gl.depthFunc(gl.LEQUAL); // Near things obscure far things

  // Clear the canvas before we start drawing on it.

  gl.clear(gl.COLOR_BUFFER_BIT || gl.DEPTH_BUFFER_BIT);

  // Tell WebGL how to pull out the positions from the position
  // buffer into the vertexPosition attribute
  // eslint-disable-next-line no-lone-blocks
  {
    const numComponents = 2;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(
      programInfo.attribLocations.vertexPosition,
      numComponents,
      type,
      normalize,
      stride,
      offset,
    );
    gl.enableVertexAttribArray(
      programInfo.attribLocations.vertexPosition,
    );
  }

  // Tell WebGL how to pull out the colors from the color buffer
  // into the vertexColor attribute.
  // eslint-disable-next-line no-lone-blocks
  {
    const numComponents = 4;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
    gl.vertexAttribPointer(
      programInfo.attribLocations.vertexColor,
      numComponents,
      type,
      normalize,
      stride,
      offset,
    );
    gl.enableVertexAttribArray(
      programInfo.attribLocations.vertexColor,
    );
  }

  // Tell WebGL to use our program when drawing

  gl.useProgram(programInfo.program);

  // eslint-disable-next-line no-lone-blocks
  {
    const offset = 0;
    const vertexCount = 4;
    gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
  }
}

//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);

  // Send the source to the shader object

  gl.shaderSource(shader, source);

  // Compile the shader program

  gl.compileShader(shader);

  const compilationLog = gl.getShaderInfoLog(shader);
  console.log(`Shader compiler log: ${compilationLog}`);

  // See if it compiled successfully

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(`An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`);
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

//
// Initialize a shader program, so WebGL knows how to draw our data
//
function initShaderProgram(gl: WebGL2RenderingContext, vsSource: string, fsSource: string) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  // Create the shader program

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert(`Unable to initialize the shader program: ${gl.getProgramInfoLog(shaderProgram)}`);
    return null;
  }

  return shaderProgram;
}

// eslint-disable-next-line no-undef
function App(): JSX.Element {
  const [url, setURL] = useState('');
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const gl = canvas.getContext('webgl2');

  // eslint-disable-next-line react/jsx-no-useless-fragment
  if (gl === null) return <></>;

  // vertex shader
  const vsSource = `#version 300 es
    in vec4 aVertexPosition;
    in vec4 aVertexColor;

    out vec4 vColor;

    void main(void) {
      gl_Position = aVertexPosition;
      vColor = aVertexColor;
    }
  `;

  // fragment shader
  const fsSource = `#version 300 es
    precision mediump float;
    in vec4 vColor;
    out vec4 fragColor;

    void main(void) {
      vec2 st = gl_FragCoord.xy;
      fragColor = vColor;
      // fragColor = vec4(st.x / 1000., st.y / 1000., 0., 1.);
    }
  `;

  // Initialize a shader program; this is where all the lighting
  // for the vertices and so forth is established.
  const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

  // Collect all the info needed to use the shader program.
  // Look up which attributes our shader program is using
  // for aVertexPosition, aVertexColor and also
  // look up uniform locations.
  const programInfo = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
      vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
    },
  };

  // Here's where we call the routine that builds all the
  // objects we'll be drawing.
  const buffers = initBuffers(gl);

  // Draw the scene
  drawScene(gl, programInfo, buffers);

  // const dataURL = canvas.toDataURL();

  function getBlob(): Promise<Blob> {
    // eslint-disable-next-line no-promise-executor-return
    return new Promise((resolve) => canvas.toBlob(resolve));
  }
  useEffect(() => {
    const startTime = performance.now();
    getBlob().then((data) => setURL(URL.createObjectURL(data)));
    const endTime = performance.now();
    console.log(endTime - startTime);
  }, []);

  return (
    <svg width={canvas.width} height={canvas.height}>
      <image href={url} width={canvas.width} height={canvas.height} />
    </svg>
  );
}

const container = document.getElementById('root');
const root = createRoot(container); // createRoot(container!) if you use TypeScript
root.render(<App />);
