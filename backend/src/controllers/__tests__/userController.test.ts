import { faker } from '@faker-js/faker';
import { User } from '@prisma/client';
import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authorizeUser } from '../../middleware/authMiddleware';
import userRoutes from '../../routes/userRoutes';
import { prisma } from '../../utils';
import { isUserPartOfTheTeam } from '../../utils/teamUtils';
import { getAllUsers } from '../userController';

const DEFAULT_ADDRESS = '0x1234567890123456789012345678901234567890';
const ALT_ADDRESS = '0x9999999999999999999999999999999999999999';
const PROFILE_KEY = `profiles/${DEFAULT_ADDRESS}/new.png`;
const SIGNED_URL = `https://storage.railway.app/bucket/${PROFILE_KEY}?X-Amz-Signature=signed`;

const { mockGetPresignedDownloadUrl, mockUploadFile, mockDeleteFile, mockIsStorageConfigured } =
  vi.hoisted(() => ({
    mockGetPresignedDownloadUrl: vi.fn(),
    mockUploadFile: vi.fn(),
    mockDeleteFile: vi.fn(),
    mockIsStorageConfigured: vi.fn(() => true),
  }));

vi.mock('../../services/storageService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/storageService')>();
  return {
    ...actual,
    uploadFile: mockUploadFile,
    getPresignedDownloadUrl: mockGetPresignedDownloadUrl,
    deleteFile: mockDeleteFile,
    isStorageConfigured: mockIsStorageConfigured,
  };
});

vi.mock('../../utils/teamUtils', () => ({ isUserPartOfTheTeam: vi.fn(() => false) }));

vi.mock('../../utils', async () => {
  const actual = await vi.importActual('../../utils');
  return {
    ...actual,
    prisma: {
      user: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      team: { findUnique: vi.fn() },
      memberTeamsData: { update: vi.fn() },
    },
  };
});

vi.mock('../../middleware/authMiddleware', () => ({
  authorizeUser: vi.fn(async (req: Request, _res: Response, next: NextFunction) => {
    req.address = DEFAULT_ADDRESS;
    next();
    return undefined;
  }),
}));

const mockAuthorizeUser = vi.mocked(authorizeUser);
const mockIsUserPartOfTheTeam = vi.mocked(isUserPartOfTheTeam);

const app = express();
app.use(express.json());
app.use('/', userRoutes);

const mockUser: User = {
  address: DEFAULT_ADDRESS,
  name: 'MemberName',
  nonce: 'nonce123',
  imageUrl: 'https://example.com/image.jpg',
  createdAt: new Date(),
  updatedAt: new Date(),
} as User;

