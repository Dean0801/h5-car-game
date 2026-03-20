import { PLAYROOM_WORLD_SCALE } from './constants'

/**
 * 静态障碍：与视觉道具对齐的轴对齐包围盒（cannon-es Box half-extents）
 * 基线布局对应 `ROOM` 缩放前（halfWidth 24 / halfDepth 18），运行时再乘 `PLAYROOM_WORLD_SCALE`。
 */
export type ObstacleBox = {
  pos: [number, number, number]
  half: [number, number, number]
}

const RAW_PLAYROOM_OBSTACLES: ObstacleBox[] = [
  // 儿童床（靠北墙）
  { pos: [0, 0.42, -15.6], half: [3.1, 0.42, 1.55] },
  // 矮书柜
  { pos: [-20.5, 1.05, 8], half: [0.38, 1.05, 1.85] },
  // 玩具收纳箱
  { pos: [18, 0.38, 11], half: [1.05, 0.38, 0.55] },
  // 小书桌
  { pos: [-11, 0.42, 10], half: [1.35, 0.42, 0.75] },
  // 地毯上的积木堆
  { pos: [4, 0.16, 4], half: [0.55, 0.16, 0.45] },
  // 套圈塔底座
  { pos: [-7, 0.14, -9], half: [0.28, 0.14, 0.28] },
  // 火箭玩具
  { pos: [15, 0.28, -7], half: [0.22, 0.28, 0.22] },
  // 人形玩偶槽位（Woody 等）
  { pos: [10, 0.26, 6], half: [0.18, 0.26, 0.16] },
  // 人形玩偶槽位（Buzz 等）
  { pos: [-9, 0.24, -11], half: [0.16, 0.24, 0.14] },
  // 恐龙槽位（Rex 等）
  { pos: [19, 0.22, -12], half: [0.42, 0.22, 0.18] },
  // Khronos：Duck / Fox / MilkTruck / RiggedSimple / BoxVertexColors
  { pos: [2, 0.11, 5.5], half: [0.14, 0.11, 0.1] },
  { pos: [-14.5, 0.2, -4.5], half: [0.24, 0.2, 0.34] },
  { pos: [20.5, 0.14, 6.5], half: [0.34, 0.14, 0.2] },
  { pos: [17, 0.2, 14], half: [0.15, 0.2, 0.11] },
  { pos: [8, 0.07, -2.5], half: [0.09, 0.07, 0.09] },
  // Khronos：CesiumMan / IridescenceSuzanne / AnimatedMorphCube / BoxTextured / Box x3
  { pos: [-19, 0.24, 12], half: [0.18, 0.24, 0.14] },
  { pos: [21, 0.16, -13], half: [0.2, 0.16, 0.18] },
  { pos: [-3, 0.12, -15], half: [0.12, 0.12, 0.12] },
  { pos: [-12, 0.07, 14], half: [0.08, 0.07, 0.08] },
  { pos: [16, 0.06, -11], half: [0.06, 0.06, 0.06] },
  { pos: [-20, 0.06, -14], half: [0.06, 0.06, 0.06] },
  { pos: [14, 0.06, 10], half: [0.06, 0.06, 0.06] },
  // 交互区 Khronos 小道具碰撞盒
  { pos: [11.2, 0.1, -6.8], half: [0.12, 0.1, 0.09] },
  { pos: [-4.4, 0.045, 11.1], half: [0.06, 0.045, 0.06] },
  { pos: [-11.2, 0.085, 2.5], half: [0.11, 0.085, 0.08] },
]

/**
 * 「人类尺度」巨型家具（基线坐标）：相对玩具车约数十倍体量，强化小车在大房间内的视觉冲击。
 * 与 `addGiantPlayroomFurniture` 几何一致；顶面高度不超过墙高（基线 y 约 2.85）。
 */
export const RAW_GIANT_PLAYROOM_OBSTACLES: ObstacleBox[] = [
  { pos: [10, 0.7, 3], half: [5, 0.7, 3] }, // 巨型餐桌
  { pos: [-12, 1.2, -12], half: [3.2, 1.2, 3.2] }, // 扶手椅 A
  { pos: [8, 1.15, 8], half: [3, 1.15, 3] }, // 扶手椅 B
  { pos: [4, 0.6, 13], half: [5.5, 0.6, 3] }, // 巨型床（第二张）
  { pos: [21, 1.35, -10], half: [1.7, 1.35, 2] }, // 高衣柜（贴东墙）
  { pos: [-19, 0.4, 0], half: [2.4, 0.4, 1.6] }, // 矮茶几
  { pos: [-6, 0.95, -4], half: [2.8, 0.95, 2.8] }, // 巨型脚凳 / 矮墩
  { pos: [18, 1.25, -4], half: [2.2, 1.25, 2.2] }, // 书桌椅（高背）
]

function scaleObstacles(list: ObstacleBox[], scale: number): ObstacleBox[] {
  return list.map((o) => ({
    pos: [
      o.pos[0] * scale,
      o.pos[1] * scale,
      o.pos[2] * scale,
    ] as [number, number, number],
    half: [
      o.half[0] * scale,
      o.half[1] * scale,
      o.half[2] * scale,
    ] as [number, number, number],
  }))
}

const _scaledBase = scaleObstacles(
  RAW_PLAYROOM_OBSTACLES,
  PLAYROOM_WORLD_SCALE,
)

/** 仅巨型家具，供装饰层按件生成网格（与物理列表尾部一一对应） */
export const GIANT_PLAYROOM_OBSTACLES = scaleObstacles(
  RAW_GIANT_PLAYROOM_OBSTACLES,
  PLAYROOM_WORLD_SCALE,
)

export const PLAYROOM_OBSTACLES: ObstacleBox[] = [
  ..._scaledBase,
  ...GIANT_PLAYROOM_OBSTACLES,
]
