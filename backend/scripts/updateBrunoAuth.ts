import { privateKeyToAccount } from 'viem/accounts';
import { SiweMessage } from 'siwe';
import * as fs from 'fs';
import * as path from 'path';

async function updateBrunoAuth() {
  // Get nonce from API
  const nonceResponse = await fetch(`http://localhost:3000/api/user/nonce/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`);
  const nonceData = await nonceResponse.json();
  const nonce = nonceData.nonce;

  console.log('Fetched nonce:', nonce);

  // Sign message
  const privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
  const account = privateKeyToAccount(privateKey);

  const issuedAt = new Date().toISOString();

  const message = new SiweMessage({
    domain: 'localhost:3000',
    address: account.address,
    statement: 'Sign in with Ethereum to the app.',
    uri: 'http://localhost:3000',
    version: '1',
    chainId: 1,
    nonce: nonce,
    issuedAt: issuedAt,
  });

  const messageStr = message.prepareMessage();
  const signature = await account.signMessage({ message: messageStr });

  // Update Bruno environment file
  const envPath = path.join(__dirname, '../bruno/CNC Portal/environments/CNC URI.bru');
  const envContent = `vars {
  host: http://localhost:3000/api
  testAddress: ${account.address}
  nonce: ${nonce}
  accessToken:
  siweMessage: ${messageStr.replace(/\n/g, '\\n')}
  siweSignature: ${signature}
}
`;

  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ Bruno environment updated successfully!');
  console.log(`\nYou can now run: cd "bruno/CNC Portal" && npx bru run Auth -r --env "CNC URI"`);
}

updateBrunoAuth().catch(console.error);
