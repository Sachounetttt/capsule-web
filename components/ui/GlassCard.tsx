import { motion, type HTMLMotionProps } from 'framer-motion'
import { clsx } from 'clsx'

interface Props extends HTMLMotionProps<'div'> {
  className?: string
}

export default function GlassCard({ className, children, ...props }: Props) {
  return (
    <motion.div
      className={clsx('glass rounded-[20px]', className)}
      {...props}
    >
      {children}
    </motion.div>
  )
}
