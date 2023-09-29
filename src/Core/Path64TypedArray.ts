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
  get(target: Point64ProxyInner, prop: string, _receiver: Point64) {
    if (typeof prop === "string") {
      if (prop === "x") {
        return target.source.getX(target.index);
      } else if (prop === "y") {
        return target.source.getY(target.index);
      }
    }
    return undefined;
  },
  set(
    target: Point64ProxyInner,
    prop: string,
    value: bigint,
    _receiver: Point64,
  ) {
    if (typeof prop === "string") {
      if (prop === "x") {
        target.source.setX(target.index, value);
        return true;
      } else if (prop === "y") {
        target.source.setY(target.index, value);
        return true;
      }
    }
    throw new TypeError();
  },
  has(_target: Point64ProxyInner, prop: string | symbol) {
    return (["x", "y"] as (string | symbol)[]).includes(prop);
  },
};

export class Path64TypedArray implements IPath64, IScalablePath {
  readonly type: typeof Path64TypeName;
  private _realLength: number;
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
      const startLength = 8;
      this._realLength = startLength;
      this._innerLength = 0;
      this._path = new BigInt64Array(startLength * 2 /* x,y */);
    } else if (typeof args[0] === "number") {
      const startLength = args[0];
      this._realLength = startLength;
      this._innerLength = 0;
      this._path = new BigInt64Array(startLength * 2 /* x,y */);
    } else if (args[0] instanceof Path64TypedArray) {
      const startLength = args[0].length;
      this._innerLength = startLength;
      this._realLength = startLength;
      this._path = args[0]._path.slice(0, startLength * 2);
    } else {
      const startLength = args.length;
      this._realLength = startLength;
      this._innerLength = 0;
      this._path = new BigInt64Array(startLength * 2 /* x,y */);
      this.pushRange(args as Point64[]);
    }
  }

  clone() {
    return new Path64TypedArray(this);
  }

  _realloc(length: number) {
    const newPath = new BigInt64Array(length * 2 /* x,y */);
    newPath.set(this._path);

    this._path = newPath;
    this._realLength = length;
    if (length < this._innerLength) {
      this._innerLength = length;
    }
  }

  _push(path: Point64) {
    if (this._realLength === this._innerLength) {
      this._realloc(Math.ceil(this._realLength * 2));
    }
    this._path[this._innerLength * 2] = path.x;
    this._path[this._innerLength * 2 + 1] = path.y;
    this._innerLength++;
  }

  pushDecomposed(x: bigint, y: bigint) {
    if (this._realLength === this._innerLength) {
      this._realloc(Math.ceil(this._realLength * 2));
    }
    this._path[this._innerLength * 2] = x;
    this._path[this._innerLength * 2 + 1] = y;
    this._innerLength++;
  }

  get(index: number): Point64 {
    if (index < 0 || index >= this._innerLength) {
      throw new RangeError("index over.");
    }
    return new Proxy<Point64ProxyInner, Point64>(
      { index: index, source: this },
      Point64Proxy,
    );
  }

  set(index: number, x: bigint, y: bigint) {
    this.setX(index, x);
    this.setY(index, y);
  }

  getClone(index: number): Point64 {
    return { x: this.getX(index), y: this.getY(index) };
  }

  getX(index: number): bigint {
    return this._path[index * 2];
  }

  getY(index: number): bigint {
    return this._path[index * 2 + 1];
  }

  setX(index: number, value: bigint): bigint {
    return (this._path[index * 2] = value);
  }

  setY(index: number, value: bigint): bigint {
    return (this._path[index * 2 + 1] = value);
  }

  setChild(index: number, value: Point64) {
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

    const result = this.getClone(this._innerLength);
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
