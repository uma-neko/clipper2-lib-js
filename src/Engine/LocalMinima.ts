import { Vertex } from "./Vertex";
import { PathType } from "../Core/CoreEnums";

export interface LocalMinima {
  vertex: Vertex;
  polytype: PathType;
  isOpen: boolean;
}

export const locMinSorter = (locMin1: LocalMinima, locMin2: LocalMinima) =>
  locMin2.vertex.pt.y === locMin1.vertex.pt.y
    ? 0
    : locMin2.vertex.pt.y > locMin1.vertex.pt.y
    ? 1
    : -1;
