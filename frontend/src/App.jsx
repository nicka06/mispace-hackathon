import { useState, useEffect } from 'react'
import Map from './components/Map'
import DaySelector from './components/DaySelector'
import Legend from './components/Legend'
import InfoPanel from './components/InfoPanel'
import './App.css'

function App() {
  const [currentDay, setCurrentDay] = useState(1)
  const [iceData, setIceData] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
      />

      {/* Floating UI panels */}
      <InfoPanel currentDay={currentDay} />
      
      <DaySelector 
        currentDay={currentDay} 
        onDayChange={setCurrentDay} 
      />
      
      <Legend />
    </div>
  )
}

export default App
