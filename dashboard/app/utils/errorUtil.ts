/**
 * @description Parses an Error object to extract the name and first sentence of the message
 * @param error
 * @returns Error Name + First sentence of Error Message
 */
export const parseErrorV2 = (error: Error) => {
  const message = error.message || 'Unknown error'
  const firstSentence = message.includes('.') ? message.split('.')[0] : message
  return `${error.name}: ${firstSentence}`
}
