/**
 * Converts a standard Google Sheet URL into a CSV download URL for a specific sheet.
 * It specifically targets a sheet named "operaciones".
 * @param url The public Google Sheet URL (e.g., "https://docs.google.com/spreadsheets/d/.../edit")
 * @returns The CSV download URL or null if the URL is invalid.
 */
export const getGoogleSheetCsvUrl = (url: string): string | null => {
  const regex = /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)\//;
  const match = url.match(regex);
  if (match && match[1]) {
    const sheetId = match[1];
    // Use the gviz endpoint to get raw CSV data from the "operaciones" sheet
    return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=operaciones`;
  }
  return null;
};
