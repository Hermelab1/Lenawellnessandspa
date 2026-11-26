import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { webApi } from '../Api/apilist'
import aboutImage from '../../asset/img/Herosection/herosection.jpg'
import Footer from '../Footer/footer'

const GYM_PAGE_ID = 3
const API_ORIGIN = (process.env.REACT_APP_API_URL || 'http://localhost:3001/api').replace(
  /\/api\/?$/,
  ''
)

/* ---------- Helpers ---------- */
const sortById = (list = []) => list.filter((i) => !i.isDeleted).sort((a, b) => a.id - b.id)

// The API returns contentImages as a JSON array string of base64 data URIs
// (e.g. '["data:image/jpeg;base64,..."]'). Older rows may hold a plain
// comma-separated list of paths/URLs, so both shapes are supported.
// NOTE: base64 contains commas, so a data URI must never be split on ','.
const parseImageList = (value) => {
  if (Array.isArray(value)) return value
  const raw = String(value || '').trim()
  if (!raw) return []
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  if (raw.startsWith('data:')) return [raw]
  return raw.split(',')
}

const getImages = (value) =>
  parseImageList(value)
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean)
    .map((src) =>
      /^(https?:|data:|blob:)/.test(src) || src.startsWith('//')
        ? src
        : `${API_ORIGIN}/${src.replace(/^\//, '')}`
    )

const clean = (s = '') => s.replace(/\s+/g, ' ').trim()
const toLines = (text = '') =>
  text
    .split('\n')
    .map((l) => clean(l))
    .filter(Boolean)

const parseCard = (text = '') => {
  const lines = toLines(text)
  const [title, ...body] = lines
  return { title: title || '', body }
}

const parsePackage = (text = '') => {
  const lines = toLines(text)
  const [title, ...rest] = lines
  // The 2nd line is only a price if it looks like one ("0 Birr", "$20", "Free", "500 ETB / month").
  // Otherwise it is already the first feature (e.g. the "Lena" and "Royal" plans have no price line).
  const looksLikePrice = (l = '') => /^free\b|[$€£]\s*\d|\d\s*(birr|etb|usd|br)\b/i.test(l.trim())
  const hasPrice = rest.length > 0 && looksLikePrice(rest[0])
  return {
    title: title || '',
    price: hasPrice ? rest[0] : '',
    features: hasPrice ? rest.slice(1) : rest,
  }
}

const parseSchedule = (contents) => {
  const items = []
  contents.forEach((c) => {
    const lines = toLines(c.content)
    for (let i = 0; i < lines.length; i += 2) {
      if (lines[i]) items.push({ title: lines[i], time: lines[i + 1] || '' })
    }
  })
  return items
}

/* ---------- Reveal wrapper ---------- */
const Reveal = ({ children, className = '', delay = 0, as: Tag = 'div' }) => {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return undefined
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          io.unobserve(node)
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -8% 0px' }
    )
    io.observe(node)
    return () => io.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transform-gpu transition-all duration-700 ease-out ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      } ${className}`}
    >
      {children}
    </Tag>
  )
}

/* ---------- Shared UI ---------- */
const Eyebrow = ({ children, dark }) => (
  <span className={`text-xs font-bold uppercase tracking-[0.3em] ${dark ? 'text-[#A3E635]' : 'text-[#4d7c0f]'}`}>
    {children}
  </span>
)

const SectionTitle = ({ eyebrow, title, center = true, dark }) => (
  <div className={center ? 'text-center' : ''}>
    {eyebrow && <Eyebrow dark={dark}>{eyebrow}</Eyebrow>}
    <h2 className={`mt-3 font-serif text-3xl font-bold sm:text-4xl ${dark ? 'text-white' : 'text-[#0B2545]'}`}>{title}</h2>
    <div className={`mt-4 h-1 w-16 rounded-full bg-[#A3E635] ${center ? 'mx-auto' : ''}`} />
  </div>
)

const Check = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
)

