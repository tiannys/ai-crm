'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, LoaderCircle, RotateCcw } from 'lucide-react';

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyName: string;
  jobTitle: string;
  message: string;
  consent: boolean;
  website: string;
};

const initialForm: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  companyName: '',
  jobTitle: '',
  message: '',
  consent: false,
  website: '',
};

export function InquiryForm() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) throw new Error('The inquiry service is not configured.');

      const response = await fetch(`${apiUrl}/api/public/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Unable to submit your inquiry.');

      setSubmitted(true);
      setForm(initialForm);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to submit your inquiry.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-[34rem] flex-col items-center justify-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-400/10 text-emerald-300">
          <CheckCircle2 className="h-8 w-8" />
        </span>
        <h2 className="mt-6 text-2xl font-semibold">Thank you for reaching out.</h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
          Your inquiry is now with our commercial team. We will review the context and follow up using the contact details you provided.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={() => setSubmitted(false)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/[0.05]">
            <RotateCcw className="h-4 w-4" />
            Send another inquiry
          </button>
          <Link href="/" className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-blue-50">
            Return home
          </Link>
        </div>
      </div>
    );
  }

  const inputClass = 'mt-2 w-full rounded-xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/10';

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Tell us about your project</h2>
        <p className="mt-1 text-sm text-slate-500">Fields marked with * are required.</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-300">
          First name *
          <input required maxLength={100} autoComplete="given-name" value={form.firstName} onChange={(event) => update('firstName', event.target.value)} className={inputClass} />
        </label>
        <label className="text-sm font-medium text-slate-300">
          Last name *
          <input required maxLength={100} autoComplete="family-name" value={form.lastName} onChange={(event) => update('lastName', event.target.value)} className={inputClass} />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-300">
          Work email *
          <input required type="email" maxLength={254} autoComplete="email" value={form.email} onChange={(event) => update('email', event.target.value)} className={inputClass} />
        </label>
        <label className="text-sm font-medium text-slate-300">
          Phone
          <input type="tel" maxLength={50} autoComplete="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} className={inputClass} />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-300">
          Company
          <input maxLength={200} autoComplete="organization" value={form.companyName} onChange={(event) => update('companyName', event.target.value)} className={inputClass} />
        </label>
        <label className="text-sm font-medium text-slate-300">
          Job title
          <input maxLength={120} autoComplete="organization-title" value={form.jobTitle} onChange={(event) => update('jobTitle', event.target.value)} className={inputClass} />
        </label>
      </div>

      <label className="block text-sm font-medium text-slate-300">
        What would you like to achieve? *
        <textarea required minLength={10} maxLength={5000} rows={6} value={form.message} onChange={(event) => update('message', event.target.value)} className={`${inputClass} resize-y`} placeholder="Share the challenge, goal, or opportunity you would like to discuss." />
      </label>

      <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => update('website', event.target.value)} />
        </label>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.06] bg-black/10 p-4 text-sm leading-6 text-slate-400">
        <input required type="checkbox" checked={form.consent} onChange={(event) => update('consent', event.target.checked)} className="mt-1 h-4 w-4 rounded border-white/20 bg-black/20 accent-blue-500" />
        <span>I agree that my information may be used to respond to this inquiry and manage our business conversation.</span>
      </label>

      {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</p>}

      <button disabled={submitting} type="submit" className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 py-3.5 font-semibold transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60">
        {submitting ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Sending inquiry</> : <>Send inquiry <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></>}
      </button>
    </form>
  );
}
