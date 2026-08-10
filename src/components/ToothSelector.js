import React, { useState } from 'react';
import './ToothSelector.css';

const ToothSelector = ({ selectedTeeth, onTeethChange, disabled = false, patientName = '' }) => {
    const [inputMode, setInputMode] = useState('visual'); // 'visual' or 'text'

    // Tooth numbering system (FDI notation)
    const quadrants = {
        upperRight: { quadrant: 1, teeth: [18, 17, 16, 15, 14, 13, 12, 11] },
        upperLeft: { quadrant: 2, teeth: [21, 22, 23, 24, 25, 26, 27, 28] },
        lowerLeft: { quadrant: 3, teeth: [31, 32, 33, 34, 35, 36, 37, 38] },
        lowerRight: { quadrant: 4, teeth: [41, 42, 43, 44, 45, 46, 47, 48] }
    };

    const getToothName = (toothNumber) => {
        const names = {
            // Upper Right
            18: 'UR8', 17: 'UR7', 16: 'UR6', 15: 'UR5', 14: 'UR4', 13: 'UR3', 12: 'UR2', 11: 'UR1',
            // Upper Left  
            21: 'UL1', 22: 'UL2', 23: 'UL3', 24: 'UL4', 25: 'UL5', 26: 'UL6', 27: 'UL7', 28: 'UL8',
            // Lower Left
            31: 'LL1', 32: 'LL2', 33: 'LL3', 34: 'LL4', 35: 'LL5', 36: 'LL6', 37: 'LL7', 38: 'LL8',
            // Lower Right
            41: 'LR1', 42: 'LR2', 43: 'LR3', 44: 'LR4', 45: 'LR5', 46: 'LR6', 47: 'LR7', 48: 'LR8'
        };
        return names[toothNumber] || toothNumber.toString();
    };

    const toggleTooth = (toothNumber) => {
        if (disabled) return;
        
        const newSelected = selectedTeeth.includes(toothNumber)
            ? selectedTeeth.filter(t => t !== toothNumber)
            : [...selectedTeeth, toothNumber].sort((a, b) => a - b);
        
        onTeethChange(newSelected);
    };

    const handleTextInput = (value) => {
        if (disabled) return;
        
        // Parse comma-separated tooth numbers
        const teeth = value
            .split(',')
            .map(t => parseInt(t.trim()))
            .filter(t => !isNaN(t) && t >= 11 && t <= 48)
            .sort((a, b) => a - b);
        
        onTeethChange([...new Set(teeth)]); // Remove duplicates
    };

    const formatTeethForDisplay = () => {
        return selectedTeeth.map(t => getToothName(t)).join(', ');
    };

    const formatTeethByQuadrant = () => {
        const byQuadrant = {
            upperRight: selectedTeeth.filter(t => t >= 11 && t <= 18),
            upperLeft: selectedTeeth.filter(t => t >= 21 && t <= 28),
            lowerLeft: selectedTeeth.filter(t => t >= 31 && t <= 38),
            lowerRight: selectedTeeth.filter(t => t >= 41 && t <= 48)
        };
        
        return byQuadrant;
    };

    const archCoordinates = {
        // Upper Right (Patient's right, left side of screen)
        18: { left: '10%', top: '43%' }, 17: { left: '11%', top: '36%' }, 16: { left: '13%', top: '28%' }, 15: { left: '16%', top: '21%' },
        14: { left: '21%', top: '15%' }, 13: { left: '27%', top: '9%' }, 12: { left: '35%', top: '5%' }, 11: { left: '44%', top: '3%' },
        // Upper Left (Patient's left, right side of screen)
        21: { left: '56%', top: '3%' }, 22: { left: '65%', top: '5%' }, 23: { left: '73%', top: '9%' }, 24: { left: '79%', top: '15%' },
        25: { left: '84%', top: '21%' }, 26: { left: '87%', top: '28%' }, 27: { left: '89%', top: '36%' }, 28: { left: '90%', top: '43%' },
        
        // Lower Right (Patient's right, left side of screen)
        48: { left: '10%', top: '57%' }, 47: { left: '11%', top: '64%' }, 46: { left: '13%', top: '72%' }, 45: { left: '16%', top: '79%' },
        44: { left: '21%', top: '85%' }, 43: { left: '27%', top: '91%' }, 42: { left: '35%', top: '95%' }, 41: { left: '44%', top: '97%' },
        // Lower Left (Patient's left, right side of screen)
        31: { left: '56%', top: '97%' }, 32: { left: '65%', top: '95%' }, 33: { left: '73%', top: '91%' }, 34: { left: '79%', top: '85%' },
        35: { left: '84%', top: '79%' }, 36: { left: '87%', top: '72%' }, 37: { left: '89%', top: '64%' }, 38: { left: '90%', top: '57%' }
    };

    const renderTooth = (toothNumber, isUpper) => {
        const coords = archCoordinates[toothNumber];
        if (!coords) return null;
        
        const isSelected = selectedTeeth.includes(toothNumber);
        // Add shape classes based on tooth type
        let shapeClass = 'tooth-incisor';
        if ([14, 15, 24, 25, 34, 35, 44, 45].includes(toothNumber)) shapeClass = 'tooth-premolar';
        if ([16, 17, 18, 26, 27, 28, 36, 37, 38, 46, 47, 48].includes(toothNumber)) shapeClass = 'tooth-molar';

        return (
            <button
                key={toothNumber}
                type="button"
                className={`tooth-btn ${shapeClass} ${isUpper ? 'upper-tooth' : 'lower-tooth'} ${isSelected ? 'selected' : ''}`}
                style={{ left: coords.left, top: coords.top }}
                onClick={() => toggleTooth(toothNumber)}
                disabled={disabled}
                title={`Tooth ${toothNumber} (${getToothName(toothNumber)})`}
            >
                {toothNumber}
            </button>
        );
    };

    return (
        <div className="tooth-selector">
            {/* Patient Context Header */}
            {patientName ? (
                <div className="patient-context-header mb-3">
                    <div className="card border-primary">
                        <div className="card-body p-3">
                            <div className="d-flex align-items-center">
                                <div className="me-3">
                                    <i className="bi bi-person-fill text-primary" style={{fontSize: '1.5rem'}}></i>
                                </div>
                                <div>
                                    <h6 className="mb-1 text-primary">Selecting Teeth for Patient:</h6>
                                    <div className="fw-bold fs-5">{patientName}</div>
                                    <small className="text-muted">Choose the specific tooth positions that will be worked on (optional)</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="patient-context-header mb-3">
                    <div className="alert alert-warning">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        <strong>Please enter the patient name first</strong> to provide context for tooth selection.
                    </div>
                </div>
            )}

            <div className="d-flex justify-content-between align-items-center mb-3">
                <label className="form-label fw-bold mb-0">
                    🦷 Tooth Position(s) {patientName && `for ${patientName}`} <small className="text-muted fw-normal">(Optional)</small>
                </label>
                <div className="btn-group btn-group-sm" role="group">
                    <button
                        type="button"
                        className={`btn ${inputMode === 'visual' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setInputMode('visual')}
                        disabled={disabled}
                    >
                        Visual
                    </button>
                    <button
                        type="button"
                        className={`btn ${inputMode === 'text' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setInputMode('text')}
                        disabled={disabled}
                    >
                        Numbers
                    </button>
                </div>
            </div>

            {inputMode === 'visual' ? (
                <div className="dental-chart text-center">
                    <div className="mouth-container">
                        {/* Upper Jaw (11-18, 21-28) */}
                        {quadrants.upperRight.teeth.map(t => renderTooth(t, true))}
                        {quadrants.upperLeft.teeth.map(t => renderTooth(t, true))}
                        
                        {/* Lower Jaw (41-48, 31-38) */}
                        {quadrants.lowerRight.teeth.map(t => renderTooth(t, false))}
                        {quadrants.lowerLeft.teeth.map(t => renderTooth(t, false))}
                        
                        <div className="mouth-center-label">
                            <span className="text-muted">Top</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-input-mode">
                    <textarea
                        className="form-control"
                        rows="3"
                        placeholder="Enter tooth numbers separated by commas (e.g., 11, 12, 21, 46)"
                        value={selectedTeeth.join(', ')}
                        onChange={(e) => handleTextInput(e.target.value)}
                        disabled={disabled}
                    />
                    <small className="form-text text-muted">
                        Use FDI notation: 11-18 (Upper Right), 21-28 (Upper Left), 31-38 (Lower Left), 41-48 (Lower Right)
                    </small>
                </div>
            )}

            {/* Selected Teeth Summary */}
            {selectedTeeth.length > 0 && (
                <div className="selected-summary mt-3">
                    <div className="alert alert-success border">
                        <div className="d-flex justify-content-between align-items-start">
                            <div>
                                <strong>
                                    🦷 Selected Teeth for {patientName || 'Patient'} ({selectedTeeth.length}):
                                </strong>
                                <div className="mt-1">
                                    <span className="badge bg-primary me-1">Numbers: {selectedTeeth.join(', ')}</span>
                                    <span className="badge bg-secondary">Names: {formatTeethForDisplay()}</span>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => onTeethChange([])}
                                disabled={disabled}
                                title="Clear all selections"
                            >
                                Clear All
                            </button>
                        </div>
                        
                        {/* Quadrant Summary (like your client's system) */}
                        <div className="quadrant-summary mt-2">
                            <small className="text-muted">By Position:</small>
                            <div className="row mt-1">
                                {Object.entries(formatTeethByQuadrant()).map(([quadrant, teeth]) => (
                                    teeth.length > 0 && (
                                        <div key={quadrant} className="col-6 col-md-3">
                                            <div className="quadrant-box p-2 border rounded text-center">
                                                <div className="fw-bold" style={{fontSize: '0.8em'}}>
                                                    {quadrant.replace(/([A-Z])/g, ' $1').trim()}
                                                </div>
                                                <div className="text-primary">
                                                    {teeth.map(t => t.toString().charAt(1)).join('')}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ToothSelector;
