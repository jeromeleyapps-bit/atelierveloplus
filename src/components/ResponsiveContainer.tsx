/**
 * Composant Container Responsive Uniforme
 * 
 * Unifie la largeur de toutes les pages de l'application
 * et s'adapte automatiquement à tous les types d'écrans
 */

import Container, { ContainerProps } from '@mui/material/Container';
import { ReactNode } from 'react'

interface ResponsiveContainerProps extends Omit<ContainerProps, 'maxWidth'> {
  children: ReactNode
  /**
   * Forcer une largeur specifique si besoin
   * Par defaut: 'xl' (extra-large) pour compatibilite tous ecrans
   */
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false
}

/**
 * Container unifie pour toutes les pages
 * 
 * Largeur par defaut: 'xl' (1536px max)
 * - Petit ecran (< 600px): Pleine largeur avec padding reduit
 * - Moyen ecran (600-900px): 900px max
 * - Grand ecran (900-1200px): 1200px max
 * - Extra large (> 1200px): 1536px max
 * 
 * Responsive padding:
 * - Mobile: 16px (2)
 * - Tablet: 24px (3)
 * - Desktop: 24px (3)
 */
export default function ResponsiveContainer({
  children,
  maxWidth = 'xl',
  sx,
  ...props
}: ResponsiveContainerProps) {
  return (
    <Container
      maxWidth={maxWidth}
      sx={{
        // Padding responsive
        px: { xs: 2, sm: 3, md: 3 },
        py: { xs: 2, sm: 3, md: 3 },
        
        // Largeur fluide sur petits ecrans
        width: '100%',
        
        // Transitions douces
        transition: 'padding 0.3s ease',
        
        // Fusion avec styles custom
        ...sx
      }}
      {...props}
    >
      {children}
    </Container>
  )
}
