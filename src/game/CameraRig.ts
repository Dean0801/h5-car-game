import * as THREE from 'three'
import {
  CAMERA_ORBIT_DISTANCE_DEFAULT,
  CAMERA_ORBIT_DISTANCE_MAX,
  CAMERA_ORBIT_DISTANCE_MIN,
  CAMERA_ORBIT_MIN_EYE_Y,
} from './constants'

const target = new THREE.Vector3()
const camPos = new THREE.Vector3()
const desired = new THREE.Vector3()
const offset = new THREE.Vector3()

function f(x: number, fallback: number): number {
  return Number.isFinite(x) ? x : fallback
}

/**
 * 绕目标点轨道观察：方位角 / 俯仰角由滑动屏幕控制，不随车身 yaw 变化。
 */
export class CameraOrbitRig {
  private readonly _smoothedLookTarget = new THREE.Vector3()
  private _lookTargetInit = false
  /** lookAt 目标竖直方向略加重平滑，减轻物理微弹跳带来的画面抖 */
  lookTargetSmoothY = 16
  lookTargetSmoothXZ = 28

  /** 绕世界 Y 轴（从上方看逆时针为正） */
  yaw = Math.PI
  /** 相对水平面的仰角，0 为水平环、>0 为从斜上方看 */
  pitch = 0.72
  /** 与观察目标的直线距离 */
  distance = CAMERA_ORBIT_DISTANCE_DEFAULT
  /** 滚轮 / 双指缩放时的距离范围 */
  distanceMin = CAMERA_ORBIT_DISTANCE_MIN
  distanceMax = CAMERA_ORBIT_DISTANCE_MAX
  smooth = 11
  /** lookAt 点相对车体位心的抬高 */
  lookYOffset = 0.1

  readonly sensX = 0.0055
  readonly sensY = 0.0042
  /** 略低于水平面向下看（可配合 eye 低于地板顶） */
  pitchMin = -0.14
  pitchMax = 1.52

  clampDistance(): void {
    this.distance = Math.max(
      this.distanceMin,
      Math.min(this.distanceMax, this.distance),
    )
  }

  /** 桌面滚轮：deltaY>0 通常远离（距离变大） */
  applyWheelZoom(deltaY: number): void {
    const k = 0.00115
    this.distance *= Math.exp(deltaY * k)
    this.clampDistance()
  }

  applyDrag(dxPx: number, dyPx: number): void {
    this.yaw -= dxPx * this.sensX
    this.pitch += dyPx * this.sensY
    this.pitch = Math.max(this.pitchMin, Math.min(this.pitchMax, this.pitch))
  }

  updateCamera(
    camera: THREE.PerspectiveCamera,
    followWorld: THREE.Vector3,
    dt: number,
  ): void {
    const px = f(followWorld.x, 0)
    const py = f(followWorld.y, 0.2)
    const pz = f(followWorld.z, 0)
    const rawY = py + this.lookYOffset
    if (!this._lookTargetInit) {
      this._smoothedLookTarget.set(px, rawY, pz)
      this._lookTargetInit = true
    } else {
      const kxz = 1 - Math.exp(-this.lookTargetSmoothXZ * dt)
      const ky = 1 - Math.exp(-this.lookTargetSmoothY * dt)
      const ax = Number.isFinite(kxz) ? kxz : 1
      const ay = Number.isFinite(ky) ? ky : 1
      const s = this._smoothedLookTarget
      s.x += (px - s.x) * ax
      s.y += (rawY - s.y) * ay
      s.z += (pz - s.z) * ax
    }
    target.copy(this._smoothedLookTarget)

    const cosP = Math.cos(this.pitch)
    offset.x = this.distance * cosP * Math.sin(this.yaw)
    offset.y = this.distance * Math.sin(this.pitch)
    offset.z = this.distance * cosP * Math.cos(this.yaw)

    desired.copy(target).add(offset)
    const minCamY = CAMERA_ORBIT_MIN_EYE_Y
    desired.y = Math.max(minCamY, desired.y)

    const alpha = 1 - Math.exp(-this.smooth * dt)
    camPos.lerpVectors(
      camera.position,
      desired,
      Number.isFinite(alpha) ? alpha : 1,
    )
    if (
      !Number.isFinite(camPos.x) ||
      !Number.isFinite(camPos.y) ||
      !Number.isFinite(camPos.z)
    ) {
      camPos.copy(desired)
    }
    camPos.y = Math.max(minCamY, camPos.y)
    camera.position.copy(camPos)
    camera.lookAt(target)

    const p = camera.position
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) {
      camera.position.set(0, 1.2, -1.4)
      camera.lookAt(0, 0.2, 0)
    }
  }

  /**
   * 当前视角在水平面（XZ）上的前向与右向，用于把「屏幕式」摇杆 / WASD 转到世界速度。
   * 前向 = 相机指向观察目标在地面上的投影方向。
   */
  getHorizontalViewBasis(
    forwardXZ: THREE.Vector3,
    rightXZ: THREE.Vector3,
  ): void {
    const cosP = Math.cos(this.pitch)
    const ox = this.distance * cosP * Math.sin(this.yaw)
    const oz = this.distance * cosP * Math.cos(this.yaw)
    forwardXZ.set(-ox, 0, -oz)
    const len = forwardXZ.length()
    if (len < 1e-6) {
      forwardXZ.set(0, 0, 1)
    } else {
      forwardXZ.multiplyScalar(1 / len)
    }
    rightXZ.crossVectors(forwardXZ, THREE.Object3D.DEFAULT_UP).normalize()
  }
}

