function useVestingStore() {
  return {
    vestings: [
      {
        member: '0x1111...aaaa',
        teamId: 1,
        startDate: new Date(Date.now() - 86400 * 10 * 1000).toLocaleDateString(),
        durationDays: 30,
        cliffDays: 5,
        totalAmount: 1000,
        released: 200,
        status: 'Active'
      },
      {
        member: '0x2222...bbbb',
        teamId: 1,
        startDate: new Date(Date.now() - 86400 * 15 * 1000).toLocaleDateString(),
        durationDays: 60,
        cliffDays: 10,
        totalAmount: 5000,
        released: 0,
        status: 'Active'
      },
      {
        member: '0x3333...cccc',
        teamId: 2,
        startDate: new Date(Date.now() - 86400 * 40 * 1000).toLocaleDateString(),
        durationDays: 60,
        cliffDays: 15,
        totalAmount: 3000,
        released: 1500,
        status: 'Inactive'
      }
    ]
  }
}

export function getVestingsByTeamId(teamId: number, userAddress: `0x${string}`) {
  const { vestings } = useVestingStore()
  //push fake  data to make we we get at least one data.
  vestings.push({
    member: userAddress,
    teamId,
    startDate: new Date().toLocaleDateString(),
    durationDays: 30,
    cliffDays: 5,
    totalAmount: 1000,
    released: 0,
    status: 'Active'
  })
  return vestings.filter((v) => v.teamId === teamId)
}

export function getTeamVestingStats() {
  return [
    {
      symbol: 'USDC',
      totalVested: 6000,
      totalReleased: 1200
    },
    {
      symbol: 'DAI',
      totalVested: 3000,
      totalReleased: 4200
    }
  ]
}

export const vestingteamsMap: Record<number, { token: string; symbol: string }> = {
  1: { token: '0xToken1234abcd5678', symbol: 'USDC' },
  2: { token: '0xToken8765dcba4321', symbol: 'DAI' }
}
