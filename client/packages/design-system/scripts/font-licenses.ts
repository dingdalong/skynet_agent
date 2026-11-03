import { readFileSync } from 'node:fs'
import type { Plugin } from 'vite'

// 字体被 Vite 作为资源打包时，同时带上原作者的授权与来源说明。
export function fontLicenses(): Plugin {
  return {
    name: 'font-licenses',
    generateBundle() {
      for (const file of ['Inter-LICENSE.txt', 'JetBrainsMono-OFL.txt', 'NOTICE.md']) {
        this.emitFile({
          type: 'asset',
          fileName: `licenses/${file}`,
          source: readFileSync(new URL(`../src/assets/fonts/${file}`, import.meta.url), 'utf8'),
        })
      }
    },
  }
}
