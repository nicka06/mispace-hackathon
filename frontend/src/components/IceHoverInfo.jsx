import { useState, useMemo, useEffect } from 'react'
import { Popup, useMapEvents } from 'react-leaflet'
import { clampIce, isVisibleIce } from '../utils/iceUtils'

// Map lat/lon to grid index using EXACT array lookup
// Grid is regular: each row has constant lat, each col has constant lon
function getIceAtLocation(iceData, lat, lon) {
  if (!iceData || !iceData.ice_concentration || !iceData.latitude || !iceData.longitude) {
    return null
  }

  const ice = iceData.ice_concentration
  const lats = iceData.latitude
  const lons = iceData.longitude
  const width = iceData.dimensions?.width || 1024
  const height = iceData.dimensions?.height || 1024

  // Find closest row by searching latitudes in first column (col=0)
  // Since grid is regular, all points in a row have the same latitude
  let closestRow = 0
  let minLatDist = Infinity
  
  for (let row = 0; row < height; row++) {
    const idx = row * width  // First point in this row
    const gridLat = lats[idx]
    if (gridLat === null || isNaN(gridLat)) continue
    
    const dist = Math.abs(gridLat - lat)
    if (dist < minLatDist) {
      minLatDist = dist
      closestRow = row
    }
  }

  // Find closest column by searching longitudes in first row (row=0)
  // Since grid is regular, all points in a column have the same longitude
  let closestCol = 0
  let minLonDist = Infinity
  
  for (let col = 0; col < width; col++) {
    const idx = col  // Points in row 0
    const gridLon = lons[idx]
    if (gridLon === null || isNaN(gridLon)) continue
    
    const dist = Math.abs(gridLon - lon)
    if (dist < minLonDist) {
      minLonDist = dist
      closestCol = col
    }
  }

  // Calculate final index
  const index = closestRow * width + closestCol
  
  if (index < 0 || index >= ice.length) return null
  
  return ice[index]
}

function IceHoverInfo({ iceData }) {
  const [popupState, setPopupState] = useState(null)

  const gridMeta = useMemo(() => {
    if (!iceData?.bounds || !iceData?.dimensions) return null
    const { south, north, west, east } = iceData.bounds
    const { width, height } = iceData.dimensions
    return { south, north, west, east, width, height }
  }, [iceData])
  
  // Debug: log when component mounts
  useEffect(() => {
    console.log('IceHoverInfo mounted with data:', !!iceData, 'gridMeta:', !!gridMeta)
  }, [])

  useMapEvents({
    mousemove(e) {
      if (!gridMeta) {
        console.log('Hover: no grid metadata')
        return
      }
      
      const valueRaw = getIceAtLocation(iceData, e.latlng.lat, e.latlng.lng)
      const valueClamped = clampIce(valueRaw)
      
      // Debug log every 100th event to avoid spam
      if (Math.random() < 0.01) {
        console.log('Hover at:', e.latlng.lat.toFixed(4), e.latlng.lng.toFixed(4), '-> ice:', valueClamped)
      }

      if (valueClamped === null) {
        setPopupState(null)
        return
      }

      if (!isVisibleIce(valueClamped)) {
        setPopupState({
          position: e.latlng,
          text: 'Ice: 0.0% (not visible)',
          highlight: false,
        })
      } else {
        setPopupState({
          position: e.latlng,
          text: `Ice: ${valueClamped.toFixed(1)}%`,
          highlight: true,
        })
      }
    },
    mouseout() {
      setPopupState(null)
    },
  })

  if (!popupState) return null

  return (
    <Popup
      position={popupState.position}
      closeButton={false}
      autoPan={false}
      className="ice-hover-popup"
      offset={[0, -10]}
    >
      <div className="popup-content">
        <div className="popup-label">Ice concentration</div>
        <div className={`popup-value ${popupState.highlight ? 'highlight' : ''}`}>
          {popupState.text}
        </div>
      </div>
    </Popup>
  )
}

export default IceHoverInfo
