import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { webApi } from '../Api/apilist'
import aboutImage from '../../asset/img/Herosection/herosection.jpg'
import Footer from '../Footer/footer'

const HOME_PAGE_ID = 1

const LINKS = {
  contact: '/contact',
  beautysalon: '/ourservice/beauty-salon',
  about: '/aboutus',
  services: '/ourservice/spa',
  packages: '/ourservice/gym#packages',
  gym: '/ourservice/gym',
}

/* Local images are only a fallback when the API provides none */
const heroContext = require.context('../../asset/img/Homepage', false, /\.(png|jpe?g|webp|avif)$/i)
const localHeroImages = heroContext
  .keys()
  .sort()
  .map((key) => {
    const mod = heroContext(key)
    return mod.default || mod
  })

const SLIDE_INTERVAL = 6000
const TESTIMONIAL_INTERVAL = 6000

/* ---------- Section ordering ---------- */
const SECTION_ORDER = {
  hero: 0,
  about: 1,
  'our service': 2,
  'our services': 2,
  'why choose': 5,
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
const API_ORIGIN = (process.env.REACT_APP_API_URL || 'http://localhost:3001/api').replace(/\/api\/?$/, '')

const resolveSrc = (src) => {
  const s = (src || '').trim()
  if (!s) return ''
  if (/^(data:|blob:|https?:)/i.test(s) || s.startsWith('//')) return s
  return `${API_ORIGIN}/${s.replace(/^\//, '')}`
}

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

const serviceLink = (title = '') => {
  if (/gym|fitness/i.test(title)) return LINKS.gym
  if (/beauty|salon/i.test(title)) return LINKS.beautysalon
  return LINKS.services
}

/* ---------- Reveal-on-scroll wrapper ---------- */
const Reveal = ({ children, className = '', delay = 0, as: Tag = 'div' }) => {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return undefined
    if (typeof IntersectionObserver === 'undefined') {
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
      { threshold: 0.1, rootMargin: '0px 0px -6% 0px' }
    )
    io.observe(node)
    return () => io.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transform-gpu transition-all duration-700 ease-out motion-reduce:transition-none ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100'
      } ${className}`}
    >
      {children}
    </Tag>
  )
}

/* ---------- Shared bits ---------- */
const Eyebrow = ({ children, dark, className = '' }) => (
  <span
    className={`inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.28em] ${
      dark ? 'text-[#A3E635]' : 'text-[#3f6212]'
    } ${className}`}
  >
    <span className={`hidden h-px w-8 sm:block ${dark ? 'bg-[#A3E635]/70' : 'bg-[#3f6212]/50'}`} />
    {children}
  </span>
)

const SectionTitle = ({
  eyebrow,
  title,
  subtitle,
  dark,
  align = 'center',
  subtitleClass = 'text-base sm:text-lg',
}) => (
  <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'text-center lg:text-left'}>
    {eyebrow && <Eyebrow dark={dark}>{eyebrow}</Eyebrow>}
    <h2
      className={`mt-4 font-serif text-3xl font-bold leading-tight sm:text-4xl lg:text-[2.6rem] ${
        dark ? 'text-white' : 'text-[#0B2545]'
      }`}
    >
      {title}
    </h2>
    {subtitle && (
      <p className={`mt-4 leading-relaxed ${subtitleClass} ${dark ? 'text-white/75' : 'text-[#0B2545]/70'}`}>
        {subtitle}
      </p>
    )}
  </div>
)

const Arrow = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

const Check = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
)

const btnPrimary =
  'group inline-flex items-center justify-center gap-2 rounded-full bg-[#A3E635] px-8 py-3.5 text-sm font-bold text-[#0B2545] shadow-lg shadow-[#A3E635]/20 transition duration-200 hover:-translate-y-0.5 hover:bg-[#bef264] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A3E635] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B2545]'
const btnDark =
  'group inline-flex items-center justify-center gap-2 rounded-full bg-[#0B2545] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#0B2545]/20 transition duration-200 hover:-translate-y-0.5 hover:bg-[#13315c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2545] focus-visible:ring-offset-2'
const btnGhost =
  'inline-flex items-center justify-center rounded-full border border-white/40 bg-white/5 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur transition duration-200 hover:border-[#A3E635] hover:bg-white/10 hover:text-[#A3E635] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A3E635]'

const ContentBlock = ({ item, className = '' }) => {
  const images = getImages(item.contentImages)
  return (
    <>
      {item.content?.trim() && <p className={`whitespace-pre-line ${className}`}>{item.content.trim()}</p>}
      {images.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {images.map((src, i) => (
            <img key={i} src={src} alt="" loading="lazy" className="h-64 w-full rounded-2xl object-cover shadow-lg" />
          ))}
        </div>
      )}
    </>
  )
}

/* ---------- HERO ---------- */
const HERO_QUICK = [
  { label: 'Gym & Fitness', to: LINKS.gym },
  { label: 'Spa & Wellness', to: LINKS.services },
  { label: 'Beauty Salon', to: LINKS.beautysalon },
]

const HeroSection = ({ section }) => {
  const contents = sortById(section.contents)
  const banner = contents.find((c) => c.contentType === 'banner')
  const texts = contents.filter((c) => c !== banner)
  const [headline, ...bodyItems] = texts
  const bodyLines = bodyItems.flatMap((c) => toLines(c.content))

  const apiImages = banner ? getImages(banner.contentImages) : []
  const slides = apiImages.length ? apiImages : localHeroImages
  const total = slides.length

  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)

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
      className="relative isolate overflow-hidden bg-[#0B2545] text-white"
    >
      {slides.map((src, i) => (
        <img
          key={i}
          src={src}
          alt=""
          aria-hidden="true"
          loading={i === 0 ? 'eager' : 'lazy'}
          className={`absolute inset-0 -z-10 h-full w-full object-cover ${i === current ? 'opacity-100' : 'opacity-0'}`}
          style={{
            transform: i === current ? 'scale(1.08)' : 'scale(1)',
            transition: 'opacity 1400ms ease, transform 9000ms ease-out',
          }}
        />
      ))}

      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0B2545]/90 via-[#0B2545]/60 to-[#0B2545]/25" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0B2545] via-transparent to-[#0B2545]/40" />
      {total === 0 && (
        <>
          <div className="pointer-events-none absolute -left-24 -top-24 -z-10 h-80 w-80 rounded-full bg-[#A3E635]/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -right-20 -z-10 h-96 w-96 rounded-full bg-[#13315c] blur-3xl" />
        </>
      )}

      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 pb-40 pt-28 sm:pb-44 lg:min-h-[85vh]">
        <div className="max-w-2xl text-center lg:text-left">
          {banner?.content && (
            <Eyebrow dark className="justify-center lg:justify-start">
              {banner.content}
            </Eyebrow>
          )}

          {headline && (
            <h1 className="mt-5 font-serif text-2xl font-bold leading-[1.15] sm:text-3xl lg:text-4xl pb-2">
              {headline.content}
            </h1>
          )}

          {bodyLines.length > 0 && (
            <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-white/85 sm:text-sm lg:mx-0 pb-2">
              {bodyLines.join(' ')}
            </p>
          )}

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
            <Link to={LINKS.packages} className={btnPrimary}>
              Be Our Member
              <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link to={LINKS.contact} className={btnGhost}>
              Contact Us
            </Link>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10">
        <div className="mx-auto max-w-6xl px-6 pb-6">
          <div className="hidden grid-cols-3 overflow-hidden rounded-2xl border border-white/15 bg-[#0B2545]/55 backdrop-blur-md sm:grid">
            {HERO_QUICK.map((q, i) => (
              <Link
                key={q.label}
                to={q.to}
                className={`group flex items-center justify-between px-6 py-5 text-sm font-semibold tracking-wide transition hover:bg-[#A3E635] hover:text-[#0B2545] ${
                  i > 0 ? 'border-l border-white/15' : ''
                }`}
              >
                {q.label}
                <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>

          {total > 1 && (
            <div className="mt-5 flex justify-center gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={i === current}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === current ? 'w-10 bg-[#A3E635]' : 'w-5 bg-white/40 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}



const AboutSection = ({ section }) => {
  const contents = sortById(section.contents)
  const images = contents.flatMap((item) => getImages(item.contentImages))
  const mainImage = images[0] || aboutImage
  const sideImages = images.slice(1, 3)
  const lines = contents.flatMap((item) => toLines(item.content))
  const [lead, ...rest] = lines

  return (
    <section id="about" className="relative isolate overflow-hidden bg-[#F7F8FA] py-20 sm:py-28">
      <div className="pointer-events-none absolute -right-32 -top-32 -z-10 h-[28rem] w-[28rem] rounded-full bg-[#A3E635]/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-32 -z-10 h-[26rem] w-[26rem] rounded-full bg-[#0B2545]/5 blur-3xl" />

      <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 lg:grid-cols-2 lg:gap-20">
        <Reveal>
          <img
            src={mainImage}
            alt="Lena Spa & Wellness"
            loading="lazy"
            className="h-80 w-full rounded-3xl object-cover shadow-2xl shadow-[#0B2545]/15 sm:h-[30rem]"
          />
          {sideImages.length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-5">
              {sideImages.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  loading="lazy"
                  className="h-36 w-full rounded-2xl object-cover shadow-lg shadow-[#0B2545]/10 sm:h-44"
                />
              ))}
            </div>
          )}
        </Reveal>

        <Reveal delay={120} className="text-center lg:text-left">
          <Eyebrow className="justify-center lg:justify-start">{section.sectionName}</Eyebrow>
          <h2 className="mt-4 font-serif text-3xl font-bold leading-tight text-[#0B2545] sm:text-4xl lg:text-[2.6rem]">
            Lena Spa &amp; Wellness
          </h2>
          <span className="mx-auto mt-5 block h-1 w-14 rounded-full bg-[#A3E635] lg:mx-0" />

          {lead && <p className="mt-6 font-medium leading-relaxed text-[#0B2545]">{lead}</p>}

          <div className="mt-5 space-y-4">
            {rest.map((line, i) => (
              <p key={i} className="leading-relaxed text-[#0B2545]/70">
                {line}
              </p>
            ))}
          </div>

          <Link to={LINKS.about} className={`${btnDark} mt-9`}>
            Learn More
            <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------- OUR SERVICES ---------- */
const ServiceCard = ({ card, index }) => {
  const [first, second] = card.images
  return (
    <Reveal delay={index * 100} className="h-full">
      <Link
        to={card.to}
        className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-md shadow-[#0B2545]/5 ring-1 ring-[#0B2545]/10 transition duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-[#0B2545]/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2545]"
      >
        <div className="relative h-64 overflow-hidden bg-[#0B2545]">
          {first ? (
            <>
              <img
                src={first}
                alt={card.title}
                loading="lazy"
                className={`absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105 ${
                  second ? 'group-hover:opacity-0' : ''
                }`}
              />
              {second && (
                <img
                  src={second}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full scale-105 object-cover opacity-0 transition duration-700 group-hover:scale-100 group-hover:opacity-100"
                />
              )}
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#0B2545] to-[#13315c]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B2545]/70 via-transparent to-transparent" />
          <span className="absolute left-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-[#A3E635] font-serif text-sm font-bold text-[#0B2545]">
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>

        <div className="flex flex-1 flex-col p-7">
          <h3 className="font-serif text-2xl font-bold text-[#0B2545]">{card.title}</h3>
          <p className="mt-3 flex-1 leading-relaxed text-[#0B2545]/70">{card.body}</p>
          <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#0B2545]">
            Explore
            <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-1.5" />
          </span>
        </div>
      </Link>
    </Reveal>
  )
}

const ServicePreviewSection = ({ section }) => {
  const contents = sortById(section.contents)
  const cards = contents
    .map((c) => {
      const [title, ...body] = toLines(c.content)
      return { id: c.id, title, body: body.join(' '), images: getImages(c.contentImages), to: serviceLink(title) }
    })
    .filter((c) => c.title)

  return (
    <section id="our-service" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <SectionTitle
            eyebrow="What We Offer"
            title={section.sectionName}
            subtitle="Three ways to look better, feel better and live healthier — all under one roof."
            subtitleClass="text-sm"
          />
        </Reveal>

        {cards.length > 0 ? (
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {cards.map((card, i) => (
              <ServiceCard key={card.id} card={card} index={i} />
            ))}
          </div>
        ) : (
          <p className="mt-10 text-center text-[#0B2545]/50">Details coming soon.</p>
        )}
      </div>
    </section>
  )
}

/* ---------- WHY US ---------- */
const WhyUsSection = ({ section, groups }) => {
  const reasons = toPairs(groups.reasons).pairs
  if (!reasons.length) return null

  const images = sortById(section.contents).flatMap((item) => getImages(item.contentImages))
  const whyImages = [images[0] || aboutImage, images[1] || null].filter(Boolean)

  return (
    <section id="why-us" className="relative isolate overflow-hidden bg-[#F7F8FA] py-20 sm:py-28">
      <div className="pointer-events-none absolute -right-32 -top-32 -z-10 h-[28rem] w-[28rem] rounded-full bg-[#A3E635]/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-32 -z-10 h-[26rem] w-[26rem] rounded-full bg-[#0B2545]/5 blur-3xl" />
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid items-start gap-14 lg:grid-cols-5 lg:gap-16">
          <Reveal className="lg:col-span-2 lg:sticky lg:top-28">
            <Eyebrow className="justify-center lg:justify-start">Why Us</Eyebrow>
            <h2 className="mt-4 text-center font-serif text-3xl font-bold leading-tight text-[#0B2545] sm:text-4xl lg:text-left lg:text-[2.6rem]">
              {section.sectionName?.trim() || 'Why Choose Lena'}
            </h2>

            <div className="relative mt-8 hidden lg:block">
              <img
                src={whyImages[0]}
                alt=""
                loading="lazy"
                className="h-[30rem] w-full rounded-[2rem] object-cover shadow-xl shadow-[#0B2545]/15 xl:h-[36rem]"
              />
              {whyImages[1] && (
                <img
                  src={whyImages[1]}
                  alt=""
                  loading="lazy"
                  className="absolute -bottom-8 -right-6 h-36 w-44 rounded-2xl border-4 border-white object-cover shadow-xl"
                />
              )}
            </div>
          </Reveal>

          <ul className="grid gap-5 sm:grid-cols-2 lg:col-span-3">
            {reasons.map((r, i) => (
              <Reveal as="li" key={r.title} delay={i * 80} className={i === reasons.length - 1 && reasons.length % 2 ? 'sm:col-span-2' : ''}>
                <div className="h-full rounded-3xl border border-[#0B2545]/10 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-[#A3E635] hover:shadow-xl hover:shadow-[#0B2545]/10">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0B2545] text-[#A3E635]">
                    <Check />
                  </span>
                  <h3 className="mt-5 font-serif text-xl font-bold text-[#0B2545]">{r.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#0B2545]/70">{r.body}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

/* ---------- OUR WELLNESS PROMISE ---------- */
const WellnessPromiseSection = ({ groups, bgImage }) => {
  if (!groups.promise.length) return null
  const [promiseTag, ...promiseText] = groups.promise

  return (
    <section id="wellness-promise" className="relative isolate overflow-hidden bg-[#0B2545] py-24 text-white sm:py-32">
      {bgImage && (
        <img src={bgImage} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-25" />
      )}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0B2545] via-[#0B2545]/85 to-[#0B2545]" />
      <div className="pointer-events-none absolute -left-24 -top-24 -z-10 h-80 w-80 rounded-full bg-[#A3E635]/15 blur-3xl" />

      <Reveal className="mx-auto max-w-5xl px-6 text-center">
        <Eyebrow dark>Our Wellness Promise</Eyebrow>
        <h2 className="mt-5 font-serif text-3xl font-bold leading-tight text-[#A3E635] sm:text-5xl">{promiseTag}</h2>
        <div className="mt-8 space-y-5">
          {promiseText.map((p, i) => (
            <p key={i} className="text-sm leading-relaxed text-white/85 lg:whitespace-nowrap">
              {p}
            </p>
          ))}
        </div>
        <Link to={LINKS.beautysalon} className={`${btnPrimary} mt-10`}>
          Book Your Place To Beauty
          <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </Reveal>
    </section>
  )
}

/* =====================================================
   GIFT VOUCHER POPUP
   - Amount is auto-set by the selected service/voucher type
   - Payment method shows Ethiopian provider logos
===================================================== */

/* Service -> price (ETB). Adjust these numbers to match your real pricing. */
const VOUCHER_SERVICES = [
  { id: 'spa', label: 'Spa & Wellness', price: 2500 },
  { id: 'gym', label: 'Gym & Fitness', price: 3000 },
  { id: 'beauty', label: 'Beauty Salon', price: 1500 },
  { id: 'any', label: 'Any service (recipient chooses)', price: 2000 },
]

/* Payment methods + logos.
   Replace the `logo` strings with your own asset paths, e.g.
   require('../../asset/img/payments/telebirr.png')  or a public URL. */
const PAYMENT_METHODS = [
  {
    id: 'Cash',
    label: 'Cash',
    hint: 'Pay at our front desk',
    logo: null, // no logo for cash
  },
  {
    id: 'Mobile Money',
    label: 'Mobile Money',
    hint: 'Telebirr, CBE Birr, M-PESA, Amole',
    providers: [
      { id: 'telebirr', label: 'Telebirr', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/8f/Telebirr_logo.png/240px-Telebirr_logo.png' },
      { id: 'cbebirr', label: 'CBE Birr', logo: 'https://play-lh.googleusercontent.com/8bC7rY8z9y1F0vWnK4lV0jL9n9g5y3k0c0z0h9f8e7d6c5b4a3' },
      { id: 'mpesa', label: 'M-PESA', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/M-PESA_logo.svg/240px-M-PESA_logo.svg.png' },
      { id: 'amole', label: 'Amole', logo: 'https://play-lh.googleusercontent.com/AmoleLogoPlaceholder' },
    ],
  },
  {
    id: 'Bank Transfer',
    label: 'Bank Transfer',
    hint: 'CBE, Awash, Dashen, Abyssinia',
    providers: [
      { id: 'cbe', label: 'Commercial Bank of Ethiopia', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/1/1a/CBE_logo.png/240px-CBE_logo.png' },
      { id: 'awash', label: 'Awash Bank', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/7/7a/Awash_Bank_logo.png/240px-Awash_Bank_logo.png' },
      { id: 'dashen', label: 'Dashen Bank', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/4a/Dashen_Bank_logo.png/240px-Dashen_Bank_logo.png' },
      { id: 'abyssinia', label: 'Bank of Abyssinia', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/2/2a/Bank_of_Abyssinia_logo.png/240px-Bank_of_Abyssinia_logo.png' },
    ],
  },
]

const emptyVoucherForm = {
  fullName: '',
  phone: '',
  email: '',
  recipientName: '',
  voucherType: '', // stores service id
  delivery: 'pickup',
  recipientEmail: '',
  paymentMethod: '', // stores payment method id
  paymentProvider: '', // stores selected provider id (telebirr, cbe, etc.)
  message: '',
  agree: false,
}

const submitGiftVoucher = async (payload) => {
  try {
    const res = await webApi.createGiftVoucherRequest(payload)
    return res?.success
      ? { ok: true }
      : { ok: false, message: res?.message || 'Could not send your request.' }
  } catch (err) {
    return {
      ok: false,
      message: err?.response?.data?.message || 'Could not send your request. Please try again.',
    }
  }
}

const GiftVoucherModal = ({ lead, details, tagline, onClose }) => {
  const [form, setForm] = useState(emptyVoucherForm)
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

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
    setForm((f) => {
      const next = { ...f, [name]: type === 'checkbox' ? checked : value }
      // reset provider when payment method changes
      if (name === 'paymentMethod') next.paymentProvider = ''
      return next
    })
  }

  /* Auto-derived amount from the selected service */
  const selectedService = VOUCHER_SERVICES.find((s) => s.id === form.voucherType)
  const finalAmount = selectedService ? selectedService.price : 0
  const amountLabel = finalAmount > 0 ? `${finalAmount.toLocaleString()} ETB` : '—'

  /* Selected payment method object for rendering logos */
  const selectedPayment = PAYMENT_METHODS.find((p) => p.id === form.paymentMethod)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedService) {
      setError('Please choose a service for the voucher.')
      return
    }
    if (selectedPayment?.providers && !form.paymentProvider) {
      setError('Please choose your payment provider.')
      return
    }
    setSending(true)
    setError('')
    const result = await submitGiftVoucher({
      fullName: form.fullName,
      phone: form.phone,
      email: form.email,
      recipientName: form.recipientName,
      voucherType: selectedService.label,
      amount: finalAmount,
      delivery: form.delivery,
      recipientEmail: form.delivery === 'email' ? form.recipientEmail : '',
      paymentMethod: form.paymentMethod,
      paymentProvider: form.paymentProvider || form.paymentMethod,
      message: form.message,
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
      aria-label="Gift voucher request"
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

        {/* Gift voucher summary */}
        <div className="relative flex flex-col bg-gradient-to-br from-[#13315c] to-[#0B2545] p-8 md:col-span-2">
          <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-[#A3E635]/10 blur-3xl" />
          <div className="relative">
            <Eyebrow dark>Gift Voucher</Eyebrow>
            <h3 className="mt-3 font-serif text-2xl font-bold text-[#A3E635]">{lead || 'Give the gift of wellness'}</h3>
            <div className="mt-2 text-3xl font-bold">{amountLabel}</div>
            <div className="my-5 h-0.5 w-12 rounded-full bg-[#A3E635]" />

            {details.length > 0 && (
              <ul className="space-y-3">
                {details.map((d, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-white/85">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#A3E635] text-[#0B2545]">
                      <Check />
                    </span>
                    {d}
                  </li>
                ))}
              </ul>
            )}

            <dl className="mt-6 space-y-2 rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-white/60">For</dt>
                <dd className="text-right font-semibold">{form.recipientName.trim() || '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-white/60">Voucher</dt>
                <dd className="text-right font-semibold">{selectedService?.label || '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-white/60">Delivery</dt>
                <dd className="text-right font-semibold">{form.delivery === 'email' ? 'By email' : 'Pick up at Lena'}</dd>
              </div>
              {form.paymentMethod && (
                <div className="flex justify-between gap-4">
                  <dt className="text-white/60">Payment</dt>
                  <dd className="text-right font-semibold">
                    {form.paymentProvider
                      ? selectedPayment?.providers?.find((p) => p.id === form.paymentProvider)?.label || form.paymentProvider
                      : form.paymentMethod}
                  </dd>
                </div>
              )}
            </dl>

            {tagline && <p className="mt-6 font-serif text-lg font-bold italic text-[#A3E635]">{tagline}</p>}
          </div>
        </div>

        {/* Gift voucher form */}
        <div className="p-8 md:col-span-3">
          {submitted ? (
            <div className="flex h-full min-h-[20rem] flex-col items-center justify-center text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#A3E635] text-[#0B2545]">
                <Check />
              </span>
              <h4 className="mt-5 font-serif text-2xl font-bold">Thank you!</h4>
              <p className="mt-2 text-white/75">
                Your gift voucher request for{' '}
                <span className="font-semibold text-[#A3E635]">{form.recipientName.trim()}</span> has been received.
                We'll contact you shortly to confirm payment and arrange your voucher.
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
              <h4 className="font-serif text-2xl font-bold">Get a Gift Voucher</h4>
              <p className="mt-1 text-sm text-white/70">Complete the details below and we'll take care of the rest.</p>

              {error && (
                <div className="mt-4 rounded-xl border border-red-400/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className={label} htmlFor="gv-fullName">Your full name *</label>
                  <input id="gv-fullName" type="text" name="fullName" required value={form.fullName} onChange={handleChange} className={inputBase} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={label} htmlFor="gv-phone">Phone *</label>
                    <input id="gv-phone" type="tel" name="phone" required value={form.phone} onChange={handleChange} className={inputBase} />
                  </div>
                  <div>
                    <label className={label} htmlFor="gv-email">Email</label>
                    <input id="gv-email" type="email" name="email" value={form.email} onChange={handleChange} className={inputBase} />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={label} htmlFor="gv-recipientName">Recipient's name *</label>
                    <input id="gv-recipientName" type="text" name="recipientName" required value={form.recipientName} onChange={handleChange} className={inputBase} />
                  </div>
                  <div>
                    <label className={label} htmlFor="gv-voucherType">Voucher for *</label>
                    <select id="gv-voucherType" name="voucherType" required value={form.voucherType} onChange={handleChange} className={`${inputBase} appearance-none`}>
                      <option value="" className={opt}>Select a service</option>
                      {VOUCHER_SERVICES.map((s) => (
                        <option key={s.id} value={s.id} className={opt}>
                          {s.label} — {s.price.toLocaleString()} ETB
                        </option>
                      ))}
                    </select>
                    {selectedService && (
                      <p className="mt-2 text-xs text-[#A3E635]">
                        Amount set automatically: {finalAmount.toLocaleString()} ETB
                      </p>
                    )}
                  </div>
                </div>

                {/* Delivery */}
                <div>
                  <span className={label}>Delivery *</span>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { id: 'pickup', title: 'Pick up at Lena', hint: 'Printed voucher at our front desk' },
                      { id: 'email', title: 'Send by email', hint: 'Digital voucher to the recipient' },
                    ].map((d) => (
                      <label
                        key={d.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${
                          form.delivery === d.id
                            ? 'border-[#A3E635] bg-[#A3E635]/10'
                            : 'border-white/15 bg-white/[0.06] hover:border-white/40'
                        }`}
                      >
                        <input type="radio" name="delivery" value={d.id} checked={form.delivery === d.id} onChange={handleChange} className="mt-1 h-4 w-4 accent-[#A3E635]" />
                        <span>
                          <span className="block text-sm font-semibold">{d.title}</span>
                          <span className="block text-xs text-white/60">{d.hint}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  {form.delivery === 'email' && (
                    <div className="mt-3">
                      <label className={label} htmlFor="gv-recipientEmail">Recipient's email *</label>
                      <input id="gv-recipientEmail" type="email" name="recipientEmail" required value={form.recipientEmail} onChange={handleChange} className={inputBase} />
                    </div>
                  )}
                </div>

                {/* Payment method with logos */}
                <div>
                  <label className={label} htmlFor="gv-paymentMethod">Payment method *</label>
                  <select
                    id="gv-paymentMethod"
                    name="paymentMethod"
                    required
                    value={form.paymentMethod}
                    onChange={handleChange}
                    className={`${inputBase} appearance-none`}
                  >
                    <option value="" className={opt}>Select</option>
                    {PAYMENT_METHODS.map((p) => (
                      <option key={p.id} value={p.id} className={opt}>{p.label}</option>
                    ))}
                  </select>

                  {/* Provider logos for Mobile Money / Bank Transfer */}
                  {selectedPayment?.providers && (
                    <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                      <p className="mb-2 text-xs text-white/60">
                        Choose your {selectedPayment.label} provider *
                      </p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {selectedPayment.providers.map((provider) => {
                          const active = form.paymentProvider === provider.id
                          return (
                            <button
                              key={provider.id}
                              type="button"
                              onClick={() => setForm((f) => ({ ...f, paymentProvider: provider.id }))}
                              className={`flex flex-col items-center gap-2 rounded-xl border px-2 py-3 transition ${
                                active
                                  ? 'border-[#A3E635] bg-[#A3E635]/15'
                                  : 'border-white/10 bg-white/[0.04] hover:border-white/40'
                              }`}
                              aria-pressed={active}
                            >
                              {provider.logo ? (
                                <img
                                  src={provider.logo}
                                  alt={provider.label}
                                  className="h-8 w-full max-w-[80px] object-contain"
                                  loading="lazy"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                    const fallback = e.currentTarget.nextElementSibling
                                    if (fallback) fallback.style.display = 'flex'
                                  }}
                                />
                              ) : null}
                              <span
                                className="flex h-8 w-full max-w-[80px] items-center justify-center rounded bg-white/10 text-[10px] font-bold uppercase text-white"
                                style={{ display: provider.logo ? 'none' : 'flex' }}
                              >
                                {provider.label.slice(0, 8)}
                              </span>
                              <span className="text-center text-[11px] font-semibold leading-tight">
                                {provider.label}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {selectedPayment && !selectedPayment.providers && (
                    <p className="mt-2 text-xs text-white/60">{selectedPayment.hint}</p>
                  )}
                </div>

                <textarea
                  name="message"
                  rows="2"
                  maxLength={300}
                  placeholder="Personal message for the voucher (optional)"
                  value={form.message}
                  onChange={handleChange}
                  className={inputBase}
                />

                <label className="flex items-start gap-3 text-sm text-white/75">
                  <input type="checkbox" name="agree" required checked={form.agree} onChange={handleChange} className="mt-1 h-4 w-4 accent-[#A3E635]" />
                  <span>I confirm the details above are correct.</span>
                </label>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full rounded-full bg-[#A3E635] px-8 py-3 text-sm font-bold text-[#0B2545] transition duration-200 hover:-translate-y-0.5 hover:bg-[#D9F99D] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? 'Sending…' : `Get Gift Voucher — ${amountLabel}`}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------- GIFT VOUCHER visual ---------- */
const GiftIcon = ({ className = 'h-6 w-6' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="8" width="18" height="4" rx="1" />
    <path d="M12 8v13M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" />
    <path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5" />
  </svg>
)

const GIFT_PERKS = ['Spa, Gym or Beauty Salon', 'Pick up or send by email', 'Pay by cash, mobile or bank']

const VoucherCard = ({ onGet }) => (
  <div className="relative w-full max-w-md transition duration-500 hover:rotate-0 hover:scale-[1.02] lg:rotate-3">
    <div className="absolute -inset-4 rounded-[2rem] bg-[#A3E635]/20 blur-2xl" />

    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#A3E635] via-[#bef264] to-[#D9F99D] p-8 text-[#0B2545] shadow-2xl shadow-black/30">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/30" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-[#0B2545]/10" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="font-serif text-3xl font-bold leading-none">Lena</p>
          <p className="mt-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[#0B2545]/70">Wellness &amp; Spa</p>
        </div>
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0B2545] text-[#A3E635] shadow-lg">
          <GiftIcon className="h-6 w-6" />
        </span>
      </div>

      <div className="relative mt-10">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#0B2545]/70">Gift Voucher</p>
        <p className="mt-2 font-serif text-3xl font-bold leading-tight sm:text-4xl">
          A moment of calm for someone special
        </p>

        <button type="button" onClick={onGet} className={`${btnDark} mt-6`}>
          Get A Gift Voucher
          <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>

      {/* Perforated ticket edge */}
      <div className="relative my-8">
        <div className="border-t-2 border-dashed border-[#0B2545]/30" />
        <span className="absolute -left-11 -top-3 h-6 w-6 rounded-full bg-[#0B2545]" />
        <span className="absolute -right-11 -top-3 h-6 w-6 rounded-full bg-[#0B2545]" />
      </div>

      <div className="relative flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-[#0B2545]/80">
        <span>Spa</span>
        <span className="h-1 w-1 rounded-full bg-[#0B2545]/50" />
        <span>Gym</span>
        <span className="h-1 w-1 rounded-full bg-[#0B2545]/50" />
        <span>Beauty</span>
      </div>
    </div>
  </div>
)

/* ---------- PACKAGES + GIFT VOUCHERS ---------- */
const PackagesSection = ({ groups }) => {
  const [giftOpen, setGiftOpen] = useState(false)
  const closeGift = useCallback(() => setGiftOpen(false), [])

  const [pkgIntro, ...pkgRest] = groups.packages
  const { pairs: packages, rest: pkgNotes } = toPairs(pkgRest)

  const [giftLead, ...giftRest] = groups.gift
  const giftTagline = giftRest.length > 1 ? giftRest[giftRest.length - 1] : ''
  const giftText = giftRest.length > 1 ? giftRest.slice(0, -1) : giftRest

  if (!packages.length && !groups.gift.length) return null

  return (
    <section id="packages" className="bg-white">
      {packages.length > 0 && (
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <Reveal>
            <SectionTitle eyebrow="Treat Yourself" title="Wellness Packages" subtitle={pkgIntro} />
          </Reveal>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {packages.map((p, i) => (
              <Reveal key={p.title} delay={i * 90}>
                <article
                  className={`relative flex h-full flex-col overflow-hidden rounded-3xl border p-7 transition duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-[#0B2545]/15 ${
                    i % 2 === 0
                      ? 'border-[#0B2545]/10 bg-[#F6F4EE]'
                      : 'border-[#0B2545] bg-[#0B2545]'
                  }`}
                >
                  <span className="font-serif text-5xl font-bold text-[#A3E635]">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className={`mt-4 font-serif text-xl font-bold ${i % 2 === 0 ? 'text-[#0B2545]' : 'text-white'}`}>{p.title}</h3>
                  <p className={`mt-3 text-sm leading-relaxed ${i % 2 === 0 ? 'text-[#0B2545]/70' : 'text-white/75'}`}>{p.body}</p>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal delay={150} className="mt-10 text-center">
            {pkgNotes.map((n) => (
              <p key={n} className="text-sm italic text-[#0B2545]/60">
                {n}
              </p>
            ))}
          </Reveal>
        </div>
      )}

      {groups.gift.length > 0 && (
        <div id="gift-voucher" className="bg-[#F7F8FA] px-6 py-16 sm:py-24">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[#0B2545] shadow-2xl shadow-[#0B2545]/25">
            {/* Decorative background */}
            <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#A3E635]/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-[#13315c] blur-3xl" />
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.07]"
              style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '22px 22px' }}
            />

            <div className="relative grid items-center gap-12 px-8 py-14 sm:px-14 sm:py-20 lg:grid-cols-2 lg:gap-16">
              <Reveal className="text-center lg:text-left">
                <Eyebrow dark className="justify-center lg:justify-start">
                  Gift Vouchers
                </Eyebrow>

                <h2 className="mt-5 font-serif text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-[2.6rem]">
                  {giftLead}
                </h2>
                <span className="mx-auto mt-5 block h-1 w-14 rounded-full bg-[#A3E635] lg:mx-0" />

                <div className="mt-6 space-y-3 text-sm leading-relaxed text-white/75 sm:text-base">
                  {giftText.map((t, i) => (
                    <p key={i}>{t}</p>
                  ))}
                </div>

                {giftTagline && <p className="mt-6 font-serif text-lg font-bold italic text-[#A3E635]">{giftTagline}</p>}

                <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3 lg:justify-start">
                  {GIFT_PERKS.map((perk) => (
                    <li key={perk} className="flex items-center gap-2 text-sm text-white/85">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#A3E635] text-[#0B2545]">
                        <Check />
                      </span>
                      {perk}
                    </li>
                  ))}
                </ul>
              </Reveal>

              <Reveal delay={150} className="flex justify-center lg:justify-end">
                <VoucherCard onGet={() => setGiftOpen(true)} />
              </Reveal>
            </div>
          </div>
        </div>
      )}

      {giftOpen && (
        <GiftVoucherModal lead={giftLead} details={giftText} tagline={giftTagline} onClose={closeGift} />
      )}
    </section>
  )
}

/* ---------- TESTIMONIALS ---------- */
const TestimonialsSection = ({ section }) => {
  const seen = new Set()
  const items = sortById(section.contents)
    .map((c) => ({ id: c.id, ...parseTestimonial(c.content) }))
    .filter((t) => {
      if (!t.quote || seen.has(t.quote)) return false
      seen.add(t.quote)
      return true
    })

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
    const timer = setInterval(() => setIndex((i) => (i >= maxIndex ? 0 : i + 1)), TESTIMONIAL_INTERVAL)
    return () => clearInterval(timer)
  }, [paused, dragging, maxIndex])

  if (!items.length) return null

  const goTo = (i) => setIndex(clamp(i))
  const prev = () => goTo(index <= 0 ? maxIndex : index - 1)
  const next = () => goTo(index >= maxIndex ? 0 : index + 1)

  const onPointerDown = (e) => {
    dragStart.current = e.clientX
    setDragging(true)
  }
  const onPointerMove = (e) => {
    if (dragStart.current === null) return
    const dx = e.clientX - dragStart.current
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
      className="bg-white py-20 sm:py-28"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <SectionTitle eyebrow="Testimonials" title="What Our Clients Say" />
        </Reveal>

        <Reveal delay={120}>
          <div className="relative mt-14">
            <div
              className="-mx-2 overflow-hidden px-2 pb-6 sm:-mx-3 sm:px-3"
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
                  <div key={t.id} className="shrink-0 px-2 sm:px-3" style={{ width: `${100 / perView}%` }}>
                    <figure className="relative flex h-full select-none flex-col rounded-3xl bg-white p-8 shadow-lg shadow-[#0B2545]/5 ring-1 ring-[#0B2545]/10">
                      <svg viewBox="0 0 32 32" className="h-10 w-10 text-[#A3E635]" fill="currentColor" aria-hidden="true">
                        <path d="M12 6C6.5 8 3 12.5 3 19v7h10v-9H8c0-3.3 1.7-5.6 5-7L12 6zm15 0c-5.5 2-9 6.5-9 13v7h10v-9h-5c0-3.3 1.7-5.6 5-7L27 6z" />
                      </svg>

                      <blockquote className="mt-5 flex-1 leading-relaxed text-[#0B2545]/80">{t.quote}</blockquote>

                      <div className="mt-5 flex gap-1 text-[#65a30d]" aria-label="5 out of 5 stars">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <svg key={i} viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                            <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z" />
                          </svg>
                        ))}
                      </div>

                      <figcaption className="mt-5 flex items-center gap-4 border-t border-[#0B2545]/10 pt-5">
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
                  className="absolute -left-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#0B2545]/15 bg-white text-xl text-[#0B2545] shadow-md transition hover:border-[#A3E635] hover:bg-[#A3E635] sm:flex lg:-left-6"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Next testimonials"
                  className="absolute -right-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#0B2545]/15 bg-white text-xl text-[#0B2545] shadow-md transition hover:border-[#A3E635] hover:bg-[#A3E635] sm:flex lg:-right-6"
                >
                  ›
                </button>
              </>
            )}

            {maxIndex > 0 && (
              <div className="mt-6 flex justify-center gap-2">
                {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`Go to page ${i + 1}`}
                    aria-current={i === index}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === index ? 'w-8 bg-[#0B2545]' : 'w-2 bg-[#0B2545]/20 hover:bg-[#0B2545]/40'
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
      className={`py-20 sm:py-28 ${alt ? 'bg-[#F6F4EE]' : 'bg-white'}`}
    >
      <div className="mx-auto max-w-6xl px-6 text-center">
        <Reveal>
          <SectionTitle title={section.sectionName} />
        </Reveal>

        {contents.length > 0 ? (
          <div className="mx-auto mt-10 max-w-3xl space-y-5">
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
    return diff !== 0 ? diff : a.id - b.id
  })

  const nameOf = (s) => s.sectionName.trim().toLowerCase()
  const hero = ordered.find((s) => nameOf(s) === 'hero')
  const about = ordered.find((s) => nameOf(s) === 'about')
  const service = ordered.find((s) => nameOf(s) === 'our service' || nameOf(s) === 'our services')
  const whyChoose = ordered.find((s) => nameOf(s).startsWith('why choose'))
  const whyGroups = whyChoose ? parseWhy(sortById(whyChoose.contents)) : null
  const whyImages = whyChoose ? sortById(whyChoose.contents).flatMap((c) => getImages(c.contentImages)) : []
  const testimonials = ordered.find((s) => nameOf(s).startsWith('testm') || nameOf(s).startsWith('testi'))

  const known = new Set([hero, about, service, whyChoose, testimonials].filter(Boolean))
  const extras = ordered.filter((s) => nameOf(s) !== 'footer' && !known.has(s))

  let extraIndex = 0

  return (
    <>
      <main className="overflow-x-hidden">
        {hero && <HeroSection section={hero} />}
        {about && <AboutSection section={about} />}
        {service && <ServicePreviewSection section={service} />}
        {whyChoose && whyGroups && <WhyUsSection section={whyChoose} groups={whyGroups} />}
        {whyGroups && <WellnessPromiseSection groups={whyGroups} bgImage={whyImages[2] || whyImages[1]} />}
        {whyGroups && <PackagesSection groups={whyGroups} />}

        {extras.map((s) => (
          <GenericSection key={s.id} section={s} index={extraIndex++} />
        ))}

        {testimonials && <TestimonialsSection section={testimonials} />}
      </main>

      <Footer />
    </>
  )
}

export default Home