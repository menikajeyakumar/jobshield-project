/**
 * Utility function to convert UTC timestamps from the backend into
 * local time for the Asia/Kolkata (IST, UTC+05:30) timezone.
 *
 * Ensures consistent DD/MM/YYYY HH:MM formatting without double offsets.
 */
export function formatScanDate(dateInput) {
  if (!dateInput) {
    return { date: '—', time: '—', formatted: '—' }
  }

  let dateObj
  if (dateInput instanceof Date) {
    dateObj = dateInput
  } else {
    let str = String(dateInput).trim()
    // If the string lacks explicit ISO offset (Z or +/-00:00), append Z so JS parses it as UTC
    if (!str.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(str)) {
      str += 'Z'
    }
    dateObj = new Date(str)
  }

  if (isNaN(dateObj.getTime())) {
    return { date: '—', time: '—', formatted: '—' }
  }

  // Format explicitly in Asia/Kolkata timezone
  const dateStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(dateObj) // DD/MM/YYYY

  const timeStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(dateObj) // HH:MM

  return {
    date: dateStr,
    time: timeStr,
    formatted: `${dateStr} ${timeStr}`,
  }
}
