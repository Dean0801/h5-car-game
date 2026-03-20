import * as THREE from 'three'
import { PLAYROOM_WORLD_SCALE } from './constants'
import {
  GIANT_PLAYROOM_OBSTACLES,
  PLAYROOM_OBSTACLES,
  type ObstacleBox,
} from './playroomObstacles'

const S = PLAYROOM_WORLD_SCALE

function basicMat(color: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color })
}

function box(
  color: number,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  parent: THREE.Object3D,
): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    basicMat(color),
  )
  m.position.set(x, y, z)
  parent.add(m)
  return m
}

/** 墙裙：沿内墙一圈（内表面在 ±halfWidth / ±halfDepth） */
function addBaseboards(
  halfWidth: number,
  halfDepth: number,
  parent: THREE.Object3D,
): void {
  const h = 0.2 * S
  const d = 0.07 * S
  const y = h / 2 + 0.02 * S
  const mat = basicMat(0xffe8f0)
  const north = new THREE.Mesh(
    new THREE.BoxGeometry(halfWidth * 2 - 0.24 * S, h, d),
    mat,
  )
  north.position.set(0, y, -halfDepth + d / 2 + 0.02 * S)
  parent.add(north)
  const south = new THREE.Mesh(
    new THREE.BoxGeometry(halfWidth * 2 - 0.24 * S, h, d),
    mat.clone(),
  )
  south.position.set(0, y, halfDepth - d / 2 - 0.02 * S)
  parent.add(south)
  const west = new THREE.Mesh(
    new THREE.BoxGeometry(d, h, halfDepth * 2 - 0.24 * S),
    mat.clone(),
  )
  west.position.set(-halfWidth + d / 2 + 0.02 * S, y, 0)
  parent.add(west)
  const east = new THREE.Mesh(
    new THREE.BoxGeometry(d, h, halfDepth * 2 - 0.24 * S),
    mat.clone(),
  )
  east.position.set(halfWidth - d / 2 - 0.02 * S, y, 0)
  parent.add(east)
}

/** 窗户：南墙内侧（z ≈ halfDepth） */
function addWindow(wallH: number, halfDepth: number, parent: THREE.Object3D): void {
  const ww = 2.8 * S
  const wh = 1.35 * S
  const z = halfDepth - 0.06 * S
  const y = wallH * 0.58
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(ww + 0.16 * S, wh + 0.16 * S, 0.08 * S),
    basicMat(0xe8dcc8),
  )
  frame.position.set(0, y, z)
  parent.add(frame)
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(ww, wh),
    basicMat(0xd6eefc),
  )
  glass.position.set(0, y, z - 0.05 * S)
  parent.add(glass)
  const barV = new THREE.Mesh(
    new THREE.BoxGeometry(0.06 * S, wh, 0.04 * S),
    basicMat(0xffffff),
  )
  barV.position.set(0, y, z - 0.03 * S)
  parent.add(barV)
  const barH = new THREE.Mesh(
    new THREE.BoxGeometry(ww, 0.06 * S, 0.04 * S),
    basicMat(0xffffff),
  )
  barH.position.set(0, y, z - 0.03 * S)
  parent.add(barH)
}

/** 游戏垫：彩色拼块（随大房间加宽） */
function addPlayMat(parent: THREE.Object3D): void {
  const g = new THREE.Group()
  g.position.set(3 * S, 0.02 * S, 2 * S)
  const colors = [0xff6b9d, 0x6bcbff, 0xffe066, 0x9bff8f, 0xc9a0ff, 0xff9f6b]
  let i = 0
  const tile = 0.92 * S
  const step = 0.95 * S
  for (let gx = -3; gx <= 3; gx++) {
    for (let gz = -3; gz <= 3; gz++) {
      const tileMesh = new THREE.Mesh(
        new THREE.BoxGeometry(tile, 0.03 * S, tile),
        basicMat(colors[i % colors.length]!),
      )
      tileMesh.position.set(gx * step, 0, gz * step)
      g.add(tileMesh)
      i += 1
    }
  }
  parent.add(g)
}

