/**
 * Mock data for UI component tests
 */

export const mockUIComponents = {
  // Timeline status values
  timelineStatuses: {
    pending: 'pending' as const,
    active: 'active' as const,
    completed: 'completed' as const,
    error: 'error' as const
  },

  // Mock timeline steps
  mockTimelineSteps: {
    initiate: {
      status: 'completed' as const,
      title: 'Initiate',
      description: 'Transaction initiated'
    },
    pending: {
      status: 'completed' as const,
      title: 'Transaction Sent',
      description: 'Waiting for confirmation'
    },
    confirming: {
      status: 'active' as const,
      title: 'Confirming',
      description: 'Confirming on blockchain'
    },
    complete: {
      status: 'pending' as const,
      title: 'Complete',
      description: 'Waiting for completion'
    }
  },

  mockTimelineStepsCompleted: {
    initiate: {
      status: 'completed' as const,
      title: 'Initiate',
      description: 'Transaction initiated'
    },
    pending: {
      status: 'completed' as const,
      title: 'Transaction Sent',
      description: 'Confirmed'
    },
    confirming: {
      status: 'completed' as const,
      title: 'Confirming',
      description: 'Confirmed on blockchain'
    },
    complete: {
      status: 'completed' as const,
      title: 'Complete',
      description: 'Transaction completed'
    }
  },

  mockTimelineStepsWithError: {
    initiate: {
      status: 'completed' as const,
      title: 'Initiate',
      description: 'Transaction initiated'
    },
    pending: {
      status: 'error' as const,
      title: 'Transaction Failed',
      description: 'Failed to send transaction'
    },
    confirming: {
      status: 'pending' as const,
      title: 'Confirming',
      description: 'Waiting for confirmation'
    },
    complete: {
      status: 'pending' as const,
      title: 'Complete',
      description: 'Waiting for completion'
    }
  },

  // Sample transaction hash
  transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',

  // Sample block number
  blockNumber: '12345678'
}

export const mockNavigationItems = [
  {
    label: 'Home',
    icon: 'i-lucide-house',
    to: '/'
  },
  {
    label: 'Team List',
    icon: 'heroicons:squares-2x2',
    to: '/teams'
  },
  {
    label: 'Team Home Page',
    icon: 'heroicons:home',
    to: '/teams/1'
  }
]
