import type { ISdk } from "iii-sdk";

export interface StartupGate {
  sdk: ISdk;
  open: () => void;
}

export function createStartupGate(sdk: ISdk): StartupGate {
  let openGate!: () => void;
  const ready = new Promise<void>((resolve) => {
    openGate = resolve;
  });
  let opened = false;

  const registerFunction: ISdk["registerFunction"] = (
    functionId,
    handler,
    options,
  ) => {
    if (typeof handler !== "function") {
      return sdk.registerFunction(functionId, handler, options);
    }
    return sdk.registerFunction(
      functionId,
      async (data: unknown) => {
        await ready;
        return handler(data);
      },
      options,
    );
  };

  const gatedSdk = new Proxy(sdk, {
    get(target, property, receiver) {
      if (property === "registerFunction") return registerFunction;
      const value = Reflect.get(target, property, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });

  return {
    sdk: gatedSdk,
    open: () => {
      if (opened) return;
      opened = true;
      openGate();
    },
  };
}
