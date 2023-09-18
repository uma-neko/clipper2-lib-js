import { Clipper } from "../Clipper2JS";
import { Path64 } from "../Core/Path64";
import { PathD } from "../Core/PathD";
import { PolyPathBase } from "./PolyPathBase";

export class PolyPathD extends PolyPathBase {
  scale: number;
  polygon?: PathD;

  constructor(parent?: PolyPathBase) {
    super(parent);
    this.scale = 0;
  }

  override addChild(p: Path64): PolyPathBase {
    const newChild = new PolyPathD(this);
    newChild.scale = this.scale;
    newChild.polygon = Clipper.scalePathD(p, 1 / this.scale);
    this._childs.push(newChild);
    return newChild;
  }

  area() {
    let result = this.polygon === undefined ? 0 : Clipper.area(this.polygon);
    for (const polyPathBase of this._childs) {
      result += (polyPathBase as PolyPathD).area();
    }
    return result;
  }
}
