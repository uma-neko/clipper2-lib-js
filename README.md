# clipper2-lib-js  
[![https://www.npmjs.com/package/clipper2-lib-js](https://badge.fury.io/js/clipper2-lib-js.svg)](https://www.npmjs.com/package/clipper2-lib-js)  
A Path Clipping and Offsetting library.  
A port of _[Clipper2](https://github.com/AngusJohnson/Clipper2)_(C#) to js/ts.  

## Examples  

```javascript
const subj = new PathsD();
const clip = new PathsD();
subj.push([
    {x:100, y:50},
    {x:10, y:79},
    {x:65, y:2},
    {x:65, y:98},
    {x:10, y:21}
]);
clip.push(Clipper.makePathD([ 98, 63, 4, 68, 77, 8, 52, 100, 19, 12 ]));
const solution = Clipper.intersect(subj, clip, FillRule.NonZero);
```

![clipper-2-example](https://github.com/uma-neko/clipper2-lib-js/assets/36249844/e13e74e6-ef12-4512-a4f2-6e226a9234c5)

## Todo
- [ ] Add build process.  
- [ ] Add tests.  
- [ ] Add comments.  
- [ ] Add demo.  
- [ ] Add benchmark.  

## Plan
- [x] TypedArray Path.  

## Release notes
### version 0.0.3
#### Breaking Changes
  - Changed to `Path64` and `PathD` constructor.  
    Obsolutde `Paths64` and `PathsD` constructor methods whose argument is `Iterable<Iterable<Point>>`.  
  - Breaking Changes: Removed to `Rect64` and `RectD` type guard property.  
    `Rect64.isRect64` and `RectD.isRectD` has been obsoleted.  
#### Changes
  - Updated `Path64`, `PathD`, `Paths64`, `PathsD`.  
    - `Path64` and `PathD` push methods now always make clone Points.  
    - Added clone method.  
    - Added pushRange method.  
      Those arguments are `Iterable<Iterable<Point>>` or `Iterable<Point>`.  
  - Added abstract type `IPath64` and `IPathD`.
  - Added `Rect64` and `RectD` type guard methods.
  - Added new class `Path64TypedArray` and `PathDTypedArray`.  
    This class uses `TypedArray` internally to improve speed when adding elements.
  - Changed build script.
  - Reduced strange type definitions.
  - Added error messages.
  - Extract 64 and D version methods.
    - `Clipper.perpendicDistFromLineSqrd`
    - `Clipper.ellipse`

#### Performance improvements
  - Reduced object creations.  
  - Reduced type conversions.

#### Bug fixes
  - Fixed a bug that `Clipper.scalePaths` returned an empty array when using `Paths64` and small scale.
  - Fixed `Clipper.reversePath` to work correctly.
  - Fixed scanline sort bug.
  - Fixed a bug that `Path64Like` was not cloned when using `Point64`.
  - Fixed `Clipper.rdp` to work correctly.
  - Fixed `RectClip64.getNextLocation` range check to be performed.
  - Fixed the default value of `isClosedPath(s)` in `Clipper.simplifyPaths(s)`.  
    Changed initial value for `Path(s)64` to `false`, and for `Path(s)D` to `true`.
