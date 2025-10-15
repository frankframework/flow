import { useEffect, useState } from 'react'

export default function Projects() {
  const [message, setMessage] = useState('Loading...')
  const [config, setConfig] = useState(null)

  useEffect(() => {
    // Adjust the URL depending on your setup
    fetch('test')
      .then((response) => {
        if (!response.ok) throw new Error('Network response was not ok')
        return response.json()
      })
      .then((data) => setMessage(data.data))
      .catch(() => setMessage('Can not connect to Flow backend...'))

    const configNumber = '1'
    fetch(`configurations/Configuration${configNumber}.xml`)
      .then((response) => {
        if (!response.ok) throw new Error(`Can not find configuration with name: Config${configNumber}`)
        return response.json()
      })
      .then((data) => {
        setConfig(data)
      })
      .catch(() => setConfig(null))
  }, [])

  return (
    <div>
      <p>{message}</p>
      {config ? (
        <ul>
          {Object.entries(config).map(([key, value]) => (
            <li key={key}>
              <strong>{key}:</strong> {value?.toString() ?? 'null'}
            </li>
          ))}
        </ul>
      ) : (
        <p>Configuration not found</p>
      )}
    </div>
  )
}
