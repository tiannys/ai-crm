import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock3, ShieldCheck, Zap } from 'lucide-react';
import { InquiryForm } from './inquiry-form';

export const metadata: Metadata = {
  title: 'Start a conversation | AI CRM',
  description: 'Tell our commercial team about your goals and receive a focused follow-up.',
};

export default function InquiryPage() {
  return (
    <main className="min-h-screen bg-[#080b12] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 top-[-10rem] h-[30rem] w-[30rem] rounded-full bg-blue-600/15 blur-[120px]" />
        <div className="absolute -right-32 bottom-[-8rem] h-[28rem] w-[28rem] rounded-full bg-violet-600/15 blur-[110px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-8 lg:px-8 lg:py-12">
        <div className="mb-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3" aria-label="AI CRM home">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600">
              <Zap className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold tracking-[0.18em]">AI CRM</span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to overview
          </Link>
        </div>

        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <section className="pt-4 lg:pt-10">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-400">Start a conversation</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.03em] sm:text-5xl">
              What would you like to make better?
            </h1>
            <p className="mt-5 text-base leading-7 text-slate-400">
              Share a little context about your goals. Your inquiry will go directly to our commercial team as a new opportunity for review.
            </p>

            <div className="mt-10 space-y-5">
              <div className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300"><Clock3 className="h-5 w-5" /></span>
                <div><p className="font-medium">A focused follow-up</p><p className="mt-1 text-sm leading-6 text-slate-500">We review the context first so the next conversation starts productively.</p></div>
              </div>
              <div className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300"><ShieldCheck className="h-5 w-5" /></span>
                <div><p className="font-medium">Handled with care</p><p className="mt-1 text-sm leading-6 text-slate-500">Your information is used only to respond to this inquiry and manage the relationship.</p></div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
            <InquiryForm />
          </section>
        </div>
      </div>
    </main>
  );
}
