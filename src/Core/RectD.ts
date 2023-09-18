import { PathD } from "./PathD";
import { PointD } from "./PointD";

export class RectD {
  readonly isRectD: true;
  left: number;
  top: number;
  right: number;
  bottom: number;

  constructor();
  constructor(l: number, t: number, r: number, b: number);
  constructor(isValid: boolean);
  constructor(rec: RectD);

  constructor(
    leftOrIsValidOrRec?: number | boolean | RectD,
    top?: number,
    right?: number,
    bottom?: number,
  ) {
    this.isRectD = true;
    if (leftOrIsValidOrRec === undefined) {
      this.left = 0;
      this.top = 0;
      this.right = 0;
      this.bottom = 0;
    } else if (
      typeof leftOrIsValidOrRec === "number" &&
      typeof top === "number" &&
      typeof right === "number" &&
      typeof bottom === "number"
    ) {
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
    } else if (
      typeof leftOrIsValidOrRec === "object" &&
      "isRectD" in leftOrIsValidOrRec
    ) {
      this.left = leftOrIsValidOrRec.left;
      this.top = leftOrIsValidOrRec.top;
      this.right = leftOrIsValidOrRec.right;
      this.bottom = leftOrIsValidOrRec.bottom;
    } else {
      throw new Error("todo: change message");
    }
  }

  get width(): number {
    return this.right - this.left;
  }

  set width(value: number) {
    this.right = this.left + value;
  }

  get height(): number {
    return this.bottom - this.top;
  }

  set height(value: number) {
    this.bottom = this.top + value;
  }

  midPoint(): PointD {
    return { x: (this.right + this.left) / 2, y: (this.bottom + this.top) / 2 };
  }

  asPath(): PathD {
    return new PathD([
      { x: this.left, y: this.top },
      { x: this.right, y: this.top },
      { x: this.right, y: this.bottom },
      { x: this.left, y: this.bottom },
    ]);
  }

  contains(pt: PointD): boolean;
  contains(rec: RectD): boolean;

  contains(ptOrRec: PointD | RectD) {
    if (
      "x" in ptOrRec &&
      "y" in ptOrRec &&
      typeof "x" === "number" &&
      typeof "y" === "number"
    ) {
      return (
        ptOrRec.x > this.left &&
        ptOrRec.x < this.right &&
        ptOrRec.y > this.top &&
        ptOrRec.y < this.bottom
      );
    } else if ("isRectD" in ptOrRec) {
      return (
        ptOrRec.left >= this.left &&
        ptOrRec.right <= this.right &&
        ptOrRec.top >= this.top &&
        ptOrRec.bottom <= this.bottom
      );
    } else {
      throw new Error("todo: change message");
    }
  }

  scale(scale: number) {
    this.top = this.top * scale;
    this.bottom = this.bottom * scale;
    this.left = this.left * scale;
    this.right = this.right * scale;
  }

  isEmpty() {
    return this.bottom <= this.top || this.right <= this.left;
  }

  intersects(rec: RectD) {
    return (
      (this.left >= rec.left ? this.left : rec.left) <=
        (this.right >= rec.right ? this.right : rec.right) &&
      (this.top >= rec.top ? this.top : rec.top) <=
        (this.bottom >= rec.bottom ? this.bottom : rec.bottom)
    );
  }
}
