import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  GraduationCap,
  FileText,
  Brain,
  LayoutGrid,
  Sparkles,
  Upload,
  BookOpen,
  CheckCircle,
} from 'lucide-react'

const features = [
  {
    icon: Upload,
    title: 'Upload Anything',
    description: 'PDFs, PowerPoints, lecture notes - we handle all your study materials.',
  },
  {
    icon: FileText,
    title: 'Smart Notes',
    description: 'AI generates comprehensive, structured notes from your content.',
  },
  {
    icon: LayoutGrid,
    title: 'Flashcards',
    description: 'Automatic flashcard generation with spaced repetition for better retention.',
  },
  {
    icon: Brain,
    title: 'Interactive Quizzes',
    description: 'Test your knowledge with AI-generated quizzes and instant feedback.',
  },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl">ExamHelper AI</span>
          </div>
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="py-20 px-6">
        <div className="container mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Powered by AI</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            Study Smarter,
            <br />
            Not Harder
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Upload your lecture slides and syllabi. Get AI-generated notes, flashcards, quizzes, and diagrams. Ace your exams
            with intelligent study tools.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="gap-2 w-full sm:w-auto">
              <Link href="/register">
                <Sparkles className="h-5 w-5" />
                Start Learning Free
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
              <Link href="/login">
                <BookOpen className="h-5 w-5" />
                Sign In
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-muted/30">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Everything You Need to Excel</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div key={feature.title} className="bg-card p-6 rounded-xl border hover:border-primary/50 transition-colors">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: '1', title: 'Upload', desc: 'Drop your PDFs and PowerPoints' },
              { step: '2', title: 'Generate', desc: 'AI creates study materials' },
              { step: '3', title: 'Study', desc: 'Learn with flashcards and quizzes' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-primary/5">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Ace Your Exams?</h2>
          <p className="text-muted-foreground mb-8">Join thousands of students studying smarter with AI.</p>
          <Button asChild size="lg" className="gap-2">
            <Link href="/register">
              <CheckCircle className="h-5 w-5" />
              Get Started - It's Free
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t py-8 px-6">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="font-semibold">ExamHelper AI</span>
          </div>
          <p className="text-sm text-muted-foreground">(c) 2026 ExamHelper AI. Built for students, by students.</p>
        </div>
      </footer>
    </div>
  )
}
