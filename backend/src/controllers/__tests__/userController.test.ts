import { faker } from '@faker-js/faker';
import { User } from '@prisma/client';
import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userRoutes from '../../routes/userRoutes';
import { prisma } from '../../utils';
import { getAllUsers } from '../userController';

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

vi.mock('../../utils/teamUtils', () => ({
  isUserPartOfTheTeam: vi.fn(() => false),
}));

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
      team: {
        findUnique: vi.fn(),
      },
      memberTeamsData: {
        update: vi.fn(),
      },
    },
  };
});

// Mock the authorization middleware with proper hoisting
vi.mock('../../middleware/authMiddleware', () => ({
  authorizeUser: vi.fn(async (req: Request, res: Response, next: NextFunction) => {
    // Default behavior - can be overridden in tests
    req.address = '0x1234567890123456789012345678901234567890';
    next();
    return undefined;
  }),
}));

// Import the mocked function after mocking
import { authorizeUser } from '../../middleware/authMiddleware';
import { isUserPartOfTheTeam } from '../../utils/teamUtils';
const mockAuthorizeUser = vi.mocked(authorizeUser);
const mockIsUserPartOfTheTeam = vi.mocked(isUserPartOfTheTeam);

const app = express();
app.use(express.json());
// Use the actual userRoutes from the routes file
app.use('/', userRoutes);

