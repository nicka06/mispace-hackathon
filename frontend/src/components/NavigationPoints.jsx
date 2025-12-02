import { CircleMarker, Circle, Popup } from 'react-leaflet'

// Verified coordinates for critical Great Lakes navigation chokepoints
// Source: NOAA Charts, verified lat/lon
const CRITICAL_CHOKEPOINTS = [
  {
    id: 'soo-locks',
    name: 'Soo Locks',
    position: [46.5063, -84.3475],
    type: 'Lock System',
    importance: 'CRITICAL',
    description: 'Only passage between Lake Superior and lower Great Lakes. Handles 80M+ tons annually.',
    color: '#D32F2F',
    radius: 8000, // danger zone radius in meters
  },
  {
    id: 'straits-mackinac',
    name: 'Straits of Mackinac',
    position: [45.8174, -84.7278],
    type: 'Strait',
    importance: 'CRITICAL',
    description: 'Connects Lake Michigan and Lake Huron under Mackinac Bridge. Major shipping corridor.',
    color: '#F57C00',
    radius: 12000,
  },
  {
    id: 'detroit-river',
    name: 'Detroit River',
    position: [42.3188, -83.0458],
    type: 'River Channel',
    importance: 'CRITICAL',
    description: 'Busiest Great Lakes waterway. Connects Lake Huron to Lake Erie via St. Clair system.',
    color: '#FBC02D',
    radius: 10000,
  },
  {
    id: 'welland-canal',
    name: 'Welland Canal',
    position: [43.0594, -79.2036],
    type: 'Canal System',
    importance: 'CRITICAL',
    description: 'Bypasses Niagara Falls with 8-lock system. Lake Erie to Lake Ontario passage.',
    color: '#0288D1',
    radius: 8000,
  },
  {
    id: 'duluth-harbor',
    name: 'Duluth-Superior Harbor',
    position: [46.7833, -92.1064],
    type: 'Major Port',
    importance: 'HIGH',
    description: 'Westernmost Great Lakes port. Primary iron ore and grain shipping terminal.',
    color: '#7B1FA2',
    radius: 6000,
  },
]

// USCG Icebreaker positions
// Based on USCG Great Lakes icebreaking fleet
const ICEBREAKERS = [
  {
    id: 'mackinaw',
    name: 'USCGC Mackinaw',
    position: [45.8174, -84.7278], // Straits of Mackinac
    callsign: 'WAGB-83',
    class: 'Heavy Icebreaker',
    length: '240 ft',
    displacement: '5,000 tons',
    operation: 'Operation Taconite',
    mission: 'Primary heavy icebreaker for Great Lakes. Conducts icebreaking operations, escorts commercial vessels, and maintains navigable tracks through critical chokepoints including Straits of Mackinac.',
  },
  {
    id: 'bristol-bay',
    name: 'USCGC Bristol Bay',
    position: [46.5063, -84.3475], // Soo Locks / St. Mary's River
    callsign: 'WTGB-102',
    class: 'Bay-class Ice Breaking Tug',
    length: '140 ft',
    displacement: '662 tons',
    operation: 'Operation Taconite',
    mission: 'Ice breaking tug supporting Operation Taconite. Maintains St. Mary\'s River passage and escorts iron ore carriers through Soo Locks during winter operations.',
  },
  {
    id: 'neah-bay',
    name: 'USCGC Neah Bay',
    position: [42.3188, -83.0458], // Detroit River
    callsign: 'WTGB-105',
    class: 'Bay-class Ice Breaking Tug',
    length: '140 ft',
    displacement: '662 tons',
    operation: 'Operation Coal Shovel',
    mission: 'Ice breaking tug supporting Operation Coal Shovel. Maintains shipping lanes in Detroit River and St. Clair River system, ensuring passage for essential cargoes.',
  },
]

