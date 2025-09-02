export const isNotNullish = (obj: unknown): obj is Record<string, unknown> =>
  obj !== undefined && obj !== null && typeof obj === "object";

export const bigintAbs = (a: bigint) => (a >= 0n ? a : -a);
