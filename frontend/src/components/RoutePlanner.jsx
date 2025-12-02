import { Polyline, CircleMarker, Popup, useMapEvents, Marker } from 'react-leaflet'
import L from 'leaflet'

function RoutePlanner({ visible, isDrawing, routePoints, setRoutePoints, routeAnalysis, iceData, onLandPointError }) {
  
  // Calculate distance between two points
  const calculateDistance = (point1, point2) => {
    const R = 6371 // Earth radius in km
    const dLat = (point2[0] - point1[0]) * Math.PI / 180
    const dLon = (point2[1] - point1[1]) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1[0] * Math.PI / 180) * Math.cos(point2[0] * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }
  
  // Calculate bearing between two points
  const calculateBearing = (point1, point2) => {
    const lat1 = point1[0] * Math.PI / 180
    const lat2 = point2[0] * Math.PI / 180
    const dLon = (point2[1] - point1[1]) * Math.PI / 180
    
    const y = Math.sin(dLon) * Math.cos(lat2)
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
    
    const bearing = Math.atan2(y, x) * 180 / Math.PI
    return (bearing + 360) % 360
  }
  // Great Lakes approximate bounds (for water detection)
  const GREAT_LAKES_BOUNDS = {
    minLat: 41.0,
    maxLat: 49.0,
    minLon: -93.0,
    maxLon: -75.0
  }

  // Known approximate centers of major Great Lakes (for water detection)
  const LAKE_CENTERS = [
    [46.5, -87.0],  // Lake Superior center
    [44.7, -82.4],  // Lake Huron center
    [43.7, -79.4],  // Lake Ontario center
    [42.2, -81.2],  // Lake Erie center
    [44.0, -87.0],  // Lake Michigan center
  ]

  // Critical waterways - rivers, canals, straits (with wider tolerance zones)
  const WATERWAYS = [
    // St. Mary's River (Soo Locks area)
    { center: [46.5063, -84.3475], radius: 0.15, name: 'St. Mary\'s River' },
    // Straits of Mackinac
    { center: [45.8174, -84.7278], radius: 0.12, name: 'Straits of Mackinac' },
    // Detroit River
    { center: [42.3188, -83.0458], radius: 0.08, name: 'Detroit River' },
    // St. Clair River (connects Huron to St. Clair)
    { center: [42.8, -82.5], radius: 0.08, name: 'St. Clair River' },
    // Welland Canal
    { center: [43.0594, -79.2036], radius: 0.06, name: 'Welland Canal' },
    // St. Mary's River corridor (wider area)
    { center: [46.55, -84.4], radius: 0.2, name: 'St. Mary\'s River corridor' },
    // Detroit River corridor (wider area)
    { center: [42.3, -83.0], radius: 0.15, name: 'Detroit River corridor' },
  ]

  // Helper to check if point is on water
  const isPointOnWater = (lat, lon) => {
    // First check if point is within Great Lakes general area
    const inGreatLakesArea = 
      lat >= GREAT_LAKES_BOUNDS.minLat && 
      lat <= GREAT_LAKES_BOUNDS.maxLat &&
      lon >= GREAT_LAKES_BOUNDS.minLon && 
      lon <= GREAT_LAKES_BOUNDS.maxLon

    if (!inGreatLakesArea) {
      return false // Outside Great Lakes area, definitely not water for this app
    }

    // If we have ice data, check for nearby data points with more sensitive search
    let foundNearbyData = false
    if (iceData?.ice_concentration && iceData?.latitude && iceData?.longitude) {
      const lats = iceData.latitude
      const lons = iceData.longitude

      // Use a larger search radius and check more points for better coverage
      const searchRadius = 0.3 // Increased to 0.3 degrees (~33km)
      
      // Check every 10th point for more thorough coverage
      for (let i = 0; i < lats.length; i += 10) {
        if (lats[i] === null || lons[i] === null) continue
        const dist = Math.sqrt(Math.pow(lats[i] - lat, 2) + Math.pow(lons[i] - lon, 2))
        if (dist < searchRadius) {
          foundNearbyData = true
          break
        }
      }
    }
    
    // If we found nearby ice data, it's definitely water
    if (foundNearbyData) {
      return true
    }

    // Check if point is near known waterways (rivers, canals, straits)
    // These are narrow channels that might not have ice data coverage
    for (const waterway of WATERWAYS) {
      const dist = Math.sqrt(
        Math.pow(lat - waterway.center[0], 2) + 
        Math.pow(lon - waterway.center[1], 2)
      )
      // If within the waterway's radius, it's likely water
      if (dist < waterway.radius) {
        return true
      }
    }

    // Check if point is near known lake centers
    for (const [centerLat, centerLon] of LAKE_CENTERS) {
      const dist = Math.sqrt(Math.pow(lat - centerLat, 2) + Math.pow(lon - centerLon, 2))
      // If within ~100km of a lake center, it's very likely water
      if (dist < 1.0) {
        return true
      }
    }
    
    // If we can't confirm it's water, be conservative and reject it
    return false
  }

  // Handle map clicks to add route points
  useMapEvents({
    click: (e) => {
      if (visible && isDrawing) {
        const { lat, lng } = e.latlng
        
        // Check if point is on water
        if (!isPointOnWater(lat, lng)) {
          if (onLandPointError) {
            onLandPointError(lat, lng)
          } else {
            alert(`⚠️ This point appears to be on land. Please click on water only.`)
          }
          return
        }
        
        setRoutePoints(prev => [...prev, [lat, lng]])
      }
    }
  })

  if (!visible) return null

  return (
    <>
      {/* Route line with segments */}
      {routePoints.length >= 2 && (
        <>
          {/* Main route line */}
          <Polyline
            positions={routePoints}
            pathOptions={{
              color: routeAnalysis?.color || '#007bff',
              weight: 6,
              opacity: 0.9,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
          
          {/* Segment lines with distance labels */}
          {routePoints.map((point, idx) => {
            if (idx === routePoints.length - 1) return null
            
            const nextPoint = routePoints[idx + 1]
            const distance = calculateDistance(point, nextPoint)
            const bearing = calculateBearing(point, nextPoint)
            const midPoint = [
              (point[0] + nextPoint[0]) / 2,
              (point[1] + nextPoint[1]) / 2
            ]
            
            // Create custom icon for distance label
            const distanceIcon = L.divIcon({
              className: 'route-distance-label',
              html: `<div style="
                background: rgba(255, 255, 255, 0.95);
                border: 2px solid ${routeAnalysis?.color || '#007bff'};
                border-radius: 4px;
                padding: 4px 8px;
                font-size: 11px;
                font-weight: 700;
                color: #333;
                white-space: nowrap;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              ">${distance.toFixed(1)} km</div>`,
              iconSize: [60, 20],
              iconAnchor: [30, 10]
            })
            
            return (
              <Marker
                key={`distance-${idx}`}
                position={midPoint}
                icon={distanceIcon}
              />
            )
          })}
        </>
      )}

      {/* Route points */}
      {routePoints.map((point, idx) => (
        <CircleMarker
          key={`route-point-${idx}-${point[0]}-${point[1]}`}
          center={point}
          radius={idx === 0 || idx === routePoints.length - 1 ? 10 : 6}
          pathOptions={{
            fillColor: idx === 0 ? '#4CAF50' : idx === routePoints.length - 1 ? '#D32F2F' : '#007bff',
            fillOpacity: 0.9,
            color: '#ffffff',
            weight: 2,
          }}
        >
          <Popup>
            <div style={{ minWidth: '200px' }}>
              <div style={{ marginBottom: '8px' }}>
                {idx === 0 && <strong style={{ color: '#4CAF50', fontSize: '14px' }}>📍 Start Point</strong>}
                {idx === routePoints.length - 1 && <strong style={{ color: '#D32F2F', fontSize: '14px' }}>🏁 End Point</strong>}
                {idx !== 0 && idx !== routePoints.length - 1 && <strong style={{ color: '#007bff', fontSize: '14px' }}>📍 Waypoint {idx}</strong>}
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '12px', marginBottom: '8px', padding: '6px', background: '#f5f5f5', borderRadius: '4px' }}>
                {point[0].toFixed(6)}°N, {Math.abs(point[1]).toFixed(6)}°W
              </div>
              {idx < routePoints.length - 1 && (
                <div style={{ fontSize: '12px', color: '#666', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e0e0e0' }}>
                  <strong>Distance to next:</strong> {calculateDistance(point, routePoints[idx + 1]).toFixed(2)} km<br/>
                  <strong>Bearing:</strong> {calculateBearing(point, routePoints[idx + 1]).toFixed(1)}°
                </div>
              )}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  )
}

export default RoutePlanner

