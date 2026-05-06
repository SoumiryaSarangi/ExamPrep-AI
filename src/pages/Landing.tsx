import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MagneticButton } from '@/components/ui/magnetic-button'
import {
  GraduationCap,
  FileText,
  Brain,
  LayoutGrid,
  Upload,
  BookOpen,
  ArrowRight,
  Timer,
  Target,
  FileClock,
  Layers
} from 'lucide-react'

const features = [
  {
    icon: Upload,
    title: 'Upload Anything',
    description: 'Drop your PDFs, PowerPoints, and lecture notes. We process and structure your study materials automatically.',
  },
  {
    icon: FileText,
    title: 'Smart Notes',
    description: 'AI generates comprehensive, section-by-section notes from your content, highlighting key concepts and definitions.',
  },
  {
    icon: LayoutGrid,
    title: 'Flashcards',
    description: 'Automatic flashcard generation with built-in spaced repetition designed for maximum long-term retention.',
  },
  {
    icon: Brain,
    title: 'Interactive Quizzes',
    description: 'Test your knowledge instantly with AI-generated quizzes, receiving immediate feedback and explanations.',
  },
  {
    icon: Timer,
    title: 'Exam Mode',
    description: 'Timed practice exams that simulate real exam conditions to build your confidence and testing speed.',
  },
  {
    icon: Target,
    title: 'Weak Area Tracker',
    description: 'AI identifies your weak topics from quiz results and creates targeted practice to help you improve rapidly.',
  },
]

