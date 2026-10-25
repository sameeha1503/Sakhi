import { createContext, useContext, useEffect } from "react";

export interface BackHandlerContextType {
  registeredHandler: (() => boolean | void) | null;
  registerBackHandler: (handler: () => boolean | void) => () => void;
}

export const BackHandlerContext = createContext<BackHandlerContextType>({
  registeredHandler: null,
  registerBackHandler: () => () => {},
});

export function useBackHandler(handler: () => boolean | void) {
  const { registerBackHandler } = useContext(BackHandlerContext);
  useEffect(() => {
    return registerBackHandler(handler);
  }, [registerBackHandler, handler]);
}
