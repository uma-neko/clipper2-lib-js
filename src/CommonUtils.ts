export const isNotNullish = (obj: unknown): obj is Record<string, unknown> =>
  obj !== undefined && obj !== null;
