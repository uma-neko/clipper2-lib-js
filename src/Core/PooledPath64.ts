import { numberToBigInt } from "../Clipper";
import { BigInt64ArrayPool } from "./BigInt64ArrayPool";
import { IPath64, Path64TypeName } from "./IPath64";
import { IScalablePath } from "./IScalablePath";
import { Path64TypedArray } from "./Path64TypedArray";
import { PathDTypedArray } from "./PathDTypedArray";
import { Point64 } from "./Point64";

type Point64ProxyInner = {
  index: number;
  source: PooledPath64;
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

export class PooledPath64 implements IPath64, IScalablePath {
  readonly type: typeof Path64TypeName;
  private _capacity: number;
  private _innerLength: number;
  private _getPath: () => BigInt64Array;
  private _realloc: (needCapacity: number) => void;

  constructor(pool: BigInt64ArrayPool) {
    this.type = Path64TypeName;
    const startCapacity = 4;
    this._capacity = startCapacity;
    this._innerLength = 0;
    const { realloc, getRef } = pool.allocChild(startCapacity);
    this._getPath = getRef;
    this._realloc = realloc;
  }

  private _push(path: Point64) {
    if (this._capacity === this._innerLength) {
      const newCapacity = Math.ceil(this._capacity * 2);
      this._realloc(newCapacity);
      this._capacity = newCapacity;
    }
    this._getPath()[this._innerLength * 2] = path.x;
    this._getPath()[this._innerLength * 2 + 1] = path.y;
    this._innerLength++;
  }

  private _checkLength(index: number) {
    if (index < 0 || index >= this._innerLength) {
      throw new RangeError("Invalid array length.");
    }
  }

  clone() {
    const scaledPath = new Path64TypedArray(this._innerLength);
    for (let index = 0; index < this._innerLength; index++) {
      scaledPath.pushDecomposed(this.getX(index), this.getY(index));
    }
    return scaledPath;
  }

  pushDecomposed(x: bigint, y: bigint) {
    if (this._capacity === this._innerLength) {
      const newCapacity = Math.ceil(this._capacity * 2);
      this._realloc(newCapacity);
      this._capacity = newCapacity;
    }
    this._getPath()[this._innerLength * 2] = x;
    this._getPath()[this._innerLength * 2 + 1] = y;
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
    return { x: this._getPath()[index * 2], y: this._getPath()[index * 2 + 1] };
  }

  getX(index: number): bigint {
    this._checkLength(index);
    return this._getPath()[index * 2];
  }

  getY(index: number): bigint {
    this._checkLength(index);
    return this._getPath()[index * 2 + 1];
  }

  setX(index: number, value: bigint): bigint {
    this._checkLength(index);
    return (this._getPath()[index * 2] = value);
  }

  setY(index: number, value: bigint): bigint {
    this._checkLength(index);
    return (this._getPath()[index * 2 + 1] = value);
  }

  setChild(index: number, value: Point64) {
    this._checkLength(index);
    const offset = (index % this._innerLength) * 2;
    this._getPath()[offset] = value.x;
    this._getPath()[offset + 1] = value.y;
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
    const scaledPath = new Path64TypedArray(this._innerLength);
    for (let index = 0; index < this._innerLength; index++) {
      scaledPath.pushDecomposed(
        numberToBigInt(Number(this.getX(index)) * scale),
        numberToBigInt(Number(this.getY(index)) * scale),
      );
    }
    return scaledPath;
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
