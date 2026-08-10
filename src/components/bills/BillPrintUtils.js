/* eslint-disable */
import { dentalLabService } from '../../services/dentalLabService';

// Utility functions for bill printing
export const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
};

// Format tooth numbers for display
export const formatToothNumbers = (toothNumbers) => {
    console.log('formatToothNumbers input:', toothNumbers, 'type:', typeof toothNumbers);
    
    if (!toothNumbers) {
        console.log('No tooth numbers provided, returning N/A');
        return 'N/A';
    }
    
    if (Array.isArray(toothNumbers)) {
        console.log('Tooth numbers is array:', toothNumbers);
        return toothNumbers.length > 0 ? toothNumbers.sort((a, b) => a - b).join(', ') : 'N/A';
    }
    
    if (typeof toothNumbers === 'string') {
        console.log('Tooth numbers is string, attempting to parse:', toothNumbers);
        try {
            const parsed = JSON.parse(toothNumbers);
            console.log('Parsed tooth numbers:', parsed);
            return Array.isArray(parsed) ? parsed.sort((a, b) => a - b).join(', ') : toothNumbers;
        } catch {
            console.log('Failed to parse as JSON, returning as string:', toothNumbers);
            return toothNumbers;
        }
    }
    
    console.log('Converting to string:', String(toothNumbers));
    return String(toothNumbers);
};

export const generateToothQuadrantDisplay = (toothNumbers) => {
    console.log('=== TOOTH QUADRANT DEBUG ===');
    console.log('Input toothNumbers:', toothNumbers);
    console.log('Type:', typeof toothNumbers);
    console.log('Is array:', Array.isArray(toothNumbers));
    
    const toothArray = Array.isArray(toothNumbers) ? toothNumbers : (toothNumbers ? [toothNumbers] : []);
    console.log('Processed toothArray:', toothArray);
    console.log('============================');
    
    // If no teeth selected, show a message instead of empty quadrant
    if (toothArray.length === 0) {
        return `
            <div style="display: inline-block; padding: 5px; font-family: Arial; font-size: 11px; color: #666; font-style: italic;">
                No teeth specified
            </div>
        `;
    }
    
    const quadrants = {
        upperRight: toothArray.filter(t => t >= 11 && t <= 18),
        upperLeft: toothArray.filter(t => t >= 21 && t <= 28),
        lowerLeft: toothArray.filter(t => t >= 31 && t <= 38),
        lowerRight: toothArray.filter(t => t >= 41 && t <= 48)
    };

    const formatQuadrant = (teeth) => teeth.length > 0 ? teeth.map(t => t.toString().slice(-1)).join('') : '-';

    return `
        <div style="display: inline-block; border: 1px solid #000; font-family: monospace; font-size: 10px; line-height: 1.2;">
            <table style="border-collapse: collapse; width: 40px; height: 30px;">
                <tr>
                    <td style="border: 1px solid #666; padding: 1px; text-align: center; width: 20px; height: 15px;">${formatQuadrant(quadrants.upperLeft)}</td>
                    <td style="border: 1px solid #666; padding: 1px; text-align: center; width: 20px; height: 15px;">${formatQuadrant(quadrants.upperRight)}</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #666; padding: 1px; text-align: center; width: 20px; height: 15px;">${formatQuadrant(quadrants.lowerLeft)}</td>
                    <td style="border: 1px solid #666; padding: 1px; text-align: center; width: 20px; height: 15px;">${formatQuadrant(quadrants.lowerRight)}</td>
                </tr>
            </table>
        </div>
    `;
};

