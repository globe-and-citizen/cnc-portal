import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Function to generate a random secret key of specified length
function generateSecretKey(length: number) {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

// Generate a random secret key of 64 characters (256 bits)
const secretKey = generateSecretKey(64);
console.log('Generated Secret Key', secretKey)

// Example payload
const payload = { user_id: 123456, user_name: "abcdefg" };

// Sign the token
const token = jwt.sign(payload, secretKey, { algorithm: 'HS256', expiresIn: "1s"});
console.log('Generated Token:', token);

const verifyToken = () => {
  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      console.error('Token verification failed:', err.message);
    } else {
      console.log('Decoded Payload:', decoded);
    }
  });
}

// Verify the token
setTimeout(verifyToken, 2000)


