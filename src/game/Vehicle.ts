import type { Body } from 'cannon-es'
import { Vec3 } from 'cannon-es'
import * as THREE from 'three'
import { VEHICLE } from './constants'
import { isFlatFloorSnapZone } from './playroomInteractivity'

const _bodyPos = new THREE.Vector3()
const _bodyQuat = new THREE.Quaternion()

/**
 * 贴地时接触求解会在竖直方向留下微小速度，车身与相机跟随后会整屏抖。
 * 仅抑制「近地面 + 竖直速度不大」的情况，蹦床等大弹跳不受影响。
 */
export function dampVerticalMicroBounce(body: Body, dt: number): void {
  const halfY = VEHICLE.halfExtents.y
  const bottom = body.position.y - halfY
  const vy = body.velocity.y
  const avy = Math.abs(vy)

  if (avy > 0.45) return
  if (bottom > 0.11 || bottom < -0.09) return

  const factor = Math.pow(0.68, dt * 60)
  body.velocity.y *= factor
  if (avy < 0.055) body.velocity.y = 0
}

/**
 * 主平地：把车体中心 Y 锁在「地板 y=0 + 半高」，从根上消掉竖直穿透抖动。
 * 非平地保护区见 `isFlatFloorSnapZone`。
 */
export function lockVehicleOnFlatFloor(body: Body): void {
  const { x, z } = body.position
  if (!isFlatFloorSnapZone(x, z)) return

  const halfY = VEHICLE.halfExtents.y
  const restY = halfY
  const bottom = body.position.y - halfY
  const vy = body.velocity.y

  if (bottom < 0.16 && bottom > -0.08 && vy < 0.4) {
    body.position.y = restY
    body.velocity.y = 0
  }
}

const _axis = new Vec3(0, 1, 0)
const _zeroAng = new Vec3(0, 0, 0)

/**
 * 街机式：每子步设世界系水平速度；仅靠施力会被摩擦约束抵消，且高 linearDamping 会迅速吃掉速度。
 */
export function applyVehicleControl(
  body: Body,
  inputX: number,
  inputZ: number,
  dt: number,
): void {
  const mag = Math.hypot(inputX, inputZ)
  if (mag < 0.04) {
    const coast = VEHICLE.coastDragPerSecond ** dt
    body.velocity.x *= coast
    body.velocity.z *= coast
    return
  }

  const nx = inputX / mag
  const nz = inputZ / mag
  const strength = Math.min(1, mag)

  // 与 mesh 本地 +Z 车头一致：世界前向 (sin(yaw), cos(yaw)) == (nx, nz)
  const yaw = Math.atan2(nx, nz)
  body.quaternion.setFromAxisAngle(_axis, yaw)
  body.angularVelocity.copy(_zeroAng)

  const speed = VEHICLE.maxSpeed * strength
  const vy = body.velocity.y
  body.velocity.set(nx * speed, vy, nz * speed)
}

export function syncVehicleMesh(body: Body, mesh: THREE.Object3D): void {
  const x = Number.isFinite(body.position.x) ? body.position.x : 0
  const y = Number.isFinite(body.position.y) ? body.position.y : 0.2
  const z = Number.isFinite(body.position.z) ? body.position.z : 0
  mesh.position.set(x, y, z)

  const qx = body.quaternion.x
  const qy = body.quaternion.y
  const qz = body.quaternion.z
  const qw = body.quaternion.w
  if (
    [qx, qy, qz, qw].every(Number.isFinite) &&
    Math.hypot(qx, qy, qz, qw) > 1e-6
  ) {
    mesh.quaternion.set(qx, qy, qz, qw).normalize()
  }
}

/**
 * 固定时间步物理 + 可变帧率渲染：在「本帧起点状态」与「本帧物理结束状态」之间插值，消除阶跃感。
 * blend = clamp(1 - accumulator / fixedDt, 0, 1)，与 Gaffer「Fix Your Timestep」一致。
 */
export function syncVehicleMeshInterpolated(
  body: Body,
  mesh: THREE.Object3D,
  prevPos: THREE.Vector3,
  prevQuat: THREE.Quaternion,
  blend: number,
): void {
  const t = Number.isFinite(blend) ? Math.min(1, Math.max(0, blend)) : 1
  _bodyPos.set(
    Number.isFinite(body.position.x) ? body.position.x : 0,
    Number.isFinite(body.position.y) ? body.position.y : 0.2,
    Number.isFinite(body.position.z) ? body.position.z : 0,
  )
  mesh.position.lerpVectors(prevPos, _bodyPos, t)

  const qx = body.quaternion.x
  const qy = body.quaternion.y
  const qz = body.quaternion.z
  const qw = body.quaternion.w
  if (
    [qx, qy, qz, qw].every(Number.isFinite) &&
    Math.hypot(qx, qy, qz, qw) > 1e-6
  ) {
    _bodyQuat.set(qx, qy, qz, qw).normalize()
    mesh.quaternion.copy(prevQuat).slerp(_bodyQuat, t)
  } else {
    mesh.quaternion.copy(prevQuat)
  }
}
