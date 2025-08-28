/**
 * BOD contract types and constants
 */

/**
 * Valid BOD contract function names extracted from ABI
 */
export const BOD_FUNCTION_NAMES = {
  // Read functions
  PAUSED: 'paused',
  OWNER: 'owner',
	IS_ACTION_EXECUTED: 'isActionExecuted',
	IS_APPROVED: 'isApproved',
	GET_OWNERS: 'getOwners',
	GET_BOARD_OF_DIRECTORS: 'getBoardOfDirectors',
	IS_MEMBER: 'isMember',
	APPROVAL_COUNT:'approvalCount',

  // Write functions
  PAUSE: 'pause',
  UNPAUSE: 'unpause',
	TRANSFER_OWNERSHIP: 'transferOwnership',
  ADD_ACTION: 'addAction',
	APPROVE: 'approve',
	REVOKE: 'revoke',
	SET_BOARD_OF_DIRECTORS: 'setBoardOfDirectors',
  INITIALIZE: 'initialize'
} as const

/**
 * Type for valid BOD contract function names
 */
export type BodFunctionName = (typeof BOD_FUNCTION_NAMES)[keyof typeof BOD_FUNCTION_NAMES]

/**
 * Validate if a function name exists in the BOD contract
 */
export function isValidBodFunction(functionName: string): functionName is BodFunctionName {
  return Object.values(BOD_FUNCTION_NAMES).includes(functionName as BodFunctionName)
}
