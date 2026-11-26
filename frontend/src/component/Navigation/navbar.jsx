import React, { useEffect, useState, useRef } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { webApi } from '../Api/apilist'

// Routes where the navbar should be hidden
const hiddenRoutes = ['/login', '/admin']

const PHONE_DISPLAY = '+251 938922222'
const PHONE_LINK = '+251938922222'

const socialLinks = [
  { name: 'Facebook', href: 'https://facebook.com/', icon: 'facebook' },
  { name: 'Instagram', href: 'https://instagram.com/', icon: 'instagram' },
  { name: 'TikTok', href: 'https://tiktok.com/', icon: 'tiktok' },
]

const pathOverrides = {
  'about us': '/aboutus',
  'our service': '/ourservice',
  'packages': '/ourpackages',
  'health tips': '/healthtips',
  'tips': '/healthtips',
  'contact us': '/contact',
}

const pageOrder = ['home', 'about us', 'our service', 'packages', 'health tips', 'contact us']

const orderIndex = (name = '') => {
  const i = pageOrder.indexOf(name.trim().toLowerCase())
  return i === -1 ? pageOrder.length : i
}

const toPath = (name = '') => {
  const override = pathOverrides[name.trim().toLowerCase()]
  if (override) return override

  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug === 'home' || slug === '' ? '/' : `/${slug}`
}

const splitSubPages = (subPageName) => {
  if (!subPageName || typeof subPageName !== 'string') return []
  return subPageName
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

const groupPages = (list) => {
  const map = new Map()

  for (const page of list) {
    if (!page || page.isDeleted) continue
    const key = (page.pageName || '').trim().toLowerCase()
    if (!key) continue

    if (!map.has(key)) {
      map.set(key, {
        id: page.id,
        pageName: page.pageName,
        pageDescription: page.pageDescription,
        subPages: [],
        _firstOrder: page.id,
      })
    }

    const entry = map.get(key)
    const subs = splitSubPages(page.subPageName)
    for (const s of subs) {
      if (!entry.subPages.some((existing) => existing.toLowerCase() === s.toLowerCase())) {
        entry.subPages.push(s)
      }
    }
  }

  return [...map.values()].sort(
    (a, b) =>
      orderIndex(a.pageName) - orderIndex(b.pageName) || a._firstOrder - b._firstOrder
  )
}

const subPagePath = (parentName, subName) =>
  `${toPath(parentName)}/${subName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')}`

/* ---------- Icons ---------- */
const icons = {
  facebook: (
    <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.9v3h2.6V21h3z" />
  ),
  instagram: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16.8" cy="7.2" r="1.1" />
    </>
  ),
  tiktok: (
    <path d="M16.6 4c.3 2 1.5 3.3 3.4 3.5v2.7c-1.2 0-2.4-.4-3.4-1v5.4c0 3-2.3 5-5 5-2.9 0-5-2.3-5-5s2.3-5.2 5.3-4.9v2.8c-1.4-.3-2.6.7-2.6 2.1 0 1.2.9 2.2 2.2 2.2 1.3 0 2.3-.9 2.3-2.4V4h2.8z" />
  ),
}

const SocialIcon = ({ name }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
    {icons[name]}
  </svg>
)

const PhoneIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4"
    aria-hidden="true"
  >
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
  </svg>
)

