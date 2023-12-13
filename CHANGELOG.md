# Change Log
## [0.0.6] - 2023-12-07
Ported from original version 1.3.0.  

### Breaking Changes
  - Changed to offset delta now affect twice as much.  

### Changes
  - Changed build script.
  - Cleanuped simplifyPath functions.
  - Added arcTolerance argument to inflatePath(s).

### Bug fixes
  - Fixed minor bug in PolyTree nesting. 
  - Fixed minor bug in polygon offsetting.
  - Fixed bug in polygon clipping.

## [0.0.5] - 2023-10-14
### Changes
  - Followed rounding rules of the original code.  
    Re-fixed because it was not fixed in the version 0.0.4.
  - Changed build src script.
  - Added C++ version like test.  
    - Added offset test.
    - Added polytree test to polygons test.
    - Added offset orientation test.
    - Added orientation test.
    - Added polytree tests.
    - Added random path test.
    - Prettified test code.
  - Fixed "polygons.json" tolerance.

### Performance improvements
  - Changed to generate `OutRec.path` when needed.

### Bug fixes
  - Fixed Path64(d)TypedArray.pop.
  - Fixed polypath condition bug.
  - Fixed Clipper.trimCollinear bug.
  - Fixed setOwner and isValidOwner bug.
  - Fixed Rect64.intersects bug.

## [0.0.4] - 2023-10-03
### Changes
  - Added a new join type `JoinType.Bevel` for offsetting.
  - Followed rounding rules of the original code.

## [0.0.3] - 2023-09-30
### Breaking Changes
  - Changed to `Path64` and `PathD` constructor.  
    Obsolutde `Paths64` and `PathsD` constructor methods whose argument is `Iterable<Iterable<Point>>`.  
  - Breaking Changes: Removed to `Rect64` and `RectD` type guard property.  
    `Rect64.isRect64` and `RectD.isRectD` has been obsoleted.  

### Changes
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

### Performance improvements
  - Reduced object creations.  
  - Reduced type conversions.

### Bug fixes
  - Fixed a bug that `Clipper.scalePaths` returned an empty array when using `Paths64` and small scale.
  - Fixed `Clipper.reversePath` to work correctly.
  - Fixed scanline sort bug.
  - Fixed a bug that `Path64Like` was not cloned when using `Point64`.
  - Fixed `Clipper.rdp` to work correctly.
  - Fixed `RectClip64.getNextLocation` range check to be performed.
  - Fixed the default value of `isClosedPath(s)` in `Clipper.simplifyPaths(s)`.  
    Changed initial value for `Path(s)64` to `false`, and for `Path(s)D` to `true`.