/** 占位：牛仔风玩偶几何体；若存在 `/models/toys/woody.glb` 则由 LicensedToyFigures 替换 */
function addCowboyToy(parent: THREE.Object3D, x: number, z: number): void {
  const g = new THREE.Group()
  g.position.set(x, 0, z)
  box(0xf4d0a4, 0.22, 0.24, 0.16, 0, 0.24, 0, g) // 头
  box(0x5c4033, 0.28, 0.12, 0.22, 0, 0.38, 0, g) // 帽檐
  box(0xffd54a, 0.2, 0.22, 0.14, 0, 0.12, 0, g) // 上衣
  box(0x3d5afe, 0.18, 0.18, 0.12, 0, 0.02, 0, g) // 裤
  box(0x6d4c41, 0.08, 0.06, 0.2, 0.1, 0.02, 0.02, g) // 靴
  box(0x6d4c41, 0.08, 0.06, 0.2, -0.1, 0.02, 0.02, g)
  parent.add(g)
}

/** 占位：太空人风玩具；可由 `/models/toys/buzz.glb` 替换 */
function addSpaceToy(parent: THREE.Object3D, x: number, z: number): void {
  const g = new THREE.Group()
  g.position.set(x, 0, z)
  box(0xe8eeff, 0.2, 0.26, 0.14, 0, 0.22, 0, g) // 躯干
  box(0xd0f4ff, 0.24, 0.14, 0.2, 0, 0.36, 0, g) // 头盔
  box(0x76ff03, 0.12, 0.08, 0.06, 0, 0.28, 0.1, g) // 侧翼
  box(0x76ff03, 0.12, 0.08, 0.06, 0, 0.28, -0.1, g)
  box(0x7c4dff, 0.06, 0.18, 0.08, 0, 0.1, 0, g) // 腿
  box(0x7c4dff, 0.06, 0.18, 0.08, 0, 0.1, 0.08, g)
  parent.add(g)
}

/** 占位：恐龙造型；可由 `/models/toys/rex.glb` 替换 */
function addDinoToy(parent: THREE.Object3D, x: number, z: number): void {
  const g = new THREE.Group()
  g.position.set(x, 0, z)
  box(0x66bb6a, 0.55, 0.2, 0.28, 0, 0.18, 0, g) // 身
  box(0x81c784, 0.22, 0.18, 0.2, 0.32, 0.22, 0.06, g) // 头
  box(0x43a047, 0.14, 0.08, 0.1, 0.48, 0.16, 0.06, g) // 嘴
  box(0x388e3c, 0.12, 0.24, 0.1, -0.28, 0.14, -0.05, g) // 尾
  parent.add(g)
}

function addRingStack(parent: THREE.Object3D, x: number, z: number): void {
  const g = new THREE.Group()
  g.position.set(x, 0, z)
  box(0xffcc80, 0.35, 0.08, 0.35, 0, 0.04, 0, g) // 底板
  const ringColors = [0xe53935, 0xfb8c00, 0xfdd835, 0x43a047, 0x1e88e5]
  let y = 0.12
  for (let r = 0; r < ringColors.length; r++) {
    const rad = 0.26 - r * 0.04
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(rad, 0.045, 10, 24),
      basicMat(ringColors[r]!),
    )
    torus.rotation.x = Math.PI / 2
    torus.position.y = y
    g.add(torus)
    y += 0.07
  }
  g.scale.setScalar(S)
  parent.add(g)
}

function addRocketToy(parent: THREE.Object3D, x: number, z: number): void {
  const g = new THREE.Group()
  g.position.set(x, 0, z)
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.16, 0.42, 16),
    basicMat(0xe57373),
  )
  body.position.y = 0.28
  g.add(body)
  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.2, 16),
    basicMat(0xffab91),
  )
  nose.position.y = 0.55
  g.add(nose)
  const fin = basicMat(0x5c6bc0)
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.2), fin)
    const a = (i / 3) * Math.PI * 2
    f.position.set(Math.cos(a) * 0.14, 0.12, Math.sin(a) * 0.14)
    f.rotation.y = -a
    g.add(f)
  }
  g.scale.setScalar(S)
  parent.add(g)
}

function addBlockPile(parent: THREE.Object3D, x: number, z: number): void {
  const g = new THREE.Group()
  g.position.set(x, 0, z)
  const cols = [0xef5350, 0x42a5f5, 0xffca28, 0xab47bc]
  let i = 0
  box(cols[i++ % 4]!, 0.28, 0.12, 0.28, 0, 0.06, 0, g)
  box(cols[i++ % 4]!, 0.24, 0.12, 0.24, 0.08, 0.18, 0.06, g)
  box(cols[i++ % 4]!, 0.22, 0.1, 0.22, -0.06, 0.26, -0.04, g)
  g.scale.setScalar(S)
  parent.add(g)
}

