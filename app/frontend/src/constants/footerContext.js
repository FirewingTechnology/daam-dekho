// FooterObserverContext.js
import { createContext, useContext } from "react";

export const FooterObserverContext = createContext();

export const useFooterVisible = () => useContext(FooterObserverContext);
