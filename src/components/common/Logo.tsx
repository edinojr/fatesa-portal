import React from 'react'

interface LogoProps {
  size?: number | string
  className?: string
  showText?: boolean
  white?: boolean
}

const Logo: React.FC<LogoProps> = ({ size = 64, className = '', showText = false, white = false }) => {
  return (
    <div className={`logo-container ${className}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <img 
        src="/logo.png" 
        alt="Casa do Saber" 
        style={{ 
          width: size, 
          height: 'auto', 
          display: 'block'
        }} 
      />
    </div>
  )
}

export default Logo
