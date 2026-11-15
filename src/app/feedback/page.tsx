import Link from 'next/link'

export const metadata = {
  title: 'Feedback | SportsBook',
  description: 'Share feedback and suggestions for SportsBook.',
}

export default function FeedbackPage() {
  return (
    <div className="min-h-screen bg-background px-6 pb-16 pt-32 text-foreground">
      <section className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-8 text-center shadow-sm sm:p-12">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">SportsBook</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">Feedback & Suggestions</h1>
        <p className="mt-6 text-lg text-muted-foreground">For feedback or suggestions, contact</p>
        <Link href="mailto:mail@kunal" className="mt-2 inline-block text-2xl font-semibold text-primary hover:underline">
          kunal24313@iiitd.ac.in
        </Link>
        <h1 className="mt-12 text-lg text-muted-foreground">Designed by Kunal, Kirat, and Priyansh.</h1>
      </section>
    </div>
  )
}
