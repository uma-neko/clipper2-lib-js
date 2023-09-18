import { VertexFlags } from "./EngineEnums";
import { LocalMinima } from "./LocalMinima";
import { Vertex } from "./Vertex";
import { PathType } from "../Core/CoreEnums";
import { Point64 } from "../Core/Point64";

export const addPathsToVertexList = (
  paths: Iterable<Iterable<Point64>>,
  polytype: PathType,
  isOpen: boolean,
  minimaList: LocalMinima[],
  vertexList: Vertex[],
) => {
  for (const path of paths) {
    let v0: Vertex | undefined = undefined;
    let prev_v: Vertex | undefined = undefined;
    let curr_v: Vertex;

    for (const originPt of path) {
      const pt = Point64.clone(originPt);
      if (v0 === undefined) {
        v0 = { pt: pt, flags: VertexFlags.None };
        vertexList.push(v0);
        prev_v = v0;
      } else if (Point64.notEquals(prev_v!.pt, pt)) {
        curr_v = { pt: pt, flags: VertexFlags.None, prev: prev_v };
        vertexList.push(curr_v);
        prev_v!.next = curr_v;
        prev_v = curr_v;
      }
    }

    if (prev_v === undefined || prev_v?.prev === undefined) {
      continue;
    }

    if (!isOpen && Point64.equals(prev_v.pt, v0!.pt)) {
      prev_v = prev_v.prev;
    }

    prev_v.next = v0;
    v0!.prev = prev_v;
    if (!isOpen && prev_v.next === prev_v) {
      continue;
    }

    let going_up = false;

    if (isOpen) {
      curr_v = v0!.next!;
      while (curr_v !== v0 && curr_v.pt.y === v0!.pt.y) {
        curr_v = curr_v.next!;
      }
      going_up = curr_v.pt.y <= v0!.pt.y;
      if (going_up) {
        v0!.flags = VertexFlags.OpenStart;
        addLocMin(v0!, polytype, true, minimaList);
      } else {
        v0!.flags = VertexFlags.OpenStart | VertexFlags.LocalMax;
      }
    } else {
      prev_v = v0!.prev;
      while (prev_v !== v0 && prev_v.pt.y === v0!.pt.y) {
        prev_v = prev_v.prev!;
      }

      if (prev_v === v0) {
        continue;
      }

      going_up = prev_v.pt.y > v0!.pt.y;
    }

    const going_up0 = going_up;
    prev_v = v0!;
    curr_v = v0!.next!;
    while (curr_v !== v0) {
      if (curr_v!.pt.y > prev_v.pt.y && going_up) {
        prev_v.flags |= VertexFlags.LocalMax;
        going_up = false;
      } else if (curr_v.pt.y < prev_v.pt.y && !going_up) {
        going_up = true;
        addLocMin(prev_v, polytype, isOpen, minimaList);
      }
      prev_v = curr_v;
      curr_v = curr_v.next!;
    }

    if (isOpen) {
      prev_v.flags |= VertexFlags.OpenEnd;
      if (going_up) {
        prev_v.flags |= VertexFlags.LocalMax;
      } else {
        addLocMin(prev_v, polytype, isOpen, minimaList);
      }
    } else if (going_up !== going_up0) {
      if (going_up0) {
        addLocMin(prev_v, polytype, false, minimaList);
      } else {
        prev_v.flags |= VertexFlags.LocalMax;
      }
    }
  }
};

export const addLocMin = (
  vert: Vertex,
  polyType: PathType,
  isOpen: boolean,
  minimaList: LocalMinima[],
) => {
  if ((vert.flags & VertexFlags.LocalMin) !== VertexFlags.None) return;
  vert.flags |= VertexFlags.LocalMin;
  minimaList.push({ vertex: vert, polytype: polyType, isOpen: isOpen });
};
