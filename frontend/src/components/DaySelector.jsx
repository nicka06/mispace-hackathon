function DaySelector({ currentDay, onDayChange }) {
  const days = [1, 2, 3, 4]

  return (
    <div className="floating-panel day-selector">
      <div className="day-buttons">
        {days.map(day => (
          <button
            key={day}
            className={`day-button ${currentDay === day ? 'active' : ''}`}
            onClick={() => onDayChange(day)}
          >
            Day +{day}
          </button>
        ))}
      </div>
    </div>
  )
}

export default DaySelector

