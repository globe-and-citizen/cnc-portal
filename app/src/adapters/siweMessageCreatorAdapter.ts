import { SiweMessage } from 'siwe'
import { log, parseError } from '@/utils'

// Define interface for message creator
export interface ISiweMessageCreator {
  create(): Promise<string>
}
// Adapter for SiweMessage class for Siwe library
export class SLSiweMessageCreator implements ISiweMessageCreator {
  private data: Partial<SiweMessage>

  // Type the data
  constructor(param: Partial<SiweMessage>) {
    // Check if domaine and uri are already set in the data object
    // If not, set them using window.location
    if (!param.uri) {
      param.uri = window.location.origin
    }

    if (!param.domain) {
      param.domain = window.location.host
    }

    this.data = param
  }

  async create(): Promise<string> {
    try {
      // Create SiweMessage instance with provided data
      const siweMessage = new SiweMessage(this.data)
      // Call prepareMessage method to properly format the message
      const message = siweMessage.prepareMessage()

      return message
    } catch (error) {
      // TODO : Look at this. It's weird to catch an error the throw a new one
      log.error(parseError(error))
      throw new Error('Something went wrong. Please try agin')
    }
  }
}
