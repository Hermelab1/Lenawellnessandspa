import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { webApi } from '../Api/apilist'
import Footer from '../Footer/footer'

const SERVICE_PAGE_ID = 3

/* ---------- Helpers ---------- */
const sortById = (list = []) => list.filter((i) => !i.isDeleted).sort((a, b) => a.id - b.id)

const clean = (s = '') => s.replace(/\s+/g, ' ').trim()
const isBullet = (l) => /^[•\-*]/.test(l)
const stripBullet = (l) => clean(l.replace(/^[•\-*]\s*/, ''))

/**
 * Parses the "service list" text block into categories.
 *
 *  Title line                    (no trailing period)  -> new category
 *  Sentence ending with "."      -> description of the current category
 *  "- item" / "• item" lines     -> items of the current category
 *
 * A sub-heading that only has items (e.g. "Relaxation Massage") is merged into the
 * category above it, and headings with nothing under them are dropped.
 */
const parseServices = (text = '') => {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const cats = []
  let cur = null

  lines.forEach((line) => {
    if (isBullet(line)) {
      if (!cur) cur = { title: '', description: '', items: [] }
      if (!cats.includes(cur)) cats.push(cur)
      cur.items.push(stripBullet(line))
    } else if (/[.!?]$/.test(line)) {
      if (!cur) {
        cur = { title: '', description: '', items: [] }
        cats.push(cur)
      }
      cur.description = clean(`${cur.description} ${line}`)
    } else {
      cur = { title: clean(line), description: '', items: [] }
      cats.push(cur)
    }
  })

  // Merge "sub-heading + items only" into the previous category that has a description but no items
  const merged = []
  cats.forEach((c) => {
    const prev = merged[merged.length - 1]
    if (prev && c.items.length && !c.description && prev.description && !prev.items.length) {
      prev.items = c.items
      prev.subtitle = c.title
    } else if (prev && c.items.length && !c.title) {
      prev.items = [...prev.items, ...c.items]
    } else {
      merged.push({ ...c })
    }
  })

  // Drop headings that have nothing under them
  return merged.filter((c) => c.title && (c.description || c.items.length))
}

/* ---------- Shared bits ---------- */
const Check = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
)

const SectionTitle = ({ eyebrow, title }) => (
  <div className="text-center">
    {eyebrow && (
      <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#4d7c0f]">{eyebrow}</span>
    )}
    <h2 className="mt-3 font-serif text-3xl font-bold text-[#0B2545] sm:text-4xl">{title}</h2>
    <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-[#A3E635]" />
  </div>
)

/* ---------- Sections ---------- */
const HeroSection = ({ section }) => {
  const contents = sortById(section.contents)
  return (
    <section className="relative overflow-hidden bg-[#0B2545] text-white">
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#A3E635]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-[#13315c] blur-3xl" />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 py-20 text-center sm:py-28">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[#A3E635]">
          Our Services
        </span>
        {contents.map((item) => (
          <h1
            key={item.id}
            className="mt-4 max-w-4xl font-serif text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl"
          >
            {item.content.trim()}
          </h1>
        ))}
        <div className="mt-6 h-1 w-20 rounded-full bg-[#A3E635]" />
      </div>
    </section>
  )
}

const ServiceCard = ({ category, index }) => (
  <article className="group flex flex-col rounded-3xl border border-[#0B2545]/10 bg-white p-8 transition duration-200 hover:-translate-y-1 hover:border-[#A3E635] hover:shadow-xl hover:shadow-[#0B2545]/10">
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0B2545] font-serif text-xl font-bold text-[#A3E635] transition group-hover:bg-[#A3E635] group-hover:text-[#0B2545]">
      {String(index + 1).padStart(2, '0')}
    </div>

    <h3 className="mt-5 font-serif text-2xl font-bold text-[#0B2545]">{category.title}</h3>
    {category.description && (
      <p className="mt-3 leading-relaxed text-[#0B2545]/70">{category.description}</p>
    )}

    {category.items.length > 0 && (
      <div className="mt-6 border-t border-[#0B2545]/10 pt-6">
        {category.subtitle && (
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#4d7c0f]">
            {category.subtitle}
          </p>
        )}
        <ul className="space-y-3">
          {category.items.map((item) => (
            <li key={item} className="flex items-start gap-3 text-[#0B2545]/85">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#A3E635] text-[#0B2545]">
                <Check />
              </span>
              <span className="leading-snug">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    )}
  </article>
)

const ServiceListSection = ({ section }) => {
  const contents = sortById(section.contents)
  const categories = contents.flatMap((c) => parseServices(c.content))

  // Categories that only have a description (no items) are shown as a note banner at the end
  const withItems = categories.filter((c) => c.items.length)
  const notes = categories.filter((c) => !c.items.length)

  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-6">
        <SectionTitle eyebrow="What We Offer" title="Treatments Made For You" />

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {withItems.map((c, i) => (
            <ServiceCard key={c.title} category={c} index={i} />
          ))}
        </div>

        {notes.map((n) => (
          <div
            key={n.title}
            className="mt-6 rounded-3xl bg-[#0B2545] p-8 text-center text-white sm:p-10"
          >
            <h3 className="font-serif text-2xl font-bold text-[#A3E635]">{n.title}</h3>
            <p className="mx-auto mt-3 max-w-2xl leading-relaxed text-white/85">{n.description}</p>
            <Link
              to="/contact"
              className="mt-6 inline-block rounded-full bg-[#A3E635] px-8 py-3 text-sm font-bold text-[#0B2545] transition duration-200 hover:-translate-y-0.5 hover:bg-[#D9F99D]"
            >
              Book An Appointment
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}

// Any other section added later from the admin
const GenericSection = ({ section }) => {
  const contents = sortById(section.contents)
  if (!contents.length) return null
  return (
    <section className="bg-[#0B2545]/[0.04] py-20">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <SectionTitle title={section.sectionName} />
        <div className="mt-8 space-y-5">
          {contents
            .flatMap((c) => c.content.split('\n').map((l) => l.trim()).filter(Boolean))
            .map((p, i) => (
              <p key={i} className="text-lg leading-relaxed text-[#0B2545]/80">
                {p}
              </p>
            ))}
        </div>
      </div>

      <Footer/>
    </section>
  )
}

/* ---------- Page ---------- */
const OurService = () => {
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        // GET /sections/page/3 -> { success, data: [ { sectionName, contents: [...] } ] }
        const res = await webApi.getSectionsByPage(SERVICE_PAGE_ID)
        if (!cancelled) setSections(res?.success ? sortById(res.data) : [])
      } catch (err) {
        console.error('OurService: failed to load sections', err)
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
    <main className="bg-white">
      {sections.map((section) => {
        const name = section.sectionName.trim().toLowerCase()
        if (name === 'hero') return <HeroSection key={section.id} section={section} />
        if (name === 'service list' || name === 'services' || name === 'service')
          return <ServiceListSection key={section.id} section={section} />
        if (name === 'footer') return null
        return <GenericSection key={section.id} section={section} />
      })}
    </main>
  )
}

export default OurService