import { VertexFlags } from "./EngineEnums";
import { Point64 } from "../Core/Point64";

export interface Vertex {
  pt: Point64;
  next?: Vertex;
  prev?: Vertex;
  flags: VertexFlags;
}
