import { numberToBigInt } from "../Clipper";
import { IScalablePath } from "./IScalablePath";
import { Path64Base, Path64TypeName } from "./Path64Base";
import { Point64 } from "./Point64";

const Point64Proxy = (
  innerObj: Path64TypedArray,
  index: number,
): ProxyHandler<Point64> => ({
  get(_target: any, prop: string, _receiver: Point64) {
    if (typeof prop === "string") {
      if (prop === "x") {
        return innerObj.getX(index);
      } else if (prop === "y") {
        return innerObj.getY(index);
      }
    }
    return undefined;
  },
  set(_target: any, prop: string, value: any, _receiver: Point64) {
    if (typeof prop === "string") {
      if (prop === "x") {
        innerObj.setX(index, value);
        return true;
      } else if (prop === "y") {
        innerObj.setY(index, value);
        return true;
      }
    }
    throw new TypeError();
  },
  has(_target, prop: string | symbol) {
    return (["x", "y"] as (string | symbol)[]).includes(prop);
  },
});

export class Path64TypedArray implements Path64Base, IScalablePath {
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

  _push(path: Point64) {
    if (this._realLength === this._innerLength) {
      const newLength = Math.ceil(this._realLength * 2);
      const newPath = new BigInt64Array(newLength * 2 /* x,y */);
      newPath.set(this._path);

      this._path = newPath;
      this._realLength = newLength;
    }
    this._path[this._innerLength * 2] = path.x;
    this._path[this._innerLength * 2 + 1] = path.y;
    this._innerLength++;
  }

  get(index: number): Point64 {
    if (index < 0 || index >= this._innerLength) {
      throw new RangeError("index over.");
    }
    return new Proxy<Point64>({} as any, Point64Proxy(this, index));
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

  *getClones() {
    for (let index = 0; index < this._innerLength; index++) {
      yield this.getClone(index);
    }
  }

  *asScaledPath64(scale: number) {
    if (scale === 1) {
      for (let index = 0; index < this._innerLength; index++) {
        yield {
          x: numberToBigInt(Number(this.getX(index)) * scale),
          y: numberToBigInt(Number(this.getY(index)) * scale),
        };
      }
    } else {
      for (let index = 0; index < this._innerLength; index++) {
        yield this.getClone(index);
      }
    }
  }

  *asScaledPathD(scale: number) {
    for (let index = 0; index < this._innerLength; index++) {
      yield {
        x: Number(this.getX(index)) * scale,
        y: Number(this.getY(index)) * scale,
      };
    }
  }

  *[Symbol.iterator]() {
    for (let index = 0; index < this._innerLength; index++) {
      yield this.get(index);
    }
  }
}
