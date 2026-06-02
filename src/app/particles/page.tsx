import dynamic from "next/dynamic"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Gesture Particle Lab — 手势粒子宇宙",
  description: "用手势控制 AI 粒子宇宙 · 摄像头手势识别 + 实时粒子渲染",
}

const GestureParticleHero = dynamic(
  () => import("@/components/GestureParticleHero"),
  { ssr: false }
)

export default function ParticlesPage() {
  return <GestureParticleHero />
}
