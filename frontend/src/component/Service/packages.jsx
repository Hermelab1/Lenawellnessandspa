import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { webApi } from '../Api/apilist'

const PACKAGES_PAGE_ID = 4
const API_ORIGIN = (process.env.REACT_APP_API_URL || 'http://localhost:3001/api').replace(
  /\/api\/?$/,
  ''
)

/* ---------- Helpers ---------- */
const sortById = (list = []) => list.filter((i) => !i.isDeleted).sort((a, b) => a.id - b.id)
const clean = (s = '') => s.replace(/\s+/g, ' ').trim()
const lines = (text = '') =>
  text
    .split('\n')
    .map((l) => clean(l))
    .filter(Boolean)

const getImages = (value) =>
  (value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((src) => (/^(https?:)?\/\//.test(src) ? src : `${API_ORIGIN}/${src.replace(/^\//, '')}`))

const isBullet = (l) => /^[•\-*]/.test(l)
const stripBullet = (l) => clean(l.replace(/^[•\-*]\s*/, ''))
// "1500 ETB", "ETB 1,500", "$40", "2,000 Birr / month"
const isPrice = (l) =>
  /(\d[\d,.]*\s*(birr|etb|br|usd|\$))|((\$|etb|birr|br)\s*\d)/i.test(l) && l.length < 40

/**
 * One content item = one package card.
 *   first line          -> package name
 *   "- item" / "• item" -> features
 *   line with a price   -> price (e.g. "1500 ETB / month")
 *   any other line      -> description
 */
const parsePackage = (item) => {
  const ls = lines(item.content)
  const pkg = { id: item.id, title: ls[0] || '', description: [], features: [], price: '', image: getImages(item.contentImages)[0] }
  ls.slice(1).forEach((l) => {
    if (isBullet(l)) pkg.features.push(stripBullet(l))
    else if (isPrice(l)) pkg.price = l
    else pkg.description.push(l)
  })
  return pkg
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
// Hero: 1st content = headline, 2nd content = list of programs (one per line) shown as chips
const HeroSection = ({ section }) => {
  const contents = sortById(section.contents)
  const [headline, programs] = contents
  const chips = programs ? lines(programs.content) : []

  return (
    <section className="relative overflow-hidden bg-[#0B2545] text-white">
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#A3E635]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-[#13315c] blur-3xl" />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 py-20 text-center sm:py-28">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[#A3E635]">
          Our Packages
        </span>

        {headline && (
          <h1 className="mt-4 max-w-4xl font-serif text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            {clean(headline.content)}
          </h1>
        )}

        <div className="mt-6 h-1 w-20 rounded-full bg-[#A3E635]" />

        {chips.length > 0 && (
          <ul className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {chips.map((c) => (
              <li
                key={c}
                className="rounded-full border border-[#A3E635]/60 bg-[#A3E635]/10 px-6 py-2.5 text-sm font-semibold tracking-wide text-[#A3E635]"
              >
                {c}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

const PackageCard = ({ pkg, featured }) => (
  <article
    className={`relative flex flex-col overflow-hidden rounded-3xl border p-8 transition duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#0B2545]/15 ${
      featured
        ? 'border-[#A3E635] bg-[#0B2545] text-white'
        : 'border-[#0B2545]/10 bg-white text-[#0B2545]'
    }`}
  >
    {featured && (
      <span className="absolute right-5 top-5 rounded-full bg-[#A3E635] px-3 py-1 text-[0.65rem] font-bold uppercase tracking-widest text-[#0B2545]">
        Popular
      </span>
    )}

    {pkg.image && (
      <img src={pkg.image} alt={pkg.title} loading="lazy" className="-mx-8 -mt-8 mb-6 h-44 w-[calc(100%+4rem)] max-w-none object-cover" />
    )}

    <h3 className={`font-serif text-2xl font-bold ${featured ? 'text-[#A3E635]' : 'text-[#0B2545]'}`}>
      {pkg.title}
    </h3>

    {pkg.price && (
      <p className="mt-4 text-3xl font-extrabold tracking-tight">{pkg.price}</p>
    )}

    {pkg.description.map((d, i) => (
      <p key={i} className={`mt-3 leading-relaxed ${featured ? 'text-white/80' : 'text-[#0B2545]/70'}`}>
        {d}
      </p>
    ))}

    {pkg.features.length > 0 && (
      <ul className={`mt-6 space-y-3 border-t pt-6 ${featured ? 'border-white/15' : 'border-[#0B2545]/10'}`}>
        {pkg.features.map((f) => (
          <li key={f} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#A3E635] text-[#0B2545]">
              <Check />
            </span>
            <span className="leading-snug">{f}</span>
          </li>
        ))}
      </ul>
    )}

    <Link
      to="/contact"
      className={`mt-8 block rounded-xl px-6 py-3 text-center text-sm font-bold transition duration-200 hover:-translate-y-0.5 ${
        featured
          ? 'bg-[#A3E635] text-[#0B2545] hover:bg-[#D9F99D]'
          : 'bg-[#0B2545] text-[#A3E635] hover:bg-[#13315c]'
      }`}
    >
      Get This Package
    </Link>
  </article>
)

// "Pakack List" (typo in the admin is handled: any section name containing "pack")
const PackageListSection = ({ section }) => {
  const packages = sortById(section.contents)
    .map(parsePackage)
    .filter((p) => p.title)

  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-6">
        <SectionTitle eyebrow="Choose Your Plan" title="Packages Made For You" />

        {packages.length > 0 ? (
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {packages.map((pkg, i) => (
              // the middle card of a group of 3 is highlighted
              <PackageCard key={pkg.id} pkg={pkg} featured={packages.length === 3 && i === 1} />
            ))}
          </div>
        ) : (
          <div className="mx-auto mt-12 max-w-2xl rounded-3xl border border-dashed border-[#0B2545]/20 bg-[#0B2545]/[0.03] p-10 text-center">
            <h3 className="font-serif text-2xl font-bold text-[#0B2545]">Packages coming soon</h3>
            <p className="mt-3 leading-relaxed text-[#0B2545]/70">
              We are putting the finishing touches on our packages. Contact us and we will help you
              pick the right one.
            </p>
            <Link
              to="/contact"
              className="mt-6 inline-block rounded-full bg-[#A3E635] px-8 py-3 text-sm font-bold text-[#0B2545] transition duration-200 hover:-translate-y-0.5 hover:bg-[#D9F99D]"
            >
              Contact Us
            </Link>
          </div>
        )}
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
          {contents.flatMap((c) => lines(c.content)).map((p, i) => (
            <p key={i} className="text-lg leading-relaxed text-[#0B2545]/80">
              {p}
            </p>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------- Page ---------- */
const Packages = () => {
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        // GET /sections/page/4 -> { success, data: [ { sectionName, contents: [...] } ] }
        const res = await webApi.getSectionsByPage(PACKAGES_PAGE_ID)
        if (!cancelled) setSections(res?.success ? sortById(res.data) : [])
      } catch (err) {
        console.error('Packages: failed to load sections', err)
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
        if (name.includes('pack') || name.includes('pakack'))
          return <PackageListSection key={section.id} section={section} />
        if (name === 'footer') return null
        return <GenericSection key={section.id} section={section} />
      })}
    </main>
  )
}

export default Packages