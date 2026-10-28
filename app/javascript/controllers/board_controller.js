import { Controller } from "@hotwired/stimulus"
import consumer from "channels/consumer"

const TOOLS = new Set(["pen", "eraser", "line", "rect", "ellipse", "pan"])

export default class extends Controller {
  static targets = [
    "canvas", "stage", "tool", "color", "width", "widthLabel",
    "zoomLabel", "presence", "cursors"
  ]

  static values = {
    id: String,
    nickname: String,
    strokes: Array,
    createUrl: String
  }

  connect() {
    this.ctx = this.canvasTarget.getContext("2d")
    this.strokes = Array.isArray(this.strokesValue) ? [...this.strokesValue] : []
    this.live = new Map()
    this.presence = new Map()
    this.remoteCursors = new Map()

    this.tool = "pen"
    this.color = "#111827"
    this.width = 4
    this.scale = 1
    this.offsetX = 0
    this.offsetY = 0
    this.drawing = false
    this.panning = false
    this.spaceDown = false
    this.current = null
    this.clientId = crypto.randomUUID()
    this.lastCursorSent = 0
    this.seenIds = new Set(this.strokes.map((s) => s.id).filter(Boolean))
    this.seenClientIds = new Set(this.strokes.map((s) => s.client_id).filter(Boolean))

    this.boundResize = () => this.resize()
    this.boundKeyDown = (e) => this.onKeyDown(e)
    this.boundKeyUp = (e) => this.onKeyUp(e)

    window.addEventListener("resize", this.boundResize)
    window.addEventListener("keydown", this.boundKeyDown)
    window.addEventListener("keyup", this.boundKeyUp)

    this.canvasTarget.addEventListener("pointerdown", (e) => this.onPointerDown(e))
    this.canvasTarget.addEventListener("pointermove", (e) => this.onPointerMove(e))
    this.canvasTarget.addEventListener("pointerup", (e) => this.onPointerUp(e))
    this.canvasTarget.addEventListener("pointercancel", (e) => this.onPointerUp(e))
    this.canvasTarget.addEventListener("wheel", (e) => this.onWheel(e), { passive: false })
    this.canvasTarget.addEventListener("dblclick", () => this.resetView())

    this.subscribe()
    this.resize()
    this.renderPresence()
    this.raf = requestAnimationFrame(() => this.drawFrame())
  }

  disconnect() {
    cancelAnimationFrame(this.raf)
    window.removeEventListener("resize", this.boundResize)
    window.removeEventListener("keydown", this.boundKeyDown)
    window.removeEventListener("keyup", this.boundKeyUp)
    if (this.subscription) this.subscription.unsubscribe()
  }

  subscribe() {
    this.subscription = consumer.subscriptions.create(
      { channel: "BoardChannel", board_id: this.idValue },
      {
        received: (data) => this.onMessage(data),
        draw: function (payload) { this.perform("draw", payload) },
        cursor: function (payload) { this.perform("cursor", payload) }
      }
    )
  }

  selectTool(event) {
    const tool = event.currentTarget.dataset.tool
    if (!TOOLS.has(tool)) return
    this.tool = tool
    this.toolTargets.forEach((el) => {
      el.classList.toggle("is-active", el.dataset.tool === tool)
    })
    this.canvasTarget.style.cursor = tool === "pan" ? "grab" : "crosshair"
  }

  selectColor(event) {
    this.color = event.currentTarget.dataset.color
    this.colorTargets.forEach((el) => {
      el.classList.toggle("is-active", el.dataset.color === this.color)
    })
  }

  changeWidth() {
    this.width = Number(this.widthTarget.value)
    if (this.hasWidthLabelTarget) this.widthLabelTarget.textContent = String(this.width)
  }

  zoomIn() { this.zoomAt(1.15) }
  zoomOut() { this.zoomAt(1 / 1.15) }

  resetView() {
    this.scale = 1
    this.offsetX = 0
    this.offsetY = 0
    this.updateZoomLabel()
  }