/** 家具与障碍对应的简单网格（与 PLAYROOM_OBSTACLES 布局一致） */
export function addPlayroomFurniture(parent: THREE.Object3D): void {
  const bed = PLAYROOM_OBSTACLES[0]!
  const shelf = PLAYROOM_OBSTACLES[1]!
  const chest = PLAYROOM_OBSTACLES[2]!
  const desk = PLAYROOM_OBSTACLES[3]!
  const blocks = PLAYROOM_OBSTACLES[4]!
  const ringOb = PLAYROOM_OBSTACLES[5]!
  const rocketOb = PLAYROOM_OBSTACLES[6]!
  const cowboyPos = PLAYROOM_OBSTACLES[7]!
  const spacePos = PLAYROOM_OBSTACLES[8]!
  const dinoPos = PLAYROOM_OBSTACLES[9]!

  const bedMesh = new THREE.Mesh(
    new THREE.BoxGeometry(bed.half[0] * 2, bed.half[1] * 2, bed.half[2] * 2),
    basicMat(0xffcdd2),
  )
  bedMesh.position.set(bed.pos[0], bed.pos[1], bed.pos[2])
  parent.add(bedMesh)
  const pillow = new THREE.Mesh(
    new THREE.BoxGeometry(1.1 * S, 0.14 * S, 0.55 * S),
    basicMat(0xffffff),
  )
  pillow.position.set(
    bed.pos[0] - 0.8 * S,
    bed.pos[1] + bed.half[1] + 0.07 * S,
    bed.pos[2] - 0.35 * S,
  )
  parent.add(pillow)

  const shelfMesh = new THREE.Mesh(
    new THREE.BoxGeometry(shelf.half[0] * 2, shelf.half[1] * 2, shelf.half[2] * 2),
    basicMat(0xd7ccc8),
  )
  shelfMesh.position.set(shelf.pos[0], shelf.pos[1], shelf.pos[2])
  parent.add(shelfMesh)
  for (let row = 0; row < 3; row++) {
    const plank = new THREE.Mesh(
      new THREE.BoxGeometry(shelf.half[0] * 1.6, 0.04 * S, shelf.half[2] * 1.9),
      basicMat(0xbcaaa4),
    )
    plank.position.set(
      shelf.pos[0],
      shelf.pos[1] - shelf.half[1] + (0.35 + row * 0.55) * S,
      shelf.pos[2],
    )
    parent.add(plank)
  }

  const chestMesh = new THREE.Mesh(
    new THREE.BoxGeometry(chest.half[0] * 2, chest.half[1] * 2, chest.half[2] * 2),
    basicMat(0xffb74d),
  )
  chestMesh.position.set(chest.pos[0], chest.pos[1], chest.pos[2])
  parent.add(chestMesh)
  const lid = new THREE.Mesh(
    new THREE.BoxGeometry(chest.half[0] * 2.02, 0.06 * S, chest.half[2] * 2.02),
    basicMat(0xff9800),
  )
  lid.position.set(
    chest.pos[0],
    chest.pos[1] + chest.half[1] + 0.03 * S,
    chest.pos[2],
  )
  parent.add(lid)

  const deskMesh = new THREE.Mesh(
    new THREE.BoxGeometry(desk.half[0] * 2, desk.half[1] * 2, desk.half[2] * 2),
    basicMat(0xa1887f),
  )
  deskMesh.position.set(desk.pos[0], desk.pos[1], desk.pos[2])
  parent.add(deskMesh)
  const legMat = basicMat(0x8d6e63)
  const inset = 0.12 * S
  for (const [lx, lz] of [
    [-desk.half[0] + inset, -desk.half[2] + inset],
    [desk.half[0] - inset, -desk.half[2] + inset],
    [-desk.half[0] + inset, desk.half[2] - inset],
    [desk.half[0] - inset, desk.half[2] - inset],
  ] as const) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06 * S, 0.07 * S, 0.36 * S, 8),
      legMat,
    )
    leg.position.set(desk.pos[0] + lx, 0.18 * S, desk.pos[2] + lz)
    parent.add(leg)
  }

  addBlockPile(parent, blocks.pos[0], blocks.pos[2])
  addRingStack(parent, ringOb.pos[0], ringOb.pos[2])
  addRocketToy(parent, rocketOb.pos[0], rocketOb.pos[2])

  const woodySlot = new THREE.Group()
  woodySlot.name = 'ToySlot_woody'
  woodySlot.position.set(cowboyPos.pos[0], 0, cowboyPos.pos[2])
  woodySlot.scale.setScalar(S)
  parent.add(woodySlot)
  addCowboyToy(woodySlot, 0, 0)

  const buzzSlot = new THREE.Group()
  buzzSlot.name = 'ToySlot_buzz'
  buzzSlot.position.set(spacePos.pos[0], 0, spacePos.pos[2])
  buzzSlot.scale.setScalar(S)
  parent.add(buzzSlot)
  addSpaceToy(buzzSlot, 0, 0)

  const rexSlot = new THREE.Group()
  rexSlot.name = 'ToySlot_rex'
  rexSlot.position.set(dinoPos.pos[0], 0, dinoPos.pos[2])
  rexSlot.scale.setScalar(S)
  parent.add(rexSlot)
  addDinoToy(rexSlot, 0, 0)
}

