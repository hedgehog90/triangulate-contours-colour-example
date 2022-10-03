const { app, BrowserWindow, ipcMain } = require('electron')
const path = require("path");
const fs = require("fs");
const {hexToRgba} = require("./utils");

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

async function run(){
    var Tess2 = require("./Tess2");
    
    var data = JSON.parse(fs.readFileSync("./data.json"));

    win.webContents.send('clear');

    var allvertices = [];
    var allelements = [];
    var allcolors = [];

    var l=0, t=0;
    for (var obj of data) {
        console.log(`Calculating layer ${l}...`);
        console.log(`   contours: ${obj.contours.length}`);
        console.log(`   fill: ${JSON.stringify(obj.fill)}`);
        var polySize = 3;
        var res = Tess2.tesselate({
            contours: obj.contours,
            windingRule: Tess2.WINDING_NEGATIVE,
            elementType: Tess2.POLYGONS,
            polySize: polySize,
            vertexSize: 2
        })
        var color = hexToRgba(obj.fill.color);
        var num_vertices = res.elementCount * 3;
        var vertices = new Float32Array(num_vertices*2);
        var colors = new Float32Array(num_vertices*4);
        for (var i=0; i<res.elementCount; i++) {
            for (var j=0; j<polySize; j++) {
                var v = i*polySize+j;
                var idx = res.elements[v];
                vertices[v*2] = res.vertices[idx*2]
                vertices[v*2+1] = res.vertices[idx*2+1]
                colors[v*4] = color[0];
                colors[v*4+1] = color[1];
                colors[v*4+2] = color[2];
                colors[v*4+3] = color[3];
            }
        }
        
        console.log(`   Triangle count: ${res.elementCount}`);

        allvertices.push(...vertices);
        allcolors.push(...colors);
        win.webContents.send('draw_triangles', [vertices, colors]);

        t += res.elementCount;
        l++;

        win.webContents.send("update_info", [{
            step: l,
            contours: obj.contours.length,
            fill: obj.fill,
            triangles: res.elementCount,
            totalTriangles: t,
        }]);

        await new Promise((resolve)=>{
            ipcMain.once("next",resolve);
        });
    }
    console.log(`------------------------------------------------`);
    console.log(`Total triangle count: ${t}`);

    await new Promise((resolve)=>{
        ipcMain.once("next",resolve);
    });
    
    win.webContents.send('draw_triangles', [allvertices, allelements, allcolors]);
}

console.log("Press a key to draw the next layer...");