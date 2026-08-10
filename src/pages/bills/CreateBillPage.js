/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { dentalLabService } from '../../services/dentalLabService';

const CreateBillPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [workOrder, setWorkOrder] = useState(null);
    const [billData, setBillData] = useState({
        doctor_name: '',
        patient_name: '',
        product_quality: '',
        product_shade: '',
        tooth_numbers: [],
        bill_amount: '',
        notes: '',
        bill_date: new Date().toISOString().split('T')[0],
        completion_date: '',
        work_order_id: null
    });

    // Format date to dd-mm-yyyy
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };

    useEffect(() => {
        console.log('CreateBillPage mounted');
        console.log('Location state:', location.state);
        console.log('URL params:', Object.fromEntries(searchParams));

        // Prioritize work order from navigation state (this is the normal flow)
        const workOrderFromState = location.state?.workOrder;
        const workOrderIdFromUrl = searchParams.get('workOrderId');
        
        if (workOrderFromState) {
            console.log('✅ Using work order from navigation state:', workOrderFromState);
            setWorkOrder(workOrderFromState);
            populateBillData(workOrderFromState);
        } else if (workOrderIdFromUrl) {
            console.log('⚠️ Navigation state missing, attempting to load work order from URL parameter:', workOrderIdFromUrl);
            console.log('This suggests the page was refreshed or accessed directly');
            loadWorkOrder(workOrderIdFromUrl);
        } else {
            console.error('❌ No work order data found in navigation state or URL');
            setMessage('Error: No work order data found. Please go back to the work orders list and try clicking the bill button again.');
        }
    }, [location.state, searchParams]);

    const loadWorkOrder = async (workOrderId) => {
        try {
            setLoading(true);
            console.log('Loading work order with ID:', workOrderId, typeof workOrderId);
            
            const result = await dentalLabService.getWorkOrders();
            
            if (result.error) {
                throw new Error(result.error.message);
            }
            
            console.log('Available work orders:', result.data?.length, 'orders');
            console.log('Looking for order with ID:', workOrderId);
            
            // Try both string and number comparison
            const order = result.data.find(o => 
                o.id === parseInt(workOrderId) || 
                o.id === workOrderId ||
                o.id.toString() === workOrderId
            );
            
            if (!order) {
                console.error('Work order not found. Available IDs:', result.data.map(o => ({ id: o.id, serial: o.serial_number })));
                throw new Error(`Work order with ID ${workOrderId} not found. Please check if the work order exists and try again.`);
            }
            
            console.log('Found work order:', order);
            setWorkOrder(order);
            populateBillData(order);
        } catch (error) {
            console.error('Error loading work order:', error);
            setMessage(`Error loading work order: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const populateBillData = (order) => {
        setBillData({
            doctor_name: order.doctor_name || '',
            patient_name: order.patient_name || '',
            product_quality: order.product_quality || '',
            product_shade: order.product_shade || '',
            tooth_numbers: order.tooth_numbers || [],
            bill_amount: '',
            notes: order.notes || '',
            bill_date: new Date().toISOString().split('T')[0],
            completion_date: order.completion_date || '',
            work_order_id: order.id,
            serial_number: order.serial_number
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setBillData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!billData.bill_amount || parseFloat(billData.bill_amount) <= 0) {
            setMessage('Please enter a valid bill amount');
            return;
        }

        try {
            setLoading(true);
            setMessage('');

            console.log('Creating bill with data:', billData);
            const result = await dentalLabService.createBill(billData);
            
            if (result.error) {
                throw new Error(result.error.message);
            }

            console.log('Bill created successfully:', result.data);
            setMessage('Bill created successfully!');
            
            // Call onBillCreated callback if provided
            if (location.state?.onBillCreated) {
                location.state.onBillCreated();
            }
            
            // Navigate back to work orders list after a brief delay
            setTimeout(() => {
                navigate('/work-orders-list', { 
                    state: { 
                        message: `Bill created successfully for order ${workOrder?.serial_number}` 
                    }
                });
            }, 1500);
            
        } catch (error) {
            console.error('Error creating bill:', error);
            setMessage(`Error creating bill: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        navigate('/work-orders-list');
    };

    if (loading && !workOrder) {
        return (
            <div className="container py-4">
                <div className="text-center">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2">Loading work order...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container py-4">
            <div className="row justify-content-center">
                <div className="col-lg-8">
                    <div className="card shadow">
                        <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                            <h4 className="mb-0">💰 Create Bill</h4>
                            <button
                                type="button"
                                className="btn btn-outline-light btn-sm"
                                onClick={handleCancel}
                                title="Go back to work orders list"
                            >
                                ← Back to Work Orders
                            </button>
                        </div>
                        <div className="card-body">
                            {message && (
                                <div className={`alert ${message.includes('Error') ? 'alert-danger' : 'alert-success'} d-flex justify-content-between align-items-start`}>
                                    <div>{message}</div>
                                    {message.includes('Error') && (
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary btn-sm ms-2"
                                            onClick={handleCancel}
                                        >
                                            Go Back
                                        </button>
                                    )}
                                </div>
                            )}

                            {workOrder && (
                                <>
                                    {/* Work Order Summary */}
                                    <div className="bg-light p-3 rounded mb-4">
                                        <h5 className="text-primary mb-3">Work Order Summary</h5>
                                        <div className="row">
                                            <div className="col-md-6">
                                                <div className="mb-2">
                                                    <strong>Serial Number:</strong> {workOrder.serial_number}
                                                </div>
                                                <div className="mb-2">
                                                    <strong>Doctor:</strong> {workOrder.doctor_name}
                                                </div>
                                                <div className="mb-2">
                                                    <strong>Patient:</strong> {workOrder.patient_name}
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-2">
                                                    <strong>Product:</strong> {workOrder.product_quality}
                                                </div>
                                                {workOrder.product_shade && (
                                                    <div className="mb-2">
                                                        <strong>Shade:</strong> {workOrder.product_shade}
                                                    </div>
                                                )}
                                                <div className="mb-2">
                                                    <strong>Completed:</strong> {formatDate(workOrder.completion_date)}
                                                </div>
                                            </div>
                                        </div>
                                        {workOrder.tooth_numbers && workOrder.tooth_numbers.length > 0 && (
                                            <div className="mt-2">
                                                <strong>Tooth Numbers:</strong> {workOrder.tooth_numbers.join(', ')}
                                            </div>
                                        )}
                                    </div>

                                    {/* Bill Form */}
                                    <form onSubmit={handleSubmit}>
                                        <div className="row">
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Bill Amount *</label>
                                                    <div className="input-group">
                                                        <span className="input-group-text">₹</span>
                                                        <input
                                                            type="number"
                                                            name="bill_amount"
                                                            className="form-control"
                                                            value={billData.bill_amount}
                                                            onChange={handleInputChange}
                                                            min="0"
                                                            step="0.01"
                                                            required
                                                            placeholder="Enter bill amount"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Bill Date</label>
                                                    <input
                                                        type="date"
                                                        name="bill_date"
                                                        className="form-control"
                                                        value={billData.bill_date}
                                                        onChange={handleInputChange}
                                                        max={new Date().toISOString().split('T')[0]}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label">Notes (Optional)</label>
                                            <textarea
                                                name="notes"
                                                className="form-control"
                                                value={billData.notes}
                                                onChange={handleInputChange}
                                                rows="3"
                                                placeholder="Enter any additional notes for this bill..."
                                            />
                                        </div>

                                        <div className="d-flex gap-2 justify-content-end">
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                onClick={handleCancel}
                                                disabled={loading}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="btn btn-primary"
                                                disabled={loading || !billData.bill_amount}
                                            >
                                                {loading ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                        Creating Bill...
                                                    </>
                                                ) : (
                                                    '💰 Create Bill'
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateBillPage;
