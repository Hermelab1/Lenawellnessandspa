import React, { useEffect, useMemo, useState } from 'react'
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

/* ---------- Helpers ---------- */
const firstContent = (res) =>
  res?.success && Array.isArray(res.data)
    ? res.data.filter((c) => !c.isDeleted).sort((a, b) => a.id - b.id)[0]?.content || ''
    : ''

// Parses the section-12 text block:
// heading \n paragraph \n\n Call Us \n number \n Email Us \n email \n Location \n line1 \n line2
const parseInfo = (text = '') => {
  const lines = text
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
  const match = html.match(/src="([^"]+)"/i)
  const src = match?.[1]?.replace(/&amp;/g, '&')
  return src && src.startsWith('https://www.google.com/maps/embed') ? src : ''
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
const InfoRow = ({ icon, label, children, href }) => (
  <div className="flex items-start gap-4">
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#A3E635]/60 bg-[#A3E635]/15 text-[#0B2545]">
      <InfoIcon type={icon} />
    </div>
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0B2545]/55">
        {label}
      </p>
      {href ? (
        <a
          href={href}
          className="mt-1 block text-lg font-semibold text-[#0B2545] transition-colors hover:text-[#4d7c0f]"
        >
          {children}
        </a>
      ) : (
        <div className="mt-1 text-lg font-semibold leading-snug text-[#0B2545]">{children}</div>
      )}
    </div>
  </div>
)

const inputClass =
  'w-full rounded-xl border border-[#0B2545]/15 bg-white px-4 py-3 text-[#0B2545] placeholder-[#0B2545]/35 outline-none transition focus:border-[#A3E635] focus:ring-2 focus:ring-[#A3E635]/50'

const Field = ({ label, required, children }) => (
  <label className="block">
    <span className="mb-1.5 block text-sm font-semibold text-[#0B2545]">
      {label} {required && <span className="text-[#4d7c0f]">*</span>}
    </span>
    {children}
  </label>
)

/* ---------- Page ---------- */
const ContactUs = () => {
  const [eyebrow, setEyebrow] = useState('')
  const [info, setInfo] = useState(parseInfo(''))
  const [mapSrc, setMapSrc] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' })
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

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  // No "inquiry" endpoint exists in apilist yet, so this opens the visitor's email app
  // addressed to the email from the API. Replace with an API call when your backend is ready.
  const handleSubmit = (e) => {
    e.preventDefault()
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
    setForm({ name: '', phone: '', email: '', message: '' })
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0B2545]/20 border-t-[#A3E635]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white px-6 text-center text-[#0B2545]/70">
        {error}
      </div>
    )
  }

  return (
    <main className="bg-white">
      {/* HERO (section 11) */}
      <section className="relative overflow-hidden bg-[#0B2545] text-white">
        <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#A3E635]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-[#13315c] blur-3xl" />

        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 py-20 text-center sm:py-28">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[#A3E635]">
            Contact Us
          </span>
          <h1 className="mt-4 font-serif text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            {eyebrow || 'Reach Out To Us'}
          </h1>
          <div className="mt-6 h-1 w-20 rounded-full bg-[#A3E635]" />
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2 lg:gap-16">
        {/* LEFT: info */}
        <div>
          <h2 className="font-serif text-4xl font-bold leading-tight text-[#0B2545] sm:text-5xl">
            {info.heading}
          </h2>
          <div className="mt-4 h-1 w-16 rounded-full bg-[#A3E635]" />

          {info.paragraph && (
            <p className="mt-6 text-lg leading-relaxed text-[#0B2545]/75">{info.paragraph}</p>
          )}

          <div className="mt-10 space-y-7">
            {info.phone && (
              <InfoRow icon="phone" label="Call Us" href={phoneHref}>
                {info.phone}
              </InfoRow>
            )}
            {info.email && (
              <InfoRow icon="mail" label="Email Us" href={`mailto:${info.email}`}>
                {info.email}
              </InfoRow>
            )}
            {info.location.length > 0 && (
              <InfoRow icon="pin" label="Location">
                {info.location.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </InfoRow>
            )}
          </div>

          <div className="mt-10 border-t border-[#0B2545]/10 pt-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0B2545]/55">
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
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#0B2545]/20 text-[#0B2545] transition duration-200 hover:-translate-y-0.5 hover:border-[#A3E635] hover:bg-[#A3E635]"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]" aria-hidden="true">
                    {socialPaths[s.icon]}
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: form */}
        <div className="rounded-3xl border border-[#0B2545]/10 bg-white p-8 shadow-xl shadow-[#0B2545]/10 sm:p-10">
          <h2 className="font-serif text-3xl font-bold text-[#0B2545]">Send an Inquiry</h2>
          <p className="mt-2 text-[#0B2545]/70">
            Have a question or custom request? Fill in your details below.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Full Name" required>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="John Doe"
                  value={form.name}
                  onChange={handleChange}
                  className={inputClass}
                />
              </Field>
              <Field label="Phone Number" required>
                <input
                  name="phone"
                  type="tel"
                  required
                  placeholder="0911000000"
                  value={form.phone}
                  onChange={handleChange}
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Email Address">
              <input
                name="email"
                type="email"
                placeholder="example@domain.com"
                value={form.email}
                onChange={handleChange}
                className={inputClass}
              />
            </Field>

            <Field label="Message / Requirements">
              <textarea
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
              className="w-full rounded-xl bg-[#A3E635] py-3.5 text-base font-bold text-[#0B2545] shadow-lg shadow-[#A3E635]/30 transition duration-200 hover:-translate-y-0.5 hover:bg-[#bef264] active:scale-[0.99]"
            >
              Send Message
            </button>

            {sent && (
              <p className="rounded-xl bg-[#A3E635]/15 px-4 py-3 text-sm text-[#0B2545]">
                Thank you! Your email app has opened with your message. Just press send.
              </p>
            )}
          </form>
        </div>
      </section>

      {/* MAP */}
      {mapSrc && (
        <section className="w-full">
          <iframe
            title="Lena Wellness & Spa location"
            src={mapSrc}
            className="block h-[28rem] w-full border-0 sm:h-[36rem]"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </section>
      )}
    </main>
  )
}

export default ContactUs