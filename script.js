/**
 * Budzatja Invoice System - Complete Relational Engine
 */

// Initialize Cloud Connection Endpoints
const SUPABASE_URL = 'https://pvbkejoczfvhifwdzbln.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2Ymtlam9jemZ2aGlmd2R6YmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0OTIyNjQsImV4cCI6MjA5ODA2ODI2NH0.9WOa2QdbK2ISlV-n2AQygNxm3wb9V7v_B5c4O85-vRI'; 
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements Control Registry
const invoiceBody = document.getElementById('invoiceBody');
const addRowBtn = document.getElementById('addRow');
const generateInvoiceBtn = document.getElementById('generateInvoice');
const grandTotalDisplay = document.getElementById('grandTotal');

// Real-Time Mirror Form Wiring Hooks
const formCustomerName = document.getElementById('formCustomerName');
const formCustomerVat = document.getElementById('formCustomerVat');
const formAddress1 = document.getElementById('formAddress1');
const formAddress2 = document.getElementById('formAddress2');
const formAddress3 = document.getElementById('formAddress3');
const formInvoiceDate = document.getElementById('formInvoiceDate');

// Printable Text Targeting References
const printCustomerName = document.getElementById('printCustomerName');
const printCustomerVat = document.getElementById('printCustomerVat');
const printAddress1 = document.getElementById('printAddress1');
const printAddress2 = document.getElementById('printAddress2');
const printAddress3 = document.getElementById('printAddress3');
const printDocNo = document.getElementById('printDocNo');
const printDocDate = document.getElementById('printDocDate');

// Global Dashboard Metrics Nodes
const invoiceCountStat = document.getElementById('invoiceCount');
const totalRevenueStat = document.getElementById('totalRevenue');
const customerCountStat = document.getElementById('customerCount');

/* ==========================================================================
   Real-Time Data Mirroring Functionality
   ========================================================================== */
function setupLiveMirroring() {
    formCustomerName.addEventListener('input', (e) => {
        printCustomerName.innerText = e.target.value.trim() || '[Customer Name]';
    });
    formCustomerVat.addEventListener('input', (e) => {
        printCustomerVat.innerText = e.target.value.trim() || '--------';
    });
    formAddress1.addEventListener('input', (e) => { printAddress1.innerText = e.target.value.trim(); });
    formAddress2.addEventListener('input', (e) => { printAddress2.innerText = e.target.value.trim(); });
    formAddress3.addEventListener('input', (e) => { printAddress3.innerText = e.target.value.trim(); });
    
    formInvoiceDate.addEventListener('change', (e) => {
        if(!e.target.value) return;
        const d = new Date(e.target.value);
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        printDocDate.innerText = d.toLocaleDateString('en-ZA', options);
        
        // Generate document running series ID tracker reactively
        const monthStr = String(d.getMonth() + 1).padStart(2, '0');
        const yearStr = d.getFullYear();
        const trackingNum = "BST/T" + Math.floor(1000 + Math.random() * 9000) + "/" + monthStr + "/" + yearStr;
        printDocNo.innerText = trackingNum;
    });
}

/* ==========================================================================
   Row Operations & Calculations Management
   ========================================================================== */
function attachRowEventListeners(row) {
    row.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => calculateRowTotal(row));
    });
}

function calculateRowTotal(row) {
    const paxInput = row.querySelector('.row-pax');
    const priceInput = row.querySelector('.row-price');
    const lineTotalCell = row.querySelector('.lineTotal');

    // Extract numbers dynamically from strings like "5 Adults"
    let qty = 1;
    if(paxInput) {
        const match = paxInput.value.match(/\d+/);
        qty = match ? parseInt(match[0]) : 1;
    }
    
    const price = parseFloat(priceInput.value) || 0;
    const total = qty * price;

    lineTotalCell.innerText = `R${total.toFixed(2)}`;
    calculateGrandTotal();
}

function calculateGrandTotal() {
    let sum = 0;
    invoiceBody.querySelectorAll('tr').forEach(row => {
        const paxInput = row.querySelector('.row-pax');
        const priceInput = row.querySelector('.row-price');
        
        let qty = 1;
        if(paxInput) {
            const match = paxInput.value.match(/\d+/);
            qty = match ? parseInt(match[0]) : 1;
        }
        const price = parseFloat(priceInput.value) || 0;
        sum += qty * price;
    });
    grandTotalDisplay.innerText = `R${sum.toFixed(2)}`;
}

