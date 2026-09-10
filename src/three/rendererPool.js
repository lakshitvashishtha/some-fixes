/**
 * rendererPool.js
 *
 * Shared WebGL renderer factory used by every WebGL layer in the app
 * (GlobeBackground, ThemesPage Saturn scene, GalaxyBackground, and the
 * WebGL star field in StarBackground). Centralising the context
 * attributes here keeps GPU settings consistent and avoids drift.
 *
 * Rendering-layer only — contains zero business logic / state.
 */

import * as THREE from 'three'
import deviceTier from '../hooks/useDeviceTier.js'

const { isMobile, isLowEndDevice } = deviceTier

/**
 * Clamp device pixel ratio per device tier.
 *  - mobile / low-end ........ 1
 *  - desktop backdrop layers . 1.5
 *  - desktop hero scenes ..... 2 (max)
 */
export function clampPixelRatio(allowHigh = false) {
  const dpr = window.devicePixelRatio || 1
  if (isMobile || isLowEndDevice) return Math.min(dpr, 1)
  return Math.min(dpr, allowHigh ? 2 : 1.5)
}

/**
 * Create a WebGLRenderer configured for a transparent, layered UI scene.
 * The canvas is NOT appended here — callers place it exactly where their
 * existing DOM layout expects it.
 *
 * @param {object}  [opts]
 * @param {boolean} [opts.allowHighDpr=false]  permit up to 2x pixel ratio
 * @param {boolean} [opts.antialias=false]
 * @returns {{ renderer: THREE.WebGLRenderer, setSize: (w,h)=>void, dispose: ()=>void }}
 */
export function createLayerRenderer(opts = {}) {
  const { allowHighDpr = false, antialias = false } = opts

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias,
    powerPreference: 'high-performance',
    failIfMajorPerformanceCaveat: false,
    stencil: false,
    depth: true,
  })
  renderer.setClearColor(0x000000, 0)

  // Shared pixel-ratio policy — every layer follows the same DPR clamp.
  const setSize = (w, h) => {
    renderer.setPixelRatio(clampPixelRatio(allowHighDpr))
    renderer.setSize(w, h)
  }

  const dispose = () => {
    renderer.dispose()
    const gl = renderer.getContext()
    if (gl && typeof gl.getExtension === 'function') {
      const lose = gl.getExtension('WEBGL_lose_context')
      if (lose) lose.loseContext()
    }
  }

  return { renderer, setSize, dispose }
}
