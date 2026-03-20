import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { PLAYROOM_WORLD_SCALE } from './constants'

/**
 * Khronos glTF Sample Assets 中的儿童房向小道具。
 * https://github.com/KhronosGroup/glTF-Sample-Assets
 */
export type KhronosRoomPropConfig = {
  /** 场景中唯一，同一 glb 多实例时请设不同 id */
  id: string
  glbUrl: string
  /** 锚点在世界坐标 xz；y 为地面 0 */
  x: number
  z: number
  targetHeight: number
  rotationY?: number
}

const S = PLAYROOM_WORLD_SCALE

const KHRONOS_PLAYROOM_PROPS_BASE: KhronosRoomPropConfig[] = [
  { id: 'duck', glbUrl: '/models/khronos/Duck.glb', x: 2, z: 5.5, targetHeight: 0.22, rotationY: 0.75 },
  { id: 'fox', glbUrl: '/models/khronos/Fox.glb', x: -14.5, z: -4.5, targetHeight: 0.42, rotationY: 0.55 },
  {
    id: 'milktruck',
    glbUrl: '/models/khronos/CesiumMilkTruck.glb',
    x: 20.5,
    z: 6.5,
    targetHeight: 0.3,
    rotationY: -0.45,
  },
  {
    id: 'riggedSimple',
    glbUrl: '/models/khronos/RiggedSimple.glb',
    x: 17,
    z: 14,
    targetHeight: 0.38,
    rotationY: 0.25,
  },
  {
    id: 'boxVertexColors',
    glbUrl: '/models/khronos/BoxVertexColors.glb',
    x: 8,
    z: -2.5,
    targetHeight: 0.14,
    rotationY: 0.4,
  },
  {
    id: 'cesiumMan',
    glbUrl: '/models/khronos/CesiumMan.glb',
    x: -19,
    z: 12,
    targetHeight: 0.46,
    rotationY: 0.9,
  },
  {
    id: 'suzanne',
    glbUrl: '/models/khronos/IridescenceSuzanne.glb',
    x: 21,
    z: -13,
    targetHeight: 0.26,
    rotationY: -0.6,
  },
  {
    id: 'morphCube',
    glbUrl: '/models/khronos/AnimatedMorphCube.glb',
    x: -3,
    z: -15,
    targetHeight: 0.2,
    rotationY: 0.35,
  },
  {
    id: 'boxTextured',
    glbUrl: '/models/khronos/BoxTextured.glb',
    x: -12,
    z: 14,
    targetHeight: 0.12,
    rotationY: 0.15,
  },
  { id: 'boxA', glbUrl: '/models/khronos/Box.glb', x: 16, z: -11, targetHeight: 0.1, rotationY: 0.2 },
  { id: 'boxB', glbUrl: '/models/khronos/Box.glb', x: -20, z: -14, targetHeight: 0.1, rotationY: -0.4 },
  { id: 'boxC', glbUrl: '/models/khronos/Box.glb', x: 14, z: 10, targetHeight: 0.1, rotationY: 0.55 },
  {
    id: 'duckPond',
    glbUrl: '/models/khronos/Duck.glb',
    x: 11.2,
    z: -6.8,
    targetHeight: 0.2,
    rotationY: 1.1,
  },
  {
    id: 'boxTramp',
    glbUrl: '/models/khronos/Box.glb',
    x: -4.4,
    z: 11.1,
    targetHeight: 0.09,
    rotationY: -0.35,
  },
  {
    id: 'rampDuck',
    glbUrl: '/models/khronos/Duck.glb',
    x: -11.2,
    z: 2.5,
    targetHeight: 0.17,
    rotationY: -0.55,
  },
]

export const KHRONOS_PLAYROOM_PROPS: KhronosRoomPropConfig[] =
  KHRONOS_PLAYROOM_PROPS_BASE.map((c) => ({
    ...c,
    x: c.x * S,
    z: c.z * S,
    targetHeight: c.targetHeight * S,
  }))

function fitAndGround(root: THREE.Object3D, targetHeight: number, rotationY?: number): void {
  root.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  const c = box.getCenter(new THREE.Vector3())
  root.position.sub(c)

  const sy = size.y
  const s = sy > 1e-6 ? targetHeight / sy : 1
  root.scale.setScalar(s)

  if (rotationY !== undefined) root.rotation.y = rotationY

  root.updateMatrixWorld(true)
  const grounded = new THREE.Box3().setFromObject(root)
  root.position.y -= grounded.min.y
}

export function loadKhronosPlayroomProps(
  scene: THREE.Scene,
  configs: KhronosRoomPropConfig[] = KHRONOS_PLAYROOM_PROPS,
): void {
  const loader = new GLTFLoader()
  for (const cfg of configs) {
    loader.load(
      cfg.glbUrl,
      (gltf) => {
        const root = gltf.scene
        fitAndGround(root, cfg.targetHeight, cfg.rotationY)
        const anchor = new THREE.Group()
        anchor.name = `KhronosProp_${cfg.id}`
        anchor.position.set(cfg.x, 0, cfg.z)
        anchor.add(root)
        scene.add(anchor)
      },
      undefined,
      () => {
        /* 缺文件时静默跳过 */
      },
    )
  }
}
