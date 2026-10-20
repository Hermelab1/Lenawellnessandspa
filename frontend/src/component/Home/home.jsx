import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { webApi } from '../Api/apilist'
import aboutImage from '../../asset/img/Herosection/herosection.jpg'
import Footer from '../Footer/footer'

const HOME_PAGE_ID = 1
const API_ORIGIN = (process.env.REACT_APP_API_URL || 'http://localhost:3001/api').replace(
  /\/api\/?$/,
  ''
)

const LINKS = {
  contact: '/contact',
  beautysalon: '/ourservice/beauty-salon',
  about: '/aboutus',
  services: '/ourservice/spa',
  packages: '/ourservice/gym#packages', // 👈 points to Gym page's #packages section
  gym: '/ourservice/gym',
}

const heroContext = require.context('../../asset/img/Homepage', false, /\.(png|jpe?g|webp|avif)$/i)
const heroImages = heroContext
  .keys()
  .sort()
  .map((key) => {
    const mod = heroContext(key)
    return mod.default || mod
  })

const SLIDE_INTERVAL = 3000
const TESTIMONIAL_INTERVAL = 5000

/* ---------- Section ordering ---------- */
const SECTION_ORDER = {
  hero: 0,
  about: 1,
  'our service': 2,
  'our services': 2,
  'our wellness promise': 3,
  'wellness packages': 4,
  packages: 4,
  'why choose': 5,
  'why us': 5,
  testimonials: 6,
  footer: 99,
}

const orderOf = (name) => {
  const key = name.trim().toLowerCase()
  if (key in SECTION_ORDER) return SECTION_ORDER[key]
  if (key.startsWith('why choose')) return SECTION_ORDER['why choose']
  if (key.startsWith('testm') || key.startsWith('testi')) return SECTION_ORDER.testimonials
  return 50
}