type PointerPos = { x: number; y: number }

function screenPinchSpan(pointers: Map<number, PointerPos>): number {
  if (pointers.size < 2) return 0
  const [a, b] = [...pointers.values()]
  return Math.hypot(b.x - a.x, b.y - a.y)
}

/**
 * 画布：单指拖拽环视、双指捏合缩放、滚轮调距离。
 */
export function attachCameraControls(
  canvas: HTMLElement,
  rig: CameraOrbitRig,
): () => void {
  const pointers = new Map<number, PointerPos>()
  let pinchAnchorScreen = 0
  let pinchAnchorCamera = 0
  const minPinchSpan = 28

  const beginPinchIfNeeded = (): void => {
    if (pointers.size !== 2) return
    const span = screenPinchSpan(pointers)
    if (span >= minPinchSpan) {
      pinchAnchorScreen = span
      pinchAnchorCamera = rig.distance
    }
  }

  const onDown = (e: PointerEvent): void => {
    if (e.button !== 0) return
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    canvas.setPointerCapture(e.pointerId)
    beginPinchIfNeeded()
  }

  const onMove = (e: PointerEvent): void => {
    if (!pointers.has(e.pointerId)) return
    const prev = pointers.get(e.pointerId)!
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointers.size === 2) {
      const span = screenPinchSpan(pointers)
      if (pinchAnchorScreen >= minPinchSpan && span >= minPinchSpan * 0.5) {
        rig.distance = pinchAnchorCamera * (pinchAnchorScreen / span)
        rig.clampDistance()
      }
    } else if (pointers.size === 1) {
      const dx = e.clientX - prev.x
      const dy = e.clientY - prev.y
      if (dx !== 0 || dy !== 0) rig.applyDrag(dx, dy)
    }
  }

  const onEnd = (e: PointerEvent): void => {
    pointers.delete(e.pointerId)
    try {
      canvas.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    if (pointers.size < 2) pinchAnchorScreen = 0
  }

  const onWheel = (e: WheelEvent): void => {
    e.preventDefault()
    let dy = e.deltaY
    if (e.deltaMode === 1) dy *= 16
    else if (e.deltaMode === 2) dy *= 96
    rig.applyWheelZoom(dy)
  }

  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', onEnd)
  canvas.addEventListener('pointercancel', onEnd)
  canvas.addEventListener('lostpointercapture', onEnd)
  canvas.addEventListener('wheel', onWheel, { passive: false })

  return () => {
    pointers.clear()
    canvas.removeEventListener('pointerdown', onDown)
    canvas.removeEventListener('pointermove', onMove)
    canvas.removeEventListener('pointerup', onEnd)
    canvas.removeEventListener('pointercancel', onEnd)
    canvas.removeEventListener('lostpointercapture', onEnd)
    canvas.removeEventListener('wheel', onWheel)
  }
}

/** 首帧或部分移动端上 mount 可能为 0，setSize(0,0) 会导致整屏黑屏 */
function readMountSize(mount: HTMLElement): { w: number; h: number } {
  let w = mount.clientWidth
  let h = mount.clientHeight
  const vv = window.visualViewport
  if (w < 2 || h < 2) {
    w = vv?.width ?? window.innerWidth ?? document.documentElement.clientWidth ?? 2
    h = vv?.height ?? window.innerHeight ?? document.documentElement.clientHeight ?? 2
  }
  return { w: Math.max(2, Math.floor(w)), h: Math.max(2, Math.floor(h)) }
}

export function onResize(
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  mount: HTMLElement,
): void {
  const { w, h } = readMountSize(mount)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(w, h, false)
  const el = renderer.domElement
  el.style.position = 'absolute'
  el.style.inset = '0'
  el.style.width = '100%'
  el.style.height = '100%'
  el.style.display = 'block'
}
