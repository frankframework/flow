import { useProjectStore } from '~/stores/project-store'
import ConfigurationTile from './configuration-tile'
import ArrowLeftIcon from '/icons/solar/Alt Arrow Left.svg?react'
import { useNavigate } from 'react-router'
import AddConfigurationTile from './add-configuration-tile'
import { useState } from 'react'
import AddConfigurationModal from './add-configuration-modal'

export default function ConfigurationManager() {
  const currentProject = useProjectStore((state) => state.project)
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="bg-backdrop h-full w-full p-6">
      <div className="bg-background border-border h-full w-full rounded border p-6">
        <div
          className="hover:text-foreground-active flex w-fit hover:cursor-pointer"
          onClick={() => {
            navigate('/')
          }}
        >
          <ArrowLeftIcon className="mb-4 h-6 w-auto fill-current hover:cursor-pointer" />
          <p>Return To Projects</p>
        </div>
        <p className="ml-2">
          Configurations within <span className="font-bold">{currentProject?.name}</span>/src/main/configurations:
        </p>
        <div className="flex flex-wrap gap-4 pt-4">
          {currentProject?.filepaths.map((filepath, index) => (
            <ConfigurationTile key={filepath + index} filepath={filepath} />
          ))}
          <AddConfigurationTile
            onClick={() => {
              setShowModal(true)
            }} 
          />
        </div>
      </div>
      <AddConfigurationModal isOpen={showModal} onClose={() => setShowModal(false)} currentProject={currentProject} />
    </div>
  )
}
