// Load the configuration file
const response = await fetch('./config.json')
if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
}
const config = await response.json();

const pdfjs = await import('/pdfjs-dist/build/pdf.mjs');

import { containsTable, findTableByText, universalTableExtract } from './pdf_extractor.js';

pdfjs.GlobalWorkerOptions.workerSrc = 'http://localhost:8080/pdfjs-dist/build/pdf.worker.mjs';

const $ = (sel) => document.querySelector(sel);
const pdfInput = $('#pdfInput');
const parseBtn = $('#parseBtn');
const downloadBtn = $('#downloadBtn');
const scaleInput = $('#scale');
const pagesInput = $('#pages');
const rowTolInput = $('#rowTol');
const mergeGapInput = $('#mergeGap');

const pdfFrame = $('#pdfFrame');
const tableWrap = $('#tableWrap');
const meta = $('#meta');

let lastRows = [];
let pdfDoc = null;
let currentPage = 1;
let numPages = 0;



// Listener for PDF file input
pdfInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    alert('Please select a PDF file.');
    return;
  }
  const arrayBuffer = await file.arrayBuffer();
  pdfDoc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  console.log('PDF loaded:', pdfDoc);

  const output_wb = XLSX.utils.book_new();
  // For every table to search
    for (const test of config.WISC.WISCTables) {
        const tableText = test.Title;
        console.log(`Searching for table with text: "${tableText}"`);
        const page = await findTableByText(pdfDoc, tableText);
        if (page) {
            console.log(`Found "${tableText}" on page ${page.pageNumber}`);
        } else {
            console.alert(`"${tableText}" not found in document.`);
        }

        let table = await universalTableExtract(page, test);
        // Convert the table to an array of arrays for XLSX
        let tableArray = [];
        // Add header row
        tableArray.push(Object.keys(table[0]));
        // Add data rows
        table.forEach(row => {
            tableArray.push(Object.values(row));
        });
        const ws = XLSX.utils.aoa_to_sheet(tableArray);
        XLSX.utils.book_append_sheet(output_wb, ws, test.Title.substring(0, 30) ); // Sheet names max 31 chars

    }

    XLSX.writeFile(output_wb, "extracted_tables.xlsx");
    /*
    // Test for xlsx export
    const wb = XLSX.utils.book_new();
    let row = [
        { v: "Courier: 24", t: "s", s: { font: { name: "Courier", sz: 24 } } },
        { v: "bold & color", t: "s", s: { font: { bold: true, color: { rgb: "FF0000" } } } },
        { v: "fill: color", t: "s", s: { fill: { fgColor: { rgb: "E9E9E9" } } } },
        { v: "line\nbreak", t: "s", s: { alignment: { wrapText: true } } },
    ];
    const ws = XLSX.utils.aoa_to_sheet([row]);
    // Ensure the worksheet name is unique by appending a timestamp
    const sheetName = `Test_${Date.now()}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, "test.xlsx");
    */
});
