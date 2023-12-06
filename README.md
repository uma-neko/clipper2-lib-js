# clipper2-lib-js  
[![https://www.npmjs.com/package/clipper2-lib-js](https://badge.fury.io/js/clipper2-lib-js.svg)](https://www.npmjs.com/package/clipper2-lib-js)  
A Path Clipping and Offsetting library.  
A port of _[Clipper2](https://github.com/AngusJohnson/Clipper2)_(C#) version 1.2.3 to js/ts.  

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
- [x] Add tests.  
- [ ] Add comments.  
- [ ] Add demo.  
- [ ] Add benchmark.  

## Plan
- [x] TypedArray Path.  

## Change Log
See [ChangeLog](./CHANGELOG.md).
