import { useEffect } from 'react'

const selector = '.resource-card, .stat, .panel, .selection-option, .chat, .command-drawer, .sidebar'

export function usePremiumPointer() {
  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      const surface = (event.target as HTMLElement).closest<HTMLElement>(selector)
      if (!surface) return
      const rect = surface.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const rotateX = ((y / rect.height) - 0.5) * -1.6
      const rotateY = ((x / rect.width) - 0.5) * 1.6
      surface.style.setProperty('--pointer-x', `${x}px`)
      surface.style.setProperty('--pointer-y', `${y}px`)
      surface.style.setProperty('--tilt-x', `${rotateX}deg`)
      surface.style.setProperty('--tilt-y', `${rotateY}deg`)
      surface.dataset.pointerActive = 'true'
    }
    const leave = (event: PointerEvent) => {
      const surface = (event.target as HTMLElement).closest<HTMLElement>(selector)
      if (surface && !surface.contains(event.relatedTarget as Node | null)) surface.dataset.pointerActive = 'false'
    }
    document.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerout', leave, { passive: true })
    return () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerout', leave) }
  }, [])
}
