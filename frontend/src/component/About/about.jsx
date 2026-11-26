import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { webApi } from '../Api/apilist'
import aboutImage from '../../asset/img/Herosection/herosection.jpg' // fallback image
import Footer from '../Footer/footer'

const ABOUT_PAGE_ID = 2
const API_ORIGIN = (process.env.REACT_APP_API_URL || 'http://localhost:3001/api').replace(
  /\/api\/?$/,
  ''
)

/* ---------- Helpers ---------- */

/* Resolve a single source: data:, blob:, http(s):, //, or a server path */
const resolveSrc = (src) => {
  const s = (src || '').trim()
  if (!s) return ''
  if (/^(data:|blob:|https?:)/i.test(s) || s.startsWith('//')) return s
  return `${API_ORIGIN}/${s.replace(/^\//, '')}`
}

/* The API sends images as a JSON array (often base64 data URIs) or as a comma list.
   Data URIs contain commas, so naive split(',') corrupts them. */
const getImages = (value) => {
  if (!value || typeof value !== 'string') return []
  const v = value.trim()
  let list = []

  if (v.startsWith('[')) {
    try {
      const parsed = JSON.parse(v)
      list = Array.isArray(parsed) ? parsed : []
    } catch {
      list = []
    }
  } else if (v.includes('data:')) {
    list = v.split(/,(?=data:)/)
  } else {
    list = v.split(',')
  }

  return list.map((s) => resolveSrc(String(s))).filter(Boolean)
}

const sortById = (list = []) => list.filter((i) => !i.isDeleted).sort((a, b) => a.id - b.id)

