export function getMondayStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() // 0 = dimanche, 1 = lundi, ..., 6 = samedi
  const diff = day === 0 ? -6 : 1 - day // Si dimanche, recule de 6 jours, sinon ajuste
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0) // Met à 00:00:00.000
  return d
}

export function todayMidnight(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0) // Met à 00:00:00.000
  return d
}
