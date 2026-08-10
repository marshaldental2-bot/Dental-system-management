/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { dentalLabService } from '../../services/dentalLabService';
import { supabase } from '../../supabase/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/supabaseAuthService';

const DiagnosticPage = () => {
    const [workOrders, setWorkOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('');
    const [userRole, setUserRole] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        // Get user role for navigation
        const role = authService.getUserRole();
        setUserRole(role);
        testSupabaseConnection();
        loadDiagnosticData();
    }, []);

    const testSupabaseConnection = async () => {
        try {
            setConnectionStatus('Testing Supabase connection...');
            
            // Simple query to test connection
            const { data, error } = await supabase
                .from('work_orders')
                .select('count', { count: 'exact', head: true });
            
            if (error) {
                setConnectionStatus(`❌ Connection failed: ${error.message}`);
            } else {
                setConnectionStatus(`✅ Supabase connected successfully`);
            }
        } catch (error) {
            setConnectionStatus(`❌ Network error: ${error.message}`);
        }
    };

    const loadDiagnosticData = async () => {
        setLoading(true);
        setMessage('');
        try {
            console.log('Loading diagnostic data...');
            
            // Try both methods
            const batchResponse = await dentalLabService.getWorkOrdersWithBatchInfo();
            const regularResponse = await dentalLabService.getAllWorkOrders();
            
            console.log('Batch response:', batchResponse);
            console.log('Regular response:', regularResponse);
            
            if (batchResponse.data) {
                setWorkOrders(batchResponse.data);
                setMessage('✅ Batch functionality working');
            } else if (regularResponse.data) {
                setWorkOrders(regularResponse.data);
                setMessage('⚠️ Regular orders loaded, but batch functionality not available. Run SQL migration.');
            } else {
                setMessage('❌ No work orders could be loaded');
            }
        } catch (error) {
            console.error('Diagnostic error:', error);
            setMessage('❌ Error: ' + error.message);
        }
        setLoading(false);
    };

    const testBillCreation = async (order) => {
        console.log('Testing direct bill creation for order:', order);
        setSelectedOrder(order);
        
        try {
            setMessage('Testing direct bill creation...');
            
            // Test direct bill creation API call
            const result = await dentalLabService.createGroupedBill([order]);
            
            if (result.success) {
                setMessage(`✅ Bill creation test successful! Bill ID: ${result.data?.id}`);
                console.log('Bill creation test result:', result);
            } else {
                setMessage(`❌ Bill creation test failed: ${result.error}`);
            }
        } catch (error) {
            console.error('Bill creation test error:', error);
            setMessage(`❌ Bill creation test error: ${error.message}`);
        }
    };

    return (
        <div className="container mt-4">
            <div className="card">
                <div className="card-header">
                    <h4>🔍 Diagnostic Page</h4>
                    <button 
                        className="btn btn-secondary" 
                        onClick={() => navigate(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' ? '/admin-dashboard' : '/staff-dashboard')}
                    >
                        Back to Dashboard
                    </button>
                </div>
                <div className="card-body">
                    {message && (
                        <div className={`alert ${message.includes('❌') ? 'alert-danger' : message.includes('⚠️') ? 'alert-warning' : 'alert-success'}`}>
                            {message}
                        </div>
                    )}
                    {connectionStatus && (
                        <div className={`alert ${connectionStatus.includes('❌') ? 'alert-danger' : 'alert-success'}`}>
                            {connectionStatus}
                        </div>
                    )}

                    <div className="row mb-3">
                        <div className="col-md-6">
                            <h5>Database Status</h5>
                            <button className="btn btn-primary" onClick={loadDiagnosticData} disabled={loading}>
                                {loading ? 'Testing...' : '🔄 Test Database Connection'}
                            </button>
                        </div>
                    </div>

                    {workOrders.length > 0 && (
                        <div>
                            <h5>Work Orders ({workOrders.length})</h5>
                            <div className="table-responsive">
                                <table className="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>Serial</th>
                                            <th>Status</th>
                                            <th>Completion Date</th>
                                            <th>Batch ID</th>
                                            <th>Can Bill?</th>
                                            <th>Test</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {workOrders.slice(0, 10).map((order) => {
                                            const canBill = order.status === 'completed' && order.completion_date;
                                            return (
                                                <tr key={order.id}>
                                                    <td>{order.serial_number}</td>
                                                    <td>
                                                        <span className={`badge ${order.status === 'completed' ? 'bg-success' : 'bg-warning'}`}>
                                                            {order.status}
                                                        </span>
                                                    </td>
                                                    <td>{order.completion_date || '-'}</td>
                                                    <td>{order.batch_id ? '✅' : '-'}</td>
                                                    <td>
                                                        <span className={`badge ${canBill ? 'bg-success' : 'bg-danger'}`}>
                                                            {canBill ? 'Yes' : 'No'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button
                                                            className="btn btn-sm btn-outline-primary"
                                                            onClick={() => testBillCreation(order)}
                                                            disabled={!canBill}
                                                        >
                                                            Test Bill
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="mt-4">
                        <h5>Quick Actions</h5>
                        <div className="d-flex gap-2 flex-wrap">
                            <button 
                                className="btn btn-success"
                                onClick={() => navigate('/work-order-form')}
                            >
                                ➕ Create Test Work Order
                            </button>
                            <button 
                                className="btn btn-info"
                                onClick={() => navigate('/batch-work-order-form')}
                            >
                                📦 Create Batch Orders
                            </button>
                            <button 
                                className="btn btn-warning"
                                onClick={() => navigate('/work-orders-list')}
                            >
                                📋 Work Orders List
                            </button>
                        </div>
                    </div>

                    <div className="mt-4">
                        <h5>Setup Instructions</h5>
                        <div className="alert alert-info">
                            <h6>To fix the "No work order selected" issue:</h6>
                            <ol>
                                <li><strong>Run SQL Migration:</strong> Copy and run <code>add_batch_grouping.sql</code> in Supabase SQL Editor</li>
                                <li><strong>Complete Work Orders:</strong> Mark test orders as "Completed" with completion dates</li>
                                <li><strong>Test Bill Creation:</strong> Try creating bills for completed orders</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DiagnosticPage;
