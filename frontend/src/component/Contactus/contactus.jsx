import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { webApi } from '../Api/apilist'

// Section ids from your API (GET /contents/section/:id)
const SECTION_EYEBROW = 11 // "Reach Out To Us"
const SECTION_INFO = 12 //    heading, paragraph, phone, email, location
const SECTION_MAP = 13 //     google maps iframe

// ✏️ Replace with your real social pages
const socialLinks = [
  { name: 'Facebook', href: 'https://facebook.com/', icon: 'facebook' },
  { name: 'Instagram', href: 'https://instagram.com/', icon: 'instagram' },
  { name: 'TikTok', href: 'https://tiktok.com/', icon: 'tiktok' },
  { name: 'Telegram', href: 'https://t.me/', icon: 'telegram' },
]

const EMPTY_FORM = { name: '', phone: '', email: '', message: '' }

/* ---------- Helpers ---------- */
const firstContent = (res) =>
  res?.success && Array.isArray(res.data)
    ? res.data.filter((c) => !c.isDeleted).sort((a, b) => a.id - b.id)[0]?.content || ''
    : ''

// Parses the section-12 text block:
// heading \n paragraph \n\n Call Us \n number \n Email Us \n email \n Location \n line1 \n line2
const parseInfo = (text = '') => {
  const lines = (text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const labelIndex = (label) => lines.findIndex((l) => l.toLowerCase() === label)
  const iCall = labelIndex('call us')
  const iEmail = labelIndex('email us')
  const iLoc = labelIndex('location')

  const firstLabel = [iCall, iEmail, iLoc].filter((i) => i >= 0).sort((a, b) => a - b)[0]
  const intro = firstLabel >= 0 ? lines.slice(0, firstLabel) : lines

  return {
    heading: intro[0] || '',
    paragraph: intro.slice(1).join(' '),
    phone: iCall >= 0 ? lines[iCall + 1] || '' : '',
    email: iEmail >= 0 ? lines[iEmail + 1] || '' : '',
    location: iLoc >= 0 ? lines.slice(iLoc + 1) : [],
  }
}

// Only accept a Google Maps embed URL from the stored iframe HTML (safer than injecting raw HTML)
const getMapSrc = (html = '') => {
  const match = (html || '').match(/src="([^"]+)"/i)
  const src = match?.[1]?.replace(/&amp;/g, '&')
  return src && src.startsWith('https://www.google.com/maps/embed') ? src : ''
}