const ChevronDown = ({ className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
)

/* ---------- Contact block ---------- */
const ContactInfo = ({ className = '' }) => (
  <div className={`items-center gap-4 ${className}`}>
    <div className="flex items-center gap-1.5">
      {socialLinks.map((s) => (
        <a
          key={s.name}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={s.name}
          title={s.name}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-[#A3E635]/50 text-[#A3E635] transition duration-200 hover:-translate-y-0.5 hover:bg-[#A3E635] hover:text-[#0B2545]"
        >
          <SocialIcon name={s.icon} />
        </a>
      ))}
    </div>

    <a
      href={`tel:${PHONE_LINK}`}
      className="flex items-center gap-2 text-sm font-semibold text-white transition-colors hover:text-[#A3E635]"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#A3E635] text-[#0B2545]">
        <PhoneIcon />
      </span>
      {PHONE_DISPLAY}
    </a>
  </div>
)

/* ---------- Logo (matches the Lena Wellness brand image) ---------- */
const LOGO_GREEN = '#A6E22E'

const Logo = () => (
  <Link to="/" aria-label="Lena Wellness - Home" className="flex items-center no-underline">
    <svg
      className="h-14 w-auto shrink-0 sm:h-16"
      viewBox="150 90 1180 620"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
    >
      {/* Letters drawn as thick rounded strokes */}
      <g
        fill="none"
        stroke={LOGO_GREEN}
        strokeWidth="48"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* L */}
        <path d="M204 215 V500 H385" />

        {/* e */}
        <path d="M648 452 C612 492 560 508 515 497 C440 480 404 420 414 340 C424 262 480 215 540 215 C612 215 652 262 640 322 C628 382 540 418 440 397" />

        {/* N */}
        <path d="M728 500 V215 L949 498 V212" />

        {/* A */}
        <path d="M1048 500 V300 C1048 242 1090 212 1155 212 C1222 212 1262 246 1262 300 V500" />
        <path d="M1078 408 C1100 372 1130 362 1160 362 C1200 362 1236 382 1262 408" />
      </g>

      {/* Thin swoosh crossing the e */}
      <path
        d="M565 110 C440 132 340 220 345 300 C348 352 382 388 432 398 C386 376 356 340 361 295 C367 220 452 140 565 110 Z"
        fill={LOGO_GREEN}
      />

      {/* WELLNESS */}
      <text
        x="330"
        y="680"
        fill={LOGO_GREEN}
        fontFamily="'Helvetica Neue', Arial, sans-serif"
        fontSize="82"
        fontWeight="400"
        textLength="815"
        lengthAdjust="spacing"
      >
        WELLNESS
      </text>
    </svg>
  </Link>
)

/* ---------- Desktop Dropdown Menu ---------- */
const DesktopDropdown = ({ page, subPages }) => {
  const firstSub = subPages[0]
  const parentPath = firstSub ? subPagePath(page.pageName, firstSub) : toPath(page.pageName)
  const [open, setOpen] = useState(false)
  const closeTimer = useRef(null)

  const handleEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpen(true)
  }
  const handleLeave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 120)
  }

  return (
    <li
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <div className="flex items-center">
        <NavLink
          to={parentPath}
          className={({ isActive }) =>
            `group relative flex items-center gap-1 px-4 py-2.5 text-[0.95rem] font-medium tracking-wide transition-colors duration-200 hover:text-[#A3E635] ${
              isActive ? 'text-[#A3E635]' : 'text-white'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {page.pageName}
              <span
                className={`absolute bottom-1 left-4 right-4 h-0.5 origin-left bg-[#A3E635] transition-transform duration-300 ${
                  isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                }`}
              />
            </>
          )}
        </NavLink>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-haspopup="true"
          aria-expanded={open}
          aria-label={`Toggle ${page.pageName} submenu`}
          className="p-1 text-white hover:text-[#A3E635]"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown panel */}
      <div
        className={`absolute left-0 top-full z-50 w-64 origin-top-left pt-2 transition-all duration-200 ${
          open
            ? 'visible translate-y-0 opacity-100'
            : 'invisible -translate-y-1 opacity-0'
        }`}
      >
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-xl shadow-black/10">
          <ul>
            {subPages.map((sub) => (
              <li key={sub}>
                <Link
                  to={subPagePath(page.pageName, sub)}
                  onClick={() => setOpen(false)}
                  className="block px-5 py-2.5 text-sm text-gray-600 transition-colors hover:bg-[#F8FAF5] hover:text-[#0B2545]"
                >
                  {sub}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </li>
  )
}

/* ---------- Mobile accordion item ---------- */
const MobileItem = ({ page, subPages }) => {
  const firstSub = subPages[0]
  const path = firstSub ? subPagePath(page.pageName, firstSub) : toPath(page.pageName)
  const [open, setOpen] = useState(false)

  if (!subPages.length) {
    return (
      <li>
        <NavLink
          to={path}
          end={path === '/'}
          className={({ isActive }) =>
            `block border-b border-white/10 px-1 py-3.5 text-[0.95rem] font-medium tracking-wide transition-colors ${
              isActive ? 'text-[#A3E635]' : 'text-white hover:text-[#A3E635]'
            }`
          }
        >
          {page.pageName}
        </NavLink>
      </li>
    )
  }

  return (
    <li>
      <div className="flex items-center justify-between border-b border-white/10">
        <NavLink
          to={path}
          className={({ isActive }) =>
            `flex-1 px-1 py-3.5 text-[0.95rem] font-medium tracking-wide transition-colors ${
              isActive ? 'text-[#A3E635]' : 'text-white hover:text-[#A3E635]'
            }`
          }
        >
          {page.pageName}
        </NavLink>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={`Toggle ${page.pageName} submenu`}
          className="p-2 text-[#A3E635]"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      <ul
        className={`overflow-hidden bg-black/20 transition-all duration-300 ${
          open ? 'max-h-96 py-1 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {subPages.map((sub) => (
          <li key={sub}>
            <Link
              to={subPagePath(page.pageName, sub)}
              className="block px-5 py-2.5 text-sm text-white/85 transition-colors hover:text-[#A3E635]"
            >
              {sub}
            </Link>
          </li>
        ))}
      </ul>
    </li>
  )
}

