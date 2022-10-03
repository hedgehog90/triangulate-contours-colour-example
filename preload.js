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
    /** @type {CanvasRenderingContext2D} */
    ctx2d;
    /** @param {HTMLCanvasElement} canvas */
    constructor(canvas, use_gl) {
        this.canvas = canvas;
        this.use_gl = use_gl;

        if (this.use_gl) {
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
        } else {
            this.ctx2d = canvas.getContext("2d");
        }
    }

    clear() {
        if (this.use_gl) {
            this.gl.clearColor(1.0,1.0,1.0,1.0);
            // gl.clearDepth(1.0); // Clear everything
            this.gl.clear(this.gl.COLOR_BUFFER_BIT); // | gl.DEPTH_BUFFER_BIT
        } else {
            this.ctx2d.clearRect(0,0,this.ctx2d.canvas.clientWidth,this.ctx2d.canvas.clientHeight);
        }
    }
    
    draw_poly(data, fill, stroke) {
        if (this.use_gl) {
            var num_verts = data.length/2;
            var positions = new Float32Array(data);
            var colors = new Float32Array(new Array(num_verts).fill(hexToRgba(fill)).flat());
            this.update_gl(positions, colors);
            this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, num_verts);
            if (stroke !== undefined) {
                colors = new Float32Array(new Array(num_verts).fill(hexToRgba(stroke)).flat());
                this.update_gl(positions, colors);
                this.gl.drawArrays(this.gl.LINE_LOOP, 0, num_verts);
            }
        } else {
            this.ctx2d.beginPath();
            this.ctx2d.lineWidth = 1;
            this.ctx2d.moveTo(data[data.length-2], data[data.length-1]);
            for (var i=0; i<data.length; i+=2) {
                this.ctx2d.lineTo(data[i], data[i+1]);
            }
            this.ctx2d.closePath();
            if (fill !== undefined) {
                this.ctx2d.fillStyle = fill;
                this.ctx2d.fill();
            }
            if (stroke !== undefined) {
                this.ctx2d.strokeStyle = stroke;
                this.ctx2d.stroke();
            }
        }
    }
    
    draw_triangles(vertices, fill, stroke) {
        if (this.use_gl) {
            if (fill !== undefined) {
                this.update_gl(vertices, fill);
                this.gl.drawArrays(this.gl.TRIANGLES, 0, vertices.length);
            }

            /* if (stroke !== undefined) {
                let stroke_positions = new Float32Array(num_edges*2);
                let stroke_colors = new Float32Array(num_edges*4);
                for (let t=0; t<num_tris; t++) {
                    for (let e=0;e<3;e++) {
                        let i = t*3+e;
                        let j = t*3+(e+1)%3;
                        let idx1 = indices[i];
                        let idx2 = indices[j];
                        stroke_positions[i*4] = vertices[idx1*2];
                        stroke_positions[i*4+1] = vertices[idx1*2+1];
                        stroke_positions[i*4+2] = vertices[idx2*2];
                        stroke_positions[i*4+3] = vertices[idx2*2+1];
                        stroke_colors[i*8] =   stroke[idx1*4];
                        stroke_colors[i*8+1] = stroke[idx1*4+1];
                        stroke_colors[i*8+2] = stroke[idx1*4+2];
                        stroke_colors[i*8+3] = stroke[idx1*4+3];
                        stroke_colors[i*8+4] = stroke[idx2*4];
                        stroke_colors[i*8+5] = stroke[idx2*4+1];
                        stroke_colors[i*8+6] = stroke[idx2*4+2];
                        stroke_colors[i*8+7] = stroke[idx2*4+3];
                    }
                }
                this.update_gl(stroke_positions, stroke_colors);
                this.gl.drawArrays(this.gl.LINES, 0, num_edges);
            } */
        } else {
            
            var num_tris = indices.length/3;
            for (var i=0; i<num_tris; i++) {
                var poly = new Array(6);
                for (var j=0;j<3;j++) {
                    var vi = indices[i*3+j]*2;
                    poly[j*2] = vertices[vi];
                    poly[j*2+1] = vertices[vi+1];
                }
                this.draw_poly(poly, fill, fillAlpha, stroke, strokeAlpha);
            }
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
        mat4.translate(projectionMatrix, projectionMatrix, [-1, 1, 0])
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