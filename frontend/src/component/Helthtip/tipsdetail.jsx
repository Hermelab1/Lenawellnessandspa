import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { webApi } from '../Api/apilist'
import Footer from '../Footer/footer'
import { pickIcon, parseTips, sortById, TIPS_PAGE_ID } from './healthtips'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/* ---------- Small UI pieces ---------- */
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

const ArrowLeft = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>
)

const ChevronRight = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-3 w-3 shrink-0"
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

const Check = ({ className = 'h-3.5 w-3.5' }) => (
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

const LinkIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M10 13a5 5 0 0 0 7.1 0l3-3a5 5 0 0 0-7.1-7.1l-1.7 1.7" />
    <path d="M14 11a5 5 0 0 0-7.1 0l-3 3a5 5 0 0 0 7.1 7.1l1.7-1.7" />
  </svg>
)

const Spinner = () => (
  <div
    className="flex min-h-[60vh] flex-col items-center justify-center gap-5 bg-white"
    role="status"
    aria-live="polite"
  >
    <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-[#0B2545]/10 border-t-[#A3E635]" />
    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#0B2545]/40">Loading</p>
  </div>
)

/* ---------- 7-day habit tracker (local, per visit) ---------- */
const HabitTracker = () => {
  const [done, setDone] = useState(() => DAYS.map(() => false))
  const count = done.filter(Boolean).length

  const toggle = (i) => setDone((d) => d.map((v, idx) => (idx === i ? !v : v)))

  return (
    <div className="rounded-3xl border border-[#0B2545]/10 bg-gradient-to-br from-[#0B2545]/[0.03] to-white p-6 shadow-lg shadow-[#0B2545]/5 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#4d7c0f]">
            7-Day Challenge
          </p>
          <h2 className="mt-1 font-serif text-xl font-bold text-[#0B2545] sm:text-2xl">
            Make it a habit
          </h2>
        </div>
        <p className="text-sm font-semibold text-[#0B2545]/60">
          <span className="text-[#4d7c0f]">{count}</span> / 7 days
        </p>
      </div>

      <p className="mt-3 leading-relaxed text-[#0B2545]/70">
        Try applying this tip for the next 7 days. Tap each day as you complete it. Wellness is
        built on consistency, not perfection.
      </p>

      <div
        className="mt-5 h-2 w-full overflow-hidden rounded-full bg-[#0B2545]/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={7}
        aria-valuenow={count}
        aria-label="Habit progress"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#A3E635] to-[#4d7c0f] transition-all duration-500"
          style={{ width: `${(count / 7) * 100}%` }}
        />
      </div>

      <div className="mt-6 grid grid-cols-7 gap-2 sm:gap-3">
        {DAYS.map((d, i) => (
          <button
            key={d}
            type="button"
            onClick={() => toggle(i)}
            aria-pressed={done[i]}
            aria-label={`${d}: ${done[i] ? 'completed' : 'not completed'}`}
            className={`flex flex-col items-center gap-2 rounded-2xl border px-1 py-3 text-[11px] font-bold uppercase tracking-wider outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-[#A3E635] focus-visible:ring-offset-2 ${
              done[i]
                ? 'border-[#A3E635] bg-[#A3E635]/20 text-[#0B2545]'
                : 'border-[#0B2545]/10 bg-white text-[#0B2545]/50 hover:border-[#A3E635]/60'
            }`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300 ${
                done[i] ? 'bg-[#A3E635] text-[#0B2545]' : 'bg-[#0B2545]/[0.06] text-transparent'
              }`}
            >
              <Check />
            </span>
            {d}
          </button>
        ))}
      </div>

      {count === 7 && (
        <p className="mt-5 rounded-2xl bg-[#0B2545] px-4 py-3 text-center text-sm font-semibold text-[#A3E635]">
          Well done — you completed the full week!
        </p>
      )}
    </div>
  )
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
  const [copied, setCopied] = useState(false)

  // If we navigated with `state={{ tip }}` we render instantly,
  // otherwise we fetch from the API and match by id.
  const [tip, setTip] = useState(location.state?.tip || null)

  // Keep the displayed tip in sync when navigating between tips
  useEffect(() => {
    const incoming = location.state?.tip
    if (incoming && String(incoming.id) === String(id)) setTip(incoming)
  }, [location.state, id])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await webApi.getSectionsByPage(TIPS_PAGE_ID)
        if (cancelled) return
        const data = res?.success ? sortById(res.data) : []
        setSections(data)

        const allTips = data.flatMap((s) => parseTips(sortById(s.contents)))
        const found = allTips.find((t) => String(t.id) === String(id))
        if (found) setTip(found)
        else setTip((cur) => (cur && String(cur.id) === String(id) ? cur : null))
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
  }, [id])

  // Scroll to top when opening a different tip
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [id])

  const allTips = useMemo(
    () => sections.flatMap((s) => parseTips(sortById(s.contents))),
    [sections]
  )

  const currentIndex = allTips.findIndex((t) => String(t.id) === String(id))
  const prevTip = currentIndex > 0 ? allTips[currentIndex - 1] : null
  const nextTip =
    currentIndex >= 0 && currentIndex < allTips.length - 1 ? allTips[currentIndex + 1] : null

  // Related tips = the rest of the set, capped at 3
  const related = useMemo(
    () => allTips.filter((t) => String(t.id) !== String(id)).slice(0, 3),
    [allTips, id]
  )

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  if (loading && !tip) return <Spinner />

  if (error && !tip) {
    return (
      <div
        className="flex min-h-[60vh] items-center justify-center bg-white px-6 text-center"
        role="alert"
      >
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
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-7 w-7"
                aria-hidden="true"
              >
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
        {/* HERO (compact) */}
        <section className="relative isolate overflow-hidden bg-[#0B2545] text-white">
          <div className="pointer-events-none absolute -left-32 -top-32 -z-10 h-80 w-80 rounded-full bg-[#A3E635]/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-40 -right-24 -z-10 h-96 w-96 rounded-full bg-[#13315c]/70 blur-3xl" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06]"
            style={{
              backgroundImage:
                'linear-gradient(to right, #A3E635 1px, transparent 1px), linear-gradient(to bottom, #A3E635 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />

          <div className="relative mx-auto max-w-4xl px-6 py-12 sm:py-14">
            <nav aria-label="Breadcrumb">
              <ol className="inline-flex flex-wrap items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70 backdrop-blur-md">
                <li>
                  <Link to="/" className="transition-colors hover:text-[#A3E635]">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true" className="text-[#A3E635]">
                  <ChevronRight />
                </li>
                <li>
                  <Link to="/healthtips" className="transition-colors hover:text-[#A3E635]">
                    Health Tips
                  </Link>
                </li>
                <li aria-hidden="true" className="text-[#A3E635]">
                  <ChevronRight />
                </li>
                <li aria-current="page" className="text-[#A3E635]">
                  {currentIndex >= 0 ? `Tip ${String(currentIndex + 1).padStart(2, '0')}` : 'Tip'}
                </li>
              </ol>
            </nav>

            <div className="mt-6 flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#A3E635] to-[#84cc16] text-[#0B2545] shadow-lg shadow-[#0B2545]/30">
                <div className="h-7 w-7">{pickIcon(tip.title)}</div>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#A3E635]">
                Health Tip
              </span>
            </div>

            <h1 className="mt-5 max-w-3xl font-serif text-2xl font-bold leading-[1.2] tracking-tight drop-shadow-lg sm:text-3xl lg:text-4xl">
              {tip.title}
            </h1>

            <div className="mt-5 h-[3px] w-16 rounded-full bg-gradient-to-r from-[#A3E635] to-[#4d7c0f]" />
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#A3E635]/50 to-transparent" />
        </section>

        {/* BODY */}
        <section className="bg-white py-14 sm:py-20">
          <div className="mx-auto max-w-3xl px-6">
            <article className="relative rounded-3xl border border-[#0B2545]/10 bg-white p-7 shadow-xl shadow-[#0B2545]/5 sm:p-10">
              <span className="absolute left-0 top-8 h-12 w-1 rounded-r-full bg-gradient-to-b from-[#A3E635] to-[#4d7c0f]" />
              <p className="text-lg leading-[1.9] text-[#0B2545]/85 sm:text-xl">{tip.body}</p>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#0B2545]/10 pt-6">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="group inline-flex items-center gap-2 text-sm font-bold text-[#0B2545]/70 transition hover:text-[#4d7c0f]"
                >
                  <ArrowLeft />
                  Back
                </button>

                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex items-center gap-2 rounded-full border border-[#0B2545]/15 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#0B2545] transition hover:border-[#A3E635] hover:text-[#4d7c0f]"
                >
                  <LinkIcon />
                  <span aria-live="polite">{copied ? 'Link copied' : 'Copy link'}</span>
                </button>
              </div>
            </article>

            <div className="mt-10">
              <HabitTracker key={id} />
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                to="/contact"
                className="group inline-flex items-center gap-2 rounded-full bg-[#A3E635] px-8 py-3.5 text-sm font-bold text-[#0B2545] shadow-lg shadow-[#A3E635]/30 transition duration-200 hover:-translate-y-0.5 hover:bg-[#b6f04f] hover:shadow-xl"
              >
                Book An Appointment
                <ArrowRight />
              </Link>
              <Link
                to="/healthtips"
                className="rounded-full border border-[#0B2545]/15 px-8 py-3.5 text-sm font-semibold text-[#0B2545] transition duration-200 hover:border-[#A3E635] hover:text-[#4d7c0f]"
              >
                See all tips
              </Link>
            </div>

            {(prevTip || nextTip) && (
              <nav
                aria-label="Tip navigation"
                className="mt-14 grid gap-4 border-t border-[#0B2545]/10 pt-8 sm:grid-cols-2"
              >
                {prevTip ? (
                  <Link
                    to={`/healthtips/${prevTip.id}`}
                    state={{ tip: prevTip }}
                    className="group rounded-2xl border border-[#0B2545]/10 p-5 transition duration-300 hover:-translate-y-0.5 hover:border-[#A3E635] hover:shadow-lg"
                  >
                    <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#4d7c0f]">
                      <ArrowLeft />
                      Previous
                    </span>
                    <span className="mt-2 block font-serif text-lg font-bold leading-snug text-[#0B2545]">
                      {prevTip.title}
                    </span>
                  </Link>
                ) : (
                  <span className="hidden sm:block" />
                )}

                {nextTip && (
                  <Link
                    to={`/healthtips/${nextTip.id}`}
                    state={{ tip: nextTip }}
                    className="group rounded-2xl border border-[#0B2545]/10 p-5 text-left transition duration-300 hover:-translate-y-0.5 hover:border-[#A3E635] hover:shadow-lg sm:text-right"
                  >
                    <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#4d7c0f] sm:justify-end">
                      Next
                      <ArrowRight />
                    </span>
                    <span className="mt-2 block font-serif text-lg font-bold leading-snug text-[#0B2545]">
                      {nextTip.title}
                    </span>
                  </Link>
                )}
              </nav>
            )}
          </div>
        </section>

        {/* RELATED */}
        {related.length > 0 && (
          <section className="bg-[#0B2545]/[0.035] py-16 sm:py-20">
            <div className="mx-auto max-w-6xl px-6">
              <div className="text-center">
                <span className="inline-flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.32em] text-[#4d7c0f]">
                  <span className="h-px w-8 bg-[#4d7c0f]/40" />
                  Keep reading
                  <span className="h-px w-8 bg-[#4d7c0f]/40" />
                </span>
                <h2 className="mt-4 font-serif text-3xl font-bold text-[#0B2545] sm:text-4xl">
                  More health tips
                </h2>
                <div className="mx-auto mt-5 h-[3px] w-14 rounded-full bg-gradient-to-r from-[#A3E635] to-[#4d7c0f]" />
              </div>

              <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((r) => (
                  <Link
                    key={r.id}
                    to={`/healthtips/${r.id}`}
                    state={{ tip: r }}
                    className="group flex h-full flex-col rounded-3xl border border-[#0B2545]/10 bg-white p-7 shadow-lg shadow-[#0B2545]/5 transition duration-300 hover:-translate-y-1.5 hover:border-[#A3E635] hover:shadow-2xl hover:shadow-[#0B2545]/10"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0B2545] text-[#A3E635] transition group-hover:bg-[#A3E635] group-hover:text-[#0B2545]">
                      <div className="h-6 w-6">{pickIcon(r.title)}</div>
                    </div>
                    <h3 className="mt-5 font-serif text-lg font-bold leading-snug text-[#0B2545]">
                      {r.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-[#0B2545]/70">
                      {r.body}
                    </p>
                    <div className="mt-5 flex items-center gap-2 text-sm font-bold text-[#4d7c0f]">
                      Read more
                      <ArrowRight />
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