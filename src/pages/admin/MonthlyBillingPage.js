/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { dentalLabService } from '../../services/dentalLabService';
import { authService } from '../../services/supabaseAuthService';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/shared/PageHeader';
import { printHtmlContent } from '../../components/bills/BillPrintUtils';

const MonthlyBillingPage = () => {
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [selectedDoctor, setSelectedDoctor] = useState('');
    const [doctors, setDoctors] = useState([]);
    const [workOrders, setWorkOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [pricing, setPricing] = useState({}); // { workOrderId: price }
    const [rates, setRates] = useState({}); // { workOrderId: rate }
    const [totalAmount, setTotalAmount] = useState(0);
    const [isAdmin, setIsAdmin] = useState(false);
    const [billsHistory, setBillsHistory] = useState([]);
    
    const navigate = useNavigate();

    // Function to count teeth from tooth numbers
    const countTeeth = (toothNumbers) => {
        if (!toothNumbers) return 0;
        
        let teeth = [];
        
        // Handle different data formats
        if (Array.isArray(toothNumbers)) {
            teeth = toothNumbers;
        } else if (typeof toothNumbers === 'string') {
            try {
                const parsed = JSON.parse(toothNumbers);
                teeth = Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) {
                teeth = toothNumbers.split(',').map(t => t.trim()).filter(t => t);
            }
        } else if (typeof toothNumbers === 'object' && toothNumbers !== null) {
            const values = Object.values(toothNumbers);
            teeth = values.length > 0 ? values : [toothNumbers];
        } else {
            teeth = [toothNumbers];
        }
        
        return teeth.filter(tooth => {
            const toothNum = parseInt(tooth);
            return !isNaN(toothNum) && toothNum > 0;
        }).length;
    };

    // Function to group teeth by quadrants
    const groupTeethByQuadrants = (toothNumbers) => {
        if (!toothNumbers) return { Q1: [], Q2: [], Q3: [], Q4: [] };
        
        let teeth = [];
        
        if (Array.isArray(toothNumbers)) {
            teeth = toothNumbers;
        } else if (typeof toothNumbers === 'string') {
            try {
                const parsed = JSON.parse(toothNumbers);
                teeth = Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) {
                teeth = toothNumbers.split(',').map(t => t.trim()).filter(t => t);
            }
        } else if (typeof toothNumbers === 'object' && toothNumbers !== null) {
            const values = Object.values(toothNumbers);
            teeth = values.length > 0 ? values : [toothNumbers];
        } else {
            teeth = [toothNumbers];
        }
        
        const quadrants = { Q1: [], Q2: [], Q3: [], Q4: [] };
        
        teeth.forEach(tooth => {
            const toothNum = parseInt(tooth);
            
            if (!isNaN(toothNum)) {
                if (toothNum >= 11 && toothNum <= 18) quadrants.Q1.push(toothNum);
                else if (toothNum >= 21 && toothNum <= 28) quadrants.Q2.push(toothNum);
                else if (toothNum >= 31 && toothNum <= 38) quadrants.Q3.push(toothNum);
                else if (toothNum >= 41 && toothNum <= 48) quadrants.Q4.push(toothNum);
            }
        });
        
        Object.keys(quadrants).forEach(quad => {
            quadrants[quad].sort((a, b) => a - b);
        });
        
        return quadrants;
    };

    // Component to render tooth quadrant boxes
    const ToothQuadrantDisplay = ({ toothNumbers }) => {
        const quadrants = groupTeethByQuadrants(toothNumbers);
        const hasAnyTeeth = Object.values(quadrants).some(q => q.length > 0);
        
        if (!hasAnyTeeth) {
            return (
                <div style={{ fontSize: '10px', color: '#666', textAlign: 'center', padding: '4px' }}>
                    No Teeth
                </div>
            );
        }
        
        const cellStyle = {
            border: '1px solid #ccc',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            lineHeight: '1',
            // --- INCREASED FONT SIZE ---
            fontSize: '15px' 
        };

        return (
            <div style={{ 
              display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gridTemplateRows: '1fr 1fr', 
                // --- INCREASED BOX SIZE ---
                width: '60px', 
                height: '40px', 
                border: '1px solid #ddd',
                fontFamily: 'monospace',
                fontWeight: 'bold'
            }}>


        

                {/* Q2 - Upper Left */}
                <div style={{ 
                    border: '1px solid #ccc', 
                    padding: '1px', 
                    backgroundColor: quadrants.Q2.length > 0 ? '#e8f4f8' : '#f9f9f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    lineHeight: '1',
                    fontSize: '6px'
                }}>
                          <div style={{...cellStyle, backgroundColor: quadrants.Q2.length > 0 ? '#e8f4f8' : '#f9f9f9'}}>
                    {quadrants.Q2.length > 0 ? quadrants.Q2.map(tooth => tooth.toString().slice(-1)).join('') : ''}
                </div>
                </div>
                
                {/* Q1 - Upper Right */}
                <div style={{ 
                    border: '1px solid #ccc', 
                    padding: '1px', 
                    backgroundColor: quadrants.Q1.length > 0 ? '#e8f4f8' : '#f9f9f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    lineHeight: '1',
                    fontSize: '6px'
                }}>
                                   <div style={{...cellStyle, backgroundColor: quadrants.Q1.length > 0 ? '#e8f4f8' : '#f9f9f9'}}>
                    {quadrants.Q1.length > 0 ? quadrants.Q1.map(tooth => tooth.toString().slice(-1)).join('') : ''}
                </div>
                </div>
                
                {/* Q3 - Lower Left */}
                <div style={{ 
                    border: '1px solid #ccc', 
                    padding: '1px', 
                    backgroundColor: quadrants.Q3.length > 0 ? '#e8f4f8' : '#f9f9f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    lineHeight: '1',
                    fontSize: '6px'
                }}>
                            <div style={{...cellStyle, backgroundColor: quadrants.Q3.length > 0 ? '#e8f4f8' : '#f9f9f9'}}>
                    {quadrants.Q3.length > 0 ? quadrants.Q3.map(tooth => tooth.toString().slice(-1)).join('') : ''}
                </div>
                </div>
                
                {/* Q4 - Lower Right */}
                <div style={{ 
                    border: '1px solid #ccc', 
                    padding: '1px', 
                    backgroundColor: quadrants.Q4.length > 0 ? '#e8f4f8' : '#f9f9f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    lineHeight: '1',
                    fontSize: '6px'
                }}>
                                    <div style={{...cellStyle, backgroundColor: quadrants.Q4.length > 0 ? '#e8f4f8' : '#f9f9f9'}}>
                    {quadrants.Q4.length > 0 ? quadrants.Q4.map(tooth => tooth.toString().slice(-1)).join('') : ''}
                </div>
                </div>
            </div>
        );
    };

    useEffect(() => {
        const checkUserRole = async () => {
            // Use unified helper so SUPER_ADMIN is included automatically
            if (!authService.isAdminOrSuperAdmin()) {
                navigate('/staff-dashboard');
                return;
            }
            setIsAdmin(true);
        };
        
        checkUserRole();
        loadDoctors();
        loadBillsHistory();
    }, [navigate]);

    const loadDoctors = async () => {
        try {
            const response = await dentalLabService.getAllWorkOrders();
            if (response.data) {
                // Get unique doctors with normalization
                const doctorNamesMap = new Map();
                
                response.data.forEach(order => {
                    if (order.doctor_name) {
                        // Normalize doctor name: remove "Dr", "Dr.", trim, and convert to lowercase for comparison
                        const normalizedName = order.doctor_name
                            .replace(/^(dr\.?|doctor)\s+/i, '')  // Remove "Dr", "Dr.", "Doctor" prefix
                            .trim()
                            .toLowerCase();
                        
                        if (!doctorNamesMap.has(normalizedName)) {
                            // Store the first occurrence as the canonical name
                            doctorNamesMap.set(normalizedName, order.doctor_name);
                        }
                    }
                });
                
                // Get the canonical names and sort them
                const uniqueDoctors = Array.from(doctorNamesMap.values()).sort();
                setDoctors(uniqueDoctors);
            }
        } catch (error) {
            console.error('Error loading doctors:', error);
        }
    };

    const loadBillsHistory = async () => {
        try {
            const response = await dentalLabService.getMonthlyBillsHistory();
            if (response.data) {
                setBillsHistory(response.data);
            } else {
                console.warn('No bills history data returned:', response.error);
                setBillsHistory([]);
            }
        } catch (error) {
            console.error('Error loading bills history:', error);
            setBillsHistory([]);
        }
    };

    // Function to restore rates from bill history
    const restoreRatesFromBillHistory = (billData) => {
        if (billData.rates_data) {
            setRates(billData.rates_data);
        } else if (billData.work_orders) {
            // Calculate rates from amounts and teeth counts
            const calculatedRates = {};
            billData.work_orders.forEach(order => {
                if (order.amount && order.teeth_count && order.teeth_count > 0) {
                    calculatedRates[order.id] = (parseFloat(order.amount) / order.teeth_count).toFixed(2);
                } else if (order.rate) {
                    calculatedRates[order.id] = order.rate;
                } else {
                    calculatedRates[order.id] = 0;
                }
            });
            setRates(calculatedRates);
        }
        
        if (billData.pricing_data) {
            setPricing(billData.pricing_data);
        }
    };

    const loadWorkOrdersForMonth = async () => {
        if (!selectedDoctor || !selectedMonth) return;

        setLoading(true);
        try {
            const response = await dentalLabService.getAllWorkOrders();
            if (response.data) {
                // Normalize selected doctor name for comparison
                const normalizeDoctor = (name) => {
                    return name
                        .replace(/^(dr\.?|doctor)\s+/i, '')  // Remove "Dr", "Dr.", "Doctor" prefix
                        .trim()
                        .toLowerCase();
                };
                
                const selectedDoctorNormalized = normalizeDoctor(selectedDoctor);
                
                // Filter work orders by doctor and month
                const [year, month] = selectedMonth.split('-');
                const filtered = response.data.filter(order => {
                    const orderDate = new Date(order.completion_date);
                    const orderDoctorNormalized = normalizeDoctor(order.doctor_name || '');
                    
                    return orderDoctorNormalized === selectedDoctorNormalized &&
                           orderDate.getFullYear() === parseInt(year) &&
                           orderDate.getMonth() === parseInt(month) - 1;
                });
                
                setWorkOrders(filtered);
                
                // Initialize pricing and rates with existing amounts and rates
                const initialPricing = {};
                const initialRates = {};
                filtered.forEach(order => {
                    initialPricing[order.id] = order.amount || 0;
                    initialRates[order.id] = order.rate || 0; // Load existing rate or default to 0
                });
                setPricing(initialPricing);
                setRates(initialRates);
                calculateTotal(initialPricing);
            }
        } catch (error) {
            console.error('Error loading work orders:', error);
            setMessage('Error loading work orders: ' + error.message);
        }
        setLoading(false);
    };

    const calculateTotal = (pricingData) => {
        const total = Object.values(pricingData).reduce((sum, price) => sum + parseFloat(price || 0), 0);
        setTotalAmount(total);
    };

    const handlePriceChange = (workOrderId, price) => {
        const newPricing = { ...pricing, [workOrderId]: price };
        setPricing(newPricing);
        calculateTotal(newPricing);
    };

    const handleRateChange = (workOrderId, rate) => {
        const newRates = { ...rates, [workOrderId]: rate };
        setRates(newRates);
        
        // Find the work order and calculate price based on tooth count
        const workOrder = workOrders.find(order => order.id === workOrderId);
        if (workOrder) {
            const teethCount = countTeeth(workOrder.tooth_numbers);
            const calculatedPrice = parseFloat(rate || 0) * teethCount;
            
            const newPricing = { ...pricing, [workOrderId]: calculatedPrice };
            setPricing(newPricing);
            calculateTotal(newPricing);
        }
    };

    const saveAllPrices = async () => {
        setLoading(true);
        let savedCount = 0;
        let errors = [];

        try {
            for (const workOrderId in pricing) {
                const price = parseFloat(pricing[workOrderId]);
                const rate = parseFloat(rates[workOrderId] || 0);
                
                if (price > 0 || rate > 0) {
                    // Use the new function that saves both rate and amount
                    const response = await dentalLabService.updateWorkOrderPricing(
                        workOrderId, 
                        rate > 0 ? rate : null, 
                        price > 0 ? price : null
                    );
                    
                    if (response.data) {
                        savedCount++;
                    } else {
                        errors.push(`Failed to update order ${workOrderId}: ${response.error}`);
                    }
                }
            }

            if (errors.length === 0) {
                setMessage(`Successfully saved pricing for ${savedCount} work orders`);
                // Reload to show updated data
                loadWorkOrdersForMonth();
            } else {
                setMessage(`Saved ${savedCount} prices, but had ${errors.length} errors: ${errors.join(', ')}`);
            }
        } catch (error) {
            setMessage('Error saving prices: ' + error.message);
        }
        setLoading(false);
    };

    const printMonthlyBill = async () => {
        if (!selectedDoctor || workOrders.length === 0) {
            setMessage('Please select a doctor and load work orders first');
            return;
        }

        try {
            // Create consolidated bill data with both rates and amounts
            const billData = {
                doctor_name: selectedDoctor,
                month: selectedMonth,
                work_orders: workOrders.map(order => ({
                    ...order,
                    amount: parseFloat(pricing[order.id] || 0),
                    rate: parseFloat(rates[order.id] || 0),
                    teeth_count: countTeeth(order.tooth_numbers)
                })),
                total_amount: totalAmount,
                generated_date: new Date().toISOString().split('T')[0],
                rates_data: rates, // Save the rates separately for reconstruction
                pricing_data: pricing // Save the pricing separately
            };

            // Save to history before printing
            const saveResult = await dentalLabService.saveMonthlyBillHistory(billData);
            if (saveResult.error) {
                console.warn('Could not save to history:', saveResult.error);
                // Continue with printing even if history save fails
            } else {
                // Refresh history after successful save
                loadBillsHistory();
            }

            // Generate and print consolidated bill
            await printConsolidatedBill(billData);
            
            setMessage('Monthly bill printed and saved to history successfully');
        } catch (error) {
            setMessage('Error printing monthly bill: ' + error.message);
        }
    };

    const printConsolidatedBill = async (billData) => {
        // Function to count teeth from tooth numbers (for print)
        const countTeethForPrint = (toothNumbers) => {
            if (!toothNumbers) return 0;
            
            let teeth = [];
            
            // Handle different data formats
            if (Array.isArray(toothNumbers)) {
                teeth = toothNumbers;
            } else if (typeof toothNumbers === 'string') {
                try {
                    // Try to parse as JSON first (in case it's a JSON string)
                    const parsed = JSON.parse(toothNumbers);
                    teeth = Array.isArray(parsed) ? parsed : [parsed];
                } catch (e) {
                    // If JSON parsing fails, treat as comma-separated string
                    teeth = toothNumbers.split(',').map(t => t.trim()).filter(t => t);
                }
            } else if (typeof toothNumbers === 'object' && toothNumbers !== null) {
                // Handle case where it might be an object with array-like properties
                const values = Object.values(toothNumbers);
                teeth = values.length > 0 ? values : [toothNumbers];
            } else {
                teeth = [toothNumbers];
            }
            
            // Count valid tooth numbers
            return teeth.filter(tooth => {
                const toothNum = parseInt(tooth);
                return !isNaN(toothNum) && toothNum > 0;
            }).length;
        };

        // Function to group teeth by quadrants for print
        const groupTeethByQuadrants = (toothNumbers) => {
            if (!toothNumbers) return { Q1: [], Q2: [], Q3: [], Q4: [] };
            
            let teeth = [];
            
            // Handle different data formats
            if (Array.isArray(toothNumbers)) {
                teeth = toothNumbers;
            } else if (typeof toothNumbers === 'string') {
                try {
                    // Try to parse as JSON first (in case it's a JSON string)
                    const parsed = JSON.parse(toothNumbers);
                    teeth = Array.isArray(parsed) ? parsed : [parsed];
                } catch (e) {
                    // If JSON parsing fails, treat as comma-separated string
                    teeth = toothNumbers.split(',').map(t => t.trim()).filter(t => t);
                }
            } else if (typeof toothNumbers === 'object' && toothNumbers !== null) {
                // Handle case where it might be an object with array-like properties
                const values = Object.values(toothNumbers);
                teeth = values.length > 0 ? values : [toothNumbers];
            } else {
                teeth = [toothNumbers];
            }
            
            const quadrants = { Q1: [], Q2: [], Q3: [], Q4: [] };
            
            teeth.forEach(tooth => {
                const toothNum = parseInt(tooth);
                if (!isNaN(toothNum)) {
                    if (toothNum >= 11 && toothNum <= 18) {
                        quadrants.Q1.push(toothNum);
                    } else if (toothNum >= 21 && toothNum <= 28) {
                        quadrants.Q2.push(toothNum);
                    } else if (toothNum >= 31 && toothNum <= 38) {
                        quadrants.Q3.push(toothNum);
                    } else if (toothNum >= 41 && toothNum <= 48) {
                        quadrants.Q4.push(toothNum);
                    }
                }
            });
            
            // Sort teeth in each quadrant
            Object.keys(quadrants).forEach(quad => {
                quadrants[quad].sort((a, b) => a - b);
            });
            
            return quadrants;
        };

        // Function to generate HTML for quadrant display
        const generateQuadrantHTML = (toothNumbers) => {
            const quadrants = groupTeethByQuadrants(toothNumbers);
            
            // Helper function to format tooth numbers for display
            const formatToothNumbers = (toothArray) => {
                if (toothArray.length === 0) return '';
                const toothStr = toothArray.map(tooth => tooth.toString().slice(-1)).join('');
                // If more than 6 digits, break into two lines
                if (toothStr.length > 6) {
                    const mid = Math.ceil(toothStr.length / 2);
                    return `${toothStr.slice(0, mid)}<br>${toothStr.slice(mid)}`;
                }
                return toothStr;
            };
            
            return `
                <div style="display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; width: 65px; height: 35px; border: 1px solid #333; font-size: 7px; font-family: monospace; margin: 0 auto; font-weight: bold;">
                    <div style="border: 1px solid #666; padding: 1px; background-color: ${quadrants.Q2.length > 0 ? '#e8f4f8' : '#f9f9f9'}; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 7px; font-weight: bold; line-height: 1.1; overflow: hidden;">
                        ${formatToothNumbers(quadrants.Q2)}
                    </div>
                    <div style="border: 1px solid #666; padding: 1px; background-color: ${quadrants.Q1.length > 0 ? '#e8f4f8' : '#f9f9f9'}; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 7px; font-weight: bold; line-height: 1.1; overflow: hidden;">
                        ${formatToothNumbers(quadrants.Q1)}
                    </div>
                    <div style="border: 1px solid #666; padding: 1px; background-color: ${quadrants.Q3.length > 0 ? '#e8f4f8' : '#f9f9f9'}; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 7px; font-weight: bold; line-height: 1.1; overflow: hidden;">
                        ${formatToothNumbers(quadrants.Q3)}
                    </div>
                    <div style="border: 1px solid #666; padding: 1px; background-color: ${quadrants.Q4.length > 0 ? '#e8f4f8' : '#f9f9f9'}; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 7px; font-weight: bold; line-height: 1.1; overflow: hidden;">
                        ${formatToothNumbers(quadrants.Q4)}
                    </div>
                </div>
            `;
        };

        const monthName = new Date(billData.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            
            const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <title>Monthly Bill - ${billData.doctor_name}</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
   body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 12px; 
            font-size: 12px; /* Increased base font size */
            line-height: 1.3; 
            color: #333;
            background: white;
        }
        .header { 
            margin-bottom: 18px; 
            border-bottom: 3px solid #0066cc; 
            padding-bottom: 12px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 8px 8px 0 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header-content { 
            display: flex; 
            align-items: flex-start; 
            justify-content: space-between; 
            padding: 10px;
        }
        .left-section {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        .logo { 
            width: 65px; 
            height: 65px; 
            object-fit: contain; 
            flex-shrink: 0;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,102,204,0.3);
        }
        .company-info { text-align: left; }
        .company-name { 
            font-size: 22px; 
            font-weight: bold; 
            color: #0066cc; 
            margin-bottom: 6px; 
            letter-spacing: 1.2px;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
        }
        .company-subtitle { 
            font-size: 15px; 
            color: #555; 
            font-weight: 600; 
            margin-bottom: 0;
            font-style: italic;
        }
        .doctor-info { 
            text-align: right;
            font-size: 11px; 
            background: rgba(255, 255, 255, 0.8);
            padding: 12px; 
            border-radius: 8px;
            border-left: 4px solid #0066cc;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            min-width: 200px;
        }
        .doctor-info strong { 
            font-size: 12px; 
            color: #0066cc; 
            font-weight: 600;
        }
        .bill-title { 
            font-size: 18px; 
            font-weight: bold; 
            color: #333; 
            margin-top: 10px;
            padding: 6px 12px;
            background: #0066cc;
            color: white;
            border-radius: 20px;
            display: inline-block;
            box-shadow: 0 2px 4px rgba(0,102,204,0.3);
            text-align: center;
            width: 100%;
        }
           table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 10px; 
            font-size: 11px; /* Increased table font size */
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
        }
        th, td { 
            border: 1px solid #ddd; 
            padding: 4px 5px; /* Adjusted padding */
            text-align: left; 
            vertical-align: middle;
            word-wrap: break-word;
        }
        th { 
            background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
            color: white;
            font-weight: bold; 
            font-size: 10px; /* Increased header font size */
            text-align: center;
            letter-spacing: 0.5px;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
        }
        tbody tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        tbody tr:hover {
            background-color: #e9ecef;
        }
        .total-row { 
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            font-weight: bold; 
            font-size: 11px;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
        }
        .amount { 
            text-align: right; 
            font-weight: 600;
        }
        .footer { 
            margin-top: 15px; 
            text-align: center; 
            font-size: 9px; 
            color: #666; 
            border-top: 2px solid #0066cc; 
            padding-top: 10px;
            background: #f8f9fa;
            border-radius: 0 0 8px 8px;
        }
        .serial-col { width: 8%; }
        .patient-col { width: 16%; }
        .product-col { width: 20%; }
        .tooth-col { width: 18%; }
        .count-col { width: 8%; }
        .date-col { width: 12%; }
        .rate-col { width: 10%; }
        .amount-col { width: 12%; }
        
        /* Enhanced quadrant styling */
        .quadrant-container {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100%;
        }
        
        @media print {
 @page {
                size: A4;
                margin: 6mm 5mm 6mm 5mm;
            }
            * { 
                box-sizing: border-box; 
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
            }
            body { 
                margin: 0; 
                padding: 0; 
                font-size: 10px; /* Increased base print font size */
                line-height: 1.2;
                background: white !important;
            }
            .header { 
                margin-bottom: 3mm; 
                padding-bottom: 2mm;
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%) !important;
                border-radius: 2mm 2mm 0 0;
                box-shadow: 0 0.5mm 1mm rgba(0,0,0,0.1);
                page-break-inside: avoid;
            }
            .header-content { 
                display: flex; 
                align-items: flex-start; 
                justify-content: space-between; 
                padding: 2mm;
            }
            .left-section {
                display: flex;
                align-items: center;
                gap: 3mm;
            }
            .logo { 
                width: 12mm; 
                height: 12mm; 
                border-radius: 50%;
                box-shadow: 0 0.5mm 2mm rgba(0,102,204,0.3);
            }
            .company-name { 
                font-size: 14px; 
                letter-spacing: 0.5px;
                text-shadow: 0.3px 0.3px 0.8px rgba(0,0,0,0.1);
            }
            .company-subtitle { 
                font-size: 10px; 
                margin-bottom: 0;
            }
            .doctor-info { 
                font-size: 16px;
                background: rgba(255, 255, 255, 0.8) !important;
                border-left: 1mm solid #0066cc;
                border-radius: 1mm;
                box-shadow: 0 0.5mm 1mm rgba(0,0,0,0.1);
                page-break-inside: avoid;
                text-align: right;
                padding: 2mm;
                min-width: 35mm;
            }
            .doctor-info strong { 
                font-size: 18px; 
                color: #0066cc !important;
            }
            .bill-title { 
                font-size: 12px; 
                margin-top: 2mm;
                padding: 2mm 4mm;
                border-radius: 4mm;
                background: #0066cc !important;
                color: white !important;
                box-shadow: 0 0.5mm 1mm rgba(0,102,204,0.3);
                text-align: center;
                width: 100%;
            }
table { 
                font-size: 11px; /* Increased table font size for better visibility */
                margin-bottom: 1mm;
                box-shadow: 0 0.5mm 1mm rgba(0,0,0,0.1);
                border-radius: 1mm;
                overflow: hidden;
                page-break-inside: auto;
            }
            th, td { 
                padding: 1mm 1.5mm; /* Optimized padding for space efficiency */
                font-size: 11px; /* Increased font size for better readability */
                border: 0.2mm solid #ddd;
                line-height: 1.1; /* Slightly tighter line height */
                vertical-align: middle;
            }
            th { 
                background: linear-gradient(135deg, #0066cc 0%, #004499 100%) !important;
                color: white !important;
                font-size: 10px; /* Increased header font size */
                font-weight: bold;
                text-align: center;
                letter-spacing: 0.2px;
                text-shadow: 0.2px 0.2px 0.5px rgba(0,0,0,0.3);
                page-break-inside: avoid;
                page-break-after: avoid;
            }
            tbody tr {
                page-break-inside: avoid;
                height: 3.5mm; /* Slightly reduced row height for more rows per page */
                min-height: 3.5mm;
            }
            tbody tr:nth-child(even) {
                background-color: #f8f9fa !important;
            }
            .total-row { 
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%) !important;
                color: white !important;
                font-size: 11px; /* Increased total row font size */
                font-weight: bold;
                text-shadow: 0.3px 0.3px 0.8px rgba(0,0,0,0.3);
                page-break-inside: avoid;
                page-break-before: avoid;
            }
            .footer { 
                margin-top: 2mm; 
                padding-top: 2mm;
                font-size: 6px;
                background: #f8f9fa !important;
                border-top: 0.5mm solid #0066cc;
                border-radius: 0 0 1mm 1mm;
                page-break-inside: avoid;
            }
            .serial-col { width: 8%; min-width: 8%; max-width: 8%; }
            .patient-col { width: 16%; min-width: 16%; max-width: 16%; }
            .product-col { width: 20%; min-width: 20%; max-width: 20%; }
            .tooth-col { width: 18%; min-width: 18%; max-width: 18%; }
            .count-col { width: 8%; min-width: 8%; max-width: 8%; }
            .date-col { width: 12%; min-width: 12%; max-width: 12%; }
            .rate-col { width: 10%; min-width: 10%; max-width: 10%; }
            .amount-col { width: 10%; min-width: 10%; max-width: 10%; }
            
            /* Enhanced quadrant display for print */
            .quadrant-container {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 6mm;
                width: 100%;
                padding: 0.5mm;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <div class="left-section">
                <img src="/logo.png" alt="Marshal Dental Art Logo" class="logo" onerror="this.style.display='none'" />
                <div class="company-info">
                    <div class="company-name">MARSHAL DENTAL ART</div>
                    <div class="company-subtitle">CAD Cam Milling Center</div>
                </div>
            </div>
            <div class="doctor-info">
                <strong>Doctor:</strong> ${billData.doctor_name}<br>
                <strong>Month:</strong> ${monthName}<br>
                <strong>Generated:</strong> ${new Date(billData.generated_date).toLocaleDateString()}
            </div>
        </div>
        <div class="bill-title">Monthly Consolidated Bill</div>
    </div>
    
     <table>
        <thead>
            <tr>
                <th class="serial-col">Job Number</th>
                <th class="date-col">Date</th>
                <th class="patient-col">Patient</th>
                <th class="tooth-col">Quadrants</th>
                <th class="product-col">Product Quality</th>
                <th class="count-col">Count</th>
                <th class="rate-col">Rate (₹)</th>
                <th class="amount-col amount">Amount (₹)</th>
            </tr>
        </thead>
        <tbody>
            ${billData.work_orders.map(order => `
                <tr>
                    <td class="serial-col">${order.serial_number}</td>
                    <td class="date-col">${new Date(order.completion_date).toLocaleDateString('en-GB')}</td>
                    <td class="patient-col">${order.patient_name}</td>
                    <td class="tooth-col" style="text-align: center; vertical-align: middle;">${generateQuadrantHTML(order.tooth_numbers)}</td>
                    <td class="product-col">${order.product_quality}</td>
                    <td class="count-col" style="text-align: center;"><strong>${countTeethForPrint(order.tooth_numbers)}</strong></td>
                    <td class="rate-col amount">${order.rate ? parseFloat(order.rate).toFixed(2) : (order.amount && order.teeth_count > 0 ? (parseFloat(order.amount) / order.teeth_count).toFixed(2) : '0.00')}</td>
                    <td class="amount-col amount">${order.amount ? parseFloat(order.amount).toFixed(2) : '0.00'}</td>
                </tr>
            `).join('')}
            <tr class="total-row">
                <td colspan="7"><strong>Total Amount</strong></td>
                <td class="amount"><strong>₹${billData.total_amount.toFixed(2)}</strong></td>
            </tr>
        </tbody>
    </table>
    
    <div class="footer">
        <p>Thank you for your business! | Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
    </div>
</body>
</html>`;
            
        await printHtmlContent(htmlContent);
    };

    const regenerateBill = async (billId) => {
        try {
            setLoading(true);
            const response = await dentalLabService.regenerateMonthlyBill(billId);
            if (response.data) {
                await printConsolidatedBill(response.data);
                setMessage('Bill regenerated and printed successfully');
            } else {
                setMessage('Error regenerating bill: ' + response.error);
            }
        } catch (error) {
            setMessage('Error regenerating bill: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isAdmin) {
        return <div>Loading...</div>;
    }

    return (
        <div className="container mt-4">
            <div className="row">
                <div className="col-12">
                    <div className="card">
                        <PageHeader 
                            title="📊 Monthly Billing System"
                            backPath="/admin-dashboard"
                            backLabel="Back to Dashboard"
                        />
                        
                        <div className="card-body">
                            {message && (
                                <div className={`alert ${message.includes('Error') ? 'alert-danger' : 'alert-success'}`}>
                                    {message}
                                </div>
                            )}

                            {/* Selection Controls */}
                            <div className="card mb-4">
                                <div className="card-header">
                                    <h6>📅 Select Month & Doctor</h6>
                                </div>
                                <div className="card-body">
                                    <div className="row">
                                        <div className="col-md-4">
                                            <label className="form-label">Select Month</label>
                                            <input
                                                type="month"
                                                className="form-control"
                                                value={selectedMonth}
                                                onChange={(e) => setSelectedMonth(e.target.value)}
                                            />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Select Doctor</label>
                                            <select
                                                className="form-control"
                                                value={selectedDoctor}
                                                onChange={(e) => setSelectedDoctor(e.target.value)}
                                            >
                                                <option value="">Choose Doctor...</option>
                                                {doctors.map(doctor => (
                                                    <option key={doctor} value={doctor}>{doctor}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">&nbsp;</label>
                                            <button
                                                className="btn btn-primary w-100"
                                                onClick={loadWorkOrdersForMonth}
                                                disabled={!selectedDoctor || !selectedMonth || loading}
                                            >
                                                {loading ? 'Loading...' : 'Load Orders'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Work Orders Table */}
                            {workOrders.length > 0 && (
                                <div className="card mb-4">
                                    <div className="card-header d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 gap-md-0">
                                        <h6 className="mb-0">📋 Work Orders for {selectedDoctor} - {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h6>
                                        <div>
                                            <span className="badge bg-info me-2">{workOrders.length} orders</span>
                                            <span className="badge bg-success">Total: ₹{totalAmount.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <div className="card-body">
                                        <div className="table-responsive">
                                            <table className="table table-striped">
                                                <thead>
                                                    <tr>
                                                        <th>Job Number</th>
                                                        <th>Patient</th>
                                                        <th>Product Quality</th>
                                                        <th>Tooth Quadrants</th>
                                                        <th>Teeth Count</th>
                                                        <th>Completion Date</th>
                                                        <th>Rate (₹)</th>
                                                        <th>Amount (₹)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {workOrders.map(order => (
                                                        <tr key={order.id}>
                                                            <td><strong>{order.serial_number}</strong></td>
                                                            <td>{order.patient_name}</td>
                                                            <td>{order.product_quality}</td>
                                                            <td style={{ padding: '4px' }}>
                                                                <ToothQuadrantDisplay toothNumbers={order.tooth_numbers} />
                                                            </td>
                                                            <td><strong>{countTeeth(order.tooth_numbers)}</strong></td>
                                                            <td>{new Date(order.completion_date).toLocaleDateString()}</td>
                                                            <td>
                                                                <input
                                                                    type="number"
                                                                    className="form-control"
                                                                    style={{width: '80px'}}
                                                                    value={rates[order.id] || ''}
                                                                    onChange={(e) => handleRateChange(order.id, e.target.value)}
                                                                    placeholder="0.00"
                                                                    step="0.01"
                                                                />
                                                            </td>
                                                            <td>
                                                                <input
                                                                    type="number"
                                                                    className="form-control"
                                                                    style={{width: '100px'}}
                                                                    value={pricing[order.id] || ''}
                                                                    onChange={(e) => handlePriceChange(order.id, e.target.value)}
                                                                    placeholder="0.00"
                                                                    step="0.01"
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="table-info">
                                                        <td colSpan="7"><strong>Total Amount</strong></td>
                                                        <td><strong>₹{totalAmount.toFixed(2)}</strong></td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            {workOrders.length > 0 && (
                                <div className="card">
                                    <div className="card-body">
                                        <div className="d-flex gap-2">
                                            <button
                                                className="btn btn-success"
                                                onClick={saveAllPrices}
                                                disabled={loading}
                                            >
                                                💾 Save All Prices
                                            </button>
                                            <button
                                                className="btn btn-primary"
                                                onClick={printMonthlyBill}
                                                disabled={loading || totalAmount === 0}
                                            >
                                                🖨️ Print Monthly Bill
                                            </button>
                                        </div>
                                        <small className="text-muted d-block mt-2">
                                            Save prices first, then print the consolidated monthly bill
                                        </small>
                                    </div>
                                </div>
                            )}

                            {workOrders.length === 0 && selectedDoctor && selectedMonth && !loading && (
                                <div className="alert alert-info">
                                    <i className="bi bi-info-circle"></i>
                                    No work orders found for {selectedDoctor} in {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </div>
                            )}

                            {/* Bills History */}
                            <div className="card mt-4">
                                <div className="card-header">
                                    <h6>📜 Bills History</h6>
                                </div>
                                <div className="card-body">
                                    {!billsHistory || billsHistory.length === 0 ? (
                                        <div className="text-center text-muted py-4">
                                            <i className="bi bi-file-earmark-text" style={{ fontSize: '24px' }}></i>
                                            <p className="mb-0">No bills history found</p>
                                        </div>
                                    ) : (
                                        <div className="table-responsive">
                                            <table className="table table-striped">
                                                <thead>
                                                    <tr>
                                                        <th>Month</th>
                                                        <th>Doctor</th>
                                                        <th>Work Orders</th>
                                                        <th>Total Amount (₹)</th>
                                                        <th>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {billsHistory.map(bill => (
                                                        <tr key={bill.id}>
                                                            <td>{new Date(bill.billing_month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</td>
                                                            <td>{bill.doctor_name}</td>
                                                            <td>{bill.work_orders_count || 0}</td>
                                                            <td>₹{(bill.total_amount || 0).toFixed(2)}</td>
                                                            <td>
                                                                <button
                                                                    className="btn btn-sm btn-outline-primary"
                                                                    onClick={() => regenerateBill(bill.id)}
                                                                    disabled={loading}
                                                                >
                                                                    <i className="bi bi-arrow-clockwise"></i> Regenerate
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MonthlyBillingPage;