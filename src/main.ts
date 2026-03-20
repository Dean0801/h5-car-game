import './style.css'
import { Game } from './game/Game'

const app = document.getElementById('app')
const errEl = document.getElementById('webgl-error')

if (!app) {
  throw new Error('#app missing')
}

function showError(message: string): void {
  if (errEl) {
    errEl.hidden = false
    errEl.textContent = message
  }
}

/** 开发时 HMR 会重复执行模块：先 dispose 再 new，避免残留 canvas / 上下文 */
let game: Game | null = null

function start(): void {
  game?.dispose()
  game = new Game(app as HTMLElement)
}

try {
  start()
} catch (e) {
  const msg =
    e instanceof Error ? e.message : '初始化失败，请刷新页面重试。'
  showError(msg)
  throw e
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game?.dispose()
    game = null
  })
}
