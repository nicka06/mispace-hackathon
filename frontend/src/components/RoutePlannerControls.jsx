import { useState, useEffect, useMemo, useRef } from 'react'
import RouteExportModal from './RouteExportModal'

function RoutePlannerControls({ 
  isDrawing, 
  onStartDrawing, 
  onStopDrawing, 
  onClearRoute,
  routePoints,
  iceData,
  showPlanner: externalShowPlanner,
  onTogglePlanner,
  onRouteAnalysisChange
}) {
  const [showPlanner, setShowPlanner] = useState(externalShowPlanner || false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const panelRef = useRef(null)

  useEffect(() => {
    if (externalShowPlanner !== undefined) {
      setShowPlanner(externalShowPlanner)
    }
  }, [externalShowPlanner])

  // Helper function to get ice at point (defined before use)
  const getIceAtPoint = (iceData, lat, lon) => {
    if (!iceData?.ice_concentration || !iceData?.latitude || !iceData?.longitude) {
      return null
    }

    const lats = iceData.latitude
    const lons = iceData.longitude
    const ice = iceData.ice_concentration

    let minDist = Infinity
    let closestIdx = -1

    for (let i = 0; i < lats.length; i += 50) {
      if (lats[i] === null || lons[i] === null) continue
      const dist = Math.sqrt(Math.pow(lats[i] - lat, 2) + Math.pow(lons[i] - lon, 2))
      if (dist < minDist) {
        minDist = dist
        closestIdx = i
      }
    }

    return closestIdx >= 0 ? ice[closestIdx] : null
  }

  // Great Lakes approximate bounds
  const GREAT_LAKES_BOUNDS = {
    minLat: 41.0,
    maxLat: 49.0,
    minLon: -93.0,
    maxLon: -75.0
  }

  // Known approximate centers of major Great Lakes
  const LAKE_CENTERS = [
    [46.5, -87.0],  // Lake Superior center
    [44.7, -82.4],  // Lake Huron center
    [43.7, -79.4],  // Lake Ontario center
    [42.2, -81.2],  // Lake Erie center
    [44.0, -87.0],  // Lake Michigan center
  ]

  // Critical waterways - rivers, canals, straits
  const WATERWAYS = [
    { center: [46.5063, -84.3475], radius: 0.15, name: 'St. Mary\'s River' },
    { center: [45.8174, -84.7278], radius: 0.12, name: 'Straits of Mackinac' },
    { center: [42.3188, -83.0458], radius: 0.08, name: 'Detroit River' },
    { center: [42.8, -82.5], radius: 0.08, name: 'St. Clair River' },
    { center: [43.0594, -79.2036], radius: 0.06, name: 'Welland Canal' },
    { center: [46.55, -84.4], radius: 0.2, name: 'St. Mary\'s River corridor' },
    { center: [42.3, -83.0], radius: 0.15, name: 'Detroit River corridor' },
  ]

  // Check if a point is on water (improved detection)
  const isPointOnWater = (lat, lon) => {
    // First check if point is within Great Lakes general area
    const inGreatLakesArea = 
      lat >= GREAT_LAKES_BOUNDS.minLat && 
      lat <= GREAT_LAKES_BOUNDS.maxLat &&
      lon >= GREAT_LAKES_BOUNDS.minLon && 
      lon <= GREAT_LAKES_BOUNDS.maxLon

    if (!inGreatLakesArea) {
      return false
    }

    // If we have ice data, check for nearby data points with more sensitive search
    if (iceData) {
      const iceValue = getIceAtPoint(iceData, lat, lon)
      // If we can find ice data nearby (even if 0%), it's water
      if (iceValue !== null) {
        return true
      }
      
      // Also do a wider search for narrow waterways
      const lats = iceData.latitude
      const lons = iceData.longitude
      const searchRadius = 0.3
      for (let i = 0; i < lats.length; i += 10) {
        if (lats[i] === null || lons[i] === null) continue
        const dist = Math.sqrt(Math.pow(lats[i] - lat, 2) + Math.pow(lons[i] - lon, 2))
        if (dist < searchRadius) {
          return true
        }
      }
    }

    // Check if point is near known waterways (rivers, canals, straits)
    for (const waterway of WATERWAYS) {
      const dist = Math.sqrt(
        Math.pow(lat - waterway.center[0], 2) + 
        Math.pow(lon - waterway.center[1], 2)
      )
      if (dist < waterway.radius) {
        return true
      }
    }

    // Check if point is near known lake centers
    for (const [centerLat, centerLon] of LAKE_CENTERS) {
      const dist = Math.sqrt(Math.pow(lat - centerLat, 2) + Math.pow(lon - centerLon, 2))
      if (dist < 1.0) {
        return true
      }
    }
    
    return false
  }

  // Calculate route analysis
  const routeAnalysis = useMemo(() => {
    if (!iceData || routePoints.length < 2) return null

    // Sample ice along route
    const samples = []
    for (let i = 0; i < routePoints.length - 1; i++) {
      const [lat1, lon1] = routePoints[i]
      const [lat2, lon2] = routePoints[i + 1]
      
      // Sample 5 points between each segment
      for (let j = 0; j <= 5; j++) {
        const t = j / 5
        const lat = lat1 + (lat2 - lat1) * t
        const lon = lon1 + (lon2 - lon1) * t
        samples.push([lat, lon])
      }
    }

    // Get ice values
    const iceValues = samples
      .map(([lat, lon]) => getIceAtPoint(iceData, lat, lon))
      .filter(v => v !== null)

    if (iceValues.length === 0) return null

    const avgIce = iceValues.reduce((sum, v) => sum + v, 0) / iceValues.length
    const maxIce = Math.max(...iceValues)
    const highIceCount = iceValues.filter(v => v > 70).length

    let severity = 'CLEAR'
    let color = '#4CAF50'
    if (avgIce > 70) {
      severity = 'BLOCKED'
      color = '#D32F2F'
    } else if (avgIce > 50) {
      severity = 'DIFFICULT'
      color = '#F57C00'
    } else if (avgIce > 30) {
      severity = 'MODERATE'
      color = '#FBC02D'
    }

    // Calculate length
    let total = 0
    for (let i = 0; i < routePoints.length - 1; i++) {
      const [lat1, lon1] = routePoints[i]
      const [lat2, lon2] = routePoints[i + 1]
      const R = 6371 // Earth radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180
      const dLon = (lon2 - lon1) * Math.PI / 180
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
      total += R * c
    }

    const analysis = {
      avgIce: avgIce.toFixed(1),
      maxIce: maxIce.toFixed(1),
      severity,
      color,
      length: total.toFixed(1),
      highIceSegments: highIceCount,
    }
    
    if (onRouteAnalysisChange) {
      onRouteAnalysisChange(analysis)
    }
    
    return analysis
  }, [routePoints, iceData, onRouteAnalysisChange])

  const handleToggle = () => {
    const newValue = !showPlanner
    setShowPlanner(newValue)
    if (onTogglePlanner) {
      onTogglePlanner(newValue)
    }
    if (!newValue) {
      onStopDrawing()
    }
  }

  // Drag handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('label')) {
      return // Don't drag if clicking on interactive elements
    }
    setIsDragging(true)
    const rect = panelRef.current?.getBoundingClientRect()
    if (rect) {
      setDragStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return
      
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragStart])

  const panelStyle = {
    position: 'fixed',
    left: position.x || '50%',
    top: position.y || '20px',
    transform: position.x ? 'none' : 'translateX(-50%)',
    cursor: isDragging ? 'grabbing' : 'default',
    userSelect: 'none',
  }

  return (
    <div 
      ref={panelRef}
      className={`floating-panel route-planner-controls ${showPlanner ? 'active' : ''} ${isDragging ? 'dragging' : ''}`}
      style={panelStyle}
    >
      <div 
        className="planner-header-compact"
        onMouseDown={handleMouseDown}
        style={{ cursor: 'grab' }}
      >
        <label className="toggle-switch-small" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={showPlanner}
            onChange={handleToggle}
          />
          <span></span>
        </label>
        <span className="planner-label">🗺️ Route Planner</span>
        <span className="drag-handle" style={{ marginLeft: 'auto', fontSize: '18px', opacity: 0.5 }}>⋮⋮</span>
      </div>

      {showPlanner && (
        <div className="planner-content">
          <p style={{ fontSize: '13px', margin: '0 0 12px 0', color: '#666' }}>
            Click on the map to create waypoints for your custom route.
          </p>

          <div className="planner-buttons">
            <button
              className={`planner-btn ${isDrawing ? 'active' : ''}`}
              onClick={() => {
                if (isDrawing) {
                  onStopDrawing()
                } else {
                  onStartDrawing()
                }
              }}
              disabled={!showPlanner}
            >
              {isDrawing ? '⏸ Stop Drawing' : '✏️ Start Drawing'}
            </button>

            {routePoints.length > 0 && (
              <button
                className="planner-btn clear-btn"
                onClick={onClearRoute}
              >
                🗑️ Clear Route
              </button>
            )}
          </div>

          {routePoints.length > 0 && (
            <>
              <div className="route-info">
                <div className="info-row">
                  <strong>Waypoints:</strong> {routePoints.length}
                </div>
                {routeAnalysis && (
                  <>
                    <div className="info-row">
                      <strong>Length:</strong> {routeAnalysis.length} km
                    </div>
                    <div className="info-row">
                      <strong>Avg Ice:</strong> {routeAnalysis.avgIce}%
                    </div>
                    <div className="info-row">
                      <strong>Status:</strong> 
                      <span style={{ 
                        color: routeAnalysis.color, 
                        fontWeight: '700',
                        marginLeft: '8px'
                      }}>
                        {routeAnalysis.severity}
                      </span>
                    </div>
                  </>
                )}
              </div>
              
              {routePoints.length >= 2 && (
                <button
                  className="planner-btn export-btn"
                  onClick={() => {
                    // Check if all points are on water
                    const landPoints = routePoints.filter(([lat, lon]) => !isPointOnWater(lat, lon))
                    
                    if (landPoints.length > 0) {
                      alert(`⚠️ Cannot export route: ${landPoints.length} point(s) are on land. Please adjust your route to stay on water.`)
                      return
                    }

                    setShowExportModal(true)
                  }}
                >
                  📋 Export Route
                </button>
              )}
            </>
          )}

          <div className="planner-instructions">
            <strong>Instructions:</strong>
            <ol style={{ margin: '8px 0', paddingLeft: '20px', fontSize: '12px' }}>
              <li>Click "Start Drawing"</li>
              <li>Click on map to add waypoints</li>
              <li>Route will analyze ice conditions</li>
              <li>Click end point to see Google Maps link</li>
            </ol>
          </div>
        </div>
      )}

      <RouteExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        routePoints={routePoints}
        routeAnalysis={routeAnalysis}
      />
    </div>
  )
}

export default RoutePlannerControls