  zoomAt(factor, cx = null, cy = null) {
    const rect = this.canvasTarget.getBoundingClientRect()
    const pivotX = cx ?? rect.width / 2
    const pivotY = cy ?? rect.height / 2
    const worldX = (pivotX - this.offsetX) / this.scale
    const worldY = (pivotY - this.offsetY) / this.scale
    this.scale = Math.min(4, Math.max(0.25, this.scale * factor))
    this.offsetX = pivotX - worldX * this.scale
    this.offsetY = pivotY - worldY * this.scale
    this.updateZoomLabel()
  }

  updateZoomLabel() {
    if (this.hasZoomLabelTarget) {
      this.zoomLabelTarget.textContent = `${Math.round(this.scale * 100)}%`
    }
  }

  resize() {
    const dpr = window.devicePixelRatio || 1
    const rect = this.stageTarget.getBoundingClientRect()
    this.canvasTarget.width = Math.max(1, Math.floor(rect.width * dpr))
    this.canvasTarget.height = Math.max(1, Math.floor(rect.height * dpr))
    this.canvasTarget.style.width = `${rect.width}px`
    this.canvasTarget.style.height = `${rect.height}px`
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.cssWidth = rect.width
    this.cssHeight = rect.height
  }

  screenToWorld(x, y) {
    return {
      x: (x - this.offsetX) / this.scale,
      y: (y - this.offsetY) / this.scale
    }
  }

  eventPoint(event) {
    const rect = this.canvasTarget.getBoundingClientRect()
    return this.screenToWorld(event.clientX - rect.left, event.clientY - rect.top)
  }

  onKeyDown(event) {
    if (event.target.matches("input, textarea")) return
    if (event.code === "Space") {
      this.spaceDown = true
      this.canvasTarget.style.cursor = "grab"
      event.preventDefault()
    }
    const map = { KeyP: "pen", KeyE: "eraser", KeyL: "line", KeyR: "rect", KeyO: "ellipse", KeyH: "pan" }
    if (map[event.code]) {
      const btn = this.toolTargets.find((el) => el.dataset.tool === map[event.code])
      if (btn) btn.click()
    }
  }

  onKeyUp(event) {
    if (event.code === "Space") {
      this.spaceDown = false
      this.canvasTarget.style.cursor = this.tool === "pan" ? "grab" : "crosshair"
    }
  }

  onWheel(event) {
    event.preventDefault()
    const rect = this.canvasTarget.getBoundingClientRect()
    const factor = event.deltaY < 0 ? 1.08 : 1 / 1.08
    this.zoomAt(factor, event.clientX - rect.left, event.clientY - rect.top)
  }

  onPointerDown(event) {
    this.canvasTarget.setPointerCapture(event.pointerId)
    const panMode = this.tool === "pan" || this.spaceDown || event.button === 1
    if (panMode) {
      this.panning = true
      this.panStart = { x: event.clientX, y: event.clientY, ox: this.offsetX, oy: this.offsetY }
      this.canvasTarget.style.cursor = "grabbing"
      return
    }

    const point = this.eventPoint(event)
    this.drawing = true
    this.current = {
      tool: this.tool,
      color: this.tool === "eraser" ? "#e8ecf1" : this.color,
      width: this.tool === "eraser" ? Math.max(this.width * 2.5, 12) : this.width,
      points: [point],
      nickname: this.nicknameValue,
      client_id: `${this.clientId}-${Date.now()}`
    }
  }

  onPointerMove(event) {
    if (this.panning && this.panStart) {
      this.offsetX = this.panStart.ox + (event.clientX - this.panStart.x)
      this.offsetY = this.panStart.oy + (event.clientY - this.panStart.y)
      return
    }

    const point = this.eventPoint(event)
    this.sendCursor(point)

    if (!this.drawing || !this.current) return

    if (this.current.tool === "pen" || this.current.tool === "eraser") {
      this.current.points.push(point)
      this.broadcastLive()
    } else {
      this.current.points = [this.current.points[0], point]
      this.broadcastLive()
    }
  }

