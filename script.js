/**
 * Budzatja Invoice System - Core Application Script
 */

// Global State Arrays to hold processed data across live browser session
let invoices = [];
let uniqueCustomers = new Set();
let totalRevenue = 0.00;

// DOM Element Registry 
const invoiceBody = document.getElementById('invoiceBody');
const addRowBtn = document.getElementById('addRow');
const generateInvoiceBtn = document.getElementById('generateInvoice');
const grandTotalDisplay = document.getElementById('grandTotal');

// Dashboard Stat Counters
const invoiceCountStat = document.getElementById('invoiceCount');
const totalRevenueStat = document.querySelectorAll('.dashboard .card h3')[1]; // Second dashboard card
const customerCountStat = document.querySelectorAll('.dashboard .card h3')[2]; // Third dashboard card

/* ==========================================================================
   Event Listeners Setup
   ========================================================================== */

// Handle dynamic appending of new item rows
addRowBtn.addEventListener('click', () => {
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td><input type="text" placeholder="e.g. KNP Full Day Safari"></td>
        <td><input type="number" class="qty" value="1" min="1"></td>
        <td><input type="number" class="price" value="0" min="0"></td>
        <td class="lineTotal">R0.00</td>
        <td><button class="delete-btn" type="button" style="background:none; border:none; color:#c0392b; cursor:pointer; font-weight:bold;">X</button></td>
    `;
    invoiceBody.appendChild(newRow);
    
    // Attach input listeners to the newly added row
    attachRowEventListeners(newRow);
    calculateGrandTotal();
});

// Capture and handle clicks on the dynamically generated row delete buttons
invoiceBody.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
        const row = e.target.closest('tr');
        row.remove();
        calculateGrandTotal();
    }
});

// Generate and finalize invoice transaction on click
generateInvoiceBtn.addEventListener('click', () => {
    const customerName = document.getElementById('customerName').value.trim();
    const invoiceDate = document.getElementById('invoiceDate').value;
    const currentTotal = parseFloat(grandTotalDisplay.innerText.replace('R', '')) || 0;

    // Validation Safeguards
    if (!customerName) {
        alert('Please enter a Customer Name before generating the invoice.');
        return;
    }
    if (!invoiceDate) {
        alert('Please select an Invoice Date.');
        return;
    }
    if (currentTotal <= 0) {
        alert('Please add at least one billable service with a price greater than R0.00.');
        return;
    }

    // Process tracking state mutations
    invoices.push({
        customer: customerName,
        date: invoiceDate,
        amount: currentTotal
    });
    
    uniqueCustomers.add(customerName);
    totalRevenue += currentTotal;

    // Commit changes straight to the dashboard visual cards
    updateDashboardMetrics();

    // Notify user and launch system
