"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Link from "next/link"

// ==================== Types ====================

interface Point {
  x: number
  y: number
}

interface HandState {
  center: Point
  openness: number // 0 (fist) → 1 (fully open)
  velocity: number
  detected: boolean
}

interface BurstPoint {
  x: number
  y: number
  force: number
  life: number
}

// ==================== Constants ====================

const PARTICLE_COUNT = 220
const MOBILE_PARTICLE_COUNT = 120
const COLORS = [
  "#7c3aed", "#a855f7", "#c084fc", "#9333ea",
  "#6366f1", "#d8b4fe", "#a78bfa", "#8b5cf6",
]
const BURST_FORCE = 8
const VELOCITY_THRESHOLD = 0.015 // normalized coords per frame

// ==================== Particle ====================

class Particle {
  x: number
  y: number
  vx: number
  vy: number
  baseSize: number
  size: number
  color: string
  alpha: number
  baseOrbit: number
  phase: number
  angle: number
  angleSpeed: number

  constructor(w: number, h: number) {
    this.x = Math.random() * w
    this.y = Math.random() * h
    this.vx = (Math.random() - 0.5) * 0.6
    this.vy = (Math.random() - 0.5) * 0.6
    this.baseSize = Math.random() * 2.5 + 1
    this.size = this.baseSize
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)]
    this.alpha = Math.random() * 0.5 + 0.35
    this.baseOrbit = 60 + Math.random() * 280
    this.phase = Math.random() * Math.PI * 2
    this.angle = Math.random() * Math.PI * 2
    this.angleSpeed = (Math.random() - 0.5) * 0.02
  }

  update(
    attractors: { x: number; y: number; spread: number; active: boolean }[],
    bursts: BurstPoint[],
    w: number,
    h: number,
    time: number,
  ) {
    let totalFx = 0
    let totalFy = 0

    // Attractor forces
    for (const a of attractors) {
      if (!a.active) continue
      const dx = a.x - this.x
      const dy = a.y - this.y
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.01
      const targetDist = this.baseOrbit * (0.3 + a.spread * 1.2)
      const force = (dist - targetDist) * 0.00025
      totalFx += (dx / dist) * force
      totalFy += (dy / dist) * force

      // Tangential force for orbit effect
      if (dist < targetDist * 1.5) {
        totalFx += (-dy / dist) * 0.04
        totalFy += (dx / dist) * 0.04
      }
    }

    // Burst forces
    for (const b of bursts) {
      const dx = this.x - b.x
      const dy = this.y - b.y
      const dist = Math.sqrt(dx * dx + dy * dy) + 1
      const force = b.force * b.life / (dist * 0.008 + 1)
      totalFx += (dx / dist) * force
      totalFy += (dy / dist) * force
    }

    // If no active attractor, gentle drift toward center
    const hasActive = attractors.some((a) => a.active)
    if (!hasActive) {
      const cx = w / 2
      const cy = h / 2
      const dx = cx - this.x
      const dy = cy - this.y
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.01
      totalFx += (dx / dist) * Math.min(dist, 300) * 0.00005
      totalFy += (dy / dist) * Math.min(dist, 300) * 0.00005
    }

    this.vx += totalFx
    this.vy += totalFy

    // Damping
    this.vx *= 0.985
    this.vy *= 0.985

    // Subtle drift
    this.vx += (Math.random() - 0.5) * 0.03
    this.vy += (Math.random() - 0.5) * 0.03

    // Speed clamp
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy)
    if (speed > 6) {
      this.vx = (this.vx / speed) * 6
      this.vy = (this.vy / speed) * 6
    }

    this.x += this.vx
    this.y += this.vy

    // Screen wrap
    const margin = 60
    if (this.x < -margin) this.x = w + margin
    if (this.x > w + margin) this.x = -margin
    if (this.y < -margin) this.y = h + margin
    if (this.y > h + margin) this.y = -margin

    // Size pulse
    this.size = Math.max(0.5, this.baseSize + Math.sin(time * 0.025 + this.phase) * 0.6)

    // Phase for glow effect
    this.angle += this.angleSpeed
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save()
    ctx.globalAlpha = this.alpha
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
    ctx.fillStyle = this.color

    // Glow
    ctx.shadowColor = this.color
    ctx.shadowBlur = this.size * 3
    ctx.fill()
    ctx.restore()
  }
}

// ==================== Helpers ====================