/* ---------- Helpers ---------- */
const getImages = (value) =>
  (value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((src) => (/^(https?:)?\/\//.test(src) ? src : `${API_ORIGIN}/${src.replace(/^\//, '')}`))

const sortById = (list = []) => list.filter((i) => !i.isDeleted).sort((a, b) => a.id - b.id)

const clean = (s = '') => s.replace(/\s+/g, ' ').trim()
const toLines = (text = '') =>
  text
    .split('\n')
    .map((l) => clean(l))
    .filter(Boolean)

const toPairs = (ls) => {
  const pairs = []
  for (let i = 0; i + 1 < ls.length; i += 2) pairs.push({ title: ls[i], body: ls[i + 1] })
  return { pairs, rest: ls.length % 2 ? [ls[ls.length - 1]] : [] }
}

const parseTestimonial = (text = '') => {
  const ls = toLines(text)
  const quote = (ls[0] || '').replace(/^[“"]\s*|\s*[”"]$/g, '')
  const role = ls.length >= 3 ? ls[ls.length - 1] : ''
  const name = ls.length >= 3 ? ls[ls.length - 2] : ls[1] || ''
  return { quote, name, role }
}

const WHY_HEADINGS = {
  'our wellness promise': 'promise',
  'wellness packages': 'packages',
  'gift vouchers': 'gift',
  'our commitment to you': 'commitment',
}
const parseWhy = (contents) => {
  const groups = { reasons: [], promise: [], packages: [], gift: [], commitment: [] }
  let key = 'reasons'
  contents.forEach((c) =>
    toLines(c.content).forEach((l) => {
      const h = WHY_HEADINGS[l.toLowerCase()]
      if (h) key = h
      else groups[key].push(l)
    })
  )
  return groups
}

/* ---------- Reveal-on-scroll wrapper ---------- */
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
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
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
    className={`inline-block text-xs font-semibold uppercase tracking-[0.3em] ${
      dark ? 'text-[#A3E635]' : 'text-[#4d7c0f]'
    }`}
  >
    {children}
  </span>
)

const SectionTitle = ({ eyebrow, title, dark }) => (
  <div className="text-center">
    {eyebrow && <Eyebrow dark={dark}>{eyebrow}</Eyebrow>}
    <h2
      className={`mt-3 font-serif text-3xl font-bold sm:text-4xl ${
        dark ? 'text-white' : 'text-[#0B2545]'
      }`}
    >
      {title}
    </h2>
    <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-[#A3E635]" />
  </div>
)

const Check = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
)

const ContentBlock = ({ item, className = '' }) => {
  const images = getImages(item.contentImages)
  return (
    <>
      {item.content?.trim() && (
        <p className={`whitespace-pre-line ${className}`}>{item.content.trim()}</p>
      )}
      {images.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {images.map((src) => (
            <img key={src} src={src} alt="" loading="lazy" className="h-64 w-full rounded-2xl object-cover shadow-lg" />
          ))}
        </div>
      )}
    </>
  )
}

/* ---------- HERO ---------- */
const HeroSection = ({ section }) => {
  const contents = sortById(section.contents)
  const [first, ...rest] = contents

  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const total = heroImages.length

  useEffect(() => {
    if (total < 2 || paused) return undefined
    const timer = setInterval(() => setCurrent((c) => (c + 1) % total), SLIDE_INTERVAL)
    return () => clearInterval(timer)
  }, [total, paused, current])

  const goTo = (i) => setCurrent((i + total) % total)

  return (
    <section
      id="hero"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative overflow-hidden bg-[#0B2545] text-white"
    >
      {heroImages.map((src, i) => (
        <div
          key={src}
          aria-hidden="true"
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
            i === current ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            backgroundImage: `url(${src})`,
            transform: i === current ? 'scale(1.06)' : 'scale(1)',
            transition: 'opacity 1000ms ease, transform 6000ms ease-out',
          }}
        />
      ))}

      <div className="absolute inset-0 bg-gradient-to-b from-[#0B2545]/45 via-[#0B2545]/20 to-[#0B2545]/55" />

      {total === 0 && (
        <>
          <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#A3E635]/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-[#13315c] blur-3xl" />
        </>
      )}

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(current - 1)}
            aria-label="Previous slide"
            className="absolute left-4 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#A3E635]/60 bg-[#0B2545]/50 text-xl text-[#A3E635] backdrop-blur transition hover:bg-[#A3E635] hover:text-[#0B2545] sm:flex"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => goTo(current + 1)}
            aria-label="Next slide"
            className="absolute right-4 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#A3E635]/60 bg-[#0B2545]/50 text-xl text-[#A3E635] backdrop-blur transition hover:bg-[#A3E635] hover:text-[#0B2545] sm:flex"
          >
            ›
          </button>

          <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {heroImages.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === current}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  i === current ? 'w-8 bg-[#A3E635]' : 'w-2.5 bg-white/60 hover:bg-white'
                }`}
              />
            ))}
          </div>
        </>
      )}

      <div className="relative mx-auto flex min-h-[80vh] max-w-6xl flex-col items-center justify-center px-6 py-24 text-center">
        {first && <Eyebrow dark>{first.content}</Eyebrow>}

        {rest.map((item) => (
          <h1
            key={item.id}
            className="mt-5 max-w-3xl font-serif text-4xl font-bold leading-tight drop-shadow-[0_2px_12px_rgba(11,37,69,0.7)] sm:text-5xl lg:text-6xl"
          >
            {item.content}
          </h1>
        ))}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to={LINKS.gym}
            className="rounded-full bg-[#A3E635] px-8 py-3 text-sm font-bold text-[#0B2545] transition duration-200 hover:-translate-y-0.5 hover:bg-[#D9F99D]"
          >
            Be Our Member
          </Link>
          <Link
            to={LINKS.contact}
            className="rounded-full border border-[#A3E635]/60 px-8 py-3 text-sm font-semibold text-[#A3E635] transition duration-200 hover:bg-[#A3E635]/10"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ---------- ABOUT ---------- */
const AboutSection = ({ section }) => {
  const contents = sortById(section.contents)
  const images = contents.flatMap((item) => getImages(item.contentImages))
  const [apiMainImage, ...otherImages] = images
  const mainImage = apiMainImage || aboutImage

  return (
    <section id="about" className="bg-white py-20 sm:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-2 lg:gap-16">
        <Reveal className="relative">
          <div className="absolute -bottom-4 -left-4 hidden h-full w-full rounded-3xl border-2 border-[#A3E635] sm:block" />
          {mainImage ? (
            <div className="relative space-y-4">
              <img
                src={mainImage}
                alt="About Lena Wellness & Spa"
                loading="lazy"
                className="h-80 w-full rounded-3xl object-cover shadow-xl sm:h-[28rem]"
              />
              {otherImages.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {otherImages.slice(0, 2).map((src) => (
                    <img key={src} src={src} alt="" loading="lazy" className="h-40 w-full rounded-2xl object-cover shadow-lg" />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="relative flex h-80 w-full items-center justify-center rounded-3xl bg-gradient-to-br from-[#0B2545] to-[#13315c] shadow-xl sm:h-[28rem]">
              <span className="text-sm font-medium tracking-widest text-[#A3E635]/80">ADD IMAGE</span>
            </div>
          )}
        </Reveal>

        <Reveal delay={120} className="text-center lg:text-left">
          <Eyebrow>{section.sectionName}</Eyebrow>
          <h2 className="mt-3 font-serif text-3xl font-bold text-[#0B2545] sm:text-4xl">
            Lena Wellness &amp; Spa
          </h2>
          <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-[#A3E635] lg:mx-0" />

          <div className="mt-8 space-y-5">
            {contents
              .flatMap((item) => toLines(item.content))
              .map((line, i) => (
                <p key={i} className="text-lg leading-relaxed text-[#0B2545]/80">
                  {line}
                </p>
              ))}
          </div>

          <Link
            to={LINKS.about}
            className="mt-8 inline-block rounded-full bg-[#0B2545] px-8 py-3 text-sm font-bold text-[#A3E635] transition duration-200 hover:-translate-y-0.5 hover:bg-[#13315c]"
          >
            Learn More
          </Link>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------- OUR SERVICE (short preview) ---------- */
const ServicePreviewSection = ({ section }) => {
  const contents = sortById(section.contents)
  const { pairs } = toPairs(contents.flatMap((c) => toLines(c.content)))

  return (
    <section id="our-service" className="bg-[#0B2545]/[0.04] py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <SectionTitle eyebrow="What We Offer" title={section.sectionName} />
        </Reveal>

        {pairs.length > 0 ? (
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {pairs.map((p, i) => (
              <Reveal key={p.title} delay={i * 90}>
                <article className="group h-full rounded-3xl border border-[#0B2545]/10 bg-white p-8 transition duration-200 hover:-translate-y-1 hover:border-[#A3E635] hover:shadow-xl hover:shadow-[#0B2545]/10">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0B2545] font-serif text-lg font-bold text-[#A3E635] transition group-hover:bg-[#A3E635] group-hover:text-[#0B2545]">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <h3 className="mt-5 font-serif text-xl font-bold text-[#0B2545]">{p.title}</h3>
                  <p className="mt-3 leading-relaxed text-[#0B2545]/70">{p.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        ) : (
          <p className="mt-10 text-center text-[#0B2545]/50">Details coming soon.</p>
        )}

        <Reveal delay={150} className="mt-10 text-center">
          <Link
            to={LINKS.services}
            className="inline-block rounded-full bg-[#0B2545] px-8 py-3 text-sm font-bold text-[#A3E635] transition duration-200 hover:-translate-y-0.5 hover:bg-[#13315c]"
          >
            View All Services
          </Link>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------- OUR WELLNESS PROMISE ---------- */
const WellnessPromiseSection = ({ groups }) => {
  const [promiseTag, ...promiseText] = groups.promise
  if (!groups.promise.length) return null

  return (
    <section id="wellness-promise" className="relative overflow-hidden bg-[#0B2545] py-20 text-white sm:py-24">
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#A3E635]/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-[#13315c]/60 blur-3xl" />
      <Reveal className="relative mx-auto max-w-3xl px-6 text-center">
        <Eyebrow dark>Our Wellness Promise</Eyebrow>
        <h2 className="mt-3 font-serif text-3xl font-bold text-[#A3E635] sm:text-4xl">{promiseTag}</h2>
        <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-[#A3E635]" />
        <div className="mt-8 space-y-5">
          {promiseText.map((p, i) => (
            <p key={i} className="text-lg leading-relaxed text-white/85">
              {p}
            </p>
          ))}
        </div>

        <Link
          to={LINKS.beautysalon}
          className="mt-10 inline-block rounded-full bg-[#A3E635] px-8 py-3 text-sm font-bold text-[#0B2545] transition duration-200 hover:-translate-y-0.5 hover:bg-[#D9F99D]"
        >
          Book Your Place To Beauty
        </Link>
      </Reveal>
    </section>
  )
}

/* ---------- PACKAGES (with full-width Gift Vouchers) ---------- */
const PackagesSection = ({ groups }) => {
  const [pkgIntro, ...pkgRest] = groups.packages
  const { pairs: packages, rest: pkgNotes } = toPairs(pkgRest)

  const [giftLead, ...giftRest] = groups.gift
  const giftTagline = giftRest.length ? giftRest[giftRest.length - 1] : ''
  const giftText = giftRest.slice(0, -1)

  if (!packages.length && !groups.gift.length) return null

  const hasGift = groups.gift.length > 0

  return (
    <section id="packages" className="bg-white">
      {packages.length > 0 && (
        <div className="mx-auto max-w-6xl px-6 pt-20 pb-20 sm:pt-24 sm:pb-24">
          <Reveal>
            <SectionTitle eyebrow="Wellness Packages" title="Treat Yourself Or Someone Special" />
          </Reveal>
          {pkgIntro && (
            <Reveal delay={80}>
              <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-relaxed text-[#0B2545]/75">
                {pkgIntro}
              </p>
            </Reveal>
          )}

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {packages.map((p, i) => (
              <Reveal key={p.title} delay={i * 90}>
                <article className="flex h-full flex-col rounded-3xl border border-[#0B2545]/10 bg-[#0B2545]/[0.03] p-7 transition duration-200 hover:-translate-y-1 hover:border-[#A3E635] hover:bg-white hover:shadow-xl hover:shadow-[#0B2545]/10">
                  <span className="font-serif text-4xl font-bold text-[#A3E635]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-3 font-serif text-xl font-bold text-[#0B2545]">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#0B2545]/70">{p.body}</p>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal delay={150} className="mt-8 text-center">
            {pkgNotes.map((n) => (
              <p key={n} className="text-sm italic text-[#0B2545]/60">
                {n}
              </p>
            ))}
            <Link
              to={LINKS.packages}
              className="mt-5 inline-block rounded-full bg-[#0B2545] px-8 py-3 text-sm font-bold text-[#A3E635] transition duration-200 hover:-translate-y-0.5 hover:bg-[#13315c]"
            >
              See All Packages
            </Link>
          </Reveal>
        </div>
      )}

      {/* Gift Vouchers — FULL-WIDTH band (edge to edge), no white gap */}
      {hasGift && (
        <div className="w-full bg-[#A3E635]">
          <Reveal className="mx-auto max-w-6xl px-6 py-16 text-center text-[#0B2545] sm:py-20">
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#0B2545]/70">
              Gift Vouchers
            </span>
            <h2 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">{giftLead}</h2>
            <div className="mx-auto mt-5 max-w-2xl space-y-3 text-lg leading-relaxed text-[#0B2545]/85">
              {giftText.map((t, i) => (
                <p key={i}>{t}</p>
              ))}
            </div>
            {giftTagline && <p className="mt-5 font-serif text-xl font-bold italic">{giftTagline}</p>}
            <Link
              to={LINKS.contact}
              className="mt-8 inline-block rounded-full bg-[#0B2545] px-8 py-3 text-sm font-bold text-[#A3E635] transition duration-200 hover:-translate-y-0.5 hover:bg-[#13315c]"
            >
              Get A Gift Voucher
            </Link>
          </Reveal>
        </div>
      )}
    </section>
  )
}

/* ---------- WHY US ---------- */
const WhyUsSection = ({ section, groups }) => {
  const reasons = toPairs(groups.reasons).pairs
  if (!reasons.length) return null

  const apiWhyImages = sortById(section.contents).flatMap((item) => getImages(item.contentImages))
  const whyImages = [apiWhyImages[0] || aboutImage, apiWhyImages[1] || null]

  return (
    <section id="why-us" className="bg-[#0B2545]/[0.04] py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal className="space-y-5">
            {whyImages.map((src, i) =>
              src ? (
                <img
                  key={src}
                  src={src}
                  alt=""
                  loading="lazy"
                  className={`h-56 w-full rounded-[2rem] object-cover shadow-xl sm:h-64 ${
                    i === 1 ? 'lg:ml-8' : 'lg:mr-8'
                  }`}
                />
              ) : (
                <div
                  key={`placeholder-${i}`}
                  className="flex h-56 w-full items-center justify-center rounded-[2rem] bg-gradient-to-br from-[#0B2545] to-[#13315c] shadow-xl sm:h-64 lg:ml-8"
                >
                  <span className="text-sm font-medium tracking-widest text-[#A3E635]/80">ADD IMAGE</span>
                </div>
              )
            )}
          </Reveal>

          <Reveal delay={120} className="text-center lg:text-left">
            <Eyebrow>Why Us</Eyebrow>
            <h2 className="mt-3 font-serif text-3xl font-bold text-[#0B2545] sm:text-4xl">
              Why Choose Lena
            </h2>
            <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-[#A3E635] lg:mx-0" />

            <p className="mt-5 text-lg leading-relaxed text-[#0B2545]/75">
              Discover the benefits that make every visit to Lena a step forward on your wellness journey.
            </p>

            <ul className="mt-8 space-y-6 text-left">
              {reasons.map((r) => (
                <li key={r.title} className="flex gap-4">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0B2545] text-[#A3E635]">
                    <Check />
                  </span>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#0B2545]">{r.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-[#0B2545]/70">{r.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ---------- TESTIMONIALS (auto-swiping carousel) ---------- */
const TestimonialsSection = ({ section }) => {
  const items = sortById(section.contents)
    .map((c) => ({ id: c.id, ...parseTestimonial(c.content) }))
    .filter((t) => t.quote)

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

  const maxIndex = Math.max(0, items.length - perView)
  const clamp = useCallback((i) => Math.min(Math.max(i, 0), maxIndex), [maxIndex])

  useEffect(() => {
    setIndex((i) => Math.min(i, maxIndex))
  }, [maxIndex])

  useEffect(() => {
    if (paused || dragging || maxIndex === 0) return undefined
    const timer = setInterval(() => {
      setIndex((i) => (i >= maxIndex ? 0 : i + 1))
    }, TESTIMONIAL_INTERVAL)
    return () => clearInterval(timer)
  }, [paused, dragging, maxIndex])

  if (!items.length) return null

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
      id="testimonials"
      className="bg-white py-20 sm:py-24"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <SectionTitle eyebrow="Testimonials" title="What Our Clients Say" />
        </Reveal>

        <Reveal delay={120}>
          <div className="relative mt-12">
            <div
              className="overflow-hidden"
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
                {items.map((t) => (
                  <div
                    key={t.id}
                    className="shrink-0 px-2 sm:px-3"
                    style={{ width: `${100 / perView}%` }}
                  >
                    <figure className="relative flex h-full flex-col rounded-3xl border border-[#0B2545]/10 bg-white p-8 shadow-lg shadow-[#0B2545]/5">
                      <span className="absolute right-6 top-3 font-serif text-7xl leading-none text-[#A3E635]/50" aria-hidden="true">
                        ”
                      </span>

                      <div className="flex gap-1 text-[#A3E635]" aria-label="5 out of 5 stars">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <svg key={i} viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                            <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z" />
                          </svg>
                        ))}
                      </div>

                      <blockquote className="mt-5 flex-1 leading-relaxed text-[#0B2545]/80">
                        “{t.quote}”
                      </blockquote>

                      <figcaption className="mt-6 flex items-center gap-4 border-t border-[#0B2545]/10 pt-5">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0B2545] font-serif text-lg font-bold text-[#A3E635]">
                          {t.name.charAt(0).toUpperCase()}
                        </span>
                        <span>
                          <span className="block font-semibold text-[#0B2545]">{t.name}</span>
                          {t.role && <span className="block text-sm text-[#0B2545]/60">{t.role}</span>}
                        </span>
                      </figcaption>
                    </figure>
                  </div>
                ))}
              </div>
            </div>

            {items.length > perView && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Previous testimonials"
                  className="absolute -left-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#0B2545]/15 bg-white text-[#0B2545] shadow-md transition hover:border-[#A3E635] hover:text-[#4d7c0f] sm:flex lg:-left-5"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Next testimonials"
                  className="absolute -right-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#0B2545]/15 bg-white text-[#0B2545] shadow-md transition hover:border-[#A3E635] hover:text-[#4d7c0f] sm:flex lg:-right-5"
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

/* ---------- Generic Section ---------- */
const GenericSection = ({ section, index }) => {
  const contents = sortById(section.contents)
  const alt = index % 2 === 0

  return (
    <section
      id={section.sectionName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
      className={`py-20 sm:py-24 ${alt ? 'bg-[#0B2545]/[0.04]' : 'bg-white'}`}
    >
      <div className="mx-auto max-w-6xl px-6 text-center">
        <Reveal>
          <h2 className="font-serif text-3xl font-bold text-[#0B2545] sm:text-4xl">{section.sectionName}</h2>
          <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-[#A3E635]" />
        </Reveal>

        {contents.length > 0 ? (
          <div className="mx-auto mt-8 max-w-3xl space-y-5">
            {contents.map((item, i) => (
              <Reveal key={item.id} delay={i * 80}>
                <ContentBlock item={item} className="text-lg leading-relaxed text-[#0B2545]/80" />
              </Reveal>
            ))}
          </div>
        ) : (
          <p className="mt-8 text-[#0B2545]/50">Details coming soon.</p>
        )}
      </div>
    </section>
  )
}

/* ---------- Page ---------- */
const Home = () => {
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await webApi.getSectionsByPage(HOME_PAGE_ID)
        if (!cancelled) setSections(res?.success ? sortById(res.data) : [])
      } catch (err) {
        console.error('Home: failed to load sections', err)
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

  const ordered = [...sections].sort((a, b) => {
    const diff = orderOf(a.sectionName) - orderOf(b.sectionName)
    if (diff !== 0) return diff
    return a.id - b.id
  })

  const hero = ordered.find((s) => s.sectionName.trim().toLowerCase() === 'hero')
  const about = ordered.find((s) => s.sectionName.trim().toLowerCase() === 'about')
  const service = ordered.find((s) => {
    const n = s.sectionName.trim().toLowerCase()
    return n === 'our service' || n === 'our services'
  })
  const whyChoose = ordered.find((s) => s.sectionName.trim().toLowerCase().startsWith('why choose'))
  const whyGroups = whyChoose ? parseWhy(sortById(whyChoose.contents)) : null
  const testimonials = ordered.find((s) => {
    const n = s.sectionName.trim().toLowerCase()
    return n.startsWith('testm') || n.startsWith('testi')
  })

  const known = new Set([hero, about, service, whyChoose, testimonials].filter(Boolean))
  const extras = ordered.filter((s) => {
    const n = s.sectionName.trim().toLowerCase()
    if (n === 'footer') return false
    return !known.has(s)
  })

  let revealIndex = 0

  return (
    <>
      <main className="scroll-smooth overflow-x-hidden">
        {hero && <HeroSection section={hero} />}
        {about && <AboutSection section={about} />}
        {service && <ServicePreviewSection section={service} />}
        {whyGroups && <WellnessPromiseSection groups={whyGroups} />}
        {whyGroups && <PackagesSection groups={whyGroups} />}
        {whyChoose && <WhyUsSection section={whyChoose} groups={whyGroups} />}

        {extras.map((s) => (
          <GenericSection key={s.id} section={s} index={revealIndex++} />
        ))}

        {testimonials && <TestimonialsSection section={testimonials} />}
      </main>

      <Footer />
    </>
  )
}

export default Home