  onPointerUp(event) {
    if (this.panning) {
      this.panning = false
      this.panStart = null
      this.canvasTarget.style.cursor = this.tool === "pan" || this.spaceDown ? "grab" : "crosshair"
      return
    }

    if (!this.drawing || !this.current) return
    this.drawing = false

    if (this.current.tool !== "pen" && this.current.tool !== "eraser") {
      const end = this.eventPoint(event)
      this.current.points = [this.current.points[0], end]
    }

    if (this.current.points.length < 1) {
      this.current = null
      return
    }

    const stroke = { ...this.current }
    this.current = null
    this.live.delete(stroke.client_id)
    this.strokes.push(stroke)
    this.seenClientIds.add(stroke.client_id)
    this.persistStroke(stroke)
  }

  broadcastLive() {
    if (!this.subscription || !this.current) return
    this.live.set(this.current.client_id, this.current)
    this.subscription.perform("draw", {
      client_id: this.current.client_id,
      tool: this.current.tool,
      color: this.current.color,
      width: this.current.width,
      points: this.current.points
    })
  }

  sendCursor(point) {
    const now = performance.now()
    if (now - this.lastCursorSent < 40 || !this.subscription) return
    this.lastCursorSent = now
    this.subscription.perform("cursor", {
      x: point.x,
      y: point.y,
      color: this.color
    })
  }