export const getBillPrintStyles = () => `
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; background-color: #fff; color: #333; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding: 15px; background: linear-gradient(135deg, #f8f9fa, #e9ecef); border-radius: 10px; border: 1px solid #dee2e6; }
    .company-info { flex: 1; }
    .company-logo { width: 80px; height: 80px; object-fit: contain; border: 2px solid #2c5aa0; border-radius: 10px; padding: 8px; background: white; margin-left: 20px; }
    .company-name { font-size: 2.2em; font-weight: bold; color: #2c5aa0; margin: 0 0 5px 0; }
    .company-subtitle { font-size: 1.1em; color: #666; margin: 0 0 10px 0; }
    .company-address { font-size: 0.9em; color: #555; }
    .doctor-section { background: #2c5aa0; color: white; padding: 12px 15px; margin: 15px 0; border-radius: 8px; }
    .doctor-name { font-size: 1.3em; font-weight: bold; margin: 0; }
    .bill-table { width: 100%; border-collapse: collapse; margin: 15px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden; }
    .bill-table th { background: linear-gradient(135deg, #2c5aa0, #3d6eb5); color: white; padding: 12px 10px; text-align: left; }
    .bill-table td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
    .bill-table tbody tr:nth-child(even) { background-color: #f8f9fa; }
    .total-row { background: linear-gradient(135deg, #28a745, #20c997) !important; color: white; font-weight: bold; font-size: 1.1em; }
    .amount { text-align: right; font-weight: 600; }
    .bill-info { margin-bottom: 20px; }
    .bill-info p { margin: 5px 0; }
    .footer { margin-top: 30px; text-align: center; padding-top: 15px; border-top: 1px solid #ccc; }
    .thank-you { font-size: 1.1em; font-weight: 600; }
    .instructions { margin-top: 20px; padding: 10px; background: #f8f9fa; border-radius: 5px; border-left: 3px solid #2c5aa0; }
    
    @media print {
        /* --- MODIFIED FOR COMPACT PRINTING --- */
        @page {
            size: A4;
            margin: 5mm; /* Reduced page margins */
        }
        body { margin: 0; font-size: 12px; }
        .header { margin-bottom: 15px; padding: 10px; }
        .company-logo { width: 60px; height: 60px; }
        .doctor-section { padding: 10px 12px; margin: 10px 0; }
        .bill-info { margin-bottom: 15px; }
        .bill-table { margin: 15px 0; }
        .bill-table th { padding: 8px 10px; }
        .bill-table td { padding: 8px 10px; }
        .bill-container { page-break-after: always; }
        .bill-container:last-child { page-break-after: auto; }
        .footer { display: none; } /* Hide individual footers in bulk print */
        .bulk-print-footer { display: block !important; margin-top: 20px; text-align: center; font-size: 12px; }
    }
`;

export const generateCompanyHeader = () => `
    <div class="header">
        <div class="company-info">
            <div class="company-name">MARSHAL DENTAL ART</div>
            <div class="company-subtitle">CAD Cam Milling Center</div>
            <div class="company-address">📍Harmony Archade industrial estate building no B.106 behind pranayu hospital pimpalghar Bhiwandi-421311</div>
        </div>
        <img src="${window.location.origin}/logo.png" alt="MARSHAL DENTAL ART Logo" class="company-logo" onerror="this.style.display='none'" />
    </div>
`;

