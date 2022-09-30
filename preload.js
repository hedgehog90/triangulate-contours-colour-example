/** @type {HTMLCanvasElement} */

var canvas;
window.onload = ()=>{
    document.write("<head><style>html,body { padding:0; margin:0; }</style></head><body></body>");
    canvas = document.createElement("canvas")
    document.body.append(canvas);
    window.onresize = ()=>{
        update();
    }
};

function update() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0,0,canvas.width,canvas.height);

    function draw_poly(data, fill) {
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.moveTo(data[data.length-2], data[data.length-1]);
        for (var i=0; i<data.length; i+=2) {
            ctx.lineTo(data[i], data[i+1]);
        }
        ctx.strokeStyle = '#000000';
        ctx.stroke();
        if (fill) {
            ctx.fillStyle = fill;
            ctx.fill();
        }
    }

    var Tess2 = require("./Tess2");
    var contours = [[381.95,92.95,167.95,92.95,167.95,165,167.95,165.45,167.95,165.9,167.95,306.95,381.95,306.95],[348.2,195,348.2,273.1,267.55,273.1,235,273.1,201.8,273.1,201.8,239.95,201.8,204.95,201.8,126.85,287.45,126.85,320,126.85,348.2,126.85,348.2,160],[348.2,160,320,160,320,126.85,287.45,126.85,287.45,195,348.2,195],[267.55,204.95,201.8,204.95,201.8,239.95,235,239.95,235,273.1,267.55,273.1]];
    var colors = ["#ff0000","#ff0000","#00ff00","#0000ff"];
    var polysize = 3;
    var res = Tess2.tesselate({
        contours: contours,
        windingRule: Tess2.WINDING_NEGATIVE,
        elementType: Tess2.POLYGONS,
        polySize: polysize,
        vertexSize: 2
    })
    for (var i=0; i<res.elementCount; i++) {
        var data = [];
        for (var j=0;j<polysize;j++) {
            var k = res.elements[i*polysize+j];
            data[j*2] = res.vertices[k*2];
            data[j*2+1] = res.vertices[k*2+1];
        }
        var color = colors[res.contourIndices[i]];
        draw_poly(data, color);
    }
    /* var res = Tess2.tesselate({
        contours: contours,
        windingRule: Tess2.WINDING_NEGATIVE,
        elementType: Tess2.BOUNDARY_CONTOURS,
        polySize: polysize,
        vertexSize: 2
    })
    for (var j = 0; j < res.elements.length; j += 2) {
        let element_start = res.elements[j];
        let num_elements = res.elements[j+1];
        var data = [];
        for (var i = 0; i < num_elements; i += 1){
            let vertex_offset = i*2 + element_start*2;
            data.push(res.vertices[vertex_offset], res.vertices[vertex_offset+1]);
        }
        draw_poly(data, null);
    } */
}