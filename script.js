// Load the configuration file
const response = await fetch('./config.json')
if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
}
const config = await response.json();

const pdfjs = await import('./pdfjs-dist/build/pdf.mjs');

import { containsTable, findTableByText, universalTableExtract, getTestMetadata } from './pdf_extractor.js';
import { wiscTableConstructor } from './table_constructor.js';

pdfjs.GlobalWorkerOptions.workerSrc = './pdfjs-dist/build/pdf.worker.mjs';

const $ = (sel) => document.querySelector(sel);
const pdfInput = $('#pdfInput');
const parseBtn = $('#parseBtn');
const downloadBtn = $('#downloadBtn');
const errorText = $('#errorText');
const successText = $('#successText');
const testInfoTable = $('#testInfoTable');
const testType = $('#testType');
const patientName = $('#patientName');
const testDate = $('#testDate');
const scaleInput = $('#scale');
const pagesInput = $('#pages');
const rowTolInput = $('#rowTol');
const mergeGapInput = $('#mergeGap');

const pdfFrame = $('#pdfFrame');
const viewerContainer = $('#viewerContainer');
const tableWrap = $('#tableWrap');
const meta = $('#meta');
const placeholderMessage = $('#placeholderMessage');

let lastRows = [];
let pdfDoc = null;
let currentPage = 1;
let numPages = 0;

let output_wb = null;

// Listener for PDF file input
pdfInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    alert('Please select a PDF file.');
    return;
  }

  output_wb = null; // Reset output workbook
  testInfoTable.style.display = 'none';
  errorText.style.display = 'none';
  successText.style.display = 'none';
  downloadBtn.className = 'ghost';
  downloadBtn.disabled = true;
  
  // Hide placeholder and show PDF viewer
  placeholderMessage.style.display = 'none';
  
  // Create a blob URL for the selected PDF
  const pdfUrl = URL.createObjectURL(file);
  
  // Load the PDF into the iframe viewer
  const pdfFrame = $('#pdfFrame');
  pdfFrame.src = `./pdfjs-dist/web/viewer.html?file=${encodeURIComponent(pdfUrl)}`;
  pdfFrame.style.display = 'block'; // Show the iframe
  
  // Show the PDF viewer now that a file has been loaded
  viewerContainer.style.display = 'block';
  
  const arrayBuffer = await file.arrayBuffer();
  pdfDoc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  console.log('PDF loaded:', pdfDoc);

  const testMetadata = await getTestMetadata(pdfDoc);
  
  if (testMetadata.testType && testMetadata.patientName && testMetadata.testDate ) {
    console.log('Test Metadata:', testMetadata);
    testType.textContent = testMetadata.testType.TestName || 'Unknown Test';
    patientName.textContent = testMetadata.patientName || 'Unknown Name';
    testDate.textContent = testMetadata.testDate || 'Unknown Date';

    // Show the test info table and hide error text
    testInfoTable.style.display = 'table';
    errorText.style.display = 'none';
    
  } else {
    // Hide the test info table and show error text
    testInfoTable.style.display = 'none';
    errorText.style.display = 'block';
    successText.style.display = 'none';
    // Change the download button back to ghost and disable it
    downloadBtn.className = 'ghost';
    downloadBtn.disabled = true;
  }

  let testResults = {};
  // For every table to search
    for (const test of config.WISC.WISCTables) {
        const tableText = test.Title;
        console.log(`Searching for table with text: "${tableText}"`);
        const page = await findTableByText(pdfDoc, tableText);
        if (page) {
            console.log(`Found "${tableText}" on page ${page.pageNumber}`);
        } else {
            console.error(`"${tableText}" not found in document.`);
        }

        let table = await universalTableExtract(page, test);

        if (!table || table.length === 0) {
            console.warn(`No table extracted for "${tableText}"`);
            continue;
        }

        testResults[tableText] = table;

        // Convert the table to an array of arrays for XLSX
        let tableArray = [];
        // Add header row
        tableArray.push(Object.keys(table[0]));
        // Add data rows
        table.forEach(row => {
            tableArray.push(Object.values(row));
        }); // Sheet names max 31 chars
    }

    // Construct final structure and validate
    if (testMetadata.testType && testMetadata.testType.TestName === 'WISC') {
        try {
            output_wb = wiscTableConstructor(testResults);
        } catch (e) {
            console.error('Error in table construction:', e);
            errorText.textContent = `Error in table construction: ${e.message}`;
            errorText.style.display = 'block';
            successText.style.display = 'none';
            return;
        }
    }

    // TODO error check, for now we assume this worked
    // Enable the download button
    downloadBtn.disabled = false;
    // Change the class to primary
    downloadBtn.className = 'primary';
    successText.style.display = 'block';
    return;

});

downloadBtn.addEventListener('click', async () => {

    if (!pdfDoc) {
    alert('Please select a PDF file first.');
    return;
    }

    XLSX.writeFile(output_wb, "extracted_tables.xlsx");
    return;
});
