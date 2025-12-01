function InfoPanel({ currentDay }) {
  return (
    <div className="floating-panel info-panel">
      <h1>Great Lakes Ice Prediction</h1>
      <p><strong>USNIC Ice Forecast</strong></p>
      <p>Predicted Ice Concentration: Day +{currentDay}</p>
      <p style={{ fontSize: '12px', marginTop: '8px', color: '#999' }}>
        Machine learning prediction for USCG mission planning
      </p>
    </div>
  )
}

export default InfoPanel

