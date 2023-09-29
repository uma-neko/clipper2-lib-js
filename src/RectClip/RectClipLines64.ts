import { OutPt2 } from "./OutPt2";
import { Location, RectClip64, getLocation } from "./RectClip64";
import { getBounds } from "../Clipper";
import { Paths64 } from "../Core/Paths64";
import { Point64 } from "../Core/Point64";
import type { IPath64 } from "../Core/IPath64";
import { Path64TypedArray } from "../Core/Path64TypedArray";

export class RectClipLines64 extends RectClip64 {
  override execute(paths: Paths64): Paths64 {
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

  override getPath(op: OutPt2 | undefined): IPath64 {
    const result: IPath64 = new Path64TypedArray();
    if (op === undefined || op === op.next) {
      return result;
    }
    op = op.next;
    result.push(op!.pt);
    let op2: OutPt2 | undefined = op!.next;
    while (op2 !== op) {
      result.push(op2!.pt);
      op2 = op2!.next;
    }
    return result;
  }

  override executeInternal(path: IPath64): void {
    this._results.length = 0;
    if (path.length < 2 || this._rect.isEmpty()) {
      return;
    }

    let prev: Location = Location.inside;
    let i = 1;
    const highI = path.length - 1;
    let loc: Location;
    if (!({ loc } = getLocation(this._rect, path.getClone(0))).result) {
      while (
        i <= highI &&
        !({ loc: prev } = getLocation(this._rect, path.getClone(i))).result
      ) {
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

      let crossingLoc: Location = loc;
      let ip: Point64;

      if (
        !({ loc: crossingLoc, ip } = this.getIntersection(
          this._rectPath,
          currPt,
          prevPt,
          crossingLoc,
        )).result
      ) {
        ++i;
        continue;
      }

      if (loc === Location.inside) {
        this.add(ip, true);
      } else if (prev !== Location.inside) {
        crossingLoc = prev;
        let ip2: Point64;
        ({ loc: crossingLoc, ip: ip2 } = this.getIntersection(
          this._rectPath,
          prevPt,
          currPt,
          crossingLoc,
        ));
        this.add(ip2);
        this.add(ip);
      } else {
        this.add(ip);
      }
    }
  }
}
