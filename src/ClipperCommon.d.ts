// Known issues regarding ProxyConstructor type.
// https://github.com/microsoft/TypeScript/issues/20846
declare interface ProxyConstructor {
    new <TTarget extends object, TProxy extends object>(
      target: TTarget,
      handler: ProxyHandler<TTarget>,
    ): TProxy;
  }
  