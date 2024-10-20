// Function to create a Date object from symbol date parts
export const createExpiryDate = (parts: string[]): Date | null => {
  const day = parseInt(parts[2]!)
  const month = parts[3]!
  const year = parseInt(parts[4]!)
  const hour = parseInt(parts[5]!)
  const minute = parseInt(parts[6]!)

  // Map month abbreviation to month number (0-11)
  const months: { [key: string]: number } = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  }

  const monthIndex = months[month]

  // Check if month is valid
  if (monthIndex === undefined) {
    return null
  }

  const expiryDateValue = new Date(year, monthIndex, day, hour, minute)

  return isNaN(expiryDateValue.getTime()) ? null : expiryDateValue
}
