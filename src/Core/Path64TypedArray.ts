import { numberToBigInt } from "../Clipper";
import { IScalablePath } from "./IScalablePath";
import { IPath64, Path64TypeName } from "./IPath64";
import { PathDTypedArray } from "./PathDTypedArray";
import { Point64 } from "./Point64";

type Point64ProxyInner = {
  index: number;
  source: Path64TypedArray;
};

const Point64Proxy = {
  get(target: Point64ProxyInner, prop: string | symbol, _receiver: Point64) {
    if (prop === "x") {
      return target.source.getX(target.index);
    } else if (prop === "y") {
      return target.source.getY(target.index);
    }
    return undefined;
  },
  set(
    target: Point64ProxyInner,
    prop: string | symbol,
    value: bigint,
    _receiver: Point64,
  ) {
    if (prop === "x") {
      target.source.setX(target.index, value);
      return true;
    } else if (prop === "y") {
      target.source.setY(target.index, value);
      return true;
    }
    throw new Error("Properties cannot be added.");
  },
  has(_target: Point64ProxyInner, prop: string | symbol) {
    return (["x", "y"] as (string | symbol)[]).includes(prop);
  },
};

export class Path64TypedArray implements IPath64, IScalablePath {
  readonly type: typeof Path64TypeName;
  private _capacity: number;
  private _innerLength: number;
  private _path: BigInt64Array;

  constructor();
  constructor(arrayLength: number);
  constructor(...paths: [Path64TypedArray]);
  constructor(...paths: Point64[]);
  constructor(...args: [] | [number] | [Path64TypedArray] | Point64[]);

  constructor(...args: [] | [number] | [Path64TypedArray] | Point64[]) {
    this.type = Path64TypeName;
    if (args.length === 0) {
      const startCapacity = 8;
      this._capacity = startCapacity;
      this._innerLength = 0;
      this._path = new BigInt64Array(startCapacity * 2 /* x,y */);
    } else if (typeof args[0] === "number") {
      const startCapacity = args[0];
      this._capacity = startCapacity;
      this._innerLength = 0;
      this._path = new BigInt64Array(startCapacity * 2 /* x,y */);
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
      this._path = new BigInt64Array(startCapacity * 2 /* x,y */);
      this.pushRange(args as Point64[]);
    }
  }

  private _realloc(length: number) {
    const capacity = length < 8 ? 8 : length;
    const newPath = new BigInt64Array(capacity * 2 /* x,y */);
    newPath.set(this._path);

    this._path = newPath;
    this._capacity = capacity;
    if (length < this._innerLength) {
      this._innerLength = length;
    }
  }

  private _push(path: Point64) {
    if (this._capacity === this._innerLength) {
      this._realloc(Math.ceil(this._capacity * 2));
    }
    this._path[this._innerLength * 2] = path.x;
    this._path[this._innerLength * 2 + 1] = path.y;
    this._innerLength++;
  }

  private _checkLength(index: number) {
    if (index < 0 || index >= this._innerLength) {
      throw new RangeError("Invalid array length.");
    }
  }

  clone() {
    return new Path64TypedArray(this);
  }

  pushDecomposed(x: bigint, y: bigint) {
    if (this._capacity === this._innerLength) {
      this._realloc(Math.ceil(this._capacity * 2));
    }
    this._path[this._innerLength * 2] = x;
    this._path[this._innerLength * 2 + 1] = y;
    this._innerLength++;
  }

  get(index: number): Point64 {
    this._checkLength(index);
    return new Proxy<Point64ProxyInner, Point64>(
      { index: index, source: this },
      Point64Proxy,
    );
  }

  set(index: number, x: bigint, y: bigint) {
    this._checkLength(index);
    this.setX(index, x);
    this.setY(index, y);
  }

  getClone(index: number): Point64 {
    this._checkLength(index);
    return { x: this._path[index * 2], y: this._path[index * 2 + 1] };
  }

  getX(index: number): bigint {
    this._checkLength(index);
    return this._path[index * 2];
  }

  getY(index: number): bigint {
    this._checkLength(index);
    return this._path[index * 2 + 1];
  }

  setX(index: number, value: bigint): bigint {
    this._checkLength(index);
    return (this._path[index * 2] = value);
  }

  setY(index: number, value: bigint): bigint {
    this._checkLength(index);
    return (this._path[index * 2 + 1] = value);
  }

  setChild(index: number, value: Point64) {
    this._checkLength(index);
    const offset = (index % this._innerLength) * 2;
    this._path[offset] = value.x;
    this._path[offset + 1] = value.y;
    return true;
  }

  push(...path: Point64[]) {
    for (const pt of path) {
      this._push(pt);
    }
    return this.length;
  }

  pushRange(path: Iterable<Point64>) {
    for (const pt of path) {
      this._push(pt);
    }
    return this.length;
  }

  pop(): Point64 | undefined {
    if (this._innerLength === 0) {
      return undefined;
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

  asScaledPath64(scale: number) {
    if (scale === 1) {
      return new Path64TypedArray(this);
    } else {
      const scaledPath = new Path64TypedArray(this._innerLength);
      for (let index = 0; index < this._innerLength; index++) {
        scaledPath.pushDecomposed(
          numberToBigInt(Number(this.getX(index)) * scale),
          numberToBigInt(Number(this.getY(index)) * scale),
        );
      }
      return scaledPath;
    }
  }

  asScaledPathD(scale: number) {
    const scaledPath = new PathDTypedArray(this._innerLength);
    for (let index = 0; index < this._innerLength; index++) {
      scaledPath.pushDecomposed(
        Number(this.getX(index)) * scale,
        Number(this.getY(index)) * scale,
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
