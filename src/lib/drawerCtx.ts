import { createContext, useContext } from 'react';

/** Open/close state of the left menu (kept in its own file so ui.tsx and drawer.tsx can both use it). */
export interface DrawerCtx { open: boolean; show: () => void; hide: () => void }
export const DrawerContext = createContext<DrawerCtx>({ open: false, show: () => {}, hide: () => {} });
export const useDrawer = () => useContext(DrawerContext);
