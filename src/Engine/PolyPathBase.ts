import type { Path64Base } from "../Core/Path64Base";

export class PolyPathBase {
  _parent?: PolyPathBase;
  _childs: PolyPathBase[];

  constructor(parent?: PolyPathBase) {
    this._parent = parent;
    this._childs = [];
  }

  getLevel() {
    let result = 0;
    let pp = this._parent;
    while (pp !== undefined) {
      result++;
      pp = pp._parent;
    }
    return result;
  }

  getIsHole() {
    const lvl = this.getLevel();
    return lvl !== 0 && (lvl & 1) === 0;
  }

  get length() {
    return this._childs.length;
  }

  clear() {
    this._childs.length = 0;
  }

  /* @ts-ignore abstract method */
  addChild(_: Path64Base): PolyPathBase {}

  *[Symbol.iterator]() {
    for (const child of this._childs) {
      yield child;
    }
  }
}