function NavigationPoints({ visible, iceData }) {
  if (!visible) return null

  // Get ice concentration at specific location
  const getIceAtPoint = (lat, lon) => {
    if (!iceData?.ice_concentration || !iceData?.latitude || !iceData?.longitude) {
      return null
    }

    const lats = iceData.latitude
    const lons = iceData.longitude
    const ice = iceData.ice_concentration
    const width = iceData.dimensions?.width || 1024

    // Find closest grid point
    let minDist = Infinity
    let closestIdx = -1

    // Sample every 50th point for performance
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

  return (
    <>
      {/* Critical chokepoints */}
      {CRITICAL_CHOKEPOINTS.map((point) => {
        const iceConc = getIceAtPoint(point.position[0], point.position[1])
        const hazard = iceConc > 70 ? 'HIGH' : iceConc > 40 ? 'MEDIUM' : iceConc > 15 ? 'LOW' : 'MINIMAL'
        const hazardColor = hazard === 'HIGH' ? '#c62828' : hazard === 'MEDIUM' ? '#e65100' : hazard === 'LOW' ? '#f57f17' : '#2e7d32'

        return (
          <div key={point.id}>
            {/* Danger zone circle */}
            <Circle
              center={point.position}
              radius={point.radius}
              pathOptions={{
                fillColor: point.color,
                fillOpacity: 0.12,
                color: point.color,
                weight: 2,
                opacity: 0.6,
                dashArray: '8, 8',
              }}
            />

            {/* Chokepoint marker */}
            <CircleMarker
              center={point.position}
              radius={point.importance === 'CRITICAL' ? 10 : 8}
              pathOptions={{
                fillColor: point.color,
                fillOpacity: 0.95,
                color: '#ffffff',
                weight: 3,
              }}
            >
              <Popup maxWidth={280}>
                <div style={{ padding: '4px' }}>
                  <h3 style={{ 
                    margin: '0 0 10px 0', 
                    color: point.color, 
                    fontSize: '17px',
                    fontWeight: '700',
                    borderBottom: '2px solid ' + point.color,
                    paddingBottom: '6px'
                  }}>
                    {point.importance === 'CRITICAL' ? '⚠️' : '📍'} {point.name}
                  </h3>
                  
                  <p style={{ 
                    fontSize: '13px', 
                    margin: '0 0 12px 0', 
                    lineHeight: '1.5',
                    color: '#444'
                  }}>
                    {point.description}
                  </p>

                  <div style={{ 
                    padding: '10px', 
                    background: '#f5f7fa', 
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}>
                    <div style={{ marginBottom: '4px' }}>
                      <strong>Type:</strong> {point.type}
                    </div>
                    <div style={{ marginBottom: '4px' }}>
                      <strong>Importance:</strong> <span style={{ color: point.color, fontWeight: '700' }}>{point.importance}</span>
                    </div>
                    <div style={{ marginBottom: '4px' }}>
                      <strong>Coordinates:</strong> {point.position[0].toFixed(4)}°N, {Math.abs(point.position[1]).toFixed(4)}°W
                    </div>
                    
                    {iceConc !== null && (
                      <>
                        <div style={{ 
                          marginTop: '10px', 
                          paddingTop: '10px', 
                          borderTop: '1px solid #ddd'
                        }}>
                          <div style={{ marginBottom: '6px' }}>
                            <strong>Current Ice Concentration:</strong>
                          </div>
                          <div style={{ fontSize: '20px', fontWeight: '700', color: '#1976D2', marginBottom: '6px' }}>
                            {iceConc.toFixed(1)}%
                          </div>
                          <div style={{
                            padding: '6px 10px',
                            background: hazard === 'HIGH' ? '#ffebee' : hazard === 'MEDIUM' ? '#fff3e0' : hazard === 'LOW' ? '#fffde7' : '#e8f5e9',
                            borderRadius: '4px',
                            fontWeight: '700',
                            color: hazardColor,
                            textAlign: 'center',
                            border: '2px solid ' + hazardColor
                          }}>
                            {hazard === 'HIGH' ? '🔴' : hazard === 'MEDIUM' ? '🟡' : hazard === 'LOW' ? '🟢' : '✅'} HAZARD: {hazard}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          </div>
        )
      })}

      {/* USCG Icebreakers */}
      {ICEBREAKERS.map((vessel) => (
        <CircleMarker
          key={vessel.id}
          center={vessel.position}
          radius={12}
          pathOptions={{
            fillColor: '#1565C0',
            fillOpacity: 1,
            color: '#ffffff',
            weight: 3,
          }}
        >
          <Popup maxWidth={260}>
            <div style={{ padding: '4px' }}>
              <h3 style={{ 
                margin: '0 0 10px 0', 
                color: '#1565C0', 
                fontSize: '16px',
                fontWeight: '700',
                borderBottom: '2px solid #1565C0',
                paddingBottom: '6px'
              }}>
                🚢 {vessel.name}
              </h3>
              
              <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                <div style={{ marginBottom: '4px' }}>
                  <strong>Callsign:</strong> {vessel.callsign}
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <strong>Class:</strong> {vessel.class}
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <strong>Length:</strong> {vessel.length}
                </div>
                {vessel.displacement && (
                  <div style={{ marginBottom: '4px' }}>
                    <strong>Displacement:</strong> {vessel.displacement}
                  </div>
                )}
                {vessel.operation && (
                  <div style={{ 
                    marginTop: '6px',
                    marginBottom: '6px',
                    padding: '6px',
                    background: '#e3f2fd',
                    borderRadius: '4px',
                    fontWeight: '700',
                    color: '#1565C0',
                    fontSize: '11px'
                  }}>
                    🚢 {vessel.operation}
                  </div>
                )}
                <div style={{ 
                  marginTop: '8px',
                  padding: '8px',
                  background: '#f5f7fa',
                  borderRadius: '4px',
                  fontSize: '12px',
                  lineHeight: '1.5'
                }}>
                  <strong>Mission:</strong><br/>
                  {vessel.mission}
                </div>
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  )
}

export default NavigationPoints

