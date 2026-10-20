import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { webApi } from '../Api/apilist'
import Footer from '../Footer/footer'

const TIPS_PAGE_ID = 6

/* ---------- Helpers ---------- */
const sortById = (list = []) => list.filter((i) => !i.isDeleted).sort((a, b) => a.id - b.id)
const clean = (s = '') => s.replace(/\s+/g, ' ').trim()
const toLines = (text = '') =>
  text
    .split('\n')
    .map((l) => clean(l))
    .filter(Boolean)

const parseTips = (contents) => {
  const tips = []
  let cur = null
  contents.forEach((c) => {
    toLines(c.content).forEach((line) => {
      if (/[.!?]$/.test(line) && cur) {
        cur.body = clean(`${cur.body} ${line}`)
      } else {
        cur = { id: c.id, title: line, body: '' }
        tips.push(cur)
      }
    })
  })
  return tips.filter((t) => t.title && t.body)
}

/* ---------- Icons ---------- */
const iconBase = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

const icons = {
  water: (
    <svg {...iconBase}>
      <path d="M12 3s6 6.2 6 10.5A6 6 0 0 1 6 13.5C6 9.2 12 3 12 3z" />
      <path d="M9.5 14a2.5 2.5 0 0 0 2.5 2.5" />
    </svg>
  ),
  food: (
    <svg {...iconBase}>
      <path d="M12 7c-2-2-6-1.5-6.5 3-.5 4.5 2 9 4.5 9 1 0 1.5-.5 2-.5s1 .5 2 .5c2.5 0 5-4.5 4.5-9C18 5.5 14 5 12 7z" />
      <path d="M12 7c0-2 1-3.5 3-4" />
    </svg>
  ),
  activity: (
    <svg {...iconBase}>
      <path d="M3 12h4l2.5-6 4 12L16 12h5" />
    </svg>
  ),
  sleep: (
    <svg {...iconBase}>
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
    </svg>
  ),
  mindfulness: (
    <svg {...iconBase}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4" />
    </svg>
  ),
  heart: (
    <svg {...iconBase}>
      <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.6 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" />
    </svg>
  ),
  sun: (
    <svg {...iconBase}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ),
  check: (
    <svg {...iconBase}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
    </svg>
  ),
}

export const pickIcon = (title = '') => {
  const t = title.toLowerCase()
  if (/(water|hydrat|drink)/.test(t)) return icons.water
  if (/(diet|food|eat|nutrition|meal|fruit|vegetable)/.test(t)) return icons.food
  if (/(activity|exercise|move|walk|fitness|physical|run|train)/.test(t)) return icons.activity
  if (/(sleep|rest|bed|nap)/.test(t)) return icons.sleep
  if (/(mind|meditat|breath|stress|calm|relax)/.test(t)) return icons.mindfulness
  if (/(sun|light|outdoor|morning)/.test(t)) return icons.sun
  if (/(check|screen|routine|habit)/.test(t)) return icons.check
  return icons.heart
}

/* ---------- Reveal ---------- */
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
        visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
      } ${className}`}
    >
      {children}
    </Tag>
  )
}

/* ---------- Shared ---------- */
const SectionTitle = ({ eyebrow, title, center = true, dark = false }) => (
  <div className={center ? 'text-center' : ''}>
    {eyebrow && (
      <span
        className={`inline-block text-xs font-bold uppercase tracking-[0.3em] ${
          dark ? 'text-[#A3E635]' : 'text-[#4d7c0f]'
        }`}
      >
        {eyebrow}
      </span>
    )}
    <h2
      className={`mt-3 font-serif text-3xl font-bold sm:text-4xl ${
        dark ? 'text-white' : 'text-[#0B2545]'
      }`}
    >
      {title}
    </h2>
    <div className={`mt-4 h-1 w-16 rounded-full bg-[#A3E635] ${center ? 'mx-auto' : ''}`} />
  </div>
)

/* =====================================================
   HERO
===================================================== */
const HeroSection = ({ section }) => {
  const contents = sortById(section.contents)
  const title = contents[0] ? clean(contents[0].content) : 'Health Tips'
  const subtitle =
    contents[1] ? clean(contents[1].content) : 'Small, mindful habits. Big, lasting change.'

  return (
    <section className="relative overflow-hidden bg-[#0B2545] text-white">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#A3E635]/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-[#13315c]/70 blur-3xl" />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #A3E635 1px, transparent 1px), linear-gradient(to bottom, #A3E635 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-6 py-24 text-center sm:py-32">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#A3E635]/40 bg-[#A3E635]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-[#A3E635]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#A3E635]" />
            Health Tips
          </span>
        </Reveal>

        <Reveal delay={150}>
          <h1 className="mt-6 max-w-4xl font-serif text-4xl font-bold leading-tight drop-shadow-[0_2px_12px_rgba(11,37,69,0.7)] sm:text-5xl lg:text-6xl">
            {title}
          </h1>
        </Reveal>

        <Reveal delay={300}>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/80">{subtitle}</p>
        </Reveal>

        <Reveal delay={450}>
          <div className="mt-8 h-1 w-20 rounded-full bg-[#A3E635]" />
        </Reveal>
      </div>
    </section>
  )
}

