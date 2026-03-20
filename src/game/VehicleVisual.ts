import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { VEHICLE } from './constants'

/** Khronos CesiumMilkTruck：低多边形卡通牛奶车，比 ToyCar 更「玩具感」 */
const VEHICLE_GLB_URL = '/models/khronos/CesiumMilkTruck.glb'
/**
 * 该 glTF 车头大致沿 +X；操控逻辑以车身本地 +Z 为前向，绕 Y 转 -90° 对齐。
 * 若实际行驶方向与摇杆相反，改成 Math.PI / 2。
 */
const ALIGN_HEADING_Y = -Math.PI / 2

/**
 * 用卡通牛奶车替换占位几何；加载失败时保留原有子节点。
 */
export function loadToyCarModel(vehicleGroup: THREE.Group): void {
  const loader = new GLTFLoader()
  loader.load(
    VEHICLE_GLB_URL,
    (gltf) => {
      const root = gltf.scene
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
