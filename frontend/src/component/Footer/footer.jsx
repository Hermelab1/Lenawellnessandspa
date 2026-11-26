import React, { useState } from 'react'
import { Link } from 'react-router-dom'

// ✏️ Same paths as the Home page / navbar
const LINKS = {
  home: '/',
  about: '/aboutus',
  services: '/ourservice',
  packages: '/ourpackages',
  contact: '/contact',
}

const QUICK_LINKS = [
  { label: 'Home', to: LINKS.home },
  { label: 'About Us', to: LINKS.about },
  { label: 'Our Services', to: LINKS.services },
  { label: 'Packages', to: LINKS.packages },
  { label: 'Contact Us', to: LINKS.contact },
]

const CONTACT = {
  phone: '0938922222',
  email: 'info@lenaspawellness.com',
  addressLines: ['Meskel Flower, Gabon Street,', 'Next to Dreamliner Hotel'],
}

// ✏️ Replace each "#" with your real social media page link
const SOCIALS = [
  {
    name: 'Facebook',
    href: '#',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z" />
      </svg>
    ),
  },
  {
    name: 'Instagram',
    href: '#',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    name: 'TikTok',
    href: '#',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d="M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.7a5.7 5.7 0 1 0 4.9 5.7V9a7.3 7.3 0 0 0 4.3 1.4V7.3a4.3 4.3 0 0 1-3.2-1.5z" />
      </svg>
    ),
  },
  {
    name: 'Telegram',
    href: '#',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d="M21.5 4.5 2.9 11.7c-1.3.5-1.2 1.2-.2 1.5l4.7 1.5 1.8 5.6c.2.6.1.8.8.8.5 0 .7-.2 1-.5l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.7-.8l3.1-14.8c.3-1.2-.5-1.8-1.4-1.4z" />
      </svg>
    ),
  },
]

/* ---------- Logo (same as the Navbar logo) ---------- */
const LOGO_GREEN = '#A6E22E'

const Logo = () => (
  <Link to={LINKS.home} aria-label="Lena Wellness - Home" className="inline-flex items-center no-underline">
    <svg
      className="h-16 w-auto shrink-0 sm:h-20"
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

const IconWrap = ({ children }) => (
  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#A3E635]/15 text-[#A3E635]">
    {children}
  </span>
)

const ColumnTitle = ({ children }) => (
  <>
    <h3 className="font-serif text-lg font-bold text-[#A3E635]">{children}</h3>
    <div className="mt-2 h-1 w-10 rounded-full bg-[#A3E635]" />
  </>
)

const Footer = () => {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('') // '' | 'success' | 'error'

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setStatus('error')
      return
    }
    // ✏️ Connect your subscribe API here, e.g. await webApi.subscribe({ email })
    setStatus('success')
    setEmail('')
  }

  return (
    <footer className="relative overflow-hidden bg-[#0B2545] text-white">
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#A3E635]/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4">
        {/* Logo + short about + social */}
        <div>
          <Logo />

          <p className="mt-5 max-w-sm leading-relaxed text-white/75">
            A calm place to relax, restore and renew. Our caring team offers treatments that leave you refreshed in
            body and mind.
          </p>

          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-[#A3E635]">Follow Us</p>
          <div className="mt-3 flex gap-3">
            {SOCIALS.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.name}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition duration-200 hover:-translate-y-0.5 hover:border-[#A3E635] hover:bg-[#A3E635] hover:text-[#0B2545]"
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div>
          <ColumnTitle>Quick Links</ColumnTitle>

          <ul className="mt-6 space-y-3">
            {QUICK_LINKS.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-white/75 transition duration-200 hover:text-[#A3E635]">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>

          <Link
            to={LINKS.contact}
            className="mt-6 inline-block rounded-full bg-[#A3E635] px-8 py-3 text-sm font-bold text-[#0B2545] transition duration-200 hover:-translate-y-0.5 hover:bg-[#D9F99D]"
          >
            Book Now
          </Link>
        </div>

        {/* Contact info */}
        <div>
          <ColumnTitle>Contact Us</ColumnTitle>

          <ul className="mt-6 space-y-5">
            <li className="flex items-start gap-3">
              <IconWrap>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
                </svg>
              </IconWrap>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A3E635]">Call Us</p>
                <a href={`tel:${CONTACT.phone}`} className="mt-1 block text-white/85 transition hover:text-[#A3E635]">
                  {CONTACT.phone}
                </a>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <IconWrap>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-10 6L2 7" />
                </svg>
              </IconWrap>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A3E635]">Email Us</p>
                <a href={`mailto:${CONTACT.email}`} className="mt-1 block break-all text-white/85 transition hover:text-[#A3E635]">
                  {CONTACT.email}
                </a>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <IconWrap>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </IconWrap>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A3E635]">Location</p>
                <address className="mt-1 not-italic leading-relaxed text-white/85">
                  {CONTACT.addressLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </address>
              </div>
            </li>
          </ul>
        </div>

        {/* Subscribe */}
        <div>
          <ColumnTitle>Subscribe</ColumnTitle>

          <p className="mt-6 leading-relaxed text-white/75">
            Get wellness tips, special offers and news straight to your inbox.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3" noValidate>
            <label htmlFor="footer-email" className="sr-only">
              Email address
            </label>
            <input
              id="footer-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (status) setStatus('')
              }}
              placeholder="Your email address"
              className="w-full rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm text-white placeholder-white/50 outline-none transition focus:border-[#A3E635]"
            />
            <button
              type="submit"
              className="rounded-full bg-[#A3E635] px-6 py-3 text-sm font-bold text-[#0B2545] transition duration-200 hover:-translate-y-0.5 hover:bg-[#D9F99D]"
            >
              Subscribe
            </button>
          </form>

          {status === 'success' && (
            <p className="mt-3 text-sm text-[#A3E635]" role="status">
              Thank you for subscribing!
            </p>
          )}
          {status === 'error' && (
            <p className="mt-3 text-sm text-red-300" role="alert">
              Please enter a valid email address.
            </p>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative border-t border-white/10">
        <p className="mx-auto max-w-6xl px-6 py-5 text-center text-sm text-white/60">
          © {new Date().getFullYear()} Lena Wellness &amp; Spa. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

export default Footer