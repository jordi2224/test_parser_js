// Load the configuration file
const response = await fetch('./config.json')
if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
}
const config = await response.json();

// Function to detect if a page contains a table and return its structure
export async function containsTable(page) {
    const textContent  = await page.getTextContent();
    const items = textContent.items.map(item => ({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5],
        width: item.width,
        height: item.height
    }));

    // Group by Y coordinate (rows)
    let rows = {};
    items.forEach(item => {
        let yKey = Math.round(item.y / 5) * 5; // bucket by ~5 units
        if (!rows[yKey]) rows[yKey] = [];
        rows[yKey].push(item);
    });

    // Check if rows align in columns
    let rowLengths = Object.values(rows).map(r => r.length);
    let avg = rowLengths.reduce((a, b) => a + b, 0) / rowLengths.length;

    // If many rows have a similar number of columns, assume table
    let consistentRows = rowLengths.filter(len => Math.abs(len - avg) <= 1);

    return (consistentRows.length > 5); // tweak threshold

}


export async function findTableByText(pdfDocument, targetText) {
    const numPages = pdfDocument.numPages;
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();
        const textItems = textContent.items.map(item => item.str);
        const fullText = textItems.join(' ');
        if (fullText.includes(targetText)) {
            return page;
        }
    }
    return null;
}


export async function universalTableExtract(page, test) {
    const targetText = test.Title;
    const columnCount = test.totalNumberOfColumns;
    const subtests = test.Subtests;


    const textContent  = await page.getTextContent();
    const items = textContent.items.map(item => ({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5],
        width: item.width,
        height: item.height
    }));

    const rowTolerance = config.tableExtraction.rowTolerance;

    // Group by Y coordinate (rows)
    let rows = {};
    for (let item of items) {
        let rowKey = Math.round(item.y / rowTolerance) * rowTolerance; // bucket by rowTolerance
        if (!rows[rowKey]){
            rows[rowKey] = [];
        }
        rows[rowKey].push(item);
    }
    // Sort rows by Y coordinate (top to bottom)
    let sortedRowKeys = Object.keys(rows).map(k => parseFloat(k)).sort((a, b) => b - a);
    let sortedRows = sortedRowKeys.map(k => rows[k]);
    // Sort items in each row by X coordinate (left to right)
    sortedRows = sortedRows.map(r => r.sort((a, b) => a.x - b.x));

    // For every text element, remove unwanted characters: parens, asterisks
    sortedRows = sortedRows.map(r => r.map(item => {
        let cleanedStr = item.str.replace(/[()*]/g, '').trim();
        return {...item, str: cleanedStr};
    }));
    // Remove rows that do not contain any of the target subtest names
    sortedRows = sortedRows.filter(r => r.some(item => subtests.includes(item.str)));
    // Delete elemnts that are just empty strings
    sortedRows = sortedRows.map(r => r.filter(item => item.str !== ''));

    if (targetText === "Subtest Score Summary") { // TODO make this dynamic based on config
        // If a row has more than 2 non numeric containing element, remove the first element
        sortedRows = sortedRows.map(r => {
            let nonNumericCount = r.filter(item => isNaN(item.str) && item.str !== '-' && !/^(\d+:\d+)$/.test(item.str)).length;
            if (nonNumericCount > 2) {
                return r.slice(1);
            }
            return r;
        });
    }
    // Verify that all rows now have the expected number of columns
    sortedRows.forEach((r, idx) => {
        if (r.length !== columnCount) {
            console.warn(`Row ${idx} has ${r.length} elements, expected 7.`);
        }
    });

    // Convert to a table indexed by subtest name
    let table = [];
    sortedRows.forEach(r => {
        let rowObj = {};
        rowObj['Subtest'] = r[0] ? r[0].str : '';
        rowObj['Abbreviation'] = r[1] ? r[1].str : '';
        // The rest of the columns are test.ScoreColumns
        test.ScoreColumns.forEach((colName, idx) => {
            rowObj[colName] = r[idx + 2] ? r[idx + 2].str : '';
        });
        table.push(rowObj);
    });
    
    return table;
}