export const isNotNullish = (obj: unknown): obj is Record<string, unknown> =>
  obj !== undefined && obj !== null;

export const bigintAbs = (a: bigint) => (a >= 0n ? a : -a);

declare global {
  interface ProxyConstructor {
    new <TTarget extends object, TProxy extends object>(
      target: TTarget,
      handler: ProxyHandler<TTarget>,
    ): TProxy;
  }
}
