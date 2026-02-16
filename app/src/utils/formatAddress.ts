export function formatAddress(address?: string): string {
  if (!address) return ''
  // Keep short addresses intact
  if (address.length <= 10) return address
  return address.slice(0, 6) + '...' + address.slice(address.length - 4)
}

export default formatAddress
