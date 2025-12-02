import { useState, useEffect } from 'react'
import Map from './components/Map'
import DaySelector from './components/DaySelector'
import TimeSlider from './components/TimeSlider'
import Legend from './components/Legend'
import InfoPanel from './components/InfoPanel'
import NavigationControls from './components/NavigationControls'
import './App.css'

function App() {
  const [currentDay, setCurrentDay] = useState(1)
  const [displayDay, setDisplayDay] = useState(1) // For showing fractional days
  const [iceData, setIceData] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showNavigation, setShowNavigation] = useState(true)
  const [useSlider, setUseSlider] = useState(false)

  // Load all ice data on mount
  useEffect(() => {
    const loadIceData = async () => {
      try {
        setLoading(true)
        const data = {}
        
        // Load all 4 days
        for (let day = 1; day <= 4; day++) {
          const response = await fetch(`/ice_data_day_${day}.json`)
          if (!response.ok) {
            throw new Error(`Failed to load day ${day} data`)
          }
          const jsonData = await response.json()
          data[day] = jsonData
        }
        
        setIceData(data)
        setLoading(false)
        console.log('Ice data loaded successfully:', Object.keys(data))
      } catch (err) {
        console.error('Error loading ice data:', err)
        setError(err.message)
        setLoading(false)
      }
    }

    loadIceData()
  }, [])

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          Loading ice prediction data...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app">
        <div className="loading" style={{ background: 'rgba(255, 200, 200, 0.95)' }}>
          Error: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {/* Main map - fills entire screen */}
      <Map 
        iceData={iceData[currentDay]} 
        currentDay={currentDay}
        showNavigation={showNavigation}
      />

      {/* Floating UI panels */}
      <InfoPanel currentDay={useSlider ? displayDay : currentDay} />
      
      {/* Toggle between buttons and slider */}
      <div className="floating-panel view-toggle">
        <button 
          className={!useSlider ? 'active' : ''}
          onClick={() => setUseSlider(false)}
        >
          📅 Days
        </button>
        <button 
          className={useSlider ? 'active' : ''}
          onClick={() => setUseSlider(true)}
        >
          🎬 Slider
        </button>
      </div>
      
      {useSlider ? (
        <TimeSlider 
          currentDay={currentDay}
          onDayChange={setCurrentDay}
          onDisplayChange={setDisplayDay}
        />
      ) : (
        <DaySelector 
          currentDay={currentDay} 
          onDayChange={setCurrentDay} 
        />
      )}
      
      <Legend />
      
      <NavigationControls 
        onToggle={setShowNavigation}
      />
    </div>
  )
}

export default App
