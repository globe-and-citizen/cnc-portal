export interface IAuthAPI {
  verifyPayloadAndGetToken(payload: any, methodDetails: any): Promise<string>
}

export class SiweAuthAPI implements IAuthAPI {
  /*private httpClient: HttpClient;
  
    constructor(httpClient: HttpClient) {
      this.httpClient = httpClient;
    }*/

  async verifyPayloadAndGetToken(payload: any, methodDetails: any): Promise<string> {
    console.log(
      '[app][src][apis][authApi.ts][SiweAuthAPI][verifyPayloadAndGetToken] payload: ',
      payload
    )
    // Make a call to an API endpoint
    //const response = await this.httpClient.post('https://dummy-api.example.com/auth', { payload, methodDetails });
    const token = 'dummy token' // Assuming the response contains a token field
    return token
  }
}
