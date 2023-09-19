import { LocalMinima } from "./LocalMinima";
import { Vertex } from "./Vertex";
import { PathType } from "../Core/CoreEnums";
import { Point64 } from "../Core/Point64";
export declare const addPathsToVertexList: (paths: Iterable<Iterable<Point64>>, polytype: PathType, isOpen: boolean, minimaList: LocalMinima[], vertexList: Vertex[]) => void;
export declare const addLocMin: (vert: Vertex, polyType: PathType, isOpen: boolean, minimaList: LocalMinima[]) => void;
