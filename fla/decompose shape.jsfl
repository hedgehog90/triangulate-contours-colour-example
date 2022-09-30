fl.runScript(fl.scriptURI+"/../JSON.jsfl");

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

// var curve_recursion_limit = 32;
// var curve_collinearity_epsilon = 1e-30;
// var m_angle_tolerance = (Math.PI/180) * 20;

fl.outputPanel.clear();
fl.drawingLayer.beginDraw(true);
fl.drawingLayer.beginFrame();

var dom = fl.getDocumentDOM();
var selection = dom.selection;
var e = selection[0];
var contours = [];
var bezierbuilder = new BezierBuilder();
for (var c=0; c<e.contours.length; c++) {
    var cont = e.contours[c];
    if (cont.fill.style == "noFill") continue;
    var he = cont.getHalfEdge();
    var first_id = he.id;
    var id = 0;
    var contour = [];
    while (id != first_id) {
        var c3 = he.getVertex();
        var edge = he.getEdge();
        if (edge.isLine) {
            contour.push(c3.x, c3.y);
        } else {
            var c1 = he.getPrev().getVertex();
            var c2 = edge.getControl(1);
            bezierbuilder.bezier(c1.x, c1.y, c2.x, c2.y, c3.x, c3.y, 1.0, contour);
        }
        he = he.getNext();
        id = he.id;
    }
    draw_poly(contour);
    contours.push(contour);
}
fl.drawingLayer.endFrame();
fl.drawingLayer.endDraw();

fl.trace(JSON.stringify(contours));