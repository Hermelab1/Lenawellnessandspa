import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
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

const getImages = (value) =>
  (value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((src) =>
      /^(https?:|data:)/.test(src) ? src : `${API_ORIGIN}/${src.replace(/^\//, '')}`
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
  const [title, price, ...features] = lines
  return { title: title || '', price: price || '', features }
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

  const mainTitle = contents[1]?.content?.trim() || contents[0]?.content?.trim()

  return (
    <section id="hero" className="relative overflow-hidden bg-[#0B2545] text-white">
      {heroImages.length > 0 && (
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-[1200ms]"
          style={{ backgroundImage: `url(${heroImages[current]})`, transform: 'scale(1.06)' }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B2545]/70 via-[#0B2545]/45 to-[#0B2545]/85" />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 py-20 text-center sm:py-28">
        {contents[0] && (
          <Reveal>
            <Eyebrow dark>{contents[0].content}</Eyebrow>
          </Reveal>
        )}

        <Reveal delay={150}>
          <h1 className="mt-4 max-w-4xl font-serif text-4xl font-bold uppercase leading-tight drop-shadow-[0_2px_12px_rgba(11,37,69,0.7)] sm:text-5xl lg:text-6xl">
            {mainTitle}
          </h1>
        </Reveal>

        <Reveal delay={300}>
          <p className="mt-6 max-w-2xl text-lg text-white/85">
            Where strength meets serenity — train, recover, and elevate body and mind.
          </p>
        </Reveal>

        <Reveal delay={450}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link to="/contact" className="rounded-full bg-[#A3E635] px-8 py-3 text-sm font-bold text-[#0B2545] transition duration-200 hover:-translate-y-0.5 hover:bg-[#D9F99D]">
              Start Training
            </Link>
            <Link to="/ourservice" className="rounded-full border border-[#A3E635]/60 px-8 py-3 text-sm font-semibold text-[#A3E635] transition duration-200 hover:bg-[#A3E635]/10">
              View Services
            </Link>
          </div>
        </Reveal>
      </div>
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
   PACKAGES — this section has id="packages" (hash target)
===================================================== */
const PackagesSection = ({ section }) => {
  const contents = sortById(section.contents)
  const packages = contents.map((c) => ({ id: c.id, ...parsePackage(c.content) }))

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

                  <Link
                    to={`/register-membership?plan=${encodeURIComponent(pkg.title)}`}
                    state={{ plan: pkg }}
                    className={`mt-8 inline-block rounded-full px-6 py-3 text-center text-sm font-bold transition duration-200 hover:-translate-y-0.5 ${
                      featured
                        ? 'bg-[#A3E635] text-[#0B2545] hover:bg-[#D9F99D]'
                        : 'bg-[#0B2545] text-[#A3E635] hover:bg-[#13315c]'
                    }`}
                  >
                    Choose Plan
                  </Link>
                </article>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* =====================================================
   RESERVATION
===================================================== */
const ReservationSection = ({ section }) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    service: '',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)

  const contents = section ? sortById(section.contents) : []
  const [image] = contents.flatMap((c) => getImages(c.contentImages))

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 5000)
    setForm({ name: '', email: '', phone: '', date: '', time: '', service: '', message: '' })
  }

  const inputBase =
    'w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder-white/40 outline-none transition focus:border-[#A3E635] focus:bg-white/[0.1]'

  return (
    <section id="reservation" className="relative overflow-hidden bg-[#0B2545] py-20 text-white sm:py-24">
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#A3E635]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-[#13315c]/60 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <Reveal>
              <Eyebrow dark>Book Your Session</Eyebrow>
              <h2 className="mt-3 font-serif text-3xl font-bold text-white sm:text-4xl">
                {section?.sectionName?.trim() || 'Reservation'}
              </h2>
              <div className="mt-4 h-1 w-16 rounded-full bg-[#A3E635]" />
              <p className="mt-6 text-lg leading-relaxed text-white/75">
                Reserve your spot in minutes. Tell us what you'd like to do and when — we'll confirm shortly.
              </p>
            </Reveal>

            <Reveal delay={120}>
              {submitted && (
                <div className="mt-6 rounded-xl border border-[#A3E635]/50 bg-[#A3E635]/10 px-4 py-3 text-sm text-[#A3E635]">
                  ✓ Thank you! Your reservation request has been received.
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <input type="text" name="name" required placeholder="Full name *" value={form.name} onChange={handleChange} className={inputBase} />
                  <input type="email" name="email" required placeholder="Email *" value={form.email} onChange={handleChange} className={inputBase} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <input type="tel" name="phone" required placeholder="Phone *" value={form.phone} onChange={handleChange} className={inputBase} />
                  <select name="service" required value={form.service} onChange={handleChange} className={`${inputBase} appearance-none`}>
                    <option value="" className="text-[#0B2545]">Choose a service *</option>
                    <option value="Personal Training" className="text-[#0B2545]">Personal Training</option>
                    <option value="Group Classes" className="text-[#0B2545]">Group Classes</option>
                    <option value="Weight Training" className="text-[#0B2545]">Weight Training</option>
                    <option value="Cardio Training" className="text-[#0B2545]">Cardio Training</option>
                    <option value="Nutrition Coaching" className="text-[#0B2545]">Nutrition Coaching</option>
                    <option value="Spa Session" className="text-[#0B2545]">Spa Session</option>
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <input type="date" name="date" required value={form.date} onChange={handleChange} className={inputBase} />
                  <input type="time" name="time" required value={form.time} onChange={handleChange} className={inputBase} />
                </div>

                <textarea name="message" rows="4" placeholder="Anything we should know? (optional)" value={form.message} onChange={handleChange} className={inputBase} />

                <button type="submit" className="inline-block rounded-full bg-[#A3E635] px-8 py-3 text-sm font-bold text-[#0B2545] transition duration-200 hover:-translate-y-0.5 hover:bg-[#D9F99D]">
                  Reserve Now
                </button>
              </form>
            </Reveal>
          </div>

          <Reveal delay={150} className="relative">
            <div className="absolute -bottom-4 -left-4 hidden h-full w-full rounded-3xl border-2 border-[#A3E635] sm:block" />
            <img
              src={image || aboutImage}
              alt="Reserve a session at Lena"
              loading="lazy"
              className="relative z-10 h-80 w-full rounded-3xl object-cover shadow-2xl sm:h-[32rem]"
            />
            <div className="relative z-20 mx-auto -mt-16 max-w-sm rounded-2xl bg-white p-6 text-[#0B2545] shadow-2xl lg:mx-0 lg:ml-auto lg:-mt-24">
              <h3 className="font-serif text-xl font-bold">Open Hours</h3>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#0B2545]/60">Mon – Fri</span>
                  <span className="font-semibold">6:00 AM – 10:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#0B2545]/60">Saturday</span>
                  <span className="font-semibold">7:00 AM – 9:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#0B2545]/60">Sunday</span>
                  <span className="font-semibold">8:00 AM – 8:00 PM</span>
                </div>
              </div>
              <div className="mt-5 flex items-center gap-2 border-t border-[#0B2545]/10 pt-4 text-sm">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#A3E635] text-[#0B2545]">
                  <Check />
                </span>
                <span className="text-[#0B2545]/75">Instant confirmation via call / SMS</span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
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
  const reservation = byName('reservation') || byName('reservations') || byName('booking')
  const coaches = byName('coachs') || byName('coaches')

  const known = new Set([hero, services, schedule, packages, reservation, coaches].filter(Boolean))
  const extras = sections.filter((s) => {
    const n = s.sectionName.trim().toLowerCase()
    if (n === 'footer') return false
    return !known.has(s)
  })

  return (
    <>
      <main className="overflow-x-hidden bg-white">
        {/* ORDER: Hero → Services → Time Grinds → Packages → Reservation → Coaches */}
        {hero && <HeroSection section={hero} />}
        {services && <ServicesSection section={services} />}
        {schedule && <ScheduleSection section={schedule} />}
        {packages && <PackagesSection section={packages} />}
        <ReservationSection section={reservation} />
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