var dir = fl.scriptURI+"/..";
fl.runScript(dir+"/JSON.jsfl");

BezierBuilder = function (opt) {
    opt = opt||{};
    var RECURSION_LIMIT = typeof opt.recursion === 'number' ? opt.recursion : 8;
    var curve_collinearity_epsilon = typeof opt.epsilon === 'number' ? opt.epsilon : 1.19209290e-7;
    var PATH_DISTANCE_EPSILON = typeof opt.pathEpsilon === 'number' ? opt.pathEpsilon : 1.0
    var curve_angle_tolerance_epsilon = typeof opt.angleEpsilon === 'number' ? opt.angleEpsilon : 0.01;
    var m_angle_tolerance = opt.angleTolerance || 0;
    var m_distance_tolerance;
    var m_points;

    this.bezier = function(x1, y1, x2, y2, x3, y3, scale, points) {
        if (!points) points = [];
        m_points = points;
        scale = typeof scale === 'number' ? scale : 1.0;
        m_distance_tolerance = PATH_DISTANCE_EPSILON / scale;
        m_distance_tolerance *= m_distance_tolerance;
        recursive_bezier(x1, y1, x2, y2, x3, y3, points, 0);
        points.push(x3, y3);
        return points;
    }

    function recursive_bezier(x1, y1, x2, y2, x3, y3, level) {
        if (level > RECURSION_LIMIT) {
            return;
        }

        // Calculate all the mid-points of the line segments
        //----------------------
        var x12   = (x1 + x2) / 2;                
        var y12   = (y1 + y2) / 2;
        var x23   = (x2 + x3) / 2;
        var y23   = (y2 + y3) / 2;
        var x123  = (x12 + x23) / 2;
        var y123  = (y12 + y23) / 2;

        var dx = x3-x1;
        var dy = y3-y1;
        var d = Math.abs(((x2 - x3) * dy - (y2 - y3) * dx));

        if (d > curve_collinearity_epsilon) { 
            // Regular care
            //-----------------
            if (d * d <= m_distance_tolerance * (dx*dx + dy*dy)) {
                // If the curvature doesn't exceed the distance_tolerance value
                // we tend to finish subdivisions.
                //----------------------
                if (m_angle_tolerance < curve_angle_tolerance_epsilon) {
                    m_points.push(x123, y123);
                    return;
                }
                // Angle & Cusp Condition
                //----------------------
                var da = Math.abs(Math.atan2(y3 - y2, x3 - x2) - Math.atan2(y2 - y1, x2 - x1));
                if (da >= pi) da = 2*pi - da;
                if (da < m_angle_tolerance) {
                    // Finally we can stop the recursion
                    //----------------------
                    m_points.push(x123, y123);
                    return;                 
                }
            }
        } else {
            // Collinear case
            //-----------------
            dx = x123 - (x1 + x3) / 2;
            dy = y123 - (y1 + y3) / 2;
            if (dx*dx + dy*dy <= m_distance_tolerance) {
                m_points.push(x123, y123);
                return;
            }
        }
        // Continue subdivision
        //----------------------
        recursive_bezier(x1, y1, x12, y12, x123, y123, m_points, level + 1); 
        recursive_bezier(x123, y123, x23, y23, x3, y3, m_points, level + 1); 
    }
}

function draw_poly(data, color) {
    if (!color) {
        color = Math.round(0xffffff*Math.random()).toString(16);
        while(color.length < 6) color = "0"+color;
        color = "#"+color;
    }
    fl.drawingLayer.setColor(color);
    fl.drawingLayer.moveTo(data[data.length-2],data[data.length-1]);
    for (var i=0; i<data.length; i+=2) {
        fl.drawingLayer.lineTo(data[i],data[i+1]);
    }
}

function is_raw_shape(a) {
    return a instanceof Shape && !a.isDrawingObject && !a.isFloating && !a.isGroup && !a.isOvalObject && !a.isRectangleObject;
}

