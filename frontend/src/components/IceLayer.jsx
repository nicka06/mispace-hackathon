import { useEffect, useRef, useMemo } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

// Helper function to convert ice concentration (0-100) to color
function getIceColor(concentration) {
  if (concentration === null || concentration === undefined || isNaN(concentration)) {
    return null
  }
  
  const value = Math.max(0, Math.min(100, concentration)) / 100
  
  if (value < 0.01) {
    return null
  }
  
  const r = Math.floor(200 * (1 - value))
  const g = Math.floor(220 - 170 * value)
  const b = Math.floor(255 - 55 * value)
  const opacity = 0.4 + value * 0.6
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

// Generate image from ice data
function generateIceImage(iceData) {
  if (!iceData || !iceData.ice_concentration || !iceData.latitude || !iceData.longitude) {
    return null
  }

  const width = iceData.dimensions?.width || 1024
  const height = iceData.dimensions?.height || 1024
  const ice = iceData.ice_concentration
  const lats = iceData.latitude
  const lons = iceData.longitude
  
  // Create canvas to render the image
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  
  // Create image data for direct pixel manipulation (faster)
  const imageData = ctx.createImageData(width, height)
  const data = imageData.data
  
  // Fill with transparent background
  for (let i = 3; i < data.length; i += 4) {
    data[i] = 0 // Alpha = 0 (transparent)
  }
  
  // Render ice data
  // Data is stored row-major: row 0 = north, going south; col 0 = west, going east
  for (let i = 0; i < ice.length; i++) {
    const concentration = ice[i]
    const color = getIceColor(concentration)
    
    if (!color) continue
    
    // Parse rgba color
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
    if (!match) continue
    
    const r = parseInt(match[1])
    const g = parseInt(match[2])
    const b = parseInt(match[3])
    const a = match[4] ? parseFloat(match[4]) * 255 : 255
    
    // Calculate pixel position
    // Data structure analysis:
    // - Row 0 (points 0-1023): North (50.6028), West to East
    // - Last row: South (38.8746), West to East
    // - Col 0: West (-92.4108), Col increases going East
    // 
    // Image coordinates:
    // - y=0: top (north), y increases going down (south)
    // - x=0: left (west), x increases going right (east)
    //
    // Mapping: row 0 (north) -> y=0 (top), col 0 (west) -> x=0 (left)
    // NO FLIPS NEEDED - data is already in correct orientation
    const row = Math.floor(i / width)  // Row in data (0 = north, increases south)
    const col = i % width              // Col in data (0 = west, increases east)
    
    const y = row   // Row 0 (north) maps to y=0 (top)
    const x = col   // Col 0 (west) maps to x=0 (left)
    
    if (x >= 0 && x < width && y >= 0 && y < height) {
      const idx = (y * width + x) * 4
      data[idx] = r
      data[idx + 1] = g
      data[idx + 2] = b
      data[idx + 3] = a
    }
  }
  
  // Put image data back to canvas
  ctx.putImageData(imageData, 0, 0)
  
  // Convert to data URL
  return canvas.toDataURL('image/png')
}

function IceLayer({ iceData, opacity = 1.0 }) {
  const map = useMap()
  const layerRef = useRef(null)
  
  // Generate image from ice data
  const imageUrl = useMemo(() => {
    if (!iceData) return null
    return generateIceImage(iceData)
  }, [iceData])
  
  useEffect(() => {
    if (!imageUrl || !iceData?.bounds) {
      return
    }

    // Remove existing layer if it exists
    if (layerRef.current) {
      map.removeLayer(layerRef.current)
    }

    // Get bounds from data
    const bounds = [
      [iceData.bounds.south, iceData.bounds.west],
      [iceData.bounds.north, iceData.bounds.east]
    ]

    // Create ImageOverlay - this will properly sync with map movements
    const imageOverlay = L.imageOverlay(imageUrl, bounds, {
      opacity: opacity,
      interactive: false,
      pane: 'overlayPane'
    })
    
    imageOverlay.addTo(map)
    layerRef.current = imageOverlay

    // Cleanup
    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current)
        layerRef.current = null
      }
    }
  }, [imageUrl, iceData, map, opacity])

  return null
}

export default IceLayer
