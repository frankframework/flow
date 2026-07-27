import { createContext, useContext } from 'react'

export const NodeContextMenuContext = createContext<(visible: boolean) => void>((): void => {
  /* empty */
})
export const useNodeContextMenu = (): ((visible: boolean) => void) => useContext(NodeContextMenuContext)
