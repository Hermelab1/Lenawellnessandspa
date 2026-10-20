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
const sortById = (list = []) => list.filter((i) => !i.isDeleted).sort((a, b) => a.id - b.id)

const getImages = (value) =>
  (value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((src) => (/^(https?:)?\/\//.test(src) ? src : `${API_ORIGIN}/${src.replace(/^\//, '')}`))

const splitTitle = (text = '') => {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  return { title: lines[0] || '', body: lines.slice(1).join(' ') }
}

const toParagraphs = (text = '') =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

const parseCommitments = (text = '') => {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const bullets = lines
    .filter((l) => /^[•\-*]/.test(l))
    .map((l) => l.replace(/^[•\-*]\s*/, '').trim())
  const lead = lines.find((l) => !/^[•\-*]/.test(l)) || ''
  return { lead, bullets }
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
  <span className={`text-xs font-bold uppercase tracking-[0.3em] ${dark ? 'text-[#A3E635]' : 'text-[#4d7c0f]'}`}>
    {children}
  </span>
)

const SectionTitle = ({ eyebrow, title, center = true }) => (
  <div className={center ? 'text-center' : ''}>
    {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
    <h2 className="mt-3 font-serif text-3xl font-bold text-[#0B2545] sm:text-4xl">{title}</h2>
    <div className={`mt-4 h-1 w-16 rounded-full bg-[#A3E635] ${center ? 'mx-auto' : ''}`} />
  </div>
)

const Check = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
)

/* ---------- Sections ---------- */
const HeroSection = ({ section }) => {
  const contents = sortById(section.contents)
  return (
    <section className="relative overflow-hidden bg-[#0B2545] text-white">
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#A3E635]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-[#13315c] blur-3xl" />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 py-20 text-center sm:py-28">
        <Reveal>
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[#A3E635]">
            About Us
          </span>
        </Reveal>
        {contents.map((item, i) => (
          <Reveal key={item.id} delay={100 + i * 100}>
            <h1 className="mt-4 max-w-4xl font-serif text-4xl font-bold capitalize leading-tight sm:text-5xl lg:text-6xl">
              {item.content.trim()}
            </h1>
          </Reveal>
        ))}
        <Reveal delay={300}>
          <div className="mt-6 h-1 w-20 rounded-full bg-[#A3E635]" />
        </Reveal>
      </div>
    </section>
  )
}

const AboutSection = ({ section }) => {
  const contents = sortById(section.contents)
  const images = contents.flatMap((c) => getImages(c.contentImages))
  const paragraphs = contents.flatMap((c) => toParagraphs(c.content))

  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-2 lg:gap-16">
        {/* Image Grid */}
        <Reveal className="relative">
          <div className="absolute -bottom-4 -left-4 hidden h-full w-full rounded-3xl border-2 border-[#A3E635] sm:block" />
          <img
            src={images[0] || aboutImage}
            alt="About Lena Wellness & Spa"
            loading="lazy"
            className="relative z-10 h-80 w-full rounded-3xl object-cover shadow-xl sm:h-[28rem]"
          />
          {images.length > 1 && (
            <img
              src={images[1]}
              alt="Lena Spa Interior"
              loading="lazy"
              className="absolute -bottom-8 -right-8 z-20 hidden h-56 w-56 rounded-2xl border-4 border-white object-cover shadow-2xl lg:block"
            />
          )}
        </Reveal>

        {/* Text Content */}
        <div className="text-center lg:text-left">
          <Reveal delay={100}>
            <Eyebrow>Who We Are</Eyebrow>
            <h2 className="mt-3 font-serif text-3xl font-bold text-[#0B2545] sm:text-4xl">
              Lena Wellness &amp; Spa
            </h2>
            <div className="mt-4 h-1 w-16 rounded-full bg-[#A3E635] mx-auto lg:mx-0" />
          </Reveal>

          <div className="mt-8 space-y-5">
            {paragraphs.map((p, i) => (
              <Reveal key={i} delay={150 + i * 100}>
                <p className="text-lg leading-relaxed text-[#0B2545]/80">
                  {p}
                </p>
              </Reveal>
            ))}
          </div>

          <Reveal delay={500}>
            <Link
              to="/contact"
              className="mt-8 inline-block rounded-full bg-[#0B2545] px-8 py-3 text-sm font-bold text-[#A3E635] transition duration-200 hover:-translate-y-0.5 hover:bg-[#13315c]"
            >
              Get In Touch
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

const MissionsSection = ({ section }) => {
  const contents = sortById(section.contents)
  const commitments = contents.find((c) => /^[•\-*]/m.test(c.content))
  const cards = contents.filter((c) => c !== commitments)
  const { lead, bullets } = commitments ? parseCommitments(commitments.content) : { lead: '', bullets: [] }

  return (
    <section className="bg-[#0B2545]/[0.04] py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <SectionTitle eyebrow="Purpose" title="Our Vision & Mission" />
        </Reveal>

        {/* Vision & Mission in one line (grid) */}
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {cards.map((item, i) => {
            const { title, body } = splitTitle(item.content)
            return (
              <Reveal key={item.id} delay={i * 150}>
                <div className="h-full rounded-3xl border border-[#0B2545]/10 bg-white p-8 shadow-lg shadow-[#0B2545]/5 transition duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#A3E635]/25 font-serif text-xl font-bold text-[#0B2545]">
                    {i + 1}
                  </div>
                  <h3 className="mt-5 font-serif text-2xl font-bold text-[#0B2545]">{title}</h3>
                  <p className="mt-3 leading-relaxed text-[#0B2545]/75">{body}</p>
                </div>
              </Reveal>
            )
          })}
        </div>

        {/* Commitments */}
        {bullets.length > 0 && (
          <Reveal delay={300}>
            <div className="mt-8 rounded-3xl bg-[#0B2545] p-8 text-white shadow-xl sm:p-12">
              {lead && <h3 className="font-serif text-2xl font-bold text-[#A3E635]">{lead.replace(/:$/, '')}</h3>}
              <ul className="mt-8 grid gap-6 sm:grid-cols-2">
                {bullets.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-white/90">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#A3E635] text-[#0B2545]">
                      <Check />
                    </span>
                    <span className="text-lg leading-relaxed">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  )
}

const CoreValueSection = ({ section }) => {
  const contents = sortById(section.contents)
  const images = contents.flatMap((c) => getImages(c.contentImages))
  const mainImg = images[0] || aboutImage // fallback

  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          
          {/* Left: Image */}
          <Reveal className="relative h-full min-h-[400px]">
            <div className="absolute -bottom-4 -left-4 hidden h-full w-full rounded-3xl border-2 border-[#A3E635] sm:block" />
            <img
              src={mainImg}
              alt="Our Core Values"
              className="relative z-10 h-full w-full rounded-3xl object-cover shadow-xl"
            />
          </Reveal>

          {/* Right: Content */}
          <div>
            <Reveal>
              <Eyebrow>What Guides Us</Eyebrow>
              <h2 className="mt-3 font-serif text-3xl font-bold text-[#0B2545] sm:text-4xl">
                {section.sectionName}
              </h2>
              <div className="mt-4 h-1 w-16 rounded-full bg-[#A3E635]" />
            </Reveal>

            <ul className="mt-8 space-y-6">
              {contents.map((item, i) => {
                const { title, body } = splitTitle(item.content)
                return (
                  <Reveal key={item.id} delay={i * 100}>
                    <li className="flex gap-4">
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0B2545] text-[#A3E635]">
                        <Check />
                      </span>
                      <div>
                        <h3 className="font-serif text-xl font-bold text-[#0B2545]">{title}</h3>
                        <p className="mt-1 leading-relaxed text-[#0B2545]/70">{body}</p>
                      </div>
                    </li>
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

/* ---------- TEAM SECTION (4 Cards, Auto-swiping Carousel) ---------- */
const TeamSection = ({ section }) => {
  const contents = sortById(section.contents)
  const [index, setIndex] = useState(0)
  const [perView, setPerView] = useState(4)
  const [paused, setPaused] = useState(false)
  const dragStart = useRef(null)
  const [dragging, setDragging] = useState(false)

  // Responsive perView (1 on mobile, 2 on tablet, 4 on desktop)
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

  // Reset index if screen resizes
  useEffect(() => {
    setIndex((i) => Math.min(i, maxIndex))
  }, [maxIndex])

  // Auto-swipe logic (pauses on hover or drag)
  useEffect(() => {
    if (paused || dragging || maxIndex === 0) return undefined
    const timer = setInterval(() => {
      setIndex((i) => (i >= maxIndex ? 0 : i + 1))
    }, 4000) // 4 seconds
    return () => clearInterval(timer)
  }, [paused, dragging, maxIndex])

  if (!contents.length) return null

  const goTo = (i) => setIndex(clamp(i))
  const prev = () => goTo(index - 1)
  const next = () => goTo(index >= maxIndex ? 0 : index + 1)

  // Drag / Swipe handlers
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
      className="bg-[#0B2545]/[0.04] py-20 sm:py-24 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <SectionTitle eyebrow="The People" title={section.sectionName} />
        </Reveal>

        <Reveal delay={120}>
          <div className="relative mt-12">
            <div
              className="overflow-hidden -mx-2 px-2"
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
                {contents.map((item, i) => {
                  const { title, body } = splitTitle(item.content)
                  const [photo] = getImages(item.contentImages)
                  // Sample fallback image if none provided
                  const displayPhoto = photo || `https://i.pravatar.cc/600?img=${(i % 20) + 10}`

                  return (
                    <div
                      key={item.id}
                      className="shrink-0 px-2 sm:px-3"
                      style={{ width: `${100 / perView}%` }}
                    >
                      <div className="group relative overflow-hidden rounded-sm shadow-md transition-shadow duration-300 hover:shadow-2xl">
                        {/* Image container (grayscale, hover full color) */}
                        <div className="aspect-[4/5] w-full overflow-hidden bg-gray-200">
                          <img
                            src={displayPhoto}
                            alt={title}
                            loading="lazy"
                            className="h-full w-full object-cover object-top grayscale transition-all duration-500 group-hover:scale-105 group-hover:grayscale-0"
                          />
                        </div>

                        {/* Lemon/Lime Background Overlay for Name */}
                        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[#A3E635]/95 to-[#A3E635]/80 p-5 text-center text-white backdrop-blur-sm transition-transform duration-300">
                          <h3 className="font-serif text-xl font-bold capitalize text-[#0B2545]">{title}</h3>
                          {body && <p className="mt-1 text-sm font-medium text-[#0B2545]/80">{body}</p>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Navigation Arrows */}
            {contents.length > perView && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Previous team members"
                  className="absolute -left-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#0B2545]/15 bg-white text-[#0B2545] shadow-md transition hover:border-[#A3E635] hover:text-[#4d7c0f] sm:flex lg:-left-6"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Next team members"
                  className="absolute -right-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#0B2545]/15 bg-white text-[#0B2545] shadow-md transition hover:border-[#A3E635] hover:text-[#4d7c0f] sm:flex lg:-right-6"
                >
                  ›
                </button>
              </>
            )}

            {/* Dots */}
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

// Any other section added later from the admin
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
          {contents.flatMap((c) => toParagraphs(c.content)).map((p, i) => (
            <Reveal key={i} delay={i * 100}>
              <p className="text-lg leading-relaxed text-[#0B2545]/80">
                {p}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

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
    <>
      <main className="bg-white overflow-x-hidden">
        {sections.map((section) => {
          const name = section.sectionName.trim().toLowerCase()
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
            case 'our team':
              return <TeamSection key={section.id} section={section} />
            default:
              return <GenericSection key={section.id} section={section} />
          }
        })}
      </main>
      
      <Footer />
    </>
  )
}

export default AboutUs