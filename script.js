/**
 * Budzatja Invoice System - Cloud Enabled (Budzatja Invoice DB Implementation)
 */

// Initialize Supabase Client
const SUPABASE_URL = 'https://pvbkejoczfvhifwdzbln.supabase.co/rest/v1/'; 
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Element Registry 
const invoiceBody = document.getElementById('invoiceBody');
const addRowBtn = document.getElementById('addRow');
const generateInvoiceBtn = document.getElementById('generateInvoice');
const grandTotalDisplay = document.getElementById('grandTotal');

// Dashboard Stat Counters
const invoiceCountStat = document.getElementById('invoiceCount');
const totalRevenueStat = document.querySelectorAll('.dashboard .card h3')[1];
const customerCountStat = document.querySelectorAll('.dashboard .card h3')[2];

/* ==========================================================================
   Event Listeners Setup
   ========================================================================== */

// Initialize Dashboard Metrics from DB on application startup
document.addEventListener('DOMContentLoaded', fetchDashboardMetrics);

addRowBtn.addEventListener('click', () => {
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td><input type="date" class="booked-date"></td>
        <td><input type="text" placeholder="e.g. KNP Full Day Safari"></td>
        <td><input type="number" class="qty" value="1" min="1"></td>
        <td><input type="number" class="price" value="0" min="0"></td>
        <td class="lineTotal">R0.00</td>
        <td><button class="delete-btn no-print" type="button" style="background:none; border:none; color:#c0392b; cursor:pointer; font-weight:bold;">X</button></td>
    `;
    invoiceBody.appendChild(newRow);
    attachRowEventListeners(newRow);
    calculateGrandTotal();
});

invoiceBody.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
        e.target.closest('tr').remove();
        calculateGrandTotal();
    }
});

generateInvoiceBtn.addEventListener('click', async () => {
    const customerName = document.getElementById('customerName').value.trim();
    const invoiceDate = document.getElementById('invoiceDate').value;
    const currentTotal = parseFloat(grandTotalDisplay.innerText.replace('R', '')) || 0;
    
    // Automatically generate a document tracking number matching standard prefix styles
    const invoiceNumber = "BST/T" + Date.now().toString().slice(-4) + "/" + (invoiceDate ? invoiceDate.split('-')[1] + "/" + invoiceDate.split('-')[0] : "2026");

    // Validation Safeguards
    if (!customerName || !invoiceDate || currentTotal <= 0) {
        alert('Please fully complete the Customer Name, Invoice Date, and add billable services.');
        return;
    }

    generateInvoiceBtn.innerText = "Syncing with Budzatja Invoice DB...";
    generateInvoiceBtn.disabled = true;

    try {
        // Step A: Upsert Customer record (Insert or do nothing if they already exist in cloud indexes)
        const { error: custError } = await supabase
            .from('customers')
            .upsert({ name: customerName }, { onConflict: 'name' });

        if (custError) throw custError;

        // Step B: Write master Invoice entry
        const { data: invoiceData, error: invError } = await supabase
            .from('invoices')
            .insert({
                invoice_number: invoiceNumber,
                customer_name: customerName,
                invoice_date: invoiceDate,
                grand_total: currentTotal,
                deposit_percentage: 0,
                deposit_amount: 0
            })
            .select()
            .single();

        if (invError) throw invError;

        // Step C: Batch compile and commit all nested Line Items 
        const lineItemRows = invoiceBody.querySelectorAll('tr');
        const itemsToInsert = [];

        lineItemRows.forEach(row => {
            const bookedDate = row.querySelector('.booked-date').value || invoiceDate;
            const desc = row.querySelector('input[type="text"]').value.trim() || 'Safari Service';
            const qty = parseInt(row.querySelector('.qty').value) || 0;
            const price = parseFloat(row.querySelector('.price').value) || 0;
            const lineTotal = qty * price;

            if (qty > 0) {
                itemsToInsert.push({
                    invoice_id: invoiceData.id,
                    booked_date: bookedDate,
                    service_description: desc,
                    guests: qty,
                    price_per_person: price,
                    line_total: lineTotal
                });
            }
        });

        const { error: itemsError } = await supabase
            .from('invoice_items')
            .insert(itemsToInsert);

        if (itemsError) throw itemsError;

        alert(`Invoice ${invoiceNumber} successfully saved to Budzatja Invoice DB!`);
        
        await fetchDashboardMetrics();
        window.print();
        resetInvoiceForm();

    } catch (err) {
        console.error('Database Operation Failure:', err);
        alert('Cloud sync failed: ' + err.message);
    } finally {
        generateInvoiceBtn.innerText = "Generate & Save Invoice";
        generateInvoiceBtn.disabled = false;
    }
});

/* ==========================================================================
   Calculation & Cloud Sync Aggregations Engine
   ========================================================================== */

async function fetchDashboardMetrics() {
    try {
        const { data: invoiceData, error: invErr } = await supabase
            .from('invoices')
            .select('grand_total');
        
        const { count: customerCount, error: custErr } = await supabase
            .from('customers')
            .select('*', { count: 'exact', head: true });

        if (invErr || custErr) throw (invErr || custErr);

        const invoiceCount = invoiceData.length;
        const totalRevenue = invoiceData.reduce((acc, row) => acc + parseFloat(row.grand_total), 0);

        invoiceCountStat.innerText = invoiceCount;
        totalRevenueStat.innerText = `R${totalRevenue.toFixed(2)}`;
        customerCountStat.innerText = customerCount || 0;

    } catch (err) {
        console.error('Error fetching dashboard historical data:', err.message);
    }
}

function calculateRowTotal(row) {
    const qty = parseFloat(row.querySelector('.qty').value) || 0;
    const price = parseFloat(row.querySelector('.price').value) || 0;
    row.querySelector('.lineTotal').innerText = `R${(qty * price).toFixed(2)}`;
    calculateGrandTotal();
}

function calculateGrandTotal() {
    let sum = 0;
    invoiceBody.querySelectorAll('tr').forEach(row => {
        const qty = parseFloat(row.querySelector('.qty').value) || 0;
        const price = parseFloat(row.querySelector('.price').value) || 0;
        sum += qty * price;
    });
    grandTotalDisplay.innerText = `R${sum.toFixed(2)}`;
}

function attachRowEventListeners(row) {
    row.querySelector('.qty').addEventListener('input', () => calculateRowTotal(row));
    row.querySelector('.price').addEventListener('input', () => calculateRowTotal(row));
}

function resetInvoiceForm() {
    document.getElementById('customerName').value = '';
    document.getElementById('invoiceDate').value = '';
    invoiceBody.innerHTML = `
        <tr>
            <td><input type="date" class="booked-date"></td>
            <td><input type="text" placeholder="e.g. KNP Full Day Safari"></td>
            <td><input type="number" class="qty" value="1" min="1"></td>
            <td><input type="number" class="price" value="0" min="0"></td>
            <td class="lineTotal">R0.00</td>
            <td class="no-print"></td>
        </tr>
    `;
    attachRowEventListeners(invoiceBody.querySelector('tr'));
    calculateGrandTotal();
}

if (invoiceBody.querySelector('tr')) {
    attachRowEventListeners(invoiceBody.querySelector('tr'));
}
