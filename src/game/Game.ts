import * as THREE from 'three'
import { applyWaterDrag } from './playroomInteractivity'
import { clampHorizontalSpeed, createPhysicsWorld } from './PhysicsWorld'
import { createScene } from './SceneSetup'
import {
  applyVehicleControl,
  dampVerticalMicroBounce,
  lockVehicleOnFlatFloor,
  syncVehicleMesh,
  syncVehicleMeshInterpolated,
} from './Vehicle'
import { attachCameraControls, CameraOrbitRig, onResize } from './CameraRig'
import { TouchJoystick } from './TouchJoystick'
import { KeyboardSteer } from './KeyboardSteer'
import { PHYSICS, VEHICLE } from './constants'
import { loadToyCarModel } from './VehicleVisual'
import { loadLicensedToyFigures } from './LicensedToyFigures'
import { loadKhronosPlayroomProps } from './KhronosRoomProps'

const _viewForward = new THREE.Vector3()
const _viewRight = new THREE.Vector3()

function mergeSteer(
  jx: number,
  jz: number,
  kx: number,
  kz: number,
): { x: number; z: number } {
  let x = jx + kx
  let z = jz + kz
  const m = Math.hypot(x, z)
  if (m > 1 && m > 1e-6) {
    x /= m
    z /= m
  }
  return { x, z }
}

export class Game {
  private readonly sceneCtx: ReturnType<typeof createScene>
  private readonly physicsCtx: ReturnType<typeof createPhysicsWorld>
  private readonly camera: THREE.PerspectiveCamera
  private readonly joystick: TouchJoystick
  private readonly keyboard: KeyboardSteer
  private readonly cameraRig: CameraOrbitRig
  private readonly detachCameraControls: () => void
  private readonly _physPrevPos = new THREE.Vector3()
  private readonly _physPrevQuat = new THREE.Quaternion()
  private accumulator = 0
  private raf = 0
  private readonly maxFrameTime = 0.1

  constructor(mount: HTMLElement) {
    this.sceneCtx = createScene()
    loadToyCarModel(this.sceneCtx.vehicleMesh)
    loadLicensedToyFigures(this.sceneCtx.scene)
    loadKhronosPlayroomProps(this.sceneCtx.scene)
    this.physicsCtx = createPhysicsWorld()
    const { renderer, timer } = this.sceneCtx
    timer.connect(document)

    this.camera = new THREE.PerspectiveCamera(52, 1, 0.08, 900)
    this.camera.position.set(0, 2.2, -2.2)

    const joyRoot = document.getElementById('joystick-root')
    if (!joyRoot) throw new Error('#joystick-root missing')
    this.joystick = new TouchJoystick(joyRoot)
    this.keyboard = new KeyboardSteer(window)
    this.cameraRig = new CameraOrbitRig()
    mount.prepend(renderer.domElement)
    this.detachCameraControls = attachCameraControls(
      renderer.domElement,
      this.cameraRig,
    )
    onResize(this.camera, renderer, mount)
    // 再等一帧布局完成后再量一次，避免首帧 clientWidth/Height 为 0
    requestAnimationFrame(() => {
      onResize(this.camera, renderer, mount)
    })

    const ro = new ResizeObserver(() => {
      onResize(this.camera, renderer, mount)
    })
    ro.observe(mount)
    window.addEventListener('orientationchange', () => {
      requestAnimationFrame(() => onResize(this.camera, renderer, mount))
    })
    window.visualViewport?.addEventListener('resize', () => {
      onResize(this.camera, renderer, mount)
    })

    this.raf = requestAnimationFrame(this.loop)
  }

  private readonly loop = (time: number): void => {
    const { scene, renderer, vehicleMesh, timer } = this.sceneCtx
    const { world, vehicleBody } = this.physicsCtx

    timer.update(time)
    let delta = Math.min(timer.getDelta(), this.maxFrameTime)
    // Timer 在 document.hidden 时 delta 为 0，会导致整帧不跑物理、摇杆也不生效
    if (delta <= 0) delta = PHYSICS.fixedDt

    this.accumulator += delta
    if (this.accumulator > this.maxFrameTime) {
      this.accumulator = this.maxFrameTime
    }

    const fixedDt = PHYSICS.fixedDt
    this._physPrevPos.set(
      vehicleBody.position.x,
      vehicleBody.position.y,
      vehicleBody.position.z,
    )
    this._physPrevQuat.set(
      vehicleBody.quaternion.x,
      vehicleBody.quaternion.y,
      vehicleBody.quaternion.z,
      vehicleBody.quaternion.w,
    )
    let steps = 0
    while (this.accumulator >= fixedDt && steps < PHYSICS.maxSubSteps) {
      world.step(fixedDt)
      // 放在 step 之后：摩擦求解不会再把本帧目标水平速度完全抵消
      const key = this.keyboard.getVector()
      const merged = mergeSteer(
        this.joystick.out.x,
        this.joystick.out.z,
        key.x,
        key.z,
      )
      this.cameraRig.getHorizontalViewBasis(_viewForward, _viewRight)
      const ix =
        merged.x * _viewRight.x + merged.z * _viewForward.x
      const iz =
        merged.x * _viewRight.z + merged.z * _viewForward.z
      applyVehicleControl(vehicleBody, ix, iz, fixedDt)
      clampHorizontalSpeed(vehicleBody, VEHICLE.maxSpeed)
      applyWaterDrag(vehicleBody, fixedDt)
      dampVerticalMicroBounce(vehicleBody, fixedDt)
      lockVehicleOnFlatFloor(vehicleBody)
      this.accumulator -= fixedDt
      steps += 1
    }

    if (steps === 0) {
      syncVehicleMesh(vehicleBody, vehicleMesh)
    } else {
      const physBlend = THREE.MathUtils.clamp(
        1 - this.accumulator / fixedDt,
        0,
        1,
      )
      syncVehicleMeshInterpolated(
        vehicleBody,
        vehicleMesh,
        this._physPrevPos,
        this._physPrevQuat,
        physBlend,
      )
    }
    this.cameraRig.updateCamera(this.camera, vehicleMesh.position, delta)

    renderer.render(scene, this.camera)
    this.raf = requestAnimationFrame(this.loop)
  }

  dispose(): void {
    cancelAnimationFrame(this.raf)
    this.detachCameraControls()
    this.keyboard.dispose()
    this.sceneCtx.timer.disconnect()
    this.sceneCtx.timer.dispose()
    const { domElement } = this.sceneCtx.renderer
    this.sceneCtx.renderer.dispose()
    domElement.remove()
  }
}
