/**
 * 房间与道具相对基线尺寸的等比放大倍数；车身与碰撞盒也乘此项，否则在巨型房间里几乎看不见。
 */
export const PLAYROOM_WORLD_SCALE = 3

const _roomBase = {
  halfWidth: 24,
  halfDepth: 18,
  wallThickness: 0.4,
  wallHeight: 2.85,
  floorTopY: 0,
  minCameraClearance: 0.32,
} as const

const S = PLAYROOM_WORLD_SCALE

/** Room inner half-size（内墙到中心）与整墙厚度 */
export const ROOM = {
  halfWidth: _roomBase.halfWidth * S,
  halfDepth: _roomBase.halfDepth * S,
  wallThickness: _roomBase.wallThickness * S,
  wallHeight: _roomBase.wallHeight * S,
  floorTopY: _roomBase.floorTopY,
  minCameraClearance: _roomBase.minCameraClearance * S,
} as const

export const PHYSICS = {
  fixedDt: 1 / 60,
  maxSubSteps: 5,
  gravityY: -12,
} as const

export const VEHICLE = {
  /** 随世界尺度略增质量，避免大车过飘 */
  mass: 8.5 * S,
  /** cannon-es Box half-extents，与 `PLAYROOM_WORLD_SCALE` 一致，glTF 车身按此包围缩放 */
  halfExtents: { x: 0.25 * S, y: 0.085 * S, z: 0.36 * S },
  /** 与直接设水平速度配合，过高会在每步子步里把速度乘没 */
  linearDamping: 0.08,
  angularDamping: 0.95,
  maxSpeed: 9,
  /** 无摇杆输入时，每秒水平速度剩余比例（越小停得越快） */
  coastDragPerSecond: 0.25,
} as const

/** 车身前后方向长度（与 `halfExtents.z` 一致），用于相机视距上限 */
export const VEHICLE_BODY_LENGTH = VEHICLE.halfExtents.z * 2

/** 轨道相机与观察目标的最大直线距离（约四车身，为原先「两车身」的一倍） */
export const CAMERA_ORBIT_DISTANCE_MAX = 4 * VEHICLE_BODY_LENGTH

/** 最近视距（略小于半车身，仍可环视） */
export const CAMERA_ORBIT_DISTANCE_MIN = 0.42 * VEHICLE_BODY_LENGTH

/** 初始/默认视距 */
export const CAMERA_ORBIT_DISTANCE_DEFAULT = Math.min(
  1.35 * VEHICLE_BODY_LENGTH,
  CAMERA_ORBIT_DISTANCE_MAX * 0.92,
)

/**
 * 轨道相机 eye 允许到达的最低高度（略低于地板顶），配合负 pitch 可看到贴地/桌下感。
 * 仍高于多数家具底部时可再调；单位随 `PLAYROOM_WORLD_SCALE`。
 */
export const CAMERA_ORBIT_MIN_EYE_Y =
  ROOM.floorTopY - 0.14 * PLAYROOM_WORLD_SCALE
