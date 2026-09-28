import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import weeklyClaimRoutes from '../../routes/weeklyClaimRoute';
import { prisma } from '../../utils';
import { Prisma } from '@prisma/client';
import {
  getCurrentCashRemunerationContract,
  isCashRemunerationOwner,
} from '../../utils/cashRemunerationUtil';
import { recoverTypedDataAddress, type Address } from 'viem';

const CALLER = '0x1234567890123456789012345678901234567890';
const CASH_REMUNERATION_ADDRESS = '0xcacacacacacacacacacacacacacacacacacacaca';
// Valid EIP-712 sign body. Tests start from this and override fields to
// exercise individual validation branches.
const VALID_SIGN_BODY = {
  signature: '0xabc',
  signedAgainstContractAddress: CASH_REMUNERATION_ADDRESS,
  chainId: 31337,
  typedDataMessage: {
    employeeAddress: '0x1111111111111111111111111111111111111111',
    minutesWorked: 60,
    date: '1700000000',
    wages: [
      {
        hourlyRate: '1000000000000000000',
        tokenAddress: '0x0000000000000000000000000000000000000000',
      },
    ],
  },
};

const { mockGetPresignedDownloadUrl } = vi.hoisted(() => ({
  mockGetPresignedDownloadUrl: vi.fn(
    (key: string) => `https://storage.railway.app/test-bucket/${key}`
  ),
}));

const { readContractMock } = vi.hoisted(() => ({
  readContractMock: vi.fn(),
}));

vi.mock('../../services/storageService', () => ({
  getPresignedDownloadUrl: mockGetPresignedDownloadUrl,
  refreshPresignedUrl: mockGetPresignedDownloadUrl,
}));

vi.mock('../../middleware/authMiddleware', () => ({
  authorizeUser: vi.fn(
    (req: Request & { address: Address }, _res: Response, next: NextFunction) => {
      req.address = CALLER as Address;
      next();
    }
  ),
}));

vi.mock('../../utils/cashRemunerationUtil', () => ({
  isCashRemunerationOwner: vi.fn().mockResolvedValue(true),
  // Default: helper returns the team's current CashRemunerationEIP712 — the
  // address the sign body declares it signed against. Individual tests
  // override to exercise the mismatch / missing branches.
  getCurrentCashRemunerationContract: vi.fn().mockResolvedValue({
    id: 1,
    teamId: 1,
    type: 'CashRemunerationEIP712',
    address: '0xcacacacacacacacacacacacacacacacacacacaca',
  }),
}));

vi.mock('../../utils/viem.config', () => ({
  default: { readContract: readContractMock },
}));

// Mock the wage resolution utility used by submitWeeklyGoals.
const { mockResolveWageForWeek } = vi.hoisted(() => ({
  mockResolveWageForWeek: vi.fn(),
}));
vi.mock('../../utils/wageResolution', () => ({
  resolveCurrentWage: mockResolveWageForWeek,
}));

// Mock viem's recoverTypedDataAddress so tests can drive the recovery result
// (matching CALLER vs mismatch vs throw) without producing real signatures.
// vi.mock is hoisted; the inline 0x1234...7890 mirrors the CALLER constant.
vi.mock('viem', async () => {
  const actual = await vi.importActual<typeof import('viem')>('viem');
  return {
    ...actual,
    recoverTypedDataAddress: vi
      .fn()
      .mockResolvedValue('0x1234567890123456789012345678901234567890'),
  };
});

vi.mock('../../utils', async () => {
  const actual = await vi.importActual('../../utils');
  return {
    ...actual,
    prisma: {
      team: {
        findFirst: vi.fn().mockResolvedValue({ id: 1 }),
        findUnique: vi.fn().mockResolvedValue({ isArchived: false }),
      },
      wage: {
        findFirst: vi.fn(),
      },
      weeklyClaim: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        upsert: vi.fn(),
        update: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
      },
      claim: {
        count: vi.fn().mockResolvedValue(1),
      },
      teamContract: {
        findFirst: vi.fn(),
      },
      $transaction: vi.fn(),
    },
  };
});

// Authenticated caller for the request under test. Defaults to CALLER; a test
// sets this to exercise a different identity (e.g. checksum casing) and
// beforeEach resets it.
let callerAddressOverride: string | null = null;

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  req.address = (callerAddressOverride ?? CALLER) as Address;
  next();
});
app.use('/', weeklyClaimRoutes);

const ownerWage = (ownerAddress = CALLER) => ({ team: { id: 1, ownerAddress } });

const weeklyClaimFactory = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  status: 'pending',
  weekStart: new Date('2024-07-22'),
  memberAddress: '0x1111111111111111111111111111111111111111',
  teamId: 1,
  data: {},
  signature: null,
  wageId: 1,
  createdAt: new Date('2024-07-22'),
  updatedAt: new Date('2024-07-22'),
  wage: ownerWage(),
  ...overrides,
});

const putAction = (
  action: string,
  id = '1',
  body: Record<string, unknown> = action === 'sign' ? VALID_SIGN_BODY : { signature: '0xabc' }
) => request(app).put(`/${id}?action=${action}`).send(body);

