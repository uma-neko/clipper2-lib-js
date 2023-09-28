import { numberToBigInt } from "../Clipper";
import { IScalablePath } from "./IScalablePath";
import { Path64TypedArray } from "./Path64TypedArray";
import { PathDBase, PathDTypeName } from "./PathDBase";
import { PointD } from "./PointD";

const PointDProxy = (
  innerObj: PathDTypedArray,
  index: number,
): ProxyHandler<PointD> => ({
  get(_target: any, prop: string, _receiver: PointD) {
    if (typeof prop === "string") {
      if (prop === "x") {
        return innerObj.getX(index);
      } else if (prop === "y") {
        return innerObj.getY(index);
      }
    }
    return undefined;
  },
  set(_target: any, prop: string, value: any, _receiver: PointD) {
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

export class PathDTypedArray implements PathDBase, IScalablePath {
  readonly type: typeof PathDTypeName;
  private _realLength: number;
  private _innerLength: number;
  private _path: Float64Array;

  constructor();
  constructor(arrayLength: number);
  constructor(...paths: [PathDTypedArray]);
  constructor(...paths: PointD[]);
  constructor(...args: [] | [number] | [PathDTypedArray] | PointD[]);
  constructor(...args: [] | [number] | [PathDTypedArray] | PointD[]) {
    this.type = PathDTypeName;
    if (args.length === 0) {
      const startLength = 8;
      this._realLength = startLength;
      this._innerLength = 0;
      this._path = new Float64Array(startLength * 2 /* x,y */);
    } else if (typeof args[0] === "number") {
      const startLength = args[0];
      this._realLength = startLength;
      this._innerLength = 0;
      this._path = new Float64Array(startLength * 2 /* x,y */);
    } else if (args[0] instanceof PathDTypedArray) {
      const startLength = args[0].length;
      this._innerLength = startLength;
      this._realLength = startLength;
      this._path = args[0]._path.slice(0, startLength * 2);
    } else {
      const startLength = args.length;
      this._realLength = startLength;
      this._innerLength = 0;
      this._path = new Float64Array(startLength * 2 /* x,y */);
      this.pushRange(args as PointD[]);
    }
  }

  clone() {
    return new PathDTypedArray(this);
  }

  _realloc(length: number) {
    const newPath = new Float64Array(length * 2 /* x,y */);
    newPath.set(this._path);

    this._path = newPath;
    this._realLength = length;
    if (length < this._innerLength) {
      this._innerLength = length;
    }
  }

  _push(path: PointD) {
    if (this._realLength === this._innerLength) {
      this._realloc(Math.ceil(this._realLength * 2));
    }
    this._path[this._innerLength * 2] = path.x;
    this._path[this._innerLength * 2 + 1] = path.y;
    this._innerLength++;
  }

  _pushDecomposed(x: number, y: number) {
    if (this._realLength === this._innerLength) {
      this._realloc(Math.ceil(this._realLength * 2));
    }
    this._path[this._innerLength * 2] = x;
    this._path[this._innerLength * 2 + 1] = y;
    this._innerLength++;
  }

  get(index: number): PointD {
    if (index < 0 || index >= this._innerLength) {
      throw new RangeError("index over.");
    }
    return new Proxy<PointD>({} as any, PointDProxy(this, index));
  }

  set(index: number, x: number, y: number) {
    this.setX(index, x);
    this.setY(index, y);
  }

  getClone(index: number): PointD {
    return { x: this.getX(index), y: this.getY(index) };
  }

  getX(index: number): number {
    return this._path[index * 2];
  }

  getY(index: number): number {
    return this._path[index * 2 + 1];
  }

  setX(index: number, value: number): number {
    return (this._path[index * 2] = value);
  }

  setY(index: number, value: number): number {
    return (this._path[index * 2 + 1] = value);
  }

  setChild(index: number, value: PointD) {
    const offset = (index % this._innerLength) * 2;
    this._path[offset] = value.x;
    this._path[offset + 1] = value.y;
    return true;
  }

  push(...path: PointD[]) {
    for (const pt of path) {
      this._push(pt);
    }
    return this.length;
  }

  pushRange(path: Iterable<PointD>) {
    for (const pt of path) {
      this._push(pt);
    }
    return this.length;
  }

  pop(): PointD | undefined {
    if (this._innerLength === 0) {
      return undefined;
    }

    const orig = this.get(this._innerLength);

    const result = {
      x: orig.x,
      y: orig.y,
    };

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

  asScaledPath64(scale: number) {
    const scaledPath = new Path64TypedArray(this._innerLength);
    for (let index = 0; index < this._innerLength; index++) {
      scaledPath._pushDecomposed(
        numberToBigInt(this.getX(index) * scale),
        numberToBigInt(this.getY(index) * scale),
      );
    }
    return scaledPath;
  }

  asScaledPathD(scale: number) {
    if (scale === 1) {
      return new PathDTypedArray(this);
    } else {
      const scaledPath = new PathDTypedArray(this._innerLength);
      for (let index = 0; index < this._innerLength; index++) {
        scaledPath._pushDecomposed(
          this.getX(index) * scale,
          this.getY(index) * scale,
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