const Navbar = () => {
  const location = useLocation()
  const [pages, setPages] = useState([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    let cancelled = false
    const loadPages = async () => {
      try {
        const res = await webApi.getPages()
        const list = res?.success ? res.data : []
        if (!cancelled && Array.isArray(list) && list.length) {
          setPages(groupPages(list))
        }
      } catch (err) {
        console.error('Navbar: failed to load pages', err)
      }
    }
    loadPages()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  const isHidden = hiddenRoutes.some(
    (route) => location.pathname === route || location.pathname.startsWith(`${route}/`)
  )
  if (isHidden) return null

  return (
    <header
      className={`sticky top-0 z-50 bg-[#0B2545] transition-shadow duration-300 ${
        scrolled ? 'shadow-lg shadow-[#0B2545]/40' : ''
      }`}
    >
      <nav
        aria-label="Main navigation"
        className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3 lg:grid lg:grid-cols-[1fr_auto_1fr]"
      >
        <div className="lg:justify-self-start">
          <Logo />
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          aria-controls="lena-nav-menu"
          className="flex h-10 w-10 flex-col items-center justify-center gap-[5px] rounded-lg border border-[#A3E635]/50 lg:hidden"
        >
          <span className={`block h-0.5 w-5 rounded bg-[#A3E635] transition-transform duration-300 ${menuOpen ? 'translate-y-[7px] rotate-45' : ''}`} />
          <span className={`block h-0.5 w-5 rounded bg-[#A3E635] transition-opacity duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`block h-0.5 w-5 rounded bg-[#A3E635] transition-transform duration-300 ${menuOpen ? '-translate-y-[7px] -rotate-45' : ''}`} />
        </button>

        {/* CENTER: menu */}
        <ul
          id="lena-nav-menu"
          className={`absolute left-0 right-0 top-full flex flex-col overflow-hidden border-b-[3px] border-[#A3E635] bg-[#0B2545] px-6 transition-all duration-300 lg:static lg:max-h-none lg:flex-row lg:items-center lg:justify-center lg:gap-1 lg:overflow-visible lg:border-0 lg:bg-transparent lg:p-0 lg:opacity-100 ${
            menuOpen ? 'max-h-[40rem] pb-5 pt-2 opacity-100' : 'pointer-events-none max-h-0 opacity-0 lg:pointer-events-auto'
          }`}
        >
          {pages.map((page) => {
            const subPages = page.subPages || []

            if (subPages.length) {
              return (
                <React.Fragment key={page.id}>
                  <div className="hidden lg:block">
                    <DesktopDropdown page={page} subPages={subPages} />
                  </div>
                  <div className="lg:hidden">
                    <MobileItem page={page} subPages={subPages} />
                  </div>
                </React.Fragment>
              )
            }

            const path = toPath(page.pageName)
            return (
              <li key={page.id}>
                <NavLink
                  to={path}
                  end={path === '/'}
                  className={({ isActive }) =>
                    `group relative block border-b border-white/10 px-1 py-3.5 text-[0.95rem] font-medium tracking-wide transition-colors duration-200 hover:text-[#A3E635] lg:border-0 lg:px-4 lg:py-2.5 ${
                      isActive ? 'text-[#A3E635]' : 'text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {page.pageName}
                      <span
                        className={`absolute bottom-1 left-4 right-4 hidden h-0.5 origin-left bg-[#A3E635] transition-transform duration-300 lg:block ${
                          isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                        }`}
                      />
                    </>
                  )}
                </NavLink>
              </li>
            )
          })}

          <li className="pt-5 lg:hidden">
            <ContactInfo className="flex flex-col items-start" />
          </li>
        </ul>

        <ContactInfo className="hidden lg:flex lg:justify-self-end" />
      </nav>
    </header>
  )
}

export default Navbar