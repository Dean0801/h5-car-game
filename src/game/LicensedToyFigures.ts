import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

/**
 * 将公司批准的 glTF/GLB 放到 `public/models/toys/`（与 glbUrl 一致），
 * 构建后会从站点根路径加载；文件不存在时保留场景里已有占位几何。
 */
export type LicensedToyFigureConfig = {
  /** 与 PlayroomDecor 中 `ToySlot_${slotId}` 对应 */
  slotId: string
  glbUrl: string
  /** 缩放后竖直方向包围盒高度（米） */
  targetHeight: number
  rotationY?: number
}

export const LICENSED_TOY_FIGURES: LicensedToyFigureConfig[] = [
  { slotId: 'woody', glbUrl: '/models/toys/woody.glb', targetHeight: 0.52, rotationY: 0.35 },
  { slotId: 'buzz', glbUrl: '/models/toys/buzz.glb', targetHeight: 0.5, rotationY: -0.25 },
  { slotId: 'rex', glbUrl: '/models/toys/rex.glb', targetHeight: 0.44, rotationY: 1.2 },
]

/**
 * 异步替换各 ToySlot_* 下的占位子物体；加载失败时不改该槽位。
 */
export function loadLicensedToyFigures(
  scene: THREE.Scene,
  configs: LicensedToyFigureConfig[] = LICENSED_TOY_FIGURES,
): void {
  const loader = new GLTFLoader()
  for (const cfg of configs) {
    const slot = scene.getObjectByName(`ToySlot_${cfg.slotId}`)
    if (!slot || !(slot instanceof THREE.Group)) continue

    loader.load(
      cfg.glbUrl,
      (gltf) => {
        const root = gltf.scene
        root.updateMatrixWorld(true)
        const box = new THREE.Box3().setFromObject(root)
        const size = box.getSize(new THREE.Vector3())
        const c = box.getCenter(new THREE.Vector3())
        root.position.sub(c)

        const sy = size.y
        const s = sy > 1e-6 ? cfg.targetHeight / sy : 1
        root.scale.setScalar(s)

        if (cfg.rotationY) root.rotation.y = cfg.rotationY

        root.updateMatrixWorld(true)
        const grounded = new THREE.Box3().setFromObject(root)
        root.position.y -= grounded.min.y

        while (slot.children.length > 0) {
          slot.remove(slot.children[0]!)
        }
        slot.add(root)
      },
      undefined,
      () => {
        /* 无文件或加载失败：保留占位 */
      },
    )
  }
}
