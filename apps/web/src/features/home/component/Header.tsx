export function Header({ children }: { children: React.ReactNode }) {
  return (
    <header className="absolute top-0 right-0 w-full p-4 flex justify-center">
      <div className="flex justify-end w-full max-w-7xl">{children}</div>
    </header>
  );
}
