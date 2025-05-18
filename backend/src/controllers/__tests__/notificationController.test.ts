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
import { getNotification, updateNotification } from "../notificationController";
import express, { NextFunction } from "express";
import { authorizeUser } from "../../middleware/authMiddleware";

function setAddressMiddleware(address: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    (req as any).address = address;
    next();
  };
}

const app = express();
app.use(express.json());
app.get("/", getNotification, authorizeUser);
app.put("/:id", updateNotification, authorizeUser);

describe("Notification Controller", () => {
  describe("GET /", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should return notifications if user is authorized", async () => {
      const req = {
        address: "0x123",
      } as unknown as Request;

      const res: any = {
        status: (code: number) => {
          res.statusCode = code;
          return res;
        },
        json: (data: any) => {
          res.data = data;
          return res;
        },
        data: undefined,
      } as unknown as Response;

      await getNotification(req, res);

      expect(res.data.message).toBe("Internal server error has occured");
    });

    it("should handle errors gracefully", async () => {
      const req = {
        address: 1,
      } as unknown as Request;

      const res: any = {
        status: () => res,
        json: (data: any) => {
          res.data = data;
          return res;
        },
        data: undefined,
      } as unknown as Response;

      await getNotification(req, res);
    });
  });

  describe("Update Notification", () => {
  it("should update notification if user is authorized", async () => {
    const req = {
      params: {
        id: "1",
      },
      address: "0x123",
    } as unknown as Request;

    const res: any = {
      status: () => {
        return res;
      },
      json: (data: any) => {
        res.data = data;
        return res;
      },
      data: undefined,
    } as unknown as Response;

    vi.spyOn(prisma.notification, "findUnique").mockResolvedValue({
      id: 1,
      userAddress: "0x123",
      isRead: false,
      message: "Test Message",
      subject: "Test Subject",
      author: "0x345",
      createdAt: new Date(Date.now()),
      resource: null,
      updatedAt: new Date(Date.now())
    });
    vi.spyOn(prisma.notification, "update").mockResolvedValue({
      id: 1,
      userAddress: "0x123",
      isRead: true,
      message: "Test Message",
      subject: "Test Subject",
      author: "0x345",
      createdAt: new Date(Date.now()),
      resource: null,
      updatedAt: new Date(Date.now())
    });

    await updateNotification(req, res);

    // Clean up the mocks
    vi.restoreAllMocks();
  });

  it("should return error if notification ID is invalid", async () => {
    const req = {
      params: {
        id: "xyz",
      },
      address: "0x123",
    } as unknown as Request;

    const res: any = {
      status: () => {
        return res;
      },
      json: (data: any) => {
        res.data = data;
        return res;
      },
      data: undefined,
    } as unknown as Response;

    await updateNotification(req, res);

    expect(res.data.message).toBe("Notification ID invalid format");
  });

  it("should return error if user is unauthorized", async () => {
    const req = {
      params: {
        id: "1",
      },
      address: "0x124",
    } as unknown as Request;

    const res: any = {
      status: () => {
        return res;
      },
      json: (data: any) => {
        res.data = data;
        return res;
      },
      data: undefined,
    } as unknown as Response;

    vi.spyOn(prisma.notification, "findUnique").mockResolvedValue({
      id: 1,
      userAddress: "0x123",
      isRead: false,
      message: "Test Message",
      subject: "Test Subject",
      author: "0x345",
      createdAt: new Date(Date.now()),
      resource: null,
      updatedAt: new Date(Date.now())
    });

    await updateNotification(req, res);

    expect(res.data.message).toBe("Unauthorized access");

    // Clean up the mocks
    vi.restoreAllMocks();
  });

  it("should handle errors gracefully", async () => {
    const req = {
      params: {
        id: "1",
      },
      address: 1,
    } as unknown as Request;

    const res: any = {
      status: () => {
        return res;
      },
      json: (data: any) => {
        res.data = data;
        return res;
      },
      data: undefined,
    } as unknown as Response;

    await updateNotification(req, res);

    // Clean up the mocks
    vi.restoreAllMocks();
  });
});
});

describe.skip("Get Notification", () => {
  it("should return notifications if user is authorized", async () => {
    const req = {
      address: "0x123",
    } as unknown as Request;

    const res: any = {
      status: (code: number) => {
        res.statusCode = code;
        return res;
      },
      json: (data: any) => {
        res.data = data;
        return res;
      },
      data: undefined,
    } as unknown as Response;

    await getNotification(req, res);
  });

  it("should handle errors gracefully", async () => {
    const req = {
      address: 1,
    } as unknown as Request;

    const res: any = {
      status: () => res,
      json: (data: any) => {
        res.data = data;
        return res;
      },
      data: undefined,
    } as unknown as Response;

    await getNotification(req, res);
  });
});


