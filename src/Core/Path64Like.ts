import { Point64, isPoint64 } from "./Point64";
import { PointD } from "./PointD";

export class Path64Like implements Iterable<Point64> {
  _wrapedObject: Iterable<Point64> | Iterable<PointD>;
  _scale: number;

  constructor(
    wrapedObject: Iterable<Point64> | Iterable<PointD>,
    scale: number,
  ) {
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
