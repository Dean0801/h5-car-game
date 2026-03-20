import type { Body } from 'cannon-es'
import { Body as CannonBody, Box, ContactMaterial, Material, Vec3, World } from 'cannon-es'
import * as THREE from 'three'
import { PLAYROOM_WORLD_SCALE } from './constants'

const S = PLAYROOM_WORLD_SCALE

/** 倾斜跳台：沿局部 +Z 方向抬升，车头朝 +Z 冲上易起飞 */
export const RAMP = {
  center: new Vec3(-10 * S, 0.38 * S, 4 * S),
  halfExtents: new Vec3(2.75 * S, 0.16 * S, 1.55 * S),
  /** 弧度：先抬前端（绕 X 负向） */
  euler: new THREE.Euler(-0.4, 0.22, 0, 'XYZ'),
} as const

/** 蹦床：高恢复系数，与地板分离避免整屋弹 */
export const TRAMPOLINE = {
  center: new Vec3(-3 * S, 0.07 * S, 12 * S),
  half: new Vec3(1.15 * S, 0.07 * S, 1.15 * S),
} as const

/** 水潭：水平区域 + 近似水面高度（车体中心低于此则视为涉水） */
export const WATER = {
  cx: 12 * S,
  cz: -8 * S,
  halfW: 3.8 * S,
  halfD: 2.8 * S,
  /** 车体 box 中心在此高度以下且在地面上方时施加水阻 */
  surfaceY: 0.42 * S,
  minY: 0.08 * S,
} as const

/**
 * 主平地可安全「锁车高」的 XZ 区域：跳台 / 蹦床 / 水潭附近不锁，避免破坏交互。
 */
export function isFlatFloorSnapZone(x: number, z: number): boolean {
  const { center: tc, half: th } = TRAMPOLINE
  if (
    Math.abs(x - tc.x) < th.x + 1.4 * S &&
    Math.abs(z - tc.z) < th.z + 1.4 * S
  ) {
    return false
  }

  const { cx: wx, cz: wz, halfW, halfD } = WATER
  if (
    Math.abs(x - wx) < halfW + 0.8 * S &&
    Math.abs(z - wz) < halfD + 0.8 * S
  ) {
    return false
  }

  const rc = RAMP.center
  const pad = 5 * S
  if (
    Math.abs(x - rc.x) < RAMP.halfExtents.x + pad &&
    Math.abs(z - rc.z) < RAMP.halfExtents.z + pad
  ) {
    return false
  }

  return true
}

const _q = new THREE.Quaternion()

function staticRotatedBox(
  center: Vec3,
  half: Vec3,
  euler: THREE.Euler,
): CannonBody {
  const body = new CannonBody({ mass: 0 })
  body.addShape(new Box(half))
  body.position.copy(center)
  _q.setFromEuler(euler)
  body.quaternion.set(_q.x, _q.y, _q.z, _q.w)
  return body
}

/**
 * 跳台 / 蹦床刚体与材质；水潭无碰撞体，由 `applyWaterDrag` 处理。
 */
export function addPlayroomInteractives(
  world: World,
  floorMat: Material,
  vehicleMat: Material,
): void {
  const bounceMat = new Material('trampoline')
  world.addContactMaterial(
    new ContactMaterial(vehicleMat, bounceMat, {
      friction: 0.06,
      restitution: 0.92,
    }),
  )

  const ramp = staticRotatedBox(
    new Vec3(RAMP.center.x, RAMP.center.y, RAMP.center.z),
    new Vec3(RAMP.halfExtents.x, RAMP.halfExtents.y, RAMP.halfExtents.z),
    RAMP.euler,
  )
  ramp.material = floorMat
  world.addBody(ramp)

  const tramp = new CannonBody({ mass: 0 })
  tramp.addShape(new Box(TRAMPOLINE.half))
  tramp.position.copy(TRAMPOLINE.center)
  tramp.material = bounceMat
  world.addBody(tramp)
}

/**
 * 水潭内：水平阻力 + 略减竖直速度，模拟涉水；每物理子步调用一次。
 */
export function applyWaterDrag(body: Body, dt: number): void {
  const { cx, cz, halfW, halfD, surfaceY, minY } = WATER
  const { x, y, z } = body.position
  if (y > surfaceY || y < minY) return
  if (Math.abs(x - cx) > halfW || Math.abs(z - cz) > halfD) return

  const drag = Math.pow(0.78, dt * 60)
  body.velocity.x *= drag
  body.velocity.z *= drag
  body.velocity.y *= Math.pow(0.92, dt * 60)
}

export function addPlayroomInteractivityVisuals(scene: THREE.Scene): void {
  const rampMesh = new THREE.Mesh(
    new THREE.BoxGeometry(
      RAMP.halfExtents.x * 2,
      RAMP.halfExtents.y * 2,
      RAMP.halfExtents.z * 2,
    ),
    new THREE.MeshStandardMaterial({
      color: 0xc9a227,
      roughness: 0.55,
      metalness: 0.08,
    }),
  )
  rampMesh.position.set(RAMP.center.x, RAMP.center.y, RAMP.center.z)
  rampMesh.quaternion.setFromEuler(RAMP.euler)
  scene.add(rampMesh)

  const trampMesh = new THREE.Mesh(
    new THREE.BoxGeometry(
      TRAMPOLINE.half.x * 2,
      TRAMPOLINE.half.y * 2,
      TRAMPOLINE.half.z * 2,
    ),
    new THREE.MeshStandardMaterial({
      color: 0xff6b9d,
      emissive: 0x330011,
      roughness: 0.4,
      metalness: 0.05,
    }),
  )
  trampMesh.position.set(
    TRAMPOLINE.center.x,
    TRAMPOLINE.center.y,
    TRAMPOLINE.center.z,
  )
  scene.add(trampMesh)

  const waterGeom = new THREE.PlaneGeometry(WATER.halfW * 2, WATER.halfD * 2, 1, 1)
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x2a8fbd,
    transparent: true,
    opacity: 0.52,
    roughness: 0.15,
    metalness: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const water = new THREE.Mesh(waterGeom, waterMat)
  water.rotation.x = -Math.PI / 2
  water.position.set(WATER.cx, 0.06, WATER.cz)
  water.renderOrder = 1
  scene.add(water)

  const rim = new THREE.Mesh(
    new THREE.RingGeometry(
      Math.min(WATER.halfW, WATER.halfD) * 0.15,
      Math.min(WATER.halfW, WATER.halfD) * 0.22,
      32,
    ),
    new THREE.MeshBasicMaterial({ color: 0x8fd4e8, transparent: true, opacity: 0.85 }),
  )
  rim.rotation.x = -Math.PI / 2
  rim.position.set(WATER.cx, 0.065, WATER.cz)
  scene.add(rim)
}