export default function Landing() {
  return (
    <div 
      className="min-h-screen text-foreground"
      style={{
        backgroundColor: '#0a0f1e',
        backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.05) 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px'
      }}
    >
      {/* ─── Header ─── */}
      <header className="relative z-10 border-b border-white/[0.06] bg-[#0a0f1e]/80 backdrop-blur-sm sticky top-0">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#d97706]/15 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-[#d97706]" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">SenseiAI</span>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" className="text-muted-foreground hover:text-white hover:bg-white/5">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ─── Hero Section ─── */}
      <section className="relative z-10 py-24 lg:py-32 px-6">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Copy & CTAs */}
            <div className="text-center lg:text-left">
              <h1 className="text-5xl md:text-7xl font-extrabold mb-6 animate-fade-in tracking-tight text-white leading-[1.1]" style={{ animationDelay: '0.1s' }}>
                Study Smarter,
                <br />
                <span className="text-[#d97706]">Not Harder</span>
              </h1>

              <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-xl mx-auto lg:mx-0 animate-fade-in leading-relaxed" style={{ animationDelay: '0.2s' }}>
                Upload your lecture slides and syllabus. Get AI-generated notes, flashcards, quizzes, and diagrams. Ace your exams with intelligent study tools.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-fade-in mb-8" style={{ animationDelay: '0.3s' }}>
                <MagneticButton asChild size="lg" className="w-full sm:w-auto text-base px-8 bg-[#d97706] hover:bg-[#b45309] text-white font-semibold">
                  <Link href="/register">
                    Start Learning Free <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </MagneticButton>
                <MagneticButton asChild size="lg" variant="outline" className="w-full sm:w-auto text-base px-8 border-white/10 text-white hover:bg-white/5">
                  <Link href="/login">
                    <BookOpen className="h-5 w-5 mr-2" />
                    Sign In
                  </Link>
                </MagneticButton>
              </div>
            </div>

            {/* Right Column: App Mockup */}
            <div className="hidden lg:block relative animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="relative border border-white/10 rounded-2xl bg-[#0a0f1e]/80 backdrop-blur-xl overflow-hidden aspect-[4/3] shadow-2xl">
                {/* Mockup Header */}
                <div className="h-12 border-b border-white/10 flex items-center px-4 gap-2 bg-white/[0.02]">
                  <div className="h-3 w-3 rounded-full bg-red-500/80" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                  <div className="h-3 w-3 rounded-full bg-green-500/80" />
                  <div className="ml-4 h-6 w-48 bg-white/5 rounded-md" />
                </div>
                {/* Mockup Content */}
                <div className="p-6 flex flex-col gap-4 h-full">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="h-24 bg-white/[0.03] rounded-xl border border-white/5" />
                    <div className="h-24 bg-[#d97706]/10 rounded-xl border border-[#d97706]/20" />
                    <div className="h-24 bg-white/[0.03] rounded-xl border border-white/5" />
                  </div>
                  <div className="flex-1 bg-white/[0.02] rounded-xl border border-white/5 p-4 flex flex-col gap-3">
                    <div className="h-4 w-1/3 bg-white/10 rounded-full" />
                    <div className="h-3 w-full bg-white/5 rounded-full" />
                    <div className="h-3 w-5/6 bg-white/5 rounded-full" />
                    <div className="h-3 w-4/6 bg-white/5 rounded-full" />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── Features Section ─── */}
      <section className="relative z-10 py-24 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold text-center mb-16 animate-fade-in text-white">Everything You Need to Excel</h2>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={`bg-[#0a0f1e] border border-white/10 p-8 rounded-2xl hover:border-[#d97706]/50 transition-colors animate-fade-in`}
                style={{ animationDelay: `${0.1 * index}s` }}
              >
                <div className={`h-16 w-16 rounded-2xl bg-[#d97706]/10 flex items-center justify-center mb-6`}>
                  <feature.icon className={`h-8 w-8 text-[#d97706]`} />
                </div>
                <h3 className="font-bold text-2xl mb-3 text-white">{feature.title}</h3>
                <p className="text-gray-400 text-base leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="relative z-10 py-24 px-6">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold text-center mb-16 animate-fade-in text-white">How It Works</h2>

          <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-10 left-[20%] right-[20%] h-[1px] bg-white/10" />

            {[
              { step: '1', title: 'Upload', desc: 'Drop your PDF or PowerPoint. We extract and organize all content automatically.' },
              { step: '2', title: 'Generate', desc: 'AI creates notes, 30 flashcards, 15 quiz questions and more in minutes.' },
              { step: '3', title: 'Study', desc: 'Use flashcards, take timed exams, track your weak areas and improve.' },
            ].map((item, index) => (
              <div key={item.step} className={`text-center relative z-10 animate-fade-in`} style={{ animationDelay: `${0.2 * index}s` }}>
                <div className={`h-20 w-20 rounded-full bg-[#0a0f1e] border border-white/10 text-[#d97706] text-3xl font-extrabold flex items-center justify-center mx-auto mb-6`}>
                  {item.step}
                </div>
                <h3 className="font-bold text-2xl mb-3 text-white">{item.title}</h3>
                <p className="text-gray-400 text-base leading-relaxed px-4">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── New Stats Section ─── */}
      <section className="relative z-10 py-16 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              { icon: FileText, text: 'Section-by-section notes' },
              { icon: Layers, text: '30 flashcards per document' },
              { icon: Brain, text: '15 quiz questions' },
              { icon: FileClock, text: 'Timed exam mode' },
            ].map((stat, index) => (
              <div key={index} className="flex items-center gap-4 bg-[#0a0f1e] border border-white/10 rounded-xl p-6 animate-fade-in" style={{ animationDelay: `${0.1 * index}s` }}>
                <stat.icon className="h-8 w-8 text-[#d97706] shrink-0" />
                <span className="font-semibold text-lg text-white">{stat.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Section ─── */}
      <section className="relative z-10 py-32 px-6">
        <div className="container mx-auto text-center max-w-3xl animate-fade-in">
          <h2 className="text-4xl md:text-6xl font-extrabold mb-6 text-white tracking-tight">Your exams won&apos;t study themselves.</h2>
          <p className="text-xl text-gray-400 mb-10">Join students who study smarter with SenseiAI — free to get started.</p>
          <MagneticButton asChild size="lg" className="text-lg px-10 py-6 bg-[#d97706] hover:bg-[#b45309] text-white font-bold rounded-xl">
            <Link href="/register">
              Start Learning Free <ArrowRight className="h-5 w-5 ml-2" />
            </Link>
          </MagneticButton>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 border-t border-white/[0.06] py-8 px-6 bg-[#0a0f1e]">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-[#d97706]" />
            <span className="font-semibold text-white">SenseiAI</span>
          </div>
          <p className="text-sm text-gray-500">&copy; 2026 SenseiAI. Built for students, by students.</p>
        </div>
      </footer>
    </div>
  )
}
