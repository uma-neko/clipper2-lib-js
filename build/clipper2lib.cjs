"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const FillRule = {
  EvenOdd: 0,
  NonZero: 1,
  Positive: 2,
  Negative: 3
};
const ClipType = {
  None: 0,
  Intersection: 1,
  Union: 2,
  Difference: 3,
  Xor: 4
};
const PathType = {
  Subject: 1,
  Clip: 2
};
const isNotNullish = (obj) => obj !== void 0 && obj !== null && typeof obj === "object";
const bigintAbs = (a) => a >= 0n ? a : -a;
const isPoint64 = (obj) => isNotNullish(obj) && "x" in obj && typeof obj.x === "bigint" && "y" in obj && typeof obj.y === "bigint";
const Point64 = {
  equals: (a, b) => a.x === b.x && a.y === b.y,
  notEquals: (a, b) => a.x !== b.x || a.y !== b.y,
  clone: (origin) => ({ x: origin.x, y: origin.y }),
  createScaledPoint: (x, y, scale) => ({
    x: numberToBigInt(x * scale),
    y: numberToBigInt(y * scale)
  }),
  toString(pt) {
    return `${pt.x}d,${pt.y}d `;
  }
};
const PointInPolygonResult = {
  IsOn: 0,
  IsInside: 1,
  IsOutside: 2
};
const VertexFlags = {
  None: 0,
  OpenStart: 1,
  OpenEnd: 2,
  LocalMax: 4,
  LocalMin: 8
};
const JoinWith = {
  None: 0,
  Left: 1,
  Right: 2
};
const floatingPointTolerance = 1e-12;
const defaultArcTolerance = 0.25;
const checkPrecision = (precision) => {
  if (precision < -8 || precision > 8) {
    throw new RangeError("Precision must be between -8 and 8.");
  }
};
const isAlmostZero = (value) => Math.abs(value) <= floatingPointTolerance;
function crossProduct64(pt1, pt2, pt3) {
  return (pt2.x - pt1.x) * (pt3.y - pt2.y) - (pt2.y - pt1.y) * (pt3.x - pt2.x);
}
function crossProductD(vec1, vec2) {
  return vec1.y * vec2.x - vec2.y * vec1.x;
}
function dotProduct64(pt1, pt2, pt3) {
  return (pt2.x - pt1.x) * (pt3.x - pt2.x) + (pt2.y - pt1.y) * (pt3.y - pt2.y);
}
function dotProductD(vec1, vec2) {
  return vec1.x * vec2.x + vec1.y * vec2.y;
}
const getIntersectPoint = (ln1a, ln1b, ln2a, ln2b) => {
  const dy1 = ln1b.y - ln1a.y;
  const dx1 = ln1b.x - ln1a.x;
  const dy2 = ln2b.y - ln2a.y;
  const dx2 = ln2b.x - ln2a.x;
  const det = dy1 * dx2 - dy2 * dx1;
  if (det === 0n) {
    return { result: false, ip: { x: 0n, y: 0n } };
  }
  const t = Number((ln1a.x - ln2a.x) * dy2 - (ln1a.y - ln2a.y) * dx2) / Number(det);
  if (t <= 0) {
    return { result: true, ip: Point64.clone(ln1a) };
  } else if (t >= 1) {
    return { result: true, ip: Point64.clone(ln1b) };
  } else {
    return {
      result: true,
      ip: {
        x: numberToBigInt(Number(ln1a.x) + t * Number(dx1)),
        y: numberToBigInt(Number(ln1a.y) + t * Number(dy1))
      }
    };
  }
};
const segsIntersect = (seg1a, seg1b, seg2a, seg2b, inclusive = false) => {
  if (inclusive) {
    const res1 = crossProduct64(seg1a, seg2a, seg2b);
    const res2 = crossProduct64(seg1b, seg2a, seg2b);
    if (res1 * res2 > 0n)
      return false;
    const res3 = crossProduct64(seg2a, seg1a, seg1b);
    const res4 = crossProduct64(seg2b, seg1a, seg1b);
    if (res3 * res4 > 0n)
      return false;
    return res1 !== 0n || res2 !== 0n || res3 !== 0n || res4 !== 0n;
  } else {
    return crossProduct64(seg1a, seg2a, seg2b) * crossProduct64(seg1b, seg2a, seg2b) < 0n && crossProduct64(seg2a, seg1a, seg1b) * crossProduct64(seg2b, seg1a, seg1b) < 0n;
  }
};
const getClosestPtOnSegment = (offPt, seg1, seg2) => {
  if (Point64.equals(seg1, seg2))
    return Point64.clone(seg1);
  const dx = seg2.x - seg1.x;
  const dy = seg2.y - seg1.y;
  const q = Number((offPt.x - seg1.x) * dx + (offPt.y - seg1.y) * dy) / Number(dx * dx + dy * dy);
  if (q <= 0) {
    return Point64.clone(seg1);
  } else if (q >= 1) {
    return Point64.clone(seg2);
  }
  return {
    x: seg1.x + BigInt(roundToEven(q * Number(dx))),
    y: seg1.y + BigInt(roundToEven(q * Number(dy)))
  };
};
const pointInPolygon$1 = (pt, polygon) => {
  const len = polygon.length;
  let start = 0;
  if (len < 3) {
    return PointInPolygonResult.IsOutside;
  }
  while (start < len && polygon.getY(start) === pt.y) {
    start++;
  }
  if (start === len) {
    return PointInPolygonResult.IsOutside;
  }
  let isAbove = polygon.getY(start) < pt.y;
  const startingAbove = isAbove;
  let val = false;
  let i = start + 1;
  let end = len;
  while (true) {
    if (i === end) {
      if (end === 0 || start === 0) {
        break;
      }
      end = start;
      i = 0;
    }
    if (isAbove) {
      while (i < end && polygon.getY(i) < pt.y) {
        i++;
      }
      if (i === end) {
        continue;
      }
    } else {
      while (i < end && polygon.getY(i) > pt.y) {
        i++;
      }
      if (i === end) {
        continue;
      }
    }
    const curr = polygon.getClone(i);
    const prev = i > 0 ? polygon.getClone(i - 1) : polygon.getClone(len - 1);
    if (curr.y === pt.y) {
      if (curr.x === pt.x || curr.y === prev.y && pt.x < prev.x !== pt.x < curr.x) {
        return PointInPolygonResult.IsOn;
      }
      i++;
      if (i === start) {
        break;
      }
      continue;
    }
    if (pt.x > prev.x && pt.x > curr.x) {
      val = !val;
    } else if (pt.x >= prev.x || pt.x >= curr.x) {
      const d = crossProduct64(prev, curr, pt);
      if (d === 0n) {
        return PointInPolygonResult.IsOn;
      }
      if (d < 0n === isAbove) {
        val = !val;
      }
    }
    isAbove = !isAbove;
    i++;
  }
  if (isAbove !== startingAbove) {
    if (i === len) {
      i = 0;
    }
    let d;
    if (i === 0) {
      d = crossProduct64(polygon.getClone(len - 1), polygon.getClone(0), pt);
    } else {
      d = crossProduct64(polygon.getClone(i - 1), polygon.getClone(i), pt);
    }
    if (d === 0n) {
      return PointInPolygonResult.IsOn;
    }
    if (d < 0n === isAbove) {
      val = !val;
    }
  }
  if (val) {
    return PointInPolygonResult.IsInside;
  } else {
    return PointInPolygonResult.IsOutside;
  }
};
const InternalClipper = {
  getClosestPtOnSegment,
  pointInPolygon: pointInPolygon$1
};
const Path64TypeName = Symbol("Path64");
const isPath64 = (obj) => {
  return isNotNullish(obj) && obj.type === Path64TypeName;
};
class Path64 extends Array {
  constructor(...args) {
    var __super = (...args) => {
      super(...args);
      __publicField(this, "type");
    };
    if (args.length === 0) {
      __super();
    } else if (typeof args[0] === "number") {
      __super(args[0]);
    } else {
      __super();
      this.pushRange(args);
    }
    this.type = Path64TypeName;
  }
  clone() {
    const clonedPath = new Path64();
    clonedPath.pushRange(this);
    return clonedPath;
  }
  get(index) {
    return this[index];
  }
  getX(index) {
    return this[index].x;
  }
  getY(index) {
    return this[index].y;
  }
  getClone(index) {
    return { x: this[index].x, y: this[index].y };
  }
  set(index, x, y) {
    this[index].x = x;
    this[index].y = y;
  }
  push(...path) {
    for (const pt of path) {
      super.push(Point64.clone(pt));
    }
    return this.length;
  }
  pushRange(path) {
    for (const pt of path) {
      super.push(Point64.clone(pt));
    }
    return this.length;
  }
  clear() {
    if (this.length !== 0) {
      this.length = 0;
    }
  }
}
const PathDTypeName = Symbol("Path64");
const PointDProxy = {
  get(target, prop, _receiver) {
    if (prop === "x") {
      return target.source.getX(target.index);
    } else if (prop === "y") {
      return target.source.getY(target.index);
    }
    return void 0;
  },
  set(target, prop, value, _receiver) {
    if (prop === "x") {
      target.source.setX(target.index, value);
      return true;
    } else if (prop === "y") {
      target.source.setY(target.index, value);
      return true;
    }
    throw new Error("Properties cannot be added.");
  },
  has(_target, prop) {
    return ["x", "y"].includes(prop);
  }
};
class PathDTypedArray {
  constructor(...args) {
    __publicField(this, "type");
    __publicField(this, "_capacity");
    __publicField(this, "_innerLength");
    __publicField(this, "_path");
    this.type = PathDTypeName;
    if (args.length === 0) {
      const startCapacity = 8;
      this._capacity = startCapacity;
      this._innerLength = 0;
      this._path = new Float64Array(
        startCapacity * 2
        /* x,y */
      );
    } else if (typeof args[0] === "number") {
      const startCapacity = args[0];
      this._capacity = startCapacity;
      this._innerLength = 0;
      this._path = new Float64Array(
        startCapacity * 2
        /* x,y */
      );
    } else if (args[0] instanceof PathDTypedArray) {
      const startLength = args[0].length;
      const startCapacity = startLength;
      this._innerLength = startLength;
      this._capacity = startCapacity;
      this._path = args[0]._path.slice(0, startCapacity * 2);
    } else {
      const startCapacity = args.length;
      this._capacity = startCapacity;
      this._innerLength = 0;
      this._path = new Float64Array(
        startCapacity * 2
        /* x,y */
      );
      this.pushRange(args);
    }
  }
  _realloc(length) {
    const capacity = length < 8 ? 8 : length;
    const newPath = new Float64Array(
      capacity * 2
      /* x,y */
    );
    newPath.set(this._path);
    this._path = newPath;
    this._capacity = capacity;
    if (length < this._innerLength) {
      this._innerLength = length;
    }
  }
  _push(path) {
    if (this._capacity === this._innerLength) {
      this._realloc(Math.ceil(this._capacity * 2));
    }
    this._path[this._innerLength * 2] = path.x;
    this._path[this._innerLength * 2 + 1] = path.y;
    this._innerLength++;
  }
  _checkLength(index) {
    if (index < 0 || index >= this._innerLength) {
      throw new RangeError("Invalid array length.");
    }
  }
  clone() {
    return new PathDTypedArray(this);
  }
  pushDecomposed(x, y) {
    if (this._capacity === this._innerLength) {
      this._realloc(Math.ceil(this._capacity * 2));
    }
    this._path[this._innerLength * 2] = x;
    this._path[this._innerLength * 2 + 1] = y;
    this._innerLength++;
  }
  get(index) {
    this._checkLength(index);
    return new Proxy(
      { index, source: this },
      PointDProxy
    );
  }
  set(index, x, y) {
    this._checkLength(index);
    this.setX(index, x);
    this.setY(index, y);
  }
  getClone(index) {
    this._checkLength(index);
    return { x: this._path[index * 2], y: this._path[index * 2 + 1] };
  }
  getX(index) {
    this._checkLength(index);
    return this._path[index * 2];
  }
  getY(index) {
    this._checkLength(index);
    return this._path[index * 2 + 1];
  }
  setX(index, value) {
    this._checkLength(index);
    return this._path[index * 2] = value;
  }
  setY(index, value) {
    this._checkLength(index);
    return this._path[index * 2 + 1] = value;
  }
  setChild(index, value) {
    this._checkLength(index);
    const offset = index % this._innerLength * 2;
    this._path[offset] = value.x;
    this._path[offset + 1] = value.y;
    return true;
  }
  push(...path) {
    for (const pt of path) {
      this._push(pt);
    }
    return this.length;
  }
  pushRange(path) {
    for (const pt of path) {
      this._push(pt);
    }
    return this.length;
  }
  pop() {
    if (this._innerLength === 0) {
      return void 0;
    }
    const result = this.getClone(this._innerLength - 1);
    this._innerLength--;
    return result;
  }
  clear() {
    this._innerLength = 0;
  }
  get length() {
    return this._innerLength;
  }
  asScaledPath64(scale) {
    const scaledPath = new Path64TypedArray(this._innerLength);
    for (let index = 0; index < this._innerLength; index++) {
      scaledPath.pushDecomposed(
        numberToBigInt(this.getX(index) * scale),
        numberToBigInt(this.getY(index) * scale)
      );
    }
    return scaledPath;
  }
  asScaledPathD(scale) {
    if (scale === 1) {
      return new PathDTypedArray(this);
    } else {
      const scaledPath = new PathDTypedArray(this._innerLength);
      for (let index = 0; index < this._innerLength; index++) {
        scaledPath.pushDecomposed(
          this.getX(index) * scale,
          this.getY(index) * scale
        );
      }
      return scaledPath;
    }
  }
  *[Symbol.iterator]() {
    for (let index = 0; index < this._innerLength; index++) {
      yield this.get(index);
    }
  }
}
const Point64Proxy = {
  get(target, prop, _receiver) {
    if (prop === "x") {
      return target.source.getX(target.index);
    } else if (prop === "y") {
      return target.source.getY(target.index);
    }
    return void 0;
  },
  set(target, prop, value, _receiver) {
    if (prop === "x") {
      target.source.setX(target.index, value);
      return true;
    } else if (prop === "y") {
      target.source.setY(target.index, value);
      return true;
    }
    throw new Error("Properties cannot be added.");
  },
  has(_target, prop) {
    return ["x", "y"].includes(prop);
  }
};
class Path64TypedArray {
  constructor(...args) {
    __publicField(this, "type");
    __publicField(this, "_capacity");
    __publicField(this, "_innerLength");
    __publicField(this, "_path");
    this.type = Path64TypeName;
    if (args.length === 0) {
      const startCapacity = 8;
      this._capacity = startCapacity;
      this._innerLength = 0;
      this._path = new BigInt64Array(
        startCapacity * 2
        /* x,y */
      );
    } else if (typeof args[0] === "number") {
      const startCapacity = args[0];
      this._capacity = startCapacity;
      this._innerLength = 0;
      this._path = new BigInt64Array(
        startCapacity * 2
        /* x,y */
      );
    } else if (args[0] instanceof Path64TypedArray) {
      const startLength = args[0].length;
      const startCapacity = startLength;
      this._innerLength = startLength;
      this._capacity = startCapacity;
      this._path = args[0]._path.slice(0, startCapacity * 2);
    } else {
      const startCapacity = args.length;
      this._capacity = startCapacity;
      this._innerLength = 0;
      this._path = new BigInt64Array(
        startCapacity * 2
        /* x,y */
      );
      this.pushRange(args);
    }
  }
  _realloc(length) {
    const capacity = length < 8 ? 8 : length;
    const newPath = new BigInt64Array(
      capacity * 2
      /* x,y */
    );
    newPath.set(this._path);
    this._path = newPath;
    this._capacity = capacity;
    if (length < this._innerLength) {
      this._innerLength = length;
    }
  }
  _push(path) {
    if (this._capacity === this._innerLength) {
      this._realloc(Math.ceil(this._capacity * 2));
    }
    this._path[this._innerLength * 2] = path.x;
    this._path[this._innerLength * 2 + 1] = path.y;
    this._innerLength++;
  }
  _checkLength(index) {
    if (index < 0 || index >= this._innerLength) {
      throw new RangeError("Invalid array length.");
    }
  }
  clone() {
    return new Path64TypedArray(this);
  }
  pushDecomposed(x, y) {
    if (this._capacity === this._innerLength) {
      this._realloc(Math.ceil(this._capacity * 2));
    }
    this._path[this._innerLength * 2] = x;
    this._path[this._innerLength * 2 + 1] = y;
    this._innerLength++;
  }
  get(index) {
    this._checkLength(index);
    return new Proxy(
      { index, source: this },
      Point64Proxy
    );
  }
  set(index, x, y) {
    this._checkLength(index);
    this.setX(index, x);
    this.setY(index, y);
  }
  getClone(index) {
    this._checkLength(index);
    return { x: this._path[index * 2], y: this._path[index * 2 + 1] };
  }
  getX(index) {
    this._checkLength(index);
    return this._path[index * 2];
  }
  getY(index) {
    this._checkLength(index);
    return this._path[index * 2 + 1];
  }
  setX(index, value) {
    this._checkLength(index);
    return this._path[index * 2] = value;
  }
  setY(index, value) {
    this._checkLength(index);
    return this._path[index * 2 + 1] = value;
  }
  setChild(index, value) {
    this._checkLength(index);
    const offset = index % this._innerLength * 2;
    this._path[offset] = value.x;
    this._path[offset + 1] = value.y;
    return true;
  }
  push(...path) {
    for (const pt of path) {
      this._push(pt);
    }
    return this.length;
  }
  pushRange(path) {
    for (const pt of path) {
      this._push(pt);
    }
    return this.length;
  }
  pop() {
    if (this._innerLength === 0) {
      return void 0;
    }
    const result = this.getClone(this._innerLength - 1);
    this._innerLength--;
    return result;
  }
  clear() {
    this._innerLength = 0;
  }
  get length() {
    return this._innerLength;
  }
  asScaledPath64(scale) {
    if (scale === 1) {
      return new Path64TypedArray(this);
    } else {
      const scaledPath = new Path64TypedArray(this._innerLength);
      for (let index = 0; index < this._innerLength; index++) {
        scaledPath.pushDecomposed(
          numberToBigInt(Number(this.getX(index)) * scale),
          numberToBigInt(Number(this.getY(index)) * scale)
        );
      }
      return scaledPath;
    }
  }
  asScaledPathD(scale) {
    const scaledPath = new PathDTypedArray(this._innerLength);
    for (let index = 0; index < this._innerLength; index++) {
      scaledPath.pushDecomposed(
        Number(this.getX(index)) * scale,
        Number(this.getY(index)) * scale
      );
    }
    return scaledPath;
  }
  *[Symbol.iterator]() {
    for (let index = 0; index < this._innerLength; index++) {
      yield this.get(index);
    }
  }
}
const isPointD = (obj) => isNotNullish(obj) && "x" in obj && typeof obj.x === "number" && "y" in obj && typeof obj.y === "number";
const PointD = {
  equals: (a, b) => isAlmostZero(a.x - b.x) && isAlmostZero(a.y - b.y),
  notEquals: (a, b) => !isAlmostZero(a.x - b.x) || !isAlmostZero(a.y - b.y),
  clone: (origin) => ({ x: origin.x, y: origin.y }),
  toString(pt, precision = 2) {
    return `${pt.x.toFixed(precision)},${pt.y.toFixed(precision)} `;
  }
};
const isPathD = (obj) => {
  return isNotNullish(obj) && obj.type === PathDTypeName;
};
class PathD extends Array {
  constructor(...args) {
    var __super = (...args) => {
      super(...args);
      __publicField(this, "type");
    };
    if (args.length === 0) {
      __super();
    } else if (typeof args[0] === "number") {
      __super(args[0]);
    } else {
      __super();
      this.pushRange(args);
    }
    this.type = PathDTypeName;
  }
  clone() {
    const clonedPath = new PathD();
    clonedPath.pushRange(this);
    return clonedPath;
  }
  get(index) {
    return this[index];
  }
  getX(index) {
    return this[index].x;
  }
  getY(index) {
    return this[index].y;
  }
  getClone(index) {
    return { x: this[index].x, y: this[index].y };
  }
  set(index, x, y) {
    this[index].x = x;
    this[index].y = y;
  }
  push(...path) {
    for (const pt of path) {
      super.push(PointD.clone(pt));
    }
    return this.length;
  }
  pushRange(path) {
    for (const pt of path) {
      super.push(PointD.clone(pt));
    }
    return this.length;
  }
  clear() {
    if (this.length !== 0) {
      this.length = 0;
    }
  }
}
const isPaths64 = (obj) => {
  return isNotNullish(obj) && obj.type === Paths64TypeName;
};
const Paths64TypeName = "Paths64";
class Paths64 extends Array {
  constructor(...args) {
    var __super = (...args) => {
      super(...args);
      __publicField(this, "type");
    };
    const len = args.length;
    if (len === 0) {
      __super();
    } else if (typeof args[0] === "number") {
      __super(args[0]);
    } else {
      __super();
      for (const path of args) {
        this._push(path);
      }
    }
    this.type = Paths64TypeName;
  }
  static clone(paths) {
    const result = new Paths64();
    result.pushRange(paths);
    return result;
  }
  clear() {
    if (this.length !== 0) {
      for (const path of this) {
        path.clear();
      }
      this.length = 0;
    }
  }
  _push(path) {
    let clonedPath;
    if (isPath64(path)) {
      clonedPath = path.clone();
    } else {
      if ("length" in path && typeof path.length === "number" && path.length > 0) {
        clonedPath = new Path64TypedArray(path.length);
      } else {
        clonedPath = new Path64TypedArray();
      }
      for (const pt of path) {
        clonedPath.push(pt);
      }
    }
    super.push(clonedPath);
  }
  directPush(path) {
    super.push(path);
  }
  push(...paths) {
    for (const path of paths) {
      this._push(path);
    }
    return this.length;
  }
  pushRange(paths) {
    for (const path of paths) {
      this._push(path);
    }
    return this.length;
  }
}
const isPathsD = (obj) => {
  return isNotNullish(obj) && obj.type === PathsDTypeName;
};
const PathsDTypeName = "PathsD";
class PathsD extends Array {
  constructor(...args) {
    var __super = (...args) => {
      super(...args);
      __publicField(this, "type");
    };
    const len = args.length;
    if (len === 0) {
      __super();
    } else if (typeof args[0] === "number") {
      __super(args[0]);
    } else {
      __super();
      for (const path of args) {
        this._push(path);
      }
    }
    this.type = PathsDTypeName;
  }
  static clone(paths) {
    const result = new PathsD();
    result.pushRange(paths);
    return result;
  }
  clear() {
    if (this.length !== 0) {
      for (const path of this) {
        path.clear();
      }
      this.length = 0;
    }
  }
  _push(path) {
    let clonedPath;
    if (isPathD(path)) {
      clonedPath = path.clone();
    } else {
      if ("length" in path && typeof path.length === "number" && path.length > 0) {
        clonedPath = new PathDTypedArray(path.length);
      } else {
        clonedPath = new PathDTypedArray();
      }
      for (const pt of path) {
        clonedPath.push(pt);
      }
    }
    super.push(clonedPath);
  }
  directPush(path) {
    super.push(path);
  }
  push(...paths) {
    for (const path of paths) {
      this._push(path);
    }
    return this.length;
  }
  pushRange(paths) {
    for (const path of paths) {
      this._push(path);
    }
    return this.length;
  }
}
const isRect64 = (obj) => isNotNullish(obj) && obj.type === Rect64TypeName;
const Rect64TypeName = Symbol("Rect64");
class Rect64 {
  constructor(leftOrIsValidOrRec, top, right, bottom) {
    __publicField(this, "type");
    __publicField(this, "left");
    __publicField(this, "top");
    __publicField(this, "right");
    __publicField(this, "bottom");
    this.type = Rect64TypeName;
    if (leftOrIsValidOrRec === void 0) {
      this.left = 0n;
      this.top = 0n;
      this.right = 0n;
      this.bottom = 0n;
    } else if (typeof leftOrIsValidOrRec === "bigint" && typeof top === "bigint" && typeof right === "bigint" && typeof bottom === "bigint") {
      this.left = leftOrIsValidOrRec;
      this.top = top;
      this.right = right;
      this.bottom = bottom;
    } else if (typeof leftOrIsValidOrRec === "boolean") {
      if (leftOrIsValidOrRec) {
        this.left = 0n;
        this.top = 0n;
        this.right = 0n;
        this.bottom = 0n;
      } else {
        this.left = 9223372036854775807n;
        this.top = 9223372036854775807n;
        this.right = -9223372036854775808n;
        this.bottom = -9223372036854775808n;
      }
    } else if (isRect64(leftOrIsValidOrRec)) {
      this.left = leftOrIsValidOrRec.left;
      this.top = leftOrIsValidOrRec.top;
      this.right = leftOrIsValidOrRec.right;
      this.bottom = leftOrIsValidOrRec.bottom;
    } else {
      throw new TypeError("Invalid argument types.");
    }
  }
  get width() {
    return this.right - this.left;
  }
  set width(value) {
    this.right = this.left + value;
  }
  get height() {
    return this.bottom - this.top;
  }
  set height(value) {
    this.bottom = this.top + value;
  }
  midPoint() {
    return {
      x: (this.right + this.left) / 2n,
      y: (this.bottom + this.top) / 2n
    };
  }
  asPath() {
    return new Path64TypedArray(
      { x: this.left, y: this.top },
      { x: this.right, y: this.top },
      { x: this.right, y: this.bottom },
      { x: this.left, y: this.bottom }
    );
  }
  contains(ptOrRec) {
    if (isPoint64(ptOrRec)) {
      return ptOrRec.x > this.left && ptOrRec.x < this.right && ptOrRec.y > this.top && ptOrRec.y < this.bottom;
    } else if (isRect64(ptOrRec)) {
      return ptOrRec.left >= this.left && ptOrRec.right <= this.right && ptOrRec.top >= this.top && ptOrRec.bottom <= this.bottom;
    } else {
      throw new TypeError("Invalid argument types.");
    }
  }
  scale(scale) {
    this.top = numberToBigInt(Number(this.top) * scale);
    this.bottom = numberToBigInt(Number(this.bottom) * scale);
    this.left = numberToBigInt(Number(this.left) * scale);
    this.right = numberToBigInt(Number(this.right) * scale);
  }
  isEmpty() {
    return this.bottom <= this.top || this.right <= this.left;
  }
  intersects(rec) {
    return (this.left >= rec.left ? this.left : rec.left) <= (this.right <= rec.right ? this.right : rec.right) && (this.top >= rec.top ? this.top : rec.top) <= (this.bottom <= rec.bottom ? this.bottom : rec.bottom);
  }
}
const EmptyRect64 = new Rect64();
const isRectD = (obj) => isNotNullish(obj) && obj.type === RectDTypeName;
const RectDTypeName = Symbol("RectD");
class RectD {
  constructor(leftOrIsValidOrRec, top, right, bottom) {
    __publicField(this, "type");
    __publicField(this, "left");
    __publicField(this, "top");
    __publicField(this, "right");
    __publicField(this, "bottom");
    this.type = RectDTypeName;
    if (leftOrIsValidOrRec === void 0) {
      this.left = 0;
      this.top = 0;
      this.right = 0;
      this.bottom = 0;
    } else if (typeof leftOrIsValidOrRec === "number" && typeof top === "number" && typeof right === "number" && typeof bottom === "number") {
      this.left = leftOrIsValidOrRec;
      this.top = top;
      this.right = right;
      this.bottom = bottom;
    } else if (typeof leftOrIsValidOrRec === "boolean") {
      if (leftOrIsValidOrRec) {
        this.left = 0;
        this.top = 0;
        this.right = 0;
        this.bottom = 0;
      } else {
        this.left = Infinity;
        this.top = Infinity;
        this.right = -Infinity;
        this.bottom = -Infinity;
      }
    } else if (isRectD(leftOrIsValidOrRec)) {
      this.left = leftOrIsValidOrRec.left;
      this.top = leftOrIsValidOrRec.top;
      this.right = leftOrIsValidOrRec.right;
      this.bottom = leftOrIsValidOrRec.bottom;
    } else {
      throw new TypeError("Invalid argument types.");
    }
  }
  get width() {
    return this.right - this.left;
  }
  set width(value) {
    this.right = this.left + value;
  }
  get height() {
    return this.bottom - this.top;
  }
  set height(value) {
    this.bottom = this.top + value;
  }
  midPoint() {
    return { x: (this.right + this.left) / 2, y: (this.bottom + this.top) / 2 };
  }
  asPath() {
    return new PathD(
      { x: this.left, y: this.top },
      { x: this.right, y: this.top },
      { x: this.right, y: this.bottom },
      { x: this.left, y: this.bottom }
    );
  }
  contains(ptOrRec) {
    if (isPointD(ptOrRec)) {
      return ptOrRec.x > this.left && ptOrRec.x < this.right && ptOrRec.y > this.top && ptOrRec.y < this.bottom;
    } else if (isRectD(ptOrRec)) {
      return ptOrRec.left >= this.left && ptOrRec.right <= this.right && ptOrRec.top >= this.top && ptOrRec.bottom <= this.bottom;
    } else {
      throw new TypeError("Invalid argument types.");
    }
  }
  scale(scale) {
    this.top = this.top * scale;
    this.bottom = this.bottom * scale;
    this.left = this.left * scale;
    this.right = this.right * scale;
  }
  isEmpty() {
    return this.bottom <= this.top || this.right <= this.left;
  }
  intersects(rec) {
    return (this.left >= rec.left ? this.left : rec.left) <= (this.right >= rec.right ? this.right : rec.right) && (this.top >= rec.top ? this.top : rec.top) <= (this.bottom >= rec.bottom ? this.bottom : rec.bottom);
  }
}
const addPathsToVertexList = (paths, polytype, isOpen2, minimaList, vertexList) => {
  for (const path of paths) {
    let v0 = void 0;
    let prev_v = void 0;
    let curr_v;
    for (const originPt of path) {
      const pt = Point64.clone(originPt);
      if (v0 === void 0) {
        v0 = { pt, flags: VertexFlags.None };
        vertexList.push(v0);
        prev_v = v0;
      } else if (Point64.notEquals(prev_v.pt, pt)) {
        curr_v = { pt, flags: VertexFlags.None, prev: prev_v };
        vertexList.push(curr_v);
        prev_v.next = curr_v;
        prev_v = curr_v;
      }
    }
    if (prev_v === void 0 || prev_v?.prev === void 0) {
      continue;
    }
    if (!isOpen2 && Point64.equals(prev_v.pt, v0.pt)) {
      prev_v = prev_v.prev;
    }
    prev_v.next = v0;
    v0.prev = prev_v;
    if (!isOpen2 && prev_v.next === prev_v) {
      continue;
    }
    let going_up = false;
    if (isOpen2) {
      curr_v = v0.next;
      while (curr_v !== v0 && curr_v.pt.y === v0.pt.y) {
        curr_v = curr_v.next;
      }
      going_up = curr_v.pt.y <= v0.pt.y;
      if (going_up) {
        v0.flags = VertexFlags.OpenStart;
        addLocMin(v0, polytype, true, minimaList);
      } else {
        v0.flags = VertexFlags.OpenStart | VertexFlags.LocalMax;
      }
    } else {
      prev_v = v0.prev;
      while (prev_v !== v0 && prev_v.pt.y === v0.pt.y) {
        prev_v = prev_v.prev;
      }
      if (prev_v === v0) {
        continue;
      }
      going_up = prev_v.pt.y > v0.pt.y;
    }
    const going_up0 = going_up;
    prev_v = v0;
    curr_v = v0.next;
    while (curr_v !== v0) {
      if (curr_v.pt.y > prev_v.pt.y && going_up) {
        prev_v.flags |= VertexFlags.LocalMax;
        going_up = false;
      } else if (curr_v.pt.y < prev_v.pt.y && !going_up) {
        going_up = true;
        addLocMin(prev_v, polytype, isOpen2, minimaList);
      }
      prev_v = curr_v;
      curr_v = curr_v.next;
    }
    if (isOpen2) {
      prev_v.flags |= VertexFlags.OpenEnd;
      if (going_up) {
        prev_v.flags |= VertexFlags.LocalMax;
      } else {
        addLocMin(prev_v, polytype, isOpen2, minimaList);
      }
    } else if (going_up !== going_up0) {
      if (going_up0) {
        addLocMin(prev_v, polytype, false, minimaList);
      } else {
        prev_v.flags |= VertexFlags.LocalMax;
      }
    }
  }
};
const addLocMin = (vert, polyType, isOpen2, minimaList) => {
  if ((vert.flags & VertexFlags.LocalMin) !== VertexFlags.None)
    return;
  vert.flags |= VertexFlags.LocalMin;
  minimaList.push({ vertex: vert, polytype: polyType, isOpen: isOpen2 });
};
const HorzSegSorter = (hs1, hs2) => {
  if (hs1 === void 0 || hs2 === void 0) {
    return 0;
  } else if (hs1.rightOp === void 0) {
    return hs2.rightOp === void 0 ? 0 : 1;
  } else if (hs2.rightOp === void 0) {
    return -1;
  } else {
    return hs1.leftOp.pt.x === hs2.leftOp.pt.x ? 0 : hs1.leftOp.pt.x > hs2.leftOp.pt.x ? 1 : -1;
  }
};
const IntersectNodeSorter = (a, b) => {
  if (a.pt.y === b.pt.y) {
    if (a.pt.x === b.pt.x) {
      return 0;
    } else {
      return a.pt.x < b.pt.x ? -1 : 1;
    }
  }
  return a.pt.y > b.pt.y ? -1 : 1;
};
const locMinSorter = (locMin1, locMin2) => locMin2.vertex.pt.y === locMin1.vertex.pt.y ? 0 : locMin2.vertex.pt.y > locMin1.vertex.pt.y ? 1 : -1;
const isOdd = (val) => {
  return (val & 1) !== 0;
};
const isHotEdge = (ae) => {
  return ae.outrec !== void 0;
};
const isOpen = (ae) => {
  return ae.localMinIsOpen;
};
const isOpenEndVertex = (vertex) => {
  return (vertex.flags & (VertexFlags.OpenStart | VertexFlags.OpenEnd)) !== VertexFlags.None;
};
const isOpenEndActive = (ae) => {
  return ae.localMinIsOpen && (ae.vertexTop.flags & (VertexFlags.OpenStart | VertexFlags.OpenEnd)) !== VertexFlags.None;
};
const getPrevHotEdge = (ae) => {
  let prev = ae.prevInAEL;
  while (prev !== void 0 && (isOpen(prev) || !isHotEdge(prev))) {
    prev = prev.prevInAEL;
  }
  return prev;
};
const isFront = (ae) => {
  return ae === ae.outrec.frontEdge;
};
const getDx = (pt1, pt2) => {
  const dy = pt2.y - pt1.y;
  if (dy !== 0n) {
    return Number(pt2.x - pt1.x) / Number(dy);
  } else if (pt2.x > pt1.x) {
    return -Infinity;
  }
  return Infinity;
};
const topX = (ae, currentY) => {
  if (currentY === ae.top.y || ae.top.x === ae.bot.x) {
    return ae.top.x;
  } else if (currentY === ae.bot.y) {
    return ae.bot.x;
  }
  return ae.bot.x + BigInt(roundToEven(ae.dx * Number(currentY - ae.bot.y)));
};
const isHorizontal$1 = (ae) => {
  return ae.top.y === ae.bot.y;
};
const isHeadingRightHorz = (ae) => {
  return ae.dx === -Infinity;
};
const isHeadingLeftHorz = (ae) => {
  return ae.dx === Infinity;
};
const getPolyType = (ae) => {
  return ae.localMinPolytype;
};
const isSamePolyType = (ae1, ae2) => {
  return ae1.localMinPolytype === ae2.localMinPolytype;
};
const setDx = (ae) => {
  ae.dx = getDx(ae.bot, ae.top);
};
const nextVertex = (ae) => {
  return ae.windDx > 0 ? ae.vertexTop.next : ae.vertexTop.prev;
};
const prevPrevVertex = (ae) => {
  return ae.windDx > 0 ? ae.vertexTop.prev.prev : ae.vertexTop.next.next;
};
const isMaximaVertex = (vertex) => {
  return (vertex.flags & VertexFlags.LocalMax) !== VertexFlags.None;
};
const isMaximaActive = (ae) => {
  return (ae.vertexTop.flags & VertexFlags.LocalMax) !== VertexFlags.None;
};
const getMaximaPair = (ae) => {
  let ae2 = ae.nextInAEL;
  while (ae2 !== void 0) {
    if (ae2.vertexTop === ae.vertexTop) {
      return ae2;
    }
    ae2 = ae2.nextInAEL;
  }
  return void 0;
};
const getCurrYMaximaVertex_Open = (ae) => {
  let result = ae.vertexTop;
  if (ae.windDx > 0) {
    while (result.next.pt.y === result.pt.y && (result.flags & (VertexFlags.OpenEnd | VertexFlags.LocalMax)) === VertexFlags.None) {
      result = result.next;
    }
  } else {
    while (result.prev.pt.y === result.pt.y && (result.flags & (VertexFlags.OpenEnd | VertexFlags.LocalMax)) === VertexFlags.None) {
      result = result.prev;
    }
  }
  if (!isMaximaVertex(result)) {
    result = void 0;
  }
  return result;
};
const getCurrYMaximaVertex = (ae) => {
  let result = ae.vertexTop;
  if (ae.windDx > 0) {
    while (result.next.pt.y === result.pt.y) {
      result = result.next;
    }
  } else {
    while (result.prev.pt.y === result.pt.y) {
      result = result.prev;
    }
  }
  if (!isMaximaVertex(result)) {
    result = void 0;
  }
  return result;
};
const setSides = (outrec, startEdge, endEdge) => {
  outrec.frontEdge = startEdge;
  outrec.backEdge = endEdge;
};
const swapOutrecs = (ae1, ae2) => {
  const or1 = ae1.outrec;
  const or2 = ae2.outrec;
  if (or1 === or2) {
    const ae = or1.frontEdge;
    or1.frontEdge = or1.backEdge;
    or1.backEdge = ae;
    return;
  }
  if (or1 !== void 0) {
    if (ae1 === or1.frontEdge) {
      or1.frontEdge = ae2;
    } else {
      or1.backEdge = ae2;
    }
  }
  if (or2 !== void 0) {
    if (ae2 === or2.frontEdge) {
      or2.frontEdge = ae1;
    } else {
      or2.backEdge = ae1;
    }
  }
  ae1.outrec = or2;
  ae2.outrec = or1;
};
const setOwner = (outrec, newOwner) => {
  while (newOwner.owner !== void 0 && newOwner.owner.pts === void 0) {
    newOwner.owner = newOwner.owner.owner;
  }
  let tmp = newOwner;
  while (tmp !== void 0 && tmp !== outrec) {
    tmp = tmp.owner;
  }
  if (tmp !== void 0) {
    newOwner.owner = outrec.owner;
  }
  outrec.owner = newOwner;
};
const area$1 = (op) => {
  let area2 = 0n;
  let op2 = op;
  do {
    area2 += (op2.prev.pt.y + op2.pt.y) * (op2.prev.pt.x - op2.pt.x);
    op2 = op2.next;
  } while (op2 !== op);
  return Number(area2) * 0.5;
};
const areaTriangle = (pt1, pt2, pt3) => {
  return Number(
    (pt3.y + pt1.y) * (pt3.x - pt1.x) + (pt1.y + pt2.y) * (pt1.x - pt2.x) + (pt2.y + pt3.y) * (pt2.x - pt3.x)
  );
};
const getRealOutRec = (outrec) => {
  while (outrec !== void 0 && outrec.pts === void 0) {
    outrec = outrec.owner;
  }
  return outrec;
};
const isValidOwner = (outrec, testOwner) => {
  while (testOwner !== void 0 && testOwner !== outrec) {
    testOwner = testOwner.owner;
  }
  return testOwner === void 0;
};
const uncoupleOutRec = (ae) => {
  const outrec = ae.outrec;
  if (outrec === void 0) {
    return;
  }
  outrec.frontEdge.outrec = void 0;
  outrec.backEdge.outrec = void 0;
  outrec.frontEdge = void 0;
  outrec.backEdge = void 0;
};
const outrecIsAscending = (hotEdge) => {
  return hotEdge === hotEdge.outrec.frontEdge;
};
const swapFrontBackSides = (outrec) => {
  const ae2 = outrec.frontEdge;
  outrec.frontEdge = outrec.backEdge;
  outrec.backEdge = ae2;
  outrec.pts = outrec.pts.next;
};
const edgesAdjacentInAEL = (inode) => {
  return inode.edge1.nextInAEL === inode.edge2 || inode.edge1.prevInAEL === inode.edge2;
};
const resetHorzDirection = (horz, vertexMax) => {
  if (horz.bot.x === horz.top.x) {
    let ae = horz.nextInAEL;
    while (ae !== void 0 && ae.vertexTop !== vertexMax) {
      ae = ae.nextInAEL;
    }
    return {
      leftX: horz.curX,
      rightX: horz.curX,
      result: ae !== void 0
    };
  }
  if (horz.curX < horz.top.x) {
    return {
      leftX: horz.curX,
      rightX: horz.top.x,
      result: true
    };
  }
  return {
    leftX: horz.top.x,
    rightX: horz.curX,
    result: false
  };
};
const horzIsSpike = (horz) => {
  const nextPt = nextVertex(horz).pt;
  return horz.bot.x < horz.top.x !== horz.top.x < nextPt.x;
};
const trimHorz = (horzEdge, preserveCollinear) => {
  let wasTrimmed = false;
  let pt = nextVertex(horzEdge).pt;
  while (pt.y === horzEdge.top.y) {
    if (preserveCollinear && pt.x < horzEdge.top.x !== horzEdge.bot.x < horzEdge.top.x) {
      break;
    }
    horzEdge.vertexTop = nextVertex(horzEdge);
    horzEdge.top = Point64.clone(pt);
    wasTrimmed = true;
    if (isMaximaActive(horzEdge)) {
      break;
    }
    pt = nextVertex(horzEdge).pt;
  }
  if (wasTrimmed) {
    setDx(horzEdge);
  }
};
const isJoined = (e) => e.joinWith !== JoinWith.None;
const isValidAelOrder = (resident, newcomer) => {
  if (newcomer.curX !== resident.curX) {
    return newcomer.curX > resident.curX;
  }
  const d = crossProduct64(resident.top, newcomer.bot, newcomer.top);
  if (d !== 0n) {
    return d < 0n;
  }
  if (!isMaximaActive(resident) && resident.top.y > newcomer.top.y) {
    return crossProduct64(newcomer.bot, resident.top, nextVertex(resident).pt) <= 0;
  }
  if (!isMaximaActive(newcomer) && newcomer.top.y > resident.top.y) {
    return crossProduct64(newcomer.bot, newcomer.top, nextVertex(newcomer).pt) >= 0;
  }
  const y = newcomer.bot.y;
  const newcomerIsLeft = newcomer.isLeftBound;
  if (resident.bot.y !== y || resident.localMinVertex.pt.y !== y) {
    return newcomer.isLeftBound;
  }
  if (resident.isLeftBound !== newcomerIsLeft) {
    return newcomerIsLeft;
  }
  if (crossProduct64(prevPrevVertex(resident).pt, resident.bot, resident.top) === 0n) {
    return true;
  }
  return crossProduct64(
    prevPrevVertex(resident).pt,
    newcomer.bot,
    prevPrevVertex(newcomer).pt
  ) > 0 === newcomerIsLeft;
};
const insertRightEdge = (ae, ae2) => {
  ae2.nextInAEL = ae.nextInAEL;
  if (ae.nextInAEL !== void 0) {
    ae.nextInAEL.prevInAEL = ae2;
  }
  ae2.prevInAEL = ae;
  ae.nextInAEL = ae2;
};
const joinOutrecPaths = (ae1, ae2) => {
  const p1Start = ae1.outrec.pts;
  const p2Start = ae2.outrec.pts;
  const p1End = p1Start.next;
  const p2End = p2Start.next;
  if (isFront(ae1)) {
    p2End.prev = p1Start;
    p1Start.next = p2End;
    p2Start.next = p1End;
    p1End.prev = p2Start;
    ae1.outrec.pts = p2Start;
    ae1.outrec.frontEdge = ae2.outrec.frontEdge;
    if (ae1.outrec.frontEdge !== void 0) {
      ae1.outrec.frontEdge.outrec = ae1.outrec;
    }
  } else {
    p1End.prev = p2Start;
    p2Start.next = p1End;
    p1Start.next = p2End;
    p2End.prev = p1Start;
    ae1.outrec.backEdge = ae2.outrec.backEdge;
    if (ae1.outrec.backEdge !== void 0) {
      ae1.outrec.backEdge.outrec = ae1.outrec;
    }
  }
  ae2.outrec.frontEdge = void 0;
  ae2.outrec.backEdge = void 0;
  ae2.outrec.pts = void 0;
  setOwner(ae2.outrec, ae1.outrec);
  if (isOpenEndActive(ae1)) {
    ae2.outrec.pts = ae1.outrec.pts;
    ae1.outrec.pts = void 0;
  }
  ae1.outrec = void 0;
  ae2.outrec = void 0;
};
const addOutPt = (ae, pt) => {
  const outrec = ae.outrec;
  const toFront = isFront(ae);
  const opFront = outrec.pts;
  const opBack = opFront.next;
  if (toFront && Point64.equals(pt, opFront.pt)) {
    return opFront;
  } else if (!toFront && Point64.equals(pt, opBack.pt)) {
    return opBack;
  }
  const newOp = {
    pt: Point64.clone(pt),
    outrec,
    prev: opFront,
    next: opBack
  };
  opBack.prev = newOp;
  opFront.next = newOp;
  if (toFront) {
    outrec.pts = newOp;
  }
  return newOp;
};
const findEdgeWithMatchingLocMin = (e) => {
  let result = e.nextInAEL;
  while (result !== void 0) {
    if (result.localMinVertex === e.localMinVertex) {
      return result;
    }
    if (!isHorizontal$1(result) && Point64.notEquals(e.bot, result.bot)) {
      break;
    }
    result = result.nextInAEL;
  }
  result = e.prevInAEL;
  while (result !== void 0) {
    if (result.localMinVertex === e.localMinVertex) {
      return result;
    }
    if (!isHorizontal$1(result) && Point64.notEquals(e.bot, result.bot)) {
      break;
    }
    result = result.prevInAEL;
  }
  return void 0;
};
const extractFromSEL = (ae) => {
  const res = ae.nextInSEL;
  if (res !== void 0) {
    res.prevInSEL = ae.prevInSEL;
  }
  ae.prevInSEL.nextInSEL = res;
  return res;
};
const insert1Before2InSEL = (ae1, ae2) => {
  ae1.prevInSEL = ae2.prevInSEL;
  if (ae1.prevInSEL !== void 0) {
    ae1.prevInSEL.nextInSEL = ae1;
  }
  ae1.nextInSEL = ae2;
  ae2.prevInSEL = ae1;
};
const fixOutRecPts = (outrec) => {
  let op = outrec.pts;
  do {
    op.outrec = outrec;
    op = op.next;
  } while (op !== outrec.pts);
};
const setHorzSegHeadingForward = (hs, opP, opN) => {
  if (opP.pt.x === opN.pt.x) {
    return false;
  }
  if (opP.pt.x < opN.pt.x) {
    hs.leftOp = opP;
    hs.rightOp = opN;
    hs.leftToRight = true;
  } else {
    hs.leftOp = opN;
    hs.rightOp = opP;
    hs.leftToRight = false;
  }
  return true;
};
const updateHorzSegment = (hs) => {
  const op = hs.leftOp;
  const outrec = getRealOutRec(op.outrec);
  const outrecHasEdges = outrec.frontEdge !== void 0;
  const curr_y = op.pt.y;
  let opP = op;
  let opN = op;
  if (outrecHasEdges) {
    const opA = outrec.pts;
    const opZ = opA.next;
    while (opP !== opZ && opP.prev.pt.y === curr_y) {
      opP = opP.prev;
    }
    while (opN !== opA && opN.next.pt.y === curr_y) {
      opN = opN.next;
    }
  } else {
    while (opP.prev !== opN && opP.prev.pt.y === curr_y) {
      opP = opP.prev;
    }
    while (opN.next !== opP && opN.next.pt.y === curr_y) {
      opN = opN.next;
    }
  }
  const result = setHorzSegHeadingForward(hs, opP, opN) && hs.leftOp.horz === void 0;
  if (result) {
    hs.leftOp.horz = hs;
  } else {
    hs.rightOp = void 0;
  }
  return result;
};
const duplicateOp = (op, insert_after) => {
  const result = {
    pt: Point64.clone(op.pt),
    outrec: op.outrec
  };
  if (insert_after) {
    result.next = op.next;
    result.next.prev = result;
    result.prev = op;
    op.next = result;
  } else {
    result.prev = op.prev;
    result.prev.next = result;
    result.next = op;
    op.prev = result;
  }
  return result;
};
const getCleanPath = (op) => {
  const result = new Path64TypedArray();
  let op2 = op;
  while (op2.next !== op && (op2.pt.x === op2.next.pt.x && op2.pt.x === op2.prev.pt.x || op2.pt.y === op2.next.pt.y && op2.pt.y === op2.prev.pt.y)) {
    op2 = op2.next;
  }
  result.push(op2.pt);
  let prevOp = op2;
  op2 = op2.next;
  while (op2 !== op) {
    if ((op2.pt.x !== op2.next.pt.x || op2.pt.x !== prevOp.pt.x) && (op2.pt.y !== op2.next.pt.y || op2.pt.y !== prevOp.pt.y)) {
      result.push(op2.pt);
      prevOp = op2;
    }
    op2 = op2.next;
  }
  return result;
};
const pointInOpPolygon = (pt, op) => {
  if (op === op.next || op.prev === op.next) {
    return PointInPolygonResult.IsOutside;
  }
  let op2 = op;
  do {
    if (op.pt.y !== pt.y) {
      break;
    }
    op = op.next;
  } while (op !== op2);
  if (op.pt.y === pt.y) {
    return PointInPolygonResult.IsOutside;
  }
  let isAbove = op.pt.y < pt.y;
  const startingAbove = isAbove;
  let val = false;
  op2 = op.next;
  while (op2 !== op) {
    if (isAbove) {
      while (op2 !== op && op2.pt.y < pt.y) {
        op2 = op2.next;
      }
    } else {
      while (op2 !== op && op2.pt.y > pt.y) {
        op2 = op2.next;
      }
    }
    if (op2 === op) {
      break;
    }
    if (op2.pt.y === pt.y) {
      if (op2.pt.x === pt.x || op2.pt.y === op2.prev.pt.y && pt.x < op2.prev.pt.x !== pt.x < op2.pt.x) {
        return PointInPolygonResult.IsOn;
      }
      op2 = op2.next;
      if (op2 === op) {
        break;
      }
      continue;
    }
    if (op2.pt.x <= pt.x || op2.prev.pt.x <= pt.x) {
      if (op2.prev.pt.x < pt.x && op2.pt.x < pt.x) {
        val = !val;
      } else {
        const d = crossProduct64(op2.prev.pt, op2.pt, pt);
        if (d === 0n) {
          return PointInPolygonResult.IsOn;
        }
        if (d < 0n === isAbove) {
          val = !val;
        }
      }
    }
    isAbove = !isAbove;
    op2 = op2.next;
  }
  if (isAbove !== startingAbove) {
    const d = crossProduct64(op2.prev.pt, op2.pt, pt);
    if (d === 0n) {
      return PointInPolygonResult.IsOn;
    }
    if (d < 0n === isAbove) {
      val = !val;
    }
  }
  if (val) {
    return PointInPolygonResult.IsInside;
  } else {
    return PointInPolygonResult.IsOutside;
  }
};
const path1InsidePath2 = (op1, op2) => {
  let result;
  let outsize_cnt = 0;
  let op = op1;
  do {
    result = pointInOpPolygon(op.pt, op2);
    if (result === PointInPolygonResult.IsOutside) {
      outsize_cnt++;
    } else if (result === PointInPolygonResult.IsInside) {
      outsize_cnt--;
    }
    op = op.next;
  } while (op !== op1 && Math.abs(outsize_cnt) < 2);
  if (Math.abs(outsize_cnt) > 1) {
    return outsize_cnt < 0;
  }
  const mp = getBounds$1(getCleanPath(op1)).midPoint();
  const path2 = getCleanPath(op2);
  return pointInPolygon$1(mp, path2) !== PointInPolygonResult.IsOutside;
};
const ptsReallyClose = (pt1, pt2) => bigintAbs(pt1.x - pt2.x) < 2n && bigintAbs(pt1.y - pt2.y) < 2n;
const isVerySmallTriangle = (op) => op.next.next === op.prev && (ptsReallyClose(op.prev.pt, op.next.pt) || ptsReallyClose(op.pt, op.next.pt) || ptsReallyClose(op.pt, op.prev.pt));
const isValidClosedPath = (op) => op !== void 0 && op.next !== op && (op.next !== op.prev || !isVerySmallTriangle(op));
const disposeOutPt = (op) => {
  const result = op.next === op ? void 0 : op.next;
  op.prev.next = op.next;
  op.next.prev = op.prev;
  return result;
};
const buildPath = (op, reverse, isOpen2, path) => {
  if (op === void 0 || op.next === op || !isOpen2 && op.next === op.prev) {
    return false;
  }
  path.clear();
  if (reverse) {
    let lastPt = op.pt;
    let op2 = op.prev;
    path.push(lastPt);
    while (op2 !== op) {
      if (Point64.notEquals(op2.pt, lastPt)) {
        lastPt = op2.pt;
        path.push(lastPt);
      }
      op2 = op2.prev;
    }
  } else {
    op = op.next;
    let lastPt = op.pt;
    let op2 = op.next;
    path.push(lastPt);
    while (op2 !== op) {
      if (Point64.notEquals(op2.pt, lastPt)) {
        lastPt = op2.pt;
        path.push(lastPt);
      }
      op2 = op2.next;
    }
  }
  return !(path.length === 3 && isVerySmallTriangle(op));
};
const getBounds$1 = (path) => {
  if (path.length === 0) {
    return new Rect64();
  }
  const result = new Rect64(false);
  for (let i = 0, len = path.length; i < len; i++) {
    if (path.getX(i) < result.left) {
      result.left = path.getX(i);
    }
    if (path.getX(i) > result.right) {
      result.right = path.getX(i);
    }
    if (path.getY(i) < result.top) {
      result.top = path.getY(i);
    }
    if (path.getY(i) > result.bottom) {
      result.bottom = path.getY(i);
    }
  }
  return result;
};
class ClipperBase {
  constructor() {
    __publicField(this, "_cliptype");
    __publicField(this, "_fillrule");
    __publicField(this, "_actives");
    __publicField(this, "_sel");
    __publicField(this, "_minimaList");
    __publicField(this, "_intersectList");
    __publicField(this, "_vertexList");
    __publicField(this, "_outrecList");
    __publicField(this, "_scanlineList");
    __publicField(this, "_horzSegList");
    __publicField(this, "_horzJoinList");
    __publicField(this, "_currentLocMin");
    __publicField(this, "_currentBotY");
    __publicField(this, "_isSortedMinimaList");
    __publicField(this, "_hasOpenPaths");
    __publicField(this, "_using_polytree");
    __publicField(this, "_succeeded");
    __publicField(this, "preserveCollinear");
    __publicField(this, "reverseSolution");
    this._cliptype = ClipType.None;
    this._fillrule = FillRule.EvenOdd;
    this._minimaList = [];
    this._intersectList = [];
    this._vertexList = [];
    this._outrecList = [];
    this._scanlineList = [];
    this._horzSegList = [];
    this._horzJoinList = [];
    this._currentLocMin = 0;
    this._currentBotY = 0n;
    this._isSortedMinimaList = false;
    this._hasOpenPaths = false;
    this._using_polytree = false;
    this._succeeded = false;
    this.preserveCollinear = true;
    this.reverseSolution = false;
  }
  clearSolutionOnly() {
    while (this._actives !== void 0) {
      this.deleteFromAEL(this._actives);
    }
    this._scanlineList = [];
    this.disposeIntersectNodes();
    this._outrecList = [];
    this._horzSegList = [];
    this._horzJoinList = [];
  }
  clear() {
    this.clearSolutionOnly();
    this._minimaList = [];
    this._vertexList = [];
    this._currentLocMin = 0;
    this._isSortedMinimaList = false;
    this._hasOpenPaths = false;
  }
  reset() {
    if (!this._isSortedMinimaList) {
      this._minimaList.sort(locMinSorter);
      this._isSortedMinimaList = true;
    }
    for (let i = this._minimaList.length - 1; i >= 0; i--) {
      this._scanlineList.push(this._minimaList[i].vertex.pt.y);
    }
    this._currentBotY = 0n;
    this._currentLocMin = 0;
    this._actives = void 0;
    this._sel = void 0;
    this._succeeded = true;
  }
  insertScanLine(y) {
    const index = this._scanlineList.findIndex((value) => y <= value);
    if (index === -1) {
      this._scanlineList.push(y);
    }
    this._scanlineList.splice(index, 0, y);
  }
  popScanline() {
    if (this._scanlineList.length < 1) {
      return { result: false, y: 0n };
    }
    const y = this._scanlineList.pop();
    while (this._scanlineList.length >= 1 && y === this._scanlineList[this._scanlineList.length - 1]) {
      this._scanlineList.pop();
    }
    return { result: true, y };
  }
  hasLocMinAtY(y) {
    return this._currentLocMin < this._minimaList.length && this._minimaList[this._currentLocMin].vertex.pt.y === y;
  }
  popLocalMinima() {
    return this._minimaList[this._currentLocMin++];
  }
  addSubject(path) {
    this.addPath(path, PathType.Subject);
  }
  addOpenSubject(path) {
    this.addPath(path, PathType.Subject, true);
  }
  addClip(path) {
    this.addPath(path, PathType.Clip);
  }
  addPath(path, polytype, isOpen2 = false) {
    const tmp = [path];
    this.addPaths(tmp, polytype, isOpen2);
  }
  addPaths(paths, polytype, isOpen2 = false) {
    if (isOpen2) {
      this._hasOpenPaths = true;
    }
    this._isSortedMinimaList = false;
    addPathsToVertexList(
      paths,
      polytype,
      isOpen2,
      this._minimaList,
      this._vertexList
    );
  }
  // addReuseableData()
  isContributingClosed(ae) {
    switch (this._fillrule) {
      case FillRule.Positive:
        if (ae.windCount !== 1) {
          return false;
        }
        break;
      case FillRule.Negative:
        if (ae.windCount !== -1) {
          return false;
        }
        break;
      case FillRule.NonZero:
        if (Math.abs(ae.windCount) !== 1) {
          return false;
        }
        break;
    }
    switch (this._cliptype) {
      case ClipType.Intersection:
        switch (this._fillrule) {
          case FillRule.Positive:
            return ae.windCount2 > 0;
          case FillRule.Negative:
            return ae.windCount2 < 0;
          default:
            return ae.windCount2 !== 0;
        }
      case ClipType.Union:
        switch (this._fillrule) {
          case FillRule.Positive:
            return ae.windCount2 <= 0;
          case FillRule.Negative:
            return ae.windCount2 >= 0;
          default:
            return ae.windCount2 === 0;
        }
      case ClipType.Difference: {
        let result;
        switch (this._fillrule) {
          case FillRule.Positive:
            result = ae.windCount2 <= 0;
            break;
          case FillRule.Negative:
            result = ae.windCount2 >= 0;
            break;
          default:
            result = ae.windCount2 === 0;
            break;
        }
        return getPolyType(ae) === PathType.Subject ? result : !result;
      }
      case ClipType.Xor:
        return true;
      default:
        return false;
    }
  }
  isContributingOpen(ae) {
    let isInSubj = false;
    let isInClip = false;
    switch (this._fillrule) {
      case FillRule.Positive:
        isInSubj = ae.windCount > 0;
        isInClip = ae.windCount2 > 0;
        break;
      case FillRule.Negative:
        isInSubj = ae.windCount < 0;
        isInClip = ae.windCount2 < 0;
        break;
      default:
        isInSubj = ae.windCount !== 0;
        isInClip = ae.windCount2 !== 0;
        break;
    }
    switch (this._cliptype) {
      case ClipType.Intersection:
        return isInClip;
      case ClipType.Union:
        return !isInSubj && !isInClip;
      default:
        return !isInClip;
    }
  }
  setWindCountForClosedPathEdge(ae) {
    let ae2 = ae.prevInAEL;
    const pt = getPolyType(ae);
    while (ae2 !== void 0 && (getPolyType(ae2) !== pt || isOpen(ae2))) {
      ae2 = ae2.prevInAEL;
    }
    if (ae2 === void 0) {
      ae.windCount = ae.windDx;
      ae2 = this._actives;
    } else if (this._fillrule === FillRule.EvenOdd) {
      ae.windCount = ae.windDx;
      ae.windCount2 = ae2.windCount2;
      ae2 = ae2.nextInAEL;
    } else {
      if (ae2.windCount * ae2.windDx < 0) {
        if (Math.abs(ae2.windCount) > 1) {
          if (ae2.windDx * ae.windDx < 0) {
            ae.windCount = ae2.windCount;
          } else {
            ae.windCount = ae2.windCount + ae.windDx;
          }
        } else {
          ae.windCount = isOpen(ae) ? 1 : ae.windDx;
        }
      } else {
        if (ae2.windDx * ae.windDx < 0) {
          ae.windCount = ae2.windCount;
        } else {
          ae.windCount = ae2.windCount + ae.windDx;
        }
      }
      ae.windCount2 = ae2.windCount2;
      ae2 = ae2.nextInAEL;
    }
    if (this._fillrule === FillRule.EvenOdd) {
      while (ae2 !== ae) {
        if (getPolyType(ae2) !== pt && !isOpen(ae2)) {
          ae.windCount2 = ae.windCount2 === 0 ? 1 : 0;
        }
        ae2 = ae2.nextInAEL;
      }
    } else {
      while (ae2 !== ae) {
        if (getPolyType(ae2) !== pt && !isOpen(ae2)) {
          ae.windCount2 += ae2.windDx;
        }
        ae2 = ae2.nextInAEL;
      }
    }
  }
  setWindCountForOpenPathEdge(ae) {
    let ae2 = this._actives;
    if (this._fillrule === FillRule.EvenOdd) {
      let cnt1 = 0;
      let cnt2 = 0;
      while (ae2 !== ae) {
        if (getPolyType(ae2) === PathType.Clip) {
          cnt2++;
        } else if (!isOpen(ae2)) {
          cnt1++;
        }
        ae2 = ae2.nextInAEL;
      }
      ae.windCount = isOdd(cnt1) ? 1 : 0;
      ae.windCount2 = isOdd(cnt2) ? 1 : 0;
    } else {
      while (ae2 !== ae) {
        if (getPolyType(ae2) === PathType.Clip) {
          ae.windCount2 += ae2.windDx;
        } else if (!isOpen(ae2)) {
          ae.windCount += ae2.windDx;
        }
        ae2 = ae2.nextInAEL;
      }
    }
  }
  insertLeftEdge(ae) {
    if (this._actives === void 0) {
      ae.prevInAEL = void 0;
      ae.nextInAEL = void 0;
      this._actives = ae;
    } else if (!isValidAelOrder(this._actives, ae)) {
      ae.prevInAEL = void 0;
      ae.nextInAEL = this._actives;
      this._actives.prevInAEL = ae;
      this._actives = ae;
    } else {
      let ae2 = this._actives;
      while (ae2.nextInAEL !== void 0 && isValidAelOrder(ae2.nextInAEL, ae)) {
        ae2 = ae2.nextInAEL;
      }
      if (ae2.joinWith === JoinWith.Right) {
        ae2 = ae2.nextInAEL;
      }
      ae.nextInAEL = ae2.nextInAEL;
      if (ae2.nextInAEL !== void 0) {
        ae2.nextInAEL.prevInAEL = ae;
      }
      ae.prevInAEL = ae2;
      ae2.nextInAEL = ae;
    }
  }
  insertLocalMinimaIntoAEL(boty) {
    let localMinima;
    let leftBound;
    let rightBound;
    while (this.hasLocMinAtY(boty)) {
      localMinima = this.popLocalMinima();
      if ((localMinima.vertex.flags & VertexFlags.OpenStart) !== VertexFlags.None) {
        leftBound = void 0;
      } else {
        leftBound = {
          bot: Point64.clone(localMinima.vertex.pt),
          curX: localMinima.vertex.pt.x,
          windDx: -1,
          vertexTop: localMinima.vertex.prev,
          top: Point64.clone(localMinima.vertex.prev.pt),
          outrec: void 0,
          localMinVertex: localMinima.vertex,
          localMinPolytype: localMinima.polytype,
          localMinIsOpen: localMinima.isOpen,
          isLeftBound: false,
          dx: 0,
          windCount: 0,
          windCount2: 0,
          joinWith: JoinWith.None
        };
        setDx(leftBound);
      }
      if ((localMinima.vertex.flags & VertexFlags.OpenEnd) !== VertexFlags.None) {
        rightBound = void 0;
      } else {
        rightBound = {
          bot: Point64.clone(localMinima.vertex.pt),
          curX: localMinima.vertex.pt.x,
          windDx: 1,
          vertexTop: localMinima.vertex.next,
          top: Point64.clone(localMinima.vertex.next.pt),
          outrec: void 0,
          localMinVertex: localMinima.vertex,
          localMinPolytype: localMinima.polytype,
          localMinIsOpen: localMinima.isOpen,
          isLeftBound: false,
          dx: 0,
          windCount: 0,
          windCount2: 0,
          joinWith: JoinWith.None
        };
        setDx(rightBound);
      }
      if (leftBound === void 0) {
        leftBound = rightBound;
        rightBound = void 0;
      } else if (rightBound !== void 0) {
        if (isHorizontal$1(leftBound)) {
          if (isHeadingRightHorz(leftBound)) {
            [leftBound, rightBound] = [rightBound, leftBound];
          }
        } else if (isHorizontal$1(rightBound)) {
          if (isHeadingLeftHorz(rightBound)) {
            [leftBound, rightBound] = [rightBound, leftBound];
          }
        } else if (leftBound.dx < rightBound.dx) {
          [leftBound, rightBound] = [rightBound, leftBound];
        }
      }
      let contributing;
      leftBound.isLeftBound = true;
      this.insertLeftEdge(leftBound);
      if (isOpen(leftBound)) {
        this.setWindCountForOpenPathEdge(leftBound);
        contributing = this.isContributingOpen(leftBound);
      } else {
        this.setWindCountForClosedPathEdge(leftBound);
        contributing = this.isContributingClosed(leftBound);
      }
      if (rightBound !== void 0) {
        rightBound.windCount = leftBound.windCount;
        rightBound.windCount2 = leftBound.windCount2;
        insertRightEdge(leftBound, rightBound);
        if (contributing) {
          this.addLocalMinPoly(leftBound, rightBound, leftBound.bot, true);
          if (!isHorizontal$1(leftBound)) {
            this.checkJoinLeft(leftBound, leftBound.bot);
          }
        }
        while (rightBound.nextInAEL !== void 0 && isValidAelOrder(rightBound.nextInAEL, rightBound)) {
          this.intersectEdges(
            rightBound,
            rightBound.nextInAEL,
            rightBound.bot
          );
          this.swapPositionsInAEL(rightBound, rightBound.nextInAEL);
        }
        if (isHorizontal$1(rightBound)) {
          this.pushHorz(rightBound);
        } else {
          this.checkJoinRight(rightBound, rightBound.bot);
          this.insertScanLine(rightBound.top.y);
        }
      } else if (contributing) {
        this.startOpenPath(leftBound, leftBound.bot);
      }
      if (isHorizontal$1(leftBound)) {
        this.pushHorz(leftBound);
      } else {
        this.insertScanLine(leftBound.top.y);
      }
    }
  }
  pushHorz(ae) {
    ae.nextInSEL = this._sel;
    this._sel = ae;
  }
  popHorz() {
    const ae = this._sel;
    if (this._sel === void 0) {
      return { result: false, value: ae };
    }
    this._sel = this._sel.nextInSEL;
    return { result: true, value: ae };
  }
  addLocalMinPoly(ae1, ae2, pt, isNew = false) {
    const outrec = this.newOutRec();
    ae1.outrec = outrec;
    ae2.outrec = outrec;
    if (isOpen(ae1)) {
      outrec.owner = void 0;
      outrec.isOpen = true;
      if (ae1.windDx > 0) {
        setSides(outrec, ae1, ae2);
      } else {
        setSides(outrec, ae2, ae1);
      }
    } else {
      outrec.isOpen = false;
      const prevHotEdge = getPrevHotEdge(ae1);
      if (prevHotEdge !== void 0) {
        if (this._using_polytree) {
          setOwner(outrec, prevHotEdge.outrec);
        }
        outrec.owner = prevHotEdge.outrec;
        if (outrecIsAscending(prevHotEdge) === isNew) {
          setSides(outrec, ae2, ae1);
        } else {
          setSides(outrec, ae1, ae2);
        }
      } else {
        outrec.owner = void 0;
        if (isNew) {
          setSides(outrec, ae1, ae2);
        } else {
          setSides(outrec, ae2, ae1);
        }
      }
    }
    const op = {
      pt,
      outrec
    };
    op.next = op;
    op.prev = op;
    outrec.pts = op;
    return op;
  }
  addLocalMaxPoly(ae1, ae2, pt) {
    if (isJoined(ae1)) {
      this.split(ae1, pt);
    }
    if (isJoined(ae2)) {
      this.split(ae2, pt);
    }
    if (isFront(ae1) === isFront(ae2)) {
      if (isOpenEndActive(ae1)) {
        swapFrontBackSides(ae1.outrec);
      } else if (isOpenEndActive(ae2)) {
        swapFrontBackSides(ae2.outrec);
      } else {
        this._succeeded = false;
        return void 0;
      }
    }
    const result = addOutPt(ae1, pt);
    if (ae1.outrec === ae2.outrec) {
      const outrec = ae1.outrec;
      outrec.pts = result;
      if (this._using_polytree) {
        const e = getPrevHotEdge(ae1);
        if (e === void 0) {
          outrec.owner = void 0;
        } else {
          setOwner(outrec, e.outrec);
        }
      }
      uncoupleOutRec(ae1);
    } else if (isOpen(ae1)) {
      if (ae1.windDx < 0) {
        joinOutrecPaths(ae1, ae2);
      } else {
        joinOutrecPaths(ae2, ae1);
      }
    } else if (ae1.outrec.idx < ae2.outrec.idx) {
      joinOutrecPaths(ae1, ae2);
    } else {
      joinOutrecPaths(ae2, ae1);
    }
    return result;
  }
  newOutRec() {
    const result = {
      idx: this._outrecList.length,
      bounds: EmptyRect64,
      isOpen: false
    };
    this._outrecList.push(result);
    return result;
  }
  startOpenPath(ae, pt) {
    const outrec = this.newOutRec();
    outrec.isOpen = true;
    if (ae.windDx > 0) {
      outrec.frontEdge = ae;
      outrec.backEdge = void 0;
    } else {
      outrec.frontEdge = void 0;
      outrec.backEdge = ae;
    }
    ae.outrec = outrec;
    const op = { pt: Point64.clone(pt), outrec };
    op.next = op;
    op.prev = op;
    outrec.pts = op;
    return op;
  }
  updateEdgeIntoAEL(ae) {
    ae.bot = Point64.clone(ae.top);
    ae.vertexTop = nextVertex(ae);
    ae.top = Point64.clone(ae.vertexTop.pt);
    ae.curX = ae.bot.x;
    setDx(ae);
    if (isJoined(ae)) {
      this.split(ae, ae.bot);
    }
    if (isHorizontal$1(ae)) {
      return;
    }
    this.insertScanLine(ae.top.y);
    this.checkJoinLeft(ae, ae.bot);
    this.checkJoinRight(ae, ae.bot, true);
  }
  intersectEdges(ae1, ae2, pt) {
    let resultOp;
    if (this._hasOpenPaths && (isOpen(ae1) || isOpen(ae2))) {
      if (isOpen(ae1) && isOpen(ae2)) {
        return void 0;
      }
      if (isOpen(ae2)) {
        [ae1, ae2] = [ae2, ae1];
      }
      if (isJoined(ae2)) {
        this.split(ae2, pt);
      }
      if (this._cliptype === ClipType.Union) {
        if (!isHotEdge(ae2)) {
          return void 0;
        }
      } else if (ae2.localMinPolytype === PathType.Subject) {
        return void 0;
      }
      switch (this._fillrule) {
        case FillRule.Positive:
          if (ae2.windCount !== 1) {
            return void 0;
          }
          break;
        case FillRule.Negative:
          if (ae2.windCount !== -1) {
            return void 0;
          }
          break;
        default:
          if (Math.abs(ae2.windCount) !== 1) {
            return void 0;
          }
          break;
      }
      if (isHotEdge(ae1)) {
        resultOp = addOutPt(ae1, pt);
        if (isFront(ae1)) {
          ae1.outrec.frontEdge = void 0;
        } else {
          ae1.outrec.backEdge = void 0;
        }
        ae1.outrec = void 0;
      } else if (Point64.equals(pt, ae1.localMinVertex.pt) && !isOpenEndVertex(ae1.localMinVertex)) {
        const ae3 = findEdgeWithMatchingLocMin(ae1);
        if (ae3 !== void 0 && isHotEdge(ae3)) {
          ae1.outrec = ae3.outrec;
          if (ae1.windDx > 0) {
            setSides(ae3.outrec, ae1, ae3);
          } else {
            setSides(ae3.outrec, ae3, ae1);
          }
          return ae3.outrec.pts;
        }
        resultOp = this.startOpenPath(ae1, pt);
      } else {
        resultOp = this.startOpenPath(ae1, pt);
      }
      return resultOp;
    }
    if (isJoined(ae1)) {
      this.split(ae1, pt);
    }
    if (isJoined(ae2)) {
      this.split(ae2, pt);
    }
    let oldE1WindCount;
    let oldE2WindCount;
    if (ae1.localMinPolytype === ae2.localMinPolytype) {
      if (this._fillrule === FillRule.EvenOdd) {
        oldE1WindCount = ae1.windCount;
        ae1.windCount = ae2.windCount;
        ae2.windCount = oldE1WindCount;
      } else {
        if (ae1.windCount + ae2.windDx === 0) {
          ae1.windCount = -ae1.windCount;
        } else {
          ae1.windCount += ae2.windDx;
        }
        if (ae2.windCount - ae1.windDx === 0) {
          ae2.windCount = -ae2.windCount;
        } else {
          ae2.windCount -= ae1.windDx;
        }
      }
    } else {
      if (this._fillrule !== FillRule.EvenOdd) {
        ae1.windCount2 += ae2.windDx;
      } else {
        ae1.windCount2 = ae1.windCount2 === 0 ? 1 : 0;
      }
      if (this._fillrule !== FillRule.EvenOdd) {
        ae2.windCount2 -= ae1.windDx;
      } else {
        ae2.windCount2 = ae2.windCount2 === 0 ? 1 : 0;
      }
    }
    switch (this._fillrule) {
      case FillRule.Positive:
        oldE1WindCount = ae1.windCount;
        oldE2WindCount = ae2.windCount;
        break;
      case FillRule.Negative:
        oldE1WindCount = -ae1.windCount;
        oldE2WindCount = -ae2.windCount;
        break;
      default:
        oldE1WindCount = Math.abs(ae1.windCount);
        oldE2WindCount = Math.abs(ae2.windCount);
        break;
    }
    const e1WindCountIs0or1 = oldE1WindCount === 0 || oldE1WindCount === 1;
    const e2WindCountIs0or1 = oldE2WindCount === 0 || oldE2WindCount === 1;
    if (!isHotEdge(ae1) && !e1WindCountIs0or1 || !isHotEdge(ae2) && !e2WindCountIs0or1) {
      return void 0;
    }
    if (isHotEdge(ae1) && isHotEdge(ae2)) {
      if (oldE1WindCount !== 0 && oldE1WindCount !== 1 || oldE2WindCount !== 0 && oldE2WindCount !== 1 || ae1.localMinPolytype !== ae2.localMinPolytype && this._cliptype !== ClipType.Xor) {
        resultOp = this.addLocalMaxPoly(ae1, ae2, pt);
      } else if (isFront(ae1) || ae1.outrec === ae2.outrec) {
        resultOp = this.addLocalMaxPoly(ae1, ae2, pt);
        this.addLocalMinPoly(ae1, ae2, pt);
      } else {
        resultOp = addOutPt(ae1, pt);
        addOutPt(ae2, pt);
        swapOutrecs(ae1, ae2);
      }
    } else if (isHotEdge(ae1)) {
      resultOp = addOutPt(ae1, pt);
      swapOutrecs(ae1, ae2);
    } else if (isHotEdge(ae2)) {
      resultOp = addOutPt(ae2, pt);
      swapOutrecs(ae1, ae2);
    } else {
      let e1Wc2;
      let e2Wc2;
      switch (this._fillrule) {
        case FillRule.Positive:
          e1Wc2 = ae1.windCount2;
          e2Wc2 = ae2.windCount2;
          break;
        case FillRule.Negative:
          e1Wc2 = -ae1.windCount2;
          e2Wc2 = -ae2.windCount2;
          break;
        default:
          e1Wc2 = Math.abs(ae1.windCount2);
          e2Wc2 = Math.abs(ae2.windCount2);
          break;
      }
      if (!isSamePolyType(ae1, ae2)) {
        resultOp = this.addLocalMinPoly(ae1, ae2, pt);
      } else if (oldE1WindCount === 1 && oldE2WindCount === 1) {
        resultOp = void 0;
        switch (this._cliptype) {
          case ClipType.Union:
            if (e1Wc2 > 0 && e2Wc2 > 0) {
              return void 0;
            }
            resultOp = this.addLocalMinPoly(ae1, ae2, pt);
            break;
          case ClipType.Difference:
            if (getPolyType(ae1) === PathType.Clip && e1Wc2 > 0 && e2Wc2 > 0 || getPolyType(ae1) === PathType.Subject && e1Wc2 <= 0 && e2Wc2 <= 0) {
              resultOp = this.addLocalMinPoly(ae1, ae2, pt);
            }
            break;
          case ClipType.Xor:
            resultOp = this.addLocalMinPoly(ae1, ae2, pt);
            break;
          default:
            if (e1Wc2 <= 0 || e2Wc2 <= 0) {
              return void 0;
            }
            resultOp = this.addLocalMinPoly(ae1, ae2, pt);
            break;
        }
      }
    }
    return resultOp;
  }
  deleteFromAEL(ae) {
    const prev = ae.prevInAEL;
    const next = ae.nextInAEL;
    if (prev === void 0 && next === void 0 && ae !== this._actives) {
      return;
    }
    if (prev !== void 0) {
      prev.nextInAEL = next;
    } else {
      this._actives = next;
    }
    if (next !== void 0) {
      next.prevInAEL = prev;
    }
  }
  adjustCurrXAndCopyToSEL(topY) {
    let ae = this._actives;
    this._sel = ae;
    while (ae !== void 0) {
      ae.prevInSEL = ae.prevInAEL;
      ae.nextInSEL = ae.nextInAEL;
      ae.jump = ae.nextInSEL;
      if (ae.joinWith === JoinWith.Left) {
        ae.curX = ae.prevInAEL.curX;
      } else {
        ae.curX = topX(ae, topY);
      }
      ae = ae.nextInAEL;
    }
  }
  executeInternal(ct, fillRule) {
    if (ct === ClipType.None) {
      return;
    }
    this._fillrule = fillRule;
    this._cliptype = ct;
    this.reset();
    let y;
    if (!({ y } = this.popScanline()).result) {
      return;
    }
    while (this._succeeded) {
      this.insertLocalMinimaIntoAEL(y);
      let ae;
      while (({ value: ae } = this.popHorz()).result) {
        this.doHorizontal(ae);
      }
      if (this._horzSegList.length > 0) {
        this.convertHorzSegsToJoins();
        this._horzSegList = [];
      }
      this._currentBotY = y;
      if (!({ y } = this.popScanline()).result) {
        break;
      }
      this.doIntersections(y);
      this.doTopOfScanbeam(y);
      while (({ value: ae } = this.popHorz()).result) {
        this.doHorizontal(ae);
      }
    }
    if (this._succeeded) {
      this.processHorzJoins();
    }
  }
  doIntersections(topY) {
    if (this.buildIntersectList(topY)) {
      this.processIntersectList();
      this.disposeIntersectNodes();
    }
  }
  disposeIntersectNodes() {
    this._intersectList = [];
  }
  addNewIntersectNode(ae1, ae2, topY) {
    let ip;
    if (!({ ip } = getIntersectPoint(ae1.bot, ae1.top, ae2.bot, ae2.top)).result) {
      ip = { x: ae1.curX, y: topY };
    }
    if (ip.y > this._currentBotY || ip.y < topY) {
      const absDx1 = Math.abs(ae1.dx);
      const absDx2 = Math.abs(ae2.dx);
      if (absDx1 > 100 && absDx2 > 100) {
        if (absDx1 > absDx2) {
          ip = getClosestPtOnSegment(ip, ae1.bot, ae1.top);
        } else {
          ip = getClosestPtOnSegment(ip, ae2.bot, ae2.top);
        }
      } else if (absDx1 > 100) {
        ip = getClosestPtOnSegment(ip, ae1.bot, ae1.top);
      } else if (absDx2 > 100) {
        ip = getClosestPtOnSegment(ip, ae2.bot, ae2.top);
      } else {
        if (ip.y < topY) {
          ip.y = topY;
        } else {
          ip.y = this._currentBotY;
        }
        if (absDx1 < absDx2) {
          ip.x = topX(ae1, ip.y);
        } else {
          ip.x = topX(ae2, ip.y);
        }
      }
    }
    const node = { pt: ip, edge1: ae1, edge2: ae2 };
    this._intersectList.push(node);
  }
  buildIntersectList(topY) {
    if (this._actives === void 0 || this._actives.nextInAEL === void 0) {
      return false;
    }
    this.adjustCurrXAndCopyToSEL(topY);
    let left = this._sel;
    while (left.jump !== void 0) {
      let prevBase = void 0;
      while (left !== void 0 && left.jump !== void 0) {
        let currBase = left;
        let right = left.jump;
        let lEnd = right;
        const rEnd = right.jump;
        left.jump = rEnd;
        while (left !== lEnd && right !== rEnd) {
          if (right.curX < left.curX) {
            let tmp = right.prevInSEL;
            while (true) {
              this.addNewIntersectNode(tmp, right, topY);
              if (tmp === left) {
                break;
              }
              tmp = tmp.prevInSEL;
            }
            tmp = right;
            right = extractFromSEL(tmp);
            lEnd = right;
            insert1Before2InSEL(tmp, left);
            if (left === currBase) {
              currBase = tmp;
              currBase.jump = rEnd;
              if (prevBase === void 0) {
                this._sel = currBase;
              } else {
                prevBase.jump = currBase;
              }
            }
          } else {
            left = left.nextInSEL;
          }
        }
        prevBase = currBase;
        left = rEnd;
      }
      left = this._sel;
    }
    return this._intersectList.length > 0;
  }
  processIntersectList() {
    this._intersectList.sort(IntersectNodeSorter);
    for (let i = 0; i < this._intersectList.length; ++i) {
      if (!edgesAdjacentInAEL(this._intersectList[i])) {
        let j = i + 1;
        while (!edgesAdjacentInAEL(this._intersectList[j])) {
          j++;
        }
        [this._intersectList[i], this._intersectList[j]] = [
          this._intersectList[j],
          this._intersectList[i]
        ];
      }
      const node = this._intersectList[i];
      this.intersectEdges(node.edge1, node.edge2, node.pt);
      this.swapPositionsInAEL(node.edge1, node.edge2);
      node.edge1.curX = node.pt.x;
      node.edge2.curX = node.pt.x;
      this.checkJoinLeft(node.edge2, node.pt, true);
      this.checkJoinRight(node.edge1, node.pt, true);
    }
  }
  swapPositionsInAEL(ae1, ae2) {
    const next = ae2.nextInAEL;
    if (next !== void 0) {
      next.prevInAEL = ae1;
    }
    const prev = ae1.prevInAEL;
    if (prev !== void 0) {
      prev.nextInAEL = ae2;
    }
    ae2.prevInAEL = prev;
    ae2.nextInAEL = ae1;
    ae1.prevInAEL = ae2;
    ae1.nextInAEL = next;
    if (ae2.prevInAEL === void 0) {
      this._actives = ae2;
    }
  }
  addToHorzSegList(op) {
    if (op.outrec.isOpen) {
      return;
    }
    this._horzSegList.push({ leftOp: op, leftToRight: true });
  }
  getLastOp(hotEdge) {
    const outrec = hotEdge.outrec;
    return hotEdge === outrec.frontEdge ? outrec.pts : outrec.pts.next;
  }
  doHorizontal(horz) {
    const horzIsOpen = isOpen(horz);
    const y = horz.bot.y;
    const vertex_max = horzIsOpen ? getCurrYMaximaVertex_Open(horz) : getCurrYMaximaVertex(horz);
    if (vertex_max !== void 0 && !horzIsOpen && vertex_max !== horz.vertexTop) {
      trimHorz(horz, this.preserveCollinear);
    }
    let {
      result: isLeftToRight,
      leftX,
      rightX
    } = resetHorzDirection(horz, vertex_max);
    if (isHotEdge(horz)) {
      const op = addOutPt(horz, { x: horz.curX, y });
      this.addToHorzSegList(op);
    }
    while (true) {
      let ae = isLeftToRight ? horz.nextInAEL : horz.prevInAEL;
      while (ae !== void 0) {
        if (ae.vertexTop === vertex_max) {
          if (isHotEdge(horz) && isJoined(ae)) {
            this.split(ae, ae.top);
          }
          if (isHotEdge(horz)) {
            while (horz.vertexTop !== vertex_max) {
              addOutPt(horz, horz.top);
              this.updateEdgeIntoAEL(horz);
            }
            if (isLeftToRight) {
              this.addLocalMaxPoly(horz, ae, horz.top);
            } else {
              this.addLocalMaxPoly(ae, horz, horz.top);
            }
          }
          this.deleteFromAEL(ae);
          this.deleteFromAEL(horz);
          return;
        }
        if (vertex_max !== horz.vertexTop || isOpenEndActive(horz)) {
          if (isLeftToRight && ae.curX > rightX || !isLeftToRight && ae.curX < leftX) {
            break;
          }
          if (ae.curX === horz.top.x && !isHorizontal$1(ae)) {
            const pt2 = nextVertex(horz).pt;
            if (isOpen(ae) && !isSamePolyType(ae, horz) && !isHotEdge(ae)) {
              if (isLeftToRight && topX(ae, pt2.y) > pt2.x || !isLeftToRight && topX(ae, pt2.y) < pt2.x) {
                break;
              }
            } else if (isLeftToRight && topX(ae, pt2.y) >= pt2.x || !isLeftToRight && topX(ae, pt2.y) <= pt2.x) {
              break;
            }
          }
        }
        const pt = { x: ae.curX, y };
        if (isLeftToRight) {
          this.intersectEdges(horz, ae, pt);
          this.swapPositionsInAEL(horz, ae);
          horz.curX = ae.curX;
          ae = horz.nextInAEL;
        } else {
          this.intersectEdges(ae, horz, pt);
          this.swapPositionsInAEL(ae, horz);
          horz.curX = ae.curX;
          ae = horz.prevInAEL;
        }
        if (isHotEdge(horz)) {
          this.addToHorzSegList(this.getLastOp(horz));
        }
      }
      if (horzIsOpen && isOpenEndActive(horz)) {
        if (isHotEdge(horz)) {
          addOutPt(horz, horz.top);
          if (isFront(horz)) {
            horz.outrec.frontEdge = void 0;
          } else {
            horz.outrec.backEdge = void 0;
          }
          horz.outrec = void 0;
        }
        this.deleteFromAEL(horz);
        return;
      } else if (nextVertex(horz).pt.y !== horz.top.y) {
        break;
      }
      if (isHotEdge(horz)) {
        addOutPt(horz, horz.top);
      }
      this.updateEdgeIntoAEL(horz);
      if (this.preserveCollinear && !horzIsOpen && horzIsSpike(horz)) {
        trimHorz(horz, true);
      }
      ({
        result: isLeftToRight,
        leftX,
        rightX
      } = resetHorzDirection(horz, vertex_max));
    }
    if (isHotEdge(horz)) {
      const op = addOutPt(horz, horz.top);
      this.addToHorzSegList(op);
    }
    this.updateEdgeIntoAEL(horz);
  }
  doTopOfScanbeam(y) {
    this._sel = void 0;
    let ae = this._actives;
    while (ae !== void 0) {
      if (ae.top.y === y) {
        ae.curX = ae.top.x;
        if (isMaximaActive(ae)) {
          ae = this.doMaxima(ae);
          continue;
        }
        if (isHotEdge(ae)) {
          addOutPt(ae, ae.top);
        }
        this.updateEdgeIntoAEL(ae);
        if (isHorizontal$1(ae)) {
          this.pushHorz(ae);
        }
      } else {
        ae.curX = topX(ae, y);
      }
      ae = ae.nextInAEL;
    }
  }
  doMaxima(ae) {
    const prevE = ae.prevInAEL;
    let nextE = ae.nextInAEL;
    if (isOpenEndActive(ae)) {
      if (isHotEdge(ae)) {
        addOutPt(ae, ae.top);
      }
      if (!isHorizontal$1(ae)) {
        if (isHotEdge(ae)) {
          if (isFront(ae)) {
            ae.outrec.frontEdge = void 0;
          } else {
            ae.outrec.backEdge = void 0;
          }
          ae.outrec = void 0;
        }
        this.deleteFromAEL(ae);
      }
      return nextE;
    }
    const maxPair = getMaximaPair(ae);
    if (maxPair === void 0) {
      return nextE;
    }
    if (isJoined(ae)) {
      this.split(ae, ae.top);
    }
    if (isJoined(maxPair)) {
      this.split(maxPair, maxPair.top);
    }
    while (nextE !== maxPair) {
      this.intersectEdges(ae, nextE, ae.top);
      this.swapPositionsInAEL(ae, nextE);
      nextE = ae.nextInAEL;
    }
    if (isOpen(ae)) {
      if (isHotEdge(ae)) {
        this.addLocalMaxPoly(ae, maxPair, ae.top);
      }
      this.deleteFromAEL(maxPair);
      this.deleteFromAEL(ae);
    } else {
      if (isHotEdge(ae)) {
        this.addLocalMaxPoly(ae, maxPair, ae.top);
      }
      this.deleteFromAEL(ae);
      this.deleteFromAEL(maxPair);
    }
    return prevE !== void 0 ? prevE.nextInAEL : this._actives;
  }
  split(e, currPt) {
    if (e.joinWith === JoinWith.Right) {
      e.joinWith = JoinWith.None;
      e.nextInAEL.joinWith = JoinWith.None;
      this.addLocalMinPoly(e, e.nextInAEL, currPt, true);
    } else {
      e.joinWith = JoinWith.None;
      e.prevInAEL.joinWith = JoinWith.None;
      this.addLocalMinPoly(e.prevInAEL, e, currPt, true);
    }
  }
  checkJoinLeft(e, pt, checkCurrX = false) {
    const prev = e.prevInAEL;
    if (prev === void 0 || isOpen(e) || isOpen(prev) || !isHotEdge(e) || !isHotEdge(prev)) {
      return;
    }
    if ((pt.y - e.top.y < 2n || pt.y - prev.top.y < 2n) && (e.bot.y > pt.y || prev.bot.y > pt.y)) {
      return;
    }
    if (checkCurrX) {
      if (perpendicDistFromLineSqrd64(pt, prev.bot, prev.top) > 0.25) {
        return;
      }
    } else if (e.curX !== prev.curX) {
      return;
    }
    if (crossProduct64(e.top, pt, prev.top) !== 0n) {
      return;
    }
    if (e.outrec.idx === prev.outrec.idx) {
      this.addLocalMaxPoly(prev, e, pt);
    } else if (e.outrec.idx < prev.outrec.idx) {
      joinOutrecPaths(e, prev);
    } else {
      joinOutrecPaths(prev, e);
    }
    prev.joinWith = JoinWith.Right;
    e.joinWith = JoinWith.Left;
  }
  checkJoinRight(e, pt, checkCurrX = false) {
    const next = e.nextInAEL;
    if (next === void 0 || isOpen(e) || !isHotEdge(e) || isJoined(e) || isOpen(next) || !isHotEdge(next)) {
      return;
    }
    if ((pt.y - e.top.y < 2n || pt.y - next.top.y < 2n) && (e.bot.y > pt.y || next.bot.y > pt.y)) {
      return;
    }
    if (checkCurrX) {
      if (perpendicDistFromLineSqrd64(pt, next.bot, next.top) > 0.25) {
        return;
      }
    } else if (e.curX !== next.curX) {
      return;
    }
    if (crossProduct64(e.top, pt, next.top) !== 0n) {
      return;
    }
    if (e.outrec.idx === next.outrec.idx) {
      this.addLocalMaxPoly(e, next, pt);
    } else if (e.outrec.idx < next.outrec.idx) {
      joinOutrecPaths(e, next);
    } else {
      joinOutrecPaths(next, e);
    }
    e.joinWith = JoinWith.Right;
    next.joinWith = JoinWith.Left;
  }
  convertHorzSegsToJoins() {
    let k = 0;
    for (const hs of this._horzSegList) {
      if (updateHorzSegment(hs)) {
        k++;
      }
    }
    if (k < 2) {
      return;
    }
    this._horzSegList.sort(HorzSegSorter);
    for (let i = 0; i < k - 1; i++) {
      const hs1 = this._horzSegList[i];
      for (let j = i + 1; j < k; j++) {
        const hs2 = this._horzSegList[j];
        if (hs2.leftToRight === hs1.leftToRight || hs2.leftOp.pt.x >= hs1.rightOp.pt.x || hs2.rightOp.pt.x <= hs1.leftOp.pt.x) {
          continue;
        }
        const curr_y = hs1.leftOp.pt.y;
        if (hs1.leftToRight) {
          while (hs1.leftOp.next.pt.y === curr_y && hs1.leftOp.next.pt.x <= hs2.leftOp.pt.x) {
            hs1.leftOp = hs1.leftOp.next;
          }
          while (hs2.leftOp.prev.pt.y === curr_y && hs2.leftOp.prev.pt.x <= hs1.leftOp.pt.x) {
            hs2.leftOp = hs2.leftOp.prev;
          }
          const join = {
            op1: duplicateOp(hs1.leftOp, true),
            op2: duplicateOp(hs2.leftOp, false)
          };
          this._horzJoinList.push(join);
        } else {
          while (hs1.leftOp.prev.pt.y === curr_y && hs1.leftOp.prev.pt.x <= hs2.leftOp.pt.x) {
            hs1.leftOp = hs1.leftOp.prev;
          }
          while (hs2.leftOp.next.pt.y === curr_y && hs2.leftOp.next.pt.x <= hs1.leftOp.pt.x) {
            hs2.leftOp = hs2.leftOp.next;
          }
          const join = {
            op1: duplicateOp(hs2.leftOp, true),
            op2: duplicateOp(hs1.leftOp, false)
          };
          this._horzJoinList.push(join);
        }
      }
    }
  }
  moveSplits(fromOr, toOr) {
    if (fromOr.splits === void 0) {
      return;
    }
    toOr.splits ?? (toOr.splits = []);
    for (const i of fromOr.splits) {
      toOr.splits.push(i);
    }
    fromOr.splits = void 0;
  }
  processHorzJoins() {
    for (const j of this._horzJoinList) {
      const or1 = getRealOutRec(j.op1.outrec);
      let or2 = getRealOutRec(j.op2.outrec);
      const op1b = j.op1.next;
      const op2b = j.op2.prev;
      j.op1.next = j.op2;
      j.op2.prev = j.op1;
      op1b.prev = op2b;
      op2b.next = op1b;
      if (or1 === or2) {
        or2 = this.newOutRec();
        or2.pts = op1b;
        fixOutRecPts(or2);
        if (or1.pts.outrec === or2) {
          or1.pts = j.op1;
          or1.pts.outrec = or1;
        }
        if (this._using_polytree) {
          if (path1InsidePath2(or1.pts, or2.pts)) {
            const tmp = or1.pts;
            or1.pts = or2.pts;
            or2.pts = tmp;
            fixOutRecPts(or1);
            fixOutRecPts(or2);
            or2.owner = or1;
          } else if (path1InsidePath2(or2.pts, or1.pts)) {
            or2.owner = or1;
          } else {
            or2.owner = or1.owner;
          }
          or1.splits ?? (or1.splits = []);
          or1.splits.push(or2.idx);
        } else {
          or2.owner = or1;
        }
      } else {
        or2.pts = void 0;
        if (this._using_polytree) {
          setOwner(or2, or1);
          this.moveSplits(or2, or1);
        } else {
          or2.owner = or1;
        }
      }
    }
  }
  cleanCollinear(outrec) {
    outrec = getRealOutRec(outrec);
    if (outrec === void 0 || outrec.isOpen) {
      return;
    }
    if (!isValidClosedPath(outrec.pts)) {
      outrec.pts = void 0;
      return;
    }
    let startOp = outrec.pts;
    let op2 = startOp;
    while (true) {
      if ((!this.preserveCollinear || Point64.equals(op2.pt, op2.prev.pt) || Point64.equals(op2.pt, op2.next.pt) || dotProduct64(op2.prev.pt, op2.pt, op2.next.pt) < 0n) && crossProduct64(op2.prev.pt, op2.pt, op2.next.pt) === 0n) {
        if (op2 === outrec.pts) {
          outrec.pts = op2.prev;
        }
        op2 = disposeOutPt(op2);
        if (!isValidClosedPath(op2)) {
          outrec.pts = void 0;
          return;
        }
        startOp = op2;
        continue;
      }
      op2 = op2.next;
      if (op2 === startOp) {
        break;
      }
    }
    this.fixSelfIntersects(outrec);
  }
  doSplitOp(outrec, splitOp) {
    const prevOp = splitOp.prev;
    const nextNextOp = splitOp.next.next;
    outrec.pts = prevOp;
    const { ip } = getIntersectPoint(
      prevOp.pt,
      splitOp.pt,
      splitOp.next.pt,
      nextNextOp.pt
    );
    const area1 = area$1(prevOp);
    const absArea1 = Math.abs(area1);
    if (absArea1 < 2) {
      outrec.pts = void 0;
      return;
    }
    const area2 = areaTriangle(ip, splitOp.pt, splitOp.next.pt);
    const absArea2 = Math.abs(area2);
    if (Point64.equals(ip, prevOp.pt) || Point64.equals(ip, nextNextOp.pt)) {
      nextNextOp.prev = prevOp;
      prevOp.next = nextNextOp;
    } else {
      const newOp2 = {
        pt: ip,
        outrec,
        prev: prevOp,
        next: nextNextOp
      };
      nextNextOp.prev = newOp2;
      prevOp.next = newOp2;
    }
    if (absArea2 > 1 && (absArea2 > absArea1 || area2 > 0 === area1 > 0)) {
      const newOutRec = this.newOutRec();
      newOutRec.owner = outrec.owner;
      splitOp.outrec = newOutRec;
      splitOp.next.outrec = newOutRec;
      const newOp = {
        pt: ip,
        outrec: newOutRec,
        prev: splitOp.next,
        next: splitOp
      };
      newOutRec.pts = newOp;
      splitOp.prev = newOp;
      splitOp.next.next = newOp;
      if (this._using_polytree) {
        if (path1InsidePath2(prevOp, newOp)) {
          newOutRec.splits ?? (newOutRec.splits = []);
          newOutRec.splits.push(outrec.idx);
        } else {
          outrec.splits ?? (outrec.splits = []);
          outrec.splits.push(newOutRec.idx);
        }
      }
    }
  }
  fixSelfIntersects(outrec) {
    let op2 = outrec.pts;
    while (true) {
      if (op2.prev === op2.next.next) {
        break;
      }
      if (segsIntersect(op2.prev.pt, op2.pt, op2.next.pt, op2.next.next.pt)) {
        this.doSplitOp(outrec, op2);
        if (outrec.pts === void 0) {
          return;
        }
        op2 = outrec.pts;
        continue;
      } else {
        op2 = op2.next;
      }
      if (op2 === outrec.pts) {
        break;
      }
    }
  }
  buildPaths(solutionClosed, solutionOpen) {
    solutionClosed.clear();
    solutionOpen?.clear();
    let i = 0;
    while (i < this._outrecList.length) {
      const outrec = this._outrecList[i++];
      if (outrec.pts === void 0) {
        continue;
      }
      const path = new Path64TypedArray();
      if (!outrec.isOpen) {
        this.cleanCollinear(outrec);
        if (buildPath(outrec.pts, this.reverseSolution, false, path)) {
          solutionClosed.directPush(path);
        }
      } else if (solutionOpen !== void 0) {
        if (buildPath(outrec.pts, this.reverseSolution, true, path)) {
          solutionOpen?.directPush(path);
        }
      }
    }
    return true;
  }
  checkBounds(outrec) {
    if (outrec.pts === void 0) {
      return false;
    }
    if (!outrec.bounds.isEmpty()) {
      return true;
    }
    this.cleanCollinear(outrec);
    if (outrec.pts === void 0) {
      return false;
    }
    outrec.path ?? (outrec.path = new Path64TypedArray());
    if (!buildPath(outrec.pts, this.reverseSolution, false, outrec.path)) {
      return false;
    }
    outrec.bounds = getBounds$1(outrec.path);
    return true;
  }
  checkSplitOwner(outrec, splits) {
    if (splits === void 0) {
      return false;
    }
    for (const i of splits) {
      const split = getRealOutRec(this._outrecList[i]);
      if (split === void 0 || split === outrec || split.recursiveSplit === outrec) {
        continue;
      }
      split.recursiveSplit = outrec;
      if (split.splits !== void 0 && this.checkSplitOwner(outrec, split.splits)) {
        return true;
      }
      if (isValidOwner(outrec, split) && this.checkBounds(split) && split.bounds.contains(outrec.bounds) && path1InsidePath2(outrec.pts, split.pts)) {
        outrec.owner = split;
        return true;
      }
    }
    return false;
  }
  recursiveCheckOwners(outrec, polypath) {
    if (outrec.polypath !== void 0 || outrec.bounds.isEmpty()) {
      return;
    }
    while (outrec.owner !== void 0) {
      if (outrec.owner.splits !== void 0 && this.checkSplitOwner(outrec, outrec.owner.splits)) {
        break;
      } else if (outrec.owner.pts !== void 0 && this.checkBounds(outrec.owner) && path1InsidePath2(outrec.pts, outrec.owner.pts)) {
        break;
      }
      outrec.owner = outrec.owner.owner;
    }
    if (outrec.owner !== void 0) {
      if (outrec.owner.polypath === void 0) {
        this.recursiveCheckOwners(outrec.owner, polypath);
      }
      outrec.polypath = outrec.owner.polypath.addChild(outrec.path);
    } else {
      outrec.polypath = polypath.addChild(outrec.path);
    }
  }
  buildTree(polytree, solutionOpen) {
    polytree.clear();
    solutionOpen?.clear();
    let i = 0;
    while (i < this._outrecList.length) {
      const outrec = this._outrecList[i++];
      if (outrec.pts === void 0) {
        continue;
      }
      if (outrec.isOpen) {
        if (solutionOpen !== void 0) {
          const open_path = new Path64TypedArray();
          if (buildPath(outrec.pts, this.reverseSolution, true, open_path)) {
            solutionOpen.directPush(open_path);
          }
        }
        continue;
      }
      if (this.checkBounds(outrec)) {
        this.recursiveCheckOwners(outrec, polytree);
      }
    }
  }
  getBounds() {
    const bounds = new Rect64(false);
    for (const t of this._vertexList) {
      let v = t;
      do {
        if (v.pt.x < bounds.left) {
          bounds.left = v.pt.x;
        }
        if (v.pt.x > bounds.right) {
          bounds.right = v.pt.x;
        }
        if (v.pt.y < bounds.top) {
          bounds.top = v.pt.y;
        }
        if (v.pt.y > bounds.bottom) {
          bounds.bottom = v.pt.y;
        }
        v = v.next;
      } while (v !== t);
    }
    return bounds.isEmpty() ? new Rect64() : bounds;
  }
}
class PolyPathBase {
  constructor(parent) {
    __publicField(this, "_parent");
    __publicField(this, "_childs");
    this._parent = parent;
    this._childs = [];
  }
  getLevel() {
    let result = 0;
    let pp = this._parent;
    while (pp !== void 0) {
      result++;
      pp = pp._parent;
    }
    return result;
  }
  getIsHole() {
    const lvl = this.getLevel();
    return lvl !== 0 && (lvl & 1) === 0;
  }
  get length() {
    return this._childs.length;
  }
  clear() {
    this._childs.length = 0;
  }
  /* @ts-ignore abstract method */
  addChild(_) {
  }
  *[Symbol.iterator]() {
    for (const child of this._childs) {
      yield child;
    }
  }
}
class PolyPath64 extends PolyPathBase {
  constructor() {
    super(...arguments);
    __publicField(this, "polygon");
  }
  addChild(p) {
    const newChild = new PolyPath64(this);
    newChild.polygon = p;
    this._childs.push(newChild);
    return newChild;
  }
  child(index) {
    if (index < 0 || index >= this._childs.length) {
      throw new RangeError("Invalid array length.");
    }
    return this._childs[index];
  }
  area() {
    let result = this.polygon === void 0 ? 0 : area(this.polygon);
    for (const polyPathBase of this._childs) {
      result += polyPathBase.area();
    }
    return result;
  }
}
class PolyTree64 extends PolyPath64 {
}
const isScalablePath = (obj) => isNotNullish(obj) && "asScaledPathD" in obj && typeof obj.asScaledPathD === "function" && "asScaledPath64" in obj && typeof obj.asScaledPath64 === "function";
class Path64Like {
  constructor(wrapedObject, scale) {
    __publicField(this, "_wrapedObject");
    __publicField(this, "_scale");
    this._wrapedObject = wrapedObject;
    this._scale = scale;
  }
  *[Symbol.iterator]() {
    for (const w1 of this._wrapedObject) {
      if (isPoint64(w1)) {
        yield Point64.clone(w1);
      } else {
        yield Point64.createScaledPoint(w1.x, w1.y, this._scale);
      }
    }
  }
}
class Paths64Like {
  constructor(wrapedObject, scale) {
    __publicField(this, "_wrapedObject");
    __publicField(this, "_scale");
    this._wrapedObject = wrapedObject;
    this._scale = scale;
  }
  get length() {
    return this._wrapedObject;
  }
  *[Symbol.iterator]() {
    if (isScalablePath(this._wrapedObject)) {
      yield this._wrapedObject.asScaledPath64(this._scale);
    } else {
      for (const w1 of this._wrapedObject) {
        if (isPoint64(w1)) {
          yield this._wrapedObject;
          break;
        } else if (isPointD(w1)) {
          yield new Path64Like(
            this._wrapedObject,
            this._scale
          );
          break;
        } else if (isScalablePath(w1)) {
          yield w1.asScaledPath64(this._scale);
        } else if (isPath64(w1)) {
          yield w1;
        } else {
          yield new Path64Like(w1, this._scale);
        }
      }
    }
  }
}
class Clipper64 extends ClipperBase {
  addPath(path, polytype, isOpen2 = false) {
    this.addPaths(path, polytype, isOpen2);
  }
  addPaths(paths, polytype, isOpen2 = false) {
    super.addPaths(new Paths64Like(paths, 1), polytype, isOpen2);
  }
  addSubject(pathOrPaths) {
    this.addPaths(pathOrPaths, PathType.Subject);
  }
  addOpenSubject(pathOrPaths) {
    this.addPaths(pathOrPaths, PathType.Subject, true);
  }
  addClip(pathOrPaths) {
    this.addPaths(pathOrPaths, PathType.Clip);
  }
  execute(clipType, fillRule, solutionClosedOrPolyTree, solutionOpenOrOpenPaths) {
    if (solutionClosedOrPolyTree instanceof PolyTree64) {
      solutionClosedOrPolyTree.clear();
      solutionOpenOrOpenPaths?.clear();
      this._using_polytree = true;
      this.executeInternal(clipType, fillRule);
      this.buildTree(solutionClosedOrPolyTree, solutionOpenOrOpenPaths);
    } else {
      solutionClosedOrPolyTree.clear();
      solutionOpenOrOpenPaths?.clear();
      this.executeInternal(clipType, fillRule);
      this.buildPaths(solutionClosedOrPolyTree, solutionOpenOrOpenPaths);
    }
    this.clearSolutionOnly();
    return this._succeeded;
  }
}
class PolyPathD extends PolyPathBase {
  constructor(parent) {
    super(parent);
    __publicField(this, "scale");
    __publicField(this, "polygon");
    this.scale = 0;
  }
  addChild(p) {
    const newChild = new PolyPathD(this);
    newChild.scale = this.scale;
    newChild.polygon = scalePathD(p, 1 / this.scale);
    this._childs.push(newChild);
    return newChild;
  }
  area() {
    let result = this.polygon === void 0 ? 0 : area(this.polygon);
    for (const polyPathBase of this._childs) {
      result += polyPathBase.area();
    }
    return result;
  }
}
class PolyTreeD extends PolyPathD {
}
class ClipperD extends ClipperBase {
  constructor(roundingDecimalPrecision = 2) {
    super();
    __publicField(this, "_scale");
    __publicField(this, "_invScale");
    checkPrecision(roundingDecimalPrecision);
    this._scale = Math.pow(10, roundingDecimalPrecision);
    this._invScale = 1 / this._scale;
  }
  addPath(path, polytype, isOpen2 = false) {
    this.addPaths(path, polytype, isOpen2);
  }
  addPaths(paths, polytype, isOpen2 = false) {
    super.addPaths(new Paths64Like(paths, this._scale), polytype, isOpen2);
  }
  addSubject(pathOrPaths) {
    this.addPaths(pathOrPaths, PathType.Subject);
  }
  addOpenSubject(pathOrPaths) {
    this.addPaths(pathOrPaths, PathType.Subject, true);
  }
  addClip(pathOrPaths) {
    this.addPaths(pathOrPaths, PathType.Clip);
  }
  execute(clipType, fillRule, solutionClosedOrPolyTree, solutionOpenOrOpenPaths) {
    if (solutionClosedOrPolyTree instanceof PolyTreeD) {
      solutionClosedOrPolyTree.clear();
      solutionOpenOrOpenPaths?.clear();
      this._using_polytree = true;
      solutionClosedOrPolyTree.scale = this._scale;
      const oPaths = new Paths64();
      this.executeInternal(clipType, fillRule);
      this.buildTree(solutionClosedOrPolyTree, oPaths);
      this.clearSolutionOnly();
      if (solutionOpenOrOpenPaths !== void 0) {
        for (const path of oPaths) {
          if (isScalablePath(path)) {
            solutionOpenOrOpenPaths.directPush(
              path.asScaledPathD(this._invScale)
            );
          } else {
            solutionOpenOrOpenPaths.directPush(
              scalePathD(path, this._invScale)
            );
          }
        }
      }
    } else {
      const solClosed64 = new Paths64();
      const solOpen64 = solutionOpenOrOpenPaths === void 0 ? void 0 : new Paths64();
      solutionClosedOrPolyTree.clear();
      solutionOpenOrOpenPaths?.clear();
      this.executeInternal(clipType, fillRule);
      this.buildPaths(solClosed64, solOpen64);
      this.clearSolutionOnly();
      for (const path of solClosed64) {
        if (isScalablePath(path)) {
          solutionClosedOrPolyTree.directPush(
            path.asScaledPathD(this._invScale)
          );
        } else {
          solutionClosedOrPolyTree.directPush(scalePathD(path, this._invScale));
        }
      }
      if (solOpen64 !== void 0 && solutionOpenOrOpenPaths !== void 0) {
        for (const path of solOpen64) {
          if (isScalablePath(path)) {
            solutionOpenOrOpenPaths.directPush(
              path.asScaledPathD(this._invScale)
            );
          } else {
            solutionOpenOrOpenPaths.directPush(
              scalePathD(path, this._invScale)
            );
          }
        }
      }
    }
    return true;
  }
}
const minkowskiInternal = (pattern, path, isSum, isClosed) => {
  const delta = isClosed ? 0 : 1;
  const patLen = pattern.length;
  const pathLen = path.length;
  const tmp = new Paths64();
  for (const pathPt of path) {
    const path2 = new Path64TypedArray();
    if (isSum) {
      for (const basePt of pattern) {
        path2.push({ x: pathPt.x + basePt.x, y: pathPt.y + basePt.y });
      }
    } else {
      for (const basePt of pattern) {
        path2.push({ x: pathPt.x - basePt.x, y: pathPt.y - basePt.y });
      }
    }
    tmp.push(path2);
  }
  const result = new Paths64();
  let g = isClosed ? pathLen - 1 : 0;
  let h = patLen - 1;
  for (let i = delta; i < pathLen; i++) {
    for (let j = 0; j < patLen; j++) {
      const quad = new Path64TypedArray();
      quad.pushRange([
        tmp[g].getClone(h),
        tmp[i].getClone(h),
        tmp[i].getClone(j),
        tmp[g].getClone(j)
      ]);
      if (!isPositive(quad)) {
        result.push(reversePath(quad));
      } else {
        result.push(quad);
      }
      h = j;
    }
    g = i;
  }
  return result;
};
function sum(pattern, path, isClosed, decimalPlaces = 2) {
  if (isPath64(pattern) && isPath64(path)) {
    return union(
      minkowskiInternal(pattern, path, true, isClosed),
      FillRule.NonZero
    );
  } else if (isPathD(pattern) && isPathD(path)) {
    const scale = Math.pow(10, decimalPlaces);
    const tmp = union(
      minkowskiInternal(
        scalePath64(pattern, scale),
        scalePath64(path, scale),
        true,
        isClosed
      ),
      FillRule.NonZero
    );
    return scalePathsD(tmp, 1 / scale);
  }
  throw new TypeError("Invalid argument types.");
}
function diff(pattern, path, isClosed, decimalPlaces = 2) {
  if (isPath64(pattern) && isPath64(path)) {
    return union(
      minkowskiInternal(pattern, path, false, isClosed),
      FillRule.NonZero
    );
  } else if (isPathD(pattern) && isPathD(path)) {
    const scale = Math.pow(10, decimalPlaces);
    const tmp = union(
      minkowskiInternal(
        scalePath64(pattern, scale),
        scalePath64(path, scale),
        false,
        isClosed
      ),
      FillRule.NonZero
    );
    return scalePathsD(tmp, 1 / scale);
  }
  throw new TypeError("Invalid argument types.");
}
const Minkowski = {
  sum,
  diff
};
const JoinType = {
  Square: 0,
  Round: 1,
  Miter: 2,
  Bevel: 3
};
const EndType = {
  Polygon: 0,
  Joined: 1,
  Butt: 2,
  Square: 3,
  Round: 4
};
class ClipperGroup {
  constructor(paths, joinType, endType = EndType.Polygon) {
    __publicField(this, "inPaths");
    __publicField(this, "outPath");
    __publicField(this, "outPaths");
    __publicField(this, "joinType");
    __publicField(this, "endType");
    __publicField(this, "pathsReversed");
    this.inPaths = Paths64.clone(paths);
    this.joinType = joinType;
    this.endType = endType;
    this.outPath = new Path64TypedArray();
    this.outPaths = new Paths64();
    this.pathsReversed = false;
  }
}
const tolerance = 1e-12;
class ClipperOffset {
  constructor(miterLimit = 2, arcTolerance = 0, preserveCollinear = false, reverseSolution = false) {
    __publicField(this, "_groupList");
    __publicField(this, "_normals");
    __publicField(this, "_solution");
    __publicField(this, "_groupDelta");
    __publicField(this, "_delta");
    __publicField(this, "_mitLimSqr");
    __publicField(this, "_stepsPerRad");
    __publicField(this, "_stepSin");
    __publicField(this, "_stepCos");
    __publicField(this, "_joinType");
    __publicField(this, "_endType");
    __publicField(this, "arcTolerance");
    __publicField(this, "mergeGroups");
    __publicField(this, "miterLimit");
    __publicField(this, "preserveCollinear");
    __publicField(this, "reverseSolution");
    __publicField(this, "deltaCallback");
    this.miterLimit = miterLimit;
    this.arcTolerance = arcTolerance;
    this.mergeGroups = true;
    this.preserveCollinear = preserveCollinear;
    this.reverseSolution = reverseSolution;
    this._groupList = [];
    this._normals = new PathDTypedArray();
    this._solution = new Paths64();
    this._groupDelta = 0;
    this._delta = 0;
    this._mitLimSqr = 0;
    this._stepsPerRad = 0;
    this._stepSin = 0;
    this._stepCos = 0;
    this._joinType = JoinType.Bevel;
    this._endType = EndType.Polygon;
  }
  clear() {
    this._groupList.length = 0;
  }
  addPath(path, joinType, endType) {
    const cnt = path.length;
    if (cnt === 0) {
      return;
    }
    const pp = new Paths64();
    pp.push(path);
    this.addPaths(pp, joinType, endType);
  }
  addPaths(paths, joinType, endType) {
    const cnt = paths.length;
    if (cnt === 0) {
      return;
    }
    this._groupList.push(new ClipperGroup(paths, joinType, endType));
  }
  executeInternal(delta) {
    this._solution.clear();
    if (this._groupList.length === 0) {
      return;
    }
    if (Math.abs(delta) < 0.5) {
      for (const group of this._groupList) {
        for (const path of group.inPaths) {
          this._solution.push(path);
        }
      }
    } else {
      this._delta = delta;
      this._mitLimSqr = this.miterLimit <= 1 ? 2 : 2 / sqr(this.miterLimit);
      for (const group of this._groupList) {
        this.doGroupOffset(group);
      }
    }
  }
  execute(deltaOrDeltaCallback, solutionOrPolyTree) {
    let delta;
    if (typeof deltaOrDeltaCallback === "number") {
      delta = deltaOrDeltaCallback;
    } else {
      this.deltaCallback = deltaOrDeltaCallback;
      delta = 1;
    }
    solutionOrPolyTree.clear();
    this.executeInternal(delta);
    if (this._groupList.length === 0) {
      return;
    }
    const c = new Clipper64();
    c.preserveCollinear = this.preserveCollinear;
    c.reverseSolution = this.reverseSolution !== this._groupList[0].pathsReversed;
    c.addSubject(this._solution);
    c.execute(
      ClipType.Union,
      this._groupList[0].pathsReversed ? FillRule.Negative : FillRule.Positive,
      solutionOrPolyTree
    );
  }
  getUnitNormal(pt1, pt2) {
    let dx = Number(pt2.x - pt1.x);
    let dy = Number(pt2.y - pt1.y);
    if (dx === 0 && dy === 0) {
      return { x: 0, y: 0 };
    }
    const f = 1 / Math.sqrt(dx * dx + dy * dy);
    dx *= f;
    dy *= f;
    return { x: dy, y: -dx };
  }
  getBoundsAndLowestPolyIdx(paths) {
    const rec = new Rect64(false);
    let lpx = -9223372036854775808n;
    let index = -1;
    let i = 0;
    for (const path of paths) {
      for (let j = 0, len = path.length; j < len; j++) {
        const ptX = path.getX(j);
        const ptY = path.getY(j);
        if (ptY >= rec.bottom) {
          if (ptY > rec.bottom || ptX < lpx) {
            index = i;
            lpx = ptX;
            rec.bottom = ptY;
          }
        } else if (ptY < rec.top) {
          rec.top = ptY;
        }
        if (ptX > rec.right) {
          rec.right = ptX;
        } else if (ptX < rec.left) {
          rec.left = ptX;
        }
      }
      i++;
    }
    return { rec, index };
  }
  translatePoint(pt, dx, dy) {
    return { x: pt.x + dx, y: pt.y + dy };
  }
  reflectPoint(pt, pivot) {
    return { x: pivot.x + (pivot.x - pt.x), y: pivot.y + (pivot.y - pt.y) };
  }
  almostZero(value, epsilon = 1e-3) {
    return Math.abs(value) < epsilon;
  }
  hypotenuse(x, y) {
    return Math.sqrt(x * x + y * y);
  }
  normalizeVector(vec) {
    const h = this.hypotenuse(vec.x, vec.y);
    if (this.almostZero(h)) {
      return { x: 0, y: 0 };
    }
    const inverseHypot = 1 / h;
    return { x: vec.x * inverseHypot, y: vec.y * inverseHypot };
  }
  getAvgUnitVector(vec1, vec2) {
    return this.normalizeVector({ x: vec1.x + vec2.x, y: vec1.y + vec2.y });
  }
  intersectPoint(pt1a, pt1b, pt2a, pt2b) {
    if (isAlmostZero(pt1a.x - pt1b.x)) {
      if (isAlmostZero(pt2a.x - pt2b.x)) {
        return { x: 0, y: 0 };
      }
      const m2 = (pt2b.y - pt2a.y) / (pt2b.x - pt2a.x);
      const b2 = pt2a.y - m2 * pt2a.x;
      return { x: pt1a.x, y: m2 * pt1a.x + b2 };
    }
    if (isAlmostZero(pt2a.x - pt2b.x)) {
      const m1 = (pt1b.y - pt1a.y) / (pt1b.x - pt1a.x);
      const b1 = pt1a.y - m1 * pt1a.x;
      return { x: pt2a.x, y: m1 * pt2a.x + b1 };
    } else {
      const m1 = (pt1b.y - pt1a.y) / (pt1b.x - pt1a.x);
      const b1 = pt1a.y - m1 * pt1a.x;
      const m2 = (pt2b.y - pt2a.y) / (pt2b.x - pt2a.x);
      const b2 = pt2a.y - m2 * pt2a.x;
      if (isAlmostZero(m1 - m2)) {
        return { x: 0, y: 0 };
      }
      const x = (b2 - b1) / (m1 - m2);
      return { x, y: m1 * x + b1 };
    }
  }
  getPerpendic(pt, norm) {
    return {
      x: pt.x + numberToBigInt(norm.x * this._groupDelta),
      y: pt.y + numberToBigInt(norm.y * this._groupDelta)
    };
  }
  getPerpendicD(pt, norm) {
    return {
      x: Number(pt.x) + norm.x * this._groupDelta,
      y: Number(pt.y) + norm.y * this._groupDelta
    };
  }
  doBevel(group, path, j, k) {
    if (j == k) {
      const absDelta = Math.abs(this._groupDelta);
      group.outPath.push({
        x: path.getX(j) - numberToBigInt(absDelta * this._normals.getX(j)),
        y: path.getY(j) - numberToBigInt(absDelta * this._normals.getY(j))
      });
      group.outPath.push({
        x: path.getX(j) + numberToBigInt(absDelta * this._normals.getX(j)),
        y: path.getY(j) + numberToBigInt(absDelta * this._normals.getY(j))
      });
    } else {
      group.outPath.push({
        x: path.getX(j) + numberToBigInt(this._groupDelta * this._normals.getX(k)),
        y: path.getY(j) + numberToBigInt(this._groupDelta * this._normals.getY(k))
      });
      group.outPath.push({
        x: path.getX(j) + numberToBigInt(this._groupDelta * this._normals.getX(j)),
        y: path.getY(j) + numberToBigInt(this._groupDelta * this._normals.getY(j))
      });
    }
  }
  doSquare(group, path, j, k) {
    let vec;
    const kNormalPt = this._normals.getClone(k);
    const jNormalPt = this._normals.getClone(j);
    if (j === k) {
      vec = { x: jNormalPt.y, y: -jNormalPt.x };
    } else {
      vec = this.getAvgUnitVector(
        { x: -kNormalPt.y, y: kNormalPt.x },
        { x: jNormalPt.y, y: -jNormalPt.x }
      );
    }
    const absDelta = Math.abs(this._groupDelta);
    let ptQ = { x: Number(path.getX(j)), y: Number(path.getY(j)) };
    ptQ = this.translatePoint(ptQ, absDelta * vec.x, absDelta * vec.y);
    const pt1 = this.translatePoint(
      ptQ,
      this._groupDelta * vec.y,
      this._groupDelta * -vec.x
    );
    const pt2 = this.translatePoint(
      ptQ,
      this._groupDelta * -vec.y,
      this._groupDelta * vec.x
    );
    const pt3 = this.getPerpendicD(path.getClone(k), kNormalPt);
    if (j === k) {
      const pt4 = {
        x: pt3.x + vec.x * this._groupDelta,
        y: pt3.y + vec.y * this._groupDelta
      };
      const pt = this.intersectPoint(pt1, pt2, pt3, pt4);
      const rPt = this.reflectPoint(pt, ptQ);
      group.outPath.push({
        x: numberToBigInt(rPt.x),
        y: numberToBigInt(rPt.y)
      });
      group.outPath.push({
        x: numberToBigInt(pt.x),
        y: numberToBigInt(pt.y)
      });
    } else {
      const pt4 = this.getPerpendicD(path.getClone(j), kNormalPt);
      const pt = this.intersectPoint(pt1, pt2, pt3, pt4);
      group.outPath.push({
        x: numberToBigInt(pt.x),
        y: numberToBigInt(pt.y)
      });
      const rPt = this.reflectPoint(pt, ptQ);
      group.outPath.push({
        x: numberToBigInt(rPt.x),
        y: numberToBigInt(rPt.y)
      });
    }
  }
  doMiter(group, path, j, k, cosA) {
    const q = this._groupDelta / (cosA + 1);
    const kNormalPt = this._normals.getClone(k);
    const jNormalPt = this._normals.getClone(j);
    group.outPath.push({
      x: path.getX(j) + numberToBigInt((kNormalPt.x + jNormalPt.x) * q),
      y: path.getY(j) + numberToBigInt((kNormalPt.y + jNormalPt.y) * q)
    });
  }
  doRound(group, path, j, k, angle) {
    if (this.deltaCallback !== void 0) {
      const absDelta = Math.abs(this._groupDelta);
      const arcTol = this.arcTolerance > 0.01 ? this.arcTolerance : Math.log10(2 + absDelta) * defaultArcTolerance;
      const stepsPer360 = Math.PI / Math.acos(1 - arcTol / absDelta);
      this._stepSin = Math.sin(2 * Math.PI / stepsPer360);
      this._stepCos = Math.cos(2 * Math.PI / stepsPer360);
      if (this._groupDelta < 0) {
        this._stepSin = -this._stepSin;
      }
      this._stepsPerRad = stepsPer360 / (2 * Math.PI);
    }
    const kNormalPt = this._normals.getClone(k);
    const jNormalPt = this._normals.getClone(j);
    const pt = path.getClone(j);
    let offsetVec = {
      x: kNormalPt.x * this._groupDelta,
      y: kNormalPt.y * this._groupDelta
    };
    if (j === k) {
      offsetVec.x = -offsetVec.x;
      offsetVec.y = -offsetVec.y;
    }
    group.outPath.push({
      x: pt.x + numberToBigInt(offsetVec.x),
      y: pt.y + numberToBigInt(offsetVec.y)
    });
    const steps = Math.ceil(this._stepsPerRad * Math.abs(angle));
    for (let i = 1; i < steps; i++) {
      offsetVec = {
        x: offsetVec.x * this._stepCos - this._stepSin * offsetVec.y,
        y: offsetVec.x * this._stepSin + offsetVec.y * this._stepCos
      };
      group.outPath.push({
        x: pt.x + numberToBigInt(offsetVec.x),
        y: pt.y + numberToBigInt(offsetVec.y)
      });
    }
    group.outPath.push(this.getPerpendic(pt, jNormalPt));
  }
  bulidNormals(path) {
    const cnt = path.length;
    this._normals.clear();
    for (let i = 0; i < cnt - 1; i++) {
      this._normals.push(
        this.getUnitNormal(path.getClone(i), path.getClone(i + 1))
      );
    }
    this._normals.push(
      this.getUnitNormal(path.getClone(cnt - 1), path.getClone(0))
    );
  }
  offsetPoint(group, path, j, k) {
    const kNormalPt = this._normals.getClone(k);
    const jNormalPt = this._normals.getClone(j);
    let sinA = crossProductD(jNormalPt, kNormalPt);
    const cosA = dotProductD(jNormalPt, kNormalPt);
    if (sinA > 1) {
      sinA = 1;
    } else if (sinA < -1) {
      sinA = -1;
    }
    if (this.deltaCallback !== void 0) {
      this._groupDelta = this.deltaCallback(path, this._normals, j, k);
      if (group.pathsReversed) {
        this._groupDelta = -this._groupDelta;
      }
    }
    const jPath = path.getClone(j);
    if (Math.abs(this._groupDelta) < tolerance) {
      group.outPath.push(jPath);
      return k;
    }
    if (cosA > -0.99 && sinA * this._groupDelta < 0) {
      group.outPath.push(this.getPerpendic(jPath, kNormalPt));
      group.outPath.push(jPath);
      group.outPath.push(this.getPerpendic(jPath, jNormalPt));
    } else if (cosA > 0.999) {
      this.doMiter(group, path, j, k, cosA);
    } else if (this._joinType === JoinType.Miter) {
      if (cosA > this._mitLimSqr - 1) {
        this.doMiter(group, path, j, k, cosA);
      } else {
        this.doSquare(group, path, j, k);
      }
    } else if (cosA > 0.99 || this._joinType === JoinType.Bevel) {
      this.doBevel(group, path, j, k);
    } else if (this._joinType === JoinType.Round) {
      this.doRound(group, path, j, k, Math.atan2(sinA, cosA));
    } else {
      this.doSquare(group, path, j, k);
    }
    return j;
  }
  offsetPolygon(group, path) {
    const a = area(path);
    if (a < 0 !== this._groupDelta < 0) {
      const rec = getBounds(path);
      const offsetMinDim = Math.abs(this._groupDelta) * 2;
      if (offsetMinDim > rec.width || offsetMinDim > rec.height) {
        return;
      }
    }
    const cnt = path.length;
    group.outPath = new Path64TypedArray(cnt + 1);
    let prev = cnt - 1;
    for (let i = 0; i < cnt; i++) {
      prev = this.offsetPoint(group, path, i, prev);
    }
    group.outPaths.push(group.outPath);
  }
  offsetOpenJoined(group, path) {
    this.offsetPolygon(group, path);
    path = reversePath(path);
    this.bulidNormals(path);
    this.offsetPolygon(group, path);
  }
  offsetOpenPath(group, path) {
    group.outPath = new Path64TypedArray();
    const highI = path.length - 1;
    if (this.deltaCallback !== void 0) {
      this._groupDelta = this.deltaCallback(path, this._normals, 0, 0);
    }
    const startPt = path.getClone(0);
    if (Math.abs(this._groupDelta) < tolerance) {
      group.outPath.push(startPt);
    } else {
      switch (this._endType) {
        case EndType.Butt:
          this.doBevel(group, path, 0, 0);
          break;
        case EndType.Round:
          this.doRound(group, path, 0, 0, Math.PI);
          break;
        default:
          this.doSquare(group, path, 0, 0);
          break;
      }
    }
    for (let i = 1, k = 0; i < highI; i++) {
      k = this.offsetPoint(group, path, i, k);
    }
    for (let i = highI; i > 0; i--) {
      const nextPt = this._normals.getClone(i - 1);
      this._normals.set(i, -nextPt.x, -nextPt.y);
    }
    const highNormalPt = this._normals.getClone(highI);
    this._normals.set(0, highNormalPt.x, highNormalPt.y);
    if (this.deltaCallback !== void 0) {
      this._groupDelta = this.deltaCallback(path, this._normals, highI, highI);
    }
    const highPt = path.getClone(highI);
    if (Math.abs(this._groupDelta) < tolerance) {
      group.outPath.push(highPt);
    } else {
      switch (this._endType) {
        case EndType.Butt:
          this.doBevel(group, path, highI, highI);
          break;
        case EndType.Round:
          this.doRound(group, path, highI, highI, Math.PI);
          break;
        default:
          this.doSquare(group, path, highI, highI);
          break;
      }
    }
    for (let i = highI, k = 0; i > 0; i--) {
      k = this.offsetPoint(group, path, i, k);
    }
    group.outPaths.push(group.outPath);
  }
  doGroupOffset(group) {
    if (group.endType === EndType.Polygon) {
      const { index: lowestIdx } = this.getBoundsAndLowestPolyIdx(
        group.inPaths
      );
      if (lowestIdx < 0) {
        return;
      }
      const calcedArea = area(group.inPaths[lowestIdx]);
      group.pathsReversed = calcedArea < 0;
      if (group.pathsReversed) {
        this._groupDelta = -this._delta;
      } else {
        this._groupDelta = this._delta;
      }
    } else {
      group.pathsReversed = false;
      this._groupDelta = Math.abs(this._delta) * 0.5;
    }
    const absDelta = Math.abs(this._groupDelta);
    this._joinType = group.joinType;
    this._endType = group.endType;
    if (this.deltaCallback === void 0 && (group.joinType === JoinType.Round || group.endType === EndType.Round)) {
      const arcTol = this.arcTolerance > 0.01 ? this.arcTolerance : Math.log10(2 + absDelta) * defaultArcTolerance;
      const stepsPer360 = Math.PI / Math.acos(1 - arcTol / absDelta);
      this._stepSin = Math.sin(2 * Math.PI / stepsPer360);
      this._stepCos = Math.cos(2 * Math.PI / stepsPer360);
      if (this._groupDelta < 0) {
        this._stepSin = -this._stepSin;
      }
      this._stepsPerRad = stepsPer360 / (2 * Math.PI);
    }
    const isJoined2 = group.endType === EndType.Joined || group.endType === EndType.Polygon;
    for (const p of group.inPaths) {
      const path = stripDuplicates(p, isJoined2);
      const cnt = path.length;
      if (cnt === 0 || cnt < 3 && this._endType === EndType.Polygon) {
        continue;
      }
      if (cnt === 1) {
        group.outPath = new Path64TypedArray();
        const startPt = path.getClone(0);
        if (group.endType === EndType.Round) {
          const r = absDelta;
          const steps = Math.ceil(this._stepsPerRad * 2 * Math.PI);
          group.outPath = ellipse(startPt, r, r, steps);
        } else {
          const d = BigInt(Math.ceil(this._groupDelta));
          const r = new Rect64(
            startPt.x - d,
            startPt.y - d,
            startPt.x - d,
            startPt.y - d
          );
          group.outPath = r.asPath();
        }
        group.outPaths.push(group.outPath);
      } else {
        if (cnt == 2 && group.endType === EndType.Joined) {
          if (group.joinType === JoinType.Round) {
            this._endType = EndType.Round;
          } else {
            this._endType = EndType.Square;
          }
        }
        this.bulidNormals(path);
        if (this._endType === EndType.Polygon) {
          this.offsetPolygon(group, path);
        } else if (this._endType === EndType.Joined) {
          this.offsetOpenJoined(group, path);
        } else {
          this.offsetOpenPath(group, path);
        }
      }
    }
    for (const path of group.outPaths) {
      this._solution.push(path);
    }
    group.outPaths.clear();
  }
}
const Location = {
  left: 0,
  top: 1,
  right: 2,
  bottom: 3,
  inside: 4
};
const path1ContainsPath2 = (path1, path2) => {
  let ioCount = 0;
  for (const pt of path2) {
    const pip = pointInPolygon$1(pt, path1);
    switch (pip) {
      case PointInPolygonResult.IsInside:
        ioCount--;
        break;
      case PointInPolygonResult.IsOutside:
        ioCount++;
        break;
    }
    if (Math.abs(ioCount) > 1) {
      break;
    }
  }
  return ioCount <= 0;
};
const isClockwise = (prev, curr, prevPt, currPt, rectMidPoint) => {
  if (areOpposites(prev, curr)) {
    return crossProduct64(prevPt, rectMidPoint, currPt) < 0;
  } else {
    return headingClockwise(prev, curr);
  }
};
const areOpposites = (prev, curr) => {
  return Math.abs(prev - curr) === 2;
};
const headingClockwise = (prev, curr) => {
  return (prev + 1) % 4 === curr;
};
const getAdjacentLocation = (loc, isClockwise2) => {
  const delta = isClockwise2 ? 1 : 3;
  return (loc + delta) % 4;
};
const unlinkOp = (op) => {
  if (op === op.next) {
    return void 0;
  }
  op.prev.next = op.next;
  op.next.prev = op.prev;
  return op.next;
};
const unlinkOpBack = (op) => {
  if (op.next === op) {
    return void 0;
  }
  op.prev.next = op.next;
  op.next.prev = op.prev;
  return op.prev;
};
const getEdgesForPt = (pt, rec) => {
  let result = 0;
  if (pt.x === rec.left) {
    result = 1;
  } else if (pt.x === rec.right) {
    result = 4;
  }
  if (pt.y === rec.top) {
    result += 2;
  } else if (pt.y === rec.bottom) {
    result += 8;
  }
  return result;
};
const isHeadingClockwise = (pt1, pt2, edgeIdx) => {
  switch (edgeIdx) {
    case 0:
      return pt2.y < pt1.y;
    case 1:
      return pt2.x > pt1.x;
    case 2:
      return pt2.y > pt1.y;
    default:
      return pt2.x < pt1.x;
  }
};
const hasHorzOverlap = (left1, right1, left2, right2) => {
  return left1.x < right2.x && right1.x > left2.x;
};
const hasVertOverlap = (top1, bottom1, top2, bottom2) => {
  return top1.y < bottom2.y && bottom1.y > top2.y;
};
const addToEdge = (edge, op) => {
  if (op.edge !== void 0) {
    return;
  }
  op.edge = edge;
  edge.push(op);
};
const uncoupleEdge = (op) => {
  if (op.edge === void 0) {
    return;
  }
  for (let i = 0; i < op.edge.length; i++) {
    const op2 = op.edge[i];
    if (op2 === op) {
      op.edge[i] = void 0;
      break;
    }
  }
  op.edge = void 0;
};
const setNewOwner = (op, newIdx) => {
  op.ownerIdx = newIdx;
  let op2 = op.next;
  while (op2 !== op) {
    op2.ownerIdx = newIdx;
    op2 = op2.next;
  }
};
const getLocation = (rec, pt) => {
  if (pt.x === rec.left && pt.y >= rec.top && pt.y <= rec.bottom) {
    return {
      result: false,
      loc: Location.left
    };
  }
  if (pt.x === rec.right && pt.y >= rec.top && pt.y <= rec.bottom) {
    return {
      result: false,
      loc: Location.right
    };
  }
  if (pt.y === rec.top && pt.x >= rec.left && pt.x <= rec.right) {
    return {
      result: false,
      loc: Location.top
    };
  }
  if (pt.y === rec.bottom && pt.x >= rec.left && pt.x <= rec.right) {
    return {
      result: false,
      loc: Location.bottom
    };
  }
  if (pt.x < rec.left) {
    return {
      result: true,
      loc: Location.left
    };
  } else if (pt.x > rec.right) {
    return {
      result: true,
      loc: Location.right
    };
  } else if (pt.y < rec.top) {
    return {
      result: true,
      loc: Location.top
    };
  } else if (pt.y > rec.bottom) {
    return {
      result: true,
      loc: Location.bottom
    };
  } else {
    return {
      result: true,
      loc: Location.inside
    };
  }
};
const isHorizontal = (pt1, pt2) => {
  return pt1.y === pt2.y;
};
const getSegmentIntersection = (p1, p2, p3, p4) => {
  const res1 = crossProduct64(p1, p3, p4);
  const res2 = crossProduct64(p2, p3, p4);
  let ip;
  if (res1 === 0n) {
    ip = Point64.clone(p1);
    let result;
    if (res2 === 0n) {
      result = false;
    } else if (Point64.equals(p1, p3) || Point64.equals(p1, p4)) {
      result = true;
    } else if (isHorizontal(p3, p4)) {
      result = p1.x > p3.x === p1.x < p4.x;
    } else {
      result = p1.y > p3.y === p1.y < p4.y;
    }
    return { result, ip };
  } else if (res2 === 0n) {
    ip = Point64.clone(p2);
    let result;
    if (Point64.equals(p2, p3) || Point64.equals(p2, p4)) {
      result = true;
    } else if (isHorizontal(p3, p4)) {
      result = p2.x > p3.x === p2.x < p4.x;
    } else {
      result = p2.y > p3.y === p2.y < p4.y;
    }
    return { result, ip };
  }
  if (res1 > 0 === res2 > 0) {
    ip = { x: 0n, y: 0n };
    return { result: false, ip };
  }
  const res3 = crossProduct64(p3, p1, p2);
  const res4 = crossProduct64(p4, p1, p2);
  if (res3 === 0n) {
    ip = Point64.clone(p3);
    let result;
    if (Point64.equals(p3, p1) || Point64.equals(p3, p2)) {
      result = true;
    } else if (isHorizontal(p1, p2)) {
      result = p3.x > p1.x === p3.x < p2.x;
    } else {
      result = p3.y > p1.y === p3.y < p2.y;
    }
    return { result, ip };
  } else if (res4 === 0n) {
    ip = Point64.clone(p4);
    let result;
    if (Point64.equals(p4, p1) || Point64.equals(p4, p2)) {
      result = true;
    } else if (isHorizontal(p1, p2)) {
      result = p4.x > p1.x === p4.x < p2.x;
    } else {
      result = p4.y > p1.y === p4.y < p2.y;
    }
    return { result, ip };
  }
  if (res3 > 0 === res4 > 0) {
    ip = { x: 0n, y: 0n };
    return { result: false, ip };
  }
  return getIntersectPoint(p1, p2, p3, p4);
};
class RectClip64 {
  constructor(rect) {
    __publicField(this, "_rect");
    __publicField(this, "_mp");
    __publicField(this, "_rectPath");
    __publicField(this, "_pathBounds");
    __publicField(this, "_results");
    __publicField(this, "_edges");
    __publicField(this, "_currIdx");
    this._currIdx = -1;
    this._rect = rect;
    this._mp = rect.midPoint();
    this._rectPath = rect.asPath();
    this._pathBounds = new Rect64();
    this._results = [];
    this._edges = [];
    for (let i = 0; i < 8; i++) {
      this._edges[i] = [];
    }
  }
  add(pt, startingNewPath = false) {
    let currIdx = this._results.length;
    let result;
    if (currIdx === 0 || startingNewPath) {
      result = {
        ownerIdx: currIdx,
        pt: Point64.clone(pt)
      };
      this._results.push(result);
      result.prev = result;
      result.next = result;
    } else {
      currIdx--;
      const prevOp = this._results[currIdx];
      if (Point64.equals(prevOp.pt, pt)) {
        return prevOp;
      }
      result = {
        ownerIdx: currIdx,
        pt: Point64.clone(pt),
        next: prevOp.next
      };
      prevOp.next.prev = result;
      prevOp.next = result;
      result.prev = prevOp;
      this._results[currIdx] = result;
    }
    return result;
  }
  addCorner(prev, curr) {
    this.add(
      this._rectPath.getClone(headingClockwise(prev, curr) ? prev : curr)
    );
  }
  addCornerRef(loc, isClockwise2) {
    if (isClockwise2) {
      this.add(this._rectPath.getClone(loc));
      loc = getAdjacentLocation(loc, true);
      return loc;
    } else {
      loc = getAdjacentLocation(loc, false);
      this.add(this._rectPath.getClone(loc));
      return loc;
    }
  }
  getIntersection(rectPath, p, p2, loc) {
    let ip = { x: 0n, y: 0n };
    let result;
    const rectPath0Left = rectPath.getClone(0);
    const rectPath1Top = rectPath.getClone(1);
    const rectPath2Right = rectPath.getClone(2);
    const rectPath3Bottom = rectPath.getClone(3);
    switch (loc) {
      case Location.left:
        if (({ result, ip } = getSegmentIntersection(
          p,
          p2,
          rectPath0Left,
          rectPath3Bottom
        )).result) {
          break;
        } else if (p.y < rectPath0Left.y && ({ result, ip } = getSegmentIntersection(
          p,
          p2,
          rectPath0Left,
          rectPath1Top
        )).result) {
          loc = Location.top;
          break;
        } else if (({ result, ip } = getSegmentIntersection(
          p,
          p2,
          rectPath2Right,
          rectPath3Bottom
        )).result) {
          loc = Location.bottom;
          break;
        } else {
          result = false;
          break;
        }
      case Location.right:
        if (({ result, ip } = getSegmentIntersection(
          p,
          p2,
          rectPath1Top,
          rectPath2Right
        )).result) {
          break;
        } else if (p.y < rectPath0Left.y && ({ result, ip } = getSegmentIntersection(
          p,
          p2,
          rectPath0Left,
          rectPath1Top
        )).result) {
          loc = Location.top;
          break;
        } else if (({ result, ip } = getSegmentIntersection(
          p,
          p2,
          rectPath2Right,
          rectPath3Bottom
        )).result) {
          loc = Location.bottom;
          break;
        } else {
          result = false;
          break;
        }
      case Location.top:
        if (({ result, ip } = getSegmentIntersection(
          p,
          p2,
          rectPath0Left,
          rectPath1Top
        )).result) {
          break;
        } else if (p.x < rectPath0Left.x && ({ result, ip } = getSegmentIntersection(
          p,
          p2,
          rectPath0Left,
          rectPath3Bottom
        )).result) {
          loc = Location.left;
          break;
        } else if (p.x > rectPath1Top.x && ({ result, ip } = getSegmentIntersection(
          p,
          p2,
          rectPath1Top,
          rectPath2Right
        )).result) {
          loc = Location.right;
          break;
        } else {
          result = false;
          break;
        }
      case Location.bottom:
        if (({ result, ip } = getSegmentIntersection(
          p,
          p2,
          rectPath2Right,
          rectPath3Bottom
        )).result) {
          break;
        } else if (p.x < rectPath3Bottom.x && ({ result, ip } = getSegmentIntersection(
          p,
          p2,
          rectPath0Left,
          rectPath3Bottom
        )).result) {
          loc = Location.left;
          break;
        } else if (p.x > rectPath2Right.x && ({ result, ip } = getSegmentIntersection(
          p,
          p2,
          rectPath1Top,
          rectPath2Right
        )).result) {
          loc = Location.right;
          break;
        } else {
          result = false;
          break;
        }
      default:
        if (({ result, ip } = getSegmentIntersection(
          p,
          p2,
          rectPath0Left,
          rectPath3Bottom
        )).result) {
          loc = Location.left;
          break;
        } else if (({ result, ip } = getSegmentIntersection(
          p,
          p2,
          rectPath0Left,
          rectPath1Top
        )).result) {
          loc = Location.top;
          break;
        } else if (({ result, ip } = getSegmentIntersection(
          p,
          p2,
          rectPath1Top,
          rectPath2Right
        )).result) {
          loc = Location.right;
          break;
        } else if (({ result, ip } = getSegmentIntersection(
          p,
          p2,
          rectPath2Right,
          rectPath3Bottom
        )).result) {
          loc = Location.bottom;
          break;
        } else {
          result = false;
          break;
        }
    }
    return {
      result,
      ip,
      loc
    };
  }
  getNextLocation(path, loc, i, highI) {
    switch (loc) {
      case Location.left: {
        while (i <= highI && path.getX(i) <= this._rect.left) {
          i++;
        }
        if (i > highI) {
          break;
        }
        const currPt = path.getClone(i);
        if (currPt.x >= this._rect.right) {
          loc = Location.right;
        } else if (currPt.y <= this._rect.top) {
          loc = Location.top;
        } else if (currPt.y >= this._rect.bottom) {
          loc = Location.bottom;
        } else {
          loc = Location.inside;
        }
        break;
      }
      case Location.top: {
        while (i <= highI && path.getY(i) <= this._rect.top) {
          i++;
        }
        if (i > highI) {
          break;
        }
        const currPt = path.getClone(i);
        if (currPt.y >= this._rect.bottom) {
          loc = Location.bottom;
        } else if (currPt.x <= this._rect.left) {
          loc = Location.left;
        } else if (currPt.x >= this._rect.right) {
          loc = Location.right;
        } else {
          loc = Location.inside;
        }
        break;
      }
      case Location.right: {
        while (i <= highI && path.getX(i) >= this._rect.right) {
          i++;
        }
        if (i > highI) {
          break;
        }
        const currPt = path.getClone(i);
        if (currPt.x <= this._rect.left) {
          loc = Location.left;
        } else if (currPt.y <= this._rect.top) {
          loc = Location.top;
        } else if (currPt.y >= this._rect.bottom) {
          loc = Location.bottom;
        } else {
          loc = Location.inside;
        }
        break;
      }
      case Location.bottom: {
        while (i <= highI && path.getY(i) >= this._rect.bottom) {
          i++;
        }
        if (i > highI) {
          break;
        }
        const currPt = path.getClone(i);
        if (currPt.y <= this._rect.top) {
          loc = Location.top;
        } else if (currPt.x <= this._rect.left) {
          loc = Location.left;
        } else if (currPt.x >= this._rect.right) {
          loc = Location.right;
        } else {
          loc = Location.inside;
        }
        break;
      }
      case Location.inside: {
        while (i <= highI) {
          const currPt = path.getClone(i);
          if (currPt.x < this._rect.left) {
            loc = Location.left;
          } else if (currPt.x > this._rect.right) {
            loc = Location.right;
          } else if (currPt.y > this._rect.bottom) {
            loc = Location.bottom;
          } else if (currPt.y < this._rect.top) {
            loc = Location.top;
          } else {
            this.add(currPt);
            i++;
            continue;
          }
          break;
        }
        break;
      }
    }
    return { loc, i };
  }
  executeInternal(path) {
    if (path.length < 3 || this._rect.isEmpty()) {
      return;
    }
    const startLocs = [];
    let firstCross = Location.inside;
    let crossingLoc = firstCross;
    let prev = firstCross;
    let i;
    const highI = path.length - 1;
    let loc;
    if (!({ loc } = getLocation(this._rect, path.getClone(highI))).result) {
      i = highI - 1;
      while (i >= 0 && !({ loc: prev } = getLocation(this._rect, path.getClone(i))).result) {
        i--;
      }
      if (i < 0) {
        for (const pt of path) {
          this.add(pt);
        }
        return;
      }
      if (prev === Location.inside) {
        loc = Location.inside;
      }
    }
    const startingLoc = loc;
    i = 0;
    while (i <= highI) {
      prev = loc;
      const prevCrossLoc = crossingLoc;
      ({ loc, i } = this.getNextLocation(path, loc, i, highI));
      if (i > highI) {
        break;
      }
      const currPt = path.getClone(i);
      const prevPt = i === 0 ? path.getClone(highI) : path.getClone(i - 1);
      crossingLoc = loc;
      let ip;
      if (!({ loc: crossingLoc, ip } = this.getIntersection(
        this._rectPath,
        currPt,
        prevPt,
        crossingLoc
      )).result) {
        if (prevCrossLoc === Location.inside) {
          const isClockw = isClockwise(prev, loc, prevPt, currPt, this._mp);
          do {
            startLocs.push(prev);
            prev = getAdjacentLocation(prev, isClockw);
          } while (prev !== loc);
          crossingLoc = prevCrossLoc;
        } else if (prev !== Location.inside && prev !== loc) {
          const isClockw = isClockwise(prev, loc, prevPt, currPt, this._mp);
          do {
            prev = this.addCornerRef(prev, isClockw);
          } while (prev !== loc);
        }
        i++;
        continue;
      }
      if (loc === Location.inside) {
        if (firstCross === Location.inside) {
          firstCross = crossingLoc;
          startLocs.push(prev);
        } else if (prev !== crossingLoc) {
          const isClockw = isClockwise(
            prev,
            crossingLoc,
            prevPt,
            currPt,
            this._mp
          );
          do {
            prev = this.addCornerRef(prev, isClockw);
          } while (prev !== crossingLoc);
        }
      } else if (prev !== Location.inside) {
        loc = prev;
        let ip2;
        ({ loc, ip: ip2 } = this.getIntersection(
          this._rectPath,
          prevPt,
          currPt,
          loc
        ));
        if (prevCrossLoc !== Location.inside && prevCrossLoc !== loc) {
          this.addCorner(prevCrossLoc, loc);
        }
        if (firstCross === Location.inside) {
          firstCross = loc;
          startLocs.push(prev);
        }
        loc = crossingLoc;
        this.add(ip2);
        if (Point64.equals(ip, ip2)) {
          ({ loc } = getLocation(this._rect, currPt));
          this.addCorner(crossingLoc, loc);
          crossingLoc = loc;
          continue;
        }
      } else {
        loc = crossingLoc;
        if (firstCross === Location.inside) {
          firstCross = crossingLoc;
        }
      }
      this.add(ip);
    }
    if (firstCross === Location.inside) {
      if (startingLoc !== Location.inside) {
        if (this._pathBounds.contains(this._rect) && path1ContainsPath2(path, this._rectPath)) {
          for (let j = 0; j < 4; j++) {
            this.add(this._rectPath.getClone(j));
            addToEdge(this._edges[j * 2], this._results[0]);
          }
        }
      }
    } else if (loc !== Location.inside && (loc !== firstCross || startLocs.length > 2)) {
      if (startLocs.length > 0) {
        prev = loc;
        for (const loc2 of startLocs) {
          if (prev === loc2) {
            continue;
          }
          prev = this.addCornerRef(prev, headingClockwise(prev, loc2));
          prev = loc2;
        }
        loc = prev;
      }
      if (loc !== firstCross) {
        loc = this.addCornerRef(loc, headingClockwise(loc, firstCross));
      }
    }
  }
  execute(paths) {
    const result = new Paths64();
    if (this._rect.isEmpty()) {
      return result;
    }
    for (const path of paths) {
      if (path.length < 3) {
        continue;
      }
      this._pathBounds = getBounds(path);
      if (!this._rect.intersects(this._pathBounds)) {
        continue;
      } else if (this._rect.contains(this._pathBounds)) {
        result.push(path);
        continue;
      }
      this.executeInternal(path);
      this.checkEdges();
      for (let i = 0; i < 4; i++) {
        this.tidyEdgePair(i, this._edges[i * 2], this._edges[i * 2 + 1]);
      }
      for (const op of this._results) {
        const tmp = this.getPath(op);
        if (tmp.length > 0) {
          result.push(tmp);
        }
      }
      this._results.length = 0;
      for (let i = 0; i < 8; i++) {
        this._edges[i].length = 0;
      }
    }
    return result;
  }
  checkEdges() {
    for (let i = 0; i < this._results.length; i++) {
      let op = this._results[i];
      let op2 = op;
      if (op === void 0) {
        continue;
      }
      do {
        if (crossProduct64(op2.prev.pt, op2.pt, op2.next.pt) === 0n) {
          if (op2 === op) {
            op2 = unlinkOpBack(op2);
            if (op2 === void 0) {
              break;
            }
            op = op2.prev;
          } else {
            op2 = unlinkOpBack(op2);
            if (op2 === void 0) {
              break;
            }
          }
        } else {
          op2 = op2.next;
        }
      } while (op2 !== op);
      if (op2 === void 0) {
        this._results[i] = void 0;
        continue;
      }
      this._results[i] = op2;
      let edgeSet1 = getEdgesForPt(op.prev.pt, this._rect);
      op2 = op;
      do {
        const edgeSet2 = getEdgesForPt(op2.pt, this._rect);
        if (edgeSet2 !== 0 && op2.edge === void 0) {
          const combinedSet = edgeSet1 & edgeSet2;
          for (let j = 0; j < 4; ++j) {
            if ((combinedSet & 1 << j) !== 0) {
              if (isHeadingClockwise(op2.prev.pt, op2.pt, j)) {
                addToEdge(this._edges[j * 2], op2);
              } else {
                addToEdge(this._edges[j * 2 + 1], op2);
              }
            }
          }
        }
        edgeSet1 = edgeSet2;
        op2 = op2.next;
      } while (op2 !== op);
    }
  }
  tidyEdgePair(idx, cw, ccw) {
    if (ccw.length === 0) {
      return;
    }
    const isHorz = idx === 1 || idx === 3;
    const cwIsTowardLarger = idx === 1 || idx === 2;
    let i = 0;
    let j = 0;
    let p1;
    let p2;
    let p1a;
    let p2a;
    let op;
    let op2;
    while (i < cw.length) {
      p1 = cw[i];
      if (p1 === void 0 || p1.next === p1.prev) {
        cw[i++] = void 0;
        j = 0;
        continue;
      }
      const jLim = ccw.length;
      while (j < jLim && (ccw[j] === void 0 || ccw[j].next === ccw[j].prev)) {
        j++;
      }
      if (j === jLim) {
        i++;
        j = 0;
        continue;
      }
      if (cwIsTowardLarger) {
        p1 = cw[i].prev;
        p1a = cw[i];
        p2 = ccw[j];
        p2a = ccw[j].prev;
      } else {
        p1 = cw[i];
        p1a = cw[i].prev;
        p2 = ccw[j].prev;
        p2a = ccw[j];
      }
      if (isHorz && !hasHorzOverlap(p1.pt, p1a.pt, p2.pt, p2a.pt) || !isHorz && !hasVertOverlap(p1.pt, p1a.pt, p2.pt, p2a.pt)) {
        ++j;
        continue;
      }
      const isRejoining = cw[i].ownerIdx !== ccw[j].ownerIdx;
      if (isRejoining) {
        this._results[p2.ownerIdx] = void 0;
        setNewOwner(p2, p1.ownerIdx);
      }
      if (cwIsTowardLarger) {
        p1.next = p2;
        p2.prev = p1;
        p1a.prev = p2a;
        p2a.next = p1a;
      } else {
        p1.prev = p2;
        p2.next = p1;
        p1a.next = p2a;
        p2a.prev = p1a;
      }
      if (!isRejoining) {
        const new_idx = this._results.length;
        this._results.push(p1a);
        setNewOwner(p1a, new_idx);
      }
      if (cwIsTowardLarger) {
        op = p2;
        op2 = p1a;
      } else {
        op = p1;
        op2 = p2a;
      }
      this._results[op.ownerIdx] = op;
      this._results[op2.ownerIdx] = op2;
      const opIsLarger = isHorz ? op.pt.x > op.prev.pt.x : op.pt.y > op.prev.pt.y;
      const op2IsLarger = isHorz ? op2.pt.x > op2.prev.pt.x : op2.pt.y > op2.prev.pt.y;
      if (op.next === op.prev || Point64.equals(op.pt, op.prev.pt)) {
        if (op2IsLarger === cwIsTowardLarger) {
          cw[i] = op2;
          ccw[j++] = void 0;
        } else {
          ccw[j] = op2;
          cw[i++] = void 0;
        }
      } else if (op2.next === op2.prev || Point64.equals(op2.pt, op2.prev.pt)) {
        if (opIsLarger === cwIsTowardLarger) {
          cw[i] = op;
          ccw[j++] = void 0;
        } else {
          ccw[j] = op;
          cw[i++] = void 0;
        }
      } else if (opIsLarger === op2IsLarger) {
        if (opIsLarger === cwIsTowardLarger) {
          cw[i] = op;
          uncoupleEdge(op2);
          addToEdge(cw, op2);
          ccw[j++] = void 0;
        } else {
          cw[i++] = void 0;
          ccw[j] = op2;
          uncoupleEdge(op);
          addToEdge(ccw, op);
          j = 0;
        }
      } else {
        if (opIsLarger === cwIsTowardLarger) {
          cw[i] = op;
        } else {
          ccw[j] = op;
        }
        if (op2IsLarger === cwIsTowardLarger) {
          cw[i] = op2;
        } else {
          ccw[j] = op2;
        }
      }
    }
  }
  getPath(op) {
    if (op === void 0 || op.prev === op.next) {
      return new Path64TypedArray();
    }
    let op2 = op.next;
    while (op2 !== void 0 && op2 !== op) {
      if (crossProduct64(op2.prev.pt, op2.pt, op2.next.pt) === 0n) {
        op = op2.prev;
        op2 = unlinkOp(op2);
      } else {
        op2 = op2.next;
      }
    }
    if (op2 === void 0) {
      return new Path64TypedArray();
    }
    const result = new Path64TypedArray();
    result.push(op.pt);
    op2 = op.next;
    while (op2 !== op) {
      result.push(op2.pt);
      op2 = op2.next;
    }
    return result;
  }
}
class RectClipLines64 extends RectClip64 {
  execute(paths) {
    const result = new Paths64();
    if (this._rect.isEmpty()) {
      return result;
    }
    for (const path of paths) {
      if (path.length < 2) {
        continue;
      }
      this._pathBounds = getBounds(path);
      if (!this._rect.intersects(this._pathBounds)) {
        continue;
      }
      this.executeInternal(path);
      for (const op of this._results) {
        const tmp = this.getPath(op);
        if (tmp.length > 0) {
          result.push(tmp);
        }
      }
      this._results.length = 0;
      for (let i = 0; i < 8; i++) {
        this._edges[i].length = 0;
      }
    }
    return result;
  }
  getPath(op) {
    const result = new Path64TypedArray();
    if (op === void 0 || op === op.next) {
      return result;
    }
    op = op.next;
    result.push(op.pt);
    let op2 = op.next;
    while (op2 !== op) {
      result.push(op2.pt);
      op2 = op2.next;
    }
    return result;
  }
  executeInternal(path) {
    this._results.length = 0;
    if (path.length < 2 || this._rect.isEmpty()) {
      return;
    }
    let prev = Location.inside;
    let i = 1;
    const highI = path.length - 1;
    let loc;
    if (!({ loc } = getLocation(this._rect, path.getClone(0))).result) {
      while (i <= highI && !({ loc: prev } = getLocation(this._rect, path.getClone(i))).result) {
        i++;
      }
      if (i > highI) {
        for (const pt of path) {
          this.add(pt);
        }
      }
      if (prev === Location.inside) {
        loc = Location.inside;
      }
      i = 1;
    }
    const currPt = path.getClone(0);
    if (loc === Location.inside) {
      this.add(currPt);
    }
    while (i <= highI) {
      prev = loc;
      ({ loc, i } = this.getNextLocation(path, loc, i, highI));
      if (i > highI) {
        break;
      }
      const prevPt = path.getClone(i - 1);
      let crossingLoc = loc;
      let ip;
      if (!({ loc: crossingLoc, ip } = this.getIntersection(
        this._rectPath,
        currPt,
        prevPt,
        crossingLoc
      )).result) {
        ++i;
        continue;
      }
      if (loc === Location.inside) {
        this.add(ip, true);
      } else if (prev !== Location.inside) {
        crossingLoc = prev;
        let ip2;
        ({ loc: crossingLoc, ip: ip2 } = this.getIntersection(
          this._rectPath,
          prevPt,
          currPt,
          crossingLoc
        ));
        this.add(ip2);
        this.add(ip);
      } else {
        this.add(ip);
      }
    }
  }
}
const roundToEven = (num) => {
  if (Number.isInteger(num)) {
    return num;
  } else if (Number.isInteger(num * 2)) {
    const truncated = Math.trunc(num);
    return truncated + truncated % 2;
  }
  return awayFromZeroRounding(num);
};
const awayFromZeroRounding = (num) => num >= 0 ? Math.trunc(num + 0.5) : Math.trunc(num - 0.5);
function numberToBigInt(num) {
  return BigInt(awayFromZeroRounding(num));
}
function perpendicDistFromLineSqrd(pt, line1, line2) {
  if (isPoint64(pt) && isPoint64(line1) && isPoint64(line2)) {
    return perpendicDistFromLineSqrd64(pt, line1, line2);
  } else if (isPointD(pt) && isPointD(line1) && isPointD(line2)) {
    return perpendicDistFromLineSqrdD(pt, line1, line2);
  } else {
    throw new TypeError(
      "Invalid argument types. Argument pt and line1 and line2 are must be of same point type."
    );
  }
}
function perpendicDistFromLineSqrd64(pt, line1, line2) {
  const x2 = line2.x - line1.x;
  const y2 = line2.y - line1.y;
  if (x2 === 0n && y2 === 0n) {
    return 0;
  }
  const x1 = pt.x - line1.x;
  const y1 = pt.y - line1.y;
  return sqr(Number(x1 * y2 - x2 * y1)) / Number(x2 * x2 + y2 * y2);
}
function perpendicDistFromLineSqrdD(pt, line1, line2) {
  const x2 = line2.x - line1.x;
  const y2 = line2.y - line1.y;
  if (x2 === 0 && y2 === 0) {
    return 0;
  }
  const x1 = pt.x - line1.x;
  const y1 = pt.y - line1.y;
  return sqr(x1 * y2 - x2 * y1) / (x2 * x2 + y2 * y2);
}
function sqr(value) {
  return value * value;
}
function rdp(path, begin, end, epsSqrd, flags) {
  let idx = 0;
  let max_d = 0;
  if (isPath64(path)) {
    const beginPt = path.getClone(begin);
    while (end > begin && Point64.equals(beginPt, path.getClone(end))) {
      flags[end--] = false;
    }
    const endPt = path.get(end);
    for (let i = begin + 1; i < end; i++) {
      const d = perpendicDistFromLineSqrd64(path.getClone(i), beginPt, endPt);
      if (d <= max_d) {
        continue;
      }
      max_d = d;
      idx = i;
    }
    if (max_d <= epsSqrd) {
      return;
    }
    flags[idx] = true;
    if (idx > begin + 1) {
      rdp(path, begin, idx, epsSqrd, flags);
    }
    if (idx < end - 1) {
      rdp(path, idx, end, epsSqrd, flags);
    }
  } else if (isPathD(path)) {
    const beginPt = path.getClone(begin);
    while (end > begin && PointD.equals(beginPt, path.getClone(end))) {
      flags[end--] = false;
    }
    const endPt = path.getClone(end);
    for (let i = begin + 1; i < end; i++) {
      const d = perpendicDistFromLineSqrdD(path.getClone(i), beginPt, endPt);
      if (d <= max_d) {
        continue;
      }
      max_d = d;
      idx = i;
    }
    if (max_d <= epsSqrd) {
      return;
    }
    flags[idx] = true;
    if (idx > begin + 1) {
      rdp(path, begin, idx, epsSqrd, flags);
    }
    if (idx < end - 1) {
      rdp(path, idx, end, epsSqrd, flags);
    }
  } else {
    throw new TypeError("Invalid argument types.");
  }
}
const invalidRect64 = () => new Rect64(false);
const invalidRectD = () => new RectD(false);
function intersect(subject, clip, fillRule, precision = 2) {
  return booleanOp(
    ClipType.Intersection,
    subject,
    clip,
    fillRule,
    precision
  );
}
function union(subject, fillRuleOrClip, fillRule, precision = 2) {
  if (typeof fillRuleOrClip === "number") {
    return booleanOp(
      ClipType.Union,
      subject,
      void 0,
      fillRuleOrClip,
      precision
    );
  } else {
    return booleanOp(
      ClipType.Union,
      subject,
      fillRuleOrClip,
      fillRule,
      precision
    );
  }
}
function difference(subject, clip, fillRule, precision = 2) {
  return booleanOp(ClipType.Difference, subject, clip, fillRule, precision);
}
function xor(subject, clip, fillRule, precision = 2) {
  return booleanOp(ClipType.Xor, subject, clip, fillRule, precision);
}
function booleanOp(clipType, subject, clip, fillRuleOrPolyTree, precisionOrFillRule, precision) {
  if (isPaths64(subject) && (clip === void 0 || isPaths64(clip))) {
    if (typeof fillRuleOrPolyTree === "number") {
      const solution = new Paths64();
      const c = new Clipper64();
      c.addPaths(subject, PathType.Subject);
      if (clip !== void 0) {
        c.addPaths(clip, PathType.Clip);
      }
      c.execute(clipType, fillRuleOrPolyTree, solution);
      return solution;
    } else if (fillRuleOrPolyTree instanceof PolyTree64) {
      const c = new Clipper64();
      c.addPaths(subject, PathType.Subject);
      if (clip !== void 0) {
        c.addPaths(clip, PathType.Clip);
      }
      c.execute(clipType, precisionOrFillRule, fillRuleOrPolyTree);
      return;
    }
  } else if (isPathsD(subject) && (clip === void 0 || isPathsD(clip))) {
    if (typeof fillRuleOrPolyTree === "number") {
      const solution = new PathsD();
      const c = new ClipperD(precisionOrFillRule ?? 2);
      c.addPaths(subject, PathType.Subject);
      if (clip !== void 0) {
        c.addPaths(clip, PathType.Clip);
      }
      c.execute(clipType, fillRuleOrPolyTree, solution);
      return solution;
    } else if (fillRuleOrPolyTree instanceof PolyTreeD) {
      const c = new ClipperD(precision ?? 2);
      c.addPaths(subject, PathType.Subject);
      if (clip !== void 0) {
        c.addPaths(clip, PathType.Clip);
      }
      c.execute(clipType, precisionOrFillRule, fillRuleOrPolyTree);
      return;
    }
  }
  throw new TypeError("Invalid argument types.");
}
function inflatePaths(paths, delta, joinType, endType, miterLimit = 2, precision = 2) {
  if (isPaths64(paths)) {
    const co = new ClipperOffset(miterLimit);
    co.addPaths(paths, joinType, endType);
    const solution = new Paths64();
    co.execute(delta, solution);
    return solution;
  } else if (isPathsD(paths)) {
    checkPrecision(precision);
    const scale = Math.pow(10, precision);
    const tmp = scalePaths64(paths, scale);
    const co = new ClipperOffset(miterLimit);
    co.addPaths(tmp, joinType, endType);
    co.execute(delta * scale, tmp);
    return scalePathsD(tmp, 1 / scale);
  }
  throw new TypeError("Invalid argument types.");
}
function rectClip(rect, pathOrPaths, precision = 2) {
  if (isRect64(rect) && (isPaths64(pathOrPaths) || isPath64(pathOrPaths))) {
    if (rect.isEmpty() || pathOrPaths.length === 0) {
      return new Paths64();
    }
    let paths;
    if (isPaths64(pathOrPaths)) {
      paths = Paths64.clone(pathOrPaths);
    } else {
      paths = Paths64.clone([pathOrPaths]);
    }
    const rc = new RectClip64(rect);
    return rc.execute(paths);
  } else if (isRectD(rect) && (isPathsD(pathOrPaths) || isPathD(pathOrPaths))) {
    checkPrecision(precision);
    if (rect.isEmpty() || pathOrPaths.length === 0) {
      return new PathsD();
    }
    const scale = Math.pow(10, precision);
    let tmpPath;
    if (isPathsD(pathOrPaths)) {
      tmpPath = scalePaths64(pathOrPaths, scale);
    } else {
      tmpPath = new Paths64();
      tmpPath.push(scalePath64(pathOrPaths, scale));
    }
    const r = scaleRect(rect, scale);
    const rc = new RectClip64(r);
    tmpPath = rc.execute(tmpPath);
    return scalePathsD(tmpPath, 1 / scale);
  }
  throw new TypeError("Invalid argument types.");
}
function rectClipLines(rect, pathOrPaths, precision = 2) {
  if (isRect64(rect) && (isPaths64(pathOrPaths) || isPath64(pathOrPaths))) {
    if (rect.isEmpty() || pathOrPaths.length === 0) {
      return new Paths64();
    }
    let paths;
    if (isPaths64(pathOrPaths)) {
      paths = pathOrPaths;
    } else {
      paths = new Paths64();
      paths.push(pathOrPaths);
    }
    const rc = new RectClipLines64(rect);
    return rc.execute(paths);
  } else if (isRectD(rect) && (isPathsD(pathOrPaths) || isPathD(pathOrPaths))) {
    checkPrecision(precision);
    if (rect.isEmpty() || pathOrPaths.length === 0) {
      return new PathsD();
    }
    const scale = Math.pow(10, precision);
    let tmpPath;
    if (isPathsD(pathOrPaths)) {
      tmpPath = scalePaths64(pathOrPaths, scale);
    } else {
      tmpPath = new Paths64();
      tmpPath.push(scalePath64(pathOrPaths, scale));
    }
    const r = scaleRect(rect, scale);
    const rc = new RectClipLines64(r);
    tmpPath = rc.execute(tmpPath);
    return scalePathsD(tmpPath, 1 / scale);
  }
  throw new TypeError("Invalid argument types.");
}
function minkowskiSum(pattern, path, isClosed) {
  return sum(pattern, path, isClosed);
}
function minkowskiDiff(pattern, path, isClosed) {
  return diff(pattern, path, isClosed);
}
function area(pathOrPaths) {
  let resultArea = 0;
  if (isPaths64(pathOrPaths) || isPathsD(pathOrPaths)) {
    for (const path of pathOrPaths) {
      resultArea += area(path);
    }
  } else if (isPath64(pathOrPaths)) {
    if (pathOrPaths.length < 3) {
      return 0;
    }
    let prevX = pathOrPaths.getX(pathOrPaths.length - 1);
    let prevY = pathOrPaths.getY(pathOrPaths.length - 1);
    for (let i = 0, len = pathOrPaths.length; i < len; i++) {
      const currX = pathOrPaths.getX(i);
      const currY = pathOrPaths.getY(i);
      resultArea += Number((prevY + currY) * (prevX - currX));
      prevX = currX;
      prevY = currY;
    }
    resultArea *= 0.5;
  } else if (isPathD(pathOrPaths)) {
    if (pathOrPaths.length < 3) {
      return 0;
    }
    let prevX = pathOrPaths.getX(pathOrPaths.length - 1);
    let prevY = pathOrPaths.getY(pathOrPaths.length - 1);
    for (let i = 0, len = pathOrPaths.length; i < len; i++) {
      const currX = pathOrPaths.getX(i);
      const currY = pathOrPaths.getY(i);
      resultArea += (prevY + currY) * (prevX - currX);
      prevX = currX;
      prevY = currY;
    }
    resultArea *= 0.5;
  } else {
    throw new TypeError("Invalid argument types.");
  }
  return resultArea;
}
function isPositive(path) {
  return area(path) >= 0;
}
function path64ToString(path) {
  let result = "";
  for (const pt of path) {
    result += Point64.toString(pt);
  }
  return result + "\n";
}
function paths64ToString(paths) {
  let result = "";
  for (const path of paths) {
    result += path64ToString(path);
  }
  return result;
}
function pathDToString(path) {
  let result = "";
  for (const pt of path) {
    result += PointD.toString(pt);
  }
  return result + "\n";
}
function pathsDToString(paths) {
  let result = "";
  for (const path of paths) {
    result += pathDToString(path);
  }
  return result;
}
function offsetPath(path, dx, dy) {
  const result = new Path64TypedArray();
  for (let i = 0, len = path.length; i < len; i++) {
    result.push({ x: path.getX(i) + dx, y: path.getY(i) + dy });
  }
  return result;
}
function scalePoint64(pt, scale) {
  return {
    x: numberToBigInt(Number(pt.x) * scale),
    y: numberToBigInt(Number(pt.y) * scale)
  };
}
function scalePointD(pt, scale) {
  return {
    x: Number(pt.x) * scale,
    y: Number(pt.y) * scale
  };
}
function scaleRect(rec, scale) {
  return new Rect64(
    numberToBigInt(rec.left * scale),
    numberToBigInt(rec.top * scale),
    numberToBigInt(rec.right * scale),
    numberToBigInt(rec.bottom * scale)
  );
}
function scalePath(path, scale) {
  if (isPath64(path)) {
    if (isAlmostZero(scale - 1)) {
      return path.clone();
    }
    const result = new Path64TypedArray(path.length);
    for (let i = 0, len = path.length; i < len; i++) {
      result.push({
        x: numberToBigInt(Number(path.getX(i)) * scale),
        y: numberToBigInt(Number(path.getY(i)) * scale)
      });
    }
    return result;
  } else if (isPathD(path)) {
    if (isAlmostZero(scale - 1)) {
      return path.clone();
    }
    const result = new PathDTypedArray(path.length);
    for (let i = 0, len = path.length; i < len; i++) {
      result.push({ x: path.getX(i) * scale, y: path.getY(i) * scale });
    }
    return result;
  }
  throw new TypeError("Invalid argument types.");
}
function scalePaths(paths, scale) {
  if (isPaths64(paths)) {
    if (isAlmostZero(scale - 1)) {
      return Paths64.clone(paths);
    }
    const result = new Paths64();
    for (const path of paths) {
      const tmpPath = new Path64TypedArray(path.length);
      for (let i = 0, len = path.length; i < len; i++) {
        tmpPath.push({
          x: numberToBigInt(Number(path.getX(i)) * scale),
          y: numberToBigInt(Number(path.getY(i)) * scale)
        });
      }
      result.push(tmpPath);
    }
    return result;
  } else if (isPathsD(paths)) {
    if (isAlmostZero(scale - 1)) {
      return PathsD.clone(paths);
    }
    const result = new PathsD();
    for (const path of paths) {
      const tmpPath = new PathDTypedArray(path.length);
      for (let i = 0, len = path.length; i < len; i++) {
        tmpPath.push({ x: path.getX(i) * scale, y: path.getY(i) * scale });
      }
      result.push(tmpPath);
    }
    return result;
  }
  throw new TypeError("Invalid argument types.");
}
function scalePath64(path, scale) {
  const result = new Path64TypedArray(path.length);
  for (let i = 0, len = path.length; i < len; i++) {
    result.push({
      x: numberToBigInt(path.getX(i) * scale),
      y: numberToBigInt(path.getY(i) * scale)
    });
  }
  return result;
}
function scalePathD(path, scale) {
  const result = new PathDTypedArray(path.length);
  for (let i = 0, len = path.length; i < len; i++) {
    result.push({
      x: Number(path.getX(i)) * scale,
      y: Number(path.getY(i)) * scale
    });
  }
  return result;
}
function scalePaths64(paths, scale) {
  const result = new Paths64();
  for (const path of paths) {
    result.push(scalePath64(path, scale));
  }
  return result;
}
function scalePathsD(paths, scale) {
  const result = new PathsD();
  for (const path of paths) {
    result.push(scalePathD(path, scale));
  }
  return result;
}
function path64(path) {
  return scalePath64(path, 1);
}
function paths64(paths) {
  return scalePaths64(paths, 1);
}
function pathD(path) {
  return scalePathD(path, 1);
}
function pathsD(paths) {
  return scalePathsD(paths, 1);
}
function translatePath(path, dx, dy) {
  if (isPath64(path) && typeof dx === "bigint" && typeof dy === "bigint") {
    const result = new Path64TypedArray();
    for (let i = 0, len = path.length; i < len; i++) {
      result.push({ x: path.getX(i) + dx, y: path.getY(i) + dy });
    }
    return result;
  } else if (isPathD(path) && typeof dx === "number" && typeof dy === "number") {
    const result = new PathDTypedArray();
    for (let i = 0, len = path.length; i < len; i++) {
      result.push({ x: path.getX(i) + dx, y: path.getY(i) + dy });
    }
    return result;
  }
  throw new TypeError("Invalid argument types.");
}
function translatePaths(paths, dx, dy) {
  if (isPaths64(paths) && typeof dx === "bigint" && typeof dy === "bigint") {
    const result = new Paths64();
    for (const path of paths) {
      result.push(translatePath(path, dx, dy));
    }
    return result;
  } else if (isPathsD(paths) && typeof dx === "number" && typeof dy === "number") {
    const result = new PathsD();
    for (const path of paths) {
      result.push(translatePath(path, dx, dy));
    }
    return result;
  }
  throw new TypeError("Invalid argument types.");
}
function reversePath(path) {
  if (isPath64(path)) {
    const result = new Path64TypedArray();
    for (let i = path.length - 1; i >= 0; i--) {
      result.push(path.getClone(i));
    }
    return result;
  } else if (isPathD(path)) {
    const result = new PathDTypedArray();
    for (let i = path.length - 1; i >= 0; i--) {
      result.push(path.getClone(i));
    }
    return result;
  }
  throw new TypeError("Invalid argument types.");
}
function reversePaths(paths) {
  if (isPaths64(paths)) {
    const result = new Paths64();
    for (const path of paths) {
      result.push(reversePath(path));
    }
    return result;
  } else if (isPathsD(paths)) {
    const result = new PathsD();
    for (const path of paths) {
      result.push(reversePath(path));
    }
    return result;
  }
  throw new TypeError("Invalid argument types.");
}
function getBounds(pathOrPaths) {
  if (isPaths64(pathOrPaths)) {
    const result = invalidRect64();
    for (const path of pathOrPaths) {
      for (let i = 0, len = path.length; i < len; i++) {
        if (path.getX(i) < result.left) {
          result.left = path.getX(i);
        }
        if (path.getX(i) > result.right) {
          result.right = path.getX(i);
        }
        if (path.getY(i) < result.top) {
          result.top = path.getY(i);
        }
        if (path.getY(i) > result.bottom) {
          result.bottom = path.getY(i);
        }
      }
    }
    return result.left === 9223372036854775807n ? new Rect64() : result;
  } else if (isPath64(pathOrPaths)) {
    const result = invalidRect64();
    for (let i = 0, len = pathOrPaths.length; i < len; i++) {
      if (pathOrPaths.getX(i) < result.left) {
        result.left = pathOrPaths.getX(i);
      }
      if (pathOrPaths.getX(i) > result.right) {
        result.right = pathOrPaths.getX(i);
      }
      if (pathOrPaths.getY(i) < result.top) {
        result.top = pathOrPaths.getY(i);
      }
      if (pathOrPaths.getY(i) > result.bottom) {
        result.bottom = pathOrPaths.getY(i);
      }
    }
    return result.left === 9223372036854775807n ? new Rect64() : result;
  } else if (isPathsD(pathOrPaths)) {
    const result = invalidRectD();
    for (const path of pathOrPaths) {
      for (let i = 0, len = path.length; i < len; i++) {
        if (path.getX(i) < result.left) {
          result.left = path.getX(i);
        }
        if (path.getX(i) > result.right) {
          result.right = path.getX(i);
        }
        if (path.getY(i) < result.top) {
          result.top = path.getY(i);
        }
        if (path.getY(i) > result.bottom) {
          result.bottom = path.getY(i);
        }
      }
    }
    return result.left === Infinity ? new RectD() : result;
  } else if (isPathD(pathOrPaths)) {
    const result = invalidRectD();
    for (let i = 0, len = pathOrPaths.length; i < len; i++) {
      if (pathOrPaths.getX(i) < result.left) {
        result.left = pathOrPaths.getX(i);
      }
      if (pathOrPaths.getX(i) > result.right) {
        result.right = pathOrPaths.getX(i);
      }
      if (pathOrPaths.getY(i) < result.top) {
        result.top = pathOrPaths.getY(i);
      }
      if (pathOrPaths.getY(i) > result.bottom) {
        result.bottom = pathOrPaths.getY(i);
      }
    }
    return result.left === Infinity ? new RectD() : result;
  }
  throw new TypeError("Invalid argument types.");
}
function makePath64(arr) {
  const path = new Path64TypedArray();
  for (let i = 0; i < arr.length; i = i + 2) {
    path.push({ x: BigInt(arr[i]), y: BigInt(arr[i + 1]) });
  }
  return path;
}
function makePathD(arr) {
  const path = new PathDTypedArray();
  for (let i = 0; i < arr.length; i = i + 2) {
    path.push({ x: arr[i], y: arr[i + 1] });
  }
  return path;
}
function pointsNearEqual(pt1, pt2, distanceSqrd) {
  return sqr(pt1.x - pt2.x) + sqr(pt1.y - pt2.y) < distanceSqrd;
}
function stripNearDuplicates(path, minEdgeLenSqrd, isClosedPath) {
  const cnt = path.length;
  const result = new PathDTypedArray();
  if (cnt === 0) {
    return result;
  }
  let lastPt = path.getClone(0);
  result.push(lastPt);
  for (let i = 1; i < cnt; i++) {
    if (!pointsNearEqual(lastPt, path.getClone(i), minEdgeLenSqrd)) {
      lastPt = path.getClone(i);
      result.push(lastPt);
    }
  }
  if (isClosedPath && pointsNearEqual(lastPt, result.getClone(0), minEdgeLenSqrd)) {
    result.pop();
  }
  return result;
}
function stripDuplicates(path, isClosedPath) {
  const cnt = path.length;
  const result = new Path64TypedArray();
  if (cnt === 0) {
    return result;
  }
  let lastPt = path.getClone(0);
  result.push(lastPt);
  for (let i = 1; i < cnt; i++) {
    if (Point64.notEquals(lastPt, path.getClone(i))) {
      lastPt = path.getClone(i);
      result.push(lastPt);
    }
  }
  if (isClosedPath && Point64.equals(lastPt, path.getClone(0))) {
    result.pop();
  }
  return result;
}
function addPolyNodeToPaths(polyPath, paths) {
  if (polyPath.polygon.length > 0) {
    paths.push(polyPath.polygon);
  }
  for (let i = 0; i < polyPath.length; i++) {
    addPolyNodeToPaths(polyPath._childs[i], paths);
  }
}
function polyTreeToPaths64(polyTree) {
  const result = new Paths64();
  for (let i = 0; i < polyTree.length; i++) {
    addPolyNodeToPaths(polyTree._childs[i], result);
  }
  return result;
}
function addPolyNodeToPathsD(polyPath, paths) {
  if (polyPath.polygon.length > 0) {
    paths.push(polyPath.polygon);
  }
  for (let i = 0; i < polyPath.length; i++) {
    addPolyNodeToPathsD(polyPath._childs[i], paths);
  }
}
function polyTreeToPathsD(polyTree) {
  const result = new PathsD();
  for (let i = 0; i < polyTree.length; i++) {
    addPolyNodeToPathsD(polyTree._childs[i], result);
  }
  return result;
}
function ramerDouglasPeucker(pathOrPaths, epsilon) {
  if (isPaths64(pathOrPaths)) {
    const result = new Paths64();
    for (const path of pathOrPaths) {
      result.push(ramerDouglasPeucker(path, epsilon));
    }
    return result;
  } else if (isPathsD(pathOrPaths)) {
    const result = new PathsD();
    for (const path of pathOrPaths) {
      result.push(ramerDouglasPeucker(path, epsilon));
    }
    return result;
  } else if (isPath64(pathOrPaths)) {
    const len = pathOrPaths.length;
    if (len < 5) {
      return pathOrPaths.clone();
    }
    const result = new Path64TypedArray();
    const flags = Array.from(
      { length: len, [0]: true, [len - 1]: true },
      (val) => val ?? false
    );
    rdp(pathOrPaths, 0, len - 1, sqr(epsilon), flags);
    for (let i = 0; i < len; i++) {
      if (flags[i]) {
        result.push(pathOrPaths.getClone(i));
      }
    }
    return result;
  } else if (isPathD(pathOrPaths)) {
    const len = pathOrPaths.length;
    if (len < 5) {
      return pathOrPaths.clone();
    }
    const result = new PathDTypedArray();
    const flags = Array.from(
      { length: len, [0]: true, [len - 1]: true },
      (val) => val ?? false
    );
    rdp(pathOrPaths, 0, len - 1, sqr(epsilon), flags);
    for (let i = 0; i < len; i++) {
      if (flags[i]) {
        result.push(pathOrPaths.getClone(i));
      }
    }
    return result;
  }
  throw new TypeError("Invalid argument types.");
}
function getNext(current, high, flags) {
  current++;
  const len = flags.length;
  if (high >= len) {
    throw new RangeError("Invalid array length.");
  }
  while (current <= high && flags[current]) {
    current++;
  }
  if (current <= high) {
    return current;
  }
  current = 0;
  while (flags[current] && current < len) {
    current++;
  }
  if (current >= len) {
    throw new RangeError("Invalid array length.");
  }
  return current;
}
function getPrior(current, high, flags) {
  const len = flags.length;
  if (high >= len) {
    throw new RangeError("Invalid array length.");
  }
  current = current === 0 ? high : current - 1;
  while (current > 0 && flags[current]) {
    current--;
  }
  if (!flags[current]) {
    return current;
  }
  current = high;
  while (current >= 0 && flags[current]) {
    current--;
  }
  if (current < 0) {
    throw new RangeError("Invalid array length.");
  }
  return current;
}
function simplifyPath(path, epsilon, isClosedPath) {
  const len = path.length;
  const high = len - 1;
  const epsSqr = sqr(epsilon);
  if (isPath64(path)) {
    if (len < 4) {
      return path.clone();
    }
    isClosedPath ?? (isClosedPath = false);
    const flags = Array.from({ length: len }, () => false);
    const dsq = Array.from({ length: len }, () => 0);
    let prev = high;
    let curr = 0;
    let start;
    let next;
    let prior2;
    let next2;
    if (isClosedPath) {
      dsq[0] = perpendicDistFromLineSqrd64(
        path.getClone(0),
        path.getClone(high),
        path.getClone(1)
      );
      dsq[high] = perpendicDistFromLineSqrd64(
        path.getClone(high),
        path.getClone(0),
        path.getClone(high - 1)
      );
    } else {
      dsq[0] = Infinity;
      dsq[high] = Infinity;
    }
    for (let i = 1; i < high; i++) {
      dsq[i] = perpendicDistFromLineSqrd64(
        path.getClone(i),
        path.getClone(i - 1),
        path.getClone(i + 1)
      );
    }
    while (true) {
      if (dsq[curr] > epsSqr) {
        start = curr;
        do {
          curr = getNext(curr, high, flags);
        } while (curr !== start && dsq[curr] > epsSqr);
        if (curr === start) {
          break;
        }
      }
      prev = getPrior(curr, high, flags);
      next = getNext(curr, high, flags);
      if (next === prev) {
        break;
      }
      if (dsq[next] < dsq[curr]) {
        flags[next] = true;
        next = getNext(next, high, flags);
        next2 = getNext(next, high, flags);
        dsq[curr] = perpendicDistFromLineSqrd64(
          path.getClone(curr),
          path.getClone(prev),
          path.getClone(next)
        );
        if (next !== high || isClosedPath) {
          dsq[curr] = perpendicDistFromLineSqrd64(
            path.getClone(next),
            path.getClone(curr),
            path.getClone(next2)
          );
        }
        curr = next;
      } else {
        flags[curr] = true;
        curr = next;
        next = getNext(next, high, flags);
        prior2 = getNext(prev, high, flags);
        dsq[curr] = perpendicDistFromLineSqrd64(
          path.getClone(curr),
          path.getClone(prev),
          path.getClone(next)
        );
        if (prev !== 0 || isClosedPath) {
          dsq[prev] = perpendicDistFromLineSqrd64(
            path.getClone(prev),
            path.getClone(prior2),
            path.getClone(curr)
          );
        }
      }
    }
    const result = new Path64TypedArray();
    for (let i = 0; i < len; i++) {
      if (!flags[i]) {
        result.push(path.getClone(i));
      }
    }
    return result;
  } else if (isPathD(path)) {
    if (len < 4) {
      return path.clone();
    }
    isClosedPath ?? (isClosedPath = true);
    const flags = Array.from({ length: len }, () => false);
    const dsq = Array.from({ length: len }, () => 0);
    let prev = high;
    let curr = 0;
    let start;
    let next;
    let prior2;
    let next2;
    if (isClosedPath) {
      dsq[0] = perpendicDistFromLineSqrdD(
        path.getClone(0),
        path.getClone(high),
        path.getClone(1)
      );
      dsq[high] = perpendicDistFromLineSqrdD(
        path.getClone(high),
        path.getClone(0),
        path.getClone(high - 1)
      );
    } else {
      dsq[0] = Infinity;
      dsq[high] = Infinity;
    }
    for (let i = 1; i < high; i++) {
      dsq[i] = perpendicDistFromLineSqrdD(
        path.getClone(i),
        path.getClone(i - 1),
        path.getClone(i + 1)
      );
    }
    while (true) {
      if (dsq[curr] > epsSqr) {
        start = curr;
        do {
          curr = getNext(curr, high, flags);
        } while (curr !== start && dsq[curr] > epsSqr);
        if (curr === start) {
          break;
        }
      }
      prev = getPrior(curr, high, flags);
      next = getNext(curr, high, flags);
      if (next === prev) {
        break;
      }
      if (dsq[next] < dsq[curr]) {
        flags[next] = true;
        next = getNext(next, high, flags);
        next2 = getNext(next, high, flags);
        dsq[curr] = perpendicDistFromLineSqrdD(
          path.getClone(curr),
          path.getClone(prev),
          path.getClone(next)
        );
        if (next !== high || isClosedPath) {
          dsq[curr] = perpendicDistFromLineSqrdD(
            path.getClone(next),
            path.getClone(curr),
            path.getClone(next2)
          );
        }
        curr = next;
      } else {
        flags[curr] = true;
        curr = next;
        next = getNext(next, high, flags);
        prior2 = getNext(prev, high, flags);
        dsq[curr] = perpendicDistFromLineSqrdD(
          path.getClone(curr),
          path.getClone(prev),
          path.getClone(next)
        );
        if (prev !== 0 || isClosedPath) {
          dsq[prev] = perpendicDistFromLineSqrdD(
            path.getClone(prev),
            path.getClone(prior2),
            path.getClone(curr)
          );
        }
      }
    }
    const result = new PathDTypedArray();
    for (let i = 0; i < len; i++) {
      if (!flags[i]) {
        result.push(path.getClone(i));
      }
    }
    return result;
  } else {
    throw new TypeError("Invalid argument types.");
  }
}
function simplifyPaths(paths, epsilon, isClosedPaths) {
  if (isPaths64(paths)) {
    const result = new Paths64();
    for (const path of paths) {
      result.push(simplifyPath(path, epsilon, isClosedPaths));
    }
    return result;
  } else if (isPathsD(paths)) {
    const result = new PathsD();
    for (const path of paths) {
      result.push(simplifyPath(path, epsilon, isClosedPaths));
    }
    return result;
  }
  throw new TypeError("Invalid argument types.");
}
function trimCollinear(path, isOpenOrPrecision, mayBeIsOpen = false) {
  let precision;
  let isOpen2;
  if (isPathD(path) && isOpenOrPrecision !== void 0 && typeof isOpenOrPrecision === "number") {
    precision = isOpenOrPrecision;
    isOpen2 = mayBeIsOpen;
    checkPrecision(precision);
    const scale = Math.pow(10, precision);
    let p = scalePath64(path, scale);
    p = trimCollinear(p, isOpen2);
    return scalePathD(p, 1 / scale);
  } else if (isPath64(path) && (isOpenOrPrecision === void 0 || typeof isOpenOrPrecision === "boolean")) {
    isOpen2 = isOpenOrPrecision ?? false;
    let len = path.length;
    let i = 0;
    if (!isOpen2) {
      while (i < len - 1 && crossProduct64(
        path.getClone(len - 1),
        path.getClone(i),
        path.getClone(i + 1)
      ) === 0n) {
        i++;
      }
      while (i < len - 1 && crossProduct64(
        path.getClone(len - 2),
        path.getClone(len - 1),
        path.getClone(i)
      ) === 0n) {
        len--;
      }
    }
    if (len - i < 3) {
      if (!isOpen2 || len < 2 || Point64.equals(path.getClone(0), path.getClone(1))) {
        return new Path64TypedArray();
      }
      return path.clone();
    }
    const result = new Path64TypedArray();
    let last = path.getClone(i);
    result.push(last);
    for (i++; i < len - 1; i++) {
      if (crossProduct64(last, path.getClone(i), path.getClone(i + 1)) === 0n) {
        continue;
      }
      last = path.getClone(i);
      result.push(last);
    }
    if (isOpen2) {
      result.push(path.getClone(len - 1));
    } else if (crossProduct64(last, path.getClone(len - 1), result.getClone(0)) !== 0n) {
      result.push(path.getClone(len - 1));
    } else {
      const startPt = result.getClone(0);
      while (result.length > 2 && crossProduct64(
        result.getClone(result.length - 1),
        result.getClone(result.length - 2),
        startPt
      ) === 0n) {
        result.pop();
      }
      if (result.length < 3) {
        result.clear();
      }
    }
    return result;
  }
  throw new TypeError("Invalid argument types.");
}
function pointInPolygon(pt, polygon, precision = 2) {
  if (isPoint64(pt) && isPath64(polygon)) {
    return pointInPolygon$1(pt, polygon);
  } else if (isPointD(pt) && isPathD(polygon)) {
    checkPrecision(precision);
    const scale = Math.pow(10, precision);
    const p = Point64.createScaledPoint(pt.x, pt.y, scale);
    const path = scalePath64(polygon, scale);
    return pointInPolygon$1(p, path);
  }
  throw new TypeError("Invalid argument types.");
}
function ellipse(center, radiusX, radiusY, steps) {
  if (isPoint64(center)) {
    return ellipse64(center, radiusX, radiusY, steps);
  } else if (isPointD(center)) {
    return ellipseD(center, radiusX, radiusY, steps);
  }
  throw new TypeError("Invalid argument types.");
}
function ellipse64(center, radiusX, radiusY = 0, steps = 0) {
  if (radiusX <= 0) {
    return new Path64TypedArray();
  }
  if (radiusY <= 0) {
    radiusY = radiusX;
  }
  if (steps <= 2) {
    steps = Math.ceil(Math.PI * Math.sqrt((radiusX + radiusY) / 2));
  }
  const si = Math.sin(2 * Math.PI / steps);
  const co = Math.cos(2 * Math.PI / steps);
  let dx = co;
  let dy = si;
  const centerX = center.x;
  const centerY = center.y;
  const result = new Path64TypedArray(steps);
  result.push({ x: centerX + numberToBigInt(radiusX), y: centerY });
  for (let i = 1; i < steps; i++) {
    result.push({
      x: centerX + numberToBigInt(radiusX * dx),
      y: centerY + numberToBigInt(radiusY * dy)
    });
    const x = dx * co - dy * si;
    dy = dy * co + dx * si;
    dx = x;
  }
  return result;
}
function ellipseD(center, radiusX, radiusY = 0, steps = 0) {
  if (radiusX <= 0) {
    return new PathDTypedArray();
  }
  if (radiusY <= 0) {
    radiusY = radiusX;
  }
  if (steps <= 2) {
    steps = Math.ceil(Math.PI * Math.sqrt((radiusX + radiusY) / 2));
  }
  const si = Math.sin(2 * Math.PI / steps);
  const co = Math.cos(2 * Math.PI / steps);
  let dx = co;
  let dy = si;
  const centerX = center.x;
  const centerY = center.y;
  const result = new PathDTypedArray(steps);
  result.push({ x: centerX + radiusX, y: center.y });
  for (let i = 1; i < steps; i++) {
    result.push({ x: centerX + radiusX * dx, y: centerY + radiusY * dy });
    const x = dx * co - dy * si;
    dy = dy * co + dx * si;
    dx = x;
  }
  return result;
}
function showPolyPathStructure(pp, level) {
  const spaces = " ".repeat(level * 2);
  const caption = pp.getIsHole() ? "Hole " : "Outer ";
  if (pp.length === 0) {
    console.log(spaces + caption);
  } else {
    console.log(spaces + caption + `(${pp.length})`);
    for (const child of pp) {
      showPolyPathStructure(child, level + 1);
    }
  }
}
function showPolyTreeStructure(polytree) {
  console.log("Polytree Root");
  for (const child of polytree) {
    showPolyPathStructure(child, 1);
  }
}
const Clipper = {
  invalidRect64,
  invalidRectD,
  intersect,
  union,
  difference,
  xor,
  booleanOp,
  inflatePaths,
  rectClip,
  rectClipLines,
  minkowskiSum,
  minkowskiDiff,
  area,
  isPositive,
  path64ToString,
  paths64ToString,
  pathDToString,
  pathsDToString,
  offsetPath,
  scalePoint64,
  scalePointD,
  scaleRect,
  scalePath,
  scalePaths,
  scalePath64,
  scalePaths64,
  scalePathD,
  scalePathsD,
  path64,
  paths64,
  pathsD,
  pathD,
  translatePath,
  translatePaths,
  reversePath,
  reversePaths,
  getBounds,
  makePath64,
  makePathD,
  sqr,
  pointsNearEqual,
  stripNearDuplicates,
  stripDuplicates,
  addPolyNodeToPaths,
  polyTreeToPaths64,
  addPolyNodeToPathsD,
  polyTreeToPathsD,
  perpendicDistFromLineSqrd,
  ramerDouglasPeucker,
  simplifyPath,
  simplifyPaths,
  trimCollinear,
  pointInPolygon,
  ellipse,
  showPolyTreeStructure
};
exports.ClipType = ClipType;
exports.Clipper = Clipper;
exports.Clipper64 = Clipper64;
exports.ClipperBase = ClipperBase;
exports.ClipperD = ClipperD;
exports.ClipperOffset = ClipperOffset;
exports.EndType = EndType;
exports.FillRule = FillRule;
exports.InternalClipper = InternalClipper;
exports.JoinType = JoinType;
exports.Minkowski = Minkowski;
exports.Path64 = Path64;
exports.Path64TypedArray = Path64TypedArray;
exports.PathD = PathD;
exports.PathDTypedArray = PathDTypedArray;
exports.PathType = PathType;
exports.Paths64 = Paths64;
exports.PathsD = PathsD;
exports.Point64 = Point64;
exports.PointD = PointD;
exports.PointInPolygonResult = PointInPolygonResult;
exports.PolyPath64 = PolyPath64;
exports.PolyPathBase = PolyPathBase;
exports.PolyPathD = PolyPathD;
exports.PolyTree64 = PolyTree64;
exports.PolyTreeD = PolyTreeD;
exports.Rect64 = Rect64;
exports.RectClip64 = RectClip64;
exports.RectClipLines64 = RectClipLines64;
exports.RectD = RectD;
exports.isPath64 = isPath64;
exports.isPathD = isPathD;
exports.isPaths64 = isPaths64;
exports.isPathsD = isPathsD;
exports.isPoint64 = isPoint64;
exports.isPointD = isPointD;
exports.isRect64 = isRect64;
exports.isRectD = isRectD;
