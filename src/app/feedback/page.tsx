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
        <p className="mt-6 text-lg text-muted-foreground">For grievances or feedback, contact</p>
        {/* <Link href="mailto:priyansh24440@iiitd.ac.in" className="mt-2 inline-block text-2xl font-semibold text-primary hover:underline"> */}
          Priyansh Varshney · priyansh24440@iiitd.ac.in
        {/* </Link> */}
        <div>
          <Link
            href="https://docs.google.com/forms/d/e/1FAIpQLSfuZuC1L5q_lCUoX2J9_4d8i8hNW5CAZfB37WzSTosAls7qSg/viewform?usp=sharing&ouid=108079696422671039893"
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-block rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Fill this form
          </Link>
        </div>
        {/* <h1 className="mt-12 text-lg text-muted-foreground">Designed by Kunal, Kirat, and Priyansh.</h1> */}
      </section>
    </div>
  )
}