describe('Weekly Claim Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callerAddressOverride = null;
    vi.mocked(prisma.team.findUnique).mockResolvedValue({ isArchived: false } as never);
    vi.mocked(prisma.weeklyClaim.findUnique).mockResolvedValue({ teamId: 1 } as never);
    vi.mocked(prisma.claim.count).mockResolvedValue(1);
    vi.mocked(isCashRemunerationOwner).mockResolvedValue(true);
    // Default: the team's current CashRemunerationEIP712 matches what the
    // sign body declares it signed against. Individual tests can override
    // to exercise the mismatch branch.
    vi.mocked(getCurrentCashRemunerationContract).mockResolvedValue({
      id: 1,
      teamId: 1,
      type: 'CashRemunerationEIP712',
      address: CASH_REMUNERATION_ADDRESS,
    } as never);
    // Default: signature recovers to the caller. Individual tests override
    // to exercise the mismatch / throw branches.
    vi.mocked(recoverTypedDataAddress).mockResolvedValue(CALLER as Address);
  });

  describe('PUT /:id', () => {
    it.each([
      {
        title: 'sign week not completed',
        action: 'sign',
        claim: weeklyClaimFactory({ status: 'pending', weekStart: new Date() }),
        ownerOk: true,
        message: 'Week not yet completed',
      },
      {
        title: '[AC-US-PAYROLL-008-06] sign already signed',
        action: 'sign',
        claim: weeklyClaimFactory({ status: 'signed', data: { ownerAddress: CALLER } }),
        ownerOk: true,
        message: 'Weekly claim already signed',
      },
      {
        title: 'sign already withdrawn',
        action: 'sign',
        claim: weeklyClaimFactory({ status: 'withdrawn' }),
        ownerOk: true,
        message: 'Weekly claim already withdrawn',
      },
      {
        title: 'withdraw requires signed',
        action: 'withdraw',
        claim: weeklyClaimFactory({ status: 'pending', memberAddress: CALLER }),
        ownerOk: true,
        message: 'Weekly claim must be signed before it can be withdrawn',
      },
      {
        title: '[AC-US-PAYROLL-010-10] withdraw already withdrawn',
        action: 'withdraw',
        claim: weeklyClaimFactory({ status: 'withdrawn', memberAddress: CALLER }),
        ownerOk: true,
        message: 'Weekly claim already withdrawn',
      },
    ])(
      'returns the expected rejection for $title',
      async ({ action, claim, ownerOk, message, expectedStatus = 400 }) => {
        vi.mocked(isCashRemunerationOwner).mockResolvedValue(ownerOk);
        vi.spyOn(prisma.weeklyClaim, 'findUnique').mockResolvedValue(claim as any);
        const response = await putAction(action);
        expect(response.status).toBe(expectedStatus);
        expect(response.body).toEqual({ message });
        if (action === 'sign' && expectedStatus === 403) {
          expect(prisma.$transaction).not.toHaveBeenCalled();
          expect(recoverTypedDataAddress).not.toHaveBeenCalled();
        }
      }
    );

    it('[AC-US-PAYROLL-008-03] rejects signing by a team owner who is not the current Cash Remuneration owner', async () => {
      vi.mocked(isCashRemunerationOwner).mockResolvedValue(false);
      vi.spyOn(prisma.weeklyClaim, 'findUnique').mockResolvedValue(
        weeklyClaimFactory({ status: 'pending', wage: ownerWage(CALLER) }) as never
      );

      const response = await putAction('sign');

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        message: 'Caller is not the current Cash Remuneration owner',
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(recoverTypedDataAddress).not.toHaveBeenCalled();
    });

    // Authorization on `withdraw` (issue #2471). Before the fix any
    // authenticated user could flip any team's signed claim to `withdrawn`,
    // and syncWeeklyClaims — which only re-reads `signed`/`disabled` rows —
    // would never reconcile it back, permanently costing the real member
    // their Withdraw button.
    describe('withdraw authorization', () => {
      const signedClaimOfSomeoneElse = () =>
        weeklyClaimFactory({
          status: 'signed',
          signature: '0xabc',
          memberAddress: '0x1111111111111111111111111111111111111111',
        });

      it('returns 403 when the caller is not a member of the team', async () => {
        vi.spyOn(prisma.weeklyClaim, 'findUnique').mockResolvedValue(
          signedClaimOfSomeoneElse() as never
        );
        vi.mocked(prisma.team.findFirst).mockResolvedValueOnce(null as never);

        const response = await putAction('withdraw');

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ message: 'Caller is not a member of the team' });
        expect(prisma.$transaction).not.toHaveBeenCalled();
      });

      it('[AC-US-PAYROLL-010-05] returns 403 when a team member withdraws another member claim', async () => {
        vi.spyOn(prisma.weeklyClaim, 'findUnique').mockResolvedValue(
          signedClaimOfSomeoneElse() as never
        );

        const response = await putAction('withdraw');

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ message: 'Caller is not the owner of this weekly claim' });
        expect(prisma.$transaction).not.toHaveBeenCalled();
      });

      it('returns 403 when the team owner withdraws a member claim', async () => {
        // The team / Cash Remuneration owner signs, but the on-chain payout
        // goes to the member — so withdraw stays the member's action alone.
        vi.spyOn(prisma.weeklyClaim, 'findUnique').mockResolvedValue({
          ...signedClaimOfSomeoneElse(),
          wage: ownerWage(CALLER),
        } as never);
        vi.mocked(isCashRemunerationOwner).mockResolvedValue(true);

        const response = await putAction('withdraw');

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ message: 'Caller is not the owner of this weekly claim' });
        expect(prisma.$transaction).not.toHaveBeenCalled();
      });

      it('accepts the claim owner when checksum casing differs', async () => {
        // The caller address comes from the JWT and the claim address from the
        // database; the two are not guaranteed to agree on checksum casing.
        const mixedCase = '0xAbCdEf0123456789AbCdEf0123456789AbCdEf01';
        callerAddressOverride = mixedCase;
        vi.spyOn(prisma.weeklyClaim, 'findUnique').mockResolvedValue(
          weeklyClaimFactory({
            status: 'signed',
            signature: '0xabc',
            memberAddress: mixedCase.toLowerCase(),
          }) as never
        );
        vi.spyOn(prisma, '$transaction').mockResolvedValue([
          weeklyClaimFactory({ status: 'withdrawn' }) as never,
        ]);

        const response = await putAction('withdraw');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'withdrawn');
      });
    });

    it('returns 400 for invalid action', async () => {
      const response = await putAction('invalid');
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid');
    });

    it.each(['enable', 'disable'])(
      '[AC-US-PAYROLL-009-06] rejects legacy %s actions without changing stored status',
      async (action) => {
        const response = await putAction(action);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Invalid action');
        expect(prisma.weeklyClaim.update).not.toHaveBeenCalled();
        expect(prisma.$transaction).not.toHaveBeenCalled();
      }
    );

    it('returns 400 for invalid id on sign', async () => {
      const response = await putAction('sign', 'invalidId');
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid');
    });

    it('returns 400 for missing signature on sign', async () => {
      const response = await putAction('sign', '1', { ...VALID_SIGN_BODY, signature: undefined });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('body.signature');
    });

    it.each([
      {
        title: 'missing signedAgainstContractAddress',
        body: { ...VALID_SIGN_BODY, signedAgainstContractAddress: undefined },
        message: 'body.signedAgainstContractAddress',
      },
      {
        title: 'missing typedDataMessage',
        body: { ...VALID_SIGN_BODY, typedDataMessage: undefined },
        message: 'body.typedDataMessage',
      },
      {
        title: 'missing chainId',
        body: { ...VALID_SIGN_BODY, chainId: undefined },
        message: 'body.chainId',
      },
    ])('returns 400 on sign for $title', async ({ body, message }) => {
      const response = await putAction('sign', '1', body);
      expect(response.status).toBe(400);
      expect(response.body.message).toContain(message);
    });

    it('[AC-US-PAYROLL-008-09] rejects signing against a non-current contract', async () => {
      vi.spyOn(prisma.weeklyClaim, 'findUnique').mockResolvedValue(
        weeklyClaimFactory({ status: 'pending' }) as any
      );
      // Helper returns a different address than what the body declares.
      vi.mocked(getCurrentCashRemunerationContract).mockResolvedValue({
        id: 1,
        teamId: 1,
        type: 'CashRemunerationEIP712',
        address: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      } as never);
      const response = await putAction('sign');
      expect(response.status).toBe(400);
      expect(response.body.message).toContain(
        'signedAgainstContractAddress does not match the team current CashRemunerationEIP712'
      );
    });

    it('returns 400 on sign when there is no current CashRemunerationEIP712 (helper returns null)', async () => {
      vi.spyOn(prisma.weeklyClaim, 'findUnique').mockResolvedValue(
        weeklyClaimFactory({ status: 'pending' }) as any
      );
      vi.mocked(getCurrentCashRemunerationContract).mockResolvedValue(null);
      const response = await putAction('sign');
      expect(response.status).toBe(400);
      expect(response.body.message).toContain(
        'signedAgainstContractAddress does not match the team current CashRemunerationEIP712'
      );
    });

    it('[AC-US-PAYROLL-008-10] rejects a signature from a different wallet', async () => {
      vi.spyOn(prisma.weeklyClaim, 'findUnique').mockResolvedValue(
        weeklyClaimFactory({ status: 'pending' }) as any
      );
      vi.mocked(recoverTypedDataAddress).mockResolvedValue(
        '0x9999999999999999999999999999999999999999' as Address
      );
      const response = await putAction('sign');
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Recovered signer does not match the caller');
    });

    it('returns 400 on sign when recoverTypedDataAddress throws', async () => {
      vi.spyOn(prisma.weeklyClaim, 'findUnique').mockResolvedValue(
        weeklyClaimFactory({ status: 'pending' }) as any
      );
      vi.mocked(recoverTypedDataAddress).mockRejectedValue(new Error('bad sig'));
      const response = await putAction('sign');
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Failed to verify signature');
    });

    it('[AC-US-PAYROLL-008-05] rejects goals-only signing before verifying or persisting a signature', async () => {
      vi.spyOn(prisma.weeklyClaim, 'findUnique').mockResolvedValue(
        weeklyClaimFactory({ status: 'pending' }) as any
      );
      vi.mocked(prisma.claim.count).mockResolvedValue(0);

      const response = await putAction('sign');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: 'At least one daily claim is required before signing a weekly claim',
      });
      expect(prisma.claim.count).toHaveBeenCalledWith({ where: { weeklyClaimId: 1 } });
      expect(recoverTypedDataAddress).not.toHaveBeenCalled();
      expect(prisma.weeklyClaim.update).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('persists signedAgainstContractAddress on successful sign', async () => {
      vi.spyOn(prisma.weeklyClaim, 'findUnique').mockResolvedValue(
        weeklyClaimFactory({ status: 'pending' }) as any
      );
      const updateSpy = vi
        .spyOn(prisma, '$transaction')
        .mockResolvedValue([weeklyClaimFactory({ status: 'signed' }) as any]);
      const updateMock = vi.spyOn(prisma.weeklyClaim, 'update').mockReturnValue({} as never);

      const response = await putAction('sign');
      expect(response.status).toBe(200);
      expect(prisma.claim.count).toHaveBeenCalledWith({ where: { weeklyClaimId: 1 } });
      expect(updateSpy).toHaveBeenCalled();
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            status: 'signed',
            signedAgainstContractAddress: CASH_REMUNERATION_ADDRESS,
            data: expect.objectContaining({
              ownerAddress: CALLER,
              contractAddress: CASH_REMUNERATION_ADDRESS,
              chainId: VALID_SIGN_BODY.chainId,
            }),
          }),
        })
      );
    });

    it('returns 404 if weekly claim is not found', async () => {
      vi.spyOn(prisma.weeklyClaim, 'findUnique')
        .mockResolvedValueOnce({ teamId: 1 } as never)
        .mockResolvedValueOnce(null);
      const response = await putAction('sign');
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'WeeklyClaim not found' });
    });

    it.each([
      {
        title: 'sign success',
        action: 'sign',
        claim: weeklyClaimFactory({ status: 'pending' }),
        txResult: weeklyClaimFactory({ status: 'signed', signature: '0xabc' }),
        expected: 'signed',
      },
      {
        title: 'withdraw success',
        action: 'withdraw',
        claim: weeklyClaimFactory({
          status: 'signed',
          signature: '0xabc',
          memberAddress: CALLER,
        }),
        txResult: weeklyClaimFactory({ status: 'withdrawn', signature: '0xabc' }),
        expected: 'withdrawn',
      },
    ])('returns 200 for $title', async ({ action, claim, txResult, expected }) => {
      vi.spyOn(prisma.weeklyClaim, 'findUnique').mockResolvedValue(claim as any);
      vi.spyOn(prisma, '$transaction').mockResolvedValue([txResult as any]);
      const response = await putAction(action);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', expected);
    });

    it.each([
      {
        title: 'sign with signed status and non-object data',
        action: 'sign',
        claim: weeklyClaimFactory({ status: 'signed', signature: '0xabc', data: 'not-object' }),
      },
      {
        title: '[AC-US-PAYROLL-008-07] re-sign a disabled claim',
        action: 'sign',
        claim: weeklyClaimFactory({ status: 'disabled', signature: '0xabc', data: {} }),
      },
    ])('keeps flowing for $title', async ({ action, claim }) => {
      vi.spyOn(prisma.weeklyClaim, 'findUnique').mockResolvedValue(claim as any);
      vi.spyOn(prisma, '$transaction').mockResolvedValue([
        weeklyClaimFactory({ status: 'signed' }) as any,
      ]);
      const response = await putAction(action);
      expect(response.status).toBe(200);
    });

    it('returns 500 when update throws', async () => {
      vi.spyOn(prisma.weeklyClaim, 'findUnique')
        .mockResolvedValueOnce({ teamId: 1 } as never)
        .mockRejectedValueOnce(new Error('Database error'));
      const response = await putAction('withdraw');
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        message: 'Internal server error has occured',
        error: expect.any(String),
      });
    });
  });

  describe('GET /', () => {
    it('[AC-US-PAYROLL-012-09] lets a regular company member retrieve other members payroll records', async () => {
      vi.mocked(prisma.team.findFirst).mockResolvedValue({
        id: 1,
        ownerAddress: '0x2222222222222222222222222222222222222222',
      } as never);
      vi.mocked(prisma.weeklyClaim.findMany).mockResolvedValue([
        weeklyClaimFactory({
          memberAddress: '0x1111111111111111111111111111111111111111',
          claims: [],
        }),
      ] as never);
      vi.mocked(prisma.weeklyClaim.count).mockResolvedValue(1);
      const response = await request(app).get('/?teamId=1');
      expect(response.status).toBe(200);
      expect(response.body.data[0].memberAddress).not.toBe(CALLER);
      expect(prisma.weeklyClaim.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ teamId: 1 }),
        })
      );
    });
    it('returns 403 if caller is not team member', async () => {
      vi.mocked(prisma.team.findFirst).mockResolvedValueOnce(null);

      const response = await request(app).get('/?teamId=1');
      expect(response.status).toBe(403);
      expect(response.body).toEqual({ message: 'Caller is not a member of the team' });
    });

    it('returns 400 if teamId is missing', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('teamId');
    });

    it('[AC-US-PAYROLL-012-10] returns 400 if status is invalid', async () => {
      const response = await request(app).get('/?teamId=1&status=invalid');
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid status');
    });

    it('[AC-US-PAYROLL-012-11] returns 400 if memberAddress is invalid', async () => {
      const response = await request(app).get('/?teamId=1&memberAddress=invalid-address');
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid');
    });

    it('[AC-US-PAYROLL-012-04] [AC-US-PAYROLL-012-05] [AC-US-PAYROLL-012-06] returns filtered claims, derived minutes, and refreshed attachment URLs', async () => {
      const memberAddress = '0x000000000000000000000000000000000000dEaD';

      mockGetPresignedDownloadUrl
        .mockResolvedValueOnce('https://fresh-1.example.com')
        .mockRejectedValueOnce(new Error('presign failed'));

      const weeklyClaims = [
        {
          ...weeklyClaimFactory({ id: 1, memberAddress, status: null }),
          claims: [
            {
              id: 101,
              hoursWorked: undefined,
              minutesWorked: undefined,
              fileAttachments: [
                {
                  fileKey: 'k1',
                  fileUrl: 'https://old.example.com',
                  fileType: 'image/png',
                  fileSize: 1,
                },
              ],
            },
            {
              id: 102,
              hoursWorked: 0,
              minutesWorked: 2,
              fileAttachments: [
                { fileUrl: 'https://no-key.example.com', fileType: 'image/png', fileSize: 2 },
              ],
            },
            {
              id: 103,
              hoursWorked: 0,
              minutesWorked: 3,
              fileAttachments: ['non-object'],
            },
            {
              id: 104,
              hoursWorked: 0,
              minutesWorked: 4,
              fileAttachments: [
                {
                  fileKey: 'k2',
                  fileUrl: 'https://old2.example.com',
                  fileType: 'image/png',
                  fileSize: 4,
                },
              ],
            },
            {
              id: 105,
              hoursWorked: 0,
              minutesWorked: 1,
              fileAttachments: [],
            },
          ],
        },
      ];

      vi.spyOn(prisma.weeklyClaim, 'findMany').mockResolvedValue(weeklyClaims as any);
      vi.spyOn(prisma.weeklyClaim, 'count').mockResolvedValue(weeklyClaims.length);

      const response = await request(app).get(
        `/?teamId=1&status=pending&memberAddress=${memberAddress}`
      );
      expect(response.status).toBe(200);
      expect(prisma.weeklyClaim.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            teamId: 1,
            memberAddress: { equals: memberAddress, mode: 'insensitive' },
            status: 'pending',
          }),
        })
      );

      expect(response.body.total).toBe(weeklyClaims.length);
      expect(response.body.data[0].minutesWorked).toBe(10);
      expect(response.body.data[0].claims[0].fileAttachments[0].fileUrl).toBe(
        'https://fresh-1.example.com'
      );
      expect(response.body.data[0].claims[3].fileAttachments[0].fileUrl).toBe(
        'https://old2.example.com'
      );
    });

    it('refreshes embedded member profile images alongside attachment URLs', async () => {
      const memberAddress = '0x000000000000000000000000000000000000dEaD';

      mockGetPresignedDownloadUrl
        .mockResolvedValueOnce('https://fresh-member.example.com')
        .mockResolvedValueOnce('https://fresh-attachment.example.com');

      vi.spyOn(prisma.weeklyClaim, 'findMany').mockResolvedValue([
        {
          ...weeklyClaimFactory({ id: 2, memberAddress, status: 'pending' }),
          member: {
            address: memberAddress,
            name: 'Achille',
            imageUrl: 'https://storage.example.com/profiles/member-avatar.png?signature=expired',
          },
          claims: [
            {
              id: 201,
              hoursWorked: 0,
              minutesWorked: 60,
              fileAttachments: [
                {
                  fileKey: 'attachments/claim-proof.png',
                  fileUrl: 'https://old-attachment.example.com',
                  fileType: 'image/png',
                  fileSize: 42,
                },
              ],
            },
          ],
        },
      ] as any);

      const response = await request(app).get(`/?teamId=1&memberAddress=${memberAddress}`);

      expect(response.status).toBe(200);
      expect(response.body.data[0].member.imageUrl).toBe('https://fresh-member.example.com');
      expect(response.body.data[0].claims[0].fileAttachments[0].fileUrl).toBe(
        'https://fresh-attachment.example.com'
      );
      expect(mockGetPresignedDownloadUrl).toHaveBeenNthCalledWith(
        1,
        'profiles/member-avatar.png',
        604800
      );
      expect(mockGetPresignedDownloadUrl).toHaveBeenNthCalledWith(2, 'attachments/claim-proof.png');
    });

    it('returns 200 for empty claims list', async () => {
      vi.spyOn(prisma.weeklyClaim, 'findMany').mockResolvedValue([] as any);
      vi.spyOn(prisma.weeklyClaim, 'count').mockResolvedValue(0);
      const response = await request(app).get('/?teamId=1&status=pending');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: [], total: 0 });
    });

    it('[AC-US-PAYROLL-012-07] paginates when page and limit are provided', async () => {
      vi.spyOn(prisma.weeklyClaim, 'findMany').mockResolvedValue([
        { ...weeklyClaimFactory({ id: 11 }), claims: [], member: null },
      ] as any);
      vi.spyOn(prisma.weeklyClaim, 'count').mockResolvedValue(42);

      const response = await request(app).get('/?teamId=1&page=3&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(42);
      expect(response.body.data).toHaveLength(1);
      expect(prisma.weeklyClaim.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
          orderBy: { weekStart: 'desc' },
        })
      );
    });

    it('[AC-US-PAYROLL-012-08] skips pagination when neither page nor limit is provided', async () => {
      vi.spyOn(prisma.weeklyClaim, 'findMany').mockResolvedValue([
        { ...weeklyClaimFactory({ id: 12 }), claims: [], member: null },
      ] as any);
      vi.spyOn(prisma.weeklyClaim, 'count').mockResolvedValue(5);

      const response = await request(app).get('/?teamId=1');

      expect(response.status).toBe(200);
      const findManyCall = vi.mocked(prisma.weeklyClaim.findMany).mock.calls.at(-1)?.[0];
      expect(findManyCall).not.toHaveProperty('skip');
      expect(findManyCall).not.toHaveProperty('take');
    });

    it('[AC-US-PAYROLL-012-12] rejects invalid pagination params', async () => {
      const response = await request(app).get('/?teamId=1&page=0');
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Page');
    });

    it('[AC-US-PAYROLL-012-13] rejects a non-positive page size', async () => {
      const response = await request(app).get('/?teamId=1&limit=0');
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Limit must be at least 1');
      expect(prisma.weeklyClaim.findMany).not.toHaveBeenCalled();
    });

    it('[AC-US-PAYROLL-012-07] rejects page sizes above the 100-row maximum', async () => {
      const response = await request(app).get('/?teamId=1&page=1&limit=101');
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Limit cannot exceed 100');
      expect(prisma.weeklyClaim.findMany).not.toHaveBeenCalled();
    });

    it('returns 500 when list query fails', async () => {
      vi.spyOn(prisma.weeklyClaim, 'findMany').mockRejectedValue(new Error('Database error'));
      const response = await request(app).get('/?teamId=1');
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        message: 'Internal server error has occured',
        error: expect.any(String),
      });
    });
  });

  describe('POST /sync', () => {
    const validContract = {
      id: 11,
      teamId: 1,
      type: 'CashRemunerationEIP712',
      address: '0x1234567890123456789012345678901234567890',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('returns 400 if teamId is missing', async () => {
      const response = await request(app).post('/sync');
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('teamId');
    });

    it('returns 403 if caller is not team member', async () => {
      vi.mocked(prisma.team.findFirst).mockResolvedValueOnce(null);

      const response = await request(app).post('/sync?teamId=1');
      expect(response.status).toBe(403);
      expect(response.body).toEqual({ message: 'Caller is not a member of the team' });
    });

    it.each([
      { title: 'contract not found', contract: null },
      {
        title: 'invalid contract address',
        contract: { ...validContract, address: 'not-an-eth-address' },
      },
    ])('returns 404 when $title', async ({ contract }) => {
      vi.mocked(getCurrentCashRemunerationContract).mockResolvedValue(contract as any);
      const response = await request(app).post('/sync?teamId=1');
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        message: 'Cash Remuneration contract not found for the team',
      });
    });

    it('returns empty sync result when no weekly claims', async () => {
      vi.mocked(getCurrentCashRemunerationContract).mockResolvedValue(validContract as any);
      vi.spyOn(prisma.weeklyClaim, 'findMany').mockResolvedValue([] as any);

      const response = await request(app).post('/sync?teamId=1');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ teamId: 1, totalProcessed: 0, updated: [], skipped: [] });
    });

    it('[AC-US-PAYROLL-011-09] returns the persisted reconciled status on subsequent reads', async () => {
      vi.mocked(getCurrentCashRemunerationContract).mockResolvedValue(validContract as never);
      const stored = weeklyClaimFactory({
        status: 'signed',
        signature: '0xabcdef',
        signedAgainstContractAddress: validContract.address,
        claims: [],
      });
      vi.mocked(prisma.weeklyClaim.findMany).mockImplementation(async () => [stored] as never);
      vi.mocked(prisma.weeklyClaim.update).mockImplementation(async (args) => {
        stored.status = args.data.status as string;
        return stored as never;
      });
      readContractMock.mockReset();
      readContractMock.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      expect((await request(app).post('/sync?teamId=1')).status).toBe(200);
      expect(prisma.weeklyClaim.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'withdrawn' },
      });
      const response = await request(app).get('/?teamId=1');
      expect(response.status).toBe(200);
      expect(response.body.data[0].status).toBe('withdrawn');
    });

    it('[AC-US-PAYROLL-011-02] [AC-US-PAYROLL-011-08] [AC-US-PAYROLL-011-11] reconciles paid claims and skips invalid signatures', async () => {
      vi.mocked(getCurrentCashRemunerationContract).mockResolvedValue(validContract as any);

      vi.spyOn(prisma.weeklyClaim, 'findMany').mockResolvedValue([
        {
          id: 1,
          status: 'signed',
          signature: 'not-hex',
          signedAgainstContractAddress: validContract.address,
        },
        {
          id: 2,
          status: 'signed',
          signature: '0xabcdef',
          signedAgainstContractAddress: validContract.address,
        },
      ] as any);

      readContractMock.mockReset();
      readContractMock.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      const updateSpy = vi.spyOn(prisma.weeklyClaim, 'update').mockResolvedValue({
        id: 2,
        status: 'withdrawn',
      } as any);

      const response = await request(app).post('/sync?teamId=1');
      expect(response.status).toBe(200);
      expect(response.body.totalProcessed).toBe(2);
      expect(response.body.skipped).toEqual([{ id: 1, reason: 'Missing or invalid signature' }]);
      expect(response.body.updated).toEqual([
        { id: 2, previousStatus: 'signed', newStatus: 'withdrawn' },
      ]);
      expect(updateSpy).toHaveBeenCalledWith({ where: { id: 2 }, data: { status: 'withdrawn' } });
    });

    it('keeps signed status when neither paid nor disabled', async () => {
      vi.mocked(getCurrentCashRemunerationContract).mockResolvedValue(validContract as any);
      vi.spyOn(prisma.weeklyClaim, 'findMany').mockResolvedValue([
        {
          id: 7,
          status: 'signed',
          signature: '0xfeed',
          signedAgainstContractAddress: validContract.address,
        },
      ] as any);

      readContractMock.mockReset();
      readContractMock.mockResolvedValueOnce(false).mockResolvedValueOnce(false);

      const response = await request(app).post('/sync?teamId=1');
      expect(response.status).toBe(200);
      expect(response.body.updated).toEqual([]);
      expect(prisma.weeklyClaim.update).not.toHaveBeenCalled();
    });

    it('[AC-US-PAYROLL-011-03] updates with unknown previous status when claim.status is null', async () => {
      vi.mocked(getCurrentCashRemunerationContract).mockResolvedValue(validContract as any);
      vi.spyOn(prisma.weeklyClaim, 'findMany').mockResolvedValue([
        {
          id: 8,
          status: null,
          signature: '0xface',
          signedAgainstContractAddress: validContract.address,
        },
      ] as any);

      readContractMock.mockReset();
      readContractMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      vi.spyOn(prisma.weeklyClaim, 'update').mockResolvedValue({
        id: 8,
        status: 'disabled',
      } as any);

      const response = await request(app).post('/sync?teamId=1');
      expect(response.status).toBe(200);
      expect(response.body.updated).toEqual([
        { id: 8, previousStatus: 'unknown', newStatus: 'disabled' },
      ]);
    });

    it('[AC-US-PAYROLL-011-12] skips claim on readContract error', async () => {
      vi.mocked(getCurrentCashRemunerationContract).mockResolvedValue(validContract as any);
      vi.spyOn(prisma.weeklyClaim, 'findMany').mockResolvedValue([
        {
          id: 5,
          status: 'signed',
          signature: '0xdeadbeef',
          signedAgainstContractAddress: validContract.address,
        },
      ] as any);

      readContractMock.mockReset();
      readContractMock.mockRejectedValueOnce(new Error('RPC error'));

      const response = await request(app).post('/sync?teamId=1');
      expect(response.status).toBe(200);
      expect(response.body.updated).toEqual([]);
      expect(response.body.skipped).toEqual([{ id: 5, reason: 'Failed to read contract state' }]);
    });

    it('[AC-US-PAYROLL-008-16] [AC-US-PAYROLL-011-10] resets an old-contract signature to pending', async () => {
      vi.mocked(getCurrentCashRemunerationContract).mockResolvedValue(validContract as any);
      vi.spyOn(prisma.weeklyClaim, 'findMany').mockResolvedValue([
        {
          id: 21,
          status: 'signed',
          signature: '0xabcd',
          signedAgainstContractAddress: '0x9999999999999999999999999999999999999999',
        },
        {
          id: 22,
          status: 'disabled',
          signature: '0xef01',
          signedAgainstContractAddress: null,
        },
      ] as any);

      readContractMock.mockReset();
      const updateSpy = vi.spyOn(prisma.weeklyClaim, 'update').mockResolvedValue({} as any);

      const response = await request(app).post('/sync?teamId=1');

      expect(response.status).toBe(200);
      expect(response.body.updated).toEqual([
        { id: 21, previousStatus: 'signed', newStatus: 'pending' },
        { id: 22, previousStatus: 'disabled', newStatus: 'pending' },
      ]);
      expect(readContractMock).not.toHaveBeenCalled();
      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: 21 },
        data: {
          status: 'pending',
          signature: null,
          signedAgainstContractAddress: null,
          data: Prisma.JsonNull,
        },
      });
      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: 22 },
        data: {
          status: 'pending',
          signature: null,
          signedAgainstContractAddress: null,
          data: Prisma.JsonNull,
        },
      });
    });

    it('matches signedAgainstContractAddress case-insensitively', async () => {
      vi.mocked(getCurrentCashRemunerationContract).mockResolvedValue(validContract as any);
      vi.spyOn(prisma.weeklyClaim, 'findMany').mockResolvedValue([
        {
          id: 30,
          status: 'signed',
          signature: '0xabcd',
          signedAgainstContractAddress: validContract.address.toUpperCase(),
        },
      ] as any);

      readContractMock.mockReset();
      readContractMock.mockResolvedValueOnce(false).mockResolvedValueOnce(false);

      const response = await request(app).post('/sync?teamId=1');
      expect(response.status).toBe(200);
      expect(response.body.updated).toEqual([]);
      expect(readContractMock).toHaveBeenCalled();
    });

    it('returns 500 when sync setup throws', async () => {
      vi.mocked(getCurrentCashRemunerationContract).mockResolvedValue(validContract as any);
      vi.spyOn(prisma.weeklyClaim, 'findMany').mockRejectedValue(new Error('Database failure'));

      const response = await request(app).post('/sync?teamId=1');
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        message: 'Internal server error has occured',
        error: 'Database failure',
      });
    });
  });

  describe('PUT /goals', () => {
    const GOALS_BODY = {
      teamId: 1,
      weekStart: '2024-07-22T00:00:00.000Z',
      weeklyGoals: '# Week goals\n\n- Ship the editor',
    };
    const currentWage = { id: 7, teamId: 1, userAddress: CALLER, nextWageId: null };

    it('[AC-US-PAYROLL-004-02] creates a claim-less weekly claim when none exists yet', async () => {
      mockResolveWageForWeek.mockResolvedValue(currentWage);
      vi.mocked(prisma.weeklyClaim.findFirst).mockResolvedValue(null as never);
      vi.mocked(prisma.weeklyClaim.upsert).mockResolvedValue(
        weeklyClaimFactory({ id: 42, weeklyGoals: GOALS_BODY.weeklyGoals }) as never
      );

      const response = await request(app).put('/goals').send(GOALS_BODY);

      expect(response.status).toBe(200);
      expect(prisma.weeklyClaim.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            teamId_memberAddress_weekStart: expect.objectContaining({
              teamId: 1,
              memberAddress: CALLER,
            }),
          },
          create: expect.objectContaining({
            wageId: currentWage.id,
            memberAddress: CALLER,
            teamId: 1,
            status: 'pending',
            weeklyGoals: GOALS_BODY.weeklyGoals,
          }),
        })
      );
      expect(prisma.weeklyClaim.update).not.toHaveBeenCalled();
    });

    it('[AC-US-PAYROLL-004-03] [AC-US-PAYROLL-004-05] updates one existing weekly memo without creating a duplicate', async () => {
      mockResolveWageForWeek.mockResolvedValue(currentWage);
      vi.mocked(prisma.weeklyClaim.findFirst).mockResolvedValue(
        weeklyClaimFactory({ id: 5, status: 'pending', signature: null }) as never
      );
      vi.mocked(prisma.weeklyClaim.update).mockResolvedValue(
        weeklyClaimFactory({ id: 5, weeklyGoals: GOALS_BODY.weeklyGoals }) as never
      );

      const response = await request(app).put('/goals').send(GOALS_BODY);

      expect(response.status).toBe(200);
      expect(prisma.weeklyClaim.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { weeklyGoals: GOALS_BODY.weeklyGoals },
      });
      expect(prisma.weeklyClaim.upsert).not.toHaveBeenCalled();
    });

    const rejectsLockedGoalsEdit = async (status: 'withdrawn' | 'disabled') => {
      vi.mocked(prisma.weeklyClaim.findFirst).mockResolvedValue(
        weeklyClaimFactory({ id: 5, status }) as never
      );

      const response = await request(app).put('/goals').send(GOALS_BODY);

      expect(response.status).toBe(409);
      expect(prisma.weeklyClaim.update).not.toHaveBeenCalled();
      expect(prisma.weeklyClaim.upsert).not.toHaveBeenCalled();
    };

    it('[AC-US-PAYROLL-004-08] rejects goals changes after a week is withdrawn', () =>
      rejectsLockedGoalsEdit('withdrawn'));

    it('[AC-US-PAYROLL-004-09] rejects goals changes after a week is disabled', () =>
      rejectsLockedGoalsEdit('disabled'));

    it('[AC-US-PAYROLL-004-07] rejects a goals update when the week is signed', async () => {
      mockResolveWageForWeek.mockResolvedValue(currentWage);
      vi.mocked(prisma.weeklyClaim.findFirst).mockResolvedValue(
        weeklyClaimFactory({ id: 5, status: 'signed', signature: '0xabc' }) as never
      );

      const response = await request(app).put('/goals').send(GOALS_BODY);

      expect(response.status).toBe(409);
      expect(prisma.weeklyClaim.update).not.toHaveBeenCalled();
      expect(prisma.weeklyClaim.upsert).not.toHaveBeenCalled();
    });

    it('[AC-US-PAYROLL-004-06] returns 400 when the caller has no current wage', async () => {
      // Only reachable on a week nobody has opened: an open week already
      // carries the wage that prices it, so no resolution is needed.
      vi.mocked(prisma.weeklyClaim.findFirst).mockResolvedValue(null);
      mockResolveWageForWeek.mockResolvedValue(null);

      const response = await request(app).put('/goals').send(GOALS_BODY);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('No wage found for the user');
    });

    it('returns 400 when the body fails validation', async () => {
      const response = await request(app)
        .put('/goals')
        .send({ teamId: 1, weekStart: 'not-a-date', weeklyGoals: 'x' });

      expect(response.status).toBe(400);
    });
  });
});