function sort_depth(elements, timeline) {
    var layer_index_map;
    if (timeline) layer_index_map = {};
    elements.sort(function(a,b) {
        if (timeline) {
            fl.trace([a.layer.name, b.layer.name])
            if (!layer_index_map[a.layer.name]) layer_index_map[a.layer.name] = timeline.findLayerIndex(a.layer.name);
            if (!layer_index_map[b.layer.name]) layer_index_map[b.layer.name] = timeline.findLayerIndex(b.layer.name);
            if (layer_index_map[a.layer.name] < layer_index_map[b.layer.name]) return -1;
            if (layer_index_map[a.layer.name] > layer_index_map[b.layer.name]) return 1;
        }
        if (b instanceof Shape && b.isFloating) return 1;
        if (a instanceof Shape && a.isFloating) return -1;
        if (b instanceof Shape && b.isFloating) return 1;
        var a_raw_shape = is_raw_shape(a);
        var b_raw_shape = is_raw_shape(b);
        if (a_raw_shape && !b_raw_shape) return -1;
        if (b_raw_shape && !a_raw_shape) return 1;
        return 0;
    });
    return elements;
}

function transform_vertex(v, mat) {
    var p = {x: v.x, y: v.y};
    p = fl.Math.transformPoint(mat, v);
    p.x = Math.round(p.x*100)/100;
    p.y = Math.round(p.y*100)/100;
    return p;
}

// var curve_recursion_limit = 32;
// var curve_collinearity_epsilon = 1e-30;
// var m_angle_tolerance = (Math.PI/180) * 20;

fl.outputPanel.clear();
fl.drawingLayer.beginDraw(true);
fl.drawingLayer.beginFrame();

var dom = fl.getDocumentDOM();
var selection = sort_depth(dom.selection);
var bezierbuilder = new BezierBuilder();
var objects = [];

function add_object(e, parentMatrix) {
    var contour_fill_map = {};
    var mat = e.matrix;
    if (e instanceof Shape && e.isGroup) {
        mat.tx = mat.tx;
        mat.ty = mat.ty;
    }
    fl.trace([JSON.stringify(mat), JSON.stringify(parentMatrix)]);
    if (parentMatrix) {
        mat = fl.Math.concatMatrix(mat, parentMatrix);
    }
    if (e instanceof Shape) {
        
        for (var c=0; c<e.contours.length; c++) {
            var contour = e.contours[c];
            // if (c==0 && cont.fill.style == "noFill") continue;
            if (contour.fill.style == "noFill") continue;
            var he = contour.getHalfEdge();
            var first_id = he.id;
            var id = 0;
            var path = [];
            var fillStr = JSON.stringify(contour.fill);
            while (id != first_id) {
                var c3 = he.getVertex();
                var p3 = transform_vertex(c3, mat);
                var edge = he.getEdge();
                if (edge.isLine) {
                    path.push(p3.x, p3.y);
                } else {
                    var c1 = he.getPrev().getVertex();
                    var c2 = edge.getControl(1);
                    var p1 = transform_vertex(c1, mat);
                    var p2 = transform_vertex(c2, mat);
                    bezierbuilder.bezier(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y, 1.0, path);
                }
                he = he.getNext();
                id = he.id;
            }
            if (!contour_fill_map[fillStr]) {
                contour_fill_map[fillStr] = {
                    contours: [],
                    fill: contour.fill,
                };
                objects.push(contour_fill_map[fillStr]);
            }
            contour_fill_map[fillStr].contours.push(path);
            draw_poly(path);
        }
        if (e.isGroup) {
            var members = sort_depth(e.members);
            for (var i=0;i<members.length;i++) {
                add_object(members[i], parentMatrix);
            }
        }
    } else if (e instanceof SymbolInstance) {
        var tl = e.libraryItem.timeline;
        for (var l=tl.layers.length-1; l>=0; l--) {
            var layer = tl.layers[l];
            var elements = layer.frames[0].elements;
            elements = sort_depth(elements);
            for (var c=0; c<elements.length; c++) {
                add_object(elements[c], mat);
            }
        }
    } else {
        fl.trace("Skipping "+e.elementType);
    }
}

for (var i=0; i<selection.length; i++) {
    add_object(selection[i]);
}

fl.drawingLayer.endFrame();
fl.drawingLayer.endDraw();

var json = JSON.stringify(objects);
FLfile.write(dir+"/../data.json", json);