const mockUsers = [
  {
    address: '0x1111111111111111111111111111111111111111',
    name: 'Alice',
    nonce: 'nonce123',
    imageUrl: 'https://example.com/image.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    address: '0x2222222222222222222222222222222222222222',
    name: 'Bob',
    nonce: 'nonce456',
    imageUrl: 'https://example.com/image2.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockAddress = faker.finance.ethereumAddress();
const setAuth = (address?: string) =>
  mockAuthorizeUser.mockImplementation(async (req: Request, _res: Response, next: NextFunction) => {
    if (address !== undefined) req.address = address;
    next();
    return undefined;
  });

const mockUploadedImage = () =>
  mockUploadFile.mockResolvedValueOnce({
    success: true,
    metadata: { key: PROFILE_KEY, fileType: 'image/png', fileSize: 128 },
  });

const putWithImage = (address = DEFAULT_ADDRESS, name = 'WithImage') =>
  request(app)
    .put(`/${address}`)
    .field('name', name)
    .attach('profileImage', Buffer.from('fake-image-bytes'), 'avatar.png');

describe('User Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth(DEFAULT_ADDRESS);
    mockIsUserPartOfTheTeam.mockReturnValue(false);
    mockIsStorageConfigured.mockReturnValue(true);
  });

  describe('GET: /nonce/:address', () => {
    it('returns generated nonce when user does not exist', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      const response = await request(app).get(`/nonce/${mockAddress}`).send();
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, nonce: expect.any(String) });
    });

    it('returns stored nonce when user exists', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);
      const response = await request(app).get(`/nonce/${mockAddress}`).send();
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, nonce: mockUser.nonce });
    });

    it('returns 500 on prisma error', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockRejectedValue(new Error('Error'));
      const response = await request(app).get(`/nonce/${mockAddress}`).send();
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error has occured');
    });
  });

  describe('getUser', () => {
    it('returns 404 if user is missing', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      const response = await request(app).get(`/${mockAddress}`).send();
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });

    it('keeps original image URL when presigned refresh fails', async () => {
      const railwayUser = {
        ...mockUser,
        imageUrl:
          'https://storage.railway.app/bucket/profiles/0xabc/avatar.png?X-Amz-Signature=expired',
      };
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(railwayUser);
      mockGetPresignedDownloadUrl.mockRejectedValueOnce(new Error('presign failed'));

      const response = await request(app).get(`/${railwayUser.address}`).send();
      expect(response.status).toBe(200);
      expect(response.body.imageUrl).toBe(railwayUser.imageUrl);
    });

    it.each([
      ['null imageUrl', null, null],
      ['non-string imageUrl', { malformed: true }, { malformed: true }],
    ])('keeps %s safely', async (_label, imageUrl, expected) => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ ...mockUser, imageUrl } as any);
      const response = await request(app).get(`/${mockUser.address}`).send();
      expect(response.status).toBe(200);
      expect(response.body.imageUrl).toEqual(expected);
    });

    it('returns 500 on error', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockRejectedValue(new Error('Error'));
      const response = await request(app).get(`/${DEFAULT_ADDRESS}`).send();
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error has occured');
    });
  });

  describe('updateUser', () => {
    it('returns 401 when caller address is missing', async () => {
      setAuth(undefined);
      const response = await request(app)
        .put(`/${DEFAULT_ADDRESS}`)
        .send({ name: 'NewName', imageUrl: 'https://example.com/newimage.jpg' });
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Update user error: Missing user address');
    });

    it('returns 403 when caller is not the user', async () => {
      setAuth(ALT_ADDRESS);
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);

      const response = await request(app)
        .put(`/${mockUser.address}`)
        .send({ name: 'NewName', imageUrl: 'https://example.com/newimage.jpg' });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Unauthorized');
    });

    it('returns 404 when user is not found', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      const response = await request(app)
        .put(`/${DEFAULT_ADDRESS}`)
        .send({ name: 'NewName', imageUrl: 'https://example.com/newimage.jpg' });
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });

    it('continues update when old profile deletion throws', async () => {
      const existingUser = {
        ...mockUser,
        imageUrl: `https://storage.railway.app/bucket/profiles/${DEFAULT_ADDRESS}/old.png?X-Amz-Signature=expired`,
      };

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(existingUser as any);
      mockUploadedImage();
      mockGetPresignedDownloadUrl
        .mockResolvedValueOnce(SIGNED_URL)
        .mockResolvedValueOnce(
          `https://storage.railway.app/bucket/${PROFILE_KEY}?X-Amz-Signature=fresh`
        );
      mockDeleteFile.mockRejectedValueOnce(new Error('delete failed'));
      vi.spyOn(prisma.user, 'update').mockResolvedValue({
        ...existingUser,
        name: 'WithImage',
        imageUrl: SIGNED_URL,
      } as any);

      const response = await putWithImage(existingUser.address);
      expect(response.status).toBe(200);
      expect(response.body.imageUrl).toContain('X-Amz-Signature=fresh');
    });

    it.each([
      ['https://example.com/no-storage-key.png', false],
      [null, true],
    ])(
      'skips old profile deletion for existing imageUrl=%p',
      async (existingImage, assertNeverCalled) => {
        vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
          ...mockUser,
          imageUrl: existingImage,
        } as any);
        mockUploadedImage();
        mockGetPresignedDownloadUrl.mockResolvedValueOnce(SIGNED_URL);
        vi.spyOn(prisma.user, 'update').mockResolvedValue({
          ...mockUser,
          name: 'WithImage',
          imageUrl: SIGNED_URL,
        } as any);

        const response = await putWithImage(mockUser.address);
        expect(response.status).toBe(200);
        if (assertNeverCalled) expect(mockDeleteFile).not.toHaveBeenCalled();
        else
          expect(mockDeleteFile).not.toHaveBeenCalledWith(
            expect.stringContaining('no-storage-key')
          );
      }
    );

    it('returns fallback upload error when upload has no error message', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      mockUploadFile.mockResolvedValueOnce({ success: false });

      const response = await putWithImage(DEFAULT_ADDRESS, 'NewName');
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Failed to upload profile image');
    });

    it('returns 500 when upload throws unexpectedly', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      mockUploadFile.mockRejectedValueOnce(new Error('upload crash'));

      const response = await putWithImage(DEFAULT_ADDRESS, 'NewName');
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error has occured');
    });

    it('updates trader flags when teamId and traderSafeAddress are provided', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      vi.spyOn(prisma.user, 'update').mockResolvedValue({
        ...mockUser,
        traderSafeAddress: '0x3333333333333333333333333333333333333333',
      } as any);
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue({
        members: [{ address: mockUser.address }],
      } as any);
      vi.spyOn(prisma.memberTeamsData, 'update').mockResolvedValue({} as any);
      mockIsUserPartOfTheTeam.mockReturnValue(true);

      const response = await request(app).put(`/${mockUser.address}`).send({
        name: 'NewName',
        teamId: '1',
        traderSafeAddress: '0x3333333333333333333333333333333333333333',
      });

      expect(response.status).toBe(200);
      expect(prisma.memberTeamsData.update).toHaveBeenCalled();
    });

    it('handles missing team data using members fallback', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      vi.spyOn(prisma.user, 'update').mockResolvedValue({
        ...mockUser,
        traderSafeAddress: '0x3333333333333333333333333333333333333333',
      } as any);
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(undefined as any);
      mockIsUserPartOfTheTeam.mockReturnValue(false);

      const response = await request(app).put(`/${mockUser.address}`).send({
        name: 'NewName',
        teamId: '1',
        traderSafeAddress: '0x3333333333333333333333333333333333333333',
      });

      expect(response.status).toBe(200);
      expect(mockIsUserPartOfTheTeam).toHaveBeenCalledWith([], mockUser.address);
      expect(prisma.memberTeamsData.update).not.toHaveBeenCalled();
    });

    it('returns 500 on update error', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockRejectedValue(new Error('Error'));
      const response = await request(app)
        .put(`/${DEFAULT_ADDRESS}`)
        .send({ name: 'NewName', imageUrl: 'https://example.com/newimage.jpg' });
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error has occured');
    });
  });

  describe('getAllUsers', () => {
    it('applies search filter and refreshes railway profile URLs', async () => {
      const users = [
        {
          ...mockUsers[0],
          imageUrl:
            'https://storage.railway.app/bucket/profiles/0x1111111111111111111111111111111111111111/avatar.png?X-Amz-Signature=old',
        },
      ];

      vi.spyOn(prisma.user, 'findMany').mockResolvedValue(users as any);
      vi.spyOn(prisma.user, 'count').mockResolvedValue(1);
      mockGetPresignedDownloadUrl.mockResolvedValueOnce(
        'https://storage.railway.app/bucket/profiles/0x1111111111111111111111111111111111111111/avatar.png?X-Amz-Signature=new'
      );

      const response = await request(app).get('/?page=1&limit=10&search=alice').send();
      expect(response.status).toBe(200);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: 'alice', mode: 'insensitive' } },
              { address: { contains: 'alice', mode: 'insensitive' } },
            ],
          },
        })
      );
      expect(response.body.users[0].imageUrl).toContain('X-Amz-Signature=new');
    });

    it('refreshes image URL when imageUrl is a direct profiles key', async () => {
      vi.spyOn(prisma.user, 'findMany').mockResolvedValue([
        {
          ...mockUsers[0],
          imageUrl: 'profiles/0x1111111111111111111111111111111111111111/avatar.png',
        },
      ] as any);
      vi.spyOn(prisma.user, 'count').mockResolvedValue(1);
      mockGetPresignedDownloadUrl.mockResolvedValueOnce(
        'https://storage.railway.app/bucket/profiles/0x1111111111111111111111111111111111111111/avatar.png?X-Amz-Signature=fresh'
      );

      const response = await request(app).get('/?page=1&limit=10').send();
      expect(response.status).toBe(200);
      expect(mockGetPresignedDownloadUrl).toHaveBeenCalledWith(
        'profiles/0x1111111111111111111111111111111111111111/avatar.png',
        604800
      );
    });

    it('defaults page and limit when query values are missing (controller direct)', async () => {
      const req = {
        query: { page: undefined, limit: undefined, search: undefined },
      } as unknown as Request;
      const json = vi.fn();
      const res = { status: vi.fn().mockReturnValue({ json }) } as unknown as Response;

      vi.spyOn(prisma.user, 'findMany').mockResolvedValue([] as any);
      vi.spyOn(prisma.user, 'count').mockResolvedValue(0);

      await getAllUsers(req, res);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 })
      );
    });

    it('returns 500 on list error', async () => {
      vi.spyOn(prisma.user, 'findMany').mockRejectedValue(new Error('Error'));
      const response = await request(app).get('/').send();
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error has occured');
    });
  });
});
