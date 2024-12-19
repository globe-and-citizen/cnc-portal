<template>
  <div>
    <h1>Test Widget</h1>
    <div>
      <button @click="createOrder('fiat-to-crypto', 'test@test.com')">Fiat to Crypto</button>
      <button @click="createOrder('crypto-to-fiat', 'test@test.com')">Crypto to Fiat</button>
    </div>
    <iframe
      v-if="iframeUrl"
      height="625"
      title="AlchemyPay On/Off Ramp Widget"
      :src="iframeUrl"
      frameborder="no"
      allowtransparency="true"
      allowfullscreen="true"
      style="display: block; width: 100%; max-height: 625px; max-width: 500px"
    >
    </iframe>
    <p v-if="error">{{ error }}</p>
    <iframe
      height="625"
      title="AlchemyPay On/Off Ramp Widget"
      src="https://ramptest.alchemypay.org/?appId=[YOUR_TEST_APPID]&[CUSTOM_PARAMETERS]"
      frameborder="no"
      allowtransparency="true"
      allowfullscreen="true"
      style="display: block; width: 100%; max-height: 625px; max-width: 500px"
    >
    </iframe>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import axios from 'axios'
import CryptoJS from 'crypto-js'

const API_BASE_URL = 'https://openapi-test.alchemypay.org'
const APP_ID = import.meta.env.VITE_ALCHEMYPAY_APP_ID
const API_KEY = import.meta.env.VITE_ALCHEMYPAY_API_KEY

const iframeUrl = ref('')
const error = ref('')

// New function to get user token
async function getUserToken(email: string, uid: string) {
  try {
    const timestamp = Date.now().toString()
    const sign = generateSignature(
      timestamp,
      'POST',
      '/open/api/v4/merchant/getToken',
      { email, uid },
      API_KEY + 'sjdkncskd'
    )

    const response = await axios.post(
      `${API_BASE_URL}/open/api/v4/merchant/getToken`,
      { email, uid },
      {
        headers: {
          'Content-Type': 'application/json',
          appid: APP_ID,
          timestamp: timestamp,
          sign: sign
        }
      }
    )

    if (response.data && response.data.success) {
      console.log(response.data)
      return response.data.data.accessToken
    } else {
      throw new Error('Failed to get user token')
    }
  } catch (err) {
    console.error('Error getting user token:', err)
    error.value = 'Failed to get user token. Please try again.'
  }
}

function generateSignature(
  timestamp: string,
  httpMethod: string,
  requestPath: string,
  bodyParams: any,
  secretKey: string
) {
  // Step 1: Sort the body parameters
  const sortedParams = Object.keys(bodyParams)
    .filter((key) => bodyParams[key] !== null && bodyParams[key] !== '')
    .sort()
    .reduce((acc, key) => {
      acc[key] = bodyParams[key]
      return acc
    }, {})

  // Convert sorted parameters to JSON string
  const bodyString = JSON.stringify(sortedParams)

  // Step 2: Create the signature string
  const signatureString = `${timestamp}${httpMethod.toUpperCase()}${requestPath}${bodyString}`

  console.log('Signature String:', signatureString)
  console.log('Secret Key:', secretKey)

  // Step 3: Generate the HMAC SHA256 hash and encode it using Base64
  try {
    const hmac = CryptoJS.HmacSHA256(signatureString, secretKey)
    const signature = CryptoJS.enc.Base64.stringify(hmac)
    return signature
  } catch (error) {
    console.error('Error generating signature:', error)
    throw error
  }
}

async function createOrder(type: 'fiat-to-crypto' | 'crypto-to-fiat', email: string) {
  try {
    const accessToken = await getUserToken(email, '1234567xxxxx') // Replace with actual UID logic

    const endpoint =
      type === 'fiat-to-crypto'
        ? '/open/api/v4/merchant/trade/create'
        : '/open/api/v4/merchant/trade/create'
    const response = await axios.post(
      `${API_BASE_URL}${endpoint}`,
      {
        appId: APP_ID,
        merchantOrderId: `order-${Date.now()}`,
        cryptoCurrency: 'USDT',
        network: 'ETH',
        fiatCurrency: 'USD',
        fiatAmount: '100',
        email: email,
        redirectUrl: 'https://your-redirect-url.com'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': API_KEY,
          Authorization: `Bearer ${accessToken}` // Use the access token
        }
      }
    )

    if (response.data && response.data.data && response.data.data.paymentLink) {
      iframeUrl.value = response.data.data.paymentLink
    } else {
      console.log(response.data)
      throw new Error('Invalid response from AlchemyPay API')
    }
  } catch (err) {
    console.error('Error creating order:', err)
    error.value = 'Failed to create order. Please try again.'
  }
}
</script>
