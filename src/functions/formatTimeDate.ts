export interface FormattedDateTime {
  /** DD-MM-YYYY */
  date: string;
  /** HH:MM, 24-hour */
  time: string;
}

function formatDateTime(isoString: string): FormattedDateTime {
  const date = new Date(isoString);

  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Months are zero-based
  const year = date.getUTCFullYear();

  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');

  return {
    date: `${day}-${month}-${year}`,
    time: `${hours}:${minutes}`,
  };
}

export default formatDateTime;
