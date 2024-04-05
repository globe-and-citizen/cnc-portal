import { SiweMessage } from 'siwe'

// Define interface for message creator
export interface ISiweMessageCreator {
  create(): Promise<string>
}

// Adapter for SiweMessage class for Siwe library
export class SLSiweMessageCreator implements ISiweMessageCreator {
  private data: any

  constructor(data: any) {
    // Check if origin and uri are already set in the data object
    // If not, set them using window.location
    if (!data.origin) {
      data.uri = window.location.origin
    }

    if (!data.domain) {
      data.domain = window.location.host
    }

    this.data = data
  }

  async create(): Promise<string> {
    // Create SiweMessage instance with provided data
    const siweMessage = new SiweMessage(this.data)

    // Call prepareMessage method to properly format the message
    const message = siweMessage.prepareMessage()

    return message
  }
}