  async persistStroke(stroke) {
    const token = document.querySelector("meta[name='csrf-token']")?.content
    try {
      const response = await fetch(this.createUrlValue, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": token
        },
        body: JSON.stringify({
          stroke: {
            tool: stroke.tool,
            color: stroke.color,
            width: stroke.width,
            points: stroke.points,
            client_id: stroke.client_id
          }
        })
      })
      if (!response.ok) throw new Error("save failed")
      const data = await response.json()
      if (data.stroke?.id) {
        stroke.id = data.stroke.id
        this.seenIds.add(data.stroke.id)
      }
    } catch (error) {
      console.error(error)
    }
  }

  onMessage(data) {
    switch (data.type) {
      case "join":
        this.presence.set(data.nickname, true)
        this.renderPresence()
        break
      case "leave":
        this.presence.delete(data.nickname)
        this.remoteCursors.delete(data.nickname)
        this.renderPresence()
        this.renderCursors()
        break
      case "presence_self":
        this.presence.set(data.nickname, true)
        this.renderPresence()
        break
      case "live":
        if (data.nickname === this.nicknameValue && String(data.client_id || "").startsWith(this.clientId)) return
        this.live.set(data.client_id || `${data.nickname}-live`, {
          tool: data.tool,
          color: data.color,
          width: data.width,
          points: data.points,
          nickname: data.nickname,
          client_id: data.client_id
        })
        break
      case "stroke":
        this.ingestStroke(data.stroke)
        break
      case "cursor":
        if (data.nickname === this.nicknameValue) return
        this.remoteCursors.set(data.nickname, data)
        this.renderCursors()
        break
    }
  }

  ingestStroke(stroke) {
    if (!stroke) return
    if (stroke.id && this.seenIds.has(stroke.id)) return
    if (stroke.client_id && this.seenClientIds.has(stroke.client_id)) {
      if (stroke.id) this.seenIds.add(stroke.id)
      const existing = this.strokes.find((s) => s.client_id === stroke.client_id)
      if (existing && stroke.id) existing.id = stroke.id
      this.live.delete(stroke.client_id)
      return
    }
    if (stroke.id) this.seenIds.add(stroke.id)
    if (stroke.client_id) this.seenClientIds.add(stroke.client_id)
    this.live.delete(stroke.client_id)
    this.strokes.push(stroke)
  }

  renderPresence() {
    if (!this.hasPresenceTarget) return
    const names = [...this.presence.keys()].sort()
    this.presenceTarget.innerHTML = names.slice(0, 8).map((name) => {
      const hue = this.hue(name)
      const initials = this.initials(name)
      return `<span title="${this.escape(name)}" class="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink-950 text-[10px] font-semibold text-white" style="background:hsl(${hue} 55% 42%)">${initials}</span>`
    }).join("")
  }

  renderCursors() {
    if (!this.hasCursorsTarget) return
    const rect = this.canvasTarget.getBoundingClientRect()
    this.cursorsTarget.innerHTML = ""
    this.remoteCursors.forEach((cursor) => {
      const sx = cursor.x * this.scale + this.offsetX
      const sy = cursor.y * this.scale + this.offsetY
      if (sx < -40 || sy < -40 || sx > rect.width + 40 || sy > rect.height + 40) return
      const el = document.createElement("div")
      el.className = "absolute transition-transform duration-75"
      el.style.transform = `translate(${sx}px, ${sy}px)`
      el.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" style="color:${cursor.color || "#06b6d4"}; filter: drop-shadow(0 1px 2px rgba(0,0,0,.45))">
          <path fill="currentColor" d="M5.5 3.21V20.8c0 .10.10.0.4.35l4.86-4.86h7.09c.72 0 1.08-.87.57-1.38L6.35 3.15a.5.5 0 0 0-.85.06z"/>
        </svg>
        <span class="ml-3 -mt-1 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white" style="background:hsl(${this.hue(cursor.nickname)} 55% 38%)">${this.escape(cursor.nickname)}</span>
      `
      this.cursorsTarget.appendChild(el)
    })
  }

  drawFrame() {
    this.paint()
    this.raf = requestAnimationFrame(() => this.drawFrame())
  }

  paint() {
    const ctx = this.ctx
    const w = this.cssWidth || this.canvasTarget.clientWidth
    const h = this.cssHeight || this.canvasTarget.clientHeight
    ctx.clearRect(0, 0, w, h)

    ctx.save()
    ctx.fillStyle = "#e8ecf1"
    ctx.fillRect(0, 0, w, h)

    ctx.translate(this.offsetX, this.offsetY)
    ctx.scale(this.scale, this.scale)

    this.drawGrid(ctx, w, h)

    for (const stroke of this.strokes) this.drawStroke(ctx, stroke)
    this.live.forEach((stroke) => this.drawStroke(ctx, stroke))
    if (this.current) this.drawStroke(ctx, this.current)

    ctx.restore()
  }

  drawGrid(ctx, cssW, cssH) {
    const left = (-this.offsetX) / this.scale
    const top = (-this.offsetY) / this.scale
    const right = left + cssW / this.scale
    const bottom = top + cssH / this.scale
    const step = 32

    ctx.beginPath()
    ctx.strokeStyle = "rgba(15, 23, 42, 0.06)"
    ctx.lineWidth = 1 / this.scale

    const startX = Math.floor(left / step) * step
    const startY = Math.floor(top / step) * step
    for (let x = startX; x <= right; x += step) {
      ctx.moveTo(x, top)
      ctx.lineTo(x, bottom)
    }
    for (let y = startY; y <= bottom; y += step) {
      ctx.moveTo(left, y)
      ctx.lineTo(right, y)
    }
    ctx.stroke()
  }

  drawStroke(ctx, stroke) {
    if (!stroke?.points?.length) return
    const points = stroke.points
    ctx.save()
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.lineWidth = stroke.width
    ctx.globalCompositeOperation = "source-over"
    ctx.strokeStyle = stroke.tool === "eraser" ? "#e8ecf1" : stroke.color

    if (stroke.tool === "rect" && points.length >= 2) {
      const [a, b] = points
      ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y)
    } else if (stroke.tool === "ellipse" && points.length >= 2) {
      const [a, b] = points
      const rx = (b.x - a.x) / 2
      const ry = (b.y - a.y) / 2
      ctx.beginPath()
      ctx.ellipse(a.x + rx, a.y + ry, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2)
      ctx.stroke()
    } else if (stroke.tool === "line" && points.length >= 2) {
      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
      ctx.lineTo(points[1].x, points[1].y)
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y)
      if (points.length === 1) {
        ctx.arc(points[0].x, points[0].y, stroke.width / 2, 0, Math.PI * 2)
        ctx.fillStyle = stroke.tool === "eraser" ? "#e8ecf1" : stroke.color
        ctx.fill()
      } else {
        ctx.stroke()
      }
    }
    ctx.restore()
  }

  hue(name) {
    let sum = 0
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i)
    return (sum * 37) % 360
  }

  initials(name) {
    const parts = name.trim().split(/\s+/)
    if (!parts[0]) return "?"
    return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase()
  }

  escape(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
  }
}
