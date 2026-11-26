import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/*
  Scrolls to the top of the page every time the route changes.
  If the URL has a hash (e.g. /ourservice/gym#packages) it scrolls to that
  element instead, retrying briefly because page content loads from the API.
*/
const ScrollToTop = () => {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      return undefined
    }

    const id = decodeURIComponent(hash.slice(1))
    let tries = 0
    const timer = setInterval(() => {
      const el = document.getElementById(id)
      tries += 1
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        clearInterval(timer)
      } else if (tries >= 20) {
        // Section never appeared: fall back to the top of the page
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
        clearInterval(timer)
      }
    }, 100)

    return () => clearInterval(timer)
  }, [pathname, hash])

  return null
}

export default ScrollToTop