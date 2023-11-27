import { PolyPathBase } from "./PolyPathBase";
import { area as clipperArea, scalePathD } from "../Clipper";
import type { IPath64 } from "../Core/IPath64";
import { IPathD } from "../Core/IPathD";
import { isPath64 } from "../Core/Path64";
import { isPathD } from "../Core/PathD";

export class PolyPathD extends PolyPathBase {
  scale: number;
  polygon?: IPathD;

  constructor(parent?: PolyPathBase) {
    super(parent);
    this.scale = 0;
  }

  override addChild(p: IPath64 | IPathD): PolyPathBase {
    if (isPath64(p)) {
      const newChild = new PolyPathD(this);
      newChild.scale = this.scale;
      newChild.polygon = scalePathD(p, 1 / this.scale);
      this._childs.push(newChild);
      return newChild;
    } else if (isPathD(p)) {
      const newChild = new PolyPathD(this);
      newChild.scale = this.scale;
      newChild.polygon = p.clone();
      this._childs.push(newChild);
      return newChild;
    }
    throw new TypeError("Invalid argument types.");
  }

  area() {
    let result = this.polygon === undefined ? 0 : clipperArea(this.polygon);
    for (const polyPathBase of this._childs) {
      result += (polyPathBase as PolyPathD).area();
    }
    return result;
  }
}
