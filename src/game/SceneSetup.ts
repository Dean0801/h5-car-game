import * as THREE from 'three'
import { ROOM, VEHICLE } from './constants'
import { addPlayroomInteractivityVisuals } from './playroomInteractivity'
import { decoratePlayroom } from './PlayroomDecor'

export type SceneContext = {
  scene: THREE.Scene
  renderer: THREE.WebGLRenderer
  vehicleMesh: THREE.Group
  timer: THREE.Timer
}

/** 不依赖光照的纯色体；墙面等仍用 Basic，避免部分设备上整屏发黑 */
function makeBoxMesh(
  color: number,
  size: THREE.Vector3,
  position: THREE.Vector3,
): THREE.Mesh {
  const geom = new THREE.BoxGeometry(size.x, size.y, size.z)
  const mat = new THREE.MeshBasicMaterial({ color })
  const mesh = new THREE.Mesh(geom, mat)
  mesh.position.copy(position)
  return mesh
}

function addVehiclePlaceholder(group: THREE.Group): void {
  const hx = VEHICLE.halfExtents.x * 2
  const hy = VEHICLE.halfExtents.y * 2
  const hz = VEHICLE.halfExtents.z * 2
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(hx, hy, hz),
    new THREE.MeshBasicMaterial({ color: 0xe63946 }),
  )
  group.add(body)
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(hx * 0.75, hy * 0.9, hz * 0.45),
    new THREE.MeshBasicMaterial({ color: 0x457b9d }),
  )
  cabin.position.set(0, hy * 0.35, -hz * 0.08)
  group.add(cabin)
}

export function createScene(): SceneContext {
  const scene = new THREE.Scene()
  const bg = new THREE.Color(0xb8d4f0)
  scene.background = bg

  const { halfWidth, halfDepth, wallThickness, wallHeight } = ROOM
  const t = wallThickness
  const outerHalfX = halfWidth + t / 2
  const outerHalfZ = halfDepth + t / 2
  const wallW = outerHalfX * 2
  const wallD = outerHalfZ * 2

  // 木地板
  const floor = makeBoxMesh(
    0xd4a574,
    new THREE.Vector3(wallW, 0.1, wallD),
    new THREE.Vector3(0, -0.05, 0),
  )
  scene.add(floor)

  // 柔和环境光：照亮 glTF 小车（MeshBasic 墙面不受影响）
  scene.add(new THREE.AmbientLight(0xffffff, 0.5))
  const hemi = new THREE.HemisphereLight(0xfff8f0, 0xc5d4e8, 0.65)
  hemi.position.set(0, wallHeight, 0)
  scene.add(hemi)

  // 四面墙不同马卡龙色
  const north = new THREE.Mesh(
    new THREE.BoxGeometry(wallW, wallHeight, t),
    new THREE.MeshBasicMaterial({ color: 0xffe0ef }),
  )
  north.position.set(0, wallHeight / 2, -outerHalfZ)
  scene.add(north)

  const south = new THREE.Mesh(
    new THREE.BoxGeometry(wallW, wallHeight, t),
    new THREE.MeshBasicMaterial({ color: 0xe1f5fe }),
  )
  south.position.set(0, wallHeight / 2, outerHalfZ)
  scene.add(south)

  const west = new THREE.Mesh(
    new THREE.BoxGeometry(t, wallHeight, halfDepth * 2),
    new THREE.MeshBasicMaterial({ color: 0xf3e5f5 }),
  )
  west.position.set(-outerHalfX, wallHeight / 2, 0)
  scene.add(west)

  const east = new THREE.Mesh(
    new THREE.BoxGeometry(t, wallHeight, halfDepth * 2),
    new THREE.MeshBasicMaterial({ color: 0xe8f5e9 }),
  )
  east.position.set(outerHalfX, wallHeight / 2, 0)
  scene.add(east)

  // 无天花板：从上方可直接看到室内；抬头为 scene.background

  decoratePlayroom(scene, { halfWidth, halfDepth, wallHeight })
  addPlayroomInteractivityVisuals(scene)

  const vehicleGroup = new THREE.Group()
  addVehiclePlaceholder(vehicleGroup)
  scene.add(vehicleGroup)

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    premultipliedAlpha: false,
    powerPreference: 'default',
  })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NoToneMapping
  renderer.toneMappingExposure = 1
  renderer.shadowMap.enabled = false
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(bg, 1)

  const timer = new THREE.Timer()

  return { scene, renderer, vehicleMesh: vehicleGroup, timer }
}
