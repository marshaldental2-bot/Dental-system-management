/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { dentalLabService } from '../../services/dentalLabService';
import './AnalyticsPage.css';

const AnalyticsPage = () => {
    const [analyticsData, setAnalyticsData] = useState({
        revenue: {
            monthly: [],
            weekly: [],
            daily: [],
            total: 0,
            growth: 0
        },
        workOrders: {
            byStatus: {},
            byDoctor: {},
            byProcedure: {},
            completion: [],
            avgTime: 0
        },
        patients: {
            newPatients: [],
            returningPatients: [],
            topPatients: [],
            retention: 0
        },
        staff: {
            productivity: [],
            workload: [],
            performance: []
        }
    });
    const [timeRange, setTimeRange] = useState('30'); // days
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('revenue');

    useEffect(() => {
        loadAnalytics();
    }, [timeRange]);

    const loadAnalytics = async () => {
        setLoading(true);
        try {
            // Load revenue analytics
            const revenueData = await loadRevenueAnalytics();
            const workOrderData = await loadWorkOrderAnalytics();
            const patientData = await loadPatientAnalytics();
            const staffData = await loadStaffAnalytics();

            setAnalyticsData({
                revenue: revenueData,
                workOrders: workOrderData,
                patients: patientData,
                staff: staffData
            });
        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadRevenueAnalytics = async () => {
        // Generate sample revenue data - in real app, this would come from API
        const days = parseInt(timeRange);
        const daily = [];
        const weekly = [];
        const monthly = [];
        let total = 0;

        // Generate daily revenue for the selected period
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const revenue = Math.random() * 5000 + 1000; // Random revenue between 1000-6000
            daily.push({
                date: date.toISOString().split('T')[0],
                amount: revenue,
                orders: Math.floor(Math.random() * 20) + 5
            });
            total += revenue;
        }

        // Calculate growth (comparing with previous period)
        const growth = Math.random() * 30 - 10; // Random growth between -10% and 20%

        return {
            daily,
            weekly: aggregateByWeek(daily),
            monthly: aggregateByMonth(daily),
            total,
            growth
        };
    };

    const loadWorkOrderAnalytics = async () => {
        try {
            const workOrders = await dentalLabService.getAllWorkOrders();
            
            // Analyze by status
            const byStatus = workOrders.reduce((acc, order) => {
                acc[order.status] = (acc[order.status] || 0) + 1;
                return acc;
            }, {});

            // Analyze by doctor
            const byDoctor = workOrders.reduce((acc, order) => {
                acc[order.doctor_name] = (acc[order.doctor_name] || 0) + 1;
                return acc;
            }, {});

            // Analyze by procedure type
            const byProcedure = workOrders.reduce((acc, order) => {
                acc[order.procedure_type] = (acc[order.procedure_type] || 0) + 1;
                return acc;
            }, {});

            // Calculate completion timeline
            const completion = calculateCompletionTimeline(workOrders);

            return {
                byStatus,
                byDoctor,
                byProcedure,
                completion,
                avgTime: calculateAverageCompletionTime(workOrders)
            };
        } catch (error) {
            console.error('Error loading work order analytics:', error);
            return {
                byStatus: {},
                byDoctor: {},
                byProcedure: {},
                completion: [],
                avgTime: 0
            };
        }
    };

    const loadPatientAnalytics = async () => {
        // Generate sample patient data
        const newPatients = generateTimeSeriesData(parseInt(timeRange), 2, 8);
        const returningPatients = generateTimeSeriesData(parseInt(timeRange), 5, 15);
        
        return {
            newPatients,
            returningPatients,
            topPatients: [
                { name: 'Dr. Smith Clinic', orders: 45, revenue: 12500 },
                { name: 'Dr. Johnson Practice', orders: 38, revenue: 10200 },
                { name: 'Central Dental', orders: 32, revenue: 8900 },
                { name: 'Family Dentistry Plus', orders: 28, revenue: 7800 },
                { name: 'Modern Dental Care', orders: 24, revenue: 6900 }
            ],
            retention: 78.5 // percentage
        };
    };

    const loadStaffAnalytics = async () => {
        // Generate sample staff data
        return {
            productivity: [
                { name: 'Sarah Johnson', ordersCompleted: 45, avgTime: 2.3, efficiency: 92 },
                { name: 'Mike Chen', ordersCompleted: 38, avgTime: 2.8, efficiency: 88 },
                { name: 'Emily Rodriguez', ordersCompleted: 42, avgTime: 2.5, efficiency: 90 },
                { name: 'David Kim', ordersCompleted: 35, avgTime: 3.1, efficiency: 85 }
            ],
            workload: generateTimeSeriesData(parseInt(timeRange), 20, 50),
            performance: generateTimeSeriesData(parseInt(timeRange), 80, 95)
        };
    };

    // Helper functions
    const aggregateByWeek = (daily) => {
        const weeks = {};
        daily.forEach(day => {
            const date = new Date(day.date);
            const weekStart = getWeekStart(date);
            const weekKey = weekStart.toISOString().split('T')[0];
            
            if (!weeks[weekKey]) {
                weeks[weekKey] = { date: weekKey, amount: 0, orders: 0 };
            }
            weeks[weekKey].amount += day.amount;
            weeks[weekKey].orders += day.orders;
        });
        return Object.values(weeks);
    };

    const aggregateByMonth = (daily) => {
        const months = {};
        daily.forEach(day => {
            const date = new Date(day.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!months[monthKey]) {
                months[monthKey] = { date: monthKey, amount: 0, orders: 0 };
            }
            months[monthKey].amount += day.amount;
            months[monthKey].orders += day.orders;
        });
        return Object.values(months);
    };

    const getWeekStart = (date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff));
    };

    const calculateCompletionTimeline = (workOrders) => {
        const timeline = {};
        workOrders.forEach(order => {
            if (order.status === 'completed' && order.created_at) {
                const date = new Date(order.created_at).toISOString().split('T')[0];
                timeline[date] = (timeline[date] || 0) + 1;
            }
        });
        
        return Object.entries(timeline).map(([date, count]) => ({ date, count }));
    };

    const calculateAverageCompletionTime = (workOrders) => {
        const completedOrders = workOrders.filter(order => 
            order.status === 'completed' && order.created_at && order.expected_complete_date
        );
        
        if (completedOrders.length === 0) return 0;
        
        const totalDays = completedOrders.reduce((sum, order) => {
            const created = new Date(order.created_at);
            const completed = new Date(order.expected_complete_date);
            const days = Math.abs(completed - created) / (1000 * 60 * 60 * 24);
            return sum + days;
        }, 0);
        
        return Math.round(totalDays / completedOrders.length * 10) / 10;
    };

    const generateTimeSeriesData = (days, min, max) => {
        const data = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const value = Math.floor(Math.random() * (max - min + 1)) + min;
            data.push({
                date: date.toISOString().split('T')[0],
                value
            });
        }
        return data;
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const formatPercent = (value) => {
        return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
    };

    if (loading) {
        return (
            <div className="analytics-page">
                <div className="analytics-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading analytics data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="analytics-page">
            <div className="analytics-header">
                <h1>📊 Business Analytics</h1>
                <div className="analytics-controls">
                    <select 
                        value={timeRange} 
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="time-range-select"
                    >
                        <option value="7">Last 7 days</option>
                        <option value="30">Last 30 days</option>
                        <option value="90">Last 90 days</option>
                        <option value="365">Last year</option>
                    </select>
                    <button onClick={loadAnalytics} className="refresh-btn">
                        🔄 Refresh
                    </button>
                </div>
            </div>

            <div className="analytics-tabs">
                {['revenue', 'workOrders', 'patients', 'staff'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                    >
                        {tab === 'revenue' && '💰 Revenue'}
                        {tab === 'workOrders' && '📋 Work Orders'}
                        {tab === 'patients' && '👥 Patients'}
                        {tab === 'staff' && '👨‍💼 Staff'}
                    </button>
                ))}
            </div>

            <div className="analytics-content">
                {activeTab === 'revenue' && (
                    <div className="revenue-analytics">
                        <div className="analytics-summary">
                            <div className="summary-card">
                                <h3>Total Revenue</h3>
                                <div className="metric">
                                    {formatCurrency(analyticsData.revenue.total)}
                                </div>
                                <div className={`growth ${analyticsData.revenue.growth >= 0 ? 'positive' : 'negative'}`}>
                                    {formatPercent(analyticsData.revenue.growth)} vs previous period
                                </div>
                            </div>
                            <div className="summary-card">
                                <h3>Average Daily Revenue</h3>
                                <div className="metric">
                                    {formatCurrency(analyticsData.revenue.total / parseInt(timeRange))}
                                </div>
                            </div>
                            <div className="summary-card">
                                <h3>Total Orders</h3>
                                <div className="metric">
                                    {analyticsData.revenue.daily.reduce((sum, day) => sum + day.orders, 0)}
                                </div>
                            </div>
                        </div>

                        <div className="chart-container">
                            <h3>Revenue Trend</h3>
                            <div className="simple-chart">
                                {analyticsData.revenue.daily.map((day, index) => (
                                    <div key={day.date} className="chart-bar">
                                        <div 
                                            className="bar" 
                                            style={{ 
                                                height: `${(day.amount / Math.max(...analyticsData.revenue.daily.map(d => d.amount))) * 100}%` 
                                            }}
                                            title={`${day.date}: ${formatCurrency(day.amount)}`}
                                        ></div>
                                        <div className="bar-label">
                                            {new Date(day.date).getDate()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'workOrders' && (
                    <div className="workorders-analytics">
                        <div className="analytics-grid">
                            <div className="analytics-card">
                                <h3>Orders by Status</h3>
                                <div className="status-breakdown">
                                    {Object.entries(analyticsData.workOrders.byStatus).map(([status, count]) => (
                                        <div key={status} className="status-item">
                                            <span className={`status-badge ${status.toLowerCase()}`}>
                                                {status}
                                            </span>
                                            <span className="count">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="analytics-card">
                                <h3>Top Doctors</h3>
                                <div className="doctor-list">
                                    {Object.entries(analyticsData.workOrders.byDoctor)
                                        .sort((a, b) => b[1] - a[1])
                                        .slice(0, 5)
                                        .map(([doctor, count]) => (
                                            <div key={doctor} className="doctor-item">
                                                <span className="doctor-name">{doctor}</span>
                                                <span className="doctor-count">{count} orders</span>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            <div className="analytics-card">
                                <h3>Popular Procedures</h3>
                                <div className="procedure-list">
                                    {Object.entries(analyticsData.workOrders.byProcedure)
                                        .sort((a, b) => b[1] - a[1])
                                        .slice(0, 5)
                                        .map(([procedure, count]) => (
                                            <div key={procedure} className="procedure-item">
                                                <span className="procedure-name">{procedure}</span>
                                                <span className="procedure-count">{count}</span>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            <div className="analytics-card">
                                <h3>Performance Metrics</h3>
                                <div className="metrics-list">
                                    <div className="metric-item">
                                        <span>Average Completion Time</span>
                                        <span className="metric-value">
                                            {analyticsData.workOrders.avgTime} days
                                        </span>
                                    </div>
                                    <div className="metric-item">
                                        <span>Daily Average Orders</span>
                                        <span className="metric-value">
                                            {Math.round(Object.values(analyticsData.workOrders.byStatus).reduce((a, b) => a + b, 0) / parseInt(timeRange))}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'patients' && (
                    <div className="patients-analytics">
                        <div className="analytics-summary">
                            <div className="summary-card">
                                <h3>Patient Retention</h3>
                                <div className="metric">
                                    {analyticsData.patients.retention}%
                                </div>
                            </div>
                            <div className="summary-card">
                                <h3>New Patients</h3>
                                <div className="metric">
                                    {analyticsData.patients.newPatients.reduce((sum, day) => sum + day.value, 0)}
                                </div>
                            </div>
                            <div className="summary-card">
                                <h3>Returning Patients</h3>
                                <div className="metric">
                                    {analyticsData.patients.returningPatients.reduce((sum, day) => sum + day.value, 0)}
                                </div>
                            </div>
                        </div>

                        <div className="analytics-card">
                            <h3>Top Patients by Revenue</h3>
                            <div className="top-patients">
                                {analyticsData.patients.topPatients.map((patient, index) => (
                                    <div key={patient.name} className="patient-item">
                                        <div className="patient-rank">#{index + 1}</div>
                                        <div className="patient-info">
                                            <div className="patient-name">{patient.name}</div>
                                            <div className="patient-stats">
                                                {patient.orders} orders • {formatCurrency(patient.revenue)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'staff' && (
                    <div className="staff-analytics">
                        <div className="analytics-card">
                            <h3>Staff Productivity</h3>
                            <div className="staff-list">
                                {analyticsData.staff.productivity.map((staff, index) => (
                                    <div key={staff.name} className="staff-item">
                                        <div className="staff-info">
                                            <div className="staff-name">{staff.name}</div>
                                            <div className="staff-stats">
                                                <span>{staff.ordersCompleted} orders</span>
                                                <span>{staff.avgTime} days avg</span>
                                                <span className="efficiency">{staff.efficiency}% efficiency</span>
                                            </div>
                                        </div>
                                        <div className="efficiency-bar">
                                            <div 
                                                className="efficiency-fill" 
                                                style={{ width: `${staff.efficiency}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnalyticsPage;
