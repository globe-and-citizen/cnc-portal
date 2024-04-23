export const isWalletAddressValid = (address: string) => {
  // checks if the input string starts with "0x" and consists of exactly 40 hexadecimal characters.
  const regex = /^(0x)?[0-9a-fA-F]{40}$/;

  // Check if the address matches the regex pattern
  return regex.test(address);
};
