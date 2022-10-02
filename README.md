# triangulate-contours-colour-example

[![enter image description here][1]][1]

Some basic scripts to convert contours to triangulated 2d meshes, with contour color fills intact.

Run `npm i` to install dependencies.
Then run `electron .` for demo.

The contour data is extracted from an Adobe Flash/Animate document using a JSFL script which I've included in the 'fla' directory.

I used the Tess2 library to process the contours into triangles.
For multiple color fills the contours have to be grouped by their fill and processed separately.

  [1]: https://i.imgur.com/C9dZF0q.png
