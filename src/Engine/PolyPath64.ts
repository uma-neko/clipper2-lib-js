import { PolyPathBase } from "./PolyPathBase";
import { area as clipperArea } from "../Clipper";
import { IPath64 } from "../Core/IPath64";

export class PolyPath64 extends PolyPathBase {
  polygon?: IPath64;

  override addChild(p: IPath64): PolyPathBase {
    const newChild = new PolyPath64(this);
    newChild.polygon = p;
    this._childs.push(newChild);
    return newChild;
  }

  child(index: number): PolyPath64 {
    if (index < 0 || index >= this._childs.length) {
      throw new RangeError("Invalid array length.");
    }
    return this._childs[index] as PolyPath64;
  }

  area() {
    let result = this.polygon === undefined ? 0 : clipperArea(this.polygon);
    for (const polyPathBase of this._childs) {
      result += (polyPathBase as PolyPath64).area();
    }
    return result;
  }
}
