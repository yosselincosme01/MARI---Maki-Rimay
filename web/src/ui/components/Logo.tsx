type LogoProps = { className?: string }

export function Logo({ className = 'h-16 w-auto' }: LogoProps) {
  return <img src="/brand/mari-logo.png" alt="MARI, salud que te escucha" className={className} />
}
