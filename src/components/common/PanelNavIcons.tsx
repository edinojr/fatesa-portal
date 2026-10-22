import React from 'react'

export interface PanelNavIconsProps {
  currentPanel?: string
  className?: string
  style?: React.CSSProperties
}

/**
 * @deprecated Removido para evitar duplicidade de navegação com o PanelSwitcher.
 */
export const PanelNavIcons: React.FC<PanelNavIconsProps> = () => {
  return null
}

export default PanelNavIcons
