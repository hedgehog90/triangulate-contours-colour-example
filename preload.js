const {ipcRenderer} = require("electron");
const {mat2, mat3, mat4} = require("gl-matrix");
const {hexToRgba} = require("./utils");

/** @type {CanvasContextWrapper} */
var canvasContextWrapper;

/** @type {HTMLCanvasElement} */
var canvas;
window.onload = ()=>{
    var style = document.createElement("style")
    style.innerHTML = `html,body { padding:0; margin:0; overflow:hidden; }`;
    document.head.append(style);
    canvas = document.createElement("canvas")
    canvas.width = 600;
    canvas.height = 600;
    canvasContextWrapper = new CanvasContextWrapper(canvas, true);
    document.body.append(canvas);
    info = document.createElement("div")
    info.style.position = "absolute";
    info.style.top = "0";
    info.style.fontFamily = "monospace";
    info.style.whiteSpace = "pre-wrap";
    document.body.append(info);
    
};
window.addEventListener("keydown", ()=>{
    ipcRenderer.send("next")
});
window.addEventListener("click", ()=>{
    ipcRenderer.send("next")
});
function update_info(d) {
    info.innerHTML = JSON.stringify(d, null, 4);
};
ipcRenderer.on('update_info', (_,args)=>update_info(...args));
ipcRenderer.on('draw_poly', (_,args)=>canvasContextWrapper.draw_poly(...args));
ipcRenderer.on('draw_triangles', (_,args)=>canvasContextWrapper.draw_triangles(...args));
ipcRenderer.on('clear', (_,args)=>canvasContextWrapper.clear());


//
// Start here
//
class CanvasContextWrapper {
    /** @type {WebGLRenderingContext} */
    gl;
    /** @param {HTMLCanvasElement} canvas */
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext("webgl", {
            preserveDrawingBuffer: true,
            alpha: true,
            premultipliedAlpha: false,
        });

        const vsSource = `
            attribute vec4 aVertexPosition;
            attribute vec4 aVertexColor;
            uniform mat4 uProjectionMatrix;
            varying lowp vec4 vColor;
            void main(void) {
                gl_Position = uProjectionMatrix * aVertexPosition;
                vColor = aVertexColor;
            }
        `;
        const fsSource = `
            varying lowp vec4 vColor;
            void main(void) {
                gl_FragColor = vColor;
            }
        `;
        const vertexShader = loadShader(this.gl, this.gl.VERTEX_SHADER, vsSource);
        const fragmentShader = loadShader(this.gl, this.gl.FRAGMENT_SHADER, fsSource);
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            throw new Error();
        }
        this.gl.useProgram(program);
        this.vertexPositionLocation = this.gl.getAttribLocation(program, "aVertexPosition");
        this.vertexColorLocation = this.gl.getAttribLocation(program, "aVertexColor");
        this.projectionMatrixLocation = this.gl.getUniformLocation(program, 'uProjectionMatrix');

        this.gl.enable( this.gl.BLEND );
        this.gl.blendEquation( this.gl.FUNC_ADD );
        this.gl.blendFunc( this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA );
        // gl.enable(gl.DEPTH_TEST); // Enable depth testing
        // gl.depthFunc(gl.LEQUAL); // Near things obscure far things
        // this.clear();
    }

    clear() {
        this.gl.clearColor(1.0,1.0,1.0,1.0);
        // gl.clearDepth(1.0); // Clear everything
        this.gl.clear(this.gl.COLOR_BUFFER_BIT); // | gl.DEPTH_BUFFER_BIT
    }
    
    draw_poly(vertices, colors) {
        var num_verts = vertices.length/2;
        if (colors !== undefined) {
            this.update_gl(vertices, colors);
            this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, num_verts);
        }
        if (strokes !== undefined) {
            this.update_gl(vertices, colors);
            this.gl.drawArrays(this.gl.LINE_LOOP, 0, num_verts);
        }
    }
    
    draw_triangles(vertices, colors) {
        var num_verts = vertices.length/2;
        if (colors !== undefined) {
            this.update_gl(vertices, colors);
            this.gl.drawArrays(this.gl.TRIANGLES, 0, num_verts);
        }
    }

    /** @param {Float32Array} positions @param {Float32Array} colors */
    update_gl(positions, colors) {
        const positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
        this.gl.vertexAttribPointer(this.vertexPositionLocation, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.vertexPositionLocation);
        
        const colorBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, colorBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, colors, this.gl.STATIC_DRAW);
        this.gl.vertexAttribPointer(this.vertexColorLocation, 4, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.vertexColorLocation);
        
        const projectionMatrix = mat4.create();
        mat4.identity(projectionMatrix);
        mat4.translate(projectionMatrix, projectionMatrix, [-1, 1, 0]);
        mat4.scale(projectionMatrix, projectionMatrix, [1/this.gl.canvas.clientWidth*2, -1/this.gl.canvas.clientHeight*2, 1]);
        this.gl.uniformMatrix4fv(this.projectionMatrixLocation, false, projectionMatrix);
    }
}

/** @param {WebGLRenderingContext} gl */
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}