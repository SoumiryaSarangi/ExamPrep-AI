import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MagneticButton } from '@/components/ui/magnetic-button'
import {
  GraduationCap,
  FileText,
  Brain,
  LayoutGrid,
  Sparkles,
  Upload,
  BookOpen,
  CheckCircle,
  ArrowRight,
  Zap,
} from 'lucide-react'

const features = [
  {
    icon: Upload,
    title: 'Upload Anything',
    description: 'PDFs, PowerPoints, lecture notes - we handle all your study materials.',
    color: 'text-[hsl(var(--accent-blue))]',
    bg: 'bg-[hsl(var(--accent-blue))]/10',
  },
  {
    icon: FileText,
    title: 'Smart Notes',
    description: 'AI generates comprehensive, structured notes from your content.',
    color: 'text-[hsl(var(--accent-green))]',
    bg: 'bg-[hsl(var(--accent-green))]/10',
  },
  {
    icon: LayoutGrid,
    title: 'Flashcards',
    description: 'Automatic flashcard generation with spaced repetition for better retention.',
    color: 'text-[hsl(var(--accent-purple))]',
    bg: 'bg-[hsl(var(--accent-purple))]/10',
  },
  {
    icon: Brain,
    title: 'Interactive Quizzes',
    description: 'Test your knowledge with AI-generated quizzes and instant feedback.',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-background noise-overlay ambient-glow">
      {/* ─── Header ─── */}
      <header className="relative z-10 border-b border-white/[0.06]">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold text-xl">SenseiAI</span>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" className="text-muted-foreground">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild className="gap-2">
              <Link href="/register">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ─── Hero Section ─── */}
      <section className="relative z-10 py-24 px-6">
        <div className="container mx-auto text-center">
          <div className="inline-flex items-center gap-2 glass-card px-4 py-2 rounded-full mb-8 animate-fade-in">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Powered by AI</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in tracking-tight" style={{ animationDelay: '0.1s' }}>
            Study Smarter,
            <br />
            <span className="text-primary">Not Harder</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-fade-in leading-relaxed" style={{ animationDelay: '0.2s' }}>
            Upload your lecture slides and syllabi. Get AI-generated notes, flashcards, quizzes, and diagrams. Ace your exams
            with intelligent study tools.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <MagneticButton asChild size="lg" className="gap-2 w-full sm:w-auto text-base px-8">
              <Link href="/register">
                <Sparkles className="h-5 w-5" />
                Start Learning Free
              </Link>
            </MagneticButton>
            <MagneticButton asChild size="lg" variant="glass" className="gap-2 w-full sm:w-auto text-base px-8">
              <Link href="/login">
                <BookOpen className="h-5 w-5" />
                Sign In
              </Link>
            </MagneticButton>
          </div>
        </div>
      </section>

      {/* ─── Features Section ─── */}
      <section className="relative z-10 py-24 px-6">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 animate-fade-in">Everything You Need to Excel</h2>
          <p className="text-muted-foreground text-center mb-14 max-w-xl mx-auto">
            From uploading materials to acing your exams — we&apos;ve got every step covered.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={`glass-card p-6 rounded-2xl hover-glow group cursor-default animate-fade-in stagger-${index + 1}`}
              >
                <div className={`h-12 w-12 rounded-xl ${feature.bg} flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110`}>
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="relative z-10 py-24 px-6">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-14 animate-fade-in">How It Works</h2>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-8 left-[20%] right-[20%] h-[2px] bg-border" />

            {[
              { step: '1', title: 'Upload', desc: 'Drop your PDFs and PowerPoints', color: 'text-[hsl(var(--accent-blue))]', bg: 'bg-[hsl(var(--accent-blue))]/15 ring-[hsl(var(--accent-blue))]/20' },
              { step: '2', title: 'Generate', desc: 'AI creates study materials', color: 'text-primary', bg: 'bg-primary/15 ring-primary/20' },
              { step: '3', title: 'Study', desc: 'Learn with flashcards and quizzes', color: 'text-[hsl(var(--accent-green))]', bg: 'bg-[hsl(var(--accent-green))]/15 ring-[hsl(var(--accent-green))]/20' },
            ].map((item, index) => (
              <div key={item.step} className={`text-center relative z-10 animate-fade-in stagger-${index + 1}`}>
                <div className={`h-16 w-16 rounded-2xl ${item.bg} ring-2 ${item.color} text-2xl font-bold flex items-center justify-center mx-auto mb-5`}>
                  <span className={item.color}>{item.step}</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Section ─── */}
      <section className="relative z-10 py-24 px-6">
        <div className="container mx-auto max-w-2xl">
          <div className="glass-card rounded-2xl p-10 md:p-14 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Ace Your Exams?</h2>
            <p className="text-muted-foreground mb-8">Join thousands of students studying smarter with AI.</p>
            <MagneticButton asChild size="lg" className="gap-2 px-8">
              <Link href="/register">
                <CheckCircle className="h-5 w-5" />
                Get Started — It&apos;s Free
              </Link>
            </MagneticButton>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 border-t border-white/[0.06] py-8 px-6">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="font-semibold">SenseiAI</span>
          </div>
          <p className="text-sm text-muted-foreground">&copy; 2026 SenseiAI. Built for students, by students.</p>
        </div>
      </footer>
    </div>
  )
}
