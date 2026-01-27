export const isUserPartOfTheTeam = (
  members: { address: string; name?: string | null }[],
  callerAddress: string
) => {
  return members.some((member) => member.address === callerAddress);
};