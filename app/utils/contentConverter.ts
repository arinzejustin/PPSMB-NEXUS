import * as XLSX from "xlsx";

export type PrintContentType = "html" | "csv" | "excel";

/**
 * Detect content type from file name extension
 */
export function detectContentType(fileName?: string): PrintContentType {
  if (!fileName) return "html";
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "csv":
      return "csv";
    case "xlsx":
    case "xls":
    case "xlsb":
    case "xlsm":
      return "excel";
    default:
      return "html";
  }
}

/**
 * Parse CSV text into a 2D array of strings.
 * Handles quoted fields with commas and newlines inside.
 */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(current.trim());
        current = "";
      } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
        row.push(current.trim());
        if (row.some((cell) => cell !== "")) rows.push(row);
        row = [];
        current = "";
        if (ch === "\r") i++;
      } else {
        current += ch;
      }
    }
  }

  // push last row
  row.push(current.trim());
  if (row.some((cell) => cell !== "")) rows.push(row);

  return rows;
}

/**
 * Convert a 2D array of strings into a styled HTML table
 */
function rowsToHTML(
  rows: string[][],
  title?: string,
  sheetName?: string,
): string {
  if (!rows.length) return "<p>No data found</p>";

  const headers = rows[0];
  if (!headers) return "<p>No data found</p>";
  const body = rows.slice(1);

  const headerCells = headers
    .map(
      (h) =>
        `<th style="padding:10px 14px;text-align:left;font-weight:600;font-size:13px;color:#1e293b;border-bottom:2px solid #e2e8f0;white-space:nowrap;">${escapeHTML(h)}</th>`,
    )
    .join("");

  const bodyRows = body
    .map((row, idx) => {
      const bg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
      const cells = row
        .map(
          (cell) =>
            `<td style="padding:8px 14px;font-size:12px;color:#334155;border-bottom:1px solid #f1f5f9;">${escapeHTML(cell)}</td>`,
        )
        .join("");
      return `<tr style="background:${bg};">${cells}</tr>`;
    })
    .join("");

  const sheetLabel = sheetName
    ? `<span style="color:#64748b;font-weight:400;font-size:14px;margin-left:12px;">(${escapeHTML(sheetName)})</span>`
    : "";
  const titleHTML = title
    ? `<h2 style="margin:0 0 16px 0;font-family:'Segoe UI',system-ui,sans-serif;font-size:18px;font-weight:700;color:#0f172a;">${escapeHTML(title)}${sheetLabel}</h2>`
    : "";

  return `
    ${titleHTML}
    <table style="width:100%;border-collapse:collapse;font-family:'Segoe UI',system-ui,sans-serif;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <thead style="background:#f1f5f9;">
        <tr>${headerCells}</tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>
    <p style="text-align:right;font-size:11px;color:#94a3b8;margin-top:8px;font-family:'Segoe UI',system-ui,sans-serif;">
      ${body.length} row${body.length !== 1 ? "s" : ""} × ${headers.length} column${headers.length !== 1 ? "s" : ""}
    </p>
  `;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Wrap table HTML in a full print-ready document
 */
function wrapInDocument(bodyContent: string, title?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title ? escapeHTML(title) : "Document"}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      padding: 32px;
      background: #fff;
      color: #1e293b;
    }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    thead { display: table-header-group; }
    .sheet-break { page-break-before: always; margin-top: 32px; }
    @media print {
      body { padding: 16px; }
    }
  </style>
</head>
<body>
  ${bodyContent}
</body>
</html>`;
}

/**
 * Convert CSV text to print-ready HTML
 */
export function csvToHTML(csvText: string, title?: string): string {
  const rows = parseCSV(csvText);
  const tableHTML = rowsToHTML(rows, title);
  return wrapInDocument(tableHTML, title);
}

/**
 * Convert an Excel ArrayBuffer to print-ready HTML.
 * Supports multiple sheets — each sheet gets its own table with a page break.
 */
export function excelToHTML(buffer: ArrayBuffer, title?: string): string {
  const data = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
  const workbook = XLSX.read(data, { type: "array" });
  const sheets = workbook.SheetNames;

  const tablesHTML = sheets
    .map((name, idx) => {
      const sheet = workbook.Sheets[name];
      if (!sheet) return "";
      const rows: string[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
        raw: false,
      });

      if (!rows.length) return "";

      const breakClass = idx > 0 ? ' class="sheet-break"' : "";
      return `<div${breakClass}>${rowsToHTML(rows, idx === 0 ? title : undefined, sheets.length > 1 ? name : undefined)}</div>`;
    })
    .filter(Boolean)
    .join("\n");

  return wrapInDocument(
    tablesHTML || "<p>No data found in workbook</p>",
    title,
  );
}

/**
 * Convert any supported content to print-ready HTML.
 * If already HTML, returns as-is.
 */
export function convertToPrintHTML(
  content: string | ArrayBuffer,
  contentType: PrintContentType,
  title?: string,
): string {
  switch (contentType) {
    case "csv":
      if (typeof content !== "string") {
        throw new Error("CSV content must be a string");
      }
      return csvToHTML(content, title);

    case "excel":
      if (typeof content === "string") {
        throw new Error("Excel content must be an ArrayBuffer");
      }
      return excelToHTML(content as ArrayBuffer, title);

    case "html":
    default:
      if (typeof content !== "string") {
        throw new Error("HTML content must be a string");
      }
      return content;
  }
}

/**
 * Generate a preview-friendly HTML string for use inside an iframe.
 * For CSV/Excel this is the same styled HTML table.
 * For HTML this is the original content.
 */
export function generatePreviewHTML(
  content: string | ArrayBuffer,
  contentType: PrintContentType,
  title?: string,
): string {
  return convertToPrintHTML(content, contentType, title);
}
