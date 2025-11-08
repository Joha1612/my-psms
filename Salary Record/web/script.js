// UPDATED script.js — পেস্ট করে পুরাতনটির জায়গায় রাখুন

document.addEventListener('DOMContentLoaded', function () {
  // তারিখ ফিল্ডে আজকের তারিখ সেট করুন
  const dateInput = document.getElementById('date');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

  loadJS();            // jsPDF লাইব্রেরি লোড
  fetchTotalDue();     // মোট বকেয়া লোড
  loadTableData();     // টেবিল ডেটা লোড
  setupEventListeners(); // ইভেন্ট লিসেনার সেটআপ
});

// ========================
// CONFIG: এখানে আপনার API URL দিন (যদি আলাদা হোস্টে থাকে)
const endpoint = '/api'; // <-- যদি API অন্য জায়গায় থাকে: 'https://your-api.example.com/api'
// ========================

// গ্লোবাল ভেরিয়েবল
let currentPage = 1;
const rowsPerPage = 12;
let allData = [];

// ইভেন্ট লিসেনার সেটআপ
function setupEventListeners() {
  document.getElementById('amountPayable')?.addEventListener('input', calculateDue);
  document.getElementById('salaryForm')?.addEventListener('submit', submitSalaryData);
  document.getElementById('prevPage')?.addEventListener('click', prevPage);
  document.getElementById('nextPage')?.addEventListener('click', nextPage);
  document.querySelector('.filter-btn')?.addEventListener('click', applyFilters);
  document.querySelector('.cancel-btn')?.addEventListener('click', resetFilters);
}

