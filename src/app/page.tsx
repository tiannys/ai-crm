import Link from 'next/link';
import { ArrowRight, Bot, MessageSquareText, ShieldCheck, Sparkles, Zap } from 'lucide-react';

const capabilities = [
  {
    icon: Bot,
    title: 'AI that understands context',
    description: 'Turn conversations and customer signals into clear summaries and practical next steps.',
  },
  {
    icon: MessageSquareText,
    title: 'Connected conversations',
    description: 'Bring website inquiries and LINE conversations into one customer timeline.',
  },
  {
    icon: ShieldCheck,
    title: 'Human-controlled actions',
    description: 'AI prepares recommendations while your team stays in control of every customer response.',
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#080b12] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[-10rem] top-[-8rem] h-[28rem] w-[28rem] rounded-full bg-blue-600/15 blur-[110px]" />
        <div className="absolute right-[-8rem] top-[12rem] h-[24rem] w-[24rem] rounded-full bg-violet-600/15 blur-[100px]" />
      </div>

      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="AI CRM home">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/20">
            <Zap className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold tracking-[0.18em]">AI CRM</span>
            <span className="block text-[10px] uppercase tracking-[0.24em] text-slate-500">Jenosize</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden px-4 py-2 text-sm text-slate-400 transition hover:text-white sm:block">
            Team sign in
          </Link>
          <Link href="/inquiry" className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-blue-50">
            Start a conversation
          </Link>
        </div>
      </nav>

      <section className="relative mx-auto grid max-w-7xl gap-16 px-6 pb-24 pt-20 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:pb-32 lg:pt-28">
        <div>
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1.5 text-xs font-medium text-blue-300">
            <Sparkles className="h-3.5 w-3.5" />
            AI-powered customer growth
          </div>
          <h1 className="max-w-4xl text-5xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
            Better conversations.
            <span className="block bg-gradient-to-r from-blue-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent">
              Stronger opportunities.
            </span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-400">
            Tell us what your team wants to improve. Our specialists will review your inquiry and get back to you with a focused next step.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/inquiry" className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-500 px-6 py-3.5 font-semibold transition hover:bg-blue-400">
              Discuss your project
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </Link>
            <a href="#capabilities" className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-3.5 font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.06]">
              See how we help
            </a>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="absolute inset-10 rounded-full bg-blue-500/20 blur-[80px]" />
          <div className="relative w-full rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-5">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Customer signal</p>
                <p className="mt-1 font-semibold">New website inquiry</p>
              </div>
              <span className="rounded-full bg-blue-400/10 px-3 py-1 text-xs font-medium text-blue-300">NEW</span>
            </div>
            <div className="space-y-4 py-6">
              {['Contact captured and matched', 'Assigned to the commercial team', 'Ready for qualification and follow-up'].map((item, index) => (
                <div key={item} className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-black/10 p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-xs font-semibold text-slate-300">0{index + 1}</span>
                  <span className="text-sm text-slate-300">{item}</span>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-violet-400/15 bg-gradient-to-r from-blue-500/10 to-violet-500/10 p-4 text-sm text-slate-300">
              Every inquiry enters the CRM as a traceable lead—ready for a human-reviewed next action.
            </div>
          </div>
        </div>
      </section>

      <section id="capabilities" className="relative border-t border-white/[0.06] bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-400">From interest to action</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">One clear path from inquiry to opportunity.</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {capabilities.map(({ icon: Icon, title, description }) => (
              <article key={title} className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
