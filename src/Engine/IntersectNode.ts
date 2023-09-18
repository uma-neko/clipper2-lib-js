import { Active } from "./Active";
import { Point64 } from "../Core/Point64";

export type IntersectNode = {
  pt: Point64;
  edge1: Active;
  edge2: Active;
};

export const IntersectNodeSorter = (a: IntersectNode, b: IntersectNode) => {
  if (a.pt.y === b.pt.y) {
    if (a.pt.x === b.pt.x) {
      return 0;
    } else {
      return a.pt.x < b.pt.x ? -1 : 1;
    }
  }
  return a.pt.y > b.pt.y ? -1 : 1;
};
