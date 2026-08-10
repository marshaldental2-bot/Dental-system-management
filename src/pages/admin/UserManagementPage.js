import React, { useState, useEffect } from 'react';
import { authService } from '../../services/supabaseAuthService';
import { useNavigate, useLocation } from 'react-router-dom';
import PasswordManagement from '../../components/admin/PasswordManagement';
import SuperAdminControls from '../../components/admin/SuperAdminControls';

const UserManagementPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showPasswordManagement, setShowPasswordManagement] = useState(false);
    const [showSuperAdminControls, setShowSuperAdminControls] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [newUser, setNewUser] = useState({
        email: '',
        password: '',
        role: 'USER'
    });
    const [message, setMessage] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        loadUsers();
        getCurrentUserId();
        checkSuperAdminStatus();
        
        // Check URL parameters to auto-open tabs
        const urlParams = new URLSearchParams(location.search);
        const tab = urlParams.get('tab');
        if (tab === 'password') {
            setShowPasswordManagement(true);
        } else if (tab === 'super-admin') {
            setShowSuperAdminControls(true);
        }
    }, [location]);

    const checkSuperAdminStatus = async () => {
        const superAdminStatus = await authService.isSuperAdmin();
        setIsSuperAdmin(superAdminStatus);
    };

    const getCurrentUserId = async () => {
        const userId = await authService.getUserId();
        setCurrentUserId(userId);
    };

    const loadUsers = async () => {
        setLoading(true);
        const response = await authService.getAllUsers();
        if (response.data) {
            setUsers(response.data);
        } else {
            setMessage('Error loading users');
        }
        setLoading(false);
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(''); 

        if (!newUser.email || !newUser.password) {
            setMessage('Email and password are required');
            setLoading(false);
            return;
        }

        const response = await authService.createUser(newUser);
        
        if (response.data) {
            setMessage(`${newUser.role} account created successfully for ${newUser.email}`);
            setNewUser({ email: '', password: '', role: 'USER' });
            setShowCreateForm(false);
            loadUsers(); // Reload the users list
        } else {
            setMessage('Error creating user: ' + (response.error?.message || 'Unknown error'));
        }
        setLoading(false);
    };

    const handleDeleteUser = async (userId, userEmail) => {
        if (window.confirm(`Are you sure you want to delete user: ${userEmail}?`)) {
            setLoading(true);
            const response = await authService.deleteUser(userId);
            
            if (response.success) {
                setMessage(`User ${userEmail} deleted successfully`);
                loadUsers(); // Only reload if deletion was successful
            } else {
                const errorMessage = response.error?.message || 'Unknown error';
                setMessage(`Error deleting user: ${errorMessage}`);
                // Don't reload users on error to prevent data inconsistency
            }
            setLoading(false);
        }
    };

    const logout = async () => {
        await authService.logOut();
        navigate('/');
    };

    // Format date to dd-mm-yyyy
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };

    return (
        <div className="container mt-5">
            <div className="row">
                <div className="col-12">
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-4">
                        <h2 className="mb-0">User Management Panel</h2>
                        <div className="d-grid gap-2 d-md-flex">
                            <button className="btn btn-secondary" onClick={() => navigate('/admin-dashboard')}>
                                Back to Dashboard
                            </button>
                            <button className="btn btn-danger" onClick={logout}>
                                Logout
                            </button>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <ul className="nav nav-tabs mb-4">
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${!showPasswordManagement && !showSuperAdminControls ? 'active' : ''}`}
                                onClick={() => {
                                    setShowPasswordManagement(false);
                                    setShowSuperAdminControls(false);
                                }}
                            >
                                👥 User Management
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${showPasswordManagement ? 'active' : ''}`}
                                onClick={() => {
                                    setShowPasswordManagement(true);
                                    setShowSuperAdminControls(false);
                                }}
                            >
                                🔐 Password Management
                            </button>
                        </li>
                        {isSuperAdmin && (
                            <li className="nav-item">
                                <button 
                                    className={`nav-link ${showSuperAdminControls ? 'active' : ''}`}
                                    onClick={() => {
                                        setShowPasswordManagement(false);
                                        setShowSuperAdminControls(true);
                                    }}
                                >
                                    👑 Super Admin
                                </button>
                            </li>
                        )}
                    </ul>

                    {message && (
                        <div className={`alert ${message.includes('Error') ? 'alert-danger' : 'alert-success'}`}>
                            {message}
                        </div>
                    )}

                    {/* Super Admin Controls Tab */}
                    {showSuperAdminControls && (
                        <SuperAdminControls 
                            users={users} 
                            onUserAction={() => {
                                loadUsers();
                                setMessage('User action completed successfully');
                            }}
                        />
                    )}

                    {/* Password Management Tab */}
                    {showPasswordManagement && !showSuperAdminControls && (
                        <PasswordManagement 
                            users={users} 
                            onPasswordChanged={() => {
                                loadUsers();
                                setMessage('Password operation completed successfully');
                            }}
                        />
                    )}

                    {/* User Management Tab */}
                    {!showPasswordManagement && !showSuperAdminControls && (
                        <>
                            <div className="row mb-3">
                                <div className="col-12">
                                    <button 
                                        className="btn btn-primary" 
                                        onClick={() => {
                                            if (!showCreateForm) {
                                                // Reset fields every time the form is opened to avoid any residual data/autofill
                                                setNewUser({ email: '', password: '', role: 'USER' });
                                            }
                                            setShowCreateForm(!showCreateForm);
                                        }}
                                    >
                                        {showCreateForm ? 'Cancel' : 'Create New User'}
                                    </button>
                                </div>
                            </div>

                    {showCreateForm && (
                        <div className="card mb-4">
                            <div className="card-header">
                                <h4>Create New Login Credentials</h4>
                            </div>
                            <div className="card-body">
                                <form onSubmit={handleCreateUser} autoComplete="off">
                                    <div className="row">
                                        <div className="col-md-6">
                                            <div className="mb-3">
                                                <label className="form-label">Email Address</label>
                                                <input
                                                    type="email"
                                                    className="form-control"
                                                    name="new_user_email"
                                                    value={newUser.email}
                                                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                                                    placeholder="Enter email address"
                                                    autoComplete="off"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="mb-3">
                                                <label className="form-label">Password</label>
                                                <input
                                                    type="password"
                                                    className="form-control"
                                                    name="new_user_password"
                                                    value={newUser.password}
                                                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                                                    placeholder="Enter password"
                                                    autoComplete="new-password"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="row">
                                        <div className="col-md-6">
                                            <div className="mb-3">
                                                <label className="form-label">Role</label>
                                                <select
                                                    className="form-control"
                                                    value={newUser.role}
                                                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                                                >
                                                    <option value="USER">Staff (USER)</option>
                                                    <option value="ADMIN">Admin (ADMIN)</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <button type="submit" className="btn btn-success" disabled={loading}>
                                        {loading ? 'Creating...' : 'Create Login Credentials'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    <div className="card">
                        <div className="card-header">
                            <h4>All Users in System</h4>
                        </div>
                        <div className="card-body">
                            {loading && <div className="text-center">Loading...</div>}
                            
                            {users.length === 0 && !loading ? (
                                <p>No users found.</p>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-striped">
                                        <thead>
                                            <tr>
                                                <th>Email</th>
                                                <th>Role</th>
                                                <th>Created At</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map((user) => (
                                                <tr key={user.id}>
                                                    <td>{user.email}</td>
                                                    <td>
                                                        <span className={`badge ${user.role === 'ADMIN' ? 'bg-danger' : 'bg-primary'}`}>
                                                            {user.role}
                                                        </span>
                                                    </td>
                                                    <td>{formatDate(user.created_at)}</td>
                                                    <td>
                                                        {user.user_id !== currentUserId && user.role !== 'ADMIN' && (
                                                            <button
                                                                className="btn btn-sm btn-danger"
                                                                onClick={() => handleDeleteUser(user.user_id, user.email)}
                                                                disabled={loading}
                                                            >
                                                                Delete
                                                            </button>
                                                        )}
                                                        {user.user_id === currentUserId && (
                                                            <span className="text-muted">Current User</span>
                                                        )}
                                                        {user.user_id !== currentUserId && user.role === 'ADMIN' && (
                                                            <span className="text-muted">Admin (Protected)</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserManagementPage;
