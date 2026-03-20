import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { VEHICLE } from './constants'

/** Khronos ToyCar：带清漆/透光/光泽的玩具小车，比牛奶车更精致且贴合「玩具车」主题（CC0） */
const VEHICLE_GLB_URL = '/models/khronos/ToyCar.glb'
/**
 * 该 glTF 由 Max/Babylon 导出，车身朝向与牛奶车不同；以车身本地 +Z 为前向对齐操控。
 * 若车头与行驶方向差 90°，改为 ±Math.PI / 2；若完全相反，加 Math.PI。
 */
const ALIGN_HEADING_Y = 0

/**
 * 用 glTF 玩具车替换占位几何；加载失败时保留原有子节点。
 */
export function loadToyCarModel(vehicleGroup: THREE.Group): void {
  const loader = new GLTFLoader()
  loader.load(
    VEHICLE_GLB_URL,
    (gltf) => {
      const root = gltf.scene
      /** ToyCar 样本含展台布料与预览相机，驾驶视角下去掉布料与相机节点 */
      const stripForGameplay = (obj: THREE.Object3D) => {
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose()
            const mats = Array.isArray(child.material)
              ? child.material
              : [child.material]
            for (const m of mats) m?.dispose()
          }
        })
        obj.parent?.remove(obj)
      }
      const toStrip = new Set<THREE.Object3D>()
      root.traverse((child) => {
        if (child instanceof THREE.Mesh && child.name === 'Fabric')
          toStrip.add(child)
        if (child instanceof THREE.Camera) toStrip.add(child)
      })
      for (const obj of toStrip) stripForGameplay(obj)

      root.rotation.y = ALIGN_HEADING_Y
      root.updateMatrixWorld(true)
      const box = new THREE.Box3().setFromObject(root)
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())
      root.position.sub(center)

      const maxDim = Math.max(size.x, size.y, size.z)
      const target = Math.max(
        VEHICLE.halfExtents.x * 2,
        VEHICLE.halfExtents.y * 2,
        VEHICLE.halfExtents.z * 2,
      )
      const s =
        maxDim > 1e-6
          ? THREE.MathUtils.clamp((target / maxDim) * 0.94, 0.02, 200)
          : 1
      root.scale.setScalar(s)

      root.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.frustumCulled = false
          const mats = Array.isArray(obj.material)
            ? obj.material
            : [obj.material]
          for (const m of mats) {
            if (
              m instanceof THREE.MeshStandardMaterial ||
              m instanceof THREE.MeshPhysicalMaterial
            ) {
              if (m.emissiveIntensity < 0.06) {
                m.emissiveIntensity = 0.14
                m.emissive?.setHex(0x222222)
              }
            }
          }
        }
      })

      while (vehicleGroup.children.length > 0) {
        vehicleGroup.remove(vehicleGroup.children[0]!)
      }
      vehicleGroup.add(root)
    },
    undefined,
    (err) => {
      console.warn('[VehicleVisual] 卡通车 glb 加载失败，使用占位模型', err)
    },
  )
}
