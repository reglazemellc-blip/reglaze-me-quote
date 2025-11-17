let initialized = false

export function initInteractions() {
  if (initialized) return; initialized = true

  // Vibration + ripple on buttons
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    const btn = target.closest('.btn, .btn-icon') as HTMLElement | null
    if (!btn) return

    // vibrate on mobile
    if (navigator.vibrate) {
      try { navigator.vibrate(20) } catch {}
    }

    // ripple only on main buttons
    if (!btn.classList.contains('btn') && !btn.classList.contains('btn-gold')) return
    createRipple(btn, e as MouseEvent)
  }, { passive: true })

  // Parallax header logo
  const logo = document.querySelector('.logo-parallax') as HTMLElement | null
  if (logo) {
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = Math.min(4, window.scrollY * 0.03)
        logo.style.transform = `translateY(${y}px)`
        ticking = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
  }
}

function createRipple(el: HTMLElement, ev: MouseEvent) {
  const rect = el.getBoundingClientRect()
  const span = document.createElement('span')
  span.className = 'ripple'
  const size = Math.max(rect.width, rect.height)
  const x = ev.clientX - rect.left - size / 2
  const y = ev.clientY - rect.top - size / 2
  span.style.width = span.style.height = `${size}px`
  span.style.left = `${x}px`
  span.style.top = `${y}px`
  el.appendChild(span)
  setTimeout(() => span.remove(), 450)
}

