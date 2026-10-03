import { backgroundSize } from './background-budget.js';

// Packed values from the supplied 21st.dev Mesh drift export. Dark treatment is
// applied by CSS, keeping the source shader and its colour/motion recipe intact.
export const MESH_DRIFT = Object.freeze({
  speed: 0.73,
  colors: [0.063, 0, 0.169, 0.498, 0, 1, 0.2, 0.682, 0.725, 0.035, 0.125, 0.957],
  shape: [1.1, 0.34, 0.5, 0],
  surface: [2.4, 0.96, -0.1, 0.96],
  finish: [0, 0.36, 0.026, 0.07],
  transform: [1453, 0, 0, 0],
  space: [0, 0, 0, 0],
  cursor: [0, 2, 0.65, 0.46],
});

const VERTEX_SHADER = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

export function createMeshRenderer(canvas, fragmentSource) {
  let gl;
  try {
    gl = canvas.getContext('webgl', {
      alpha: false, antialias: false, depth: false, stencil: false,
      powerPreference: 'low-power',
    });
  } catch { return null; }
  if (!gl) return null;
  const shaders = [];
  let program;
  let buffer;
  const dispose = () => {
    // Deleting a currently bound program defers release until it is unbound.
    gl.useProgram(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    shaders.forEach(shader => gl.deleteShader(shader));
  };

  try {
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Shader allocation failed');
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Shader compilation failed');
      return shader;
    };
    const vertex = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    program = gl.createProgram();
    if (!program) throw new Error('Program allocation failed');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Shader link failed');
    gl.useProgram(program);

    buffer = gl.createBuffer();
    if (!buffer) throw new Error('Triangle allocation failed');
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const colors = new Float32Array(24);
    colors.set(MESH_DRIFT.colors);
    gl.uniform3fv(gl.getUniformLocation(program, 'u_colors[0]'), colors);
    for (const name of ['shape', 'surface', 'finish', 'transform', 'space', 'cursor']) {
      gl.uniform4fv(gl.getUniformLocation(program, `u_${name}`), MESH_DRIFT[name]);
    }
    const scene = gl.getUniformLocation(program, 'u_scene');
    const maxViewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
    const maxBuffer = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);

    return {
      resize(width, height, pixelRatio, quality = 1) {
        const size = backgroundSize(width, height, pixelRatio, quality, maxViewport, maxBuffer);
        const nextWidth = size.width, nextHeight = size.height;
        const changed = canvas.width !== nextWidth || canvas.height !== nextHeight;
        if (changed) {
          canvas.width = nextWidth;
          canvas.height = nextHeight;
        }
        gl.viewport(0, 0, canvas.width, canvas.height);
        return changed;
      },
      draw(seconds) {
        gl.uniform4f(scene, canvas.width, canvas.height, seconds * MESH_DRIFT.speed, 4);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      dispose,
    };
  } catch {
    dispose();
    return null; // Static CSS field remains usable if GPU setup fails.
  }
}
