/**
 * Utilidades Web APIs para Dispositivos Móviles (TrueKeate Mobile PWA).
 */

/**
 * Dispara una respuesta de vibración háptica si el dispositivo lo soporta.
 */
export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return

  try {
    switch (type) {
      case 'light':
        navigator.vibrate(25)
        break
      case 'medium':
        navigator.vibrate(50)
        break
      case 'heavy':
        navigator.vibrate(80)
        break
      case 'success':
        navigator.vibrate([40, 60, 40])
        break
      case 'warning':
        navigator.vibrate([60, 40, 60])
        break
      case 'error':
        navigator.vibrate([80, 50, 80, 50, 100])
        break
    }
  } catch {
    // Ignorar si el navegador bloquea la vibración
  }
}

/**
 * Invoca el menú nativo de compartir de iOS/Android vía Web Share API.
 */
export async function shareNative(options: { title: string; text: string; url?: string }) {
  if (typeof window === 'undefined') return false

  const shareUrl = options.url || window.location.href

  if (navigator.share) {
    try {
      await navigator.share({
        title: options.title,
        text: options.text,
        url: shareUrl,
      })
      triggerHaptic('success')
      return true
    } catch (err) {
      if (err instanceof DOMException && err.name !== 'AbortError') {
        console.warn('Error en Web Share API:', err)
      }
      return false
    }
  } else {
    // Fallback al portapapeles
    try {
      await navigator.clipboard.writeText(`${options.title} - ${options.text}: ${shareUrl}`)
      triggerHaptic('light')
      return true
    } catch {
      return false
    }
  }
}

/**
 * Detecta si la aplicación se está ejecutando como PWA Standalone.
 */
export function isPwaInstalled(): boolean {
  if (typeof window === 'undefined') return false
  const matchMediaMatches = typeof window.matchMedia === 'function' ? window.matchMedia('(display-mode: standalone)').matches : false
  const iosStandalone = 'standalone' in window.navigator && window.navigator.standalone === true
  return (
    matchMediaMatches ||
    iosStandalone ||
    (typeof document !== 'undefined' && document.referrer ? document.referrer.includes('android-app://') : false)
  )
}

/**
 * Detecta si el dispositivo es iOS (iPhone / iPad / iPod).
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
}

/**
 * Detecta si es un dispositivo móvil (teléfono o tablet).
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}
