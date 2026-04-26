"use client"
import { useEffect, useRef } from "react"

export default function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext("2d")!
    let w = canvas.width = window.innerWidth
    let h = canvas.height = window.innerHeight

    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      r: Math.random() * 2 + 1,
    }))

    function draw() {
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = "#60a5fa"

      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > w) p.vx *= -1
        if (p.y < 0 || p.y > h) p.vy *= -1

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      })

      requestAnimationFrame(draw)
    }

    draw()
    window.onresize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0" />
}
