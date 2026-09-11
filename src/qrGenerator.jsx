// Standard ISO/IEC 18004 Compliant QR Code SVG Generator for Codefiesta 5.0
import QRCode from 'qrcode'

export function generateQrSvg(text, size = 120, fg = '#000000', bg = '#ffffff') {
  try {
    const qr = QRCode.create(text || 'CF5-PASS', { errorCorrectionLevel: 'M' })
    const numModules = qr.modules.size
    const margin = 2 // standard quiet zone required for optical scanner cameras
    const totalSize = numModules + margin * 2
    const cellSize = size / totalSize

    let rects = []
    for (let r = 0; r < numModules; r++) {
      for (let c = 0; c < numModules; c++) {
        if (qr.modules.get(r, c)) {
          const x = ((c + margin) * cellSize).toFixed(2)
          const y = ((r + margin) * cellSize).toFixed(2)
          rects.push(`<rect x="${x}" y="${y}" width="${cellSize.toFixed(2)}" height="${cellSize.toFixed(2)}" fill="${fg}" />`)
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${bg}" />${rects.join('')}</svg>`
  } catch (e) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${bg}" /><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="9" fill="#ff0000">QR Error</text></svg>`
  }
}

export function QRCodeSvg({ value, size = 100, className = '' }) {
  const svg = generateQrSvg(value, size)
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
