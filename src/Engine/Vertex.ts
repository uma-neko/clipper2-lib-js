import { Point64 } from "../Core/Point64";
import { VertexFlags } from "./EngineEnums";

export interface Vertex {
  pt: Point64;
  next?: Vertex;
  prev?: Vertex;
  flags: VertexFlags;
}
