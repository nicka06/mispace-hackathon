import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { useEffect, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import IceLayer from './IceLayer'
import IceHoverInfo from './IceHoverInfo'
import NavigationPoints from './NavigationPoints'

// Component to fit bounds when data changes and start at max zoom out
function MapUpdater({ bounds }) {
  const map = useMap()
  
  useEffect(() => {
    if (bounds) {
      const leafletBounds = L.latLngBounds(bounds)
      // Fit to bounds with more padding to show full area
      map.fitBounds(leafletBounds, { 
        padding: [50, 50],  // More padding to see edges
        maxZoom: 18,
        minZoom: 6  // Allow zooming out more
      })
      // Then zoom out a bit more to see the whole area
      setTimeout(() => {
        map.setZoom(6)  // Start more zoomed out
      }, 100)
    }
  }, [bounds, map])
  
  return null
}

// Component to set maxBounds and minZoom programmatically after map loads
function MaxBoundsSetter({ bounds }) {
  const map = useMap()
  
  useEffect(() => {
    if (bounds && map) {
      const leafletBounds = L.latLngBounds(bounds)
      map.setMaxBounds(leafletBounds)
      // Allow zooming out more to see full area
      map.setMinZoom(6)
      map.setMaxZoom(18)
    }
  }, [bounds, map])
  
  return null
}

function Map({ iceData, currentDay, showNavigation = true }) {
  // Calculate tighter bounds from actual ice data
  // Sample grid points efficiently to find where ice actually exists
  const bounds = useMemo(() => {
    if (!iceData) return [[38.87, -92.41], [50.60, -75.87]]
    
    // If we have ice concentration data, calculate bounds from points with ice
    if (iceData.ice_concentration && iceData.latitude && iceData.longitude) {
      const ice = iceData.ice_concentration
      const lats = iceData.latitude
      const lons = iceData.longitude
      
      // Find bounds by sampling - check every Nth point to avoid stack overflow
      const sampleRate = 100  // Check every 100th point
      let minLat = Infinity, maxLat = -Infinity
      let minLon = Infinity, maxLon = -Infinity
      let hasValidData = false
      
      for (let i = 0; i < ice.length; i += sampleRate) {
        if (ice[i] !== null && ice[i] !== undefined && !isNaN(ice[i]) && ice[i] > 0) {
          const lat = lats[i]
          const lon = lons[i]
          if (lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) {
            minLat = Math.min(minLat, lat)
            maxLat = Math.max(maxLat, lat)
            minLon = Math.min(minLon, lon)
            maxLon = Math.max(maxLon, lon)
            hasValidData = true
          }
        }
      }
      
      if (hasValidData && isFinite(minLat)) {
        return [[minLat, minLon], [maxLat, maxLon]]
      }
    }
    
    // Fallback to metadata bounds
    if (iceData.bounds) {
      return [
        [iceData.bounds.south, iceData.bounds.west], 
        [iceData.bounds.north, iceData.bounds.east]
      ]
    }
    
    return [[38.87, -92.41], [50.60, -75.87]]
  }, [iceData])

  // Calculate center from bounds
  const center = useMemo(() => [
    (bounds[0][0] + bounds[1][0]) / 2,
    (bounds[0][1] + bounds[1][1]) / 2
  ], [bounds])
  
  // Start more zoomed out to see full Great Lakes area
  const zoom = 6

  return (
    <div className="map-container">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
        worldCopyJump={false}
        minZoom={6}
        maxZoom={18}
      >
        {/* Base map layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Auto-fit to Great Lakes bounds */}
        <MapUpdater bounds={bounds} />
        
        {/* Set maxBounds to restrict panning */}
        <MaxBoundsSetter bounds={bounds} />

        {/* Ice data visualization layer */}
        <IceLayer key={currentDay} iceData={iceData} />
        
        {/* Hover info showing ice concentration */}
        <IceHoverInfo key={currentDay} iceData={iceData} />
        
        {/* Navigation points - critical chokepoints and icebreakers */}
        <NavigationPoints 
          visible={showNavigation}
          iceData={iceData}
        />
      </MapContainer>
    </div>
  )
}

export default Map

