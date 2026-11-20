export default function ComingSoon({ feature }: { feature: string }) {
  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 pt-16">
      <section className="glass-panel max-w-lg rounded-3xl p-10 text-center">
        <p className="text-primary text-sm font-bold uppercase tracking-widest">Coming soon</p>
        <h1 className="mt-3 text-4xl font-black">{feature}</h1>
        <p className="mt-4 text-muted-foreground">We plan to launch this feature later.</p>
      </section>
    </main>
  )
}
