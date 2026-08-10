/* eslint-disable */
import './App.css';
import { Route, Routes } from 'react-router-dom';
// Auth pages
import LoginPage from './pages/auth/LoginPage';

// Admin pages
import AdminPage from './pages/admin/AdminPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagementPage from './pages/admin/UserManagementPage';
import AnalyticsPage from './pages/admin/AnalyticsPage';
import AuditLogPage from './pages/admin/AuditLogPage';
import SystemMonitorPage from './pages/admin/SystemMonitorPage';
import MonthlyBillingPage from './pages/admin/MonthlyBillingPage';

// Bill pages
import CreateBillPage from './pages/bills/CreateBillPage';

// Staff pages
import StaffDashboard from './pages/staff/StaffDashboard';

// Work order pages
import WorkOrderForm from './pages/work-orders/WorkOrderForm';
import WorkOrdersList from './pages/work-orders/WorkOrdersList';
import BatchWorkOrderForm from './pages/work-orders/BatchWorkOrderForm';

// Shared pages
import DiagnosticPage from './pages/shared/DiagnosticPage';

// Routes
import { PrivateRoute } from './routes/PrivateRoute';
import { AdminPrivateRoute } from './routes/AdminRoute';
import { StaffRoute } from './routes/StaffRoute';
import ProfessionalLayout from './components/Layout/ProfessionalLayout';
import RevisionPanelManager from './components/RevisionPanelManager';

function App() {
  return (
   <>
   <Routes>
    <Route path='/' element={
    <LoginPage /> 
    }>

    </Route>

    <Route path='/staff-dashboard' element={
    <StaffRoute>
      <ProfessionalLayout>
        <StaffDashboard /> 
      </ProfessionalLayout>
    </StaffRoute>
    }>
    </Route>

    <Route path='/admin-dashboard' element={
    <AdminPrivateRoute>
      <ProfessionalLayout>
        <AdminDashboard /> 
      </ProfessionalLayout>
    </AdminPrivateRoute>
    }>
    </Route>

    <Route path='/admin-page' element={
    
    <AdminPrivateRoute>
      <ProfessionalLayout>
        <AdminPage /> 
      </ProfessionalLayout>
    </AdminPrivateRoute>
    }>
    </Route>

    <Route path='/user-management' element={
    
    <AdminPrivateRoute>
      <ProfessionalLayout>
        <UserManagementPage /> 
      </ProfessionalLayout>
    </AdminPrivateRoute>
    }>
    </Route>

    <Route path='/work-order-form' element={
    <StaffRoute>
      <ProfessionalLayout>
        <WorkOrderForm /> 
      </ProfessionalLayout>
    </StaffRoute>
    }>
    </Route>

    <Route path='/batch-work-order' element={
    <StaffRoute>
      <ProfessionalLayout>
        <BatchWorkOrderForm /> 
      </ProfessionalLayout>
    </StaffRoute>
    }>
    </Route>

    <Route path='/work-orders-list' element={
    <StaffRoute>
      <ProfessionalLayout>
        <WorkOrdersList /> 
      </ProfessionalLayout>
    </StaffRoute>
    }>
    </Route>

    {/* Admin Work Order Routes with Enhanced Permissions */}
    <Route path='/admin/work-orders-list' element={
    <AdminPrivateRoute>
      <ProfessionalLayout>
        <WorkOrdersList isAdmin={true} /> 
      </ProfessionalLayout>
    </AdminPrivateRoute>
    }>
    </Route>

    <Route path='/admin/work-order-form' element={
    <AdminPrivateRoute>
      <ProfessionalLayout>
        <WorkOrderForm isAdmin={true} /> 
      </ProfessionalLayout>
    </AdminPrivateRoute>
    }>
    </Route>

    <Route path='/admin/batch-work-order' element={
    <AdminPrivateRoute>
      <ProfessionalLayout>
        <BatchWorkOrderForm isAdmin={true} /> 
      </ProfessionalLayout>
    </AdminPrivateRoute>
    }>
    </Route>

    <Route path='/create-bill' element={
    <StaffRoute>
      <ProfessionalLayout>
        <CreateBillPage /> 
      </ProfessionalLayout>
    </StaffRoute>
    }>
    </Route>

    <Route path='/admin/monthly-billing' element={
    <AdminPrivateRoute>
      <ProfessionalLayout>
        <MonthlyBillingPage /> 
      </ProfessionalLayout>
    </AdminPrivateRoute>
    }>
    </Route>

    <Route path='/staff/batch-work-order' element={
    <StaffRoute>
      <ProfessionalLayout>
        <BatchWorkOrderForm /> 
      </ProfessionalLayout>
    </StaffRoute>
    }>
    </Route>

    <Route path='/diagnostic' element={
    <StaffRoute>
      <ProfessionalLayout>
        <DiagnosticPage /> 
      </ProfessionalLayout>
    </StaffRoute>
    }>
    </Route>

    <Route path='/analytics' element={
    <AdminPrivateRoute>
      <ProfessionalLayout>
        <AnalyticsPage /> 
      </ProfessionalLayout>
    </AdminPrivateRoute>
    }>
    </Route>

    <Route path='/audit-log' element={
    <AdminPrivateRoute>
      <ProfessionalLayout>
        <AuditLogPage /> 
      </ProfessionalLayout>
    </AdminPrivateRoute>
    }>
    </Route>

    <Route path='/system-monitor' element={
    <AdminPrivateRoute>
      <ProfessionalLayout>
        <SystemMonitorPage /> 
      </ProfessionalLayout>
    </AdminPrivateRoute>
    }>
    </Route>

    <Route path='/*' element={<LoginPage /> }>

    </Route>


   </Routes>
  <RevisionPanelManager />
   </>
  );
}

export default App;