export const printHtmlContent = (htmlContent) => {
    return new Promise((resolve) => {
        const rootNode = document.getElementById('root');
        
        // Hide the main app manually so the print dialog has no choice but to print our container
        if (rootNode) {
            rootNode.style.display = 'none';
        }

        // Create container for print content
        const printContainer = document.createElement('div');
        printContainer.id = 'mobile-print-container';
        
        // Wrap content to safely inject
        const wrapper = document.createElement('div');
        wrapper.innerHTML = htmlContent;
        printContainer.appendChild(wrapper);

        // Add a manual close button just in case the mobile browser gets stuck
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '❌ Close Print View';
        closeBtn.style.cssText = 'position: fixed; bottom: 20px; right: 20px; padding: 12px 24px; background: #dc3545; color: white; border: none; border-radius: 8px; font-weight: bold; z-index: 999999; box-shadow: 0 4px 12px rgba(0,0,0,0.3); font-size: 16px;';
        printContainer.appendChild(closeBtn);

        // Add print-specific styles to format the container and hide the close button during print
        const printStyle = document.createElement('style');
        printStyle.id = 'mobile-print-style';
        printStyle.innerHTML = `
            #mobile-print-container {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                min-height: 100vh;
                background: white;
                z-index: 99999;
            }
            @media print {
                button { display: none !important; }
            }
        `;
        
        document.head.appendChild(printStyle);
        document.body.appendChild(printContainer);

        let cleanedUp = false;
        const cleanup = () => {
            if (cleanedUp) return;
            cleanedUp = true;
            if (document.body.contains(printContainer)) {
                document.body.removeChild(printContainer);
            }
            if (document.head.contains(printStyle)) {
                document.head.removeChild(printStyle);
            }
            if (rootNode) {
                rootNode.style.display = '';
            }
            window.removeEventListener('afterprint', cleanup);
            resolve();
        };
        
        closeBtn.onclick = cleanup;

        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Android Chrome fires 'afterprint' immediately, destroying the print preview.
        // So on mobile, we rely exclusively on the manual close button!
        if (!isMobile) {
            window.addEventListener('afterprint', cleanup);
        }

        // Wait for images to load before triggering print
        setTimeout(() => {
            window.print();
        }, 500);
    });
};

