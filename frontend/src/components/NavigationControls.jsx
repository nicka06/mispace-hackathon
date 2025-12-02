import { useState } from 'react'

function NavigationControls({ onToggle }) {
  const [isVisible, setIsVisible] = useState(true)

  const handleToggle = () => {
    const newValue = !isVisible
    setIsVisible(newValue)
    onToggle(newValue)
  }

  return (
    <div className="floating-panel navigation-controls">
      <h3>🗺️ Navigation Overlay</h3>
      
      <label className="toggle-switch">
        <input
          type="checkbox"
          checked={isVisible}
          onChange={handleToggle}
        />
        <span className="toggle-slider"></span>
        <span className="toggle-label">
          {isVisible ? 'Showing' : 'Hidden'} Critical Points & Icebreakers
        </span>
      </label>

      <div className="info-section">
        <h4>Legend</h4>
        <div className="legend-item">
          <div className="legend-marker critical"></div>
          <span>Critical Chokepoints</span>
        </div>
        <div className="legend-item">
          <div className="legend-marker icebreaker"></div>
          <span>USCG Icebreakers</span>
        </div>
        <div className="legend-item">
          <div className="legend-zone"></div>
          <span>Operational Zone</span>
        </div>
      </div>

      <div className="info-note">
        <strong>📍 5 Verified Locations</strong><br/>
        <small>Coordinates from NOAA charts. Click markers for ice conditions and details.</small>
      </div>
    </div>
  )
}

export default NavigationControls