/* ---------- Membership registration helpers ---------- */
const todayLocal = () => {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

// Sends the registration to the API and normalises the result.
const submitMembership = async (payload) => {
  try {
    const res = await webApi.createMembershipRequest(payload)
    return res?.success
      ? { ok: true }
      : { ok: false, message: res?.message || 'Could not send your registration.' }
  } catch (err) {
    return {
      ok: false,
      message: err?.response?.data?.message || 'Could not send your registration. Please try again.',
    }
  }
}

/* =====================================================
   HERO
===================================================== */
const HeroSection = ({ section }) => {
  const contents = sortById(section.contents)
  const heroImages = contents.flatMap((c) => getImages(c.contentImages))
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (heroImages.length < 2) return undefined
    const timer = setInterval(() => setCurrent((c) => (c + 1) % heroImages.length), 5500)
    return () => clearInterval(timer)
  }, [heroImages.length])

  // Banner content: first line = small label ("LENA GYM & FITNESS"), remaining lines = headline.
  const lines = contents.flatMap((c) => toLines(c.content))
  const [eyebrow, ...titleLines] = lines.length > 1 ? lines : ['', ...lines]
  const mainTitle = titleLines.join(' ')

  return (
    <section id="hero" className="relative overflow-hidden bg-[#0B2545] text-white">
      {heroImages.map((src, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={`absolute inset-0 bg-cover bg-center ${i === current ? 'opacity-100' : 'opacity-0'}`}
          style={{
            backgroundImage: `url("${src}")`,
            transform: i === current ? 'scale(1.06)' : 'scale(1)',
            transition: 'opacity 1200ms ease, transform 7000ms ease-out',
          }}
        />
      ))}
      <div className="absolute inset-0 bg-[#0B2545]/70" />

      <div className="relative mx-auto flex min-h-[45vh] max-w-6xl items-center justify-center px-6 py-16 sm:py-20">
        <div className="max-w-2xl text-center">
          {eyebrow && (
            <Reveal>
              <div className="flex items-center justify-center gap-3">
                <span className="h-px w-8 bg-[#A3E635]" />
                <Eyebrow dark>{eyebrow}</Eyebrow>
                <span className="h-px w-8 bg-[#A3E635]" />
              </div>
            </Reveal>
          )}
          <Reveal delay={100}>
            <h1 className="mt-4 font-serif text-xl font-bold leading-snug sm:text-2xl lg:text-3xl">
              {mainTitle}
            </h1>
          </Reveal>
          <Reveal delay={300}>
            <div className="mx-auto mt-5 h-1 w-16 rounded-full bg-[#A3E635]" />
          </Reveal>
        </div>
      </div>

      {heroImages.length > 1 && (
        <div className="absolute inset-x-0 bottom-6 z-20 flex justify-center gap-2">
          {heroImages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrent(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === current}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current ? 'w-8 bg-[#A3E635]' : 'w-4 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  )
}

/* =====================================================
   SERVICES (Auto-swiping — 3 at a time)
===================================================== */
const ServicesSection = ({ section }) => {
  const contents = sortById(section.contents)
  const cards = contents.map((c) => ({
    id: c.id,
    image: getImages(c.contentImages)[0],
    ...parseCard(c.content),
  }))

  const [index, setIndex] = useState(0)
  const [perView, setPerView] = useState(3)
  const [paused, setPaused] = useState(false)
  const dragStart = useRef(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      setPerView(w < 640 ? 1 : w < 1024 ? 2 : 3)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const maxIndex = Math.max(0, cards.length - perView)
  const clamp = useCallback((i) => Math.min(Math.max(i, 0), maxIndex), [maxIndex])

  useEffect(() => {
    setIndex((i) => Math.min(i, maxIndex))
  }, [maxIndex])

  useEffect(() => {
    if (paused || dragging || maxIndex === 0) return undefined
    const timer = setInterval(() => setIndex((i) => (i >= maxIndex ? 0 : i + 1)), 4000)
    return () => clearInterval(timer)
  }, [paused, dragging, maxIndex])

  if (!cards.length) return null

  const goTo = (i) => setIndex(clamp(i))
  const prev = () => goTo(index - 1)
  const next = () => goTo(index >= maxIndex ? 0 : index + 1)

  const onPointerDown = (e) => {
    dragStart.current = { x: e.clientX, index }
    setDragging(true)
  }
  const onPointerMove = (e) => {
    if (!dragStart.current) return
    const dx = e.clientX - dragStart.current.x
    if (Math.abs(dx) > 50) {
      if (dx < 0) next()
      else prev()
      dragStart.current = null
      setDragging(false)
    }
  }
  const onPointerUp = () => {
    dragStart.current = null
    setDragging(false)
  }

  return (
    <section
      id="services"
      className="overflow-hidden bg-white py-20 sm:py-24"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <SectionTitle eyebrow="What We Offer" title={section.sectionName.trim()} />
        </Reveal>

        <Reveal delay={120}>
          <div className="relative mt-12">
            <div
              className="-mx-2 overflow-hidden px-2"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              style={{ cursor: dragging ? 'grabbing' : 'grab', touchAction: 'pan-y' }}
            >
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${index * (100 / perView)}%)` }}
              >
                {cards.map((card) => (
                  <div
                    key={card.id}
                    className="shrink-0 px-2 sm:px-3"
                    style={{ width: `${100 / perView}%` }}
                  >
                    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-[#0B2545]/10 bg-white shadow-md transition duration-300 hover:-translate-y-2 hover:border-[#A3E635] hover:shadow-2xl">
                      <div className="relative h-56 w-full overflow-hidden">
                        {card.image ? (
                          <img
                            src={card.image}
                            alt={card.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0B2545] to-[#13315c]">
                            <span className="text-sm font-medium tracking-widest text-[#A3E635]/80">LENA</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0B2545]/60 to-transparent" />
                      </div>

                      <div className="flex flex-1 flex-col p-7">
                        <h3 className="font-serif text-xl font-bold text-[#0B2545]">{card.title}</h3>
                        <div className="mt-2 h-0.5 w-10 rounded-full bg-[#A3E635]" />
                        {card.body.map((line, idx) => (
                          <p key={idx} className="mt-3 leading-relaxed text-[#0B2545]/70">
                            {line}
                          </p>
                        ))}
                      </div>
                    </article>
                  </div>
                ))}
              </div>
            </div>

            {cards.length > perView && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Previous services"
                  className="absolute -left-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#0B2545]/15 bg-white text-[#0B2545] shadow-md transition hover:border-[#A3E635] hover:text-[#4d7c0f] sm:flex lg:-left-6"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Next services"
                  className="absolute -right-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#0B2545]/15 bg-white text-[#0B2545] shadow-md transition hover:border-[#A3E635] hover:text-[#4d7c0f] sm:flex lg:-right-6"
                >
                  ›
                </button>
              </>
            )}

            {maxIndex > 0 && (
              <div className="mt-8 flex justify-center gap-2">
                {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`Go to page ${i + 1}`}
                    aria-current={i === index}
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      i === index ? 'w-8 bg-[#A3E635]' : 'w-2.5 bg-[#0B2545]/20 hover:bg-[#0B2545]/40'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* =====================================================
   TIME GRINDS
===================================================== */
const ScheduleSection = ({ section }) => {
  const contents = sortById(section.contents)
  const items = parseSchedule(contents)
  const [image] = contents.flatMap((c) => getImages(c.contentImages))

  if (!items.length) return null

  return (
    <section id="schedule" className="overflow-hidden bg-[#0B2545] py-20 text-white sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <Reveal>
              <Eyebrow dark>Weekly Schedule</Eyebrow>
              <h2 className="mt-3 font-serif text-3xl font-bold text-white sm:text-4xl">
                {section.sectionName.trim()}
              </h2>
              <div className="mt-4 h-1 w-16 rounded-full bg-[#A3E635]" />
              <p className="mt-6 text-lg leading-relaxed text-white/75">
                Join one of our curated sessions and find your rhythm. All levels welcome.
              </p>
            </Reveal>

            <div className="mt-8 space-y-4">
              {items.map((item, i) => (
                <Reveal key={i} delay={i * 80}>
                  <div className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 transition duration-300 hover:-translate-y-0.5 hover:border-[#A3E635] hover:bg-white/[0.08]">
                    <div className="flex items-center gap-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#A3E635] font-serif text-sm font-bold text-[#0B2545]">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <h3 className="font-serif text-lg font-bold capitalize text-white sm:text-xl">
                        {item.title}
                      </h3>
                    </div>
                    <span className="rounded-full bg-[#A3E635]/15 px-4 py-1.5 text-sm font-semibold text-[#A3E635]">
                      {item.time}
                    </span>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          <Reveal delay={150} className="relative">
            <div className="absolute -bottom-4 -right-4 hidden h-full w-full rounded-3xl border-2 border-[#A3E635] sm:block" />
            <img
              src={image || aboutImage}
              alt="Gym training session"
              loading="lazy"
              className="relative z-10 h-80 w-full rounded-3xl object-cover shadow-2xl sm:h-[32rem]"
            />
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* =====================================================
   MEMBERSHIP POPUP (opens when a plan is chosen)
===================================================== */
const emptyForm = {
  fullName: '',
  gender: '',
  dateOfBirth: '',
  email: '',
  phone: '',
  address: '',
  emergencyName: '',
  emergencyPhone: '',
  startDate: '',
  paymentMethod: '',
  notes: '',
  agree: false,
}

const MembershipModal = ({ plan, onClose }) => {
  const [form, setForm] = useState(emptyForm)
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const today = todayLocal()

  // close on ESC + lock page scroll while open
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSending(true)
    setError('')
    const result = await submitMembership({
      planTitle: plan.title,
      planPrice: plan.price,
      fullName: form.fullName,
      gender: form.gender,
      dateOfBirth: form.dateOfBirth,
      email: form.email,
      phone: form.phone,
      address: form.address,
      emergencyName: form.emergencyName,
      emergencyPhone: form.emergencyPhone,
      startDate: form.startDate,
      paymentMethod: form.paymentMethod,
      notes: form.notes,
      agree: form.agree,
    })
    setSending(false)
    if (result.ok) setSubmitted(true)
    else setError(result.message)
  }

  const inputBase =
    'w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2 text-sm text-white placeholder-white/40 outline-none transition focus:border-[#A3E635] focus:bg-white/[0.1]'
  const label = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-white/60'
  const opt = 'text-[#0B2545]'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Membership registration - ${plan.title}`}
    >
      <div
        className="relative my-4 grid w-full max-w-5xl overflow-hidden rounded-3xl bg-[#0B2545] text-white shadow-2xl md:grid-cols-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xl leading-none text-white transition hover:bg-[#A3E635] hover:text-[#0B2545]"
        >
          ×
        </button>

        {/* Selected package summary */}
        <div className="relative flex flex-col bg-gradient-to-br from-[#13315c] to-[#0B2545] p-8 md:col-span-2">
          <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-[#A3E635]/10 blur-3xl" />
          <div className="relative">
            <Eyebrow dark>Selected Membership</Eyebrow>
            <h3 className="mt-3 font-serif text-2xl font-bold text-[#A3E635]">{plan.title}</h3>
            {plan.price && <div className="mt-2 text-3xl font-bold">{plan.price}</div>}
            <div className="my-5 h-0.5 w-12 rounded-full bg-[#A3E635]" />
            <ul className="space-y-3">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-white/85">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#A3E635] text-[#0B2545]">
                    <Check />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Membership form */}
        <div className="p-8 md:col-span-3">
          {submitted ? (
            <div className="flex h-full min-h-[20rem] flex-col items-center justify-center text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#A3E635] text-[#0B2545]">
                <Check />
              </span>
              <h4 className="mt-5 font-serif text-2xl font-bold">Welcome to Lena!</h4>
              <p className="mt-2 text-white/75">
                Your membership request for the <span className="font-semibold text-[#A3E635]">{plan.title}</span> plan
                has been received. We'll contact you shortly to complete your registration.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 rounded-full bg-[#A3E635] px-8 py-3 text-sm font-bold text-[#0B2545] transition hover:bg-[#D9F99D]"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <h4 className="font-serif text-2xl font-bold">Membership Registration</h4>
              <p className="mt-1 text-sm text-white/70">Complete your details to join the {plan.title} plan.</p>

              {error && (
                <div className="mt-4 rounded-xl border border-red-400/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className={label} htmlFor="fullName">Full name *</label>
                  <input id="fullName" type="text" name="fullName" required value={form.fullName} onChange={handleChange} className={inputBase} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={label} htmlFor="gender">Gender *</label>
                    <select id="gender" name="gender" required value={form.gender} onChange={handleChange} className={`${inputBase} appearance-none`}>
                      <option value="" className={opt}>Select</option>
                      <option value="Male" className={opt}>Male</option>
                      <option value="Female" className={opt}>Female</option>
                    </select>
                  </div>
                  <div>
                    <label className={label} htmlFor="dateOfBirth">Date of birth *</label>
                    <input id="dateOfBirth" type="date" name="dateOfBirth" required max={today} value={form.dateOfBirth} onChange={handleChange} className={inputBase} />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={label} htmlFor="phone">Phone *</label>
                    <input id="phone" type="tel" name="phone" required value={form.phone} onChange={handleChange} className={inputBase} />
                  </div>
                  <div>
                    <label className={label} htmlFor="email">Email</label>
                    <input id="email" type="email" name="email" value={form.email} onChange={handleChange} className={inputBase} />
                  </div>
                </div>

                <div>
                  <label className={label} htmlFor="address">Address</label>
                  <input id="address" type="text" name="address" value={form.address} onChange={handleChange} className={inputBase} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={label} htmlFor="emergencyName">Emergency contact *</label>
                    <input id="emergencyName" type="text" name="emergencyName" required value={form.emergencyName} onChange={handleChange} className={inputBase} />
                  </div>
                  <div>
                    <label className={label} htmlFor="emergencyPhone">Emergency phone *</label>
                    <input id="emergencyPhone" type="tel" name="emergencyPhone" required value={form.emergencyPhone} onChange={handleChange} className={inputBase} />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={label} htmlFor="startDate">Membership start date *</label>
                    <input id="startDate" type="date" name="startDate" required min={today} value={form.startDate} onChange={handleChange} className={inputBase} />
                  </div>
                  <div>
                    <label className={label} htmlFor="paymentMethod">Payment method *</label>
                    <select id="paymentMethod" name="paymentMethod" required value={form.paymentMethod} onChange={handleChange} className={`${inputBase} appearance-none`}>
                      <option value="" className={opt}>Select</option>
                      <option value="Cash" className={opt}>Cash</option>
                      <option value="Mobile Money" className={opt}>Mobile Money</option>
                      <option value="Bank Transfer" className={opt}>Bank Transfer</option>
                    </select>
                  </div>
                </div>

                <textarea name="notes" rows="2" placeholder="Fitness goals or anything we should know? (optional)" value={form.notes} onChange={handleChange} className={inputBase} />

                <label className="flex items-start gap-3 text-sm text-white/75">
                  <input type="checkbox" name="agree" required checked={form.agree} onChange={handleChange} className="mt-1 h-4 w-4 accent-[#A3E635]" />
                  <span>I agree to the gym rules and membership terms.</span>
                </label>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full rounded-full bg-[#A3E635] px-8 py-3 text-sm font-bold text-[#0B2545] transition duration-200 hover:-translate-y-0.5 hover:bg-[#D9F99D] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? 'Sending…' : 'Join Now'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* =====================================================
   PACKAGES — this section has id="packages" (hash target)
===================================================== */
const PackagesSection = ({ section }) => {
  const contents = sortById(section.contents)
  const packages = contents.map((c) => ({ id: c.id, ...parsePackage(c.content) }))
  const [selectedPlan, setSelectedPlan] = useState(null)
  const closeModal = useCallback(() => setSelectedPlan(null), [])

  if (!packages.length) return null

  return (
    <section id="packages" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <SectionTitle eyebrow="Membership Plans" title={section.sectionName.trim()} />
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg, i) => {
            const featured = i === 1
            return (
              <Reveal key={pkg.id} delay={i * 120}>
                <article
                  className={`flex h-full flex-col rounded-3xl border p-8 transition duration-300 hover:-translate-y-2 hover:shadow-2xl ${
                    featured
                      ? 'border-[#A3E635] bg-[#0B2545] text-white shadow-xl'
                      : 'border-[#0B2545]/10 bg-white hover:border-[#A3E635]'
                  }`}
                >
                  {featured && (
                    <span className="mb-4 self-start rounded-full bg-[#A3E635] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#0B2545]">
                      Most Popular
                    </span>
                  )}
                  <h3 className={`font-serif text-2xl font-bold ${featured ? 'text-[#A3E635]' : 'text-[#0B2545]'}`}>
                    {pkg.title}
                  </h3>
                  {pkg.price && (
                    <div className={`mt-3 text-3xl font-bold ${featured ? 'text-white' : 'text-[#0B2545]'}`}>
                      {pkg.price}
                    </div>
                  )}
                  <div className="my-5 h-0.5 w-12 rounded-full bg-[#A3E635]" />

                  <ul className="flex-1 space-y-3">
                    {pkg.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                            featured ? 'bg-[#A3E635] text-[#0B2545]' : 'bg-[#0B2545] text-[#A3E635]'
                          }`}
                        >
                          <Check />
                        </span>
                        <span className={`text-sm leading-relaxed ${featured ? 'text-white/85' : 'text-[#0B2545]/75'}`}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => setSelectedPlan(pkg)}
                    className={`mt-8 inline-block rounded-full px-6 py-3 text-center text-sm font-bold transition duration-200 hover:-translate-y-0.5 ${
                      featured
                        ? 'bg-[#A3E635] text-[#0B2545] hover:bg-[#D9F99D]'
                        : 'bg-[#0B2545] text-[#A3E635] hover:bg-[#13315c]'
                    }`}
                  >
                    Choose Plan
                  </button>
                </article>
              </Reveal>
            )
          })}
        </div>
      </div>

      {selectedPlan && <MembershipModal plan={selectedPlan} onClose={closeModal} />}
    </section>
  )
}

/* =====================================================
   COACHES
===================================================== */
const CoachesSection = ({ section }) => {
  const contents = sortById(section.contents)
  const coaches = contents.map((c) => ({
    id: c.id,
    image: getImages(c.contentImages)[0],
    ...parseCard(c.content),
  }))

  const [index, setIndex] = useState(0)
  const [perView, setPerView] = useState(4)
  const [paused, setPaused] = useState(false)
  const dragStart = useRef(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      setPerView(w < 640 ? 1 : w < 1024 ? 2 : 4)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const maxIndex = Math.max(0, coaches.length - perView)
  const clamp = useCallback((i) => Math.min(Math.max(i, 0), maxIndex), [maxIndex])

  useEffect(() => {
    setIndex((i) => Math.min(i, maxIndex))
  }, [maxIndex])

  useEffect(() => {
    if (paused || dragging || maxIndex === 0) return undefined
    const timer = setInterval(() => setIndex((i) => (i >= maxIndex ? 0 : i + 1)), 4000)
    return () => clearInterval(timer)
  }, [paused, dragging, maxIndex])

  if (!coaches.length) return null

  const goTo = (i) => setIndex(clamp(i))
  const prev = () => goTo(index - 1)
  const next = () => goTo(index >= maxIndex ? 0 : index + 1)

  const onPointerDown = (e) => {
    dragStart.current = { x: e.clientX, index }
    setDragging(true)
  }
  const onPointerMove = (e) => {
    if (!dragStart.current) return
    const dx = e.clientX - dragStart.current.x
    if (Math.abs(dx) > 50) {
      if (dx < 0) next()
      else prev()
      dragStart.current = null
      setDragging(false)
    }
  }
  const onPointerUp = () => {
    dragStart.current = null
    setDragging(false)
  }

  return (
    <section
      id="coaches"
      className="overflow-hidden bg-[#0B2545]/[0.04] py-20 sm:py-24"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <SectionTitle eyebrow="Meet the Team" title={section.sectionName.trim()} />
        </Reveal>

        <Reveal delay={120}>
          <div className="relative mt-12">
            <div
              className="-mx-2 overflow-hidden px-2"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              style={{ cursor: dragging ? 'grabbing' : 'grab', touchAction: 'pan-y' }}
            >
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${index * (100 / perView)}%)` }}
              >
                {coaches.map((coach, i) => {
                  const displayPhoto = coach.image || `https://i.pravatar.cc/600?img=${(i % 20) + 10}`
                  return (
                    <div
                      key={coach.id}
                      className="shrink-0 px-2 sm:px-3"
                      style={{ width: `${100 / perView}%` }}
                    >
                      <div className="group relative overflow-hidden rounded-sm shadow-md transition-shadow duration-300 hover:shadow-2xl">
                        <div className="aspect-[4/5] w-full overflow-hidden bg-gray-200">
                          <img
                            src={displayPhoto}
                            alt={coach.title}
                            loading="lazy"
                            className="h-full w-full object-cover object-top grayscale transition-all duration-500 group-hover:scale-105 group-hover:grayscale-0"
                          />
                        </div>
                        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[#A3E635]/95 to-[#A3E635]/80 p-5 text-center backdrop-blur-sm">
                          <h3 className="font-serif text-lg font-bold capitalize text-[#0B2545]">
                            {coach.title}
                          </h3>
                          {coach.body.map((line, idx) => (
                            <p key={idx} className="mt-1 text-sm font-medium text-[#0B2545]/80">
                              {line}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {coaches.length > perView && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Previous coaches"
                  className="absolute -left-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#0B2545]/15 bg-white text-[#0B2545] shadow-md transition hover:border-[#A3E635] hover:text-[#4d7c0f] sm:flex lg:-left-6"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Next coaches"
                  className="absolute -right-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#0B2545]/15 bg-white text-[#0B2545] shadow-md transition hover:border-[#A3E635] hover:text-[#4d7c0f] sm:flex lg:-right-6"
                >
                  ›
                </button>
              </>
            )}

            {maxIndex > 0 && (
              <div className="mt-8 flex justify-center gap-2">
                {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`Go to page ${i + 1}`}
                    aria-current={i === index}
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      i === index ? 'w-8 bg-[#A3E635]' : 'w-2.5 bg-[#0B2545]/20 hover:bg-[#0B2545]/40'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* =====================================================
   GENERIC fallback
===================================================== */
const GenericSection = ({ section }) => {
  const contents = sortById(section.contents)
  if (!contents.length) return null

  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <Reveal>
          <SectionTitle title={section.sectionName} />
        </Reveal>
        <div className="mt-8 space-y-5">
          {contents.flatMap((c) => toLines(c.content)).map((p, i) => (
            <Reveal key={i} delay={i * 100}>
              <p className="text-lg leading-relaxed text-[#0B2545]/80">{p}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* =====================================================
   PAGE
===================================================== */
const Gym = () => {
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const location = useLocation()

  // --- scroll to hash target once sections are loaded ---
  useEffect(() => {
    if (!location.hash) return undefined
    const id = location.hash.replace(/^#/, '')
    const timer = setTimeout(() => {
      const el = document.getElementById(id)
      if (el) {
        // optional offset for fixed header (adjust '80' to your header height)
        const headerOffset = 0
        const y = el.getBoundingClientRect().top + window.scrollY - headerOffset
        window.scrollTo({ top: y, behavior: 'smooth' })
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [location.hash, sections.length])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await webApi.getSectionsByPage(GYM_PAGE_ID)
        if (!cancelled) setSections(res?.success ? sortById(res.data) : [])
      } catch (err) {
        console.error('Gym: failed to load sections', err)
        if (!cancelled) setError('We could not load this page right now. Please try again later.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

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

  const byName = (target) =>
    sections.find((s) => s.sectionName.trim().toLowerCase() === target)

  const hero = byName('hero')
  const services = byName('our fitness services')
  const schedule = byName('time grinds')
  const packages = byName('packages')
  const coaches = byName('coachs') || byName('coaches')

  // Hide any CMS "reservation" section — membership registration now happens in the plan popup
  const hiddenNames = new Set(['footer', 'reservation', 'reservations', 'booking'])

  const known = new Set([hero, services, schedule, packages, coaches].filter(Boolean))
  const extras = sections.filter((s) => {
    const n = s.sectionName.trim().toLowerCase()
    if (hiddenNames.has(n)) return false
    return !known.has(s)
  })

  return (
    <>
      <main className="overflow-x-hidden bg-white">
        {/* ORDER: Hero → Services → Time Grinds → Packages → Coaches */}
        {hero && <HeroSection section={hero} />}
        {services && <ServicesSection section={services} />}
        {schedule && <ScheduleSection section={schedule} />}
        {packages && <PackagesSection section={packages} />}
        {coaches && <CoachesSection section={coaches} />}

        {extras.map((s) => (
          <GenericSection key={s.id} section={s} />
        ))}
      </main>
      <Footer />
    </>
  )
}

export default Gym