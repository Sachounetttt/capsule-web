interface Props {
  color?: string
}

export default function AmbientGlow({ color }: Props) {
  if (!color) return null
  return (
    <div
      className="absolute inset-0 -z-10 opacity-40"
      style={{
        background: `radial-gradient(ellipse at top, ${color}80 0%, transparent 70%)`,
        filter: 'blur(40px)',
      }}
    />
  )
}
