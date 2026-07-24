import React from 'react'

type HelpImageProperties = {
  src: string
  alt?: string
  caption?: string
  width?: number | string
}

export const HelpImage: React.FC<HelpImageProperties> = ({
  src,
  alt = '',
  caption,
  width = '100%',
}): React.JSX.Element => {
  return (
    <div className="my-6">
      <img src={src} alt={alt} style={{ width }} className="rounded-md border shadow-md" />
      {caption && <p className="text-foreground-muted mt-2 text-sm">{caption}</p>}
    </div>
  )
}
