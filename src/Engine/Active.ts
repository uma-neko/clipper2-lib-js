import { Point64 } from "../Core/Point64";
import { JoinWith } from "./EngineEnums";
import { LocalMinima } from "./LocalMinima";
import { OutRec } from "./OutRec";
import { Vertex } from "./Vertex";

export type Active = {
  bot: Point64;
  top: Point64;
  curX: bigint;
  dx: number;
  windDx: number;
  windCount: number;
  windCount2: number;
  outrec?: OutRec;

  prevInAEL?: Active;
  nextInAEL?: Active;

  prevInSEL?: Active;
  nextInSEL?: Active;
  jump?: Active;
  vertexTop?: Vertex;
  localMin: LocalMinima;
  isLeftBound: boolean;
  joinWith: JoinWith;
};
