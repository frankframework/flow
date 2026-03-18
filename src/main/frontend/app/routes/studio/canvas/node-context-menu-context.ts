import { createContext, useContext } from 'react'

export const NodeContextMenuContext = createContext<(visible: boolean) => void>(() => {
  /* empty */
})
export const useNodeContextMenu = () => useContext(NodeContextMenuContext)
