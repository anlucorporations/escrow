import { AccessGate } from '@/components/AccessGate'

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <AccessGate>{children}</AccessGate>
}
