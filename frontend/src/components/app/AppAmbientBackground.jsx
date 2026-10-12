/** Clean white canvas — brand color reserved for components, not backdrop tint */
export function AppAmbientBackground() {
  return <div className="pointer-events-none fixed inset-0 -z-10 bg-white" aria-hidden />
}