const toParagraphs = (text = '') =>
  (text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

const splitTitle = (text = '') => {
  const lines = toParagraphs(text)
  return { title: lines[0] || '', body: lines.slice(1).join(' ') }
}

const parseCommitments = (text = '') => {
  const lines = toParagraphs(text)
  const bullets = lines
    .filter((l) => /^[•\-*]/.test(l))
    .map((l) => l.replace(/^[•\-*]\s*/, '').trim())
  const lead = lines.find((l) => !/^[•\-*]/.test(l)) || ''
  return { lead, bullets }
}

const getInitials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

const normalizeName = (section) => (section?.sectionName || '').trim().toLowerCase()

/* ---------- Reveal Animation Wrapper ---------- */
const Reveal = ({ children, className = '', delay = 0, as: Tag = 'div' }) => {
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
    <Tag
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transform-gpu transition-all duration-700 ease-out motion-reduce:transition-none ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      } ${className}`}
    >
      {children}
    </Tag>
  )
}

/* ---------- Shared UI ---------- */
const Eyebrow = ({ children, dark }) => (
  <span
    className={`inline-flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.32em] ${
      dark ? 'text-[#A3E635]' : 'text-[#4d7c0f]'
    }`}
  >
    <span className={`h-px w-8 ${dark ? 'bg-[#A3E635]/60' : 'bg-[#4d7c0f]/40'}`} />
    {children}
  </span>
)

const Divider = ({ center = false }) => (
  <div
    className={`mt-5 h-[3px] w-14 rounded-full bg-gradient-to-r from-[#A3E635] to-[#4d7c0f] ${
      center ? 'mx-auto' : ''
    }`}
  />
)

const SectionTitle = ({ eyebrow, title, center = true, subtitle }) => (
  <div className={center ? 'text-center' : ''}>
    {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
    <h2 className="mt-4 font-serif text-3xl font-bold leading-tight text-[#0B2545] sm:text-4xl lg:text-[2.6rem]">
      {title}
    </h2>
    <Divider center={center} />
    {subtitle && (
      <p
        className={`mt-5 max-w-2xl text-base leading-relaxed text-[#0B2545]/70 ${
          center ? 'mx-auto' : ''
        }`}
      >
        {subtitle}
      </p>
    )}
  </div>
)

const Check = ({ className = 'h-4 w-4' }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m5 12.5 4.5 4.5L19 7.5" />
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

/* ---------- Hero Section ---------- */
const HeroSection = ({ section }) => {
  const contents = sortById(section.contents)
  const heroImages = contents.flatMap((c) => getImages(c.contentImages))
  const bgImage = heroImages[0] || aboutImage

  return (
    <section className="relative isolate flex min-h-[40vh] items-center overflow-hidden bg-[#0B2545] text-white sm:min-h-[44vh]">
      {/* Background image */}
      <div className="absolute inset-0 -z-10">
        <img
          src={bgImage}
          alt=""
          aria-hidden="true"
          className="h-full w-full scale-105 object-cover object-center opacity-60"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B2545]/90 via-[#0B2545]/60 to-[#0B2545]/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B2545] via-transparent to-[#0B2545]/30" />
      </div>

      {/* Decorative glows */}
      <div className="pointer-events-none absolute -left-40 -top-40 -z-10 h-[26rem] w-[26rem] rounded-full bg-[#A3E635]/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-48 -right-32 -z-10 h-[30rem] w-[30rem] rounded-full bg-[#13315c]/50 blur-[120px]" />

      <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center px-6 py-14 text-center sm:py-16">
        {/* Breadcrumb */}
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
                About Us
              </li>
            </ol>
          </nav>
        </Reveal>

        {contents.map((item, i) => {
          const lines = toParagraphs(item.content)
          const mainTitle = lines[0] || ''
          const tagline = lines.slice(1).join(' ')
          return (
            <React.Fragment key={item.id}>
              <Reveal delay={120 + i * 120}>
                <h1 className="mt-5 max-w-3xl font-serif text-2xl font-bold leading-[1.2] tracking-tight drop-shadow-lg sm:text-3xl lg:text-4xl">
                  {mainTitle}
                </h1>
              </Reveal>
              {tagline && (
                <Reveal delay={260}>
                  <p className="mt-3 max-w-xl text-sm font-light leading-relaxed text-white/85 drop-shadow-md sm:text-base">
                    {tagline}
                  </p>
                </Reveal>
              )}
            </React.Fragment>
          )
        })}

        <Reveal delay={400}>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/services"
              className="group inline-flex items-center gap-2 rounded-full bg-[#A3E635] px-6 py-3 text-[13px] font-bold text-[#0B2545] shadow-lg shadow-[#A3E635]/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#b6f04f] hover:shadow-xl"
            >
              Explore Services
              <ArrowRight />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/5 px-6 py-3 text-[13px] font-bold text-white backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-white/60 hover:bg-white/15"
            >
              Book a Visit
            </Link>
          </div>
        </Reveal>
      </div>

      {/* Soft bottom edge */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#A3E635]/50 to-transparent" />
    </section>
  )
}

/* ---------- About Section ---------- */
const AboutSection = ({ section }) => {
  const contents = sortById(section.contents)
  const images = contents.flatMap((c) => getImages(c.contentImages))
  const paragraphs = contents.flatMap((c) => toParagraphs(c.content))

  const mainImg = images[0] || aboutImage
  const sideImg = images[1] || null

  return (
    <section className="relative bg-white py-20 sm:py-24 lg:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 lg:grid-cols-2 lg:gap-24">
        {/* Image Grid */}
        <Reveal className="relative">
          <div className="relative">
            <div className="absolute -bottom-6 -left-6 h-full w-full rounded-[2rem] border-2 border-[#A3E635]/60 sm:-bottom-8 sm:-left-8" />
            <img
              src={mainImg}
              alt="Inside Lena Wellness & Spa"
              loading="lazy"
              className="relative z-10 h-80 w-full rounded-[2rem] object-cover shadow-2xl shadow-[#0B2545]/20 sm:h-[30rem] lg:h-[34rem]"
            />
            {sideImg && (
              <img
                src={sideImg}
                alt="Lena Spa interior detail"
                loading="lazy"
                className="absolute -bottom-10 -right-6 z-20 hidden h-56 w-56 rounded-2xl border-4 border-white object-cover shadow-2xl sm:block lg:-right-10"
              />
            )}
            <div className="absolute -top-4 right-6 z-20 rounded-full bg-[#0B2545] px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.25em] text-[#A3E635] shadow-lg sm:right-10">
              Since Day One
            </div>
          </div>
        </Reveal>

        {/* Text Content */}
        <div className="text-center lg:text-left">
          <Reveal delay={100}>
            <Eyebrow>Who We Are</Eyebrow>
            <h2 className="mt-4 font-serif text-3xl font-bold leading-tight text-[#0B2545] sm:text-4xl lg:text-[2.6rem]">
              Lena Wellness &amp; Spa
            </h2>
            <div className="mx-auto mt-5 h-[3px] w-14 rounded-full bg-gradient-to-r from-[#A3E635] to-[#4d7c0f] lg:mx-0" />
          </Reveal>

          <div className="mt-8 space-y-5">
            {paragraphs.map((p, i) => (
              <Reveal key={i} delay={150 + i * 90}>
                <p
                  className={`text-[17px] leading-[1.85] text-[#0B2545]/75 ${
                    i === 0
                      ? 'first-letter:float-left first-letter:mr-3 first-letter:font-serif first-letter:text-5xl first-letter:font-bold first-letter:leading-[0.9] first-letter:text-[#4d7c0f] lg:first-letter:block'
                      : ''
                  }`}
                >
                  {p}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- Vision & Mission ---------- */
const MissionsSection = ({ section }) => {
  const contents = sortById(section.contents)
  const commitments = contents.find((c) => /^[•\-*]/m.test(c.content || ''))
  const cards = contents.filter((c) => c !== commitments)
  const { lead, bullets } = commitments
    ? parseCommitments(commitments.content)
    : { lead: '', bullets: [] }

  return (
    <section className="relative overflow-hidden bg-[#0B2545]/[0.035] py-20 sm:py-24 lg:py-28">
      <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-[#A3E635]/10 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-6">
        <Reveal>
          <SectionTitle
            eyebrow="Purpose"
            title="Our Vision & Mission"
            subtitle="Guided by purpose, driven by passion — we exist to elevate your wellness journey."
          />
        </Reveal>

        <div className="mt-14 grid gap-7 md:grid-cols-2">
          {cards.map((item, i) => {
            const { title, body } = splitTitle(item.content)
            return (
              <Reveal key={item.id} delay={i * 150}>
                <div className="group relative h-full overflow-hidden rounded-3xl border border-[#0B2545]/10 bg-white p-8 shadow-lg shadow-[#0B2545]/5 transition-all duration-500 hover:-translate-y-1.5 hover:border-[#A3E635]/40 hover:shadow-2xl hover:shadow-[#0B2545]/10 sm:p-10">
                  <div className="absolute -right-2 -top-4 font-serif text-8xl font-bold text-[#0B2545]/[0.04] transition-colors duration-500 group-hover:text-[#A3E635]/15">
                    0{i + 1}
                  </div>

                  <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#A3E635] to-[#7fb51f] font-serif text-xl font-bold text-[#0B2545] shadow-md shadow-[#A3E635]/30">
                    {i + 1}
                  </div>

                  <h3 className="relative mt-6 font-serif text-2xl font-bold text-[#0B2545] sm:text-[1.65rem]">
                    {title}
                  </h3>
                  <div className="mt-3 h-[3px] w-10 rounded-full bg-[#A3E635] transition-all duration-500 group-hover:w-16" />
                  <p className="relative mt-5 leading-[1.8] text-[#0B2545]/70">{body}</p>
                </div>
              </Reveal>
            )
          })}
        </div>

        {bullets.length > 0 && (
          <Reveal delay={300}>
            <div className="relative mt-10 overflow-hidden rounded-3xl bg-[#0B2545] p-8 text-white shadow-2xl shadow-[#0B2545]/30 sm:p-12 lg:p-14">
              <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#A3E635]/15 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-[#13315c] blur-3xl" />

              <div className="relative">
                {lead && (
                  <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <div className="h-1 w-12 rounded-full bg-[#A3E635]" />
                    <h3 className="font-serif text-2xl font-bold text-[#A3E635] sm:text-3xl">
                      {lead.replace(/:$/, '')}
                    </h3>
                  </div>
                )}

                <ul className="mt-10 grid gap-x-10 gap-y-7 sm:grid-cols-2">
                  {bullets.map((b) => (
                    <li key={b} className="group flex items-start gap-4 text-white/90">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#A3E635] text-[#0B2545] shadow-md shadow-[#A3E635]/30 transition-transform duration-300 group-hover:scale-110">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-[17px] leading-relaxed">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  )
}

/* ---------- Core Values ---------- */
const CoreValueSection = ({ section }) => {
  const contents = sortById(section.contents)
  const images = contents.flatMap((c) => getImages(c.contentImages))
  const mainImg = images[0] || aboutImage
  const values = contents.filter((c) => c.contentType !== 'image')

  return (
    <section className="relative overflow-hidden bg-white py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-24">
          {/* Left: Image */}
          <Reveal className="relative order-2 h-full min-h-[420px] lg:order-1">
            <div className="relative h-full">
              <div className="absolute -bottom-6 -left-6 hidden h-full w-full rounded-[2rem] border-2 border-[#A3E635]/60 sm:block" />
              <img
                src={mainImg}
                alt="Our core values in practice"
                loading="lazy"
                className="relative z-10 h-full min-h-[420px] w-full rounded-[2rem] object-cover shadow-2xl shadow-[#0B2545]/20 lg:min-h-[560px]"
              />
              <div className="absolute -bottom-8 right-6 z-20 hidden max-w-[220px] rounded-2xl bg-[#0B2545] p-5 text-white shadow-xl sm:block lg:right-10">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#A3E635] text-[#0B2545]">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A3E635]">
                      Values
                    </p>
                    <p className="text-sm font-semibold">{values.length} Guiding Principles</p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Right: Content */}
          <div className="order-1 lg:order-2">
            <Reveal>
              <Eyebrow>What Guides Us</Eyebrow>
              <h2 className="mt-4 font-serif text-3xl font-bold leading-tight text-[#0B2545] sm:text-4xl lg:text-[2.6rem]">
                {section.sectionName}
              </h2>
              <Divider />
            </Reveal>

            <ul className="mt-10 grid gap-5 sm:grid-cols-2">
              {values.map((item, i) => {
                const { title, body } = splitTitle(item.content)
                return (
                  <Reveal as="li" key={item.id} delay={i * 90} className="h-full">
                    <div className="group relative h-full overflow-hidden rounded-2xl border border-[#0B2545]/10 bg-[#0B2545]/[0.02] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#A3E635]/50 hover:bg-white hover:shadow-lg">
                      <div className="flex items-start gap-3.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0B2545] text-[#A3E635] shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:bg-[#A3E635] group-hover:text-[#0B2545]">
                          <Check className="h-4 w-4" />
                        </span>
                        <div>
                          <h3 className="font-serif text-lg font-bold text-[#0B2545]">{title}</h3>
                          {body && (
                            <p className="mt-1.5 text-sm leading-relaxed text-[#0B2545]/65">
                              {body}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Reveal>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- Team Section ---------- */
const TeamSection = ({ section }) => {
  const contents = sortById(section.contents)
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

  const maxIndex = Math.max(0, contents.length - perView)
  const clamp = useCallback((i) => Math.min(Math.max(i, 0), maxIndex), [maxIndex])

  useEffect(() => {
    setIndex((i) => Math.min(i, maxIndex))
  }, [maxIndex])

  useEffect(() => {
    if (paused || dragging || maxIndex === 0) return undefined
    const timer = setInterval(() => {
      setIndex((i) => (i >= maxIndex ? 0 : i + 1))
    }, 4500)
    return () => clearInterval(timer)
  }, [paused, dragging, maxIndex])

  if (!contents.length) return null

  const goTo = (i) => setIndex(clamp(i))
  const prev = () => goTo(index <= 0 ? maxIndex : index - 1)
  const next = () => goTo(index >= maxIndex ? 0 : index + 1)

  const onPointerDown = (e) => {
    dragStart.current = { x: e.clientX }
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
  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') prev()
    if (e.key === 'ArrowRight') next()
  }

  return (
    <section
      className="relative overflow-hidden bg-[#0B2545]/[0.035] py-20 sm:py-24 lg:py-28"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <SectionTitle
            eyebrow="The People"
            title={section.sectionName}
            subtitle="Meet the dedicated professionals behind every relaxing experience."
          />
        </Reveal>

        <Reveal delay={120}>
          <div className="relative mt-14">
            <div
              className="-mx-2.5 overflow-hidden px-2.5 py-3 outline-none"
              tabIndex={0}
              role="region"
              aria-roledescription="carousel"
              aria-label="Team members"
              onKeyDown={onKeyDown}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              style={{ cursor: dragging ? 'grabbing' : 'grab', touchAction: 'pan-y' }}
            >
              <div
                className="flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ transform: `translateX(-${index * (100 / perView)}%)` }}
              >
                {contents.map((item) => {
                  const { title, body } = splitTitle(item.content)
                  const [photo] = getImages(item.contentImages)

                  return (
                    <div
                      key={item.id}
                      className="shrink-0 px-2.5 sm:px-3"
                      style={{ width: `${100 / perView}%` }}
                    >
                      <article className="group relative overflow-hidden rounded-3xl bg-white shadow-lg shadow-[#0B2545]/10 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-[#0B2545]/20">
                        <div className="aspect-[4/5] w-full overflow-hidden bg-gradient-to-br from-[#0B2545] to-[#13315c]">
                          {photo ? (
                            <img
                              src={photo}
                              alt={title}
                              loading="lazy"
                              draggable={false}
                              className="h-full w-full select-none object-cover object-top grayscale transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <span className="flex h-24 w-24 items-center justify-center rounded-full border border-[#A3E635]/40 bg-[#A3E635]/10 font-serif text-3xl font-bold text-[#A3E635]">
                                {getInitials(title)}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0B2545] via-[#0B2545]/90 to-transparent p-5 pt-16 text-center">
                          <h3 className="font-serif text-lg font-bold capitalize text-white">
                            {title}
                          </h3>
                          {body && (
                            <p className="mt-1.5 inline-block rounded-full bg-[#A3E635]/20 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#A3E635]">
                              {body}
                            </p>
                          )}
                        </div>
                      </article>
                    </div>
                  )
                })}
              </div>
            </div>

            {contents.length > perView && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Previous team members"
                  className="absolute -left-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-[#0B2545]/10 bg-white text-xl text-[#0B2545] shadow-lg transition-all duration-300 hover:border-[#A3E635] hover:bg-[#A3E635] sm:flex lg:-left-6"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Next team members"
                  className="absolute -right-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-[#0B2545]/10 bg-white text-xl text-[#0B2545] shadow-lg transition-all duration-300 hover:border-[#A3E635] hover:bg-[#A3E635] sm:flex lg:-right-6"
                >
                  ›
                </button>
              </>
            )}

            {maxIndex > 0 && (
              <div className="mt-10 flex justify-center gap-2.5">
                {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    aria-current={i === index}
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      i === index
                        ? 'w-9 bg-[#A3E635]'
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

/* ---------- Generic fallback section ---------- */
const GenericSection = ({ section }) => {
  const contents = sortById(section.contents)
  if (!contents.length) return null
  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <Reveal>
          <SectionTitle title={section.sectionName} />
        </Reveal>
        <div className="mt-10 space-y-6">
          {contents
            .flatMap((c) => toParagraphs(c.content))
            .map((p, i) => (
              <Reveal key={i} delay={i * 100}>
                <p className="text-[17px] leading-[1.85] text-[#0B2545]/75">{p}</p>
              </Reveal>
            ))}
        </div>
      </div>
    </section>
  )
}

/* ---------- CTA Band ---------- */
const CtaBand = () => (
  <section className="relative overflow-hidden bg-gradient-to-br from-[#0B2545] via-[#13315c] to-[#0B2545] py-16 sm:py-20">
    <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-[#A3E635]/15 blur-3xl" />
    <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-[#A3E635]/10 blur-3xl" />
    <div className="relative mx-auto max-w-4xl px-6 text-center">
      <Reveal>
        <Eyebrow dark>Your Moment Awaits</Eyebrow>
        <h2 className="mt-4 font-serif text-3xl font-bold leading-tight text-white sm:text-4xl">
          Ready to <span className="text-[#A3E635]">Relax &amp; Restore?</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-white/75">
          Book your personalized wellness session today and experience the Lena Spa difference.
        </p>
        <Link
          to="/contact"
          className="group mt-8 inline-flex items-center gap-2 rounded-full bg-[#A3E635] px-8 py-4 text-sm font-bold text-[#0B2545] shadow-lg shadow-[#A3E635]/30 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#b6f04f] hover:shadow-xl"
        >
          Book Your Visit
          <ArrowRight />
        </Link>
      </Reveal>
    </div>
  </section>
)

/* ---------- Page ---------- */
const AboutUs = () => {
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await webApi.getSectionsByPage(ABOUT_PAGE_ID)
        if (!cancelled) setSections(res?.success ? sortById(res.data) : [])
      } catch (err) {
        console.error('AboutUs: failed to load sections', err)
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
      <div
        className="flex min-h-[70vh] flex-col items-center justify-center gap-5 bg-white"
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
        className="flex min-h-[70vh] flex-col items-center justify-center gap-4 bg-white px-6 text-center"
        role="alert"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl text-red-500">
          ⚠
        </div>
        <p className="text-[#0B2545]/70">{error}</p>
      </div>
    )
  }

  const hasTeamSection = sections.some((s) => normalizeName(s) === 'our team')

  return (
    <>
      <main className="overflow-x-hidden bg-white">
        {sections.map((section) => {
          const name = normalizeName(section)

          // Render the CTA band right before "Our Team"
          if (name === 'our team') {
            return (
              <React.Fragment key={section.id}>
                <CtaBand />
                <TeamSection section={section} />
              </React.Fragment>
            )
          }

          switch (name) {
            case 'hero':
              return <HeroSection key={section.id} section={section} />
            case 'about':
              return <AboutSection key={section.id} section={section} />
            case 'missions':
            case 'mission':
              return <MissionsSection key={section.id} section={section} />
            case 'core value':
            case 'core values':
              return <CoreValueSection key={section.id} section={section} />
            default:
              return <GenericSection key={section.id} section={section} />
          }
        })}

        {/* Fallback: if there is no team section, put the CTA at the bottom */}
        {!hasTeamSection && <CtaBand />}
      </main>

      <Footer />
    </>
  )
}

export default AboutUs