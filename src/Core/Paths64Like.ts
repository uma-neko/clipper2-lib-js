import { isScalablePath } from "./IScalablePath";
import { isPath64 } from "./Path64";
import { Path64Like } from "./Path64Like";
import { Point64, isPoint64 } from "./Point64";
import { PointD, isPointD } from "./PointD";

export class Paths64Like implements Iterable<Iterable<Point64>> {
  _wrapedObject:
    | Iterable<Point64>
    | Iterable<PointD>
    | Iterable<Iterable<Point64>>
    | Iterable<Iterable<PointD>>;
  _scale: number;

  constructor(
    wrapedObject:
      | Iterable<Point64>
      | Iterable<PointD>
      | Iterable<Iterable<Point64>>
      | Iterable<Iterable<PointD>>,
    scale: number,
  ) {
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
          yield this._wrapedObject as Iterable<Point64>;
          break;
        } else if (isPointD(w1)) {
          yield new Path64Like(
            this._wrapedObject as Iterable<PointD>,
            this._scale,
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
