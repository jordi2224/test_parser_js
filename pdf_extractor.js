// Load the configuration file
const response = await fetch('./config.json')
if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
}
const config = await response.json();


export async function getTestType(pdfDocument) {
    // Show the "TestName" of all config JSON entries
    for (const testSuiteKey in config) {
        const testSuite = config[testSuiteKey];
        const testName = testSuite.TestName;
        console.log(`Checking for test: ${testName}`);

        // Check if the testName is found on any page of the PDF
        for (var pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
            const page = await pdfDocument.getPage(pageNum);
            const textContent = await page.getTextContent();
            const textItems = textContent.items.map(item => item.str);
            const fullText = textItems.join(' ');
            if (fullText.includes(testName)) {
                console.log(`Detected test type: ${testName} on page ${pageNum}`);
                return testSuite;
            }
        }
    }

}

export async function getPatientName(pdfDocument, test) {
    // This might have to be test-specific, for now we'll assume consistent format
    const page = await pdfDocument.getPage(1);
    const textContent = await page.getTextContent();

    const sortedRows = mergeCloseRows(textContent, 5); // TODO config param
    // Find a row that contains "Examinee Name" or similar
    for (let row of sortedRows) {
        for (let item of row) {
            if (item.str.toLowerCase().includes('examinee name')) {
                // Assume the name is in the next non empty item in the row
                let nameIdx = row.indexOf(item) + 1;
                while (nameIdx < row.length) {
                    const nameCandidate = row[nameIdx].str.trim();
                    if (nameCandidate) {
                        return nameCandidate;
                    }
                    nameIdx++;
                }
            }
        }
    }
    console.warn('Could not find patient name in the document.');
    return null;
}

export async function getTestDate(pdfDocument, test) {
    // This might have to be test-specific, for now we'll assume consistent format
    const page = await pdfDocument.getPage(1);
    const textContent = await page.getTextContent();

    const sortedRows = mergeCloseRows(textContent, 5); // TODO config param
    // Find a row that contains "Date of Report" or similar
    for (let row of sortedRows) {
        for (let item of row) {
            if (item.str.toLowerCase().includes('date of report')) {
                // Assume the date is in the next non empty item in the row
                let dateIdx = row.indexOf(item) + 1;
                while (dateIdx < row.length) {
                    const dateCandidate = row[dateIdx].str.trim();
                    if (dateCandidate) {
                        return dateCandidate;
                    }
                    dateIdx++;
                }
            }
        }
    }
    console.warn('Could not find test date in the document.');
    return null;
}

export async function getTestMetadata(pdfDocument) {
    const testType = await getTestType(pdfDocument);
    console.log('Test:', testType);
    if (!testType) {
        console.warn('Could not determine test type from PDF.');
        return null;
    }
    const patientName = await getPatientName(pdfDocument, testType);
    console.log('Patient Name:', patientName);
    const testDate = await getTestDate(pdfDocument, testType);
    console.log('Test Date:', testDate);
    return {
        testType: testType,
        patientName: patientName,
        testDate: testDate
    };
}


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

function mergeCloseRows(textContent, gapThreshold) {
    const items = textContent.items.map(item => ({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5],
        width: item.width,
        height: item.height
    }));

    // Group by Y coordinate (rows)
    let rows = {};
    for (let item of items) {
        let rowKey = Math.round(item.y / gapThreshold) * gapThreshold; // bucket by rowTolerance
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

    return sortedRows;
}

export async function universalTableExtract(page, test) {
    const targetText = test.Title;
    const columnCount = test.totalNumberOfColumns;
    const subtests = test.Subtests;

    const rowTolerance = config.tableExtraction.rowTolerance;

    const textContent  = await page.getTextContent();

    var sortedRows = mergeCloseRows(textContent, rowTolerance);
    // For every text element, remove unwanted characters: parens, asterisks
    sortedRows = sortedRows.map(r => r.map(item => {
        let cleanedStr = item.str.replace(/[()*]/g, '').trim();
        return {...item, str: cleanedStr};
    }));
    // Remove rows that do not contain any of the target subtest names
    sortedRows = sortedRows.filter(r => r.some(item => subtests.includes(item.str)));
    // Delete elemnts that are just empty strings
    sortedRows = sortedRows.map(r => r.filter(item => item.str !== ''));

    // If any row has more columns than expected, apply OvercollumnPolicy
    sortedRows = sortedRows.map(r => {
        if (r.length > columnCount) {
            if (test.OvercollumnPolicy === 'none' || !test.OvercollumnPolicy) {
                console.warn(`Row has ${r.length} elements, expected ${columnCount}, but no OvercollumnPolicy set.`);
                return []; // discard entire row
            }
            console.warn(`Row has ${r.length} elements, expected ${columnCount}, applying OvercollumnPolicy: ${test.OvercollumnPolicy}`);
            if (test.OvercollumnPolicy === 'dropFirst') {
                return r.slice(r.length - columnCount);
            } else if (test.OvercollumnPolicy === 'dropLast') {
                return r.slice(0, columnCount);
            } else if (test.OvercollumnPolicy === 'discard') {
                return []; // discard entire row
            }
        }
        return r;
    });
    // If any row has fewer columns than expected, apply UndercollumnPolicy
    sortedRows = sortedRows.map(r => {
        if (r.length < columnCount) {
            const missing = columnCount - r.length;
            if (!test.UndercollumnPolicy || test.UndercollumnPolicy.policy === 'none') {
                console.warn(`Row has ${r.length} elements, expected ${columnCount}, but no UndercollumnPolicy set.`);
                return r; // leave as is
            }
            console.warn(`Row has ${r.length} elements, expected ${columnCount}, applying UndercollumnPolicy: ${test.UndercollumnPolicy.policy}`);
            if (test.UndercollumnPolicy.policy === 'addEmpty') {
                const position = test.UndercollumnPolicy.position;
                console.log('UndercollumnPolicy position:', position);
                // if position is positive, insert empties at that index, push the rest to the right
                if (position >= 0) {
                    let newRow = [...r];
                    for (let i = 0; i < missing; i++) {
                        newRow.splice(position, 0, {str: ''});
                    }
                    return newRow;
                } else {
                    // if position is negative, insert empties at that index from the end
                    let newRow = [...r];
                    for (let i = 0; i < missing; i++) {
                        newRow.splice(newRow.length + position + 1, 0, {str: ''});
                    }
                    return newRow;
                }
            }
        }
        return r;
    });


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
        const numberOfPreScoreColumns = test.PreScoreColumns ? test.PreScoreColumns.length : 0;
        console.log('Number of PreScoreColumns:', numberOfPreScoreColumns);
        // The first columns are PreScoreColumns
        test.PreScoreColumns.forEach((colName, idx) => {
            rowObj[colName] = r[idx] ? r[idx].str : '';
        });
        // The rest of the columns are test.ScoreColumns
        test.ScoreColumns.forEach((colName, idx) => {
            rowObj[colName] = r[idx + numberOfPreScoreColumns] ? r[idx + numberOfPreScoreColumns].str : '';
        });
        table.push(rowObj);
    });
    
    return table;
}