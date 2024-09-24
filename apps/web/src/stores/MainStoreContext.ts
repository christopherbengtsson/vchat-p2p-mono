import { createContext, useContext } from "react";
import type { MainStore } from "./MainStore";

export const MainStoreContext = createContext<MainStore>({} as MainStore);

export function useMainStore() {
  return useContext(MainStoreContext);
}
