import {
  Body,
  Box,
  ContactMaterial,
  GSSolver,
  Material,
  Vec3,
  World,
} from 'cannon-es'
import { PHYSICS, ROOM, VEHICLE } from './constants'
import { addPlayroomInteractives } from './playroomInteractivity'
import { PLAYROOM_OBSTACLES } from './playroomObstacles'

export type PhysicsContext = {
  world: World
  vehicleBody: Body
}

function staticBox(
  pos: [number, number, number],
  halfExtents: [number, number, number],
): Body {
  const body = new Body({ mass: 0 })
  body.addShape(new Box(new Vec3(...halfExtents)))
  body.position.set(pos[0], pos[1], pos[2])
  return body
}

/**
 * Floor (y=0 top), four walls, furniture boxes; dynamic vehicle body.
 */
export function createPhysicsWorld(): PhysicsContext {
  const world = new World({
    gravity: new Vec3(0, PHYSICS.gravityY, 0),
  })
  ;(world.solver as GSSolver).iterations = 32
  world.defaultContactMaterial.friction = 0.35
  world.defaultContactMaterial.restitution = 0.05

  const floorMat = new Material('floor')
  const vehicleMat = new Material('vehicle')
  world.addContactMaterial(
    new ContactMaterial(floorMat, vehicleMat, {
      friction: 0.03,
      restitution: 0.02,
    }),
  )

  const { halfWidth, halfDepth, wallThickness, wallHeight } = ROOM
  const t = wallThickness / 2
  const wh = wallHeight / 2
  const outerHalfX = halfWidth + t
  const outerHalfZ = halfDepth + t

  // Floor: top surface at y = 0
  const floor = staticBox(
    [0, -0.05, 0],
    [outerHalfX, 0.05, outerHalfZ],
  )
  floor.material = floorMat
  world.addBody(floor)

  // North (-Z) / South (+Z) — span outer width in X
  world.addBody(staticBox([0, wh, -outerHalfZ], [outerHalfX, wh, t]))
  world.addBody(staticBox([0, wh, outerHalfZ], [outerHalfX, wh, t]))

  // West (-X) / East (+X) — inner depth in Z (no double corner overlap on physics)
  world.addBody(staticBox([-outerHalfX, wh, 0], [t, wh, halfDepth]))
  world.addBody(staticBox([outerHalfX, wh, 0], [t, wh, halfDepth]))

  for (const o of PLAYROOM_OBSTACLES) {
    world.addBody(staticBox(o.pos, o.half))
  }

  addPlayroomInteractives(world, floorMat, vehicleMat)

  const { halfExtents, mass, linearDamping, angularDamping } = VEHICLE
  const vehicleBody = new Body({
    mass,
    linearDamping,
    angularDamping,
    angularFactor: new Vec3(0, 1, 0),
    allowSleep: false,
    material: vehicleMat,
  })
  vehicleBody.addShape(
    new Box(new Vec3(halfExtents.x, halfExtents.y, halfExtents.z)),
  )
  vehicleBody.position.set(0, halfExtents.y + 0.02, 0)
  world.addBody(vehicleBody)

  return { world, vehicleBody }
}

/** Clamp horizontal speed to reduce tunneling through thin contacts */
export function clampHorizontalSpeed(body: Body, max: number): void {
  const v = body.velocity
  const vx = v.x
  const vz = v.z
  const h = Math.hypot(vx, vz)
  if (h > max && h > 1e-6) {
    const s = max / h
    v.x = vx * s
    v.z = vz * s
  }
}
