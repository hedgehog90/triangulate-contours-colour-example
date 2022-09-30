# triangulate-contours-colour-example

Just some basic scripts to convert contours to triangulated 2d meshes, with contour color fills intact.

Run `npm i` to install dependencies.
Then run `electron .` for demo.

The contour data is extracted from an Adobe Flash/Animate document, using a JSFL script which I've included in the 'fla' directory.

I used the Tess2 library to process the contours into triangles, but I've modified it slightly to add contour data to each face in the mesh, so the triangles output by the tesselation algorithm are still tied to their original contour input, and thus a triangle can retain it's contour's color information.
