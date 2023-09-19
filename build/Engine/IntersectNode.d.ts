import { Active } from "./Active";
import { Point64 } from "../Core/Point64";
export type IntersectNode = {
    pt: Point64;
    edge1: Active;
    edge2: Active;
};
export declare const IntersectNodeSorter: (a: IntersectNode, b: IntersectNode) => 0 | 1 | -1;