// ছোট ব্যবহারিক helper — বিভিন্ন key নাম support করে
function getField(obj, ...keys) {
  for (const k of keys) {
    if (obj == null) continue;
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return '';
}

// বেতন ও প্রদেয় অর্থ থেকে বকেয়া হিসাব (লোকাল ক্যালকুলেশন)
function calculateDue() {
  const salary = parseFloat(document.getElementById('salaryAmount')?.value || 0) || 0;
  const payable = parseFloat(document.getElementById('amountPayable')?.value || 0) || 0;
  const due = salary - payable;
  const el = document.getElementById('monthlyDue');
  if (el) el.value = (due >= 0 ? due.toFixed(2) : '0.00');
}

// মোট বকেয়া ফেচ (API থেকে)
async function fetchTotalDue() {
  try {
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error('Network error');
    const data = await response.json();
    const total = Number(data.totalDue || 0);
    const totalInput = document.getElementById('totalDue');
    const totalDisplay = document.getElementById('displayTotalDue');
    if (totalInput) totalInput.value = total.toFixed(2);
    if (totalDisplay) totalDisplay.textContent = total.toFixed(2);
  } catch (error) {
    console.error('Total due fetch error:', error);
  }
}

// ডেটা লোড ও টেবিল আপডেট
async function loadTableData() {
  const month = document.getElementById('filterMonth')?.value || '';
  const year = document.getElementById('filterYear')?.value || '';
  let url = `${endpoint}?action=read`;
  if (month) url += `&month=${encodeURIComponent(month)}`;
  if (year) url += `&year=${encodeURIComponent(year)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network error');
    const data = await response.json();
    allData = data.entries || [];
    currentPage = 1;
    updateTable();
  } catch (error) {
    console.error('Error loading data:', error);
    showMessage('ডাটা লোড করতে সমস্যা হয়েছে', 'error');
  }
}

// টেবিল আপডেট (পেজ অনুযায়ী)
function updateTable() {
  const tbody = document.querySelector('#salaryTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const startIdx = (currentPage - 1) * rowsPerPage;
  const reversedData = [...allData].reverse(); // Latest entries first
  const paginatedData = reversedData.slice(startIdx, startIdx + rowsPerPage);
  let totalDue = 0;

  if (paginatedData.length > 0) {
    paginatedData.forEach(row => {
      const tr = document.createElement('tr');

      // read fields supporting multiple naming conventions
      const dateVal = getField(row, 'Date', 'date');
      const monthVal = getField(row, 'Month', 'month');
      const yearVal = getField(row, 'Year', 'year');
      const amountPayable = parseFloat(getField(row, 'amountPayable', 'Amount payable', 'amount_payable')) || 0;
      const monthlyDue = parseFloat(getField(row, 'monthlyDue', 'Monthly due', 'monthly_due')) || 0;

      // styling based on due
      if (monthlyDue === 0) {
        tr.style.backgroundColor = '#d4edda'; // light green
        tr.style.color = '#155724';
      } else {
        tr.style.backgroundColor = '#f8d7da'; // light red
        tr.style.color = '#721c24';
      }

      tr.innerHTML = `
        <td>${formatDate(dateVal)}</td>
        <td>${monthVal || ''}</td>
        <td>${yearVal || ''}</td>
        <td>${amountPayable || '0'}</td>
        <td>${monthlyDue || '0'}</td>
      `;
      tbody.appendChild(tr);
      totalDue += monthlyDue;
    });
  } else {
    tbody.innerHTML = '<tr><td colspan="6">কোনো ডাটা পাওয়া যায়নি</td></tr>';
  }

  updatePaginationControls();
  updateTotalDueDisplay(totalDue);
}

// Pagination & Total
function updatePaginationControls() {
  const totalPages = Math.max(1, Math.ceil(allData.length / rowsPerPage));
  document.getElementById('pageInfo').textContent = `page ${currentPage} / ${totalPages}`;
  document.getElementById('prevPage').disabled = currentPage === 1;
  document.getElementById('nextPage').disabled = currentPage >= totalPages;
}

function updateTotalDueDisplay(totalDue) {
  const totalInput = document.getElementById('totalDue');
  const totalDisplay = document.getElementById('displayTotalDue');
  if (totalInput) totalInput.value = totalDue.toFixed(2);
  if (totalDisplay) totalDisplay.textContent = totalDue.toFixed(2);
}

// Pagination actions
function nextPage() {
  const totalPages = Math.ceil(allData.length / rowsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    updateTable();
  }
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    updateTable();
  }
}

// Filter actions
function applyFilters() {
  loadTableData();
}

function resetFilters() {
  const fm = document.getElementById('filterMonth'); if (fm) fm.value = '';
  const fy = document.getElementById('filterYear'); if (fy) fy.value = '';
  loadTableData();
  showMessage('ফিল্টার ক্যান্সেল করা হয়েছে', 'success');
}

// Form submit (POST to /api)
async function submitSalaryData(event) {
  event.preventDefault();
  const form = document.getElementById("salaryForm");
  if (!form) return;
  const formData = new FormData(form);

  // read basic values
  const date = formData.get("date") || formData.get("Date") || '';
  const year = formData.get("year") || formData.get("Year") || '';
  const month = formData.get("month") || formData.get("Month") || '';
  const amountPayable = parseFloat(formData.get("amountPayable") || formData.get("Amount payable") || 0) || 0;
  const fixedSalary = parseFloat(formData.get("salaryAmount") || formData.get("Salary Amount") || 0) || 0;

  try {
    // fetch existing month entries to compute cumulative paid
    const resp = await fetch(`${endpoint}?action=read&month=${encodeURIComponent(month)}&year=${encodeURIComponent(year)}`);
    const existing = await resp.json();
    const entries = existing.entries || [];

    const paidSoFar = entries.reduce((sum, e) => {
      return sum + (parseFloat(getField(e, 'amountPayable', 'Amount payable', 'amount_payable')) || 0);
    }, 0);

    const totalPaid = paidSoFar + amountPayable;
    const monthlyDue = Math.max(fixedSalary - totalPaid, 0);

    // calculate totalDue across months (re-using calculateTotalDue logic)
    const totalDue = await calculateTotalDue(month, year, amountPayable, fixedSalary);

    // set fields expected by API (use names matching API)
    formData.set('Date', date);
    formData.set('Year', year);
    formData.set('Month', month);
    formData.set('Payment type', formData.get('paymentType') || formData.get('Payment type') || '');
    formData.set('Salary Amount', fixedSalary.toFixed(2));
    formData.set('Amount payable', amountPayable.toFixed(2));
    formData.set('Monthly due', monthlyDue.toFixed(2));
    formData.set('Total due', totalDue.toFixed(2));
    formData.set('Comment', formData.get('comment') || formData.get('Comment') || '');

    // submit to API
    const submitResponse = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    const result = await submitResponse.text();
    if (result && result.includes('Success')) {
      showMessage("সফলভাবে সাবমিট হয়েছে", "success");
      form.reset();
      fetchTotalDue();
      loadTableData();
    } else {
      throw new Error(result || 'Server error');
    }
  } catch (error) {
    console.error("Submission Error:", error);
    showMessage("সাবমিট করতে সমস্যা হয়েছে", "error");
  }
}

// মাসভিত্তিক ও মোট বকেয়া হিসাব
async function calculateTotalDue(currentMonth, currentYear, currentPayable, currentSalary) {
  try {
    const response = await fetch(`${endpoint}?action=read`);
    const data = await response.json();
    const allEntries = data.entries || [];

    // add the new pending entry
    const extendedEntries = [...allEntries, {
      month: currentMonth,
      year: currentYear,
      amountPayable: currentPayable,
      salaryAmount: currentSalary
    }];

    const paidMap = {};
    const salaryMap = {};
    const finalMonthDue = {};

    for (const entry of extendedEntries) {
      const monthKey = getField(entry, 'month', 'Month');
      const yearKey = getField(entry, 'year', 'Year');
      const key = `${monthKey}_${yearKey}`;
      const paid = parseFloat(getField(entry, 'amountPayable', 'Amount payable', 'amount_payable')) || 0;
      const salary = parseFloat(getField(entry, 'salaryAmount', 'Salary Amount', 'salary_amount')) || 0;

      paidMap[key] = (paidMap[key] || 0) + paid;
      // prefer existing salary if present; otherwise set to salary (last one wins)
      salaryMap[key] = salaryMap[key] || salary;
      finalMonthDue[key] = Math.max((salaryMap[key] || 0) - (paidMap[key] || 0), 0);
    }

    return Object.values(finalMonthDue).reduce((sum, d) => sum + (d || 0), 0);
  } catch (err) {
    console.error('calculateTotalDue error', err);
    return 0;
  }
}

// Date format helper
function formatDate(dateString) {
  if (!dateString) return '';
  // if dateString already in DD-MM-YYYY, return as is
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) return dateString;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
}

// Message
function showMessage(text, type) {
  const messageEl = document.getElementById('message');
  if (!messageEl) {
    alert(text);
    return;
  }
  messageEl.className = type;
  messageEl.textContent = text;
  messageEl.style.display = 'block';
  setTimeout(() => messageEl.style.display = 'none', 5000);
}

// jsPDF loader
function loadJS() {
  if (!document.querySelector('script[src*="jspdf"]')) {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    document.head.appendChild(script);
  }
  if (!document.querySelector('script[src*="autotable"]')) {
    const script2 = document.createElement('script');
    script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js';
    document.head.appendChild(script2);
  }
}

// generateReport (table for report area)
function generateReport() {
  const monthYearMap = {};
  let totalDue = 0;

  // use allData to pick latest entry per month-year
  allData.forEach(entry => {
    const key = `${getField(entry,'month','Month')}_${getField(entry,'year','Year')}`;
    monthYearMap[key] = entry;
  });

  const tbody = document.querySelector('#reportTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  Object.values(monthYearMap).forEach(entry => {
    const due = parseFloat(getField(entry, 'monthlyDue', 'Monthly due', 'monthly_due')) || 0;
    const month = getField(entry, 'month', 'Month');
    const year = getField(entry, 'year', 'Year');

    let statusText = due === 0 ? 'Paid' : `Due: ${due.toFixed(2)} Taka`;
    let statusColor = due === 0 ? 'green' : 'red';
    if (due !== 0) totalDue += due;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${month}</td>
      <td>${year}</td>
      <td style="color:${statusColor}; font-weight:bold;">${statusText}</td>
    `;
    tbody.appendChild(tr);
  });

  const totalDueElement = document.getElementById('reportTotalDue');
  if (totalDueElement) totalDueElement.textContent = `Total Due: ${totalDue.toFixed(2)} Taka`;
}

