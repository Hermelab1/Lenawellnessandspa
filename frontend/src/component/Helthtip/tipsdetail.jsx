import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { webApi } from '../Api/apilist'
import Footer from '../Footer/footer'
import { pickIcon } from './healthtips'

const TIPS_PAGE_ID = 6

/* ---------- Helpers (mirror Tips.js so parsing stays consistent) ---------- */
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

/* =====================================================
   PAGE
===================================================== */
const TipDetail = () => {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // If we navigated with `state={{ tip }}` we can render instantly,
  // otherwise we'll fetch from the API and match by id.
  const [tip, setTip] = useState(location.state?.tip || null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await webApi.getSectionsByPage(TIPS_PAGE_ID)
        if (cancelled) return
        const data = res?.success ? sortById(res.data) : []
        setSections(data)

        if (!tip) {
          const allTips = data.flatMap((s) => parseTips(sortById(s.contents)))
          const found = allTips.find((t) => String(t.id) === String(id))
          if (found) setTip(found)
        }
      } catch (err) {
        console.error('TipDetail: failed to load', err)
        if (!cancelled) setError('We could not load this tip right now. Please try again later.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Scroll to top when opening a different tip
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [id])

  // Related tips = same set minus this one, capped to 3
  const related = useMemo(() => {
    const allTips = sections.flatMap((s) => parseTips(sortById(s.contents)))
    return allTips.filter((t) => String(t.id) !== String(id)).slice(0, 3)
  }, [sections, id])

  if (loading && !tip) {
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
          <p className="text-[#0B2545]/70">{error}</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-6 rounded-full bg-[#0B2545] px-6 py-2.5 text-sm font-bold text-[#A3E635] transition hover:bg-[#13315c]"
          >
            Go back
          </button>
        </div>
      </div>
    )
  }

  if (!tip) {
    return (
      <>
        <main className="flex min-h-[70vh] items-center justify-center bg-white px-6">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0B2545] text-[#A3E635]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </div>
            <h1 className="mt-5 font-serif text-2xl font-bold text-[#0B2545]">Tip not found</h1>
            <p className="mt-2 text-[#0B2545]/60">
              This tip may have been removed, or the link is incorrect.
            </p>
            <Link
              to="/healthtips"
              className="mt-6 inline-block rounded-full bg-[#0B2545] px-6 py-2.5 text-sm font-bold text-[#A3E635] transition hover:bg-[#13315c]"
            >
              Back to all tips
            </Link>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <main className="overflow-x-hidden bg-white">
        {/* HERO */}
        <section className="relative overflow-hidden bg-[#0B2545] text-white">
          <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#A3E635]/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-[#13315c]/70 blur-3xl" />

          <div className="relative mx-auto max-w-4xl px-6 py-20 sm:py-24">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-[#A3E635] transition hover:bg-white/[0.12]"
            >
              <span aria-hidden="true">←</span>
              Back to tips
            </button>

            <div className="mt-8 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#A3E635] to-[#84cc16] text-[#0B2545] shadow-lg shadow-[#0B2545]/30">
                <div className="h-8 w-8">{pickIcon(tip.title)}</div>
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#A3E635]">
                Health Tip
              </span>
            </div>

            <h1 className="mt-6 max-w-3xl font-serif text-4xl font-bold leading-tight drop-shadow-[0_2px_12px_rgba(11,37,69,0.7)] sm:text-5xl">
              {tip.title}
            </h1>

            <div className="mt-6 h-1 w-20 rounded-full bg-[#A3E635]" />
          </div>
        </section>

        {/* BODY */}
        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-6">
            <article>
              <p className="text-xl leading-relaxed text-[#0B2545]/85">{tip.body}</p>
            </article>

            <div className="mt-12 rounded-3xl border border-[#0B2545]/10 bg-[#0B2545]/[0.03] p-6 sm:p-8">
              <h2 className="font-serif text-xl font-bold text-[#0B2545]">Make it a habit</h2>
              <p className="mt-2 leading-relaxed text-[#0B2545]/70">
                Try applying this tip for the next 7 days. Track how you feel and adjust as needed.
                Wellness is built on consistency, not perfection.
              </p>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                to="/contact"
                className="rounded-full bg-[#A3E635] px-8 py-3 text-sm font-bold text-[#0B2545] transition duration-200 hover:-translate-y-0.5 hover:bg-[#D9F99D]"
              >
                Book An Appointment
              </Link>
              <Link
                to="/healthtips"
                className="rounded-full border border-[#0B2545]/15 px-8 py-3 text-sm font-semibold text-[#0B2545] transition duration-200 hover:border-[#A3E635] hover:text-[#4d7c0f]"
              >
                See all tips
              </Link>
            </div>
          </div>
        </section>

        {/* RELATED */}
        {related.length > 0 && (
          <section className="bg-[#0B2545]/[0.03] py-16 sm:py-20">
            <div className="mx-auto max-w-6xl px-6">
              <div className="text-center">
                <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#4d7c0f]">
                  Keep reading
                </span>
                <h2 className="mt-3 font-serif text-3xl font-bold text-[#0B2545]">
                  More health tips
                </h2>
                <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-[#A3E635]" />
              </div>

              <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((r) => (
                  <Link
                    key={r.id}
                    to={`/healthtips/${r.id}`}
                    state={{ tip: r }}
                    className="group flex h-full flex-col rounded-3xl border border-[#0B2545]/10 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-[#A3E635] hover:shadow-2xl hover:shadow-[#0B2545]/10"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0B2545] text-[#A3E635] transition group-hover:bg-[#A3E635] group-hover:text-[#0B2545]">
                      <div className="h-6 w-6">{pickIcon(r.title)}</div>
                    </div>
                    <h3 className="mt-5 font-serif text-lg font-bold leading-snug text-[#0B2545]">
                      {r.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#0B2545]/70">
                      {r.body}
                    </p>
                    <div className="mt-5 flex items-center gap-2 text-sm font-bold text-[#4d7c0f]">
                      Read more
                      <span aria-hidden="true" className="transition group-hover:translate-x-1">
                        →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  )
}

export default TipDetail