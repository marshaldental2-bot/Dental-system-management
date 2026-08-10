/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { authService } from '../../services/supabaseAuthService';
import { useNavigate } from 'react-router-dom';

const AuditLogPage = () => {
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        action: 'all',
        user: ''
    });
    const navigate = useNavigate();

    // Mock audit log data (in real implementation, this would come from database)
    const mockAuditLogs = [
        {
            id: 1,
            timestamp: new Date(),
            user_email: 'admin@example.com',
            action: 'UPDATE_BILL_AMOUNT',
            description: 'Updated bill amount for WO-2024-0123 to $150.00',
            ip_address: '192.168.1.100',
            user_agent: 'Chrome/91.0.4472.124'
        },
        {
            id: 2,
            timestamp: new Date(Date.now() - 3600000),
            user_email: 'admin@example.com',
            action: 'CREATE_USER',
            description: 'Created new user account: staff@example.com (USER role)',
            ip_address: '192.168.1.100',
            user_agent: 'Chrome/91.0.4472.124'
        },
        {
            id: 3,
            timestamp: new Date(Date.now() - 7200000),
            user_email: 'admin@example.com',
            action: 'BULK_UPDATE',
            description: 'Bulk updated 5 bills with pricing',
            ip_address: '192.168.1.100',
            user_agent: 'Chrome/91.0.4472.124'
        }
    ];

    useEffect(() => {
        loadAuditLogs();
    }, []);

    const loadAuditLogs = () => {
        setLoading(true);
        // In real implementation, fetch from database
        setTimeout(() => {
            setAuditLogs(mockAuditLogs);
            setLoading(false);
        }, 1000);
    };

    const formatDateTime = (date) => {
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const getActionIcon = (action) => {
        switch (action) {
            case 'UPDATE_BILL_AMOUNT': return '💰';
            case 'CREATE_USER': return '👤';
            case 'DELETE_USER': return '🗑️';
            case 'BULK_UPDATE': return '📊';
            case 'LOGIN': return '🔑';
            case 'LOGOUT': return '🚪';
            default: return '📝';
        }
    };

    const getActionColor = (action) => {
        switch (action) {
            case 'UPDATE_BILL_AMOUNT': return 'text-success';
            case 'CREATE_USER': return 'text-primary';
            case 'DELETE_USER': return 'text-danger';
            case 'BULK_UPDATE': return 'text-info';
            case 'LOGIN': return 'text-secondary';
            case 'LOGOUT': return 'text-muted';
            default: return 'text-dark';
        }
    };

    return (
        <div className="container mt-4">
            <div className="row">
                <div className="col-12">
                    <div className="card">
                        <div className="card-header d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 gap-md-0">
                            <h4 className="mb-0">🔍 Admin Audit Log</h4>
                            <div className="d-grid gap-2 d-md-flex">
                                <button 
                                    className="btn btn-outline-secondary"
                                    onClick={() => navigate('/admin-dashboard')}
                                >
                                    Back to Dashboard
                                </button>
                                <button 
                                    className="btn btn-primary"
                                    onClick={loadAuditLogs}
                                    disabled={loading}
                                >
                                    {loading ? 'Loading...' : 'Refresh'}
                                </button>
                            </div>
                        </div>
                        
                        <div className="card-body">
                            {/* Filters */}
                            <div className="row mb-4">
                                <div className="col-md-3">
                                    <label className="form-label">Start Date</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={filters.startDate}
                                        onChange={(e) => setFilters(prev => ({...prev, startDate: e.target.value}))}
                                    />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">End Date</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={filters.endDate}
                                        onChange={(e) => setFilters(prev => ({...prev, endDate: e.target.value}))}
                                    />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">Action Type</label>
                                    <select
                                        className="form-control"
                                        value={filters.action}
                                        onChange={(e) => setFilters(prev => ({...prev, action: e.target.value}))}
                                    >
                                        <option value="all">All Actions</option>
                                        <option value="UPDATE_BILL_AMOUNT">Bill Updates</option>
                                        <option value="CREATE_USER">User Creation</option>
                                        <option value="DELETE_USER">User Deletion</option>
                                        <option value="BULK_UPDATE">Bulk Operations</option>
                                        <option value="LOGIN">Login Events</option>
                                    </select>
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">User</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Filter by user email"
                                        value={filters.user}
                                        onChange={(e) => setFilters(prev => ({...prev, user: e.target.value}))}
                                    />
                                </div>
                            </div>

                            {/* Audit Log Table */}
                            <div className="table-responsive">
                                <table className="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>Timestamp</th>
                                            <th>User</th>
                                            <th>Action</th>
                                            <th>Description</th>
                                            <th>IP Address</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {auditLogs.map(log => (
                                            <tr key={log.id}>
                                                <td>
                                                    <small className="text-muted">
                                                        {formatDateTime(log.timestamp)}
                                                    </small>
                                                </td>
                                                <td>
                                                    <span className="badge bg-secondary">
                                                        {log.user_email}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`d-flex align-items-center ${getActionColor(log.action)}`}>
                                                        <span className="me-2">{getActionIcon(log.action)}</span>
                                                        <small>{log.action.replace(/_/g, ' ')}</small>
                                                    </span>
                                                </td>
                                                <td>{log.description}</td>
                                                <td>
                                                    <small className="text-muted">{log.ip_address}</small>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {auditLogs.length === 0 && !loading && (
                                <div className="text-center py-4">
                                    <p className="text-muted">No audit logs found.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="row mt-4">
                        <div className="col-md-3">
                            <div className="card text-center">
                                <div className="card-body">
                                    <h5 className="card-title">📊 Total Actions</h5>
                                    <h2 className="text-primary">{auditLogs.length}</h2>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card text-center">
                                <div className="card-body">
                                    <h5 className="card-title">👤 Unique Users</h5>
                                    <h2 className="text-info">
                                        {new Set(auditLogs.map(log => log.user_email)).size}
                                    </h2>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card text-center">
                                <div className="card-body">
                                    <h5 className="card-title">🔄 Today's Actions</h5>
                                    <h2 className="text-success">
                                        {auditLogs.filter(log => {
                                            const today = new Date().toDateString();
                                            return log.timestamp.toDateString() === today;
                                        }).length}
                                    </h2>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card text-center">
                                <div className="card-body">
                                    <h5 className="card-title">⚠️ Critical Actions</h5>
                                    <h2 className="text-warning">
                                        {auditLogs.filter(log => 
                                            ['DELETE_USER', 'BULK_UPDATE'].includes(log.action)
                                        ).length}
                                    </h2>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuditLogPage;
