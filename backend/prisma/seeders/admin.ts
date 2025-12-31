// backend/prisma/seeders/admin.ts

import { PrismaClient } from '@prisma/client';
import { isAddress } from 'viem';
const { generateNonce } = require('./helpers');

/**
 * Valid admin roles that can be assigned
 */
const VALID_ADMIN_ROLES = ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'];

/**
 * Interface for admin assignment configuration
 */
interface AdminConfig {
  addresses: string[];
  roles: string[];
}

/**
 * Parses comma-separated environment variable into array of trimmed strings
 */
function parseEnvArray(envValue: string | undefined): string[] {
  if (!envValue) return [];
  return envValue
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * Validates Ethereum addresses
 */
function validateAddress(address: string): boolean {
  return isAddress(address);
}

/**
 * Validates role is in allowed list
 */
function validateRole(role: string): boolean {
  return VALID_ADMIN_ROLES.includes(role);
}

/**
 * Parses and validates admin configuration from environment variables
 */
function parseAdminConfig(): AdminConfig | null {
  const addresses = parseEnvArray(process.env.ADMIN_ADDRESSES);
  const roles = parseEnvArray(process.env.ADMIN_ROLES);

  // If no addresses provided, skip admin seeding
  if (addresses.length === 0) {
    return null;
  }

  // Validate addresses
  const invalidAddresses = addresses.filter((addr) => !validateAddress(addr));
  if (invalidAddresses.length > 0) {
    throw new Error(
      `❌ Invalid Ethereum addresses in ADMIN_ADDRESSES: ${invalidAddresses.join(', ')}`
    );
  }

  // Validate roles
  const invalidRoles = roles.filter((role) => !validateRole(role));
  if (invalidRoles.length > 0) {
    throw new Error(
      `❌ Invalid roles in ADMIN_ROLES: ${invalidRoles.join(', ')}. Valid roles: ${VALID_ADMIN_ROLES.join(', ')}`
    );
  }

  // Check length mismatch
  if (addresses.length !== roles.length) {
    throw new Error(
      `❌ ADMIN_ADDRESSES and ADMIN_ROLES must have the same length. Got ${addresses.length} addresses and ${roles.length} roles.`
    );
  }

  return { addresses, roles };
}

/**
 * Seeds admin roles for specified addresses
 * Reads from ADMIN_ADDRESSES and ADMIN_ROLES environment variables
 *
 * Example:
 * ADMIN_ADDRESSES="0x123...,0x456..." ADMIN_ROLES="ROLE_ADMIN,ROLE_SUPER_ADMIN"
 */
export async function seedAdmins(prisma: PrismaClient): Promise<void> {
  const config = parseAdminConfig();

  // If no admin config provided, skip
  if (!config) {
    console.log('\n👑 Skipping admin seeding (ADMIN_ADDRESSES not provided)');
    return;
  }

  console.log('\n👑 Seeding admin roles...');

  const assignments: Array<{ address: string; role: string; status: string }> = [];
  let successCount = 0;

  // Process each address-role pair
  for (let i = 0; i < config.addresses.length; i++) {
    const address = config.addresses[i];
    const role = config.roles[i];

    try {
      // Try to find user, create if doesn't exist
      let user = await prisma.user.findUnique({
        where: { address },
      });

      if (!user) {
        // Create new user with admin role
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        await prisma.user.create({
          data: {
            address,
            roles: [role],
            name: `Admin ${address.substring(2, 8)}`, // Generate a default name
            nonce: generateNonce(),
          },
        });

        assignments.push({
          address,
          role,
          status: '✓ Created & Assigned',
        });
        successCount++;
        continue;
      }

      // Check if user already has this role
      if (user.roles.includes(role)) {
        assignments.push({
          address,
          role,
          status: '⏭️  Already has role (skipped)',
        });
        continue;
      }

      // Update user with new role
      const newRoles = Array.from(new Set([...user.roles, role]));
      await prisma.user.update({
        where: { address },
        data: { roles: newRoles },
      });

      assignments.push({
        address,
        role,
        status: '✓ Assigned',
      });
      successCount++;
    } catch (error) {
      assignments.push({
        address,
        role,
        status: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  // Print audit log
  console.log('\n  📋 Admin Assignment Log:');
  console.log('  ' + '-'.repeat(100));
  assignments.forEach(({ address, role, status }) => {
    console.log(`  ${status} | ${address.substring(0, 10)}... | ${role}`);
  });
  console.log('  ' + '-'.repeat(100));
  console.log(`\n  ✓ Assigned ${successCount} admin role(s)`);
}
