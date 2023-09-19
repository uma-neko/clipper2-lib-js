import { Vertex } from "./Vertex";
import { PathType } from "../Core/CoreEnums";
export interface LocalMinima {
    vertex: Vertex;
    polytype: PathType;
    isOpen: boolean;
}
export declare const locMinSorter: (locMin1: LocalMinima, locMin2: LocalMinima) => 0 | 1 | -1;
