import { PrismaClient } from '@prisma/client';

/**
 * Configure only the disposable database used by the integrated Playwright
 * profile. Payroll needs one completed ISO week to exercise the real
 * signature and withdrawal lifecycle; the product's normal submission window
 * intentionally prevents creating that historical claim.
 */
async function main(): Promise<void> {
  if (process.env.E2E_INTEGRATED_SETUP !== 'true') {
    throw new Error(
      'Refusing to change settings outside the integrated E2E environment. Set E2E_INTEGRATED_SETUP=true.'
    );
  }

  const prisma = new PrismaClient();

  try {
    await prisma.globalSetting.upsert({
      where: { functionName: 'SUBMIT_RESTRICTION' },
      create: { functionName: 'SUBMIT_RESTRICTION', status: 'disabled' },
      update: { status: 'disabled' },
    });
    console.log('Configured SUBMIT_RESTRICTION=disabled for integrated E2E');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
