function toSafeCell(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return String(value);
}

function toCsvLine(values) {
  return values
    .map((value) => {
      const safe = toSafeCell(value).replace(/"/g, '""');
      return `"${safe}"`;
    })
    .join(',');
}

export function exportRowsToExcelCsv({ rows, columns, fileName }) {
  if (!Array.isArray(rows) || rows.length === 0 || !Array.isArray(columns) || columns.length === 0) {
    return false;
  }

  const headerRow = toCsvLine(columns.map((col) => col.header));
  const dataRows = rows.map((row) => {
    const values = columns.map((col) => {
      if (typeof col.value === 'function') return col.value(row);
      return row[col.value];
    });
    return toCsvLine(values);
  });

  const csvText = [headerRow, ...dataRows].join('\n');
  const blob = new Blob(['\uFEFF', csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${fileName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return true;
}