/** 巨型家具：与 `GIANT_PLAYROOM_OBSTACLES` 顺序、包围盒一致 */
function addGiantPlayroomFurniture(parent: THREE.Object3D): void {
  const g = GIANT_PLAYROOM_OBSTACLES
  addGiantTable(parent, g[0]!)
  addGiantArmchair(parent, g[1]!, 1)
  addGiantArmchair(parent, g[2]!, -1)
  addGiantBedBlock(parent, g[3]!)
  addGiantWardrobe(parent, g[4]!)
  addGiantCoffeeTable(parent, g[5]!)
  addGiantOttoman(parent, g[6]!)
  addGiantDeskChair(parent, g[7]!)
}

function addGiantTable(parent: THREE.Object3D, o: ObstacleBox): void {
  const [ox, oy, oz] = o.pos
  const [hx, hy, hz] = o.half
  const topT = Math.min(0.32 * S, hy * 0.22)
  const topY = oy + hy - topT / 2
  box(0xcfd8dc, hx * 2 * 0.98, topT, hz * 2 * 0.98, ox, topY, oz, parent)
  const legR = Math.max(0.18 * S, hx * 0.045)
  const legTop = topY - topT / 2 - 0.04 * S
  const legBot = 0.06 * S
  const legH = Math.max(legTop - legBot, 0.15 * S)
  const ix = hx * 0.72
  const iz = hz * 0.72
  const legMat = basicMat(0x90a4ae)
  for (const [lx, lz] of [
    [-ix, -iz],
    [ix, -iz],
    [-ix, iz],
    [ix, iz],
  ] as const) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(legR, legR * 1.08, legH, 10),
      legMat,
    )
    leg.position.set(ox + lx, legBot + legH / 2, oz + lz)
    parent.add(leg)
  }
}

function addGiantArmchair(
  parent: THREE.Object3D,
  o: ObstacleBox,
  backZSign: number,
): void {
  const [ox, oy, oz] = o.pos
  const [hx, hy, hz] = o.half
  const seatH = hy * 0.38
  const seatY = oy - hy + seatH / 2 + 0.08 * S
  box(0xb0bec5, hx * 1.85, seatH, hz * 1.75, ox, seatY, oz, parent)
  const backT = hx * 0.22
  const backH = hy * 2 - seatH - 0.12 * S
  const backZ = oz + backZSign * (hz - backT / 2 - 0.02 * S)
  box(
    0x94a7b0,
    hx * 1.78,
    backH,
    backT,
    ox,
    seatY + seatH / 2 + backH / 2 - 0.05 * S,
    backZ,
    parent,
  )
  const armW = hx * 0.28
  const armD = hz * 0.55
  const armY = seatY + seatH * 0.15
  const armX = hx - armW / 2 - 0.02 * S
  box(0xa8b9c1, armW, seatH * 1.1, armD, ox - armX, armY, oz, parent)
  box(0xa8b9c1, armW, seatH * 1.1, armD, ox + armX, armY, oz, parent)
}

