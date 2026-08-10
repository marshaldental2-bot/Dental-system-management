import { useEffect, useState, useCallback } from "react";
import { authService } from "../../services/supabaseAuthService";
import { dentalLabService } from "../../services/dentalLabService";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
    const [email, setEmail] = useState();
    const [userRole, setUserRole] = useState();
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalStaff: 0,
        totalAdmins: 0,
        totalWorkOrders: 0,
        totalBills: 0,
        pendingBills: 0,
        monthlyRevenue: 0
    });
    const [realtimeStats, setRealtimeStats] = useState({
        currentMonthOrders: 0,
        currentMonthRevenue: 0,
        totalDoctors: 0
    });
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const navigate = useNavigate();

    // Define loadNotifications with useCallback to prevent dependency issues
    const loadNotifications = useCallback(async () => {
        try {
            const billsResponse = await dentalLabService.getAllBills();
            const workOrdersResponse = await dentalLabService.getAllWorkOrders();
            
            const newNotifications = [];

            if (billsResponse.data) {
                // Bills without payment (need collection follow-up)
                const unpaidBills = billsResponse.data.filter(bill => {
                    const billDate = new Date(bill.bill_date);
                    const daysAgo = (new Date() - billDate) / (1000 * 60 * 60 * 24);
                    return daysAgo > 7 && bill.amount && bill.amount > 0 && bill.status === 'pending';
                });
                
                if (unpaidBills.length > 0) {
                    newNotifications.push({
                        id: 'unpaid-bills',
                        type: 'urgent',
                        title: 'Bills Need Payment Follow-up',
                        message: `${unpaidBills.length} priced bills need payment collection`,
                        action: () => navigate('/admin/monthly-billing'),
                        timestamp: new Date()
                    });
                }
            }

            if (workOrdersResponse.data) {
                // Long-running work orders
                const longRunningOrders = workOrdersResponse.data.filter(order => {
                    if (order.status === 'completed') return false;
                    const orderDate = new Date(order.order_date);
                    const daysAgo = (new Date() - orderDate) / (1000 * 60 * 60 * 24);
                    return daysAgo > 14; // More than 2 weeks
                });

                if (longRunningOrders.length > 0) {
                    newNotifications.push({
                        id: 'long-running-orders',
                        type: 'info',
                        title: 'Long-Running Orders',
                        message: `${longRunningOrders.length} orders running >2 weeks`,
                         action: null, // Do nothing on click
                        timestamp: new Date()
                    });
                }
            }

            setNotifications(newNotifications);
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }, [navigate]);

    useEffect(() => { 
        const loadUserData = async () => {
            // Get cached data
            const role = authService.getUserRole();
            setUserRole(role);
           
            const email = authService.getUserEmail();
            setEmail(email);

            // Refresh role from database with error handling
            try {
                const freshRole = await authService.refreshUserRole();
                if (freshRole && freshRole !== role) {
                    setUserRole(freshRole);
                }
            } catch (error) {
                console.warn('Could not refresh user role, using cached role:', error);
                // Continue with cached role instead of failing
            }

            // Load user statistics
            await loadStats();
            await loadRealtimeStats();
            await loadNotifications();
        };

        loadUserData();

        // Refresh stats when page becomes visible (user returns from other pages)
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                loadRealtimeStats();
                loadNotifications();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Set up real-time updates every 30 seconds
        const interval = setInterval(() => {
            loadRealtimeStats();
            loadNotifications();
            setLastRefresh(new Date());
        }, 30000);

        // Set up keyboard shortcuts
        const handleKeyShortcuts = (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'b': 
                        e.preventDefault();
                        navigate('/admin/monthly-billing'); 
                        break;
                    case 'u': 
                        e.preventDefault();
                        navigate('/user-management'); 
                        break;
                    case 'w': 
                        e.preventDefault();
                        navigate('/admin/work-orders-list'); 
                        break;
                    case 'r': 
                        e.preventDefault();
                        loadStats(); 
                        loadRealtimeStats();
                        break;
                    case 'n': 
                        e.preventDefault();
                        setShowNotifications(!showNotifications); 
                        break;
                    default:
                        // No action for other keys
                        break;
                }
            }
        };

        document.addEventListener('keydown', handleKeyShortcuts);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('keydown', handleKeyShortcuts);
        };
    }, [navigate, showNotifications, loadNotifications]);

    const loadStats = async () => {
        // Load user statistics
        const userResponse = await authService.getAllUsers();
        let userStats = {
            totalUsers: 0,
            totalStaff: 0,
            totalAdmins: 0
        };
        
        if (userResponse.data) {
            const users = userResponse.data;
            userStats = {
                totalUsers: users.length,
                totalStaff: users.filter(user => user.role === 'USER').length,
                totalAdmins: users.filter(user => user.role === 'ADMIN').length
            };
        }

        // Load dental lab statistics
        const workOrdersResponse = await dentalLabService.getAllWorkOrders();
        const billsResponse = await dentalLabService.getAllBills();
        
        let labStats = {
            totalWorkOrders: 0,
            totalBills: 0,
            pendingBills: 0,
            monthlyRevenue: 0
        };

        if (workOrdersResponse.data) {
            labStats.totalWorkOrders = workOrdersResponse.data.length;
        }

        if (billsResponse.data) {
            const bills = billsResponse.data;
            labStats.totalBills = bills.length;
            labStats.pendingBills = bills.filter(b => b.status === 'pending').length;
            
            // Calculate this month's revenue
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            labStats.monthlyRevenue = bills
                .filter(bill => {
                    const billDate = new Date(bill.bill_date);
                    return billDate.getMonth() === currentMonth && 
                           billDate.getFullYear() === currentYear &&
                           bill.amount;
                })
                .reduce((sum, bill) => sum + parseFloat(bill.amount || 0), 0);
        }

        setStats({
            ...userStats,
            ...labStats
        });
    };

    const loadRealtimeStats = async () => {
        try {
            // Get monthly bills stats from history
            const monthlyBillsStatsResponse = await dentalLabService.getMonthlyBillsStats();
            let monthlyStats = {
                currentMonthRevenue: 0,
                currentMonthBills: 0,
                totalCompletedBills: 0
            };
            
            if (monthlyBillsStatsResponse.data) {
                monthlyStats = monthlyBillsStatsResponse.data;
            }

            const currentDate = new Date();
            const currentMonth = currentDate.getMonth();
            const currentYear = currentDate.getFullYear();
            
            // Get work orders for current month
            const workOrdersResponse = await dentalLabService.getAllWorkOrders();
            
            const currentMonthOrders = workOrdersResponse.data?.filter(order => {
                const orderDate = new Date(order.completion_date || order.created_at);
                return orderDate.getMonth() === currentMonth && 
                       orderDate.getFullYear() === currentYear;
            }).length || 0;

            // Get unique doctors count
            const uniqueDoctors = new Set();
            workOrdersResponse.data?.forEach(order => {
                if (order.doctor_name) {
                    // Normalize doctor name for counting
                    const normalizedName = order.doctor_name
                        .replace(/^(dr\.?|doctor)\s+/i, '')
                        .trim()
                        .toLowerCase();
                    if (normalizedName) {
                        uniqueDoctors.add(normalizedName);
                    }
                }
            });

            setRealtimeStats({
                currentMonthOrders: currentMonthOrders,
                currentMonthRevenue: monthlyStats.currentMonthRevenue, // From completed bills
                totalDoctors: uniqueDoctors.size
            });
        } catch (error) {
            console.error('Error loading realtime stats:', error);
        }
    };

    const logout = async () => {
        await authService.logOut();
        navigate('/');
    };

    const formatTime = (date) => {
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    return (
        <>
            <div className="container mt-5">
                <div className="row">
                    <div className="col-12">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h2>⚙️ Enhanced Admin Dashboard</h2>
                            <div className="d-flex align-items-center">
                                {/* Refresh Button */}
                                <button 
                                    className="btn btn-outline-success me-2"
                                    onClick={() => {
                                        loadRealtimeStats();
                                        loadNotifications();
                                        setLastRefresh(new Date());
                                    }}
                                    title="Refresh Dashboard (Ctrl+R)"
                                >
                                    🔄
                                </button>
                                
                                {/* Notifications Bell */}
                                <div className="position-relative me-3">
                                    <button 
                                        className="btn btn-outline-primary position-relative"
                                        onClick={() => setShowNotifications(!showNotifications)}
                                        title="Notifications (Ctrl+N)"
                                    >
                                        🔔
                                        {notifications.length > 0 && (
                                            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                                                {notifications.length}
                                            </span>
                                        )}
                                    </button>
                                    
                                    {/* Notifications Dropdown */}
                                    {showNotifications && (
                                        <div className="card position-absolute top-100 end-0 mt-2" style={{width: '350px', zIndex: 1000}}>
                                            <div className="card-header d-flex justify-content-between">
                                                <h6>🔔 Notifications</h6>
                                                <small className="text-muted">Last updated: {formatTime(lastRefresh)}</small>
                                            </div>
                                            <div className="card-body p-0" style={{maxHeight: '300px', overflowY: 'auto'}}>
                                                {notifications.length === 0 ? (
                                                    <div className="text-center p-3 text-muted">
                                                        ✅ All caught up! No new notifications.
                                                    </div>
                                                ) : (
                                                    notifications.map(notification => (
                                                        <div 
                                                            key={notification.id} 
                                                            className={`p-3 border-bottom notification-item ${notification.type}`}
                                                            style={{ cursor: notification.action ? 'pointer' : 'default' }}
                                                            onClick={notification.action}
                                                        >
                                                            <div className="d-flex align-items-start">
                                                                <div className="me-2">
                                                                    {notification.type === 'urgent' ? '🚨' : 
                                                                     notification.type === 'warning' ? '⚠️' : 'ℹ️'}
                                                                </div>
                                                                <div className="flex-grow-1">
                                                                    <h6 className="mb-1">{notification.title}</h6>
                                                                    <p className="mb-0 small text-muted">{notification.message}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button className="btn btn-danger" onClick={logout}>
                                    Logout
                                </button>
                            </div>
                        </div>

                        {/* Admin Info Card */}
                        <div className="card mb-4">
                            <div className="card-header d-flex justify-content-between align-items-center">
                                <h4>Welcome, Administrator!</h4>
                                <div className="d-flex align-items-center">
                                    <small className="text-muted me-3">Last refresh: {formatTime(lastRefresh)}</small>
                                    <button 
                                        className="btn btn-sm btn-outline-primary"
                                        onClick={() => {
                                            loadStats();
                                            loadRealtimeStats();
                                            loadNotifications();
                                        }}
                                        title="Refresh (Ctrl+R)"
                                    >
                                        🔄 Refresh
                                    </button>
                                </div>
                            </div>
                            <div className="card-body">
                                <ul className="list-group list-group-flush">
                                    <li className="list-group-item">
                                        <strong>Email:</strong> {email}
                                    </li>
                                    <li className="list-group-item">
                                        <strong>Role:</strong> 
                                        <span className="badge bg-danger ms-2">{userRole}</span>
                                    </li>
                                    <li className="list-group-item">
                                        <strong>Access Level:</strong> Full Administrator
                                        <span className="ms-3 small text-muted">
                                            💡 Tips: Ctrl+B (Bills), Ctrl+U (Users), Ctrl+R (Refresh), Ctrl+N (Notifications)
                                        </span>
                                    </li>
                                </ul>
                            </div>
                        {/* Monthly Billing Statistics Cards */}
                        <div className="row mb-4">
                            <div className="col-6 col-md-4 mb-3">
                                <div className="card text-white bg-primary admin-card h-100">
                                    <div className="card-header d-flex justify-content-between p-2 p-md-3">
                                        <span className="small d-none d-md-inline">This Month's Orders</span>
                                        <span className="small d-md-none">Month's Orders</span>
                                        <span>📊</span>
                                    </div>
                                    <div className="card-body p-2 p-md-3">
                                        <h2 className="card-title mb-1">{realtimeStats.currentMonthOrders}</h2>
                                        <p className="card-text small mb-0 d-none d-md-block">Work orders this month</p>
                                        <small className="opacity-75">Total: {stats.totalWorkOrders}</small>
                                    </div>
                                </div>
                            </div>
                            <div className="col-6 col-md-4 mb-3">
                                <div className="card text-white bg-success admin-card h-100">
                                    <div className="card-header d-flex justify-content-between p-2 p-md-3">
                                        <span className="small d-none d-md-inline">Monthly Revenue</span>
                                        <span className="small d-md-none">Revenue</span>
                                        <span>💰</span>
                                    </div>
                                    <div className="card-body p-2 p-md-3">
                                        <h2 className="card-title mb-1">₹{realtimeStats.currentMonthRevenue.toFixed(2)}</h2>
                                        <p className="card-text small mb-0 d-none d-md-block">Revenue this month</p>
                                        <small className="opacity-75 d-none d-md-block">From completed bills</small>
                                    </div>
                                </div>
                            </div>

                            <div className="col-6 col-md-4 mb-3">
                                <div className="card text-white bg-info admin-card h-100">
                                    <div className="card-header d-flex justify-content-between p-2 p-md-3">
                                        <span className="small d-none d-md-inline">Active Doctors</span>
                                        <span className="small d-md-none">Doctors</span>
                                        <span>‍⚕️</span>
                                    </div>
                                    <div className="card-body p-2 p-md-3">
                                        <h2 className="card-title mb-1">{realtimeStats.totalDoctors}</h2>
                                        <p className="card-text small mb-0 d-none d-md-block">Doctors in system</p>
                                        <small className="opacity-75 d-none d-md-block">Total unique doctors</small>
                                    </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Admin Actions */}
                        <div className="row">
                            <div className="col-lg-4 col-md-6">
                                <div className="card admin-action-card">
                                    <div className="card-header">
                                        <h5>💰 Monthly Billing & Pricing</h5>
                                    </div>
                                    <div className="card-body">
                                        <p>Complete month-end billing process: add pricing, generate bills, and create monthly summaries.</p>
                                        <div className="d-grid gap-2">
                                            <button 
                                                className="btn btn-primary" 
                                                onClick={() => navigate('/admin/monthly-billing')}
                                            >
                                                📊 Monthly Billing & Pricing
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="col-lg-4 col-md-6">
                                <div className="card admin-action-card">
                                    <div className="card-header">
                                        <h5>👥 User Management</h5>
                                    </div>
                                    <div className="card-body">
                                        <p>Manage users, create accounts, assign roles with advanced controls.</p>
                                        <div className="d-grid gap-2">
                                            <button 
                                                className="btn btn-success" 
                                                onClick={() => navigate('/user-management')}
                                            >
                                                👥 Manage Users
                                            </button>
                                            <button 
                                                className="btn btn-warning" 
                                                onClick={() => navigate('/user-management?tab=password')}
                                                title="Quickly change user passwords for security"
                                            >
                                                🔐 Change Passwords
                                            </button>
                                            <button 
                                                className="btn btn-dark" 
                                                onClick={() => navigate('/user-management?tab=super-admin')}
                                                title="Super Admin controls - promote/demote users"
                                            >
                                                👑 Super Admin
                                            </button>
                                            <div className="small text-muted">
                                                {stats.totalStaff} staff • {stats.totalAdmins} admins
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* New Work Order Management Section */}
                            <div className="col-lg-4 col-md-6">
                                <div className="card admin-action-card">
                                    <div className="card-header">
                                        <h5>🦷 Work Order Management</h5>
                                    </div>
                                    <div className="card-body">
                                        <p>Advanced work order management with admin privileges to edit and delete any order.</p>
                                        <div className="d-grid gap-2">
                                            <button 
                                                className="btn btn-info" 
                                                onClick={() => navigate('/admin/work-orders-list')}
                                            >
                                                📋 Manage Work Orders
                                            </button>
                                            <button 
                                                className="btn btn-outline-info" 
                                                onClick={() => navigate('/admin/work-order-form')}
                                            >
                                                ➕ Create Work Order
                                            </button>
                                            <button 
                                                className="btn btn-outline-secondary" 
                                                onClick={() => navigate('/admin/batch-work-order')}
                                            >
                                                📦 Batch Creation
                                            </button>
                                            <div className="small text-muted">
                                                Admin override permissions enabled
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Enhanced Admin Workflow */}
                        <div className="row mt-4">
                            <div className="col-12">
                                <div className="card">
                                    <div className="card-header">
                                        <h5>🔄 Enhanced Admin Workflow & Quick Access</h5>
                                    </div>
                                    <div className="card-body">
                                        <p className="text-muted">
                                            Modern admin experience with real-time updates and comprehensive monitoring:
                                        </p>
                                        <div className="row">
                                            <div className="col-md-3">
                                                <div className="bg-light p-3 rounded text-center mb-3">
                                                    <strong>💰 Bills</strong>
                                                    <br />
                                                    <small>Ctrl+B • Manage pricing & billing</small>
                                                </div>
                                            </div>
                                            <div className="col-md-3">
                                                <div className="bg-light p-3 rounded text-center mb-3">
                                                    <strong>👥 Users</strong>
                                                    <br />
                                                    <small>Ctrl+U • Account management</small>
                                                </div>
                                            </div>
                                            <div className="col-md-3">
                                                <div className="bg-light p-3 rounded text-center mb-3">
                                                    <strong>🦷 Work Orders</strong>
                                                    <br />
                                                    <small>Ctrl+W • Manage orders</small>
                                                </div>
                                            </div>
                                            <div className="col-md-3">
                                                <div className="bg-light p-3 rounded text-center mb-3">
                                                    <strong>🔔 Alerts</strong>
                                                    <br />
                                                    <small>Ctrl+N • Smart notifications</small>
                                                </div>
                                            </div>
                                            <div className="col-md-3">
                                                <div className="bg-light p-3 rounded text-center mb-3">
                                                    <strong>🔄 Refresh</strong>
                                                    <br />
                                                    <small>Ctrl+R • Update all data</small>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Stats Summary */}
                        <div className="row mt-4">
                            <div className="col-12">
                                <div className="card">
                                    <div className="card-header">
                                        <h6>📈 Quick Stats Summary</h6>
                                    </div>
                                    <div className="card-body">
                                        <div className="row text-center">
                                            <div className="col-md-2">
                                                <strong>{stats.totalWorkOrders}</strong>
                                                <br />
                                                <small className="text-muted">Total Orders</small>
                                            </div>
                                            <div className="col-md-2">
                                                <strong>{stats.totalBills}</strong>
                                                <br />
                                                <small className="text-muted">Total Bills</small>
                                            </div>
                                            <div className="col-md-2">
                                                <strong>${stats.monthlyRevenue.toFixed(0)}</strong>
                                                <br />
                                                <small className="text-muted">Monthly Revenue</small>
                                            </div>
                                            <div className="col-md-2">
                                                <strong>{realtimeStats.todayWorkOrders}</strong>
                                                <br />
                                                <small className="text-muted">Today's Orders</small>
                                            </div>
                                            <div className="col-md-2">
                                                <strong>{realtimeStats.pendingApprovals}</strong>
                                                <br />
                                                <small className="text-muted">Pending</small>
                                            </div>
                                            <div className="col-md-2">
                                                <strong>{notifications.length}</strong>
                                                <br />
                                                <small className="text-muted">Alerts</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add custom styles */}
            <style>{`
                .admin-card {
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                    border-radius: 15px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                }
                
                .admin-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
                }
                
                .admin-action-card {
                    transition: transform 0.2s ease;
                    border-radius: 10px;
                }
                
                .admin-action-card:hover {
                    transform: translateY(-2px);
                }
                
                .notification-item {
                    transition: background-color 0.2s ease;
                }
                
                .notification-item:hover {
                    background-color: #f8f9fa;
                }
                
                .notification-item.urgent {
                    border-left: 4px solid #dc3545;
                }
                
                .notification-item.warning {
                    border-left: 4px solid #ffc107;
                }
                
                .notification-item.info {
                    border-left: 4px solid #17a2b8;
                }
            `}</style>
        </>
    );
}

export default AdminDashboard;
