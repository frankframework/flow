import React from 'react'

interface HelpImageProps {
  src: string
  alt?: string
  caption?: string
  width?: number | string
}

export const HelpImage: React.FC<HelpImageProps> = ({ src, alt = '', caption, width = '100%' }) => {
  return (
    <div className="my-6">
      <img src={src} alt={alt} style={{ width }} className="rounded-md border shadow-md" />
      {caption && <p className="text-muted-foreground mt-2 text-sm">{caption}</p>}
    </div>
  )
}
