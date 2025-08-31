const pdfjs = await import('/pdfjs-dist/build/pdf.mjs');

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

  // print the contents of the first page to console
  const page = await pdfDoc.getPage(1);
  const textContent = await page.getTextContent();
  console.log('Page 1 Text Content:', textContent.items.map(item => item.str).join(' '));


});
