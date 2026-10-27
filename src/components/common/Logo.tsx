import React from 'react'

interface LogoProps {
  size?: number | string
  maxHeight?: number | string
  className?: string
  showText?: boolean
  white?: boolean
}

const Logo: React.FC<LogoProps> = ({ size = 64, maxHeight, className = '' }) => {
  return (
    <div className={`logo-container ${className}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <img 
        src="/logo.png" 
        alt="Logotipo Oficial Fatesa Casa do Saber" 
        style={{ 
          width: size, 
          height: 'auto', 
          maxHeight: maxHeight,
          objectFit: 'contain',
          display: 'block'
        }} 
      />
    </div>
  )
}

export default Logo