function addGiantBedBlock(parent: THREE.Object3D, o: ObstacleBox): void {
  const [ox, oy, oz] = o.pos
  const [hx, hy, hz] = o.half
  const mattressH = hy * 0.55
  const matY = oy - hy + mattressH / 2
  box(0xf8bbd9, hx * 1.96, mattressH, hz * 1.94, ox, matY, oz, parent)
  const headT = hz * 0.18
  const headH = hy * 2.1
  const headZ = oz - hz + headT / 2 + 0.04 * S
  box(0xec407a, hx * 1.98, headH, headT, ox, oy - hy + headH / 2, headZ, parent)
  const pillow = new THREE.Mesh(
    new THREE.BoxGeometry(hx * 1.2, 0.22 * S, hz * 0.55),
    basicMat(0xffffff),
  )
  pillow.position.set(
    ox + hx * 0.35,
    matY + mattressH / 2 + 0.11 * S,
    oz + hz * 0.15,
  )
  parent.add(pillow)
}

function addGiantWardrobe(parent: THREE.Object3D, o: ObstacleBox): void {
  const [ox, oy, oz] = o.pos
  const [hx, hy, hz] = o.half
  box(0xd7ccc8, hx * 2, hy * 2, hz * 2, ox, oy, oz, parent)
  const trim = new THREE.Mesh(
    new THREE.BoxGeometry(0.12 * S, hy * 1.96, hz * 1.98),
    basicMat(0x8d6e63),
  )
  trim.position.set(ox, oy, oz)
  parent.add(trim)
  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.16 * S, 12, 10),
    basicMat(0xffe082),
  )
  knob.position.set(ox + hx * 0.35, oy, oz + hz * 0.65)
  parent.add(knob)
}

function addGiantCoffeeTable(parent: THREE.Object3D, o: ObstacleBox): void {
  const [ox, oy, oz] = o.pos
  const [hx, hy, hz] = o.half
  const topT = Math.min(0.22 * S, hy * 0.35)
  const topY = oy + hy - topT / 2
  box(0xbcaaa4, hx * 2 * 0.96, topT, hz * 2 * 0.96, ox, topY, oz, parent)
  const leg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14 * S, 0.16 * S, oy + hy - topT - 0.08 * S, 8),
    basicMat(0x8d6e63),
  )
  leg.position.set(ox, (oy + hy - topT - 0.08 * S) / 2, oz)
  parent.add(leg)
}

function addGiantOttoman(parent: THREE.Object3D, o: ObstacleBox): void {
  const [ox, oy, oz] = o.pos
  const [hx, hy, hz] = o.half
  box(0xce93d8, hx * 1.92, hy * 0.55, hz * 1.92, ox, oy - hy + hy * 0.275, oz, parent)
  box(0xba68c8, hx * 1.75, hy * 0.42, hz * 1.75, ox, oy - hy + hy * 0.65, oz, parent)
}

function addGiantDeskChair(parent: THREE.Object3D, o: ObstacleBox): void {
  const [ox, oy, oz] = o.pos
  const [hx, hy, hz] = o.half
  const stemH = oy - hy + 0.25 * S
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2 * S, 0.26 * S, stemH, 10),
    basicMat(0x424242),
  )
  stem.position.set(ox, stemH / 2, oz)
  parent.add(stem)
  const seatY = stemH + 0.12 * S
  box(0x5c6bc0, hx * 1.5, 0.2 * S, hz * 1.35, ox, seatY, oz, parent)
  const backH = hy * 1.65
  box(
    0x3949ab,
    hx * 1.35,
    backH,
    0.16 * S,
    ox,
    seatY + backH / 2 - 0.02 * S,
    oz - hz + 0.12 * S,
    parent,
  )
}

export function decoratePlayroom(
  scene: THREE.Scene,
  opts: {
    halfWidth: number
    halfDepth: number
    wallHeight: number
  },
): void {
  const { halfWidth, halfDepth, wallHeight } = opts

  addBaseboards(halfWidth, halfDepth, scene)
  addWindow(wallHeight, halfDepth, scene)
  addPlayMat(scene)

  // 北墙星星贴纸（朝向南，贴在北墙内表面附近）
  const starGroup = new THREE.Group()
  const rand = mulberry32(0x9e3779b9)
  for (let i = 0; i < 22; i++) {
    const star = new THREE.Mesh(
      new THREE.BoxGeometry(0.12 * S, 0.12 * S, 0.02 * S),
      basicMat(0xfff59d),
    )
    star.position.set(
      (rand() - 0.5) * (halfWidth * 1.75),
      0.45 * S + rand() * (wallHeight - 0.75 * S),
      -halfDepth + 0.05 * S,
    )
    starGroup.add(star)
  }
  scene.add(starGroup)

  addPlayroomFurniture(scene)
  addGiantPlayroomFurniture(scene)
}

/** 确定性随机，避免每帧热加载时星星位置跳动 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