// Append rows inside our matrix sheet layout
addRowBtn.addEventListener('click', () => {
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td><input type="date" class="row-booked-date"></td>
        <td><input type="text" class="row-desc" placeholder="e.g. KNP Full Day Safari"></td>
        <td><input type="text" class="row-pax" placeholder="e.g. 6 Adult (International)"></td>
        <td><input type="number" class="row-price" value="0" min="0" step="0.01"></td>
        <td class="lineTotal" style="text-align: right; font-weight: 600;">R0.00</td>
        <td class="no-print" style="text-align: center;"><button class="delete-btn" type="button" style="background:none; border:none; color:#c0392b; cursor:pointer; font-weight:bold;">X</button></td>
    `;
    invoiceBody.appendChild(newRow);
    attachRowEventListeners(newRow);
});

invoiceBody.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
        e.target.closest('tr').remove();
        calculateGrandTotal();
    }
});

/* ==========================================================================
   Supabase Database Operations Transaction Controller
   ========================================================================== */
generateInvoiceBtn.addEventListener('click', async () => {
    const customerName = formCustomerName.value.trim();
    const vatNum = formCustomerVat.value.trim();
    const addr1 = formAddress1.value.trim();
    const addr2 = formAddress2.value.trim();
    const addr3 = formAddress3.value.trim();
    const invDate = formInvoiceDate.value;
    const currentTotal = parseFloat(grandTotalDisplay.innerText.replace('R', '')) || 0;
    const docNo = printDocNo.innerText;

    if (!customerName || !invDate || currentTotal <= 0) {
        alert('Please complete the Customer Name, Invoice Date, and add billable line items before processing.');
        return;
    }

    generateInvoiceBtn.innerText = "Syncing with Budzatja Invoice DB...";
    generateInvoiceBtn.disabled = true;

    try {
        // Step A: Upsert Customer Master Profile
        const { error: custError } = await supabase
            .from('customers')
            .upsert({ 
                name: customerName,
                vat_number: vatNum || null,
                address_line1: addr1 || null,
                address_line2: addr2 || null,
                address_line3: addr3 || null
            }, { onConflict: 'name' });

        if (custError) throw custError;

        // Step B: Insert Invoice High-Level Summary Record
        const { data: invoiceData, error: invError } = await supabase
            .from('invoices')
            .insert({
                invoice_number: docNo,
                customer_name: customerName,
                invoice_date: invDate,
                grand_total: currentTotal
            })
            .select()
            .single();

        if (invError) throw invError;

        // Step C: Compile dynamic row collection array metrics
        const rows = invoiceBody.querySelectorAll('tr');
        const itemsToInsert = [];

        rows.forEach(row => {
            const rowDate = row.querySelector('.row-booked-date').value || invDate;
            const rowDesc = row.querySelector('.row-desc').value.trim() || 'Safari Services';
            const rowPax = row.querySelector('.row-pax').value.trim() || '1 Person';
            const rowPrice = parseFloat(row.querySelector('.row-price').value) || 0;
            
            let qtyMultiplier = 1;
            const match = rowPax.match(/\d+/);
            if (match) qtyMultiplier = parseInt(match[0]);
            
            const lineSum = qtyMultiplier * rowPrice;

            itemsToInsert.push({
                invoice_id: invoiceData.id,
                booked_date: rowDate,
                service_description: rowDesc,
                guests: rowPax,
                price_per_person: rowPrice,
                line_total: lineSum
            });
        });

        const { error: itemsError } = await supabase
            .from('invoice_items')
            .insert(itemsToInsert);

        if (itemsError) throw itemsError;

        alert(`Invoice record ${docNo} successfully securely locked to cloud DB!`);
        
        await fetchDashboardMetrics();
        window.print();
        resetSystemForm();

    } catch (err) {
        console.error('Cloud Sync Execution Failure:', err);
        alert('Error mapping transaction context: ' + err.message);
    } finally {
        generateInvoiceBtn.innerText = "Save to Cloud & Print Document";
        generateInvoiceBtn.disabled = false;
    }
});

/* ==========================================================================
   State Aggregations Loader Engine
   ========================================================================== */
async function fetchDashboardMetrics() {
    try {
        const { data: invoiceData, error: invErr } = await supabase.from('invoices').select('grand_total');
        const { count: customerCount, error: custErr } = await supabase.from('customers').select('*', { count: 'exact', head: true });

        if (invErr || custErr) throw (invErr || custErr);

        const totalRevenue = invoiceData.reduce((acc, r) => acc + parseFloat(r.grand_total), 0);

        invoiceCountStat.innerText = invoiceData.length;
        totalRevenueStat.innerText = `R${totalRevenue.toFixed(2)}`;
        customerCountStat.innerText = customerCount || 0;
    } catch (err) {
        console.error('Error refreshing cloud application layout counters:', err.message);
    }
}

function resetSystemForm() {
    formCustomerName.value = ''; formCustomerVat.value = '';
    formAddress1.value = ''; formAddress2.value = ''; formAddress3.value = '';
    formInvoiceDate.value = '';
    
    printCustomerName.innerText = '[Customer Name]'; printCustomerVat.innerText = '--------';
    printAddress1.innerText = ''; printAddress2.innerText = ''; printAddress3.innerText = '';
    printDocNo.innerText = 'BST/TXXXX/XX/2026'; printDocDate.innerText = '-- April 2026';

    invoiceBody.innerHTML = `
        <tr>
            <td><input type="date" class="row-booked-date"></td>
            <td><input type="text" class="row-desc" placeholder="e.g. Transfer"></td>
            <td><input type="text" class="row-pax" placeholder="e.g. 5 Adults"></td>
            <td><input type="number" class="row-price" value="0" min="0" step="0.01"></td>
            <td class="lineTotal" style="text-align: right; font-weight: 600;">R0.00</td>
            <td class="no-print" style="text-align: center;"></td>
        </tr>
    `;
    attachRowEventListeners(invoiceBody.querySelector('tr'));
    calculateGrandTotal();
}

// Global System Launch Hook
document.addEventListener('DOMContentLoaded', () => {
    fetchDashboardMetrics();
    setupLiveMirroring();
    if (invoiceBody.querySelector('tr')) {
        attachRowEventListeners(invoiceBody.querySelector('tr'));
    }
});