// generate PDF from salaryTable
async function generatePDF() {
  if (!window.jspdf) {
    alert('PDF লাইব্রেরি লোড হচ্ছে, অনুগ্রহ করে একটু অপেক্ষা করুন এবং আবার চেষ্টা করুন।');
    loadJS();
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Salary Report", 14, 15);

  const date = new Date();
  const formattedDate = date.toLocaleDateString('en-GB');
  doc.setFontSize(10);
  doc.text(`Date: ${formattedDate}`, 14, 22);

  const table = document.getElementById("salaryTable");
  if (!table) { alert('কোনো ডাটা নেই'); return; }

  const headers = [];
  table.querySelectorAll("thead tr th").forEach(th => headers.push(th.innerText.trim()));
  const rows = [];
  table.querySelectorAll("tbody tr").forEach(tr => {
    const row = [];
    tr.querySelectorAll("td").forEach(td => row.push(td.innerText.trim()));
    if (row.length) rows.push(row);
  });

  if (rows.length === 0) { alert('কোনো রিপোর্ট ডেটা পাওয়া যায়নি!'); return; }

  doc.autoTable({
    startY: 30,
    head: [headers],
    body: rows,
    styles: { font: 'helvetica', fontSize: 10 },
    headStyles: { fillColor: [0, 102, 204] },
  });

  const totalDueText = document.getElementById("reportTotalDue")?.textContent || '';
  doc.setFontSize(12);
  doc.setTextColor(255, 0, 0);
  doc.text(totalDueText, 14, doc.lastAutoTable.finalY + 10);

  doc.save("salary_report.pdf");
}

// generate filtered report PDF (uses reportTable visible rows)
async function generateFilteredReportPDF() {
  if (!window.jspdf) {
    alert('PDF লাইব্রেরি লোড হচ্ছে, অনুগ্রহ করে একটু অপেক্ষা করুন এবং আবার চেষ্টা করুন।');
    loadJS();
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Salary Report", 14, 15);

  const date = new Date();
  const formattedDate = date.toLocaleDateString('en-GB');
  doc.setFontSize(10);
  doc.text(`Date: ${formattedDate}`, 14, 22);

  const table = document.getElementById("reportTable");
  if (!table) { alert('কোনো রিপোর্ট টেবিল পাওয়া যায়নি'); return; }

  const headers = [];
  table.querySelectorAll("thead tr th").forEach(th => headers.push(th.innerText.trim()));
  const rows = [];
  table.querySelectorAll("tbody tr").forEach(tr => {
    if (tr.style.display !== "none") {
      const row = [];
      tr.querySelectorAll("td").forEach(td => row.push(td.innerText.trim()));
      if (row.length) rows.push(row);
    }
  });

  if (rows.length === 0) { alert('No filtered data found for PDF.'); return; }

  doc.autoTable({
    startY: 30,
    head: [headers],
    body: rows,
    styles: { font: 'helvetica', fontSize: 10 },
    headStyles: { fillColor: [0, 102, 204] },
  });

  const totalDueText = document.getElementById("reportTotalDue")?.textContent || '';
  doc.setFontSize(12);
  doc.setTextColor(255, 0, 0);
  doc.text(totalDueText, 14, doc.lastAutoTable.finalY + 10);

  doc.save("filtered_salary_report.pdf");
}

// Report filter functions (for reportTable)
function applyFilters1() {
  const filterType = document.getElementById("filterType")?.value || '';
  const filterYear = document.getElementById("filterYear1")?.value || '';

  const table = document.getElementById("reportTable");
  if (!table) return;
  const rows = table.querySelectorAll("tbody tr");

  rows.forEach(row => {
    const status = row.querySelector("td:nth-child(3)")?.textContent.trim() || '';
    const year = row.querySelector("td:nth-child(2)")?.textContent.trim() || '';

    let show = true;
    if (filterType && !status.includes(filterType)) show = false;
    if (filterYear && filterYear !== year) show = false;

    row.style.display = show ? "" : "none";
  });
}

function resetFilters2() {
  const ft = document.getElementById("filterType"); if (ft) ft.value = '';
  const fy = document.getElementById("filterYear1"); if (fy) fy.value = '';
  applyFilters1();
}