/* =====================================================
   TIP CARD — link to /healthtips/:id
===================================================== */
const TipCard = ({ tip, index, featured = false }) => (
  <Link
    to={`/healthtips/${tip.id}`}
    state={{ tip }}
    aria-label={`Read more about ${tip.title}`}
    className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border border-[#0B2545]/10 bg-white outline-none transition duration-300 hover:-translate-y-1 hover:border-[#A3E635] hover:shadow-2xl hover:shadow-[#0B2545]/10 focus-visible:ring-2 focus-visible:ring-[#A3E635] focus-visible:ring-offset-2 ${
      featured ? 'p-8 sm:p-10' : 'p-7'
    }`}
  >
    <span className="absolute inset-x-0 top-0 h-1 scale-x-0 bg-gradient-to-r from-[#A3E635] via-[#A3E635]/70 to-transparent transition-transform duration-500 group-hover:scale-x-100" />

    <span
      aria-hidden="true"
      className={`pointer-events-none absolute right-5 font-serif font-bold text-[#0B2545]/[0.045] ${
        featured ? '-top-4 text-8xl' : '-top-2 text-7xl'
      }`}
    >
      {String(index + 1).padStart(2, '0')}
    </span>

    <div
      className={`flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0B2545] to-[#13315c] text-[#A3E635] shadow-lg shadow-[#0B2545]/20 transition group-hover:from-[#A3E635] group-hover:to-[#84cc16] group-hover:text-[#0B2545] ${
        featured ? 'h-16 w-16' : 'h-14 w-14'
      }`}
    >
      <div className={featured ? 'h-8 w-8' : 'h-7 w-7'}>{pickIcon(tip.title)}</div>
    </div>

    <div className="mt-5 flex-1">
      <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#4d7c0f]">
        Tip {String(index + 1).padStart(2, '0')}
      </p>
      <h3
        className={`mt-2 font-serif font-bold leading-snug text-[#0B2545] ${
          featured ? 'text-2xl sm:text-3xl' : 'text-xl'
        }`}
      >
        {tip.title}
      </h3>
      <p
        className={`mt-3 leading-relaxed text-[#0B2545]/70 ${
          featured ? 'text-base' : 'text-[15px]'
        }`}
      >
        {tip.body}
      </p>
    </div>

    <div className="mt-6 flex items-center gap-2 text-sm font-bold text-[#4d7c0f]">
      <span>Read more</span>
      <span aria-hidden="true" className="transition group-hover:translate-x-1">
        →
      </span>
    </div>
  </Link>
)

const TipsSection = ({ section }) => {
  const tips = parseTips(sortById(section.contents))
  const [featured, ...rest] = tips

  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <SectionTitle eyebrow="Live Well" title="Simple Habits For A Healthier You" />
        </Reveal>

        {tips.length > 0 ? (
          <div className="mt-14 space-y-6">
            {featured && (
              <Reveal>
                <div className="grid gap-6 lg:grid-cols-2">
                  <TipCard tip={featured} index={0} featured />
                  {rest.length === 0 && (
                    <div className="hidden rounded-3xl bg-gradient-to-br from-[#0B2545] to-[#13315c] p-8 text-white lg:flex lg:flex-col lg:justify-center lg:p-10">
                      <h3 className="font-serif text-2xl font-bold text-[#A3E635]">
                        Start with one habit today
                      </h3>
                      <p className="mt-3 leading-relaxed text-white/80">
                        Consistency beats intensity. Choose a single tip and practice it for a week
                        before adding another. Small wins compound.
                      </p>
                    </div>
                  )}
                </div>
              </Reveal>
            )}

            {rest.length > 0 && (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((tip, i) => (
                  <Reveal key={`${tip.id}-${i}`} delay={i * 80}>
                    <TipCard tip={tip} index={i + (featured ? 1 : 0)} />
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-14 rounded-3xl border border-dashed border-[#0B2545]/20 bg-[#0B2545]/[0.02] p-14 text-center">
            <p className="text-[#0B2545]/60">Health tips are coming soon.</p>
          </div>
        )}
      </div>
    </section>
  )
}

/* ---------- Generic ---------- */
const GenericSection = ({ section }) => {
  const contents = sortById(section.contents)
  if (!contents.length) return null
  return (
    <section className="bg-[#0B2545]/[0.03] py-20">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <Reveal>
          <SectionTitle title={section.sectionName} />
        </Reveal>
        <div className="mt-8 space-y-5">
          {contents.flatMap((c) => toLines(c.content)).map((p, i) => (
            <Reveal key={i} delay={i * 60}>
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
const Tips = () => {
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await webApi.getSectionsByPage(TIPS_PAGE_ID)
        if (!cancelled) setSections(res?.success ? sortById(res.data) : [])
      } catch (err) {
        console.error('Tips: failed to load sections', err)
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
      <div className="flex min-h-[60vh] items-center justify-center bg-white px-6 text-center">
        <div className="max-w-md">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0B2545] text-[#A3E635]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
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
    <>
      <main className="overflow-x-hidden bg-white">
        {sections.map((section) => {
          const name = section.sectionName.trim().toLowerCase()
          if (name === 'hero') return <HeroSection key={section.id} section={section} />
          if (name === 'tips' || name === 'tip' || name === 'health tips')
            return <TipsSection key={section.id} section={section} />
          if (name === 'footer') return null
          return <GenericSection key={section.id} section={section} />
        })}
      </main>
      <Footer />
    </>
  )
}

export default Tips