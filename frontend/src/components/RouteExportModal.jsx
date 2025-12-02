import { useState } from 'react'

function RouteExportModal({ isOpen, onClose, routePoints, routeAnalysis }) {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const formatCoordinates = (format = 'decimal') => {
    return routePoints.map(([lat, lon], idx) => {
      const label = idx === 0 ? 'Start' : idx === routePoints.length - 1 ? 'End' : `Waypoint ${idx}`
      if (format === 'decimal') {
        return `${label}: ${lat.toFixed(6)}, ${lon.toFixed(6)}`
      } else {
        // DMS format
        const latDMS = convertToDMS(lat, true)
        const lonDMS = convertToDMS(Math.abs(lon), false)
        return `${label}: ${latDMS}, ${lonDMS}`
      }
    }).join('\n')
  }

  const convertToDMS = (coord, isLat) => {
    const dir = isLat ? (coord >= 0 ? 'N' : 'S') : (coord >= 0 ? 'E' : 'W')
    const absCoord = Math.abs(coord)
    const degrees = Math.floor(absCoord)
    const minutes = Math.floor((absCoord - degrees) * 60)
    const seconds = ((absCoord - degrees - minutes / 60) * 3600).toFixed(2)
    return `${degrees}°${minutes}'${seconds}"${dir}`
  }

  const handleCopy = (format = 'decimal') => {
    const text = formatCoordinates(format)
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      alert('Failed to copy to clipboard')
    })
  }

  const openOpenSeaMap = () => {
    // OpenSeaMap Trip Planner - users can import the GPX file we generate
    const url = `https://map.openseamap.org/`
    window.open(url, '_blank')
    
    // Show instructions
    setTimeout(() => {
      alert(`📋 Instructions to view your route on OpenSeaMap:\n\n1. The OpenSeaMap website has opened\n2. Click "Tools" → "Trip Planner"\n3. Click "Import" and select the GPX file you downloaded\n4. Your route will appear on the marine chart!\n\nOr manually add waypoints using the coordinates shown above.`)
    }, 500)
  }

  const openMarineTraffic = () => {
    // MarineTraffic map with coordinates
    const center = routePoints[Math.floor(routePoints.length / 2)]
    const url = `https://www.marinetraffic.com/en/ais/home/centerx:${center[1]}/centery:${center[0]}/zoom:10`
    window.open(url, '_blank')
  }

  const generateGPX = () => {
    // Generate proper GPX format for marine GPS devices and navigation apps
    const now = new Date().toISOString()
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="MiSpace Ice Prediction" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>Icebreaker Route</name>
    <time>${now}</time>
    <desc>Route planned with ice concentration analysis</desc>
  </metadata>
  <rte>
    <name>Icebreaker Route</name>
    <desc>Route with ${routePoints.length} waypoints</desc>
    ${routePoints.map(([lat, lon], idx) => {
      const name = idx === 0 ? 'Start' : idx === routePoints.length - 1 ? 'End' : `Waypoint ${idx}`
      return `    <rtept lat="${lat}" lon="${lon}">
      <name>${name}</name>
      <desc>${name} - ${lat.toFixed(6)}°N, ${Math.abs(lon).toFixed(6)}°W</desc>
    </rtept>`
    }).join('\n')}
  </rte>
  ${routePoints.map(([lat, lon], idx) => {
    const name = idx === 0 ? 'Start' : idx === routePoints.length - 1 ? 'End' : `Waypoint ${idx}`
    return `  <wpt lat="${lat}" lon="${lon}">
    <name>${name}</name>
    <desc>${name} - ${lat.toFixed(6)}°N, ${Math.abs(lon).toFixed(6)}°W</desc>
  </wpt>`
  }).join('\n')}
</gpx>`
    
    const blob = new Blob([gpx], { type: 'application/gpx+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `icebreaker_route_${new Date().toISOString().split('T')[0]}.gpx`
    a.click()
    URL.revokeObjectURL(url)
    
    // Show success message
    setTimeout(() => {
      alert('✅ GPX file downloaded!\n\nYou can now:\n• Import it into OpenSeaMap Trip Planner\n• Load it into marine GPS devices\n• Use it with navigation apps like OpenCPN, qtVlm, or GWeatherRouting')
    }, 100)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🗺️ Export Route</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {routeAnalysis && (
            <div className="route-summary">
              <div className="summary-item">
                <strong>Length:</strong> {routeAnalysis.length} km
              </div>
              <div className="summary-item">
                <strong>Avg Ice:</strong> {routeAnalysis.avgIce}%
              </div>
              <div className="summary-item">
                <strong>Status:</strong> 
                <span style={{ color: routeAnalysis.color, fontWeight: '700', marginLeft: '8px' }}>
                  {routeAnalysis.severity}
                </span>
              </div>
            </div>
          )}

          <div className="coordinates-section">
            <h3>GPS Coordinates</h3>
            <div className="coords-display">
              {routePoints.map(([lat, lon], idx) => (
                <div key={idx} className="coord-item">
                  <div className="coord-label">
                    {idx === 0 ? '📍 Start' : idx === routePoints.length - 1 ? '🏁 End' : `📍 Waypoint ${idx}`}
                  </div>
                  <div className="coord-value">
                    {lat.toFixed(6)}°N, {Math.abs(lon).toFixed(6)}°W
                  </div>
                </div>
              ))}
            </div>

            <div className="copy-buttons">
              <button 
                className="copy-btn"
                onClick={() => handleCopy('decimal')}
              >
                {copied ? '✅ Copied!' : '📋 Copy Decimal'}
              </button>
              <button 
                className="copy-btn"
                onClick={() => handleCopy('dms')}
              >
                📋 Copy DMS
              </button>
            </div>
          </div>

          <div className="export-options">
            <h3>Export Options</h3>
            <div className="export-buttons">
              <button className="export-option-btn" onClick={generateGPX}>
                📥 Download GPX File
                <small>For marine GPS devices</small>
              </button>
              <button className="export-option-btn" onClick={openOpenSeaMap}>
                🌊 OpenSeaMap Trip Planner
                <small>Import GPX file after downloading</small>
              </button>
              <button className="export-option-btn" onClick={openMarineTraffic}>
                🚢 View on MarineTraffic
                <small>Maritime traffic & charts</small>
              </button>
            </div>
          </div>

          <div className="modal-note">
            <strong>💡 How to use your route:</strong><br/>
            1. Download the GPX file above<br/>
            2. Go to OpenSeaMap Trip Planner (button above)<br/>
            3. Click "Import" and select your GPX file<br/>
            4. Your route will appear on marine charts!<br/><br/>
            <strong>Compatible apps:</strong> OpenCPN, qtVlm, GWeatherRouting, and most marine GPS devices.
          </div>
        </div>
      </div>
    </div>
  )
}

export default RouteExportModal

