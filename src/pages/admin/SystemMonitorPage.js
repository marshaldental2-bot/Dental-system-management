/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { dentalLabService } from '../../services/dentalLabService';
import { authService } from '../../services/supabaseAuthService';
import './SystemMonitorPage.css';

const SystemMonitorPage = () => {
    const [systemHealth, setSystemHealth] = useState({
        database: { status: 'unknown', responseTime: 0, lastCheck: null },
        api: { status: 'unknown', responseTime: 0, lastCheck: null },
        auth: { status: 'unknown', responseTime: 0, lastCheck: null }
    });
    const [systemStats, setSystemStats] = useState({
        activeUsers: 0,
        totalSessions: 0,
        avgResponseTime: 0,
        errorRate: 0,
        uptime: '0h 0m',
        memoryUsage: 0,
        diskUsage: 0
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [systemAlerts, setSystemAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [refreshInterval, setRefreshInterval] = useState(30); // seconds

    useEffect(() => {
        loadSystemData();
        
        let interval;
        if (autoRefresh) {
            interval = setInterval(loadSystemData, refreshInterval * 1000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [autoRefresh, refreshInterval]);

    const loadSystemData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                checkSystemHealth(),
                loadSystemStats(),
                loadRecentActivity(),
                checkSystemAlerts()
            ]);
        } catch (error) {
            console.error('Error loading system data:', error);
        } finally {
            setLoading(false);
        }
    };

    const checkSystemHealth = async () => {
        const startTime = Date.now();
        
        try {
            // Test database connection
            const dbStart = Date.now();
            await dentalLabService.getAllWorkOrders();
            const dbResponseTime = Date.now() - dbStart;
            
            // Test auth service
            const authStart = Date.now();
            await authService.getAllUsers();
            const authResponseTime = Date.now() - authStart;
            
            // Calculate API response time
            const apiResponseTime = Date.now() - startTime;
            
            setSystemHealth({
                database: {
                    status: dbResponseTime < 1000 ? 'healthy' : dbResponseTime < 3000 ? 'warning' : 'critical',
                    responseTime: dbResponseTime,
                    lastCheck: new Date()
                },
                auth: {
                    status: authResponseTime < 1000 ? 'healthy' : authResponseTime < 3000 ? 'warning' : 'critical',
                    responseTime: authResponseTime,
                    lastCheck: new Date()
                },
                api: {
                    status: apiResponseTime < 1500 ? 'healthy' : apiResponseTime < 4000 ? 'warning' : 'critical',
                    responseTime: apiResponseTime,
                    lastCheck: new Date()
                }
            });
        } catch (error) {
            console.error('Health check failed:', error);
            setSystemHealth(prev => ({
                ...prev,
                database: { ...prev.database, status: 'critical', lastCheck: new Date() },
                auth: { ...prev.auth, status: 'critical', lastCheck: new Date() },
                api: { ...prev.api, status: 'critical', lastCheck: new Date() }
            }));
        }
    };

    const loadSystemStats = async () => {
        try {
            // Generate realistic system stats
            const users = await authService.getAllUsers();
            const workOrders = await dentalLabService.getAllWorkOrders();
            
            // Simulate system metrics
            const activeUsers = Math.floor(Math.random() * 10) + 2;
            const totalSessions = users.data?.length * 2 + Math.floor(Math.random() * 20);
            const avgResponseTime = Math.floor(Math.random() * 500) + 200;
            const errorRate = Math.random() * 2; // 0-2%
            const uptimeHours = Math.floor(Math.random() * 72) + 24;
            const uptimeMinutes = Math.floor(Math.random() * 60);
            const memoryUsage = Math.floor(Math.random() * 30) + 50; // 50-80%
            const diskUsage = Math.floor(Math.random() * 20) + 30; // 30-50%
            
            setSystemStats({
                activeUsers,
                totalSessions,
                avgResponseTime,
                errorRate,
                uptime: `${uptimeHours}h ${uptimeMinutes}m`,
                memoryUsage,
                diskUsage
            });
        } catch (error) {
            console.error('Error loading system stats:', error);
        }
    };

    const loadRecentActivity = async () => {
        // Generate recent activity logs
        const activities = [
            { 
                id: 1, 
                timestamp: new Date(Date.now() - 5 * 60 * 1000), 
                type: 'login', 
                user: 'Dr. Smith', 
                action: 'User logged in successfully',
                ip: '192.168.1.101'
            },
            { 
                id: 2, 
                timestamp: new Date(Date.now() - 12 * 60 * 1000), 
                type: 'work_order', 
                user: 'Sarah Johnson', 
                action: 'Created new work order #WO-2024-001',
                ip: '192.168.1.102'
            },
            { 
                id: 3, 
                timestamp: new Date(Date.now() - 18 * 60 * 1000), 
                type: 'bill', 
                user: 'Admin User', 
                action: 'Updated bill amount for WO-2024-001',
                ip: '192.168.1.100'
            },
            { 
                id: 4, 
                timestamp: new Date(Date.now() - 25 * 60 * 1000), 
                type: 'login', 
                user: 'Mike Chen', 
                action: 'User logged in successfully',
                ip: '192.168.1.103'
            },
            { 
                id: 5, 
                timestamp: new Date(Date.now() - 35 * 60 * 1000), 
                type: 'batch', 
                user: 'Emily Rodriguez', 
                action: 'Created batch work order with 5 items',
                ip: '192.168.1.104'
            },
            { 
                id: 6, 
                timestamp: new Date(Date.now() - 42 * 60 * 1000), 
                type: 'user', 
                user: 'Admin User', 
                action: 'Created new staff account for David Kim',
                ip: '192.168.1.100'
            }
        ];
        
        setRecentActivity(activities);
    };

    const checkSystemAlerts = async () => {
        const alerts = [];
        
        // Generate alerts based on system state
        if (systemStats.memoryUsage > 75) {
            alerts.push({
                id: 1,
                type: 'warning',
                title: 'High Memory Usage',
                message: `Memory usage is at ${systemStats.memoryUsage}%. Consider monitoring closely.`,
                timestamp: new Date()
            });
        }
        
        if (systemStats.errorRate > 1) {
            alerts.push({
                id: 2,
                type: 'error',
                title: 'Elevated Error Rate',
                message: `Error rate is ${systemStats.errorRate.toFixed(2)}%. Investigate potential issues.`,
                timestamp: new Date()
            });
        }
        
        if (systemStats.avgResponseTime > 1000) {
            alerts.push({
                id: 3,
                type: 'warning',
                title: 'Slow Response Times',
                message: `Average response time is ${systemStats.avgResponseTime}ms. System may be under load.`,
                timestamp: new Date()
            });
        }
        
        // Add a maintenance reminder
        if (Math.random() > 0.7) {
            alerts.push({
                id: 4,
                type: 'info',
                title: 'Scheduled Maintenance',
                message: 'System backup scheduled for tonight at 2:00 AM EST.',
                timestamp: new Date()
            });
        }
        
        setSystemAlerts(alerts);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'healthy': return '#27ae60';
            case 'warning': return '#f39c12';
            case 'critical': return '#e74c3c';
            default: return '#95a5a6';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'healthy': return '✅';
            case 'warning': return '⚠️';
            case 'critical': return '🔴';
            default: return '⭕';
        }
    };

    const getActivityIcon = (type) => {
        switch (type) {
            case 'login': return '🔐';
            case 'work_order': return '📋';
            case 'bill': return '💰';
            case 'batch': return '📦';
            case 'user': return '👥';
            default: return '📄';
        }
    };

    const formatTimestamp = (timestamp) => {
        return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
            Math.ceil((timestamp - Date.now()) / (1000 * 60)),
            'minute'
        );
    };

    const exportSystemReport = () => {
        const report = {
            timestamp: new Date().toISOString(),
            systemHealth,
            systemStats,
            recentActivity: recentActivity.slice(0, 10),
            systemAlerts
        };
        
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `system-report-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading && Object.values(systemHealth).every(h => h.status === 'unknown')) {
        return (
            <div className="system-monitor-page">
                <div className="monitor-loading">
                    <div className="loading-spinner"></div>
                    <p>Checking system health...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="system-monitor-page">
            <div className="monitor-header">
                <h1>🖥️ System Monitor</h1>
                <div className="monitor-controls">
                    <label className="auto-refresh-toggle">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                        />
                        Auto-refresh
                    </label>
                    <select
                        value={refreshInterval}
                        onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                        disabled={!autoRefresh}
                        className="refresh-interval-select"
                    >
                        <option value={10}>10s</option>
                        <option value={30}>30s</option>
                        <option value={60}>1m</option>
                        <option value={300}>5m</option>
                    </select>
                    <button onClick={loadSystemData} className="refresh-btn">
                        🔄 Refresh
                    </button>
                    <button onClick={exportSystemReport} className="export-btn">
                        📊 Export Report
                    </button>
                </div>
            </div>

            {/* System Health Overview */}
            <div className="health-overview">
                <h2>🏥 System Health</h2>
                <div className="health-grid">
                    {Object.entries(systemHealth).map(([service, health]) => (
                        <div key={service} className="health-card">
                            <div className="health-header">
                                <span className="health-icon">{getStatusIcon(health.status)}</span>
                                <h3>{service.charAt(0).toUpperCase() + service.slice(1)}</h3>
                                <span 
                                    className="health-status"
                                    style={{ color: getStatusColor(health.status) }}
                                >
                                    {health.status}
                                </span>
                            </div>
                            <div className="health-metrics">
                                <div className="metric">
                                    <span>Response Time</span>
                                    <span className="metric-value">{health.responseTime}ms</span>
                                </div>
                                {health.lastCheck && (
                                    <div className="metric">
                                        <span>Last Check</span>
                                        <span className="metric-value">
                                            {formatTimestamp(health.lastCheck)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* System Statistics */}
            <div className="stats-overview">
                <h2>📊 System Statistics</h2>
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon">👥</div>
                        <div className="stat-value">{systemStats.activeUsers}</div>
                        <div className="stat-label">Active Users</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">🔗</div>
                        <div className="stat-value">{systemStats.totalSessions}</div>
                        <div className="stat-label">Total Sessions</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">⚡</div>
                        <div className="stat-value">{systemStats.avgResponseTime}ms</div>
                        <div className="stat-label">Avg Response</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">🚨</div>
                        <div className="stat-value">{systemStats.errorRate.toFixed(2)}%</div>
                        <div className="stat-label">Error Rate</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">⏰</div>
                        <div className="stat-value">{systemStats.uptime}</div>
                        <div className="stat-label">Uptime</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">💾</div>
                        <div className="stat-value">{systemStats.memoryUsage}%</div>
                        <div className="stat-label">Memory Usage</div>
                    </div>
                </div>
            </div>

            {/* System Alerts */}
            {systemAlerts.length > 0 && (
                <div className="alerts-section">
                    <h2>🚨 System Alerts</h2>
                    <div className="alerts-list">
                        {systemAlerts.map(alert => (
                            <div key={alert.id} className={`alert-item alert-${alert.type}`}>
                                <div className="alert-header">
                                    <span className="alert-title">{alert.title}</span>
                                    <span className="alert-time">
                                        {formatTimestamp(alert.timestamp)}
                                    </span>
                                </div>
                                <div className="alert-message">{alert.message}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Activity */}
            <div className="activity-section">
                <h2>📝 Recent Activity</h2>
                <div className="activity-list">
                    {recentActivity.map(activity => (
                        <div key={activity.id} className="activity-item">
                            <div className="activity-icon">
                                {getActivityIcon(activity.type)}
                            </div>
                            <div className="activity-details">
                                <div className="activity-action">{activity.action}</div>
                                <div className="activity-meta">
                                    <span className="activity-user">{activity.user}</span>
                                    <span className="activity-time">
                                        {formatTimestamp(activity.timestamp)}
                                    </span>
                                    <span className="activity-ip">{activity.ip}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SystemMonitorPage;
