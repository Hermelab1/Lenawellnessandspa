import React, { useEffect, useState } from 'react';

const inputBase =
  'w-full rounded-xl border border-[#0B2545]/15 bg-white px-4 py-3 text-sm text-[#0B2545] placeholder-[#0B2545]/40 outline-none transition focus:border-[#A3E635] focus:ring-2 focus:ring-[#A3E635]/30';

const Check = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4 shrink-0"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

const MembershipForm = ({ plan, onClose }) => {
  const [form, setForm] = useState({
    FirstName: '',
    LastName: '',
    MiddleName: '',
    Gender: '',
    DateOfBirth: '',
    Profession: '',
    Mobile: '',
    Email: '',
    Address: '',
    Package: plan?.title || '',
    Notes: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Sync plan whenever prop changes
  useEffect(() => {
    if (plan?.title) setForm((f) => ({ ...f, Package: plan.title }));
  }, [plan]);

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Compose payload expected by MembershipRequest model
    const payload = {
      FirstName: form.FirstName.trim(),
      LastName: form.LastName.trim(),
      MiddleName: form.MiddleName.trim() || null,
      Gender: form.Gender,
      DateOfBirth: form.DateOfBirth,
      Profession: form.Profession.trim() || null,
      Mobile: form.Mobile.trim(),
      Email: form.Email.trim(),
      Address: form.Address.trim() || null,
      Package: form.Package,
      // Notes are appended to Address if provided and Address is empty
      ...(form.Notes && !form.Address.trim()
        ? { Address: form.Notes.trim() }
        : {}),
    };

    // TODO: replace with your actual API call:
    // await webApi.createMembershipRequest(payload);
    console.log('MembershipRequest payload:', payload);

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      if (onClose) onClose();
    }, 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-8 sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl rounded-3xl bg-[#F7F9F4] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#0B2545] shadow-md transition hover:bg-[#A3E635]"
        >
          ✕
        </button>

        <div className="p-6 sm:p-10">
          {/* Heading */}
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#4d7c0f]">
              Membership Registration
            </span>
            <h1 className="mt-3 font-serif text-3xl font-bold text-[#0B2545] sm:text-4xl">
              {plan ? 'Confirm Your Plan' : 'Join Lena Gym'}
            </h1>
            <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-[#A3E635]" />
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-5">
            {/* Form */}
            <div className="lg:col-span-3">
              <form
                onSubmit={handleSubmit}
                className="rounded-3xl border border-[#0B2545]/10 bg-white p-6 shadow-md sm:p-8"
              >
                {submitted && (
                  <div className="mb-6 rounded-xl border border-[#A3E635] bg-[#A3E635]/10 px-4 py-3 text-sm font-medium text-[#3f6212]">
                    ✓ Thank you! Your membership request has been received.
                  </div>
                )}
                {error && (
                  <div className="mb-6 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                  </div>
                )}

                <h2 className="font-serif text-xl font-bold text-[#0B2545]">
                  Your Details
                </h2>

                {/* FirstName / LastName */}
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <input
                    type="text"
                    name="FirstName"
                    required
                    placeholder="First name *"
                    value={form.FirstName}
                    onChange={handleChange}
                    className={inputBase}
                  />
                  <input
                    type="text"
                    name="LastName"
                    required
                    placeholder="Last name *"
                    value={form.LastName}
                    onChange={handleChange}
                    className={inputBase}
                  />
                </div>

                {/* MiddleName / Gender */}
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <input
                    type="text"
                    name="MiddleName"
                    placeholder="Middle name (optional)"
                    value={form.MiddleName}
                    onChange={handleChange}
                    className={inputBase}
                  />
                  <select
                    name="Gender"
                    required
                    value={form.Gender}
                    onChange={handleChange}
                    className={`${inputBase} appearance-none`}
                  >
                    <option value="">Gender *</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* DateOfBirth / Profession */}
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <input
                    type="date"
                    name="DateOfBirth"
                    required
                    value={form.DateOfBirth}
                    onChange={handleChange}
                    className={inputBase}
                    placeholder="Date of birth *"
                  />
                  <input
                    type="text"
                    name="Profession"
                    placeholder="Profession (optional)"
                    value={form.Profession}
                    onChange={handleChange}
                    className={inputBase}
                  />
                </div>

                {/* Mobile / Email */}
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <input
                    type="tel"
                    name="Mobile"
                    required
                    placeholder="Mobile *"
                    value={form.Mobile}
                    onChange={handleChange}
                    className={inputBase}
                  />
                  <input
                    type="email"
                    name="Email"
                    required
                    placeholder="Email *"
                    value={form.Email}
                    onChange={handleChange}
                    className={inputBase}
                  />
                </div>

                {/* Address */}
                <div className="mt-4">
                  <input
                    type="text"
                    name="Address"
                    placeholder="Address (optional)"
                    value={form.Address}
                    onChange={handleChange}
                    className={inputBase}
                  />
                </div>

                {/* Package (read-only) */}
                <div className="mt-4">
                  <label className="mb-2 block text-sm font-semibold text-[#0B2545]">
                    Selected Package
                  </label>
                  <input
                    type="text"
                    name="Package"
                    readOnly
                    value={form.Package}
                    placeholder="No package selected"
                    className={`${inputBase} bg-[#F7F9F4] cursor-not-allowed`}
                  />
                </div>

                {/* Notes (optional, mapped to Address if Address empty) */}
                <textarea
                  name="Notes"
                  rows="3"
                  placeholder="Anything else? (optional)"
                  value={form.Notes}
                  onChange={handleChange}
                  className={`${inputBase} mt-4`}
                />

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="submit"
                    className="rounded-full bg-[#A3E635] px-8 py-3 text-sm font-bold text-[#0B2545] transition hover:-translate-y-0.5 hover:bg-[#D9F99D]"
                  >
                    Complete Registration
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full border border-[#0B2545]/20 px-8 py-3 text-sm font-semibold text-[#0B2545] transition hover:border-[#A3E635] hover:text-[#4d7c0f]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>

            {/* Selected package summary */}
            <div className="lg:col-span-2">
              <div className="rounded-3xl border border-[#A3E635] bg-[#0B2545] p-6 text-white shadow-xl sm:p-8">
                <span className="rounded-full bg-[#A3E635] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#0B2545]">
                  {plan ? 'Selected' : 'Not Selected'}
                </span>
                <h3 className="mt-4 font-serif text-2xl font-bold text-[#A3E635]">
                  {plan?.title || '—'}
                </h3>
                {plan?.price && (
                  <div className="mt-2 text-3xl font-bold">{plan.price}</div>
                )}
                <div className="my-5 h-0.5 w-12 rounded-full bg-[#A3E635]" />
                <ul className="space-y-3">
                  {(plan?.features || []).map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#A3E635] text-[#0B2545]">
                        <Check />
                      </span>
                      <span className="text-sm leading-relaxed text-white/85">
                        {feature}
                      </span>
                    </li>
                  ))}
                  {(!plan?.features || plan.features.length === 0) && (
                    <li className="text-sm text-white/60">
                      Select a package on the gym page to see its features here.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MembershipForm;