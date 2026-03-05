import { useState } from 'react';
import './SkillLevelSelector.css';

const skillLevels = [
  {
    id: 'beginner',
    label: 'Beginner',
    description: 'Clean lines, minimal shading, perfect for starting out',
    icon: '🌱'
  },
  {
    id: 'intermediate',
    label: 'Intermediate',
    description: 'Guided shading with cross-hatching and depth cues',
    icon: '🌿'
  },
  {
    id: 'advanced',
    label: 'Advanced',
    description: 'Detailed strokes, contour shading, professional style',
    icon: '🎨'
  }
];

function SkillLevelSelector({ onSelect, onCancel }) {
  const [selectedLevel, setSelectedLevel] = useState(null);

  const handleSelect = (levelId) => {
    setSelectedLevel(levelId);
  };

  const handleConfirm = () => {
    if (selectedLevel) {
      onSelect(selectedLevel);
    }
  };

  return (
    <div className="skill-level-selector">
      <h3 className="selector-title">Choose Your Drawing Level</h3>
      <p className="selector-subtitle">Select the style that matches your skill level</p>

      <div className="skill-options">
        {skillLevels.map((level) => (
          <button
            key={level.id}
            className={`skill-option ${selectedLevel === level.id ? 'selected' : ''}`}
            onClick={() => handleSelect(level.id)}
          >
            <span className="skill-icon">{level.icon}</span>
            <span className="skill-label">{level.label}</span>
            <span className="skill-description">{level.description}</span>
          </button>
        ))}
      </div>

      <div className="selector-actions">
        <button
          className="confirm-btn"
          onClick={handleConfirm}
          disabled={!selectedLevel}
        >
          Generate Line Art
        </button>
        <button className="cancel-btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default SkillLevelSelector;
