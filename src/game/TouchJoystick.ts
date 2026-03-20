/**
 * Virtual joystick using Pointer Events (touch + mouse).
 * `out.x` / `out.z` roughly in -1..1；右为 +x、上为 +z（视角空间），在 Game 里转到世界水平方向。
 */
export class TouchJoystick {
  readonly base: HTMLElement
  readonly stick: HTMLElement
  private readonly maxRadius: number
  private active = false
  readonly out = { x: 0, z: 0 }

  constructor(root: HTMLElement) {
    const base = root.querySelector<HTMLElement>('#joystick-base')
    const stick = root.querySelector<HTMLElement>('#joystick-stick')
    if (!base || !stick) {
      throw new Error('TouchJoystick: missing #joystick-base or #joystick-stick')
    }
    this.base = base
    this.stick = stick
    this.maxRadius = Math.max(32, base.clientWidth * 0.36)

    base.addEventListener('pointerdown', this.onDown)
    base.addEventListener('pointermove', this.onMove)
    base.addEventListener('pointerup', this.onUp)
    base.addEventListener('pointercancel', this.onUp)
    base.addEventListener('lostpointercapture', this.onUp)
  }

  private onDown = (e: PointerEvent): void => {
    if (e.button !== 0) return
    this.base.setPointerCapture(e.pointerId)
    this.active = true
    rootActive(this.base.parentElement, true)
    this.move(e.clientX, e.clientY)
  }

  private onMove = (e: PointerEvent): void => {
    if (!this.active) return
    this.move(e.clientX, e.clientY)
  }

  private onUp = (e: PointerEvent): void => {
    if (!this.active) return
    this.active = false
    try {
      this.base.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    this.out.x = 0
    this.out.z = 0
    this.stick.style.transform = 'translate(0, 0)'
    rootActive(this.base.parentElement, false)
  }

  private move(clientX: number, clientY: number): void {
    const rect = this.base.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    let dx = clientX - cx
    let dy = clientY - cy
    const len = Math.hypot(dx, dy)
    const max = this.maxRadius
    if (len > max && len > 1e-6) {
      dx = (dx / len) * max
      dy = (dy / len) * max
    }
    this.stick.style.transform = `translate(${dx}px, ${dy}px)`
    this.out.x = max > 1e-6 ? dx / max : 0
    this.out.z = max > 1e-6 ? -dy / max : 0
  }
}

function rootActive(root: HTMLElement | null, on: boolean): void {
  if (!root) return
  root.classList.toggle('active', on)
}
