import React, { useState } from 'react';
import { dentalLabService } from '../../services/dentalLabService';
import { authService } from '../../services/supabaseAuthService';
import { useNavigate } from 'react-router-dom';
import ToothSelector from '../../components/ToothSelector';

const BatchWorkOrderForm = ({ isAdmin = false }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    
    // Common doctor info for all orders
    const [doctorInfo, setDoctorInfo] = useState({
        doctor_name: '',
        order_date: new Date().toISOString().split('T')[0],
        expected_complete_date: ''
    });
    
    // Array of work orders
    const [workOrders, setWorkOrders] = useState([
        {
            id: 1,
            serial_number: '',
            patient_name: '',
            product_quality: '',
            product_shade: '',
            requires_trial: false,
            trial_date_1: '',
            trial_date_2: '',
            feedback: '',
            is_urgent: false, // <-- Add this
            tooth_numbers: [] // Add tooth selection for each patient
        }
    ]);

    // Product suggestions (same as single form)
    const productQualitySuggestions = [
        'Rpd', 'Metal', 'Metal fc', 'Pfm', 'Dmls pfm', 'Cadcam pfm',
        'Zirconia', 'Moonlith', 'Bruxzir', 'U/Danture', 'L/Danture',
        'U/L/danture', 'U/L/imported/Danture', 'Temporary', 'E-max',
        'Implant pfm', 'U/hybrid/danture', 'L/hybrid/danture', 
        'U/L/hybrid/danture', 'U/implant/pfm', 'L/implant/pfm', 'U/L/implant/pfm'
    ];

    const shadeSuggestions = {
        vita3d: ['1m1', '1m2', '2L1.5', '2L2.5', '2M1', '2M2', '2M3', '2R1.5', '2R2.5', 
                 '3L1.5', '3L2.5', '3M1', '3M2', '3M3', '3R1.5', '3R2.5', '4L1.5', '4L2.5', 
                 '4M1', '4M2', '4R1.5', '4R2.5', '4M3', '5M1', '5M2', '5M3'],
        classical: ['B1', 'A1', 'B2', 'B2/B3', 'A2', 'A2/A3', 'C3', 'B3', 'C1', 'A3', 
                    'A3.5', 'A4', 'D2', 'C2', 'B4', 'C4','others'],
        combinations: ['A1+A2', 'A2+A3', 'B1+B2', 'B2+B3', 'A3+A4', 'C1+C2', 'A1+B1', 
                       '2M1+2M2', '3M1+3M2', '2L1.5+2L2.5', 'A2+2M2', 'B2+3M2']
    };

    const allShades = [...shadeSuggestions.vita3d, ...shadeSuggestions.classical, ...shadeSuggestions.combinations];

    const handleDoctorInfoChange = (e) => {
        const { name, value } = e.target;
        setDoctorInfo(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleToothChange = (index, selectedTeeth) => {
        setWorkOrders(prev => prev.map((order, i) => 
            i === index ? { ...order, tooth_numbers: selectedTeeth } : order
        ));
    };

    const handleWorkOrderChange = (index, field, value) => {
        setWorkOrders(prev => prev.map((order, i) => 
            i === index ? { ...order, [field]: value } : order
        ));
    };

    const addWorkOrder = () => {
        const newOrder = {
            id: workOrders.length + 1,
            patient_name: '',
            product_quality: '',
            product_shade: '',
            requires_trial: false,
            trial_date_1: '',
            trial_date_2: '',
            feedback: '',
            is_urgent: false, // <-- Add this
            tooth_numbers: [] // Add tooth selection for new orders
        };
        setWorkOrders(prev => [...prev, newOrder]);
    };

    const removeWorkOrder = (index) => {
        if (workOrders.length > 1) {
            setWorkOrders(prev => prev.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            // Validate all work orders have required fields including teeth
            const validationErrors = [];
            workOrders.forEach((order, index) => {
                if (!order.patient_name.trim()) {
                    validationErrors.push(`Order #${index + 1}: Patient name is required`);
                }
                if (!order.product_quality.trim()) {
                    validationErrors.push(`Order #${index + 1}: Product quality is required`);
                }
                if (!order.product_shade.trim()) {
                    validationErrors.push(`Order #${index + 1}: Product shade is required`);
                }
                // Tooth numbers are now optional - removed validation
            });

            if (validationErrors.length > 0) {
                setMessage('Please fix the following errors:\n• ' + validationErrors.join('\n• '));
                setLoading(false);
                return;
            }

            const results = [];
            let errorCount = 0;
            
            // Generate a batch ID for all work orders in this batch
            const batchId = crypto.randomUUID();

            for (const order of workOrders) {
                // Remove the React state id before sending to database
                const { id, ...orderWithoutId } = order;
                
                const workOrderData = {
                    ...doctorInfo,
                    ...orderWithoutId,
                    requires_trial: order.requires_trial,
                    batch_id: batchId // Add batch ID to group these orders
                };

                const response = await dentalLabService.createWorkOrder(workOrderData);
                
                if (response.data) {
                    results.push({ success: true, data: response.data });
                } else {
                    results.push({ success: false, error: response.error });
                    errorCount++;
                }
            }

            if (errorCount === 0) {
                setMessage(`🎉 All ${workOrders.length} work orders created successfully as a batch! They can now be grouped for billing.`);
                // Reset form
                setDoctorInfo({
                    doctor_name: '',
                    order_date: new Date().toISOString().split('T')[0],
                    expected_complete_date: ''
                });
                setWorkOrders([{
                    id: 1,
                    patient_name: '',
                    product_quality: '',
                    product_shade: '',
                    requires_trial: false,
                    trial_date_1: '',
                    trial_date_2: '',
                    feedback: '',
                    tooth_numbers: [] // Reset tooth numbers as well
                }]);
            } else {
                setMessage(`⚠️ ${workOrders.length - errorCount} orders created successfully, ${errorCount} failed. Please check and retry failed orders.`);
            }
        } catch (error) {
            setMessage('Error creating work orders: ' + error.message);
        }
        
        setLoading(false);
    };

    return (
        <div className="container mt-4">
            <div className="row justify-content-center">
                <div className="col-12">
                    <div className="card">
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <div>
                                <h4>🦷 Batch Work Order Entry</h4>
                                <small className="text-muted">Create multiple work orders for the same doctor - Each patient with specific teeth positions</small>
                            </div>
                            <div>
                                <button 
                                    className="btn btn-outline-primary btn-sm me-2" 
                                    onClick={() => navigate('/work-order-form')}
                                >
                                    Single Order
                                </button>
                                <button 
                                    className="btn btn-secondary btn-sm" 
                                    onClick={() => {
                                        const isActualAdmin = authService.isAdminOrSuperAdmin();
                                        navigate(isActualAdmin ? '/admin-dashboard' : '/staff-dashboard');
                                    }}
                                >
                                    Back to Dashboard
                                </button>
                            </div>
                        </div>
                        <div className="card-body">
                            {message && (
                                <div className={`alert ${message.includes('Error') || message.includes('failed') ? 'alert-danger' : 'alert-success'}`}>
                                    {message}
                                </div>
                            )}

                            <div className="alert alert-info">
                                <div className="row align-items-center">
                                    <div className="col-md-8">
                                        <small>
                                            <strong>💡 Batch Entry:</strong> Enter doctor information once, then add multiple work orders. Serial numbers are auto-generated for each order.
                                        </small>
                                    </div>
                                    <div className="col-md-4 text-end">
                                        <small className="text-muted">
                                            <i className="bi bi-person me-1"></i>Patient → <i className="bi bi-tooth me-1"></i>Teeth → <i className="bi bi-tools me-1"></i>Work
                                        </small>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit}>
                                {/* Doctor Information Section */}
                                <div className="card mb-4 bg-light">
                                    <div className="card-header">
                                        <h6 className="mb-0">👨‍⚕️ Doctor Information (Common for all orders)</h6>
                                    </div>
                                    <div className="card-body">
                                        <div className="row">
                                            <div className="col-md-4">
                                                <div className="mb-3">
                                                    <label className="form-label">Doctor Name *</label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        name="doctor_name"
                                                        value={doctorInfo.doctor_name}
                                                        onChange={handleDoctorInfoChange}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-4">
                                                <div className="mb-3">
                                                    <label className="form-label">Order Date *</label>
                                                    <input
                                                        type="date"
                                                        className="form-control"
                                                        name="order_date"
                                                        value={doctorInfo.order_date}
                                                        onChange={handleDoctorInfoChange}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-4">
                                                <div className="mb-3">
                                                    <label className="form-label">Expected Complete Date</label>
                                                    <input
                                                        type="date"
                                                        className="form-control"
                                                        name="expected_complete_date"
                                                        value={doctorInfo.expected_complete_date}
                                                        onChange={handleDoctorInfoChange}
                                                        min={doctorInfo.order_date}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Work Orders Section */}
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h6>📋 Work Orders ({workOrders.length})</h6>
                                    <button
                                        type="button"
                                        className="btn btn-success btn-sm"
                                        onClick={addWorkOrder}
                                    >
                                        + Add Another Order
                                    </button>
                                </div>

                                {workOrders.map((order, index) => (
                                    <div key={order.id} className="card mb-3 border-primary">
                                        <div className="card-header d-flex justify-content-between align-items-center bg-primary bg-opacity-10">
                                            <h6 className="mb-0">Order #{index + 1}</h6>
                                            {workOrders.length > 1 && (
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-danger btn-sm"
                                                    onClick={() => removeWorkOrder(index)}
                                                >
                                                    ✕ Remove
                                                </button>
                                            )}
                                        </div>
                                        <div className="card-body">
                                            <div className="row mb-3">
                                                <div className="col-md-12">
                                                    <label className="form-label">Job Number *</label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        value={order.serial_number}
                                                        onChange={(e) => handleWorkOrderChange(index, 'serial_number', e.target.value)}
                                                        placeholder="e.g. 1004"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="row">
                                                <div className="col-md-3">
                                                    <div className="mb-3">
                                                        <label className="form-label">Patient Name *</label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            value={order.patient_name}
                                                            onChange={(e) => handleWorkOrderChange(index, 'patient_name', e.target.value)}
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-md-3">
                                                    <div className="mb-3">
                                                        <label className="form-label">Product Quality *</label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            value={order.product_quality}
                                                            onChange={(e) => handleWorkOrderChange(index, 'product_quality', e.target.value)}
                                                            placeholder="e.g., Pfm, Zirconia..."
                                                            list={`quality-suggestions-${index}`}
                                                            required
                                                        />
                                                        <datalist id={`quality-suggestions-${index}`}>
                                                            {productQualitySuggestions.map((suggestion, i) => (
                                                                <option key={i} value={suggestion} />
                                                            ))}
                                                        </datalist>
                                                    </div>
                                                </div>
                                                <div className="col-md-3">
                                                    <div className="mb-3">
                                                        <label className="form-label">Product Shade *</label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            value={order.product_shade}
                                                            onChange={(e) => handleWorkOrderChange(index, 'product_shade', e.target.value)}
                                                            placeholder="e.g., A1, B2, 2M1..."
                                                            list={`shade-suggestions-${index}`}
                                                            required
                                                        />
                                                        <datalist id={`shade-suggestions-${index}`}>
                                                            {allShades.map((shade, i) => (
                                                                <option key={i} value={shade} />
                                                            ))}
                                                        </datalist>
                                                    </div>
                                                </div>
                                                <div className="col-md-3">
                                                    <div className="mb-3">
                                                        <label className="form-label">Requires Trial</label>
                                                        <div className="form-check mt-2">
                                                            <input
                                                                type="checkbox"
                                                                className="form-check-input"
                                                                checked={order.requires_trial}
                                                                onChange={(e) => handleWorkOrderChange(index, 'requires_trial', e.target.checked)}
                                                            />
                                                            <label className="form-check-label">
                                                                Trial needed
                                                            </label>
                                                        </div>
                                                    </div>
                                                     <div className="form-check">
                <input
                    type="checkbox"
                    className="form-check-input"
                    checked={order.is_urgent}
                    onChange={(e) => handleWorkOrderChange(index, 'is_urgent', e.target.checked)}
                />
                <label className="form-check-label">
                    🔥 Mark as Urgent
                </label>
            </div>
                                                </div>
                                            </div>

                                            {order.requires_trial && (
                                                <div className="row">
                                                    <div className="col-md-6">
                                                        <div className="mb-3">
                                                            <label className="form-label">First Trial Date</label>
                                                            <input
                                                                type="date"
                                                                className="form-control"
                                                                value={order.trial_date_1}
                                                                onChange={(e) => handleWorkOrderChange(index, 'trial_date_1', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="col-md-6">
                                                        <div className="mb-3">
                                                            <label className="form-label">Second Trial Date</label>
                                                            <input
                                                                type="date"
                                                                className="form-control"
                                                                value={order.trial_date_2}
                                                                onChange={(e) => handleWorkOrderChange(index, 'trial_date_2', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="mb-3">
                                                <label className="form-label">Notes / Feedback</label>
                                                <textarea
                                                    className="form-control"
                                                    value={order.feedback}
                                                    onChange={(e) => handleWorkOrderChange(index, 'feedback', e.target.value)}
                                                    rows="2"
                                                    placeholder="Special instructions for this order..."
                                                ></textarea>
                                            </div>

                                            {/* Tooth Selection - Enhanced */}
                                            <div className="mb-3">
                                                <div className="card border-info">
                                                    <div className="card-header bg-info text-white py-2">
                                                        <small className="mb-0">
                                                            <i className="bi bi-tooth me-1"></i>
                                                            <strong>Tooth Positions for {order.patient_name || `Patient #${index + 1}`}</strong>
                                                        </small>
                                                    </div>
                                                    <div className="card-body py-3">
                                                        {!order.patient_name && (
                                                            <div className="alert alert-warning py-2 mb-2">
                                                                <small>Please enter patient name first to track teeth properly</small>
                                                            </div>
                                                        )}
                                                        
                                                        <ToothSelector
                                                            selectedTeeth={order.tooth_numbers || []}
                                                            onTeethChange={(selectedTeeth) => handleToothChange(index, selectedTeeth)}
                                                            disabled={!order.patient_name}
                                                            patientName={order.patient_name}
                                                        />
                                                        
                                                        {order.tooth_numbers && order.tooth_numbers.length > 0 && (
                                                            <div className="mt-2">
                                                                <small className="text-success">
                                                                    <i className="bi bi-check-circle me-1"></i>
                                                                    <strong>{order.tooth_numbers.length} teeth selected:</strong> {order.tooth_numbers.sort((a, b) => a - b).join(', ')}
                                                                </small>
                                                            </div>
                                                        )}
                                                        
                                                        {order.patient_name && (!order.tooth_numbers || order.tooth_numbers.length === 0) && (
                                                            <div className="mt-2">
                                                                <small className="text-danger">
                                                                    <i className="bi bi-exclamation-triangle me-1"></i>
                                                                    Please select teeth for {order.patient_name}
                                                                </small>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                                    <button
                                        type="button"
                                        className="btn btn-success me-md-2"
                                        onClick={addWorkOrder}
                                    >
                                        + Add Another Order
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="btn btn-primary btn-lg"
                                        disabled={loading}
                                    >
                                        {loading ? 'Creating Orders...' : `Create ${workOrders.length} Work Order${workOrders.length > 1 ? 's' : ''}`}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BatchWorkOrderForm;
