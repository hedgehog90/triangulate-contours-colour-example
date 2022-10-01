const {ipcRenderer} = require("electron");

/** @type {HTMLCanvasElement} */
var canvas;
window.onload = ()=>{
    document.write("<head><style>html,body { padding:0; margin:0; overflow:hidden; }</style></head><body></body>");
    canvas = document.createElement("canvas")
    canvas.width = 800;
    canvas.height = 600;
    document.body.append(canvas);
};


function clear() {
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0,0,canvas.width, canvas.height);
};


function draw_poly(data, fill, stroke) {
    var ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.moveTo(data[data.length-2], data[data.length-1]);
    for (var i=0; i<data.length; i+=2) {
        ctx.lineTo(data[i], data[i+1]);
    }
    ctx.closePath();
    if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.stroke();
    }
    if (fill) {
        // ctx.globalAlpha = 0.5;
        ctx.fillStyle = fill;
        ctx.fill();
        // ctx.globalAlpha = 1.0;
    }
}
function draw_line(x1, y1, x2, y2, stroke, thickness=1) {
    var ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.lineWidth = thickness;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.stroke();
    }
}
ipcRenderer.on('draw_poly', (_,args)=>draw_poly(...args));
ipcRenderer.on('draw_line', (_,args)=>draw_line(...args));
ipcRenderer.on('clear', (_,args)=>clear());