export const handleSingleBillPrint = async (bill) => {
    console.log('=== SINGLE BILL PRINT DEBUG ===');
    console.log('Bill object:', bill);
    console.log('Bill work_order_id:', bill.work_order_id);
    console.log('tooth_numbers type:', typeof bill.tooth_numbers);
    console.log('tooth_numbers value:', bill.tooth_numbers);
    console.log('tooth_numbers is array:', Array.isArray(bill.tooth_numbers));
    console.log('tooth_numbers stringified:', JSON.stringify(bill.tooth_numbers));
    
    // Start with bill's tooth_numbers
    let toothNumbers = bill.tooth_numbers;
    
    // For individual bills, always try to get fresh tooth_numbers from work order
    // This ensures consistency with grouped bills which use work_order data
    console.log('Always fetching fresh tooth_numbers from work order for consistency...');
    console.log('Work order ID:', bill.work_order_id);
    
    if (bill.work_order_id) {
        try {
            // Import the service properly
            const response = await dentalLabService.getWorkOrder(bill.work_order_id);
            console.log('Work order fetch response:', response);
                
            if (response.success && response.data) {
                // Use work order tooth_numbers (this is what grouped bills do)
                toothNumbers = response.data.tooth_numbers;
                console.log('Using fresh tooth_numbers from work order:', toothNumbers);
                console.log('Fresh tooth_numbers type:', typeof toothNumbers);
                console.log('Fresh tooth_numbers stringified:', JSON.stringify(toothNumbers));
            } else {
                console.warn('Failed to fetch work order tooth_numbers, using bill data:', response.error);
                // Fallback to bill tooth_numbers if work order fetch fails
            }
        } catch (error) {
            console.warn('Error fetching work order tooth_numbers, using bill data:', error);
            // Fallback to bill tooth_numbers if error occurs
        }
    } else {
        console.warn('No work_order_id found in bill for tooth number fetch');
    }
    
    console.log('Final tooth_numbers for print:', toothNumbers);
    console.log('Final tooth_numbers type:', typeof toothNumbers);
    console.log('Final tooth_numbers stringified:', JSON.stringify(toothNumbers));
    console.log('================================');
    
    // using printHtmlContent
    
    const billContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Bill #${bill.serial_number}</title>
            <style>${getBillPrintStyles()}</style>
        </head>
        <body>
            ${generateCompanyHeader()}
            
            <div class="doctor-section">
                <div class="doctor-name">🩺 Dr. ${bill.doctor_name}</div>
            </div>
            
            <div class="bill-info">
                <p><strong>📋 Bill Number:</strong> ${bill.serial_number}</p>
                <p><strong>📅 Bill Date:</strong> ${formatDate(bill.bill_date)}</p>
                ${bill.notes ? `<p><strong>📝 Notes:</strong> ${bill.notes}</p>` : ''}
            </div>
            
            <div class="table-with-footer">
                <table class="bill-table">
                    <thead>
                        <tr>
                            <th>📅 Date</th>
                            <th>👤 Patient Name</th>
                            <th>🦷 Tooth Position</th>
                            <th>⭐ Quality</th>
                            <th class="amount">💰 Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${formatDate(bill.completion_date || bill.bill_date)}</td>
                            <td>${bill.patient_name || 'N/A'}</td>
                            <td>${generateToothQuadrantDisplay(toothNumbers)}</td>
                            <td>${bill.work_description || 'N/A'}</td>
                            <td class="amount">₹${bill.amount || '0.00'}</td>
                        </tr>
                        <tr class="total-row">
                            <td colspan="4" style="text-align: right; padding-right: 20px;">
                                <strong>🏆 GRAND TOTAL</strong>
                            </td>
                            <td class="amount">
                                <strong>₹${bill.amount || '0.00'}</strong>
                            </td>
                        </tr>
                    </tbody>
                </table>
                
            </div>
        </body>
        </html>
    `;
    
    await printHtmlContent(billContent);
};

export const handleGroupedBillPrint = async (bill) => {
    // using printHtmlContent
    
    try {
        const response = await dentalLabService.getBillWorkOrders(bill.id);
        const workOrders = response.data || [];
        console.log('Work orders for grouped bill:', workOrders);
        
        let billItems = [];
        const itemsResponse = await dentalLabService.getBillWithItems(bill.id);
        console.log('Bill items response:', itemsResponse);
        
        if (itemsResponse.success && itemsResponse.data.items && itemsResponse.data.items.length > 0) {
            // Use itemized pricing data
            console.log('Using itemized pricing data for grouped bill');
            billItems = itemsResponse.data.items.map(item => {
                console.log('Processing itemized bill item:', item);
                console.log('Work order data in item:', item.work_orders);
                
                const mappedItem = {
                    date: formatDate(item.completion_date || item.created_at),
                    patient: item.work_orders?.patient_name || item.patient_name || 'N/A',
                    toothPosition: item.work_orders?.tooth_numbers || item.tooth_numbers || [],
                    quality: item.work_orders?.product_quality || item.product_quality || item.work_orders?.work_description || item.work_description || 'N/A',
                    amount: item.unit_price || item.amount || '0.00'
                };
                
                console.log('Mapped itemized bill item:', mappedItem);
                return mappedItem;
            });
        } else {
            // Use work orders data with correct field mapping
            console.log('=== DEBUGGING WORK ORDERS ===');
            console.log('Total work orders:', workOrders.length);
            console.log('Sample work order structure:', workOrders[0]);
            console.log('Bill amount for division:', bill.amount);
            
            // Log all work orders to see their structure
            workOrders.forEach((order, index) => {
                console.log(`Work Order ${index + 1}:`, {
                    id: order.id,
                    patient_name: order.patient_name,
                    product_quality: order.product_quality,
                    work_description: order.work_description,
                    tooth_numbers: order.tooth_numbers,
                    completion_date: order.completion_date,
                    order_date: order.order_date,
                    created_at: order.created_at
                });
            });
            
            const totalAmount = parseFloat(bill.amount || 0);
            const amountPerItem = workOrders.length > 0 && totalAmount > 0 
                ? (totalAmount / workOrders.length).toFixed(2) 
                : '0.00';
            
            console.log(`Dividing ${totalAmount} among ${workOrders.length} items = ${amountPerItem} each`);
            
            billItems = workOrders.map((order, index) => {
                console.log(`Mapping work order ${index + 1}:`, order);
                
                // Extract quality from multiple possible fields
                const quality = order.product_quality || order.work_description || order.quality || 'N/A';
                console.log(`Quality for order ${index + 1}:`, {
                    product_quality: order.product_quality,
                    work_description: order.work_description,
                    quality: order.quality,
                    final: quality
                });
                
                // Extract date from multiple possible fields
                const date = order.completion_date || order.order_date || order.created_at;
                
                const mappedItem = {
                    date: formatDate(date),
                    patient: order.patient_name || 'N/A',
                    toothPosition: order.tooth_numbers || [],
                    quality: quality,
                    amount: amountPerItem
                };
                
                console.log(`Final mapped item ${index + 1}:`, mappedItem);
                return mappedItem;
            });
            console.log('=== END DEBUGGING ===');
            console.log('Final bill items:', billItems);
        }
        
        const billContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Bill #${bill.serial_number}</title>
                <style>${getBillPrintStyles()}</style>
            </head>
            <body>
                ${generateCompanyHeader()}
                
                <div class="doctor-section">
                    <div class="doctor-name">🩺 Dr. ${bill.doctor_name}</div>
                </div>
                
                <div class="bill-info">
                    <p><strong>📋 Bill Number:</strong> ${bill.serial_number}</p>
                    <p><strong>📅 Bill Date:</strong> ${formatDate(bill.bill_date)}</p>
                    ${bill.notes ? `<p><strong>📝 Notes:</strong> ${bill.notes}</p>` : ''}
                </div>
                
                <div class="table-with-footer">
                    <table class="bill-table">
                        <thead>
                            <tr>
                                <th>📅 Date</th>
                                <th>👤 Patient Name</th>
                                <th>🦷 Tooth Position</th>
                                <th>⭐ Quality</th>
                                <th class="amount">💰 Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${billItems.map(item => `
                                <tr>
                                    <td>${item.date}</td>
                                    <td>${item.patient}</td>
                                    <td>${generateToothQuadrantDisplay(item.toothPosition)}</td>
                                    <td>${item.quality}</td>
                                    <td class="amount">₹${item.amount}</td>
                                </tr>
                            `).join('')}
                            <tr class="total-row">
                                <td colspan="4" style="text-align: right; padding-right: 20px;">
                                    <strong>🏆 GRAND TOTAL</strong>
                                </td>
                                <td class="amount">
                                    <strong>₹${bill.amount || '0.00'}</strong>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    
                
                </div>
            </body>
            </html>
        `;
        
        await printHtmlContent(billContent);
        
    } catch (error) {
        console.error('Error loading work orders for bill:', error);
    }
};

