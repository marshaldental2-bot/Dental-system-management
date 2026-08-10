import React, { useState, useEffect } from 'react';
import { dentalLabService } from '../../services/dentalLabService';
import { authService } from '../../services/supabaseAuthService';
import { useNavigate } from 'react-router-dom';
import ToothSelector from '../../components/ToothSelector';

const WorkOrderForm = ({ isAdmin = false }) => {
    // Product quality suggestions
    const productQualitySuggestions = [
        'Rpd',
        'Metal',
        'Metal fc',
        'Pfm',
        'Dmls pfm',
        'Cadcam pfm',
        'Zirconia',
        'Moonlith',
        'Bruxzir',
        'U/Danture',
        'L/Danture',
        'U/L/danture',
        'U/L/imported/Danture',
        'Temporary',
        'E-max',
        'Implant pfm',
        'U/hybrid/danture',
        'L/hybrid/danture',
        'U/L/hybrid/danture',
        'U/implant/pfm',
        'L/implant/pfm',
        'U/L/implant/pfm'
    ];

    // Shade suggestions organized by category
    const shadeSuggestions = {
        vita3d: ['1m1', '1m2', '2L1.5', '2L2.5', '2M1', '2M2', '2M3', '2R1.5', '2R2.5', 
                 '3L1.5', '3L2.5', '3M1', '3M2', '3M3', '3R1.5', '3R2.5', '4L1.5', '4L2.5', 
                 '4M1', '4M2', '4R1.5', '4R2.5', '4M3', '5M1', '5M2', '5M3'],
        classical: ['B1', 'A1', 'B2', 'B2/B3', 'A2', 'A2/A3', 'C3', 'B3', 'C1', 'A3', 
                    'A3.5', 'A4', 'D2', 'C2', 'B4', 'C4','others'],
        combinations: ['A1+A2', 'A2+A3', 'B1+B2', 'B2+B3', 'A3+A4', 'C1+C2', 'A1+B1', 
                       '2M1+2M2', '3M1+3M2', '2L1.5+2L2.5', 'A2+2M2', 'B2+3M2']
    };

    // Flatten all shade suggestions for easy searching
    const allShades = [
        ...shadeSuggestions.vita3d,
        ...shadeSuggestions.classical,
        ...shadeSuggestions.combinations
    ];

    const [formData, setFormData] = useState({
        serial_number: '',
        doctor_name: '',
        patient_name: '',
        product_quality: '',
        product_shade: '',
        requires_trial: false,
        order_date: new Date().toISOString().split('T')[0],
        expected_complete_date: '',
        feedback: '',
        tooth_numbers: [], // Add tooth numbers
        is_urgent: false // <-- Add this
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredSuggestions, setFilteredSuggestions] = useState([]);
    const [showShadeSuggestions, setShowShadeSuggestions] = useState(false);
    const [filteredShadeSuggestions, setFilteredShadeSuggestions] = useState([]);
    const [validationErrors, setValidationErrors] = useState({});
    const [showValidation, setShowValidation] = useState(false);
    const navigate = useNavigate();

    // Add keyboard shortcuts for better UX
    useEffect(() => {
        const handleKeyboardShortcuts = (e) => {
            // Ctrl/Cmd + S to save form
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (!loading) {
                    const submitEvent = new Event('submit');
                    document.querySelector('form').dispatchEvent(submitEvent);
                }
            }
            
            // Escape to clear form
            if (e.key === 'Escape') {
                setMessage('');
                setShowValidation(false);
                setValidationErrors({});
            }
        };

        document.addEventListener('keydown', handleKeyboardShortcuts);
        return () => document.removeEventListener('keydown', handleKeyboardShortcuts);
    }, [loading]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        // Handle product quality autocomplete
        if (name === 'product_quality') {
            if (value.length > 0) {
                const filtered = productQualitySuggestions.filter(suggestion =>
                    suggestion.toLowerCase().includes(value.toLowerCase())
                );
                setFilteredSuggestions(filtered);
                setShowSuggestions(true);
            } else {
                setShowSuggestions(false);
            }
        }

        // Handle shade autocomplete
        if (name === 'product_shade') {
            if (value.length > 0) {
                const filtered = allShades.filter(suggestion =>
                    suggestion.toLowerCase().includes(value.toLowerCase())
                );
                setFilteredShadeSuggestions(filtered);
                setShowShadeSuggestions(true);
            } else {
                setShowShadeSuggestions(false);
            }
        }
    };

    const handleSuggestionClick = (suggestion) => {
        setFormData(prev => ({
            ...prev,
            product_quality: suggestion
        }));
        setShowSuggestions(false);
    };

    const handleShadeSuggestionClick = (suggestion) => {
        setFormData(prev => ({
            ...prev,
            product_shade: suggestion
        }));
        setShowShadeSuggestions(false);
    };

    const handleTeethChange = (selectedTeeth) => {
        setFormData(prev => ({
            ...prev,
            tooth_numbers: selectedTeeth
        }));
    };

    const handleProductQualityFocus = () => {
        if (formData.product_quality.length === 0) {
            setFilteredSuggestions(productQualitySuggestions);
            setShowSuggestions(true);
        }
    };

    const handleProductQualityBlur = () => {
        // Delay hiding suggestions to allow click
        setTimeout(() => setShowSuggestions(false), 200);
    };

    const handleShadeFocus = () => {
        if (formData.product_shade.length === 0) {
            // Show categorized suggestions when focused
            const categorizedShades = [
                ...shadeSuggestions.classical.map(s => ({ shade: s, category: 'Classical' })),
                ...shadeSuggestions.vita3d.map(s => ({ shade: s, category: 'Vita 3D' })),
                ...shadeSuggestions.combinations.map(s => ({ shade: s, category: 'Combinations' }))
            ];
            setFilteredShadeSuggestions(categorizedShades);
            setShowShadeSuggestions(true);
        }
    };

    const handleShadeBlur = () => {
        // Delay hiding suggestions to allow click
        setTimeout(() => setShowShadeSuggestions(false), 200);
    };

    const validateForm = () => {
        const errors = {};
        
        if (!formData.serial_number.trim()) {
            errors.serial_number = 'Job Number is required';
        }
        
        if (!formData.doctor_name.trim()) {
            errors.doctor_name = 'Doctor name is required';
        }
        
        if (!formData.patient_name.trim()) {
            errors.patient_name = 'Patient name is required';
        }
        
        if (!formData.product_quality.trim()) {
            errors.product_quality = 'Product quality is required';
        }
        
        if (!formData.product_shade.trim()) {
            errors.product_shade = 'Product shade is required';
        }
        
        if (!formData.order_date) {
            errors.order_date = 'Order date is required';
        }
        
        if (formData.expected_complete_date && formData.expected_complete_date < formData.order_date) {
            errors.expected_complete_date = 'Expected completion date cannot be before order date';
        }
        
        // Tooth numbers are now optional - removed validation
        
        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setValidationErrors({});
        setShowValidation(false);

        if (!validateForm()) {
            setLoading(false);
            setShowValidation(true);
            return;
        }

        try {
            const response = await dentalLabService.createWorkOrder(formData);
            
            if (response.data) {
                setMessage('Work order created successfully!');
                
                // Clear success message after 5 seconds
                setTimeout(() => {
                    setMessage('');
                }, 5000);
                
                setFormData({
                    doctor_name: '',
                    patient_name: '',
                    product_quality: '',
                    product_shade: '',
                    requires_trial: false,
                    order_date: new Date().toISOString().split('T')[0],
                    expected_complete_date: '',
                    feedback: '',
                    tooth_numbers: [] // Fix: Reset tooth numbers as well
                });
            } else {
                setMessage('Error creating work order: ' + (response.error?.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Work order creation error:', error);
            
            // Better error handling with user-friendly messages
            let errorMessage = 'Error creating work order: ';
            
            if (!navigator.onLine) {
                errorMessage = 'Network error: Please check your internet connection and try again';
            } else if (error.message.includes('fetch')) {
                errorMessage = 'Connection error: Unable to reach the server. Please try again';
            } else if (error.message.includes('Unauthorized') || error.message.includes('auth')) {
                errorMessage = 'Authentication error: Please log out and log in again';
            } else if (error.message.includes('validation') || error.message.includes('constraint')) {
                errorMessage = 'Data validation error: Please check your input and try again';
            } else {
                errorMessage += error.message || 'Unknown error occurred';
            }
            
            setMessage(errorMessage);
        }
        
        setLoading(false);
    };

    return (
        <div className="container mt-4">
            <div className="row justify-content-center">
                <div className="col-md-8">
                    <div className="card">
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <h4>🦷 New Work Order Entry {isAdmin && <span className="badge bg-warning text-dark ms-2">Admin Mode</span>}</h4>
                            <button 
                                className="btn btn-secondary btn-sm" 
                                onClick={() => {
                                    const userRole = authService.getUserRole();
                                    const isActualAdmin = authService.isAdminOrSuperAdmin();
                                    navigate(isActualAdmin ? '/admin-dashboard' : '/staff-dashboard');
                                }}
                            >
                                Back to Dashboard
                            </button>
                        </div>
                        <div className="card-body">
                            {/* Admin Mode Indicator */}
                            {isAdmin && (
                                <div className="alert alert-info mb-3" role="alert">
                                    <div className="d-flex align-items-center">
                                        <i className="bi bi-shield-check fs-5 me-2"></i>
                                        <div>
                                            <strong>🛡️ Administrator Mode</strong>
                                            <div className="small">You are creating work orders with administrative privileges.</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {message && (
                                <div className={`alert ${message.includes('Error') ? 'alert-danger' : 'alert-success'}`}>
                                    {message}
                                </div>
                            )}

                            {showValidation && Object.keys(validationErrors).length > 0 && (
                                <div className="alert alert-danger">
                                    <ul className="mb-0">
                                        {Object.entries(validationErrors).map(([key, error]) => (
                                            <li key={key}>{error}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="alert alert-info">
                                <div className="row align-items-center">
                                    <div className="col-md-8">
                                        <small>
                                            <strong>💡 Note:</strong> Serial numbers are automatically generated when you create a work order (format: WO-YYYY-NNNN)
                                        </small>
                                    </div>
                                    <div className="col-md-4 text-end">
                                        <small className="text-muted">
                                            <i className="bi bi-person me-1"></i>Patient → <i className="bi bi-tooth me-1"></i>Teeth → <i className="bi bi-file-medical me-1"></i>Work Order
                                        </small>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div className="row">
                                    <div className="col-md-12">
                                        <div className="mb-3">
                                            <label className="form-label">Job Number *</label>
                                            <input
                                                type="text"
                                                className={`form-control ${showValidation && validationErrors.serial_number ? 'is-invalid' : ''}`}
                                                name="serial_number"
                                                value={formData.serial_number}
                                                onChange={handleInputChange}
                                                placeholder="e.g. 1004"
                                                required
                                            />
                                            {showValidation && validationErrors.serial_number && (
                                                <div className="invalid-feedback">
                                                    {validationErrors.serial_number}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label">Doctor Name *</label>
                                            <input
                                                type="text"
                                                className={`form-control ${showValidation && validationErrors.doctor_name ? 'is-invalid' : ''}`}
                                                name="doctor_name"
                                                value={formData.doctor_name}
                                                onChange={handleInputChange}
                                                required
                                            />
                                            {showValidation && validationErrors.doctor_name && (
                                                <div className="invalid-feedback">
                                                    {validationErrors.doctor_name}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label">Patient Name *</label>
                                            <input
                                                type="text"
                                                className={`form-control ${showValidation && validationErrors.patient_name ? 'is-invalid' : ''}`}
                                                name="patient_name"
                                                value={formData.patient_name}
                                                onChange={handleInputChange}
                                                required
                                            />
                                            {showValidation && validationErrors.patient_name && (
                                                <div className="invalid-feedback">
                                                    {validationErrors.patient_name}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="row">
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label">Product Quality *</label>
                                            <div className="position-relative">
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    name="product_quality"
                                                    value={formData.product_quality}
                                                    onChange={handleInputChange}
                                                    onFocus={handleProductQualityFocus}
                                                    onBlur={handleProductQualityBlur}
                                                    placeholder="Type or select product quality..."
                                                    required
                                                    autoComplete="off"
                                                />
                                                {showSuggestions && filteredSuggestions.length > 0 && (
                                                    <div className="autocomplete-dropdown">
                                                        {filteredSuggestions.map((suggestion, index) => (
                                                            <div
                                                                key={index}
                                                                className="autocomplete-item"
                                                                onMouseDown={() => handleSuggestionClick(suggestion)}
                                                            >
                                                                {suggestion}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <small className="text-muted">
                                                Common types: Rpd, Metal, Pfm, Zirconia, E-max, etc.
                                            </small>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label">Product Shade *</label>
                                            <div className="position-relative">
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    name="product_shade"
                                                    value={formData.product_shade}
                                                    onChange={handleInputChange}
                                                    onFocus={handleShadeFocus}
                                                    onBlur={handleShadeBlur}
                                                    placeholder="e.g., A1, B2, 2M1, A1+A2..."
                                                    required
                                                    autoComplete="off"
                                                />
                                                {showShadeSuggestions && filteredShadeSuggestions.length > 0 && (
                                                    <div className="autocomplete-dropdown" style={{maxHeight: '250px'}}>
                                                        {/* Group suggestions by category when showing all */}
                                                        {formData.product_shade.length === 0 ? (
                                                            // Show categorized view when field is empty
                                                            <>
                                                                <div className="p-2 bg-light fw-bold small">Classical Shades</div>
                                                                {shadeSuggestions.classical.map((shade, index) => (
                                                                    <div
                                                                        key={`classical-${index}`}
                                                                        className="autocomplete-item"
                                                                        onMouseDown={() => handleShadeSuggestionClick(shade)}
                                                                    >
                                                                        {shade}
                                                                    </div>
                                                                ))}
                                                                <div className="p-2 bg-light fw-bold small border-top">Vita 3D Shades</div>
                                                                {shadeSuggestions.vita3d.map((shade, index) => (
                                                                    <div
                                                                        key={`vita3d-${index}`}
                                                                        className="autocomplete-item"
                                                                        onMouseDown={() => handleShadeSuggestionClick(shade)}
                                                                    >
                                                                        {shade}
                                                                    </div>
                                                                ))}
                                                                <div className="p-2 bg-light fw-bold small border-top">Combinations</div>
                                                                {shadeSuggestions.combinations.map((shade, index) => (
                                                                    <div
                                                                        key={`combination-${index}`}
                                                                        className="autocomplete-item"
                                                                        onMouseDown={() => handleShadeSuggestionClick(shade)}
                                                                    >
                                                                        {shade}
                                                                    </div>
                                                                ))}
                                                            </>
                                                        ) : (
                                                            // Show filtered results when typing
                                                            filteredShadeSuggestions.map((shade, index) => (
                                                                <div
                                                                    key={index}
                                                                    className="autocomplete-item"
                                                                    onMouseDown={() => handleShadeSuggestionClick(shade)}
                                                                >
                                                                    {shade}
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                )}
                                            </div>                            <small className="text-muted">
                                Classical (A1, B2), Vita 3D (2M1, 3L1.5), or Combinations (A1+A2)
                            </small>
                        </div>
                    </div>                                </div>

                {/* Tooth Position Selector */}
                <div className="mb-4">
                    <ToothSelector
                        selectedTeeth={formData.tooth_numbers}
                        onTeethChange={handleTeethChange}
                        disabled={loading}
                        patientName={formData.patient_name}
                    />
                    {showValidation && validationErrors.tooth_numbers && (
                        <div className="alert alert-danger mt-3">
                            <small><i className="bi bi-exclamation-triangle me-1"></i>{validationErrors.tooth_numbers}</small>
                        </div>
                    )}
                </div>

                <div className="row">
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label">Order Date *</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                name="order_date"
                                                value={formData.order_date}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label">Expected Complete Date</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                name="expected_complete_date"
                                                value={formData.expected_complete_date}
                                                onChange={handleInputChange}
                                                min={formData.order_date}
                                            />
                                            <small className="text-muted">When do you expect this work to be completed?</small>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <div className="form-check">
                                        <input
                                            type="checkbox"
                                            className="form-check-input"
                                            name="requires_trial"
                                            id="requires_trial"
                                            checked={formData.requires_trial}
                                            onChange={handleInputChange}
                                        />
                                        <label className="form-check-label" htmlFor="requires_trial">
                                            This product requires trial fittings
                                        </label>
                                    </div>
                                </div>
 <div className="mb-3">
            <div className="form-check">
                <input
                    type="checkbox"
                    className="form-check-input"
                    name="is_urgent"
                    id="is_urgent"
                    checked={formData.is_urgent}
                    onChange={handleInputChange}
                />
                <label className="form-check-label" htmlFor="is_urgent">
                    🔥 Mark as Urgent
                </label>
            </div>
        </div>
                                <div className="mb-3">
                                    <label className="form-label">Feedback / Reason / Notes</label>
                                    <textarea
                                        className="form-control"
                                        name="feedback"
                                        value={formData.feedback}
                                        onChange={handleInputChange}
                                        rows="3"
                                        placeholder="Add any special instructions, feedback, or notes about this work order..."
                                    ></textarea>
                                    <small className="text-muted">
                                        Optional: Add special requirements, doctor feedback, or any notes
                                    </small>
                                </div>

                                <div className="d-grid">
                                    <button 
                                        type="submit" 
                                        className="btn btn-primary btn-lg"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                Creating Work Order...
                                            </>
                                        ) : (
                                            <>
                                                🦷 Create Work Order
                                            </>
                                        )}
                                    </button>
                                    
                                    <small className="text-muted text-center mt-2">
                                        💡 Tip: Use Ctrl+S to save quickly | Press Escape to clear alerts
                                    </small>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkOrderForm;