function getHandCenter(landmarks: any[]): Point {
  const indices = [0, 5, 9, 13, 17]
  let x = 0, y = 0
  for (const i of indices) {
    x += landmarks[i].x
    y += landmarks[i].y
  }
  return { x: x / indices.length, y: y / indices.length }
}

function getOpenness(landmarks: any[]): number {
  const wrist = landmarks[0]
  const tips = [4, 8, 12, 16, 20]
  let total = 0
  for (const i of tips) {
    const dx = landmarks[i].x - wrist.x
    const dy = landmarks[i].y - wrist.y
    total += Math.sqrt(dx * dx + dy * dy)
  }
  // Raw range ~0.08 (fist) to ~0.55 (fully open)
  const raw = total / tips.length
  return Math.max(0, Math.min(1, (raw - 0.08) / 0.47))
}

// ==================== Component ====================

type InteractionMode = "loading" | "camera" | "mouse"

export default function GestureParticleHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const handsRef = useRef<any>(null)
  const cameraRef = useRef<any>(null)
  const particlesRef = useRef<Particle[]>([])
  const handStatesRef = useRef<HandState[]>([{ center: { x: 0.5, y: 0.5 }, openness: 0.5, velocity: 0, detected: false }])
  const prevCentersRef = useRef<Point[]>([{ x: 0.5, y: 0.5 }])
  const burstsRef = useRef<BurstPoint[]>([])
  const mouseRef = useRef<Point>({ x: 0, y: 0 })
  const mouseActiveRef = useRef(false)
  const timeRef = useRef(0)
  const animFrameRef = useRef(0)

  const [mode, setMode] = useState<InteractionMode>("loading")
  const [handCount, setHandCount] = useState(0)
  const [showPreview, setShowPreview] = useState(true)

  // Resize canvas
  const resize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = window.innerWidth
    const h = window.innerHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    const ctx = canvas.getContext("2d")
    if (ctx) ctx.scale(dpr, dpr)
  }, [])

  // ---- Initialize MediaPipe + Camera ----
  useEffect(() => {
    let cleaned = false
    const video = videoRef.current
    if (!video) return

    async function init() {
      // Dynamically import MediaPipe to avoid SSR issues
      const [{ Hands }, { Camera }] = await Promise.all([
        import("@mediapipe/hands"),
        import("@mediapipe/camera_utils"),
      ])

      if (cleaned) return

      const hands = new Hands({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${file}`,
      })
      handsRef.current = hands

      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.65,
        minTrackingConfidence: 0.45,
      })

      hands.onResults((results: any) => {
        if (cleaned) return
        const states: HandState[] = []

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          for (const lm of results.multiHandLandmarks) {
            const center = getHandCenter(lm)
            const openness = getOpenness(lm)

            // Compute velocity from previous center
            const prev = prevCentersRef.current[states.length] || center
            const dx = center.x - prev.x
            const dy = center.y - prev.y
            const velocity = Math.sqrt(dx * dx + dy * dy)

            // Burst check
            if (velocity > VELOCITY_THRESHOLD && states.length < 2) {
              const canvas = canvasRef.current
              const w = canvas ? canvas.width : window.innerWidth
              const h = canvas ? canvas.height : window.innerHeight
              burstsRef.current.push({
                x: center.x * w,
                y: center.y * h,
                force: velocity * 400,
                life: 1,
              })
              // Cap bursts
              if (burstsRef.current.length > 8) {
                burstsRef.current = burstsRef.current.slice(-8)
              }
            }

            prevCentersRef.current[states.length] = center
            states.push({ center, openness, velocity, detected: true })
          }
        }

        // Fill remaining slots
        while (states.length < 2) {
          states.push({
            center: { x: 0.5, y: 0.5 },
            openness: 0.5,
            velocity: 0,
            detected: false,
          })
        }

        handStatesRef.current = states
        setHandCount(results.multiHandLandmarks?.length || 0)
      })

      // Start camera — Camera utility handles getUserMedia internally
      try {
        if (!video) return // TypeScript guard
        const camera = new Camera(video, {
          onFrame: async () => {
            if (!cleaned && handsRef.current) {
              await handsRef.current.send({ image: video })
            }
          },
          width: 640,
          height: 480,
          facingMode: "user",
        })
        cameraRef.current = camera
        await camera.start()
        if (!cleaned) setMode("camera")
      } catch (err) {
        console.warn("[Gesture] Camera denied or unavailable, fallback to mouse:", (err as Error).message)
        if (!cleaned) {
          setMode("mouse")
          mouseRef.current = {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
          }
        }
      }
    }

    init()

    return () => {
      cleaned = true
      if (cameraRef.current) {
        try { cameraRef.current.stop() } catch {}
      }
      if (handsRef.current) {
        try { handsRef.current.close() } catch {}
      }
      if (video?.srcObject) {
        const stream = video.srcObject as MediaStream
        stream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  // ---- Animation Loop ----
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    resize()
    window.addEventListener("resize", resize)

    // Init particles
    const isMobile = window.innerWidth < 768
    const count = isMobile ? MOBILE_PARTICLE_COUNT : PARTICLE_COUNT
    if (particlesRef.current.length === 0) {
      const w = canvas.width / dpr
      const h = canvas.height / dpr
      for (let i = 0; i < count; i++) {
        particlesRef.current.push(new Particle(w, h))
      }
    }

    function loop() {
      if (!canvas || !ctx) return
      const w = canvas.width / dpr
      const h = canvas.height / dpr
      timeRef.current++

      // Build attractors
      let attractors: { x: number; y: number; spread: number; active: boolean }[] = []

      if (mode === "camera") {
        const states = handStatesRef.current
        attractors = states.map((s) => ({
          x: s.center.x * w,
          y: s.center.y * h,
          spread: s.openness,
          active: s.detected,
        }))
      } else if (mode === "mouse") {
        attractors = [
          {
            x: mouseRef.current.x,
            y: mouseRef.current.y,
            spread: 0.5,
            active: mouseActiveRef.current,
          },
        ]
      } else {
        // Loading — gentle center attractor
        attractors = [{ x: w / 2, y: h / 2, spread: 0.3, active: true }]
      }

      // Update bursts — decay life
      burstsRef.current = burstsRef.current
        .map((b) => ({ ...b, life: b.life - 0.02 }))
        .filter((b) => b.life > 0)

      // Update + draw particles
      ctx.clearRect(0, 0, w, h)

      // Subtle trail effect via semi-transparent overlay
      ctx.fillStyle = "rgba(248, 250, 252, 0.12)"
      ctx.fillRect(0, 0, w, h)

      // Connection lines between nearby particles (performance: only draw some)
      const particles = particlesRef.current
      for (let i = 0; i < particles.length; i++) {
        particles[i].update(attractors, burstsRef.current, w, h, timeRef.current)

        // Draw connecting lines to nearby particles
        if (i % 3 === 0) {
          for (let j = i + 1; j < particles.length; j += 8) {
            const dx = particles[i].x - particles[j].x
            const dy = particles[i].y - particles[j].y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 80) {
              ctx.beginPath()
              ctx.moveTo(particles[i].x, particles[i].y)
              ctx.lineTo(particles[j].x, particles[j].y)
              ctx.strokeStyle = `rgba(168, 85, 247, ${0.06 * (1 - dist / 80)})`
              ctx.lineWidth = 0.5
              ctx.stroke()
            }
          }
        }

        particles[i].draw(ctx)
      }

      // Draw attractor glows
      for (const a of attractors) {
        if (!a.active) continue
        const glow = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, a.spread * 200 + 30)
        glow.addColorStop(0, "rgba(168, 85, 247, 0.12)")
        glow.addColorStop(0.5, "rgba(124, 58, 237, 0.04)")
        glow.addColorStop(1, "rgba(124, 58, 237, 0)")
        ctx.beginPath()
        ctx.arc(a.x, a.y, a.spread * 200 + 30, 0, Math.PI * 2)
        ctx.fillStyle = glow
        ctx.fill()

        // Ring indicator for spread
        ctx.beginPath()
        ctx.arc(a.x, a.y, a.spread * 120 + 20, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(168, 85, 247, ${0.15 + a.spread * 0.2})`
        ctx.lineWidth = 1
        ctx.stroke()
      }

      animFrameRef.current = requestAnimationFrame(loop)
    }

    animFrameRef.current = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [mode, resize])

  // ---- Mouse fallback listeners ----
  useEffect(() => {
    if (mode !== "mouse") return

    function onMove(e: MouseEvent) {
      mouseRef.current = { x: e.clientX, y: e.clientY }
      mouseActiveRef.current = true
    }
    function onLeave() {
      mouseActiveRef.current = false
    }
    function onEnter() {
      mouseActiveRef.current = true
    }

    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseleave", onLeave)
    window.addEventListener("mouseenter", onEnter)
    // Touch support for mobile fallback
    window.addEventListener("touchmove", (e) => {
      const t = e.touches[0]
      if (t) {
        mouseRef.current = { x: t.clientX, y: t.clientY }
        mouseActiveRef.current = true
      }
    }, { passive: true })
    window.addEventListener("touchend", () => {
      mouseActiveRef.current = false
    })

    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseleave", onLeave)
      window.removeEventListener("mouseenter", onEnter)
    }
  }, [mode])

  // ==================== Render ====================

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-950">
      {/* Particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />

      {/* Gradient overlays for depth */}
      <div className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-b from-gray-950/40 via-transparent to-gray-950/60" />

      {/* Content overlay */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-center px-6 animate-fade-in">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-4">
            <span className="gradient-brand-text">Gesture</span>{" "}
            <span className="text-white">Particle</span>{" "}
            <span className="gradient-brand-text">Lab</span>
          </h1>
          <p className="text-base sm:text-lg text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
            用手势控制你的 AI 粒子宇宙
          </p>

          {/* Gesture status indicator */}
          <div className="flex items-center justify-center gap-2 mb-10">
            {mode === "loading" && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800/80 border border-gray-700/50">
                <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-300">正在加载手势模型...</span>
              </div>
            )}
            {mode === "camera" && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800/80 border border-gray-700/50">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm text-gray-300">
                  {handCount === 0 && "等待手势..."}
                  {handCount === 1 && "🖐️ 单手模式"}
                  {handCount === 2 && "🙌 双手模式"}
                </span>
              </div>
            )}
            {mode === "mouse" && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800/80 border border-gray-700/50">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="text-sm text-gray-300">🖱️ 鼠标模式 — 移动鼠标控制粒子</span>
              </div>
            )}
          </div>

          {/* CTA Button */}
          <div className="pointer-events-auto">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20
                         text-white text-sm font-semibold hover:bg-white/20 hover:border-purple-400/50
                         transition-all duration-300 shadow-xl shadow-purple-500/10 hover:shadow-purple-500/20"
            >
              <span>进入 AI Hook Lab</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Hint text at bottom */}
        <div className="absolute bottom-8 text-center pointer-events-none">
          <p className="text-xs text-gray-500">
            {mode === "camera"
              ? "🖐️ 张开手掌扩散粒子 · ✊ 握拳聚拢粒子 · 👋 快速挥手产生波纹"
              : "🖱️ 移动鼠标引导粒子 · 滚轮控制扩散范围"}
          </p>
        </div>
      </div>

      {/* Video element — ALWAYS in DOM for MediaPipe, visibility controlled by mode/preview */}
      <div
        className={`absolute top-4 right-4 z-20 transition-all duration-500 ${
          mode === "camera" && showPreview
            ? "opacity-100 scale-100"
            : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <div className="relative rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl shadow-purple-500/10 bg-gray-900">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-36 h-27 sm:w-48 sm:h-36 object-cover scale-x-[-1]"
          />
          {/* Close button */}
          <button
            onClick={() => setShowPreview(false)}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-gray-900/70 text-white text-xs
                       flex items-center justify-center hover:bg-gray-900/90 transition-colors backdrop-blur"
            aria-label="关闭摄像头预览"
          >
            ✕
          </button>
          {/* Label */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
            <span className="text-[10px] text-white/80 font-medium">📷 摄像头预览</span>
          </div>
        </div>
      </div>

      {/* Reopen camera preview button */}
      {mode === "camera" && !showPreview && (
        <button
          onClick={() => setShowPreview(true)}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-xl bg-gray-800/80 border border-gray-600/30
                     text-white text-sm flex items-center justify-center hover:bg-gray-700/80 transition-colors backdrop-blur"
          aria-label="打开摄像头预览"
        >
          📷
        </button>
      )}

      {/* Loading skeleton while MediaPipe loads */}
      {mode === "loading" && (
        <div className="absolute inset-0 z-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-2xl shadow-purple-500/30 animate-pulse">
              <span className="text-3xl">🪝</span>
            </div>
            <p className="text-sm text-gray-500 animate-shimmer">正在初始化手势识别引擎...</p>
          </div>
        </div>
      )}
    </div>
  )
}
