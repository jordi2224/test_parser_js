// Load the configuration file
const response = await fetch('./config.json')
if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
}
const config = await response.json();


export function wiscTableConstructor(tables) {

    const wiscTables = config.WISC.WISCTables;

    // Check that all required tables were found
    // Table keys are the test tiltes
    const foundTableKeys = Object.keys(tables);
    const requiredTableKeys = wiscTables.map(t => t.Title);
    const missingTables = requiredTableKeys.filter(t => !foundTableKeys.includes(t));
    if (missingTables.length > 0) {
        throw new Error(`Missing required tables: ${missingTables.join(', ')}`);
    }

    console.log('All required tables found. Building final structure...');
    
    var output_wb = XLSX.utils.book_new();
    var rows = [];
    
    // Header row
    var row = [
        // Arial bold, 11 pt, center aligned
        { v: "Index/Subtest", t: 's', s: { font: { name: 'Arial', sz: 11, bold: true }, alignment: { horizontal: 'left', wrapText: true }, border: { bottom: { style: 'thin' } } } },
        { v: "Standard Score\n(95% CI)/\nScaled Score", t: 's', s: { font: { name: 'Arial', sz: 11, bold: true }, alignment: { wrapText: true, horizontal: 'center' }, border: { bottom: { style: 'thin' } } } },
        { v: "Percentile", t: 's', s: { font: { name: 'Arial', sz: 11, bold: true }, alignment: { horizontal: 'center', wrapText: true }, border: { bottom: { style: 'thin' } } } },
        { v: "Classification", t: 's', s: { font: { name: 'Arial', sz: 11, bold: true }, alignment: { horizontal: 'center', wrapText: true }, border: { bottom: { style: 'thin' } } } },
        { v: "Strengths/\nWeakness", t: 's', s: { font: { name: 'Arial', sz: 11, bold: true }, alignment: { horizontal: 'center', wrapText: true }, border: { bottom: { style: 'thin' } } } }
    ];
    rows.push(row);


    // Add the full scale IQ
    console.log(tables);
    // Find the row with "Full Scale IQ" in the first "Composite" key
    let fsiqrow = tables["Composite Score Summary"].find(r => r["Composite"] && r["Composite"].includes("Full Scale IQ"));
    let fsiq = fsiqrow["Composite Score"];
    let fsiqConfInt = fsiqrow["95% Confidence Interval"];
    let fsiqPercentile = fsiqrow["Percentile Rank"];
    let fsiqClass = fsiqrow["Qualitative Description"];

    const grey = "F0F0F0";

    row = [
        { v: "Full Scale IQ (FSIQ)", t: 's', s: { font: { name: 'Arial', sz: 11, bold: true }, alignment: { horizontal: 'left', wrapText: true }, fill: { fgColor: { rgb: grey } }, border: { bottom: { style: 'thin' } } } },
        { v: `${fsiq} (${fsiqConfInt})`, t: 's', s: { font: { name: 'Arial', sz: 11, bold: true }, alignment: { horizontal: 'center', wrapText: true }, fill: { fgColor: { rgb: grey } }, border: { bottom: { style: 'thin' } } } },
        { v: fsiqPercentile, t: 's', s: { font: { name: 'Arial', sz: 11, bold: true }, alignment: { horizontal: 'center', wrapText: true }, fill: { fgColor: { rgb: grey } }, border: { bottom: { style: 'thin' } } } },
        { v: fsiqClass, t: 's', s: { font: { name: 'Arial', sz: 11, bold: true }, alignment: { horizontal: 'center', wrapText: true }, fill: { fgColor: { rgb: grey } }, border: { bottom: { style: 'thin' } } } },
        { v: "-", t: 's', s: { font: { name: 'Arial', sz: 11, bold: true }, alignment: { horizontal: 'center', wrapText: true }, fill: { fgColor: { rgb: grey } }, border: { bottom: { style: 'thin' } } } }
    ];
    rows.push(row);

    // General Ability Index (GAI)
    let gairow = tables["ANCILLARY & COMPLEMENTARY SUMMARY"].find(r => r["Ancillary"] && r["Ancillary"].includes("General Ability"));
    let gai = gairow ? gairow["Index Score"] : "-";
    let gaiConfInt = gairow ? gairow["95% Confidence Interval"] : "-";
    let gaiPercentile = gairow ? gairow["Percentile Rank"] : "-";
    let gaiClass = gairow ? gairow["Qualitative Description"] : "-";

    row = [
        { v: "General Ability Index (GAI)", t: 's', s: { font: { name: 'Arial', sz: 11, bold: true }, alignment: { horizontal: 'left', wrapText: true }, fill: { fgColor: { rgb: grey } } } },
        { v: gai !== "-" ? `${gai} (${gaiConfInt})` : "-", t: 's', s: { font: { name: 'Arial', sz: 11, bold: true }, alignment: { horizontal: 'center', wrapText: true }, fill: { fgColor: { rgb: grey } } } },
        { v: gaiPercentile, t: 's', s: { font: { name: 'Arial', sz: 11, bold: true }, alignment: { horizontal: 'center', wrapText: true }, fill: { fgColor: { rgb: grey } } } },
        { v: gaiClass, t: 's', s: { font: { name: 'Arial', sz: 11, bold: true }, alignment: { horizontal: 'center', wrapText: true }, fill: { fgColor: { rgb: grey } } } },
        { v: "-", t: 's', s: { font: { name: 'Arial', sz: 11, bold: true }, alignment: { horizontal: 'center', wrapText: true }, fill: { fgColor: { rgb: grey } } } }
    ];
    rows.push(row);

    // Cognitive Proficiency Index (CPI)
    let cpirow = tables["ANCILLARY & COMPLEMENTARY SUMMARY"].find(r => r["Ancillary"] && r["Ancillary"].includes("Cognitive Proficiency"));
    let cpi = cpirow ? cpirow["Index Score"] : "-";
    let cpiConfInt = cpirow ? cpirow["95% Confidence Interval"] : "-";
    let cpiPercentile = cpirow ? cpirow["Percentile Rank"] : "-";
    let cpiClass = cpirow ? cpirow["Qualitative Description"] : "-";
    row = [
        { v: "Cognitive Proficiency Index (CPI)", t: 's', s: { font: { name: 'Arial', sz: 11, bold: true }, alignment: { horizontal: 'left', wrapText: true }, fill: { fgColor: { rgb: grey } }, border: { bottom: { style: 'thin' } } } },
        { v: cpi !== "-" ? `${cpi} (${cpiConfInt})` : "-", t: 's', s: { font: { name: 'Arial', sz: 11, bold: true }, alignment: { horizontal: 'center', wrapText: true }, fill: { fgColor: { rgb: grey } }, border: { bottom: { style: 'thin' } } } },
        { v: cpiPercentile, t: 's', s: { font: { name: 'Arial', sz: 11, bold: true }, alignment: { horizontal: 'center', wrapText: true }, fill: { fgColor: { rgb: grey } }, border: { bottom: { style: 'thin' } } } },
        { v: cpiClass, t: 's', s: { font: { name: 'Arial', sz: 11, bold: true }, alignment: { horizontal: 'center', wrapText: true }, fill: { fgColor: { rgb: grey } }, border: { bottom: { style: 'thin' } } } },
        { v: "-", t: 's', s: { font: { name: 'Arial', sz: 11, bold: true }, alignment: { horizontal: 'center', wrapText: true }, fill: { fgColor: { rgb: grey } }, border: { bottom: { style: 'thin' } } } }
    ];
    rows.push(row);

    const sectionsNames = Object.keys(config.WISC.TableSections);
    for (const sectionName of sectionsNames) {
        console.log(`Adding section: ${sectionName}`);
        let subtests = config.WISC.TableSections[sectionName];
        let sectionrow = tables["Composite Score Summary"].find(r => r["Composite"] && r["Composite"].includes(sectionName));
        let score = sectionrow ? sectionrow["Composite Score"] : "-";
        let confInt = sectionrow ? sectionrow["95% Confidence Interval"] : "-";
        let percentile = sectionrow ? sectionrow["Percentile Rank"] : "-";
        let classification = sectionrow ? sectionrow["Qualitative Description"] : "-";

        // Create row for the section grey background, bold, but not bottom border

        row = [
            { v: sectionName, t: 's', s: { font: { name: 'Arial', sz: 11, bold: true }, alignment: { horizontal: 'left', wrapText: true }, fill: { fgColor: { rgb: grey } } } },
            { v: score !== "-" ? `${score} (${confInt})` : "-", t: 's', s: { font: { name: 'Arial', sz: 11, bold: true }, alignment: { horizontal: 'center', wrapText: true }, fill: { fgColor: { rgb: grey } } } },
            { v: percentile, t: 's', s: { font: { name: 'Arial', sz: 11, bold: true }, alignment: { horizontal: 'center', wrapText: true }, fill: { fgColor: { rgb: grey } } } },
            { v: classification, t: 's', s: { font: { name: 'Arial', sz: 11, bold: true }, alignment: { horizontal: 'center', wrapText: true }, fill: { fgColor: { rgb: grey } } } },
            { v: "-", t: 's', s: { font: { name: 'Arial', sz: 11, bold: true }, alignment: { horizontal: 'center', wrapText: true }, fill: { fgColor: { rgb: grey } } } }
        ];
        rows.push(row);

        for (const subtestName of subtests) {
            console.log(`  Adding subtest: ${subtestName}`);
            let subtestrow = tables["Subtest Score Summary"].find(r => r["Subtest"] && r["Subtest"].includes(subtestName));
            if (!subtestrow) {
                console.warn(`    Subtest "${subtestName}" not found in Subtest Score Summary table, skipping.`);
                continue;
            }
            let subtestScore = subtestrow["Scaled Score"];
            let subtestPercentile = subtestrow["Percentile Rank"];
            let subtestClass = "TODO"; // Not provided in table, need to calculate
            let strengthWeakness = "TODO" // Not provided in table, need to calculate

            row = [
                { v: subtestName, t: 's', s: { font: { name: 'Arial', sz: 11 }, alignment: { horizontal: 'left', wrapText: true } } },
                { v: subtestScore, t: 's', s: { font: { name: 'Arial', sz: 11 }, alignment: { horizontal: 'center', wrapText: true } } },
                { v: subtestPercentile, t: 's', s: { font: { name: 'Arial', sz: 11 }, alignment: { horizontal: 'center', wrapText: true } } },
                { v: subtestClass, t: 's', s: { font: { name: 'Arial', sz: 11 }, alignment: { horizontal: 'center', wrapText: true } } },
                { v: strengthWeakness, t: 's', s: { font: { name: 'Arial', sz: 11 }, alignment: { horizontal: 'center', wrapText: true } } }
            ];
            rows.push(row);


        }
        

    }

    // Add it to workbook
    const ws = XLSX.utils.aoa_to_sheet(rows);
        
    // Set column widths (in Excel units, roughly 7 pixels per unit)
    ws['!cols'] = [
        { wpx: 310 }, // First column: 364 pixels
        { wpx: 105 }, // Standard Score column
        { wpx: 105 }, // Percentile column
        { wpx: 105 }, // Classification column
        { wpx: 105 }  // Strengths/Weakness column
    ];

    
    XLSX.utils.book_append_sheet(output_wb, ws, 'WISC Summary');

    // Now add each table as a separate sheet
    for (const tableKey of requiredTableKeys) {
        const table = tables[tableKey];
        if (!table || table.length === 0) {
            console.warn(`No data for table "${tableKey}", skipping.`);
            continue;
        }
        console.log(`Adding table "${tableKey}" to workbook...`);
        let tableArray = [];
        // Add header row
        tableArray.push(Object.keys(table[0]));
        // Add data rows
        table.forEach(row => {
            tableArray.push(Object.values(row));
        }); // Sheet names max 31 chars
        const ws = XLSX.utils.aoa_to_sheet(tableArray);
        XLSX.utils.book_append_sheet(output_wb, ws, tableKey.substring(0, 30)); // Sheet names max 31 chars
    }


    return output_wb;
}