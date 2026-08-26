export function parseCsv(text: string) {
  const rows: string[][] = []
  let row: string[] = []
  let value = ''
  let isQuoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const nextChar = text[index + 1]

    if (char === '"' && isQuoted && nextChar === '"') {
      value += '"'
      index += 1
      continue
    }

    if (char === '"') {
      isQuoted = !isQuoted
      continue
    }

    if (char === ',' && !isQuoted) {
      row.push(value)
      value = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !isQuoted) {
      if (char === '\r' && nextChar === '\n') {
        index += 1
      }

      row.push(value)
      rows.push(row)
      row = []
      value = ''
      continue
    }

    value += char
  }

  row.push(value)
  rows.push(row)

  return rows.filter((cells) => cells.some((cell) => cell.trim()))
}

export function normalizeCsvHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function toCsvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`
}