// Print initial bill (without amount) - for staff use
export const printInitialBill = async (bill) => {
    // using printHtmlContent

    try {
        console.log('Printing initial bill (without amount):', bill);

        let billItems = [];

        if (bill.is_grouped) {
            const response = await dentalLabService.getWorkOrdersByBillId(bill.id);
            if (!response || response.error || !response.data) {
                throw new Error('Unable to load work order details for initial bill');
            }
            const workOrders = response.data;
            billItems = workOrders.map((order) => {
                const quality = order.product_quality || order.work_description || 'N/A';
                const date = order.completion_date || order.order_date || order.created_at;
                return {
                    date: formatDate(date),
                    patient: order.patient_name || 'N/A',
                    toothPosition: order.tooth_numbers || [],
                    quality: quality,
                };
            });
        } else {
            let freshToothNumbers = bill.tooth_numbers || [];
            if (bill.work_order_id) {
                try {
                    const response = await dentalLabService.getWorkOrder(bill.work_order_id);
                    if (response.success && response.data?.tooth_numbers) {
                        freshToothNumbers = response.data.tooth_numbers;
                    }
                } catch (error) {
                    console.warn("Couldn't fetch fresh tooth numbers for individual bill:", error);
                }
            }
            billItems = [{
                date: formatDate(bill.completion_date || bill.bill_date),
                patient: bill.patient_name || 'N/A',
                toothPosition: freshToothNumbers,
                quality: bill.work_description || 'N/A',
            }];
        }
        
          const billContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Initial Bill #${bill.serial_number}</title>
                <style>${getBillPrintStyles()}</style>
            </head>
            <body>
                <div class="bill-container" style="page-break-after: auto;">
                    ${generateCompanyHeader()}
                    
                    <div class="doctor-section">
                        <div class="doctor-name">🩺 Dr. ${bill.doctor_name}</div>
                    </div>
                    
                    <div class="bill-info">
                        <p><strong>📋 Bill Number:</strong> ${bill.serial_number}</p>
                        <p><strong>📅 Bill Date:</strong> ${formatDate(bill.bill_date)}</p>
                        <p><strong>📝 Type:</strong> <span style="color: #2c5aa0; font-weight: bold;">INITIAL BILL (Product Delivery)</span></p>
                        ${bill.notes ? `<p><strong>📝 Notes:</strong> ${bill.notes}</p>` : ''}
                    </div>
                    
                    <div class="table-with-footer">
                        <table class="bill-table">
                            <thead>
                                <tr>
                                    <th>📅 Date</th>
                                    <th>👤 Patient Name</th>
                                    <th>🦷 Tooth Position</th>
                                    <th>⭐ Quality</th>
                                    <th>📝 Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${billItems.map(item => `
                                    <tr>
                                        <td>${item.date}</td>
                                        <td>${item.patient}</td>
                                        <td>${generateToothQuadrantDisplay(item.toothPosition)}</td>
                                        <td>${item.quality}</td>
                                        <td style="border-bottom: 1px dotted #ccc; min-height: 30px;">&nbsp;</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        await printHtmlContent(billContent);
        
    } catch (error) {
        console.error('Error printing initial bill:', error);
        alert('Error printing initial bill: ' + error.message);
    }
};

// Print final bill (with amount) - for payment at month end  
export const printFinalBill = async (bill) => {
    // This is essentially the existing grouped/single bill print functionality
    if (bill.is_grouped) {
        await handleGroupedBillPrint(bill);
    } else {
        await handleSingleBillPrint(bill);
    }
};

// Bulk print multiple bills in a single window
export const handleBulkBillPrint = async (bills) => {
    if (!bills || bills.length === 0) {
        alert('No bills selected for printing');
        return;
    }

    // using printHtmlContent
    try {
        // Generate content for each bill
        const billContents = await Promise.all(bills.map(async (bill, index) => {
            let billHtml = '';
            
            if (bill.is_grouped || bill.batch_id) {
                // Handle grouped bill
                try {
                    const response = await dentalLabService.getBillWorkOrders(bill.id);
                    const workOrders = response.data || [];
                    
                    let billItems = [];
                    const itemsResponse = await dentalLabService.getBillWithItems(bill.id);
                    
                    if (itemsResponse.success && itemsResponse.data.items && itemsResponse.data.items.length > 0) {
                        // Use itemized pricing data
                        billItems = itemsResponse.data.items.map(item => ({
                            date: formatDate(item.completion_date || item.created_at),
                            patient: item.work_orders?.patient_name || item.patient_name || 'N/A',
                            toothPosition: item.work_orders?.tooth_numbers || item.tooth_numbers || [],
                            quality: item.work_orders?.product_quality || item.product_quality || item.work_orders?.work_description || item.work_description || 'N/A',
                            amount: item.unit_price || item.amount || '0.00'
                        }));
                    } else {
                        // Use work orders data
                        const totalAmount = parseFloat(bill.amount || 0);
                        const amountPerItem = workOrders.length > 0 && totalAmount > 0 
                            ? (totalAmount / workOrders.length).toFixed(2) 
                            : '0.00';
                        
                        billItems = workOrders.map(order => ({
                            date: formatDate(order.completion_date || order.order_date || order.created_at),
                            patient: order.patient_name || 'N/A',
                            toothPosition: order.tooth_numbers || [],
                            quality: order.product_quality || order.work_description || order.quality || 'N/A',
                            amount: amountPerItem
                        }));
                    }
                    
                    billHtml = `
                       <div class="bill-container" style="page-break-inside: avoid; margin-bottom: 20px;">
                    ${generateCompanyHeader()}
                    <div class="doctor-section">
                        <div class="doctor-name">🩺 Dr. ${bill.doctor_name}</div>
                    </div>
                    <div class="bill-info">
                        <p><strong>📋 Bill Number:</strong> ${bill.serial_number}</p>
                        <p><strong>📅 Bill Date:</strong> ${formatDate(bill.bill_date)}</p>
                        <p><strong>📝 Type:</strong> <span style="font-weight: bold;">INITIAL BILL</span></p>
                    </div>
                    <table class="bill-table">
                        <thead>
                            <tr>
                                <th>📅 Date</th>
                                <th>👤 Patient Name</th>
                                <th>🦷 Tooth Position</th>
                                <th>⭐ Quality</th>
                                <th>📝 Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${billItems.map(item => `
                                <tr>
                                    <td>${item.date}</td>
                                    <td>${item.patient}</td>
                                    <td>${generateToothQuadrantDisplay(item.toothPosition)}</td>
                                    <td>${item.quality}</td>
                                    <td style="min-height: 30px;">&nbsp;</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                    `;
                } catch (error) {
                    console.error('Error processing grouped bill:', error);
                    billHtml = `<div class="error">Error loading bill ${bill.serial_number}</div>`;
                }
            } else {
                // Handle single bill
                billHtml = `
                    <div class="bill-container" style="page-break-after: ${index < bills.length - 1 ? 'always' : 'auto'}; margin-bottom: 40px;">
                        ${generateCompanyHeader()}
                        <div class="doctor-section">
                            <div class="doctor-name">🩺 Dr. ${bill.doctor_name}</div>
                        </div>
                        <div class="bill-info">
                            <p><strong>📋 Bill Number:</strong> ${bill.serial_number}</p>
                            <p><strong>📅 Bill Date:</strong> ${formatDate(bill.bill_date)}</p>
                            ${bill.notes ? `<p><strong>📝 Notes:</strong> ${bill.notes}</p>` : ''}
                        </div>
                        <div class="table-with-footer">
                            <table class="bill-table">
                                <thead>
                                    <tr>
                                        <th>📅 Date</th>
                                        <th>👤 Patient Name</th>
                                        <th>🦷 Tooth Position</th>
                                        <th>⭐ Quality</th>
                                        <th class="amount">💰 Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>${formatDate(bill.completion_date || bill.bill_date)}</td>
                                        <td>${bill.patient_name || 'N/A'}</td>
                                        <td>${generateToothQuadrantDisplay(bill.tooth_numbers)}</td>
                                        <td>${bill.work_description || 'N/A'}</td>
                                        <td class="amount">₹${bill.amount || '0.00'}</td>
                                    </tr>
                                    <tr class="total-row">
                                        <td colspan="4" style="text-align: right; padding-right: 20px;">
                                            <strong>🏆 GRAND TOTAL</strong>
                                        </td>
                                        <td class="amount">
                                            <strong>₹${bill.amount || '0.00'}</strong>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            
                          
                        </div>
                    </div>
                `;
            }
            
            return billHtml;
        }));

        // Use the enhanced styles with additional bulk print optimizations
        const bulkPrintStyles = getBillPrintStyles();

        const bulkBillContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Bulk Initial Bills Print</title>
                <style>${getBillPrintStyles()}</style>
            </head>
            <body>
                ${billContents.join('')}
                <div class="footer bulk-print-footer" style="display: none;">
                    <p>Generated on: ${formatDate(new Date())}</p>
                </div>
            </body>
            </html>
        `;
        
        await printHtmlContent(bulkBillContent);
        
    } catch (error) {
        console.error('Error in bulk bill printing:', error);
        alert('Error printing bills: ' + error.message);
    }
};
