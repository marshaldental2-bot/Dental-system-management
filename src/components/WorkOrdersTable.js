import React from 'react';
import './WorkOrdersTable.css';
import { printInitialBill } from './bills/BillPrintUtils';
import { dentalLabService } from '../services/dentalLabService';
import BillToothDisplay from '../components/BillToothDisplay';
import RevisionStatusBadge from './RevisionStatusBadge';

const WorkOrdersTable = ({ 
    filteredWorkOrders, 
    selectedOrders,
    setSelectedOrders, 
    handleSelectOrder,
    clearSelection,
    billStatus,
    refreshBillStatus,
    formatDate,
    editingOrder,
    editData,
    handleEditInputChange,
    startEdit,
    handleSave,
    cancelEdit,
    handleCreateBill,
    canCreateBill,
    selectedOrder,
    setSelectedOrder,
    completionDate,
    setCompletionDate,
    handleCompleteOrder,
    isBatchSelected,
    handleSelectBatch,
    isBatchCompleted,
    batchGroups,
    workOrderTrials,
    loadTrialsForWorkOrder,
    showTrialForm,
    setShowTrialForm,
    newTrial,
    handleTrialInputChange,
    handleAddTrial,
    handleDeleteTrial,
    handleReturnOrder,
    handleCompleteRevision,
    loadRevisionHistory,
    setDeletingOrder, // <-- Add this new prop
    handleToggleUrgent,
    isAdmin = false, // <-- Add admin prop with default false
    
}) => {
    const [expandedOrders, setExpandedOrders] = React.useState(new Set());
    
    // Helper function to check if order is overdue
    const checkIsOverdue = (order) => {
        if (order.status === 'completed' || order.status === 'cancelled') return false;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (order.expected_complete_date) {
            const expectedDate = new Date(order.expected_complete_date);
            return expectedDate < today;
        } else if (order.order_date) {
            // Fallback: If no expected date, flag as overdue if older than 7 days
            const orderDate = new Date(order.order_date);
            const daysOld = (today - orderDate) / (1000 * 60 * 60 * 24);
            return daysOld > 7;
        }
        return false;
    };

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

    // Helper function to get status badge
const getStatusBadge = (status) => {
        switch (status) {
            case 'completed':
                return { class: 'bg-success', text: 'Completed' };
            case 'in_progress':
                return { class: 'bg-primary', text: 'In Progress' };
            case 'returned':
                return { class: 'bg-warning text-dark', text: 'Returned' };
            case 'revision_in_progress':
                return { class: 'bg-info', text: 'Revision in Progress' };
            case 'cancelled':
                return { class: 'bg-danger', text: 'Cancelled' };
            default:
                return { class: 'bg-secondary', text: 'Unknown' };
        }
    };
   
    // Handle printing initial bill for existing bills
    const handlePrintInitialBill = async (order) => {
        try {
            if (!billStatus[order.id]?.hasBill || !billStatus[order.id]?.billData) {
                alert('No bill found for this work order');
                return;
            }
            
            // Get the bill ID from the stored bill data
            const billId = billStatus[order.id].billData.id;
            
            // Fetch complete bill data for printing
            const billResponse = await dentalLabService.getAllBills();
            if (!billResponse.data) {
                alert('Error fetching bill data');
                return;
            }
            
            // Find the specific bill
            const completeBill = billResponse.data.find(bill => bill.id === billId);
            if (!completeBill) {
                alert('Bill not found');
                return;
            }
            
            console.log('Printing initial bill for complete bill data:', completeBill);
            await printInitialBill(completeBill);
            
            // Mark bill as printed after successful print
            const result = await dentalLabService.markBillAsPrinted(completeBill.id);
            if (result.error) {
                console.error('Failed to mark bill as printed:', result.error);
            } else {
                // Refresh bill status to show updated print status
                if (refreshBillStatus) {
                    refreshBillStatus();
                }
            }
        } catch (error) {
            console.error('Error printing initial bill:', error);
            alert('Error printing initial bill: ' + error.message);
        }
    };
    
    
  const toggleExpanded = (orderId) => {
        const newExpanded = new Set(expandedOrders);
        if (newExpanded.has(orderId)) {
            newExpanded.delete(orderId);
        } else {
            newExpanded.add(orderId);
            if (loadTrialsForWorkOrder) {
                loadTrialsForWorkOrder(orderId);
            }
        }
        setExpandedOrders(newExpanded);
    };
    

    
    const isExpanded = (orderId) => expandedOrders.has(orderId);
    return (
        <div className="work-orders-container">
            <datalist id="edit-quality-suggestions">
                {productQualitySuggestions.map((suggestion, i) => (
                    <option key={i} value={suggestion} />
                ))}
            </datalist>
            <datalist id="edit-shade-suggestions">
                {allShades.map((shade, i) => (
                    <option key={i} value={shade} />
                ))}
            </datalist>
            {/* Admin Mode Indicator */}
            {isAdmin && (
                <div className="alert alert-warning mb-3" role="alert">
                    <div className="d-flex align-items-center">
                        <i className="bi bi-shield-exclamation fs-4 me-2"></i>
                        <div>
                            <strong>🛡️ Administrator Mode Active</strong>
                            <div className="small">You have enhanced permissions to edit and delete any work order, including completed and billed orders.</div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Mobile/Tablet Card View */}
            <div className="d-lg-none">
                {filteredWorkOrders.map((order) => (
                    <div key={order.id} className={`card mb-3 shadow-sm ${isExpanded(order.id) ? 'expanded' : ''} ${checkIsOverdue(order) ? 'border-danger bg-danger bg-opacity-10' : ''}`}>
                        <div 
                            className={`card-header d-flex justify-content-between align-items-center py-2 cursor-pointer ${isExpanded(order.id) ? 'expanded' : ''}`}
                            onClick={() => toggleExpanded(order.id)}
                            style={{cursor: 'pointer'}}
                        >
                            <div className="d-flex align-items-center">
                                <input
                                    type="checkbox"
                                    className="form-check-input me-2"
                                    checked={selectedOrders.includes(order.id)}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        handleSelectOrder(order.id);
                                    }}
                                    disabled={order.status !== 'completed'}
                                />
                                <div>
                                    <div>
                                        <strong className="text-primary">{order.serial_number}</strong>
                                        <RevisionStatusBadge order={order} formatDate={formatDate} />
                                        {order.batch_id && (
                                            <span className="badge bg-info ms-2">Batch ({order.batch_size})</span>
                                        )}
                                        {order.is_revision && order.revision_count > 0 && (
                                            <span className="badge bg-warning text-dark ms-2">
                                                Rev #{order.revision_count}
                                            </span>
                                        )}
                                    </div>
                                    <div className="small text-muted mt-1">
                                        Date: {formatDate(order.order_date)}
                                    </div>
                                    
                                    <div className="small text-muted">
                                        <strong>Dr. {order.doctor_name}</strong>
                                    </div>
                                </div>
                            </div>
                                 {order.is_urgent && <span className="badge bg-danger ms-2">🔥 Urgent</span>}
                                 {checkIsOverdue(order) && <span className="badge bg-dark ms-2">⏰ Overdue</span>}
                            <div className="d-flex align-items-center">
                                <span className={`badge me-2 ${getStatusBadge(order.status).class}`}>
                                    {getStatusBadge(order.status).text}
                                </span>
                                <small className={`text-muted expand-icon ${isExpanded(order.id) ? 'expanded' : ''}`}>
                                    {isExpanded(order.id) ? '▼' : '▶'}
                                </small>
                            </div>
                        </div>
                        
                        {/* Compact info always visible */}
                        <div className="card-body py-2">
                            <div className="row">
                                <div className="col-6">
                                    <div className="small text-muted mb-1">Patient:</div>
                                    <div className="fw-bold">{order.patient_name}</div>
                                </div>
                                <div className="col-6">
                                    <div className="small text-muted mb-1">Product:</div>
                                    <div>
                                        {editingOrder === order.id && order.status !== 'completed' ? (
                                            <>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm mb-1"
                                                    name="product_quality"
                                                    value={editData.product_quality !== undefined ? editData.product_quality : (order.product_quality || '')}
                                                    onChange={handleEditInputChange}
                                                    placeholder="Product Quality"
                                                    list="edit-quality-suggestions"
                                                />
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    name="product_shade"
                                                    value={editData.product_shade !== undefined ? editData.product_shade : (order.product_shade || '')}
                                                    onChange={handleEditInputChange}
                                                    placeholder="Product Shade"
                                                    list="edit-shade-suggestions"
                                                />
                                            </>
                                        ) : (
                                            <>
                                                <strong>{order.product_quality}</strong>
                                                {order.product_shade && (
                                                    <div className="small text-muted">Shade: {order.product_shade}</div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {/* --- NEW: Tooth Position for Mobile View --- */}
                            <div className="row">
                                <div className="col-6 mt-2">
                                    <div className="mb-2">
                                        <span className="text-muted">Tooth Position:</span><br/>
                                        <BillToothDisplay 
                                            toothNumbers={order.tooth_numbers}
                                            size="small"
                                        />
                                    </div>
                                </div>
                            </div>
                        
                            <div className="d-flex justify-content-between align-items-center mt-2">
                                <div>
                                    {order.status === 'completed' && billStatus[order.id]?.hasBill && (
                                        <div className="d-flex align-items-center gap-2">
                                            <span className={`badge ${billStatus[order.id].billType === 'grouped' ? 'bg-info' : 'bg-success'}`}>
                                                ✓ {billStatus[order.id].billType === 'grouped' ? 'Grouped Bill' : 'Bill Created'}
                                            </span>
                                            {billStatus[order.id].billData?.status === 'printed' && (
                                                <span className="badge bg-primary">
                                                    🖨️ Printed
                                                </span>
                                            )}
                                            <button
                                                className="btn btn-outline-secondary btn-sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handlePrintInitialBill(order);
                                                }}
                                                title="Print Initial Bill (without amount)"
                                            >
                                                🖨️ Initial
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Quick Actions - Always Visible */}
                            <div className="d-flex justify-content-end mt-2">
                                {editingOrder === order.id ? (
                                    <div className="btn-group">
                                        <button
                                            className="btn btn-success btn-sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSave(order.id);
                                            }}
                                        >
                                            ✓ Save
                                        </button>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                cancelEdit();
                                            }}
                                        >
                                            ✗ Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <div className="btn-group">
                                        <button
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                startEdit(order);
                                            }}
                                        >
                                            ✏️
                                        </button>
                                        {order.status === 'completed' && !billStatus[order.id]?.hasBill && (
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCreateBill(order);
                                                }}
                                                disabled={!canCreateBill(order)}
                                            >
                                                💰
                                            </button>
                                        )}
                                        {order.status === 'in_progress' && (
                                            <button
                                                className="btn btn-success btn-sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedOrder(order.id);
                                                    setCompletionDate(new Date().toISOString().split('T')[0]);
                                                }}
                                            >
                                                ✓
                                            </button>
                                        )}
                                        {order.status === 'completed' && billStatus[order.id]?.hasBill && (
                                            <button
                                                className="btn btn-warning btn-sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    console.log('Return button clicked for order:', {
                                                        id: order.id,
                                                        status: order.status,
                                                        billStatus: billStatus[order.id],
                                                        serial_number: order.serial_number
                                                    });
                                                    handleReturnOrder(order);
                                                }}
                                                title={`Return for revision (Status: ${order.status}, Bill: ${billStatus[order.id]?.hasBill ? 'Yes' : 'No'})`}
                                            >
                                                ↩️
                                            </button>
                                        )}
                                        {order.status === 'revision_in_progress' && (
                                            <button
                                                className="btn btn-success btn-sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedOrder(order.id);
                                                    setCompletionDate(new Date().toISOString().split('T')[0]);
                                                }}
                                                title="Complete revision"
                                            >
                                                ✓
                                            </button>
                                        )}
                                                                    <button
                                className={`btn btn-sm ${order.is_urgent ? 'btn-warning' : 'btn-outline-warning'}`}
                                onClick={(e) => { e.stopPropagation(); handleToggleUrgent(order); }}
                                title="Toggle Urgent Status"
                            >
                                🔥
                            </button>
                                         {/* Show delete button with restrictions based on status */}
                                         <button
                                            className="btn btn-outline-danger btn-sm"
                                            onClick={(e) => { e.stopPropagation(); setDeletingOrder(order); }}
                                            disabled={
                                                !isAdmin && (
                                                    order.status === 'completed' ||
                                                    billStatus[order.id]?.hasBill
                                                )
                                            }
                                            title={
                                                isAdmin ? 'Delete work order (Admin)' :
                                                order.status === 'completed' ? 'Cannot delete completed order (Admin only)' :
                                                billStatus[order.id]?.hasBill ? 'Cannot delete billed order (Admin only)' :
                                                'Delete work order'
                                            }
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Expanded Details */}
                        {isExpanded(order.id) && (
                            <div className="card-body border-top bg-light py-2">
                                <div className="row small">
                                    <div className="col-6">
                                        {/* Order date moved to main row */}
                                        {order.completion_date && (
                                            <div className="mb-2">
                                                <span className="text-muted">Completed:</span><br/>
                                                {formatDate(order.completion_date)}
                                            </div>
                                        )}
                                    {order.expected_complete_date && (
                                        <div>
                                            <div className="alert alert-warning mt-2 mb-2 p-2">
                                                <h6 className="alert-heading small mb-1">🔄 Return & Revision</h6>
                                                <p className="mb-1 small"><strong>Reason:</strong> {order.return_reason}</p>
                                                {order.revision_notes && <p className="mb-0 small"><strong>Notes:</strong> {order.revision_notes}</p>}
                                            </div>
                                            <div className="mb-2">
                                                <span className="text-muted">Expected:</span><br/>
                                                <span className={`${
                                                    new Date(order.expected_complete_date) < new Date() && order.status !== 'completed' 
                                                        ? 'text-danger fw-bold' 
                                                        : 'text-muted'
                                                }`}>
                                                    {formatDate(order.expected_complete_date)}
                                                    {new Date(order.expected_complete_date) < new Date() && order.status !== 'completed' && (
                                                        <small className="text-danger d-block">⚠️ Overdue</small>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    </div>
                                    <div className="col-6">
                                        {/* Dynamic Trials Display */}
                                        {(order.requires_trial || (workOrderTrials[order.id] && workOrderTrials[order.id].length > 0)) && (
                                            <div className="mb-2">
                                                <span className="text-muted">Trial Information:</span><br/>
                                                {order.requires_trial && (
                                                    <span className="badge bg-warning text-dark mb-1">🦷 Trial Required</span>
                                                )}
                                                
                                                {/* Display existing trials */}
                                                {workOrderTrials[order.id] && workOrderTrials[order.id].map((trial, index) => (
                                                    <div key={trial.id} className="small text-success mt-1 d-flex justify-content-between align-items-center">
                                                        <span>✓ {trial.trial_name}: {formatDate(trial.trial_date)}</span>
                                                        {editingOrder === order.id && (
                                                            <button
                                                                className="btn btn-sm btn-outline-danger ms-2"
                                                                onClick={() => handleDeleteTrial(trial.id)}
                                                                title="Delete trial"
                                                            >
                                                                ×
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                
                                                {/* Add trial button when editing */}
                                                {editingOrder === order.id && (
                                                    <div className="mt-2">
                                                        {!showTrialForm[order.id] ? (
                                                            <button
                                                                className="btn btn-sm btn-outline-primary"
                                                                onClick={() => {
                                                                    setShowTrialForm(prev => ({ ...prev, [order.id]: true }));
                                                                    loadTrialsForWorkOrder(order.id);
                                                                }}
                                                            >
                                                                + Add Trial
                                                            </button>
                                                        ) : (
                                                            <div className="border rounded p-2 bg-light">
                                                                <div className="mb-2">
                                                                    <label className="form-label small">Trial Name:</label>
                                                                    <input
                                                                        type="text"
                                                                        className="form-control form-control-sm"
                                                                        name="trial_name"
                                                                        value={newTrial.trial_name}
                                                                        onChange={handleTrialInputChange}
                                                                        placeholder="e.g., First Trial, Bite Check, etc."
                                                                    />
                                                                </div>
                                                                <div className="mb-2">
                                                                    <label className="form-label small">Trial Date:</label>
                                                                    <input
                                                                        type="date"
                                                                        className="form-control form-control-sm"
                                                                        name="trial_date"
                                                                        value={newTrial.trial_date}
                                                                        onChange={handleTrialInputChange}
                                                                    />
                                                                </div>
                                                                <div className="d-flex gap-1">
                                                                    <button
                                                                        className="btn btn-sm btn-success"
                                                                        onClick={handleAddTrial}
                                                                    >
                                                                        Save
                                                                    </button>
                                                                    <button
                                                                        className="btn btn-sm btn-secondary"
                                                                        onClick={() => setShowTrialForm(prev => ({ ...prev, [order.id]: false }))}
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                
                                                {/* Show waiting message for trials */}
                                                {order.requires_trial && (!workOrderTrials[order.id] || workOrderTrials[order.id].length === 0) && (
                                                    <div className="small text-warning">
                                                        ⏳ No trials scheduled yet
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        
                                        {order.expected_complete_date && (
                                            <div className="mb-2">
                                                <span className="text-muted">Expected:</span><br/>
                                                <span className={`${
                                                    new Date(order.expected_complete_date) < new Date() && order.status !== 'completed' 
                                                        ? 'text-danger fw-bold' 
                                                        : 'text-muted'
                                                }`}>
                                                    {formatDate(order.expected_complete_date)}
                                                    {new Date(order.expected_complete_date) < new Date() && order.status !== 'completed' && (
                                                        <small className="text-danger d-block">⚠️ Overdue</small>
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                        {order.feedback && (
                                            <div className="mb-2">
                                                <span className="text-muted">Feedback:</span><br/>
                                                <span className="text-dark">{order.feedback}</span>
                                            </div>
                                        )}
                                        {order.status === 'completed' && billStatus[order.id]?.hasBill && (
                                            <div className="mb-2">
                                                <span className="text-muted">Bill Date:</span><br/>
                                                {formatDate(billStatus[order.id].billData.bill_date)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Editing Fields (Mobile) */}
                        {editingOrder === order.id && (
                            <div className="card-body border-top py-2">
                                <div className="mb-3">
                                    <label className="form-label small">Feedback:</label>
                                    <textarea
                                        name="feedback"
                                        className="form-control form-control-sm"
                                        value={editData.feedback || ''}
                                        onChange={handleEditInputChange}
                                        placeholder="Enter feedback..."
                                        rows="2"
                                    />
                                </div>
                                
                                {/* Trial Management Section for Mobile */}
                                <div className="mb-3">
                                    <label className="form-label small">Trial Management:</label>
                                    
                                    {/* Display existing trials */}
                                    {workOrderTrials[order.id] && workOrderTrials[order.id].length > 0 ? (
                                        <div className="mb-2">
                                            {workOrderTrials[order.id].map((trial) => (
                                                <div key={trial.id} className="d-flex justify-content-between align-items-center mb-1 p-2 bg-light rounded">
                                                    <small>
                                                        <strong>{trial.trial_name}</strong><br/>
                                                        <span className="text-muted">{formatDate(trial.trial_date)}</span>
                                                    </small>
                                                    <button
                                                        className="btn btn-sm btn-outline-danger"
                                                        onClick={() => handleDeleteTrial(trial.id)}
                                                        title="Delete trial"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="mb-2">
                                            <small className="text-muted">No trials added yet</small>
                                        </div>
                                    )}
                                    
                                    {/* Add trial button and form */}
                                    {!showTrialForm[order.id] ? (
                                        <button
                                            className="btn btn-sm btn-outline-primary"
                                            onClick={() => {
                                                setShowTrialForm(prev => ({ ...prev, [order.id]: true }));
                                                loadTrialsForWorkOrder(order.id);
                                            }}
                                        >
                                            + Add Trial
                                        </button>
                                    ) : (
                                        <div className="border rounded p-2 bg-white">
                                            <div className="mb-2">
                                                <label className="form-label small">Trial Name:</label>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    name="trial_name"
                                                    value={newTrial.trial_name}
                                                    onChange={handleTrialInputChange}
                                                    placeholder="e.g., First Trial, Bite Check, etc."
                                                />
                                            </div>
                                            <div className="mb-2">
                                                <label className="form-label small">Trial Date:</label>
                                                <input
                                                    type="date"
                                                    className="form-control form-control-sm"
                                                    name="trial_date"
                                                    value={newTrial.trial_date}
                                                    onChange={handleTrialInputChange}
                                                />
                                            </div>
                                            <div className="d-flex gap-1">
                                                <button
                                                    className="btn btn-sm btn-success"
                                                    onClick={handleAddTrial}
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-secondary"
                                                    onClick={() => setShowTrialForm(prev => ({ ...prev, [order.id]: false }))}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {/* Completion Modal for Mobile */}
                        {selectedOrder === order.id && (
                            <div className="card-body border-top bg-warning bg-opacity-10 py-2">
                                <div className="mb-2">
                                    <label className="form-label small">Completion Date:</label>
                                    <input
                                        type="date"
                                        className="form-control form-control-sm"
                                        value={completionDate}
                                        onChange={(e) => setCompletionDate(e.target.value)}
                                    />
                                </div>
                                <div className="btn-group w-100">
                                    <button
                                        className="btn btn-success btn-sm"
                                        onClick={() => handleCompleteOrder(order.id)}
                                    >
                                        ✓ Mark Complete
                                    </button>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => setSelectedOrder(null)}
                                    >
                                        Cancel
                                    </button>
                                    
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Desktop Compact Table View */}
            <div className="d-none d-lg-block">
                <div className="table-responsive">
                    <table className="table table-hover">
                        <thead className="table-dark">
                            <tr>
                                <th style={{width: '40px'}}>
                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={selectedOrders.length > 0}
                                        onChange={() => {
                                            if (selectedOrders.length > 0) {
                                                clearSelection();
                                            } else {
                                                const allCompletedIds = filteredWorkOrders
                                                    .filter(order => order.status === 'completed')
                                                    .map(order => order.id);
                                                setSelectedOrders(allCompletedIds);
                                            }
                                        }}
                                    />
                                </th>
                                <th style={{width: '120px'}}>Job Number</th>
                                <th style={{width: '150px'}}>Doctor</th>
                                <th style={{width: '120px'}}>Patient</th>
                                <th style={{width: '140px'}}>Product</th>
                                <th style={{width: '100px'}}>Status</th>
                                <th style={{width: '120px'}}>Bill Status</th>
                                <th style={{width: '180px'}}>Actions</th>
                                <th style={{width: '30px'}}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredWorkOrders.map((order) => (
                                <React.Fragment key={order.id}>
                                    <tr className={`${editingOrder === order.id ? 'table-warning' : (checkIsOverdue(order) ? 'table-danger' : '')} ${isExpanded(order.id) ? 'expanded' : ''}`}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                checked={selectedOrders.includes(order.id)}
                                                onChange={() => handleSelectOrder(order.id)}
                                                disabled={order.status !== 'completed'}
                                            />
                                        </td>
                                        <td>
                                            <div>
                                                <strong className="text-primary">{order.serial_number}</strong>
                                                <RevisionStatusBadge order={order} formatDate={formatDate} />
                                                {order.is_urgent && <span className="badge bg-danger ms-2">🔥 Urgent</span>}
                                                {checkIsOverdue(order) && <span className="badge bg-dark ms-2">⏰ Overdue</span>}
                                                {order.batch_id && (
                                                    <div>
                                                        <span className="badge bg-info badge-sm">
                                                            Batch ({order.batch_size})
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="small text-muted mt-1">
                                                    Date: {formatDate(order.order_date)}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div>
                                                <div className="small text-muted">Doctor:</div>
                                                <strong>{order.doctor_name}</strong>
                                            </div>
                                        </td>
                                        <td>
                                            <div>
                                                <div className="small text-muted">Patient:</div>
                                                <div>{order.patient_name}</div>
                                            </div>
                                        </td>
                                        <td>
                                            <div>
                                                <div className="small text-muted">Product:</div>
                                                <div>
                                                    {editingOrder === order.id && order.status !== 'completed' ? (
                                                        <>
                                                            <input
                                                                type="text"
                                                                className="form-control form-control-sm mb-1"
                                                                name="product_quality"
                                                                value={editData.product_quality !== undefined ? editData.product_quality : (order.product_quality || '')}
                                                                onChange={handleEditInputChange}
                                                                placeholder="Product Quality"
                                                                list="edit-quality-suggestions"
                                                            />
                                                            <input
                                                                type="text"
                                                                className="form-control form-control-sm"
                                                                name="product_shade"
                                                                value={editData.product_shade !== undefined ? editData.product_shade : (order.product_shade || '')}
                                                                onChange={handleEditInputChange}
                                                                placeholder="Product Shade"
                                                                list="edit-shade-suggestions"
                                                            />
                                                        </>
                                                    ) : (
                                                        <>
                                                            <strong>{order.product_quality}</strong>
                                                            {order.product_shade && (
                                                                <div className="small text-muted">Shade: {order.product_shade}</div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${getStatusBadge(order.status).class}`}>
                                                {getStatusBadge(order.status).text}
                                            </span>
                                            {order.completion_date && (
                                                <div className="small text-muted">
                                                    {formatDate(order.completion_date)}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            {order.status === 'completed' && billStatus[order.id]?.hasBill ? (
                                                <div className="d-flex flex-column align-items-start gap-1">
                                                    <span className={`badge fs-6 ${billStatus[order.id].billType === 'grouped' ? 'bg-info' : 'bg-success'}`}>
                                                        ✓ {billStatus[order.id].billType === 'grouped' ? 'Grouped' : 'Individual'}
                                                        <div className="mt-1 fw-bold">
                                                            {formatDate(billStatus[order.id].billData.bill_date)}
                                                        </div>
                                                    </span>
                                                    {billStatus[order.id].billData?.status === 'printed' && (
                                                        <span className="badge bg-primary fs-6">
                                                            🖨️ Printed
                                                        </span>
                                                    )}
                                                    <button
                                                        className="btn btn-outline-secondary btn-sm"
                                                        onClick={() => handlePrintInitialBill(order)}
                                                        title="Print Initial Bill (without amount)"
                                                    >
                                                        🖨️ Initial
                                                    </button>
                                                </div>
                                            ) : order.status === 'completed' ? (
                                                <span className="badge bg-warning text-dark fs-6">
                                                    💰 Ready to Bill
                                                </span>
                                            ) : (
                                                <span className="badge bg-secondary fs-6">
                                                    ⏳ Pending Completion
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="btn-group btn-group-sm">
                                                {editingOrder === order.id ? (
                                                    <>
                                                        <button
                                                            className="btn btn-success"
                                                            onClick={() => handleSave(order.id)}
                                                        >
                                                            ✓
                                                        </button>
                                                        <button
                                                            className="btn btn-secondary"
                                                            onClick={cancelEdit}
                                                        >
                                                            ✗
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            className="btn btn-outline-primary"
                                                            onClick={() => startEdit(order)}
                                                            title="Edit work order"
                                                        >
                                                            ✏️
                                                        </button>
                                                        {order.status === 'completed' && !billStatus[order.id]?.hasBill && (
                                                            <button
                                                                className="btn btn-primary"
                                                                onClick={() => handleCreateBill(order)}
                                                                disabled={!canCreateBill(order)}
                                                                title="Create bill for this order"
                                                            >
                                                                💰 Bill
                                                            </button>
                                                        )}
                                                         {order.status === 'in_progress' && (
                                                            <button
                                                                className="btn btn-success"
                                                                onClick={() => {
                                                                    setSelectedOrder(order.id);
                                                                    setCompletionDate(new Date().toISOString().split('T')[0]);
                                                                }}
                                                                title="Mark as completed"
                                                            >
                                                                ✓
                                                            </button>
                                                        )}
 {order.status === 'completed' && billStatus[order.id]?.hasBill && (
                                            <button
                                                className="btn btn-warning btn-sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleReturnOrder(order);
                                                }}
                                                title="Return for revision"
                                            >
                                                ↩️
                                            </button>
                                        )}
                                        {order.status === 'revision_in_progress' && (
                                            <button
                                                className="btn btn-success btn-sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedOrder(order.id);
                                                    setCompletionDate(new Date().toISOString().split('T')[0]);
                                                }}
                                                title="Complete revision"
                                            >
                                                ✓
                                            </button>
                                        )}
                                        <button
                                            className={`btn btn-sm ${order.is_urgent ? 'btn-warning' : 'btn-outline-warning'}`}
                                            onClick={() => handleToggleUrgent(order)}
                                            title="Toggle Urgent Status"
                                        >
                                            🔥
                                        </button>

                                        {/* Show delete button with restrictions based on status */}
                                        <button
                                            className="btn btn-outline-danger"
                                            onClick={() => setDeletingOrder(order)}
                                            disabled={
                                                !isAdmin && (
                                                    order.status === 'completed' ||
                                                    billStatus[order.id]?.hasBill
                                                )
                                            }
                                            title={
                                                isAdmin ? 'Delete work order (Admin)' :
                                                order.status === 'completed' ? 'Cannot delete completed order (Admin only)' :
                                                billStatus[order.id]?.hasBill ? 'Cannot delete billed order (Admin only)' :
                                                'Delete work order'
                                            }
                                        >
                                            🗑️
                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <button
                                                className="expand-btn"
                                                onClick={() => toggleExpanded(order.id)}
                                                title="Show/hide details"
                                            >
                                                <span className={`expand-icon ${isExpanded(order.id) ? 'expanded' : ''}`}>
                                                    {isExpanded(order.id) ? '▼' : '▶'}
                                                </span>
                                            </button>
                                        </td>
                                    </tr>
                                    
                          {isExpanded(order.id) && (
                                        <tr className="table-light">
                                            <td colSpan="9">
                                                <div className="p-3">
                                                    {/* We are replacing the "row" div with a flexbox div */}
                                                    <div style={{ display: 'flex', width: '100%', gap: '1rem' }} className="small">
                                                        
                                                        {/* Column 1: Dates */}
                                                        <div style={{ flex: 1 }}>
                                                            {/* Order date moved to main row */}
                                                            {order.expected_complete_date && (
                                                                <div className="mb-2">
                                                                    <span className="text-muted">Expected Complete:</span><br/>
                                                                    <span className={`${
                                                                        new Date(order.expected_complete_date) < new Date() && order.status !== 'completed' 
                                                                            ? 'text-danger fw-bold' : 'text-dark'
                                                                    }`}>
                                                                        {formatDate(order.expected_complete_date)}
                                                                        {new Date(order.expected_complete_date) < new Date() && order.status !== 'completed' && (
                                                                            <span className="text-danger ms-1">⚠️ Overdue</span>
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Column 2: Trials */}
                                                        <div style={{ flex: 1 }}>
                                                            {(order.requires_trial || (workOrderTrials[order.id] && workOrderTrials[order.id].length > 0)) && (
                                                                <div className="mb-3">
                                                                    <span className="text-muted">Trial Information:</span><br/>
                                                                    {order.requires_trial && (
                                                                        <span className="badge bg-warning text-dark mb-2">🦷 Trial Required</span>
                                                                    )}
                                                                    {workOrderTrials[order.id] && workOrderTrials[order.id].map((trial) => (
                                                                        <div key={trial.id} className="text-success mt-1">
                                                                            ✓ {trial.trial_name}: {formatDate(trial.trial_date)}
                                                                        </div>
                                                                    ))}
                                                                    {order.requires_trial && (!workOrderTrials[order.id] || workOrderTrials[order.id].length === 0) && (
                                                                        <div className="text-warning mt-1">⏳ No trials scheduled yet</div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Column 3: Feedback */}
                                                        <div style={{ flex: 1 }}>
                                                            {order.feedback && (
                                                                <div className="mb-2">
                                                                    <span className="text-muted">Feedback:</span><br/>
                                                                    <span className="text-dark">{order.feedback}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Column 4: Tooth Position */}
                                                        <div style={{ flex: 1 }}>
                                                            <div className="mb-2">
                                                                <span className="text-muted">Tooth Position:</span><br />
                                                                <BillToothDisplay
                                                                    toothNumbers={order.tooth_numbers} 
                                                                />
                                                            </div>
                                                        </div>

                                                    </div>
                                                              {order.return_reason && (
                                                        <div className="alert alert-warning mt-2 mb-0">
                                                            <h6 className="alert-heading small">🔄 Return & Revision Details</h6>
                                                            <div className="d-flex justify-content-between">
                                                                <p className="mb-1 small"><strong>Reason:</strong> {order.return_reason}</p>
                                                                {order.return_date && <small className="text-muted">Returned on: {formatDate(order.return_date)}</small>}
                                                            </div>
                                                            {order.revision_notes && <p className="mb-0 small"><strong>Notes:</strong> {order.revision_notes}</p>}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}

                                    
                                    {/* Editing Row (Desktop) */}

                                    {editingOrder === order.id && (
                                        <tr className="table-warning">
                                            <td colSpan="9">
                                                <div className="p-3">
                                                    <h6 className="mb-3">Editing: {order.serial_number}</h6>
                                                    <div className="row">
                                                        <div className="col-md-6">
                                                            <div className="mb-3">
                                                                <label className="form-label small">Feedback:</label>
                                                                <textarea
                                                                    name="feedback"
                                                                    className="form-control form-control-sm"
                                                                    value={editData.feedback || ''}
                                                                    onChange={handleEditInputChange}
                                                                    placeholder="Enter feedback..."
                                                                    rows="2"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="col-md-6">
                                                            {/* Trial Management Section */}
                                                            <div className="mb-3">
                                                                <label className="form-label small">Trial Management:</label>
                                                                
                                                                {/* Display existing trials */}
                                                                {workOrderTrials[order.id] && workOrderTrials[order.id].length > 0 ? (
                                                                    <div className="mb-2">
                                                                        {workOrderTrials[order.id].map((trial) => (
                                                                            <div key={trial.id} className="d-flex justify-content-between align-items-center mb-1 p-2 bg-light rounded">
                                                                                <small>
                                                                                    <strong>{trial.trial_name}</strong><br/>
                                                                                    <span className="text-muted">{formatDate(trial.trial_date)}</span>
                                                                                </small>
                                                                                <button
                                                                                    className="btn btn-sm btn-outline-danger"
                                                                                    onClick={() => handleDeleteTrial(trial.id)}
                                                                                    title="Delete trial"
                                                                                >
                                                                                    ×
                                                                                </button>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <div className="mb-2">
                                                                        <small className="text-muted">No trials added yet</small>
                                                                    </div>
                                                                )}
                                                                
                                                                {/* Add trial button and form */}
                                                                {!showTrialForm[order.id] ? (
                                                                    <button
                                                                        className="btn btn-sm btn-outline-primary"
                                                                        onClick={() => {
                                                                            setShowTrialForm(prev => ({ ...prev, [order.id]: true }));
                                                                            loadTrialsForWorkOrder(order.id);
                                                                        }}
                                                                    >
                                                                        + Add Trial
                                                                    </button>
                                                                ) : (
                                                                    <div className="border rounded p-2 bg-white">
                                                                        <div className="mb-2">
                                                                            <label className="form-label small">Trial Name:</label>
                                                                            <input
                                                                                type="text"
                                                                                className="form-control form-control-sm"
                                                                                name="trial_name"
                                                                                value={newTrial.trial_name}
                                                                                onChange={handleTrialInputChange}
                                                                                placeholder="e.g., First Trial, Bite Check, etc."
                                                                            />
                                                                        </div>
                                                                        <div className="mb-2">
                                                                            <label className="form-label small">Trial Date:</label>
                                                                            <input
                                                                                type="date"
                                                                                className="form-control form-control-sm"
                                                                                name="trial_date"
                                                                                value={newTrial.trial_date}
                                                                                onChange={handleTrialInputChange}
                                                                            />
                                                                        </div>
                                                                        <div className="d-flex gap-1">
                                                                            <button
                                                                                className="btn btn-sm btn-success"
                                                                                onClick={handleAddTrial}
                                                                            >
                                                                                Save
                                                                            </button>
                                                                            <button
                                                                                className="btn btn-sm btn-secondary"
                                                                                onClick={() => setShowTrialForm(prev => ({ ...prev, [order.id]: false }))}
                                                                            >
                                                                                Cancel
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Empty State */}
            {filteredWorkOrders.length === 0 && (
                <div className="text-center py-4 text-muted">
                    <div className="mb-2">📝 No work orders found</div>
                    <small>Create your first work order to get started!</small>
                </div>
            )}

            {/* Completion Modal */}
            {selectedOrder && (
                <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    {filteredWorkOrders.find(o => o.id === selectedOrder)?.status === 'revision_in_progress' 
                                        ? 'Complete Revision' 
                                        : 'Mark Order as Completed'
                                    }
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setSelectedOrder(null)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                {(() => {
                                    const currentOrder = filteredWorkOrders.find(o => o.id === selectedOrder);
                                    const isRevision = currentOrder?.status === 'revision_in_progress';
                                    
                                    return (
                                        <>
                                            <p>
                                                {isRevision ? 'Complete revision for' : 'Mark'} work order <strong>
                                                    {currentOrder?.serial_number}
                                                </strong> {isRevision ? '' : 'as completed'}?
                                            </p>
                                            {isRevision && currentOrder?.revision_count > 0 && (
                                                <div className="alert alert-info">
                                                    <small>
                                                        <strong>Revision #{currentOrder.revision_count}</strong><br/>
                                                        Return reason: {currentOrder.return_reason}<br/>
                                                        {currentOrder.revision_notes && (
                                                            <>Notes: {currentOrder.revision_notes}</>
                                                        )}
                                                    </small>
                                                </div>
                                            )}
                                            <div className="mb-3">
                                                <label className="form-label">
                                                    {isRevision ? 'Revision Completion Date:' : 'Completion Date:'}
                                                </label>
                                                <input
                                                    type="date"
                                                    className="form-control"
                                                    value={completionDate}
                                                    onChange={(e) => setCompletionDate(e.target.value)}
                                                    max={new Date().toISOString().split('T')[0]}
                                                />
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setSelectedOrder(null)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-success"
                                    onClick={() => {
                                        const currentOrder = filteredWorkOrders.find(o => o.id === selectedOrder);
                                        if (currentOrder?.status === 'revision_in_progress') {
                                            handleCompleteRevision(selectedOrder);
                                        } else {
                                            handleCompleteOrder(selectedOrder);
                                        }
                                    }}
                                    disabled={!completionDate}
                                >
                                    ✓ {filteredWorkOrders.find(o => o.id === selectedOrder)?.status === 'revision_in_progress' 
                                        ? 'Complete Revision' 
                                        : 'Mark Complete'
                                    }
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkOrdersTable;