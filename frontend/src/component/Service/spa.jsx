import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { webApi } from '../Api/apilist'
import aboutImage from '../../asset/img/Herosection/herosection.jpg' // fallback image
import Footer from '../Footer/footer'

const SPA_PAGE_ID = 8
const API_ORIGIN = (process.env.REACT_APP_API_URL || 'http://localhost:3001/api').replace(
  /\/api\/?$/,
  ''
)

// Hours a customer can choose for the service (edit this list to change the options)
const HOUR_OPTIONS = [1, 2, 3, 4]

/* ---------- Helpers ---------- */
const sortById = (list = []) => list.filter((i) => !i.isDeleted).sort((a, b) => a.id - b.id)

// The API returns contentImages either as a JSON array string of base64 data URIs
// (e.g. '["data:image/jpeg;base64,..."]') or as a single raw data URI. Older rows may
// hold a plain comma-separated list of paths/URLs, so all shapes are supported.
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

const toLines = (text = '') =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

const splitTitle = (text = '') => {
  const lines = toLines(text)
  return { title: lines[0] || '', body: lines.slice(1).join(' ') }
}

// Packages format:
//   line 0: title
//   line 1: duration ("3 Hours Experience")
//   line 2: tier ("Premium" / "Elite")
//   line 3+: features
const parsePackage = (text = '') => {
  const lines = toLines(text)
  const [title, duration, tier, ...features] = lines
  return { title: title || '', duration: duration || '', tier: tier || '', features }
}

/* ---------- Reveal Animation Wrapper ---------- */
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

/* ---------- Shared bits ---------- */
const Eyebrow = ({ children, dark }) => (
  <span
    className={`text-xs font-bold uppercase tracking-[0.3em] ${
      dark ? 'text-[#A3E635]' : 'text-[#4d7c0f]'
    }`}
  >
    {children}
  </span>
)

const SectionTitle = ({ eyebrow, title, subtitle, center = true, dark }) => (
  <div className={center ? 'text-center' : ''}>
    {eyebrow && (
      <div className={`flex items-center gap-3 ${center ? 'justify-center' : ''}`}>
        <span className="h-px w-8 bg-[#A3E635]" />
        <Eyebrow dark={dark}>{eyebrow}</Eyebrow>
        <span className="h-px w-8 bg-[#A3E635]" />
      </div>
    )}
    <h2
      className={`mt-3 font-serif text-3xl font-bold tracking-tight sm:text-4xl ${
        dark ? 'text-white' : 'text-[#0B2545]'
      }`}
    >
      {title}
    </h2>
    <div className={`mt-4 h-1 w-16 rounded-full bg-[#A3E635] ${center ? 'mx-auto' : ''}`} />
    {subtitle && (
      <p
        className={`mt-5 max-w-2xl leading-relaxed ${center ? 'mx-auto' : ''} ${
          dark ? 'text-white/70' : 'text-[#0B2545]/65'
        }`}
      >
        {subtitle}
      </p>
    )}
  </div>
)

const Check = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-5 w-5 shrink-0"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
)

/* ---------- Reservation helpers ---------- */
// Builds the selectable list from a CMS section (therapists / experts).
// The first line of each content item is the person's name.
const getStaff = (section) =>
  section
    ? sortById(section.contents)
        .map((c) => ({ id: c.id, name: splitTitle(c.content).title }))
        .filter((s) => s.name)
    : []

