import { useState, useEffect, useRef } from 'react'

function TimeSlider({ currentDay, onDayChange, onDisplayChange }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [sliderValue, setSliderValue] = useState(currentDay)
  const intervalRef = useRef(null)

  // Auto-play through days (slower, more gradual)
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setSliderValue((prev) => {
          const next = prev + 0.05 // Smaller steps = more gradual
          if (next >= 4) {
            setIsPlaying(false)
            return 4
          }
          if (onDisplayChange) {
            onDisplayChange(next)
          }
          return next
        })
      }, 150) // Update every 150ms

      return () => clearInterval(intervalRef.current)
    }
  }, [isPlaying, onDisplayChange])

  // Update day when slider crosses each 0.2 threshold (5 steps per day)
  useEffect(() => {
    // Calculate which "step" we're at (5 steps per day)
    const step = Math.floor((sliderValue - 1) * 5) // 0-14 (15 total steps)
    const newDay = Math.floor(step / 5) + 1 // Convert to day 1-4
    
    if (newDay !== currentDay && newDay >= 1 && newDay <= 4) {
      onDayChange(newDay)
    }
  }, [sliderValue, currentDay, onDayChange])

  const handleSliderChange = (e) => {
    const value = parseFloat(e.target.value)
    setSliderValue(value)
    if (onDisplayChange) {
      onDisplayChange(value)
    }
  }

  const handlePlayPause = () => {
    if (sliderValue >= 4) {
      setSliderValue(1)
    }
    setIsPlaying(!isPlaying)
  }

  const progress = ((sliderValue - 1) / 3) * 100

  return (
    <div className="floating-panel time-slider-panel">
      <div className="slider-header">
        <h3>Time Control</h3>
        <div className="current-day-badge">Day {sliderValue.toFixed(1)}</div>
      </div>

      <div className="slider-track">
        <input
          type="range"
          min="1"
          max="4"
          step="0.05"
          value={sliderValue}
          onChange={handleSliderChange}
          className="time-slider"
          style={{
            background: `linear-gradient(to right, #007bff ${progress}%, #ddd ${progress}%)`
          }}
        />
        <div className="slider-markers">
          <span>1.0</span>
          <span>2.0</span>
          <span>3.0</span>
          <span>4.0</span>
        </div>
      </div>

      <button 
        className="play-button"
        onClick={handlePlayPause}
      >
        {isPlaying ? '⏸ Pause' : '▶️ Play'}
      </button>
    </div>
  )
}

export default TimeSlider

