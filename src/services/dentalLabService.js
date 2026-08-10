/* eslint-disable */
import { supabase } from '../supabase/supabaseClient';
import { authService } from './supabaseAuthService';

// Validation helpers for patient-tooth relationships
const validatePatientToothSelection = (patient_name, tooth_numbers) => {
    const errors = [];
    
    // Validate patient name
    if (!patient_name || typeof patient_name !== 'string' || patient_name.trim() === '') {
        errors.push('Patient name is required for tooth selection');
    }
    
    // Validate tooth numbers (optional - can be empty array)
    if (tooth_numbers && Array.isArray(tooth_numbers) && tooth_numbers.length > 0) {
        // Only validate tooth numbers if they are provided
        const invalidTeeth = tooth_numbers.filter(tooth => {
            const num = parseInt(tooth);
            return !(
                (num >= 11 && num <= 18) ||
                (num >= 21 && num <= 28) ||
                (num >= 31 && num <= 38) ||
                (num >= 41 && num <= 48)
            );
        });
        
        if (invalidTeeth.length > 0) {
            errors.push(`Invalid tooth numbers: ${invalidTeeth.join(', ')}. Please use FDI notation (11-18, 21-28, 31-38, 41-48)`);
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

const formatPatientToothSummary = (patient_name, tooth_numbers) => {
    if (!patient_name || !tooth_numbers || !Array.isArray(tooth_numbers)) {
        return 'No patient or tooth selection';
    }
    
    const sortedTeeth = [...tooth_numbers].sort((a, b) => a - b);
    return `${patient_name} → ${tooth_numbers.length} teeth: ${sortedTeeth.join(', ')}`;
};
const deleteWorkOrder = async (id, isAdminOverride = false) => {
    try {
        // Check user permissions
        const isAdmin = authService.isAdminOrSuperAdmin() || isAdminOverride;
        
        // First, check if the work order exists
        const { data: workOrder, error: fetchError } = await supabase
            .from('work_orders')
            .select('id, status, revision_count')
            .eq('id', id)
            .single();

        if (fetchError) {
            throw new Error(`Failed to fetch work order: ${fetchError.message}`);
        }

        if (!workOrder) {
            throw new Error('Work order not found');
        }

        // Staff can delete work orders ONLY if they are not completed
        if (!isAdmin) {
            if (workOrder.status === 'completed') {
                throw new Error('Cannot delete completed work order. Only administrators can delete completed orders.');
            }
            
            // Check if work order has been billed (additional protection)
            const { data: billData, error: billError } = await supabase
                .from('bills')
                .select('id')
                .eq('work_order_id', id)
                .limit(1);

            if (billError) {
                throw new Error(`Failed to check billing status: ${billError.message}`);
            }
            
            if (billData && billData.length > 0) {
                throw new Error('Cannot delete work order that has been billed. Contact administrator.');
            }
        }

        // Proceed with deletion
        const { error } = await supabase
            .from('work_orders')
            .delete()
            .eq('id', id);

        if (error) throw error;
        
        return { 
            success: true, 
            message: isAdmin ? 'Work order deleted by admin' : 'Work order deleted successfully'
        };
    } catch (error) {
        console.error('Delete work order error:', error);
        return { success: false, error: error.message };
    }
};

// Work Orders Management
const createWorkOrder = async (workOrderData) => {
    try {
        // Validate patient name and tooth numbers if provided
        const validation = validatePatientToothSelection(workOrderData.patient_name, workOrderData.tooth_numbers);
        if (!validation.isValid) {
            throw new Error(`Patient-tooth validation failed: ${validation.errors.join(', ')}`);
        }
        
        const userId = await authService.getUserId();
        if (!userId) {
            throw new Error('User not authenticated - no user ID found');
        }

        // ... (keep user ID validation)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        let validUserId = userId;
        if (!uuidRegex.test(userId)) {
            const fixedUserId = await authService.fixUserSession();
            if (!fixedUserId) {
                throw new Error('Invalid user session - please log out and log in again');
            }
            validUserId = fixedUserId;
        }

        // Clean up empty date strings - convert to null for database
        const cleanedData = {
            ...workOrderData,
            created_by: validUserId,
            completion_date: workOrderData.completion_date === '' ? null : workOrderData.completion_date,
            expected_complete_date: workOrderData.expected_complete_date === '' ? null : workOrderData.expected_complete_date,
            feedback: workOrderData.feedback === '' ? null : workOrderData.feedback,
            // --- FIX: Convert empty trial dates to null ---
            trial_date_1: workOrderData.trial_date_1 === '' ? null : workOrderData.trial_date_1,
            trial_date_2: workOrderData.trial_date_2 === '' ? null : workOrderData.trial_date_2
        };

        // ... (keep the rest of the function as is)
        // Allow manual serial_number/job number, fallback to auto-generation handled by DB
        if ('id' in cleanedData) {
            delete cleanedData.id;
        }

    // debug removed: cleaned work order data

        const { data, error } = await supabase
            .from('work_orders')
            .insert([cleanedData])
            .select()
            .single();

        if (error) {
            console.error('Supabase error details:', error);
            console.error('Error message:', error.message);
            console.error('Error details:', error.details);
            console.error('Error hint:', error.hint);
            console.error('Error code:', error.code);
            throw error;
        }
        return { data };
    } catch (error) {
        console.error('Create work order error:', error);
        return { error };
    }
};

const getAllWorkOrders = async () => {
    try {
        // Fetch all work orders using pagination to overcome Supabase 1000 row limit
        let allData = [];
        let hasMore = true;
        let from = 0;
        const limit = 1000;

        while (hasMore) {
            const { data, error } = await supabase
                .from('work_orders')
                .select('*')
                .order('created_at', { ascending: false })
                .range(from, from + limit - 1);

            if (error) throw error;

            if (data && data.length > 0) {
                allData = [...allData, ...data];
                from += limit;
                hasMore = data.length === limit; // Continue if we got a full batch
            } else {
                hasMore = false;
            }
        }

        return { data: allData };
    } catch (error) {
        console.error('Get work orders error:', error);
        return { error };
    }
};

const updateWorkOrder = async (id, updates, isAdminOverride = false) => {
    try {
        // Check if user has permission to edit
        const isAdmin = authService.isAdminOrSuperAdmin() || isAdminOverride;
        
        // Staff can now edit work orders (removed most restrictions)
        // Only basic validation remains for data integrity

        // Clean up empty date strings - convert to null for database
        const cleanedUpdates = { 
            ...updates,
            updated_at: new Date().toISOString()
        };
        
        if (cleanedUpdates.completion_date === '') cleanedUpdates.completion_date = null;
        if (cleanedUpdates.expected_complete_date === '') cleanedUpdates.expected_complete_date = null;
        if (cleanedUpdates.feedback === '') cleanedUpdates.feedback = null;
        if (cleanedUpdates.trial_date_1 === '') cleanedUpdates.trial_date_1 = null;
        if (cleanedUpdates.trial_date_2 === '') cleanedUpdates.trial_date_2 = null;

        // Remove fields that shouldn't be updated directly (except for admin override)
        if (!isAdmin) {
            delete cleanedUpdates.created_at;
            delete cleanedUpdates.created_by;
        }

        const { data, error } = await supabase
            .from('work_orders')
            .update(cleanedUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        
        return { 
            success: true,
            data,
            message: isAdmin ? 'Work order updated by admin' : 'Work order updated successfully'
        };
    } catch (error) {
        console.error('Update work order error:', error);
        return { success: false, error: error.message };
    }
};

const getWorkOrderBySerial = async (serialNumber) => {
    try {
        const { data, error } = await supabase
            .from('work_orders')
            .select('*')
            .eq('serial_number', serialNumber)
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Get work order by serial error:', error);
        return { success: false, error };
    }
};

const getWorkOrder = async (workOrderId) => {
    try {
        const { data, error } = await supabase
            .from('work_orders')
            .select('*')
            .eq('id', workOrderId)
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Get work order by ID error:', error);
        return { success: false, error };
    }
};

// Check if work order has existing bill
const checkWorkOrderHasBill = async (workOrderId) => {
    try {
    // debug removed: checking bill status
        
        // 🔁 Just get all bills for this work order (not limited to 1)
        const { data: regularBills, error: regularError } = await supabase
            .from('bills')
            .select('id, status, bill_date')
            .eq('work_order_id', workOrderId);

        if (regularError) {
            console.error('Error checking regular bill for work order:', workOrderId, regularError);
            throw regularError;
        }

    // debug removed: regular bills found

        if (regularBills && regularBills.length > 0) {
            // debug removed: individual bill
            return { 
                hasBill: true, 
                data: regularBills[0], // take the first for display
                billType: 'individual' 
            };
        }

        // Check for grouped bills (work order appears in bill_items)
        const { data: billItems, error: itemsError } = await supabase
            .from('bill_items')
            .select(`
                id, 
                bill_id,
                bills!inner(id, status, bill_date, is_grouped)
            `)
            .eq('work_order_id', workOrderId);

        if (itemsError) {
            console.error('Error checking bill items for work order:', workOrderId, itemsError);
            throw itemsError;
        }

    // debug removed: bill items found

        if (billItems && billItems.length > 0) {
            // debug removed: grouped bill
            return { 
                hasBill: true, 
                data: billItems[0].bills, 
                billType: 'grouped' 
            };
        }

    // debug removed: no bills found
        return { 
            hasBill: false, 
            data: null 
        };
    } catch (error) {
        console.error('Check work order bill error:', error);
        return { error };
    }
};


// Bills Management
const createBill = async (billData) => {
    try {
        // Debug: Check authentication
        const userId = await authService.getUserId();
        const userRole = authService.getUserRole();
    // debug removed: creating bill with user
        
        if (!userId) {
            throw new Error('User not authenticated - no user ID found');
        }

        // DUPLICATE CHECK: Ensure this work order doesn't already have a bill
        if (billData.work_order_id) {
            // debug removed: checking for existing bills
            const existingBillCheck = await checkWorkOrderHasBill(billData.work_order_id);
            if (existingBillCheck.hasBill) {
                throw new Error(`Work order already has a bill (ID: ${existingBillCheck.data.id}). Cannot create duplicate bill.`);
            }
        }

        // Clean up empty date strings and ensure proper JSON formatting
        const cleanedData = {
            ...billData,
            created_by: userId,
            completion_date: billData.completion_date === '' ? null : billData.completion_date,
            bill_date: billData.bill_date === '' ? null : billData.bill_date,
            notes: billData.notes === '' ? null : billData.notes
        };

    // debug removed: cleaned bill data

        const { data, error } = await supabase
            .from('bills')
            .insert([cleanedData])
            .select()
            .single();

        if (error) {
            console.error('Supabase error details:', error);
            throw error;
        }
        return { data };
    } catch (error) {
        console.error('Create bill error:', error);
        return { error };
    }
};
const normalizeDoctorName = (name) => {
    if (!name) return '';
    return name
        .replace(/^(dr\.?|doctor)\s+/i, '') // Remove prefixes like "Dr."
        .trim() // Remove leading/trailing whitespace
        .toLowerCase(); // Convert to lowercase
};

const createGroupedBill = async (groupedBillData) => {
    try {
        // Debug: Check authentication
        const userId = await authService.getUserId();
        const userRole = authService.getUserRole();
    // debug removed: creating grouped bill with user
        
        if (!userId) {
            throw new Error('User not authenticated - no user ID found');
        }

        // Validate userId is a proper UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        let validUserId = userId;
        if (!uuidRegex.test(userId)) {
            console.error('Invalid user ID format:', userId, 'attempting to fix...');
            const fixedUserId = await authService.fixUserSession();
            if (!fixedUserId) {
                throw new Error('Invalid user session - please log out and log in again');
            }
            validUserId = fixedUserId;
            // debug removed: user session fixed
        }

        const { work_order_ids, doctor_name, notes, tooth_numbers, is_grouped = true, batch_id } = groupedBillData;
        
        if (!work_order_ids || work_order_ids.length === 0) {
            throw new Error('No work orders selected for bill');
        }

    // debug removed: creating grouped bill for work orders

        // Get work order details for validation and bill items
        const { data: workOrders, error: fetchError } = await supabase
            .from('work_orders')
            .select('*')
            .in('id', work_order_ids);

        if (fetchError) throw fetchError;

        if (workOrders.length !== work_order_ids.length) {
            throw new Error('Some work orders not found');
        }

        // ENHANCED DUPLICATE CHECK: Ensure none of these work orders already have bills
        // This also handles race conditions from multiple devices/tabs
    // debug removed: checking existing grouped bills
        
        // Check individual bills first
        const { data: existingIndividualBills, error: individualError } = await supabase
            .from('bills')
            .select('id, work_order_id, serial_number, is_grouped')
            .in('work_order_id', work_order_ids)
            .eq('is_grouped', false);
            
        if (individualError) throw individualError;
        
        if (existingIndividualBills && existingIndividualBills.length > 0) {
            const duplicates = existingIndividualBills.map(bill => bill.serial_number).join(', ');
            throw new Error(`Work orders already have individual bills: ${duplicates}. Cannot create duplicate grouped bill.`);
        }
        
        // Check if any work orders are already in grouped bills
        const { data: existingBillItems, error: billItemsError } = await supabase
            .from('bill_items')
            .select('work_order_id, bill_id, bills!inner(serial_number, is_grouped)')
            .in('work_order_id', work_order_ids);
            
        if (billItemsError) throw billItemsError;
        
        if (existingBillItems && existingBillItems.length > 0) {
            const duplicateWorkOrders = existingBillItems.map(item => {
                const workOrder = workOrders.find(wo => wo.id === item.work_order_id);
                return workOrder?.serial_number || item.work_order_id;
            }).join(', ');
            throw new Error(`Work orders already exist in other grouped bills: ${duplicateWorkOrders}. Cannot create duplicate grouped bill.`);
        }

        // Validate all orders are completed with completion dates
        const incompletedOrders = workOrders.filter(o => o.status !== 'completed' || !o.completion_date);
        if (incompletedOrders.length > 0) {
            throw new Error(`Cannot create bill for incomplete work orders: ${incompletedOrders.map(o => o.serial_number).join(', ')}`);
        }

        // Validate all orders are from the same doctor
 const uniqueDoctors = [...new Set(workOrders.map(o => normalizeDoctorName(o.doctor_name)))];
        if (uniqueDoctors.length > 1) {
            const originalDoctorNames = [...new Set(workOrders.map(o => o.doctor_name.trim()))];
            throw new Error(`All work orders must be from the same doctor. Found: ${originalDoctorNames.join(', ')}`);
        }

        // Create the main bill
        const billData = {
            work_order_id: null, // For grouped bills, individual work orders are in bill_items
            doctor_name: doctor_name || workOrders[0].doctor_name,
            patient_name: workOrders.length > 1 ? 'Multiple Patients' : workOrders[0].patient_name,
            serial_number: workOrders.map(o => o.serial_number).join(', '),
            work_description: workOrders.length > 1 
                ? `Grouped bill for ${workOrders.length} work orders: ${workOrders.map(o => `${o.product_quality}${o.product_shade ? ' - ' + o.product_shade : ''}`).join(', ')}`
                : `${workOrders[0].product_quality}${workOrders[0].product_shade ? ' - ' + workOrders[0].product_shade : ''}`,
            bill_date: new Date().toISOString().split('T')[0],
            completion_date: workOrders.map(o => new Date(o.completion_date)).sort((a, b) => b - a)[0].toISOString().split('T')[0], // Latest completion date
            status: 'pending',
            amount: 0, // Will be calculated from items
            notes: notes || '',
            tooth_numbers: Array.isArray(tooth_numbers) ? tooth_numbers : [], // Ensure tooth_numbers is always an array
            created_by: validUserId,
            is_grouped: is_grouped,
            group_id: is_grouped ? crypto.randomUUID() : null,
            batch_id: batch_id || null // Include batch_id if provided
        };

    // debug removed: bill data to insert

        const { data: bill, error: billError } = await supabase
            .from('bills')
            .insert([billData])
            .select()
            .single();

        if (billError) {
            console.error('Bill creation error:', billError);
            throw billError;
        }

    // debug removed: bill created

        // Create bill items for each work order
        const billItems = workOrders.map(order => ({
            bill_id: bill.id,
            work_order_id: order.id,
            item_description: `${order.product_quality}${order.product_shade ? ' - ' + order.product_shade : ''} for ${order.patient_name}`,
            serial_number: order.serial_number,
            product_quality: order.product_quality,
            product_shade: order.product_shade,
            quantity: 1,
            unit_price: 0, // To be set by admin
            total_price: 0, // To be calculated
            notes: order.feedback || null
        }));

    // debug removed: creating bill items
        
        const { data: items, error: itemsError } = await supabase
            .from('bill_items')
            .insert(billItems)
            .select();

        if (itemsError) {
            console.error('Bill items creation error:', itemsError);
            console.error('Bill items data that failed:', billItems);
            throw itemsError;
        }

    // debug removed: bill items created

        return { 
            success: true, 
            data: { 
                bill, 
                items,
                message: `Grouped bill created successfully with ${workOrders.length} work orders` 
            } 
        };

    } catch (error) {
        console.error('Create grouped bill error:', error);
        return { success: false, error: error.message };
    }
};

const getAllBills = async () => {
    try {
        const userRole = authService.getUserRole();
        
        // For staff, select without amount (sensitive info)
        const selectFields = userRole === 'ADMIN' 
            ? '*' 
            : 'id, work_order_id, doctor_name, patient_name, work_description, serial_number, completion_date, bill_date, status, created_at, updated_at, is_grouped, batch_id, tooth_numbers, notes';
        
        // Fetch all bills using pagination to overcome Supabase 1000 row limit
        let allData = [];
        let hasMore = true;
        let from = 0;
        const limit = 1000;

        while (hasMore) {
            const { data, error } = await supabase
                .from('bills')
                .select(selectFields)
                .order('created_at', { ascending: false })
                .range(from, from + limit - 1);

            if (error) throw error;

            if (data && data.length > 0) {
                allData = [...allData, ...data];
                from += limit;
                hasMore = data.length === limit; // Continue if we got a full batch
            } else {
                hasMore = false;
            }
        }

        return { data: allData };
    } catch (error) {
        console.error('Get bills error:', error);
        return { error };
    }
};

// Get bills created by the current user (for staff)
const getMyBills = async () => {
    try {
        const userId = await authService.getUserId();
        if (!userId) {
            throw new Error('User not authenticated');
        }

        // Staff can see all bill details except amount
        const selectFields = 'id, work_order_id, doctor_name, patient_name, work_description, serial_number, completion_date, bill_date, status, created_at, updated_at, is_grouped, batch_id, tooth_numbers, notes';
        
        // Fetch all user bills using pagination to overcome Supabase 1000 row limit
        let allData = [];
        let hasMore = true;
        let from = 0;
        const limit = 1000;

        while (hasMore) {
            const { data, error } = await supabase
                .from('bills')
                .select(selectFields)
                .eq('created_by', userId)
                .order('created_at', { ascending: false })
                .range(from, from + limit - 1);

            if (error) throw error;

            if (data && data.length > 0) {
                allData = [...allData, ...data];
                from += limit;
                hasMore = data.length === limit; // Continue if we got a full batch
            } else {
                hasMore = false;
            }
        }

        return { data: allData };
    } catch (error) {
        console.error('Get my bills error:', error);
        return { error };
    }
};

const updateBillAmount = async (id, amount) => {
    try {
        // Get the current user ID with proper error handling
        const userId = await authService.getUserId();
        if (!userId) {
            throw new Error('User not authenticated');
        }

        // Check if user is admin (only admins should update bill amounts)
        if (!authService.isAdminOrSuperAdmin()) {
            throw new Error('Access denied. Only administrators can update bill amounts.');
        }

        // Validate amount
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            throw new Error('Invalid amount. Amount must be a positive number.');
        }

        // First, get the current bill data to preserve tooth_numbers
        const { data: currentBill, error: fetchError } = await supabase
            .from('bills')
            .select('tooth_numbers, status')
            .eq('id', id)
            .single();
            
        if (fetchError) {
            console.error('Error fetching current bill:', fetchError);
            if (fetchError.code === 'PGRST116') {
                throw new Error('Bill not found');
            }
            throw fetchError;
        }
        
        // Ensure tooth_numbers is properly formatted as an array
        const tooth_numbers = Array.isArray(currentBill.tooth_numbers) ? currentBill.tooth_numbers : [];
        
    // debug removed: updating bill amount
        
        const { data, error } = await supabase
            .from('bills')
            .update({ 
                amount: parsedAmount,
                status: 'priced',
                priced_by: userId,
                tooth_numbers, // Include tooth_numbers to ensure it's always a valid array
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating bill:', error);
            throw error;
        }
        
    // debug removed: bill updated
        return { data };
    } catch (error) {
        console.error('Update bill amount error:', error);
        return { error: error.message || error };
    }
};

const updateBillStatus = async (id, status) => {
    try {
        // Get the current user ID with proper error handling
        const userId = await authService.getUserId();
        if (!userId) {
            throw new Error('User not authenticated');
        }

        // Check if user is admin (only admins should update bill status)
        if (!authService.isAdminOrSuperAdmin()) {
            throw new Error('Access denied. Only administrators can update bill status.');
        }

        // Validate status
        const validStatuses = ['pending', 'priced', 'printed', 'sent'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }

        const { data, error } = await supabase
            .from('bills')
            .update({ 
                status: status,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating bill status:', error);
            throw error;
        }
        
    // debug removed: bill status updated
        return { data };
    } catch (error) {
        console.error('Update bill status error:', error);
        return { error: error.message };
    }
};

// Mark bill as printed - available to both admin and staff
const markBillAsPrinted = async (id) => {
    try {
        // Get the current user ID with proper error handling
        const userId = await authService.getUserId();
        if (!userId) {
            throw new Error('User not authenticated');
        }

        const { data, error } = await supabase
            .from('bills')
            .update({ 
                status: 'printed',
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error marking bill as printed:', error);
            throw error;
        }
        
        console.log('Bill marked as printed successfully:', data);
        return { data };
    } catch (error) {
        console.error('Mark bill as printed error:', error);
        return { error: error.message };
    }
};

const getBillsByDateRange = async (startDate, endDate) => {
    try {
        const userRole = authService.getUserRole();
        
        const selectFields = userRole === 'ADMIN' 
            ? '*' 
            : 'id, work_order_id, doctor_name, patient_name, work_description, serial_number, completion_date, bill_date, status, created_at, updated_at, tooth_numbers, notes';
        
        const { data, error } = await supabase
            .from('bills')
            .select(selectFields)
            .gte('bill_date', startDate)
            .lte('bill_date', endDate)
            .order('bill_date', { ascending: false });

        if (error) throw error;
        return { data };
    } catch (error) {
        console.error('Get bills by date range error:', error);
        return { error };
    }
};

const getBillsStats = async () => {
    try {
        const { data, error } = await supabase
            .from('bills')
            .select('bill_date, status, amount')
            .order('bill_date', { ascending: false });

        if (error) throw error;

        // Group by date and calculate stats
        const statsMap = {};
        data.forEach(bill => {
            const date = bill.bill_date;
            if (!statsMap[date]) {
                statsMap[date] = {
                    date,
                    total_bills: 0,
                    pending_bills: 0,
                    priced_bills: 0,
                    total_amount: 0
                };
            }
            
            statsMap[date].total_bills++;
            if (bill.status === 'pending') statsMap[date].pending_bills++;
            if (bill.status === 'priced' || bill.status === 'printed' || bill.status === 'sent') {
                statsMap[date].priced_bills++;
                if (bill.amount) statsMap[date].total_amount += parseFloat(bill.amount);
            }
        });

        const stats = Object.values(statsMap);
        return { data: stats };
    } catch (error) {
        console.error('Get bills stats error:', error);
        return { error };
    }
};

const getBillWithItems = async (billId) => {
    try {
        // Get bill details
        const { data: bill, error: billError } = await supabase
            .from('bills')
            .select('*')
            .eq('id', billId)
            .single();

        if (billError) throw billError;

        // Get bill items
        const { data: items, error: itemsError } = await supabase
            .from('bill_items')
            .select(`
                *,
                work_orders:work_order_id (
                    patient_name,
                    order_date,
                    completion_date,
                    expected_complete_date,
                    tooth_numbers,
                    product_quality,
                    product_shade
                )
            `)
            .eq('bill_id', billId);

        if (itemsError) throw itemsError;

        return { 
            success: true, 
            data: { 
                ...bill, 
                items: items || [] 
            } 
        };

    } catch (error) {
        console.error('Get bill with items error:', error);
        return { success: false, error: error.message };
    }
};

const updateBillItemPrice = async (itemId, unitPrice) => {
    try {
        const { data: item, error: updateError } = await supabase
            .from('bill_items')
            .update({ 
                unit_price: unitPrice,
                total_price: unitPrice * 1 // quantity is always 1 for now
            })
            .eq('id', itemId)
            .select()
            .single();

        if (updateError) throw updateError;

        return { success: true, data: item };

    } catch (error) {
        console.error('Update bill item price error:', error);
        return { success: false, error: error.message };
    }
};

// Get work orders with batch information
const getWorkOrdersWithBatchInfo = async () => {
    try {
        console.log('Fetching work orders directly from the main table to ensure all data is included...');
        
        // Bypassing the faulty 'work_orders_with_batch_info' view and fetching from the source table.
        let workOrders = [];
        let hasMore = true;
        let from = 0;
        const limit = 1000;

        while (hasMore) {
            const { data, error } = await supabase
                .from('work_orders')
                .select('*')
                .order('created_at', { ascending: false })
                .range(from, from + limit - 1);

            if (error) {
                console.error('Supabase error fetching work orders:', error);
                return { data: null, error };
            }

            if (data && data.length > 0) {
                workOrders = [...workOrders, ...data];
                from += limit;
                hasMore = data.length === limit;
            } else {
                hasMore = false;
            }
        }

        if (workOrders.length === 0) {
            console.log('No work orders found.');
            return { data: [], error: null };
        }

        // Manually add batch information, since we are not using the view
        const workOrdersWithBatchInfo = workOrders.map(order => ({
            ...order,
            batch_size: order.batch_id 
                ? workOrders.filter(wo => wo.batch_id === order.batch_id).length 
                : 1,
            batch_patients: order.batch_id 
                ? [...new Set(workOrders
                    .filter(wo => wo.batch_id === order.batch_id)
                    .map(wo => wo.patient_name))]
                    .sort()
                    .join(', ') 
                : order.patient_name
        }));

        console.log('Work orders with manual batch info calculated:', workOrdersWithBatchInfo.length);
        
        // Let's verify a sample to be sure
        if (workOrdersWithBatchInfo.length > 0) {
            console.log('Sample work order after processing:', workOrdersWithBatchInfo[0]);
        }

        return { data: workOrdersWithBatchInfo, error: null };

    } catch (error) {
        console.error('Error fetching work orders with batch info:', error);
        return { data: null, error };
    }
};

// Get all work orders in a specific batch
const getBatchWorkOrders = async (batchId) => {
    try {
        console.log('Fetching batch work orders for batch:', batchId);
        
        // Try using the stored function first, fall back to direct query
        let { data, error } = await supabase
            .rpc('get_batch_work_orders', { batch_id_param: batchId });

        if (error && error.message.includes('does not exist')) {
            console.log('Batch function not found, using direct query...');
            // Fall back to direct query
            const response = await supabase
                .from('work_orders')
                .select('*')
                .eq('batch_id', batchId)
                .order('created_at', { ascending: true });
            
            if (response.error) {
                console.error('Supabase error fetching batch work orders:', response.error);
                return { data: null, error: response.error };
            }
            
            data = response.data;
            error = null;
        }

        if (error) {
            console.error('Supabase error fetching batch work orders:', error);
            return { data: null, error };
        }

        console.log('Batch work orders fetched successfully:', data.length);
        return { data, error: null };
    } catch (error) {
        console.error('Error fetching batch work orders:', error);
        return { data: null, error };
    }
};

// Check if a batch can be billed together
const canBatchBeBilled = async (batchId) => {
    try {
        console.log('Checking if batch can be billed:', batchId);
        
        // Try using the stored function first, fall back to manual calculation
        let { data, error } = await supabase
            .rpc('can_batch_be_billed', { batch_id_param: batchId });

        if (error && error.message.includes('does not exist')) {
            console.log('Batch function not found, using manual calculation...');
            
            // Manual calculation
            // Get all orders in batch
            const ordersResponse = await supabase
                .from('work_orders')
                .select('id, status')
                .eq('batch_id', batchId);
            
            if (ordersResponse.error) {
                console.error('Error fetching batch orders:', ordersResponse.error);
                return { data: false, error: ordersResponse.error };
            }

            const orders = ordersResponse.data;
            const totalOrders = orders.length;
            const completedOrders = orders.filter(o => o.status === 'completed').length;

            // Check if any orders already have bills
            const billsResponse = await supabase
                .from('bills')
                .select('work_order_id')
                .in('work_order_id', orders.map(o => o.id));
            
            if (billsResponse.error) {
                console.error('Error checking existing bills:', billsResponse.error);
                return { data: false, error: billsResponse.error };
            }

            const billedOrders = billsResponse.data.length;
            const canBeBilled = totalOrders > 0 && completedOrders === totalOrders && billedOrders === 0;
            
            console.log('Manual batch billing check:', { totalOrders, completedOrders, billedOrders, canBeBilled });
            return { data: canBeBilled, error: null };
        }

        if (error) {
            console.error('Supabase error checking batch billing:', error);
            return { data: false, error };
        }

        console.log('Batch billing check result:', data);
        return { data, error: null };
    } catch (error) {
        console.error('Error checking batch billing:', error);
        return { data: false, error };
    }
};

// Get work orders associated with a bill (for grouped bills)
const getBillWorkOrders = async (billId) => {
    try {
        console.log('Getting work orders for bill:', billId);
        
        // First get the bill to understand its type
        const { data: bill, error: billError } = await supabase
            .from('bills')
            .select('batch_id, is_grouped, work_order_id')
            .eq('id', billId)
            .single();
            
        if (billError) {
            console.error('Error fetching bill:', billError);
            return { data: [], error: billError };
        }
        
        console.log('Bill data:', bill);
        
        // Method 1: Try to get work orders through bill_items (for grouped bills)
        if (bill.is_grouped) {
            console.log('This is a grouped bill, trying to get work orders through bill_items...');
            const { data: billItems, error: itemsError } = await supabase
                .from('bill_items')
                .select(`
                    work_order_id,
                    work_orders!inner(*)
                `)
                .eq('bill_id', billId);
                
            if (!itemsError && billItems && billItems.length > 0) {
                const workOrders = billItems.map(item => item.work_orders);
                console.log(`Found ${workOrders.length} work orders from bill items for bill ${billId}`);
                return { data: workOrders };
            } else {
                console.log('No bill items found or error:', itemsError);
            }
        }
        
        // Method 2: For individual bills, get the single work order
        if (bill.work_order_id) {
            console.log('Getting single work order for bill:', bill.work_order_id);
            const { data: singleOrder, error: singleError } = await supabase
                .from('work_orders')
                .select('*')
                .eq('id', bill.work_order_id)
                .single();
                
            if (singleError) {
                console.error('Error fetching single work order:', singleError);
                return { data: [], error: singleError };
            }
            
            console.log('Found single work order:', singleOrder);
            return { data: [singleOrder] };
        }
        
        // Method 3: For grouped bills with batch_id, get all work orders in the batch
        if (bill.is_grouped && bill.batch_id) {
            console.log('Getting batch work orders for batch_id:', bill.batch_id);
            const { data: batchOrders, error: batchError } = await supabase
                .from('work_orders')
                .select('*')
                .eq('batch_id', bill.batch_id)
                .order('order_date', { ascending: true });
                
            if (batchError) {
                console.error('Error fetching batch work orders:', batchError);
                return { data: [], error: batchError };
            }
            
            console.log(`Found ${batchOrders?.length || 0} work orders for batch ${bill.batch_id}`);
            return { data: batchOrders || [] };
        }
        
        console.log('No work orders found for bill', billId);
        return { data: [] };
        
    } catch (error) {
        console.error('Error in getBillWorkOrders:', error);
        return { data: [], error: error };
    }
};

// Update work order amount - admin only
const updateWorkOrderAmount = async (id, amount) => {
    try {
        const userId = await authService.getUserId();
        if (!userId) {
            throw new Error('User not authenticated');
        }

        // Check if user is admin
        if (!authService.isAdminOrSuperAdmin()) {
            throw new Error('Access denied. Only administrators can update work order amounts.');
        }

        // Validate amount
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            throw new Error('Invalid amount. Amount must be a positive number.');
        }

        const { data, error } = await supabase
            .from('work_orders')
            .update({ 
                amount: parsedAmount,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating work order amount:', error);
            
            // Handle the case where amount column doesn't exist yet
            if (error.message && error.message.includes("Could not find the 'amount' column")) {
                throw new Error('The amount column is missing from the work_orders table. Please run the database migration: add_amount_column_to_work_orders.sql');
            }
            
            throw error;
        }
        
        console.log('Work order amount updated successfully:', data);
        return { data };
    } catch (error) {
        console.error('Update work order amount error:', error);
        return { error: error.message || error };
    }
};

// Update work order rate and amount - admin only
const updateWorkOrderPricing = async (id, rate, amount) => {
    try {
        const userId = await authService.getUserId();
        if (!userId) {
            throw new Error('User not authenticated');
        }

        // Check if user is admin
        if (!authService.isAdminOrSuperAdmin()) {
            throw new Error('Access denied. Only administrators can update work order pricing.');
        }

        // Validate rate and amount
        const parsedRate = rate ? parseFloat(rate) : null;
        const parsedAmount = amount ? parseFloat(amount) : null;
        
        if (parsedRate !== null && (isNaN(parsedRate) || parsedRate <= 0)) {
            throw new Error('Invalid rate. Rate must be a positive number.');
        }
        
        if (parsedAmount !== null && (isNaN(parsedAmount) || parsedAmount <= 0)) {
            throw new Error('Invalid amount. Amount must be a positive number.');
        }

        const updateData = {
            updated_at: new Date().toISOString()
        };
        
        if (parsedRate !== null) updateData.rate = parsedRate;
        if (parsedAmount !== null) updateData.amount = parsedAmount;

        const { data, error } = await supabase
            .from('work_orders')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating work order pricing:', error);
            
            // Handle the case where columns don't exist yet
            if (error.message && (error.message.includes("Could not find the 'amount' column") || error.message.includes("Could not find the 'rate' column"))) {
                throw new Error('The amount/rate columns are missing from the work_orders table. Please run the database migration: add_amount_column_to_work_orders.sql');
            }
            
            throw error;
        }
        
        console.log('Work order pricing updated successfully:', data);
        return { data };
    } catch (error) {
        console.error('Update work order pricing error:', error);
        return { error: error.message || error };
    }
};

// Monthly Bills History Management
const saveMonthlyBillHistory = async (billData) => {
    try {
        console.log('Saving monthly bill history:', billData);
        
        const userId = await authService.getUserId();
        const userEmail = authService.getUserEmail();
        
        // Extract month and year
        const [year, month] = billData.month.split('-');
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const monthName = monthNames[parseInt(month) - 1];
        
        const historyRecord = {
            doctor_name: billData.doctor_name,
            billing_month: billData.month,
            billing_year: parseInt(year),
            billing_month_name: monthName,
            work_orders_count: billData.work_orders.length,
            total_amount: billData.total_amount,
            work_order_ids: billData.work_orders.map(order => order.id),
            generated_by: userEmail || 'admin',
            bill_data: billData // Store complete data for regeneration
        };
        
        // Insert or update the record
        const { data, error } = await supabase
            .from('monthly_bills_history')
            .upsert(historyRecord, { 
                onConflict: 'doctor_name,billing_month',
                returning: 'minimal' 
            });
        
        if (error) {
            console.error('Error saving monthly bill history:', error);
            throw error;
        }
        
        console.log('Monthly bill history saved successfully');
        return { data, error: null };
    } catch (error) {
        console.error('Error in saveMonthlyBillHistory:', error);
        return { data: null, error: error.message };
    }
};

const getMonthlyBillsHistory = async () => {
    try {
        const { data, error } = await supabase
            .from('monthly_bills_history')
            .select('*')
            .order('generated_at', { ascending: false });
        
        if (error) {
            console.error('Error fetching monthly bills history:', error);
            throw error;
        }
        
        return { data, error: null };
    } catch (error) {
        console.error('Error in getMonthlyBillsHistory:', error);
        return { data: null, error: error.message };
    }
};

const getMonthlyBillById = async (billId) => {
    try {
        const { data, error } = await supabase
            .from('monthly_bills_history')
            .select('*')
            .eq('id', billId)
            .single();
        
        if (error) {
            console.error('Error fetching monthly bill:', error);
            throw error;
        }
        
        return { data, error: null };
    } catch (error) {
        console.error('Error in getMonthlyBillById:', error);
        return { data: null, error: error.message };
    }
};

const regenerateMonthlyBill = async (billId) => {
    try {
        const { data, error } = await supabase
            .from('monthly_bills_history')
            .select('bill_data')
            .eq('id', billId)
            .single();
        
        if (error) {
            console.error('Error fetching bill data for regeneration:', error);
            throw error;
        }
        
        return { data: data.bill_data, error: null };
    } catch (error) {
        console.error('Error in regenerateMonthlyBill:', error);
        return { data: null, error: error.message };
    }
};

const getMonthlyBillsStats = async () => {
    try {
        const { data, error } = await supabase
            .from('monthly_bills_history')
            .select('billing_month, total_amount, work_orders_count');
        
        if (error) {
            console.error('Error fetching monthly bills stats:', error);
            throw error;
        }
        
        // Calculate stats
        const currentMonth = new Date().toISOString().slice(0, 7);
        const currentMonthBills = data.filter(bill => bill.billing_month === currentMonth);
        
        const stats = {
            totalCompletedBills: data.length,
            currentMonthBills: currentMonthBills.length,
            currentMonthRevenue: currentMonthBills.reduce((sum, bill) => sum + parseFloat(bill.total_amount || 0), 0),
            totalRevenue: data.reduce((sum, bill) => sum + parseFloat(bill.total_amount || 0), 0),
            totalOrdersBilled: data.reduce((sum, bill) => sum + parseInt(bill.work_orders_count || 0), 0)
        };
        
        return { data: stats, error: null };
    } catch (error) {
        console.error('Error in getMonthlyBillsStats:', error);
        return { data: null, error: error.message };
    }
};

// Return/Revision System
const returnWorkOrder = async (workOrderId, returnData) => {
    try {
        const userId = await authService.getUserId();
        console.log('Returning work order:', { workOrderId, returnData, userId });

        if (!userId) {
            throw new Error('User not authenticated');
        }

        // Call the database function to handle the return
        const { data, error } = await supabase.rpc('handle_work_order_return', {
            p_work_order_id: workOrderId,
            p_return_reason: returnData.reason,
            p_revision_notes: returnData.notes || null,
            p_new_expected_date: returnData.expectedDate || null,
            p_user_id: userId
        });

        if (error) {
            console.error('Error returning work order:', error);
            throw error;
        }

        console.log('Work order returned successfully:', data);
        
        // Check if the database function returned success
        if (data && data.success === false) {
            throw new Error(data.error || 'Database function returned failure');
        }
        
        return { success: true, data };
    } catch (error) {
        console.error('Error in returnWorkOrder:', error);
        return { success: false, error: error.message };
    }
};

const completeRevision = async (workOrderId, completionDate = null) => {
    try {
        const userId = await authService.getUserId();
        console.log('Completing revision:', { workOrderId, completionDate, userId });

        if (!userId) {
            throw new Error('User not authenticated');
        }

        // Call the database function to complete the revision
        const { data, error } = await supabase.rpc('complete_work_order_revision', {
            p_work_order_id: workOrderId,
            p_completion_date: completionDate || new Date().toISOString().split('T')[0],
            p_user_id: userId
        });

        if (error) {
            console.error('Error completing revision:', error);
            throw error;
        }

        console.log('Revision completed successfully:', data);
        
        // Check if the database function returned success
        if (data && data.success === false) {
            throw new Error(data.error || 'Database function returned failure');
        }
        
        return { success: true, data };
    } catch (error) {
        console.error('Error in completeRevision:', error);
        return { success: false, error: error.message };
    }
};

const getRevisionHistory = async (workOrderId) => {
    try {
        const { data, error } = await supabase
            .from('revision_history')
            .select('*')
            .eq('work_order_id', workOrderId)
            .order('revision_number', { ascending: true });

        if (error) {
            console.error('Error fetching revision history:', error);
            throw error;
        }

        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error in getRevisionHistory:', error);
        return { success: false, error: error.message };
    }
};

const getRevisionAnalytics = async () => {
    try {
        const { data, error } = await supabase
            .from('work_order_revision_analytics')
            .select('*')
            .order('revision_percentage', { ascending: false });

        if (error) {
            console.error('Error fetching revision analytics:', error);
            throw error;
        }

        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error in getRevisionAnalytics:', error);
        return { success: false, error: error.message };
    }
};

// Get work orders that need revision (returned status)
const getWorkOrdersNeedingRevision = async () => {
    try {
        const { data, error } = await supabase
            .from('work_orders')
            .select('*')
            .in('status', ['returned', 'revision_in_progress'])
            .order('return_date', { ascending: true });

        if (error) {
            console.error('Error fetching work orders needing revision:', error);
            throw error;
        }

        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error in getWorkOrdersNeedingRevision:', error);
        return { success: false, error: error.message };
    }
};

// Trial Management
const createTrial = async (trialData) => {
    try {
        const userId = await authService.getUserId();
        console.log('Creating trial:', { trialData, userId });

        if (!userId) {
            throw new Error('User not authenticated');
        }

        const { data, error } = await supabase
            .from('trials')
            .insert([trialData])
            .select()
            .single();

        if (error) {
            console.error('Error creating trial:', error);
            throw error;
        }

        return { success: true, data };
    } catch (error) {
        console.error('Error in createTrial:', error);
        return { success: false, error: error.message };
    }
};

const getTrialsByWorkOrder = async (workOrderId) => {
    try {
        const { data, error } = await supabase
            .from('trials')
            .select('*')
            .eq('work_order_id', workOrderId)
            .order('trial_date', { ascending: true });

        if (error) {
            console.error('Error fetching trials:', error);
            throw error;
        }

        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error in getTrialsByWorkOrder:', error);
        return { success: false, error: error.message };
    }
};

const updateTrial = async (trialId, trialData) => {
    try {
        const userId = await authService.getUserId();
        console.log('Updating trial:', { trialId, trialData, userId });

        if (!userId) {
            throw new Error('User not authenticated');
        }

        const { data, error } = await supabase
            .from('trials')
            .update(trialData)
            .eq('id', trialId)
            .select()
            .single();

        if (error) {
            console.error('Error updating trial:', error);
            throw error;
        }

        return { success: true, data };
    } catch (error) {
        console.error('Error in updateTrial:', error);
        return { success: false, error: error.message };
    }
};

const toggleUrgentStatus = async (id, currentStatus) => {
    try {
        const { data, error } = await supabase
            .from('work_orders')
            .update({ is_urgent: !currentStatus })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error toggling urgent status:', error);
        return { success: false, error: error.message };
    }
};

const deleteTrial = async (trialId) => {
    try {
        const userId = await authService.getUserId();
        console.log('Deleting trial:', { trialId, userId });

        if (!userId) {
            throw new Error('User not authenticated');
        }

        const { data, error } = await supabase
            .from('trials')
            .delete()
            .eq('id', trialId)
            .select()
            .single();

        if (error) {
            console.error('Error deleting trial:', error);
            throw error;
        }

        return { success: true, data };
    } catch (error) {
        console.error('Error in deleteTrial:', error);
        return { success: false, error: error.message };
    }
};

// Validation Helpers
export const dentalLabService = {
    // Work Orders
    createWorkOrder,
    getAllWorkOrders,
    getWorkOrders: getAllWorkOrders,
    updateWorkOrder,
    getWorkOrder,
    getWorkOrderBySerial,
    checkWorkOrderHasBill,
getWorkOrdersWithBatchInfo,
    getBatchWorkOrders,
    canBatchBeBilled,
    completeRevision,
    deleteWorkOrder,
    toggleUrgentStatus,
    normalizeDoctorName,

    
    // Bills
    createBill,
    createGroupedBill,
    getBillWithItems,
    updateBillItemPrice,
    getAllBills,
    getMyBills,
    updateBillAmount,
    updateBillStatus,
    markBillAsPrinted,
    getBillWorkOrders,
    getWorkOrdersByBillId: getBillWorkOrders, // Alias for getBillWorkOrders
    getBillsByDateRange,
    getBillsStats,
    updateWorkOrderAmount,
    updateWorkOrderPricing,

    // Monthly Bills History Management
    saveMonthlyBillHistory: async (billData) => {
        try {
            console.log('Saving monthly bill history:', billData);
            
            const userId = await authService.getUserId();
            const userEmail = authService.getUserEmail();
            
            // Extract month and year
            const [year, month] = billData.month.split('-');
            const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ];
            const monthName = monthNames[parseInt(month) - 1];
            
            const historyRecord = {
                doctor_name: billData.doctor_name,
                billing_month: billData.month,
                billing_year: parseInt(year),
                billing_month_name: monthName,
                work_orders_count: billData.work_orders.length,
                total_amount: billData.total_amount,
                work_order_ids: billData.work_orders.map(order => order.id),
                generated_by: userEmail || 'admin',
                bill_data: billData // Store complete data for regeneration
            };
            
            // Insert or update the record
            const { data, error } = await supabase
                .from('monthly_bills_history')
                .upsert(historyRecord, { 
                    onConflict: 'doctor_name,billing_month',
                    returning: 'minimal' 
                });
            
            if (error) {
                console.error('Error saving monthly bill history:', error);
                throw error;
            }
            
            console.log('Monthly bill history saved successfully');
            return { data, error: null };
        } catch (error) {
            console.error('Error in saveMonthlyBillHistory:', error);
            return { data: null, error: error.message };
        }
    },

    getMonthlyBillsHistory: async () => {
        try {
            const { data, error } = await supabase
                .from('monthly_bills_history')
                .select('*')
                .order('generated_at', { ascending: false });
            
            if (error) {
                console.error('Error fetching monthly bills history:', error);
                throw error;
            }
            
            return { data, error: null };
        } catch (error) {
            console.error('Error in getMonthlyBillsHistory:', error);
            return { data: null, error: error.message };
        }
    },

    getMonthlyBillById: async (billId) => {
        try {
            const { data, error } = await supabase
                .from('monthly_bills_history')
                .select('*')
                .eq('id', billId)
                .single();
            
            if (error) {
                console.error('Error fetching monthly bill:', error);
                throw error;
            }
            
            return { data, error: null };
        } catch (error) {
            console.error('Error in getMonthlyBillById:', error);
            return { data: null, error: error.message };
        }
    },

    
    regenerateMonthlyBill: async (billId) => {
        try {
            const { data, error } = await supabase
                .from('monthly_bills_history')
                .select('bill_data')
                .eq('id', billId)
                .single();
            
            if (error) {
                console.error('Error fetching bill data for regeneration:', error);
                throw error;
            }
            
            return { data: data.bill_data, error: null };
        } catch (error) {
            console.error('Error in regenerateMonthlyBill:', error);
            return { data: null, error: error.message };
        }
    },

    getMonthlyBillsStats: async () => {
        try {
            const { data, error } = await supabase
                .from('monthly_bills_history')
                .select('billing_month, total_amount, work_orders_count');
            
            if (error) {
                console.error('Error fetching monthly bills stats:', error);
                throw error;
            }
            
            // Calculate stats
            const currentMonth = new Date().toISOString().slice(0, 7);
            const currentMonthBills = data.filter(bill => bill.billing_month === currentMonth);
            
            const stats = {
                totalCompletedBills: data.length,
                currentMonthBills: currentMonthBills.length,
                currentMonthRevenue: currentMonthBills.reduce((sum, bill) => sum + parseFloat(bill.total_amount || 0), 0),
                totalRevenue: data.reduce((sum, bill) => sum + parseFloat(bill.total_amount || 0), 0),
                totalOrdersBilled: data.reduce((sum, bill) => sum + parseInt(bill.work_orders_count || 0), 0)
            };
            
            return { data: stats, error: null };
        } catch (error) {
            console.error('Error in getMonthlyBillsStats:', error);
            return { data: null, error: error.message };
        }
    },

    // Return/Revision System
      returnWorkOrder: async (workOrderId, returnData) => {
        try {
            const userId = await authService.getUserId();
            console.log('Returning work order:', { workOrderId, returnData, userId });

            if (!userId) {
                throw new Error('User not authenticated');
            }

            // First check if the work order has a bill
            const billCheck = await dentalLabService.checkWorkOrderHasBill(workOrderId);
            if (!billCheck.hasBill) {
                throw new Error('Cannot return work order that has not been billed yet. Please create a bill first.');
            }

            // Call the database function to handle the return
            const { data, error } = await supabase.rpc('handle_work_order_return', {
                p_work_order_id: workOrderId,
                p_return_reason: returnData.reason,
                p_revision_notes: returnData.notes || null,
                p_new_expected_date: returnData.expectedDate || null,
                p_user_id: userId
            });

            if (error) {
                console.error('Error returning work order:', error);
                throw error;
            }

            console.log('Work order returned successfully:', data);
            
            // Check if the database function returned success
            if (data && data.success === false) {
                throw new Error(data.error || 'Database function returned failure');
            }
            
            return { success: true, data };
        } catch (error) {
            console.error('Error in returnWorkOrder:', error);
            return { success: false, error: error.message };
        }
    },


    getRevisionHistory: async (workOrderId) => {
        try {
            const { data, error } = await supabase
                .from('revision_history')
                .select('*')
                .eq('work_order_id', workOrderId)
                .order('revision_number', { ascending: true });

            if (error) {
                console.error('Error fetching revision history:', error);
                throw error;
            }

            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Error in getRevisionHistory:', error);
            return { success: false, error: error.message };
        }
    },

    getRevisionAnalytics: async () => {
        try {
            const { data, error } = await supabase
                .from('work_order_revision_analytics')
                .select('*')
                .order('revision_percentage', { ascending: false });

            if (error) {
                console.error('Error fetching revision analytics:', error);
                throw error;
            }

            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Error in getRevisionAnalytics:', error);
            return { success: false, error: error.message };
        }
    },

    // Get work orders that need revision (returned status)
    getWorkOrdersNeedingRevision: async () => {
        try {
            const { data, error } = await supabase
                .from('work_orders')
                .select('*')
                .in('status', ['returned', 'revision_in_progress'])
                .order('return_date', { ascending: true });

            if (error) {
                console.error('Error fetching work orders needing revision:', error);
                throw error;
            }

            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Error in getWorkOrdersNeedingRevision:', error);
            return { success: false, error: error.message };
        }
    },

    // Trial Management
    createTrial: async (trialData) => {
        try {
            const userId = await authService.getUserId();
            console.log('Creating trial:', { trialData, userId });

            if (!userId) {
                throw new Error('User not authenticated');
            }

            const { data, error } = await supabase
                .from('trials')
                .insert([trialData])
                .select()
                .single();

            if (error) {
                console.error('Error creating trial:', error);
                throw error;
            }

            return { success: true, data };
        } catch (error) {
            console.error('Error in createTrial:', error);
            return { success: false, error: error.message };
        }
    },

    getTrialsByWorkOrder: async (workOrderId) => {
        try {
            const { data, error } = await supabase
                .from('trials')
                .select('*')
                .eq('work_order_id', workOrderId)
                .order('trial_date', { ascending: true });

            if (error) {
                console.error('Error fetching trials:', error);
                throw error;
            }

            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Error in getTrialsByWorkOrder:', error);
            return { success: false, error: error.message };
        }
    },

    updateTrial: async (trialId, trialData) => {
        try {
            const userId = await authService.getUserId();
            console.log('Updating trial:', { trialId, trialData, userId });

            if (!userId) {
                throw new Error('User not authenticated');
            }

            const { data, error } = await supabase
                .from('trials')
                .update(trialData)
                .eq('id', trialId)
                .select()
                .single();

            if (error) {
                console.error('Error updating trial:', error);
                throw error;
            }

            return { success: true, data };
        } catch (error) {
            console.error('Error in updateTrial:', error);
            return { success: false, error: error.message };
        }
    },

    deleteTrial: async (trialId) => {
        try {
            const userId = await authService.getUserId();
            console.log('Deleting trial:', { trialId, userId });

            if (!userId) {
                throw new Error('User not authenticated');
            }

            const { data, error } = await supabase
                .from('trials')
                .delete()
                .eq('id', trialId)
                .select()
                .single();

            if (error) {
                console.error('Error deleting trial:', error);
                throw error;
            }

            return { success: true, data };
        } catch (error) {
            console.error('Error in deleteTrial:', error);
            return { success: false, error: error.message };
        }
    },

    mergeDoctors: async (oldDoctorName, newDoctorName) => {
        try {
            if (!oldDoctorName || !newDoctorName) {
                return { success: false, error: 'Both old and new doctor names are required.' };
            }

            const userId = await authService.getUserId();
            if (!userId) {
                throw new Error('User not authenticated');
            }

            console.log('Merging doctor names:', { oldDoctorName, newDoctorName });

            const { data, error } = await supabase
                .from('work_orders')
                .update({ doctor_name: newDoctorName })
                .eq('doctor_name', oldDoctorName)
                .select();

            if (error) {
                console.error('Error merging doctors:', error);
                return { success: false, error: error.message };
            }

            console.log('Doctors merged successfully:', data);
            return { success: true, count: data ? data.length : 0 };
        } catch (error) {
            console.error('Error in mergeDoctors:', error);
            return { success: false, error: error.message };
        }
    }
};
