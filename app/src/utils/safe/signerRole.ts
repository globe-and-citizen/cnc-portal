export interface SignerRoleState {
  /** The Safe owner list is still being fetched. */
  isLoading: boolean
  isOwner: boolean
}

export interface SignerRoleCopy {
  label: string
  noticeTitle: string
  description: string
  transferHint: string
}

/** Copy the Safe balance section shows for the connected wallet's role. */
export function signerRoleCopy({ isLoading, isOwner }: SignerRoleState): SignerRoleCopy {
  if (isLoading) {
    return {
      label: 'Checking permissions…',
      noticeTitle: 'Checking signer permissions',
      description: 'Checking the connected wallet against the Safe owner list.',
      transferHint: 'Only a Safe signer can create a transfer proposal.'
    }
  }
  if (isOwner) {
    return {
      label: 'Safe signer',
      noticeTitle: 'Signer wallet connected',
      description:
        'You can propose transfers, approve pending actions, and execute transactions once the threshold is reached.',
      transferHint: 'Create a transfer proposal for signer approval.'
    }
  }
  return {
    label: 'Viewer / depositor',
    noticeTitle: 'Safe information is read-only for this wallet',
    description:
      'You can review activity and deposit funds. Connect a Safe signer wallet to propose transfers or approve actions.',
    transferHint: 'Only a Safe signer can create a transfer proposal.'
  }
}
