export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full h-dvh bg-background overflow-hidden">
      <div className="particles-container" />

      <main className="relative w-full h-dvh flex items-center justify-center">
        {children}
      </main>
    </div>
  );
}