/* ---------- Reveal ---------- */
const Reveal = ({ children, className = '', delay = 0 }) => {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return undefined

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduceMotion || typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return undefined
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          io.unobserve(node)
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -6% 0px' }
    )
    io.observe(node)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transform-gpu transition-all duration-700 ease-out motion-reduce:transition-none ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      } ${className}`}
    >
      {children}
    </div>
  )
}

/* ---------- Icons ---------- */
const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

const InfoIcon = ({ type }) => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true" {...stroke}>
    {type === 'phone' && (
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
    )}
    {type === 'mail' && (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="m3.5 7 8.5 6 8.5-6" />
      </>
    )}
    {type === 'pin' && (
      <>
        <path d="M12 21s-7-5.6-7-11a7 7 0 1 1 14 0c0 5.4-7 11-7 11z" />
        <circle cx="12" cy="10" r="2.6" />
      </>
    )}
  </svg>
)

const ChevronRight = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-3 w-3"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m9 6 6 6-6 6" />
  </svg>
)

const ArrowRight = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

const SendIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
)

const socialPaths = {
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
  telegram: (
    <path d="M20.6 4.6 3.5 11.2c-.8.3-.8 1.4 0 1.6l4.2 1.3 1.6 5c.2.6 1 .8 1.4.3l2.3-2.2 4.4 3.2c.5.4 1.3.1 1.4-.5l2.7-14.4c.2-.8-.5-1.5-1.2-1.4zM9.4 13.6l7.8-5-6 5.6-.3 2.7-1.5-3.3z" />
  ),
}

/* ---------- Pieces ---------- */
const InfoCard = ({ icon, label, children, href, external }) => {
  const body = (
    <div className="group flex items-start gap-4 rounded-2xl border border-[#0B2545]/10 bg-white p-5 shadow-sm shadow-[#0B2545]/5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#A3E635]/60 hover:shadow-lg hover:shadow-[#0B2545]/10">
      <div className="flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0B2545] to-[#13315c] text-[#A3E635] shadow-md shadow-[#0B2545]/20 transition-all duration-300 group-hover:from-[#A3E635] group-hover:to-[#84cc16] group-hover:text-[#0B2545]">
        <InfoIcon type={icon} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#4d7c0f]">{label}</p>
        <div className="mt-1 break-words text-base font-semibold leading-snug text-[#0B2545] sm:text-lg">
          {children}
        </div>
      </div>
    </div>
  )

  return href ? (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#A3E635] focus-visible:ring-offset-2"
    >
      {body}
    </a>
  ) : (
    body
  )
}

const inputClass =
  'w-full rounded-xl border border-[#0B2545]/15 bg-white px-4 py-3 text-[#0B2545] placeholder-[#0B2545]/35 outline-none transition focus:border-[#A3E635] focus:ring-2 focus:ring-[#A3E635]/50'

const Field = ({ label, required, htmlFor, children }) => (
  <div>
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-[#0B2545]">
      {label} {required && <span className="text-[#4d7c0f]">*</span>}
    </label>
    {children}
  </div>
)

/* ---------- Page ---------- */
const ContactUs = () => {
  const [eyebrow, setEyebrow] = useState('')
  const [info, setInfo] = useState(parseInfo(''))
  const [mapSrc, setMapSrc] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [form, setForm] = useState(EMPTY_FORM)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const results = await Promise.allSettled([
        webApi.getContentBySection(SECTION_EYEBROW),
        webApi.getContentBySection(SECTION_INFO),
        webApi.getContentBySection(SECTION_MAP),
      ])
      if (cancelled) return

      const [a, b, c] = results.map((r) => (r.status === 'fulfilled' ? r.value : null))
      setEyebrow(firstContent(a))
      setInfo(parseInfo(firstContent(b)))
      setMapSrc(getMapSrc(firstContent(c)))

      if (results.every((r) => r.status === 'rejected')) {
        setError('We could not load the contact details right now. Please try again later.')
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const phoneHref = useMemo(() => `tel:${info.phone.replace(/[^\d+]/g, '')}`, [info.phone])

  const directionsHref = useMemo(
    () =>
      info.location.length > 0
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            info.location.join(', ')
          )}`
        : '',
    [info.location]
  )

  const handleChange = (e) => {
    const { name, value } = e.target
    setSent(false)
    setForm((f) => ({ ...f, [name]: value }))
  }

  // No "inquiry" endpoint exists in apilist yet, so this opens the visitor's email app
  // addressed to the email from the API. Replace with an API call when your backend is ready.
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!info.email) return

    const body = [
      `Name: ${form.name}`,
      `Phone: ${form.phone}`,
      form.email && `Email: ${form.email}`,
      '',
      form.message,
    ]
      .filter((l) => l !== false && l !== '')
      .join('\n')

    window.location.href = `mailto:${info.email}?subject=${encodeURIComponent(
      `Inquiry from ${form.name}`
    )}&body=${encodeURIComponent(body)}`

    setSent(true)
    setForm(EMPTY_FORM)
  }

  if (loading) {
    return (
      <div
        className="flex min-h-[60vh] flex-col items-center justify-center gap-5 bg-white"
        role="status"
        aria-live="polite"
      >
        <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-[#0B2545]/10 border-t-[#A3E635]" />
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#0B2545]/40">
          Loading
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="flex min-h-[60vh] items-center justify-center bg-white px-6 text-center"
        role="alert"
      >
        <div className="max-w-md">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0B2545] text-[#A3E635]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7"
              aria-hidden="true"
            >
              <path d="M12 9v4M12 17h.01M10.3 3.9 2.7 18a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            </svg>
          </div>
          <p className="mt-5 text-[#0B2545]/70">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-full bg-[#0B2545] px-6 py-2.5 text-sm font-bold text-[#A3E635] transition hover:bg-[#13315c]"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className="overflow-x-clip bg-white">
      {/* HERO (section 11) — compact */}
      <section className="relative isolate overflow-hidden bg-[#0B2545] text-white min-h-[45vh]">
        <div className="pointer-events-none absolute -left-32 -top-32 -z-10 h-80 w-80 rounded-full bg-[#A3E635]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -right-24 -z-10 h-96 w-96 rounded-full bg-[#13315c]/70 blur-3xl" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #A3E635 1px, transparent 1px), linear-gradient(to bottom, #A3E635 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-6 py-14 text-center sm:py-16">
          <Reveal>
            <nav aria-label="Breadcrumb">
              <ol className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/70 backdrop-blur-md">
                <li>
                  <Link to="/" className="transition-colors hover:text-[#A3E635]">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true" className="text-[#A3E635]">
                  <ChevronRight />
                </li>
                <li aria-current="page" className="text-[#A3E635]">
                  Contact Us
                </li>
              </ol>
            </nav>
          </Reveal>

          <Reveal delay={120}>
            <h1 className="mt-5 max-w-3xl font-serif text-2xl font-bold leading-[1.2] tracking-tight drop-shadow-lg sm:text-3xl lg:text-4xl">
              {eyebrow || 'Reach Out To Us'}
            </h1>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-6 h-[3px] w-16 rounded-full bg-gradient-to-r from-[#A3E635] to-[#4d7c0f]" />
          </Reveal>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#A3E635]/50 to-transparent" />
      </section>

      {/* INFO + FORM */}
      <section className="relative overflow-hidden bg-white py-16 sm:py-20 lg:py-24">
        <div className="pointer-events-none absolute right-0 top-20 h-72 w-72 rounded-full bg-[#A3E635]/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-2 lg:gap-16">
          {/* LEFT: info */}
          <Reveal>
            <span className="inline-flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.32em] text-[#4d7c0f]">
              <span className="h-px w-8 bg-[#4d7c0f]/40" />
              Get In Touch
            </span>

            {info.heading && (
              <h2 className="mt-4 font-serif text-3xl font-bold leading-tight text-[#0B2545] sm:text-4xl lg:text-[2.6rem]">
                {info.heading}
              </h2>
            )}
            <div className="mt-5 h-[3px] w-14 rounded-full bg-gradient-to-r from-[#A3E635] to-[#4d7c0f]" />

            {info.paragraph && (
              <p className="mt-6 text-[17px] leading-[1.85] text-[#0B2545]/75">{info.paragraph}</p>
            )}

            <div className="mt-8 space-y-4">
              {info.phone && (
                <InfoCard icon="phone" label="Call Us" href={phoneHref}>
                  {info.phone}
                </InfoCard>
              )}
              {info.email && (
                <InfoCard icon="mail" label="Email Us" href={`mailto:${info.email}`}>
                  {info.email}
                </InfoCard>
              )}
              {info.location.length > 0 && (
                <InfoCard icon="pin" label="Location" href={directionsHref} external>
                  {info.location.map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                  <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#4d7c0f]">
                    Get directions
                    <ArrowRight />
                  </span>
                </InfoCard>
              )}
            </div>

            <div className="mt-10 border-t border-[#0B2545]/10 pt-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#0B2545]/55">
                Follow Us
              </p>
              <div className="mt-4 flex items-center gap-3">
                {socialLinks.map((s) => (
                  <a
                    key={s.name}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.name}
                    title={s.name}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-[#0B2545]/15 text-[#0B2545] transition duration-200 hover:-translate-y-0.5 hover:border-[#A3E635] hover:bg-[#A3E635] hover:shadow-lg hover:shadow-[#A3E635]/30"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-[18px] w-[18px]"
                      aria-hidden="true"
                    >
                      {socialPaths[s.icon]}
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          </Reveal>

          {/* RIGHT: form */}
          <Reveal delay={120}>
            <div className="relative overflow-hidden rounded-3xl border border-[#0B2545]/10 bg-white p-8 shadow-2xl shadow-[#0B2545]/10 sm:p-10">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#A3E635] via-[#4d7c0f] to-transparent" />

              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#4d7c0f]">
                Inquiry Form
              </p>
              <h2 className="mt-2 font-serif text-2xl font-bold text-[#0B2545] sm:text-3xl">
                Send an Inquiry
              </h2>
              <p className="mt-2 text-[#0B2545]/70">
                Have a question or custom request? Fill in your details below.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Full Name" required htmlFor="contact-name">
                    <input
                      id="contact-name"
                      name="name"
                      type="text"
                      required
                      autoComplete="name"
                      placeholder="John Doe"
                      value={form.name}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Phone Number" required htmlFor="contact-phone">
                    <input
                      id="contact-phone"
                      name="phone"
                      type="tel"
                      required
                      autoComplete="tel"
                      placeholder="0911000000"
                      value={form.phone}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </Field>
                </div>

                <Field label="Email Address" htmlFor="contact-email">
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="example@domain.com"
                    value={form.email}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </Field>

                <Field label="Message / Requirements" htmlFor="contact-message">
                  <textarea
                    id="contact-message"
                    name="message"
                    rows={5}
                    placeholder="Tell us how we can help you..."
                    value={form.message}
                    onChange={handleChange}
                    className={`${inputClass} resize-none`}
                  />
                </Field>

                <button
                  type="submit"
                  disabled={!info.email}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#A3E635] py-3.5 text-base font-bold text-[#0B2545] shadow-lg shadow-[#A3E635]/30 transition duration-200 hover:-translate-y-0.5 hover:bg-[#b6f04f] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  Send Message
                  <SendIcon />
                </button>

                <div aria-live="polite">
                  {sent && (
                    <p className="flex items-start gap-3 rounded-xl border border-[#A3E635]/50 bg-[#A3E635]/15 px-4 py-3 text-sm text-[#0B2545]">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#A3E635]">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-3 w-3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="m5 12.5 4.5 4.5L19 7.5" />
                        </svg>
                      </span>
                      Thank you! Your email app has opened with your message. Just press send.
                    </p>
                  )}
                </div>
              </form>
            </div>
          </Reveal>
        </div>
      </section>

      {/* MAP */}
      {mapSrc && (
        <section className="bg-[#0B2545]/[0.035] pt-12 sm:pt-20">
          <div className="mx-auto">
            <Reveal>
              <div className="mb-10 text-center">
                <span className="inline-flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.32em] text-[#4d7c0f]">
                  <span className="h-px w-8 bg-[#4d7c0f]/40" />
                  Find Us
                  <span className="h-px w-8 bg-[#4d7c0f]/40" />
                </span>
                <h2 className="mt-4 font-serif text-3xl font-bold text-[#0B2545] sm:text-4xl">
                  Visit Our Spot
                </h2>
                <div className="mx-auto mt-5 h-[3px] w-14 rounded-full bg-gradient-to-r from-[#A3E635] to-[#4d7c0f]" />
              </div>

              <div className="overflow-hidden rounded-3xl border border-[#0B2545]/10 shadow-2xl shadow-[#0B2545]/15">
                <iframe
                  title="Lena Wellness & Spa location"
                  src={mapSrc}
                  className="block h-[22rem] w-full border-0 sm:h-[30rem]"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </Reveal>
          </div>
        </section>
      )}
    </main>
  )
}

export default ContactUs