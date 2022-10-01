const { app, BrowserWindow, ipcMain } = require('electron')
const path = require("path");
const offset = require("@flatten-js/polygon-offset").default;
const {segment, point, Polygon} = require("@flatten-js/core").default;
// const lineOffset = require("line2offset");

/** @type {BrowserWindow} */
var win;
app.whenReady().then(()=>{
    createWindow();
});
const createWindow = ()=>{
    win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.resolve(__dirname, "preload.js"),
            webSecurity: false,
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            devTools: true,
            nativeWindowOpen: true,
        }
    })
    // win.webContents.openDevTools();
    win.loadURL("about:blank");
    win.webContents.on('dom-ready', () => {
        run();
    });
}

function run(){
    var Tess2 = require("./Tess2");
    var contours = [[598.55,14,566,14,566,82.15,626.75,82.15,626.75,47.15,598.55,47.15],[566,14,352,14,352,156.05,385.85,156.05,385.85,47.9,532.25,47.9,532.25,146.05,566,146.05,566,82.15],[352,156.05,304,156.05,270.25,156.05,232.05,156.05,232.05,194.15,232.05,228,232.05,274.05,416.1,274.05,416.1,228,416.1,194.15,416.1,156.05,385.85,156.05],[362.05,236.05,292.05,236.05,292.05,200.05,362.05,200.05],[416.1,194.15,416.1,228,464.1,228,464.1,194.15],[270.25,81.05,270.25,116.05,270.25,156.05,304,156.05,304,14,90,14,90,86.05,90,86.5,90,86.95,90,228,232.05,228,232.05,194.15,189.6,194.15,157.05,194.15,123.85,194.15,123.85,161,123.85,126,123.85,47.9,209.5,47.9,242.05,47.9,270.25,47.9],[209.5,47.9,209.5,116.05,270.25,116.05,270.25,81.05,242.05,81.05,242.05,47.9],[189.6,126,123.85,126,123.85,161,157.05,161,157.05,194.15,189.6,194.15]];
var colors = ["#6dffc2","#3399cc","#9c9c9c","#9c9c9c","#383838","#ff0000","#00ff00","#0000ff"]

    var res = Tess2.tesselate({
        contours: contours,
        windingRule: Tess2.WINDING_NEGATIVE,
        elementType: Tess2.POLYGONS,
        polySize: 3,
        vertexSize: 2
    })
    draw_mesh(res.mesh);

    /* for (var i=0; i<res.elementCount; i++) {
        var data = [];
        for (var j=0;j<polysize;j++) {
            var k = res.elements[i*polysize+j];
            data[j*2] = res.vertices[k*2];
            data[j*2+1] = res.vertices[k*2+1];
        }
        var color = colors[res.contourIndices[i]];
        win.webContents.send('draw_poly', [data, color, "#000000"]);
    } */
    function offset_path(path, amount) {
        let polygon = new Polygon(path.map(p=>point(...p)));
        polygon = offset(polygon, amount);
        path = [];
        for (var i=0;i<polygon.vertices.length; i++) {
            path[i] = [polygon.vertices[i].x, polygon.vertices[i].y];
        }
        return path;
    }
    function draw_mesh(mesh) {
        win.webContents.send('clear');
        for (var f = mesh.fHead.next; f !== mesh.fHead; f = f.next ) {
            if ( !f.inside ) continue;
            var path = [];
            var cols = [];
            var start, edge;
            start = edge = f.anEdge;
            do {
                var x0 = edge.Org.coords[0];
                var y0 = edge.Org.coords[1];
                var x1 = edge.Dst.coords[0];
                var y1 = edge.Dst.coords[1];
                cols.push();
                win.webContents.send('draw_line', [x0,y0,x1,y1, colors[edge.contourId] || "#000000", 1]);
                edge = edge.Lnext;
            } while ( edge !== start );
            for (var i = 0; i < path.length; i++) {
            }
        }
    }
}


/* var res = Tess2.tesselate({
    contours: contours,
    windingRule: Tess2.WINDING_NEGATIVE,
    elementType: Tess2.BOUNDARY_CONTOURS,
    polySize: 3,
    vertexSize: 2
})
random_color = ()=>{
    return "#"+Math.floor(Math.random()*16777215).toString(16).padStart("0",6);
}
for (var j = 0; j < res.elements.length; j += 2) {
    let element_start = res.elements[j];
    let num_elements = res.elements[j+1];
    var data = [];
    for (var i = 0; i < num_elements; i += 1){
        let vertex_offset = i*2 + element_start*2;
        data.push(res.vertices[vertex_offset], res.vertices[vertex_offset+1]);
    }
    draw_poly(data, null, random_color());
} */