const mockUser: User = {
  address: '0x1234567890123456789012345678901234567890',
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

describe('User Controller', () => {
  describe('GET: /nonce/:address', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      // Reset to default behavior

      mockAuthorizeUser.mockImplementation(
        async (req: Request, res: Response, next: NextFunction) => {
          req.address = '0x1234567890123456789012345678901234567890';
          next();
          return undefined;
        }
      );
    });

    it('should return a nonce if user does not exist', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      const response = await request(app).get(`/nonce/${mockAddress}`).send();

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        nonce: expect.any(String),
      });
    });

    it("should return the user's nonce if user exists", async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);

      const response = await request(app).get(`/nonce/${mockAddress}`).send();

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        nonce: mockUser.nonce,
      });
    });

    it('should return 500 if an error occurs', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockRejectedValue(new Error('Error'));

      const response = await request(app).get(`/nonce/${mockAddress}`).send();

      expect(response.status).toBe(500);
      expect(response.body.message).toEqual('Internal server error has occured');
    });
  });

  describe('getUser', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      // Reset to default behavior

      mockAuthorizeUser.mockImplementation(
        async (req: Request, res: Response, next: NextFunction) => {
          req.address = '0x1234567890123456789012345678901234567890';
          next();
          return undefined;
        }
      );
    });

    it('should return 404 if user is not found', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      const response = await request(app).get(`/${mockAddress}`).send();

      expect(response.status).toBe(404);
      expect(response.body.message).toEqual('User not found');
    });

    it('should keep original image URL when presigned refresh fails', async () => {
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

    it('should return null imageUrl when user has no profile image', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        ...mockUser,
        imageUrl: null,
      } as any);

      const response = await request(app).get(`/${mockUser.address}`).send();

      expect(response.status).toBe(200);
      expect(response.body.imageUrl).toBeNull();
    });

    it('should keep non-string imageUrl payloads without crashing', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        ...mockUser,
        imageUrl: { malformed: true },
      } as any);

      const response = await request(app).get(`/${mockUser.address}`).send();

      expect(response.status).toBe(200);
      expect(response.body.imageUrl).toEqual({ malformed: true });
    });

    it('should return 500 if an error occurs', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockRejectedValue(new Error('Error'));

      const response = await request(app).get('/0x1234567890123456789012345678901234567890').send({
        address: '0x1111111111111111111111111111111111111111',
      });

      expect(response.status).toBe(500);
      expect(response.body.message).toEqual('Internal server error has occured');
    });
  });

  describe('updateUser', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      // Reset to default behavior

      mockAuthorizeUser.mockImplementation(
        async (req: Request, res: Response, next: NextFunction) => {
          req.address = '0x1234567890123456789012345678901234567890';
          next();
          return undefined;
        }
      );
    });

    it('should return 400 if caller address is missing', async () => {
      // Mock auth middleware to not set address
      mockAuthorizeUser.mockImplementation(
        async (req: Request, res: Response, next: NextFunction) => {
          // Don't set address to simulate missing caller address
          next();
          return undefined;
        }
      );

      const response = await request(app).put('/0x1234567890123456789012345678901234567890').send({
        name: 'NewName',
        imageUrl: 'https://example.com/newimage.jpg',
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toEqual('Update user error: Missing user address');
    });

    it('should return 403 if caller is not the user', async () => {
      // Mock auth middleware with different caller address

      mockAuthorizeUser.mockImplementation(
        async (req: Request, res: Response, next: NextFunction) => {
          req.address = '0x9999999999999999999999999999999999999999'; // Different caller
          next();
          return undefined;
        }
      );

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);

      const response = await request(app).put(`/${mockUser.address}`).send({
        name: 'NewName',
        imageUrl: 'https://example.com/newimage.jpg',
      });

      expect(response.status).toBe(403);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should return 404 if user is not found', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      const response = await request(app).put('/0x1234567890123456789012345678901234567890').send({
        name: 'NewName',
        imageUrl: 'https://example.com/newimage.jpg',
      });

      expect(response.status).toBe(404);
      expect(response.body.message).toEqual('User not found');
    });

    it('should continue update when old profile deletion throws', async () => {
      const existingUser = {
        ...mockUser,
        imageUrl:
          'https://storage.railway.app/bucket/profiles/0x1234567890123456789012345678901234567890/old.png?X-Amz-Signature=expired',
      };

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(existingUser as any);
      mockUploadFile.mockResolvedValueOnce({
        success: true,
        metadata: {
          key: 'profiles/0x1234567890123456789012345678901234567890/new.png',
          fileType: 'image/png',
          fileSize: 128,
        },
      });
      mockGetPresignedDownloadUrl
        .mockResolvedValueOnce(
          'https://storage.railway.app/bucket/profiles/0x1234567890123456789012345678901234567890/new.png?X-Amz-Signature=signed'
        )
        .mockResolvedValueOnce(
          'https://storage.railway.app/bucket/profiles/0x1234567890123456789012345678901234567890/new.png?X-Amz-Signature=fresh'
        );
      mockDeleteFile.mockRejectedValueOnce(new Error('delete failed'));
      vi.spyOn(prisma.user, 'update').mockResolvedValue({
        address: existingUser.address,
        name: 'WithImage',
        imageUrl:
          'https://storage.railway.app/bucket/profiles/0x1234567890123456789012345678901234567890/new.png?X-Amz-Signature=signed',
      } as any);

      const response = await request(app)
        .put(`/${existingUser.address}`)
        .field('name', 'WithImage')
        .attach('profileImage', Buffer.from('fake-image-bytes'), 'avatar.png');

      expect(response.status).toBe(200);
      expect(response.body.imageUrl).toContain('X-Amz-Signature=fresh');
    });

    it('should skip old profile deletion when existing image has no storage key', async () => {
      const existingUser = {
        ...mockUser,
        imageUrl: 'https://example.com/no-storage-key.png',
      };

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(existingUser as any);
      mockUploadFile.mockResolvedValueOnce({
        success: true,
        metadata: {
          key: 'profiles/0x1234567890123456789012345678901234567890/new.png',
          fileType: 'image/png',
          fileSize: 128,
        },
      });
      mockGetPresignedDownloadUrl.mockResolvedValueOnce(
        'https://storage.railway.app/bucket/profiles/0x1234567890123456789012345678901234567890/new.png?X-Amz-Signature=signed'
      );
      vi.spyOn(prisma.user, 'update').mockResolvedValue({
        address: existingUser.address,
        name: 'WithImage',
        imageUrl:
          'https://storage.railway.app/bucket/profiles/0x1234567890123456789012345678901234567890/new.png?X-Amz-Signature=signed',
      } as any);

      const response = await request(app)
        .put(`/${existingUser.address}`)
        .field('name', 'WithImage')
        .attach('profileImage', Buffer.from('fake-image-bytes'), 'avatar.png');

      expect(response.status).toBe(200);
      expect(mockDeleteFile).not.toHaveBeenCalledWith(expect.stringContaining('no-storage-key'));
    });

    it('should skip old profile deletion when existing image is empty', async () => {
      const existingUser = {
        ...mockUser,
        imageUrl: null,
      };

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(existingUser as any);
      mockUploadFile.mockResolvedValueOnce({
        success: true,
        metadata: {
          key: 'profiles/0x1234567890123456789012345678901234567890/new.png',
          fileType: 'image/png',
          fileSize: 128,
        },
      });
      mockGetPresignedDownloadUrl.mockResolvedValueOnce(
        'https://storage.railway.app/bucket/profiles/0x1234567890123456789012345678901234567890/new.png?X-Amz-Signature=signed'
      );
      vi.spyOn(prisma.user, 'update').mockResolvedValue({
        address: existingUser.address,
        name: 'WithImage',
        imageUrl:
          'https://storage.railway.app/bucket/profiles/0x1234567890123456789012345678901234567890/new.png?X-Amz-Signature=signed',
      } as any);

      const response = await request(app)
        .put(`/${existingUser.address}`)
        .field('name', 'WithImage')
        .attach('profileImage', Buffer.from('fake-image-bytes'), 'avatar.png');

      expect(response.status).toBe(200);
      expect(mockDeleteFile).not.toHaveBeenCalled();
    });

    it('should return fallback upload error when uploadFile has no error message', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      mockUploadFile.mockResolvedValueOnce({ success: false });

      const response = await request(app)
        .put('/0x1234567890123456789012345678901234567890')
        .field('name', 'NewName')
        .attach('profileImage', Buffer.from('fake-image-bytes'), 'avatar.png');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Failed to upload profile image');
    });

    it('should return 500 when upload throws unexpectedly', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      mockUploadFile.mockRejectedValueOnce(new Error('upload crash'));

      const response = await request(app)
        .put('/0x1234567890123456789012345678901234567890')
        .field('name', 'NewName')
        .attach('profileImage', Buffer.from('fake-image-bytes'), 'avatar.png');

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error has occured');
    });

    it('should update trader flags when teamId and traderSafeAddress are provided', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      vi.spyOn(prisma.user, 'update').mockResolvedValue({
        address: mockUser.address,
        name: mockUser.name,
        imageUrl: mockUser.imageUrl,
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

    it('should handle missing team members array with members fallback', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      vi.spyOn(prisma.user, 'update').mockResolvedValue({
        address: mockUser.address,
        name: mockUser.name,
        imageUrl: mockUser.imageUrl,
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

    it('should return 500 if an error occurs', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockRejectedValue(new Error('Error'));

      const response = await request(app).put('/0x1234567890123456789012345678901234567890').send({
        name: 'NewName',
        imageUrl: 'https://example.com/newimage.jpg',
      });

      expect(response.status).toBe(500);
      expect(response.body.message).toEqual('Internal server error has occured');
    });
  });

  describe('getAllUsers', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      // Reset to default behavior

      mockAuthorizeUser.mockImplementation(
        async (req: Request, res: Response, next: NextFunction) => {
          req.address = '0x1234567890123456789012345678901234567890';
          next();
          return undefined;
        }
      );
    });

    it('should apply search filter and refresh railway profile URLs in user list', async () => {
      const usersWithRailwayImage = [
        {
          ...mockUsers[0],
          imageUrl:
            'https://storage.railway.app/bucket/profiles/0x1111111111111111111111111111111111111111/avatar.png?X-Amz-Signature=old',
        },
      ];

      vi.spyOn(prisma.user, 'findMany').mockResolvedValue(usersWithRailwayImage as any);
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

    it('should refresh image URL when imageUrl is a direct profiles key', async () => {
      const usersWithStorageKey = [
        {
          ...mockUsers[0],
          imageUrl: 'profiles/0x1111111111111111111111111111111111111111/avatar.png',
        },
      ];

      vi.spyOn(prisma.user, 'findMany').mockResolvedValue(usersWithStorageKey as any);
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

    it('should default page and limit when query values are missing (controller direct)', async () => {
      const req = {
        query: { page: undefined, limit: undefined, search: undefined },
      } as unknown as Request;
      const json = vi.fn();
      const res = {
        status: vi.fn().mockReturnValue({ json }),
      } as unknown as Response;

      vi.spyOn(prisma.user, 'findMany').mockResolvedValue([] as any);
      vi.spyOn(prisma.user, 'count').mockResolvedValue(0);

      await getAllUsers(req, res);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        })
      );
    });

    it('should return 500 if an error occurs', async () => {
      vi.spyOn(prisma.user, 'findMany').mockRejectedValue(new Error('Error'));

      const response = await request(app).get('/').send();

      expect(response.status).toBe(500);
      expect(response.body.message).toEqual('Internal server error has occured');
    });
  });
});