// Dropdown for choosing a therapist / expert. Hidden when the list is empty.
const StaffSelect = ({
  staff,
  value,
  onChange,
  id,
  label,
  placeholder,
  className,
  labelClass,
  optClass = 'text-[#0B2545]',
}) => {
  if (!staff.length) return null
  return (
    <div>
      {label && (
        <label className={labelClass} htmlFor={id}>
          {label}
        </label>
      )}
      <select
        id={id}
        name="staffId"
        value={value}
        onChange={onChange}
        aria-label={label ? undefined : placeholder}
        className={`${className} appearance-none`}
      >
        <option value="" className={optClass}>
          {placeholder}
        </option>
        {staff.map((s) => (
          <option key={s.id} value={s.id} className={optClass}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  )
}

// Sends the reservation to the API and normalises the result.
const submitReservation = async (payload) => {
  try {
    const res = await webApi.createReservation(payload)
    return res?.success
      ? { ok: true }
      : { ok: false, message: res?.message || 'Could not send your reservation.' }
  } catch (err) {
    return {
      ok: false,
      message: err?.response?.data?.message || 'Could not send your reservation. Please try again.',
    }
  }
}

/* =====================================================
   HERO
===================================================== */
const HeroSection = ({ section }) => {
  const contents = sortById(section.contents)
  const slides = contents.flatMap((c) => getImages(c.contentImages))

  // Banner content: first line = small label ("LENA SPA & WELLNESS"), remaining lines = headline.
  const lines = contents.flatMap((c) => toLines(c.content))
  const [eyebrow, ...titleLines] = lines.length > 1 ? lines : ['Spa & Wellness', ...lines]
  const mainTitle = titleLines.join(' ')

  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const total = slides.length

  useEffect(() => {
    if (total < 2 || paused) return undefined
    const timer = setInterval(() => setCurrent((c) => (c + 1) % total), 5000)
    return () => clearInterval(timer)
  }, [total, paused, current])

  return (
    <section
      className="relative overflow-hidden bg-[#0B2545] text-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((src, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={`absolute inset-0 bg-cover bg-center ${i === current ? 'opacity-100' : 'opacity-0'}`}
          style={{
            backgroundImage: `url("${src}")`,
            transform: i === current ? 'scale(1.05)' : 'scale(1)',
            transition: 'opacity 1200ms ease, transform 7000ms ease-out',
          }}
        />
      ))}
      <div className="absolute inset-0 bg-[#0B2545]/70" />

      {total === 0 && (
        <>
          <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#A3E635]/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-[#13315c] blur-3xl" />
        </>
      )}

      <div className="relative mx-auto flex min-h-[45vh] max-w-6xl items-center justify-center px-6 py-16 sm:py-20">
        <div className="max-w-2xl text-center">
          <Reveal>
            <div className="flex items-center justify-center gap-3">
              <span className="h-px w-8 bg-[#A3E635]" />
              <Eyebrow dark>{eyebrow}</Eyebrow>
              <span className="h-px w-8 bg-[#A3E635]" />
            </div>
          </Reveal>
          {mainTitle && (
            <Reveal delay={100}>
              <h1 className="mt-4 font-serif text-xl font-bold leading-snug sm:text-2xl lg:text-3xl">
                {mainTitle}
              </h1>
            </Reveal>
          )}
          <Reveal delay={300}>
            <div className="mx-auto mt-5 h-1 w-16 rounded-full bg-[#A3E635]" />
          </Reveal>
        </div>
      </div>

      {total > 1 && (
        <div className="absolute inset-x-0 bottom-6 z-20 flex justify-center gap-2">
          {slides.map((_, i) => (
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
   THERAPIES
===================================================== */
const TherapiesSection = ({ section }) => {
  const contents = sortById(section.contents)
  const cards = contents.map((c) => ({
    id: c.id,
    image: getImages(c.contentImages)[0],
    ...splitTitle(c.content),
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
      id="therapies"
      className="overflow-hidden bg-white py-20 sm:py-24"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <SectionTitle
            eyebrow="Our Treatments"
            title={section.sectionName.trim()}
          />
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
                {cards.map((card, i) => {
                  const fallback = `https://images.unsplash.com/photo-${
                    [
                      '1540555700478-4be289fbecef',
                      '1544161515-4ab6ce6db874',
                      '1600334129128-685c5582fd35',
                    ][i % 3]
                  }?auto=format&fit=crop&w=800&q=80`
                  return (
                    <div
                      key={card.id}
                      className="shrink-0 px-2 sm:px-3"
                      style={{ width: `${100 / perView}%` }}
                    >
                      <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-[#0B2545]/10 bg-white shadow-lg shadow-[#0B2545]/5 transition duration-300 hover:-translate-y-2 hover:border-[#A3E635] hover:shadow-2xl hover:shadow-[#0B2545]/15">
                        <div className="relative h-60 w-full overflow-hidden">
                          <img
                            src={card.image || fallback}
                            alt={card.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0B2545]/70 via-[#0B2545]/10 to-transparent" />
                          <span className="absolute left-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-[#A3E635] font-serif text-sm font-bold text-[#0B2545] shadow-lg">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <div className="absolute bottom-4 left-5">
                            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#0B2545] backdrop-blur">
                              Therapy
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-1 flex-col p-7">
                          <h3 className="font-serif text-xl font-bold text-[#0B2545]">
                            {card.title}
                          </h3>
                          <div className="mt-3 h-0.5 w-10 rounded-full bg-[#A3E635] transition-all duration-300 group-hover:w-20" />
                          {card.body && (
                            <p className="mt-4 flex-1 leading-relaxed text-[#0B2545]/70">{card.body}</p>
                          )}
                          <Link
                            to="/contact"
                            className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#0B2545] transition-all hover:gap-3 hover:text-[#4d7c0f]"
                          >
                            Book this therapy
                            <span aria-hidden="true">→</span>
                          </Link>
                        </div>
                      </article>
                    </div>
                  )
                })}
              </div>
            </div>

            {cards.length > perView && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Previous therapies"
                  className="absolute -left-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#0B2545]/15 bg-white text-[#0B2545] shadow-md transition hover:border-[#A3E635] hover:text-[#4d7c0f] sm:flex lg:-left-6"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Next therapies"
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
                      i === index
                        ? 'w-8 bg-[#A3E635]'
                        : 'w-2.5 bg-[#0B2545]/20 hover:bg-[#0B2545]/40'
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
   PRODUCTS — swipeable carousel (shown BEFORE packages)
===================================================== */
const ProductsSection = ({ section }) => {
  const contents = sortById(section.contents)

  // A "text" item with no image acts as the intro/tagline (not a product card)
  const introItem = contents.find(
    (c) => c.contentType === 'text' && getImages(c.contentImages).length === 0
  )

  const products = contents
    .filter((c) => c !== introItem)
    .map((c) => {
      const lines = toLines(c.content)
      const [title, ...body] = lines
      return {
        id: c.id,
        title: title || '',
        body,
        image: getImages(c.contentImages)[0],
      }
    })
    .filter((item) => item.title)

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

  const maxIndex = Math.max(0, products.length - perView)
  const clamp = useCallback((i) => Math.min(Math.max(i, 0), maxIndex), [maxIndex])

  useEffect(() => {
    setIndex((i) => Math.min(i, maxIndex))
  }, [maxIndex])

  useEffect(() => {
    if (paused || dragging || maxIndex === 0) return undefined
    const timer = setInterval(() => setIndex((i) => (i >= maxIndex ? 0 : i + 1)), 4000)
    return () => clearInterval(timer)
  }, [paused, dragging, maxIndex])

  if (!products.length && !introItem) return null

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
      id="products"
      className="overflow-hidden bg-[#0B2545]/[0.04] py-20 sm:py-24"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <SectionTitle
            eyebrow="Our Products"
            title={section.sectionName.trim()}
            subtitle={introItem ? introItem.content.trim() : undefined}
          />
        </Reveal>

        {products.length > 0 && (
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
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="shrink-0 px-2 sm:px-3"
                      style={{ width: `${100 / perView}%` }}
                    >
                      <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-[#0B2545]/10 bg-white shadow-lg shadow-[#0B2545]/5 transition duration-300 hover:-translate-y-2 hover:border-[#A3E635] hover:shadow-2xl hover:shadow-[#0B2545]/15">
                        <div className="relative h-60 w-full overflow-hidden">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.title}
                              loading="lazy"
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0B2545] to-[#13315c]">
                              <span className="text-sm font-medium tracking-widest text-[#A3E635]/80">
                                LENA
                              </span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0B2545]/70 via-[#0B2545]/10 to-transparent" />
                          <div className="absolute bottom-4 left-4">
                            <span className="rounded-full bg-[#A3E635] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#0B2545]">
                              Product
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-1 flex-col p-7">
                          <h3 className="font-serif text-xl font-bold text-[#0B2545]">
                            {product.title}
                          </h3>
                          <div className="mt-3 h-0.5 w-10 rounded-full bg-[#A3E635] transition-all duration-300 group-hover:w-20" />
                          {product.body.map((line, idx) => (
                            <p key={idx} className="mt-4 leading-relaxed text-[#0B2545]/70">
                              {line}
                            </p>
                          ))}
                        </div>
                      </article>
                    </div>
                  ))}
                </div>
              </div>

              {products.length > perView && (
                <>
                  <button
                    type="button"
                    onClick={prev}
                    aria-label="Previous products"
                    className="absolute -left-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#0B2545]/15 bg-white text-[#0B2545] shadow-md transition hover:border-[#A3E635] hover:text-[#4d7c0f] sm:flex lg:-left-6"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    aria-label="Next products"
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
                        i === index
                          ? 'w-8 bg-[#A3E635]'
                          : 'w-2.5 bg-[#0B2545]/20 hover:bg-[#0B2545]/40'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </Reveal>
        )}
      </div>
    </section>
  )
}

/* =====================================================
   PACKAGE RESERVATION POPUP (opens when a package is chosen)
===================================================== */
const emptyPackageForm = { name: '', email: '', phone: '', date: '', time: '', hours: '', staffId: '', message: '' }

// "3 Hours Experience" -> "3" (only if it is one of HOUR_OPTIONS)
const hoursFromDuration = (duration = '') => {
  const n = parseInt((duration.match(/\d+/) || [''])[0], 10)
  return HOUR_OPTIONS.includes(n) ? String(n) : ''
}

const PackageReservationModal = ({ pkg, staff, onClose }) => {
  const [form, setForm] = useState({ ...emptyPackageForm, hours: hoursFromDuration(pkg.duration) })
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

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

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSending(true)
    setError('')
    const therapist = staff.find((s) => String(s.id) === String(form.staffId))
    const result = await submitReservation({
      type: 'spa',
      source: 'package',
      serviceName: pkg.title,
      name: form.name,
      email: form.email,
      phone: form.phone,
      date: form.date,
      time: form.time,
      hours: form.hours,
      staffId: therapist ? therapist.id : null,
      staffName: therapist ? therapist.name : null,
      message: form.message,
    })
    setSending(false)
    if (result.ok) setSubmitted(true)
    else setError(result.message)
  }

  const inputBase =
    'w-full rounded-lg border border-white/15 bg-white/[0.06] px-2.5 py-1.5 text-xs text-white placeholder-white/40 outline-none transition focus:border-[#A3E635] focus:bg-white/[0.1]'
  const label = 'mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-white/60'
  const opt = 'text-[#0B2545]'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Reserve ${pkg.title}`}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-[#0B2545] text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-lg leading-none text-white transition hover:bg-[#A3E635] hover:text-[#0B2545]"
        >
          ×
        </button>

        {/* Selected package strip */}
        <div className="border-b border-white/10 bg-[#13315c] px-4 py-3 pr-12">
          <Eyebrow dark>{pkg.tier || 'Selected Experience'}</Eyebrow>
          <div className="mt-1 flex items-baseline justify-between gap-3">
            <h3 className="font-serif text-base font-bold text-[#A3E635]">{pkg.title}</h3>
            {pkg.duration && <span className="text-xs text-white/70">{pkg.duration}</span>}
          </div>
        </div>

        <div className="overflow-y-auto p-4">
          {submitted ? (
            <div className="flex min-h-[12rem] flex-col items-center justify-center text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#A3E635] text-[#0B2545]">
                <Check />
              </span>
              <h4 className="mt-3 font-serif text-lg font-bold">Thank you!</h4>
              <p className="mt-1 text-xs text-white/75">
                Your reservation for <span className="font-semibold text-[#A3E635]">{pkg.title}</span> has been
                received. We'll confirm shortly via call / SMS.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 rounded-full bg-[#A3E635] px-6 py-2 text-xs font-bold text-[#0B2545] transition hover:bg-[#D9F99D]"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <h4 className="font-serif text-base font-bold">Reserve This Experience</h4>
              <p className="text-[11px] text-white/65">Tell us when you'd like to come and we'll confirm.</p>

              {error && (
                <div className="mt-3 rounded-lg border border-red-400/50 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={label} htmlFor="pk-name">Full name *</label>
                    <input id="pk-name" type="text" name="name" required value={form.name} onChange={handleChange} className={inputBase} />
                  </div>
                  <div>
                    <label className={label} htmlFor="pk-email">Email *</label>
                    <input id="pk-email" type="email" name="email" required value={form.email} onChange={handleChange} className={inputBase} />
                  </div>
                </div>

                <div>
                  <label className={label} htmlFor="pk-phone">Phone *</label>
                  <input id="pk-phone" type="tel" name="phone" required value={form.phone} onChange={handleChange} className={inputBase} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={label} htmlFor="pk-date">Date *</label>
                    <input id="pk-date" type="date" name="date" required value={form.date} onChange={handleChange} className={inputBase} />
                  </div>
                  <div>
                    <label className={label} htmlFor="pk-time">Time *</label>
                    <input id="pk-time" type="time" name="time" required value={form.time} onChange={handleChange} className={inputBase} />
                  </div>
                </div>

                <div>
                  <label className={label} htmlFor="pk-hours">How many hours do you want the service? *</label>
                  <select id="pk-hours" name="hours" required value={form.hours} onChange={handleChange} className={`${inputBase} appearance-none`}>
                    <option value="" className={opt}>Select hours</option>
                    {HOUR_OPTIONS.map((h) => (
                      <option key={h} value={h} className={opt}>
                        {h} {h === 1 ? 'Hour' : 'Hours'}
                      </option>
                    ))}
                  </select>
                </div>

                <StaffSelect
                  staff={staff}
                  id="pk-staff"
                  label="Preferred therapist"
                  placeholder="Any available therapist"
                  value={form.staffId}
                  onChange={handleChange}
                  className={inputBase}
                  labelClass={label}
                />

                <textarea name="message" rows="2" placeholder="Anything we should know? (optional)" value={form.message} onChange={handleChange} className={inputBase} />

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full rounded-full bg-[#A3E635] px-6 py-2 text-xs font-bold text-[#0B2545] transition duration-200 hover:bg-[#D9F99D] disabled:opacity-60"
                >
                  {sending ? 'Sending…' : 'Reserve Now'}
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
   PACKAGES
===================================================== */
const PackagesSection = ({ section, staff }) => {
  const contents = sortById(section.contents)
  const packages = contents.map((c) => ({ id: c.id, ...parsePackage(c.content) }))
  const [selectedPackage, setSelectedPackage] = useState(null)
  const closeModal = useCallback(() => setSelectedPackage(null), [])

  if (!packages.length) return null

  return (
    <section id="packages" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <SectionTitle
            eyebrow="Signature Experiences"
            title={section.sectionName.trim()}
          />
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {packages.map((pkg, i) => {
            const featured = i === 1
            return (
              <Reveal key={pkg.id} delay={i * 150}>
                <article
                  className={`relative flex h-full flex-col overflow-hidden rounded-3xl border p-8 transition duration-300 hover:-translate-y-2 hover:shadow-2xl sm:p-10 ${
                    featured
                      ? 'border-[#A3E635] bg-[#0B2545] text-white shadow-2xl shadow-[#0B2545]/30'
                      : 'border-[#0B2545]/10 bg-white shadow-lg shadow-[#0B2545]/5 hover:border-[#A3E635]'
                  }`}
                >
                  <div className={`absolute inset-x-0 top-0 h-1.5 ${featured ? 'bg-[#A3E635]' : 'bg-[#0B2545]/10'}`} />
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      {pkg.tier && (
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                            featured
                              ? 'bg-[#A3E635] text-[#0B2545]'
                              : 'bg-[#A3E635]/20 text-[#4d7c0f]'
                          }`}
                        >
                          {pkg.tier}
                        </span>
                      )}
                      <h3
                        className={`mt-3 font-serif text-2xl font-bold ${
                          featured ? 'text-[#A3E635]' : 'text-[#0B2545]'
                        }`}
                      >
                        {pkg.title}
                      </h3>
                      {pkg.duration && (
                        <p
                          className={`mt-1 text-sm ${
                            featured ? 'text-white/70' : 'text-[#0B2545]/60'
                          }`}
                        >
                          {pkg.duration}
                        </p>
                      )}
                    </div>
                    <span
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-serif text-lg font-bold ${
                        featured ? 'bg-[#A3E635] text-[#0B2545]' : 'bg-[#0B2545] text-[#A3E635]'
                      }`}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>

                  <div className="my-6 h-0.5 w-12 rounded-full bg-[#A3E635]" />

                  <ul className="flex-1 space-y-3">
                    {pkg.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                            featured
                              ? 'bg-[#A3E635] text-[#0B2545]'
                              : 'bg-[#0B2545] text-[#A3E635]'
                          }`}
                        >
                          <Check />
                        </span>
                        <span
                          className={`text-base leading-relaxed ${
                            featured ? 'text-white/90' : 'text-[#0B2545]/80'
                          }`}
                        >
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => setSelectedPackage(pkg)}
                    className={`mt-8 inline-block rounded-full px-8 py-3 text-center text-sm font-bold transition duration-200 hover:-translate-y-0.5 ${
                      featured
                        ? 'bg-[#A3E635] text-[#0B2545] hover:bg-[#D9F99D]'
                        : 'bg-[#0B2545] text-[#A3E635] hover:bg-[#13315c]'
                    }`}
                  >
                    Reserve This Experience
                  </button>
                </article>
              </Reveal>
            )
          })}
        </div>
      </div>

      {selectedPackage && (
        <PackageReservationModal pkg={selectedPackage} staff={staff} onClose={closeModal} />
      )}
    </section>
  )
}

/* =====================================================
   RESERVATION
===================================================== */
const emptyReservation = {
  name: '',
  email: '',
  phone: '',
  date: '',
  time: '',
  hours: '',
  treatment: '',
  staffId: '',
  message: '',
}

const ReservationSection = ({ section, staff }) => {
  const [form, setForm] = useState(emptyReservation)
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const contents = section ? sortById(section.contents) : []
  const heading = contents[0]?.content?.trim() || 'Reservation'

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSending(true)
    setError('')
    const therapist = staff.find((s) => String(s.id) === String(form.staffId))
    const result = await submitReservation({
      type: 'spa',
      source: 'form',
      serviceName: form.treatment,
      name: form.name,
      email: form.email,
      phone: form.phone,
      date: form.date,
      time: form.time,
      hours: form.hours,
      staffId: therapist ? therapist.id : null,
      staffName: therapist ? therapist.name : null,
      message: form.message,
    })
    setSending(false)
    if (result.ok) {
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 5000)
      setForm(emptyReservation)
    } else {
      setError(result.message)
    }
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
              <Eyebrow dark>Book Your Treatment</Eyebrow>
              <h2 className="mt-3 font-serif text-3xl font-bold text-white sm:text-4xl">
                {heading}
              </h2>
              <div className="mt-4 h-1 w-16 rounded-full bg-[#A3E635]" />
              <p className="mt-6 text-lg leading-relaxed text-white/75">
                Reserve your spa experience in minutes. Tell us what you need and when — we'll
                take care of the rest.
              </p>
            </Reveal>

            <Reveal delay={120}>
              {submitted && (
                <div className="mt-6 rounded-xl border border-[#A3E635]/50 bg-[#A3E635]/10 px-4 py-3 text-sm text-[#A3E635]">
                  ✓ Thank you! Your reservation request has been received.
                </div>
              )}
              {error && (
                <div className="mt-6 rounded-xl border border-red-400/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="Full name *"
                    value={form.name}
                    onChange={handleChange}
                    className={inputBase}
                  />
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="Email *"
                    value={form.email}
                    onChange={handleChange}
                    className={inputBase}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    type="tel"
                    name="phone"
                    required
                    placeholder="Phone *"
                    value={form.phone}
                    onChange={handleChange}
                    className={inputBase}
                  />
                  <select
                    name="treatment"
                    required
                    value={form.treatment}
                    onChange={handleChange}
                    className={`${inputBase} appearance-none`}
                  >
                    <option value="" className="text-[#0B2545]">
                      Choose a treatment *
                    </option>
                    <option value="Massage Therapy" className="text-[#0B2545]">
                      Massage Therapy
                    </option>
                    <option value="Sauna" className="text-[#0B2545]">
                      Sauna
                    </option>
                    <option value="Steam Bath" className="text-[#0B2545]">
                      Steam Bath
                    </option>
                    <option value="Body Scrub" className="text-[#0B2545]">
                      Body Scrub
                    </option>
                    <option value="Body Therapy" className="text-[#0B2545]">
                      Body Therapy
                    </option>
                    <option value="Relaxation Package" className="text-[#0B2545]">
                      Relaxation Package
                    </option>
                  </select>
                </div>

                {/* Select therapist */}
                <StaffSelect
                  staff={staff}
                  id="rs-staff"
                  placeholder="Select a therapist (optional)"
                  value={form.staffId}
                  onChange={handleChange}
                  className={inputBase}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    type="date"
                    name="date"
                    required
                    value={form.date}
                    onChange={handleChange}
                    className={inputBase}
                  />
                  <input
                    type="time"
                    name="time"
                    required
                    value={form.time}
                    onChange={handleChange}
                    className={inputBase}
                  />
                </div>

                {/* How many hours */}
                <select
                  name="hours"
                  required
                  value={form.hours}
                  onChange={handleChange}
                  className={`${inputBase} appearance-none`}
                >
                  <option value="" className="text-[#0B2545]">
                    How many hours do you want the service? *
                  </option>
                  {HOUR_OPTIONS.map((h) => (
                    <option key={h} value={h} className="text-[#0B2545]">
                      {h} {h === 1 ? 'Hour' : 'Hours'}
                    </option>
                  ))}
                </select>

                <textarea
                  name="message"
                  rows="4"
                  placeholder="Anything we should know? (optional)"
                  value={form.message}
                  onChange={handleChange}
                  className={inputBase}
                />

                <button
                  type="submit"
                  disabled={sending}
                  className="inline-block rounded-full bg-[#A3E635] px-8 py-3 text-sm font-bold text-[#0B2545] transition duration-200 hover:-translate-y-0.5 hover:bg-[#D9F99D] disabled:opacity-60"
                >
                  {sending ? 'Sending…' : 'Reserve Now'}
                </button>
              </form>
            </Reveal>
          </div>

          <Reveal delay={150} className="relative">
            <div className="absolute -bottom-4 -left-4 hidden h-full w-full rounded-3xl border-2 border-[#A3E635] sm:block" />
            <img
              src={aboutImage}
              alt="Reserve a spa session at Lena"
              loading="lazy"
              className="relative z-10 h-80 w-full rounded-3xl object-cover shadow-2xl sm:h-[32rem]"
            />
            <div className="relative z-20 mx-auto -mt-16 max-w-sm rounded-2xl bg-white p-6 text-[#0B2545] shadow-2xl lg:mx-0 lg:ml-auto lg:-mt-24">
              <h3 className="font-serif text-xl font-bold">Open Hours</h3>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#0B2545]/60">Mon – Fri</span>
                  <span className="font-semibold">9:00 AM – 9:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#0B2545]/60">Saturday</span>
                  <span className="font-semibold">9:00 AM – 10:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#0B2545]/60">Sunday</span>
                  <span className="font-semibold">10:00 AM – 8:00 PM</span>
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
   THERAPISTS
===================================================== */
const TherapistsSection = ({ section }) => {
  const contents = sortById(section.contents)

  if (!contents.length) {
    return (
      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <SectionTitle eyebrow="The People" title={section.sectionName || 'Our Therapists'} />
          </Reveal>
          <Reveal delay={120}>
            <div className="mt-12 rounded-3xl border border-dashed border-[#0B2545]/20 bg-[#0B2545]/[0.02] p-12 text-center">
              <p className="text-[#0B2545]/60">
                Our therapist profiles are coming soon. In the meantime, our team is ready to
                welcome you.
              </p>
              <Link
                to="/contact"
                className="mt-6 inline-block rounded-full bg-[#0B2545] px-8 py-3 text-sm font-bold text-[#A3E635] transition duration-200 hover:-translate-y-0.5 hover:bg-[#13315c]"
              >
                Contact Our Team
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <SectionTitle
            eyebrow="The People"
            title={section.sectionName}
          />
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {contents.map((item, i) => {
            const { title, body } = splitTitle(item.content)
            const [photo] = getImages(item.contentImages)
            const displayPhoto = photo || `https://i.pravatar.cc/600?img=${(i % 20) + 10}`
            return (
              <Reveal key={item.id} delay={i * 100}>
                <article className="group relative overflow-hidden rounded-2xl shadow-lg shadow-[#0B2545]/10 transition duration-300 hover:-translate-y-1 hover:shadow-2xl">
                  <div className="aspect-[4/5] w-full overflow-hidden bg-gray-200">
                    <img
                      src={displayPhoto}
                      alt={title}
                      loading="lazy"
                      className="h-full w-full object-cover object-top grayscale transition-all duration-500 group-hover:scale-105 group-hover:grayscale-0"
                    />
                  </div>
                  <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[#0B2545] via-[#0B2545]/85 to-transparent px-5 pb-5 pt-16 text-center">
                    <h3 className="font-serif text-lg font-bold capitalize text-white">{title}</h3>
                    <div className="mx-auto mt-2 h-0.5 w-8 rounded-full bg-[#A3E635]" />
                    {body && (
                      <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-[#A3E635]">
                        {body}
                      </p>
                    )}
                  </div>
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
const Spa = () => {
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await webApi.getSectionsByPage(SPA_PAGE_ID)
        if (!cancelled) setSections(res?.success ? sortById(res.data) : [])
      } catch (err) {
        console.error('Spa: failed to load sections', err)
        if (!cancelled)
          setError('We could not load this page right now. Please try again later.')
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

  // Original API names keep their typos ("treapies", "our pakages", "terapist").
  const hero = byName('hero')
  const therapies = byName('treapies') || byName('therapies') || byName('therapy')
  const packages = byName('our pakages') || byName('our packages') || byName('packages')
  const products = byName('products')
  const reservation =
    byName('reservation') || byName('reservations') || byName('booking')
  const therapists =
    byName('terapist') || byName('therapist') || byName('therapists')

  const staff = getStaff(therapists)

  const known = new Set(
    [hero, therapies, packages, products, reservation, therapists].filter(Boolean)
  )
  const extras = sections.filter((s) => {
    const n = s.sectionName.trim().toLowerCase()
    if (n === 'footer') return false
    return !known.has(s)
  })

  return (
    <>
      <main className="overflow-x-hidden bg-white">
        {/* ORDER: Hero → Therapies → Products → Packages → Reservation → Therapists */}
        {hero && <HeroSection section={hero} />}
        {therapies && <TherapiesSection section={therapies} />}
        {products && <ProductsSection section={products} />}
        {packages && <PackagesSection section={packages} staff={staff} />}
        <ReservationSection section={reservation} staff={staff} />
        {therapists && <TherapistsSection section={therapists} />}

        {extras.map((s) => (
          <GenericSection key={s.id} section={s} />
        ))}
      </main>

      <Footer />
    </>
  )
}

export default Spa