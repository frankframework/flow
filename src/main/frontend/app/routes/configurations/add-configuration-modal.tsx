interface AddConfigurationModalProperties {
  isOpen: boolean
  onClose: () => void
}

export default function AddConfigurationModal({ isOpen, onClose }: Readonly<AddConfigurationModalProperties>) {
  if (!isOpen) return null

  return (
    <div className="bg-background/50 absolute inset-0 z-50 flex items-center justify-center">
      <div className="bg-background border-border relative h-[400px] w-[600px] rounded-lg border p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">Add Configuration</h2>
        <p className="mb-4">This is where you can add a new configuration.</p>
        <button
          onClick={onClose}
          className="bg-background border-border hover:bg-backdrop absolute top-3 right-3 cursor-pointer rounded border px-3 py-1"
        >
          Close
        </button>
      </div>
    </div>
  )
}
