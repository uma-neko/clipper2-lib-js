import { Clipper } from "../Clipper2JS";
import { Path64 } from "../Core/Path64";
import { PolyPathBase } from "./PolyPathBase";

export class PolyPath64 extends PolyPathBase {
  polygon?: Path64;

  override addChild(p: Path64): PolyPathBase {
    const newChild = new PolyPath64(this);
    newChild.polygon = p;
    this._childs.push(newChild);
    return newChild;
  }

  child(index: number): PolyPath64 {
    if (index < 0 || index >= this._childs.length) {
      throw new Error("todo: change message");
    }
    return this._childs[index] as PolyPath64;
  }

  area() {
    let result = this.polygon === undefined ? 0 : Clipper.area(this.polygon);
    for (const polyPathBase of this._childs) {
      result += (polyPathBase as PolyPath64).area();
    }
    return result;
  }
}
