import { numberToBigInt } from "../Clipper";
import { isNotNullish } from "../CommonUtils";
import type { IPath64 } from "./IPath64";
import { Path64TypedArray } from "./Path64TypedArray";
import { Point64, isPoint64 } from "./Point64";

export const isRect64 = (obj: unknown): obj is Rect64 =>
  isNotNullish(obj) && obj.type === Rect64TypeName;

export const Rect64TypeName = Symbol("Rect64");

export class Rect64 {
  readonly type: typeof Rect64TypeName;
  left: bigint;
  top: bigint;
  right: bigint;
  bottom: bigint;

  constructor();
  constructor(l: bigint, t: bigint, r: bigint, b: bigint);
  constructor(isValid: boolean);
  constructor(rec: Rect64);

  constructor(
    leftOrIsValidOrRec?: bigint | boolean | Rect64,
    top?: bigint,
    right?: bigint,
    bottom?: bigint,
  ) {
    this.type = Rect64TypeName;
    if (leftOrIsValidOrRec === undefined) {
      this.left = 0n;
      this.top = 0n;
      this.right = 0n;
      this.bottom = 0n;
    } else if (
      typeof leftOrIsValidOrRec === "bigint" &&
      typeof top === "bigint" &&
      typeof right === "bigint" &&
      typeof bottom === "bigint"
    ) {
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

  get width(): bigint {
    return this.right - this.left;
  }

  set width(value: bigint) {
    this.right = this.left + value;
  }

  get height(): bigint {
    return this.bottom - this.top;
  }

  set height(value: bigint) {
    this.bottom = this.top + value;
  }

  midPoint(): Point64 {
    return {
      x: (this.right + this.left) / 2n,
      y: (this.bottom + this.top) / 2n,
    };
  }

  asPath(): IPath64 {
    return new Path64TypedArray(
      { x: this.left, y: this.top },
      { x: this.right, y: this.top },
      { x: this.right, y: this.bottom },
      { x: this.left, y: this.bottom },
    );
  }

  contains(pt: Point64): boolean;
  contains(rec: Rect64): boolean;

  contains(ptOrRec: Point64 | Rect64) {
    if (isPoint64(ptOrRec)) {
      return (
        ptOrRec.x > this.left &&
        ptOrRec.x < this.right &&
        ptOrRec.y > this.top &&
        ptOrRec.y < this.bottom
      );
    } else if (isRect64(ptOrRec)) {
      return (
        ptOrRec.left >= this.left &&
        ptOrRec.right <= this.right &&
        ptOrRec.top >= this.top &&
        ptOrRec.bottom <= this.bottom
      );
    } else {
      throw new TypeError("Invalid argument types.");
    }
  }

  scale(scale: number) {
    this.top = numberToBigInt(Number(this.top) * scale);
    this.bottom = numberToBigInt(Number(this.bottom) * scale);
    this.left = numberToBigInt(Number(this.left) * scale);
    this.right = numberToBigInt(Number(this.right) * scale);
  }

  isEmpty() {
    return this.bottom <= this.top || this.right <= this.left;
  }

  intersects(rec: Rect64) {
    return (
      (this.left >= rec.left ? this.left : rec.left) <=
        (this.right >= rec.right ? this.right : rec.right) &&
      (this.top >= rec.top ? this.top : rec.top) <=
        (this.bottom >= rec.bottom ? this.bottom : rec.bottom)
    );
  }
}

export const EmptyRect64: Readonly<Rect64> = new Rect64();
