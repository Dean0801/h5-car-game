/**
 * WASD 为「当前视角」下的左右 / 前后（与摇杆同一套屏幕式轴向），在 Game 里经轨道相机水平基向量转到世界 XZ。
 */
export class KeyboardSteer {
  private readonly target: Window | Document
  private readonly keys = new Set<string>()
  private readonly onDown = (e: Event): void => {
    if (!(e instanceof KeyboardEvent)) return
    if (e.repeat) return
    if (!tracked(e.code)) return
    this.keys.add(e.code)
  }
  private readonly onUp = (e: Event): void => {
    if (!(e instanceof KeyboardEvent)) return
    this.keys.delete(e.code)
  }
  private readonly onBlur = (): void => {
    this.keys.clear()
  }

  constructor(target: Window | Document = window) {
    this.target = target
    target.addEventListener('keydown', this.onDown)
    target.addEventListener('keyup', this.onUp)
    window.addEventListener('blur', this.onBlur)
  }

  /** 当前帧输入，长度已限制在 0..1，可与摇杆向量相加后再归一化 */
  getVector(): { x: number; z: number } {
    let x = 0
    let z = 0
    if (this.keys.has('KeyA')) x -= 1
    if (this.keys.has('KeyD')) x += 1
    if (this.keys.has('KeyW')) z += 1
    if (this.keys.has('KeyS')) z -= 1
    const m = Math.hypot(x, z)
    if (m < 1e-6) return { x: 0, z: 0 }
    if (m > 1) {
      x /= m
      z /= m
    }
    return { x, z }
  }

  dispose(): void {
    this.target.removeEventListener('keydown', this.onDown)
    this.target.removeEventListener('keyup', this.onUp)
    window.removeEventListener('blur', this.onBlur)
    this.keys.clear()
  }
}

function tracked(code: string): boolean {
  return (
    code === 'KeyW' ||
    code === 'KeyA' ||
    code === 'KeyS' ||
    code === 'KeyD'
  )
}
