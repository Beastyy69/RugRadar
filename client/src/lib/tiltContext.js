import { createContext, useContext } from "react";

// Shared by TiltPanel and everything rendered inside it, so a nested layer
// can ask "am I in an interactive 3D panel?" and set its depth accordingly.
// `enabled` is false on touch devices, small screens and under reduced
// motion - everything then renders flat.
export const TiltContext = createContext({ enabled: false });

export function useTilt() {
  return useContext(TiltContext);
}
