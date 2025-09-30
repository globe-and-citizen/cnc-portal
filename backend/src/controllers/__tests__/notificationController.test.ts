import request from "supertest";
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  vi,
  beforeEach,
} from "vitest";
import { prisma, errorResponse } from "../../utils";
import { Request, Response } from "express";
import express, { NextFunction } from "express";
import { authorizeUser } from "../../middleware/authMiddleware";
import notificationRoute from "../../routes/notificationRoute";
import { getNotification, updateNotification } from "../notificationController";

// Mock the authorizeUser middleware
vi.mock("../../middleware/authMiddleware", () => ({
  authorizeUser: vi.fn((req: Request, res: Response, next: NextFunction) => {
    (req as any).address = "0x1234567890123456789012345678901234567890";
    next();
  }),
}));

// Mock prisma
vi.mock("../../utils", async () => {
  const actual = await vi.importActual("../../utils");
  return {
    ...actual,
    prisma: {
      notification: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        createMany: vi.fn(),
      },
      $disconnect: vi.fn(),
    },
    addNotification: vi.fn(),
  };
});

const app = express();
app.use(express.json());
app.use("/", notificationRoute);

const mockNotification = {
  id: 1,
  userAddress: "0x1234567890123456789012345678901234567890",
  isRead: false,
  message: "Test notification",
  subject: "Test subject",
  author: "0x1111111111111111111111111111111111111111",
  createdAt: new Date(),
  updatedAt: new Date(),
  resource: null,
};

describe("Notification Controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /", () => {
    it("should return notifications for authorized user", async () => {
      vi.spyOn(prisma.notification, "findMany").mockResolvedValue([mockNotification]);

      const response = await request(app).get("/");

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        id: mockNotification.id,
        userAddress: mockNotification.userAddress,
        isRead: mockNotification.isRead,
        message: mockNotification.message,
        subject: mockNotification.subject,
        author: mockNotification.author,
        resource: mockNotification.resource,
      });
    });

    it("should return empty array when no notifications found", async () => {
      vi.spyOn(prisma.notification, "findMany").mockResolvedValue([]);

      const response = await request(app).get("/");

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it("should return 500 on server error", async () => {
      vi.spyOn(prisma.notification, "findMany").mockRejectedValue(new Error("Database error"));

      const response = await request(app).get("/");

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Internal server error has occured");
    });
  });

  describe("PUT /:id", () => {
    it("should update notification successfully", async () => {
      vi.spyOn(prisma.notification, "findUnique").mockResolvedValue(mockNotification);
      vi.spyOn(prisma.notification, "update").mockResolvedValue({
        ...mockNotification,
        isRead: true,
      });

      const response = await request(app).put("/1");

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isRead: true },
      });
    });

    it("should return 400 for invalid notification ID", async () => {
      const response = await request(app).put("/invalid");

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Notification ID invalid format");
    });

    it("should return 403 if user is not authorized", async () => {
      const unauthorizedNotification = {
        ...mockNotification,
        userAddress: "0x9999999999999999999999999999999999999999",
      };
      vi.spyOn(prisma.notification, "findUnique").mockResolvedValue(unauthorizedNotification);

      const response = await request(app).put("/1");

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Unauthorized access");
    });

    it("should return 500 on server error", async () => {
      vi.spyOn(prisma.notification, "findUnique").mockRejectedValue(new Error("Database error"));

      const response = await request(app).put("/1");

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Internal server error has occured");
    });
  });
});
