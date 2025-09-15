import { useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface ContextProperties {
  anchorElement: Element
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}
function childContextMenu(properties: ContextProperties) {
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  useLayoutEffect(() => {
    if (properties.anchorElement) {
      const r = properties.anchorElement.getBoundingClientRect()
      setPos({ top: r.top, left: r.right + 10 })
    }
  }, [properties.anchorElement])

  return createPortal(
    <div
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 10_000 }}
      className="nodrag bg-background rounded-md border shadow-md"
    >
      <button
        className="border-border bg-background absolute -top-1 -right-1 rounded-full border text-gray-400 shadow-sm hover:border-red-400 hover:text-red-400"
        onClick={properties.onClose}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-3 w-3"
          width="10"
          height="10"
          viewBox="0 0 10 10"
          strokeWidth="1"
          stroke="currentColor"
          strokeLinecap="round"
        >
          <line x1="3" y1="3" x2="7" y2="7" />
          <line x1="3" y1="7" x2="7" y2="3" />
        </svg>
      </button>
      <ul>
        <li className="hover:bg-border cursor-pointer rounded-t-md p-2" onClick={properties.onEdit}>
          Edit
        </li>
        <li className="hover:bg-border cursor-pointer rounded-t-md p-2" onClick={properties.onDelete}>
          Delete
        </li>
      </ul>
    </div>,
    document.body,
  )
}

export default childContextMenu
