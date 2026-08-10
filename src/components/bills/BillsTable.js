import React from 'react';
import { useNavigate } from 'react-router-dom';

const BillsTable = ({
    filteredBills,
    selectedBills,
    editingBill,
    billAmount,
    loading,
    formatDate,
    handleBillSelection,
    handleSelectAll,
    handleEditAmount,
    handleSaveAmount,
    handlePrintBill,
    handlePrintInitialBill,
    handlePrintFinalBill,
    setBillAmount,
    setEditingBill,
    isAdmin
}) => {
    const navigate = useNavigate();

    if (loading) {
        return <div className="text-center">Loading...</div>;
    }

    return (
        <div className="table-responsive">
            <table className="table table-striped">
                <thead>
                    <tr>
                        <th>
                            <div className="form-check">
                                <input 
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={selectedBills.length === filteredBills.length && filteredBills.length > 0}
                                    onChange={handleSelectAll}
                                />
                            </div>
                        </th>
                        <th>Job Number</th>
                        <th>Doctor</th>
                        <th>Patient</th>
                        <th>Description</th>
                        <th>Bill Date</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>{isAdmin ? 'Amount' : 'Pricing'}</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredBills.map((bill) => (
                        <tr key={bill.id}>
                            <td>
                                <div className="form-check">
                                    <input 
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={selectedBills.includes(bill.id)}
                                        onChange={() => handleBillSelection(bill.id)}
                                    />
                                </div>
                            </td>
                            <td><strong>{bill.serial_number}</strong></td>
                            <td>{bill.doctor_name}</td>
                            <td>{bill.patient_name}</td>
                            <td>{bill.work_description}</td>
                            <td>{formatDate(bill.bill_date)}</td>
                            <td>
                                <span className={`badge ${bill.is_grouped ? 'bg-info' : 'bg-secondary'}`}>
                                    {bill.is_grouped ? 'Grouped' : 'Single'}
                                </span>
                            </td>
                            <td>
                                {(() => {
                                    // Determine display status based on actual bill state
                                    let displayStatus = bill.status;
                                    let badgeClass = 'bg-secondary';
                                    
                                    // Override status display for bills without pricing
                                    if (!bill.amount || parseFloat(bill.amount) <= 0) {
                                        displayStatus = 'pending';
                                        badgeClass = 'bg-warning';
                                    } else if (bill.status === 'priced') {
                                        badgeClass = 'bg-success';
                                    } else if (bill.status === 'printed') {
                                        badgeClass = 'bg-info';
                                    } else if (bill.status === 'sent') {
                                        badgeClass = 'bg-primary';
                                    }
                                    
                                    return (
                                        <span className={`badge ${badgeClass}`}>
                                            {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
                                        </span>
                                    );
                                })()}
                            </td>
                            <td>
                                {isAdmin ? (
                                    editingBill === bill.id ? (
                                        <div className="d-flex gap-1">
                                            <input
                                                type="number"
                                                className="form-control form-control-sm"
                                                style={{width: '80px'}}
                                                value={billAmount}
                                                onChange={(e) => setBillAmount(e.target.value)}
                                                placeholder="0.00"
                                                step="0.01"
                                            />
                                            <button
                                                className="btn btn-success btn-sm"
                                                onClick={() => handleSaveAmount(bill.id)}
                                            >
                                                ✓
                                            </button>
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => setEditingBill(null)}
                                            >
                                                ✗
                                            </button>
                                        </div>
                                    ) : (
                                        bill.is_grouped || bill.batch_id ? (
                                            <span className={`fw-bold ${bill.amount ? 'text-success' : 'text-info'}`}>
                                                {bill.amount ? `₹${bill.amount}` : 'Use itemized pricing →'}
                                                {bill.amount && <small className="text-muted d-block">Itemized Bill</small>}
                                            </span>
                                        ) : (
                                            <span 
                                                className={`fw-bold ${bill.amount ? 'text-success' : 'text-warning'}`}
                                                style={{cursor: 'pointer'}}
                                                onClick={() => handleEditAmount(bill)}
                                                title="Click to edit amount"
                                            >
                                                ₹{bill.amount || 'Click to add'}
                                            </span>
                                        )
                                    )
                                ) : (
                                    <span className="text-muted">
                                        <i className="bi bi-lock"></i> Admin Only
                                    </span>
                                )}
                            </td>
                            <td>
                                <div className="d-flex gap-1">
                                    {/* Final Bill Print - Only when amount is set and admin */}
                                    {bill.amount && isAdmin && (
                                        <button
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={() => handlePrintFinalBill(bill)}
                                            title="Print Final Bill (With Amount)"
                                        >
                                            🖨️ Final
                                        </button>
                                    )}
                                    
                                    {isAdmin && (
                                        bill.is_grouped ? (
                                            <button
                                                className="btn btn-outline-info btn-sm"
                                                onClick={() => navigate(`/admin/bill-pricing/${bill.id}`)}
                                                title="Itemized Pricing"
                                            >
                                                💰
                                            </button>
                                        ) : (
                                            <button
                                                className="btn btn-outline-warning btn-sm"
                                                onClick={() => handleEditAmount(bill)}
                                                title="Edit Amount"
                                            >
                                                💰
                                            </button>
                                        )
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            
            {filteredBills.length === 0 && (
                <div className="text-center py-4 text-muted">
                    No bills found matching your filters.
                </div>
            )}
        </div>
    );
};

export default BillsTable;
