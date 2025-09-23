import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import {
  getNonce,
  getUser,
  updateUser,
  getAllUsers,
  searchUser,
} from "../userController";
import { prisma } from "../../utils";
import { describe, it, beforeEach, expect, vi } from "vitest";
import { User } from "@prisma/client";
import { de, faker } from "@faker-js/faker";
import e from "express";
import {
  validateParams,
  validateQuery,
  validateBodyAndParams,
  addressParamsSchema,
  userSearchQuerySchema,
  updateUserBodySchema,
  userPaginationQuerySchema,
} from "../../validation";

vi.mock("../../utils");
vi.mock("../../utils/viem.config");

function setAddressMiddleware(address: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    (req as any).address = address;
    next();
  };
}
const app = express();
app.use(express.json());
app.use(setAddressMiddleware("0x1234567890123456789012345678901234567890"));

// Routes with validation middleware (as they would be in the actual app)
app.get("/nonce/:address", validateParams(addressParamsSchema), getNonce);
app.get("/user/:address", validateParams(addressParamsSchema), getUser);
app.put("/user/:address", validateBodyAndParams(updateUserBodySchema, addressParamsSchema), updateUser);
app.get("/", validateQuery(userPaginationQuerySchema), getAllUsers);
app.get("/search", validateQuery(userSearchQuerySchema), searchUser);

const mockUser: User = {
  id: 1,
  address: "0x1234567890123456789012345678901234567890",
  name: "MemberName",
  nonce: "nonce123",
  imageUrl: "https://example.com/image.jpg",
  createdAt: new Date(),
  updatedAt: new Date(),
} as User;

const mockUsers = [
  {
    id: 1,
    name: "Alice",
    address: "0x1111111111111111111111111111111111111111",
    nonce: "nonce123",
    imageUrl: "https://example.com/image.jpg",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    name: "Bob",
    address: "0x2222222222222222222222222222222222222222",
    nonce: "nonce456",
    imageUrl: "https://example.com/image2.jpg",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockAddress = faker.finance.ethereumAddress();

describe("User Controller", () => {
  describe("GET: /nonce/:address", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should return 400 if address is invalid", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);

      const response = await request(app).get("/nonce/invalid-address").send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Invalid path parameters");
      expect(response.body.message).toContain("Invalid Ethereum address format");
    });

    it("should return a nonce if user does not exist", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);

      const response = await request(app).get(`/nonce/${mockAddress}`).send();

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        nonce: expect.any(String),
      });
    });

    it("should return the user's nonce if user exists", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(mockUser);

      const response = await request(app).get(`/nonce/${mockAddress}`).send();

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        nonce: mockUser.nonce,
      });
    });

    it("should return 500 if an error occurs", async () => {
      vi.spyOn(prisma.user, "findUnique").mockRejectedValue(new Error("Error"));

      const response = await request(app).get(`/nonce/${mockAddress}`).send();

      expect(response.status).toBe(500);
      expect(response.body.message).toEqual(
        "Internal server error has occured"
      );
    });
  });

  describe("getUser", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should return 400 if address is invalid", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);

      const response = await request(app).get("/user/invalid-address").send();

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Invalid path parameters");
      expect(response.body.message).toContain("Invalid Ethereum address format");
    });

    it("should return 404 if user is not found", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);

      const response = await request(app).get(`/user/${mockAddress}`).send();

      expect(response.status).toBe(404);
      expect(response.body.message).toEqual("User not found");
    });

    it("should return 200 and the user if found", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(mockUser);

      const response = await request(app)
        .get(`/user/${mockUser.address}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: mockUser.id,
        address: mockUser.address,
        name: mockUser.name,
        nonce: mockUser.nonce,
        imageUrl: mockUser.imageUrl,
        createdAt: mockUser.createdAt.toISOString(),
        updatedAt: mockUser.updatedAt.toISOString(),
      });
    });

    it("should return 500 if an error occurs", async () => {
      vi.spyOn(prisma.user, "findUnique").mockRejectedValue(new Error("Error"));

      const response = await request(app).get("/user/0x1234567890123456789012345678901234567890").send({
        address: "0x1111111111111111111111111111111111111111",
      });

      expect(response.status).toBe(500);
      expect(response.body.message).toEqual(
        "Internal server error has occured"
      );
    });
  });

  describe("updateUser", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should return 400 if caller address is missing", async () => {
      const app = express();
      app.use(express.json());
      app.put("/user/:address", setAddressMiddleware(""), validateBodyAndParams(updateUserBodySchema, addressParamsSchema), updateUser);

      const response = await request(app).put("/user/0x1234567890123456789012345678901234567890").send({
        name: "NewName",
        imageUrl: "https://example.com/newimage.jpg",
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toEqual(
        "Update user error: Missing user address"
      );
    });

    it("should return 403 if caller is not the user", async () => {
      // Create a separate app with different caller address for this test
      const testApp = express();
      testApp.use(express.json());
      testApp.use(setAddressMiddleware("0x9999999999999999999999999999999999999999")); // Different caller
      testApp.put("/user/:address", validateBodyAndParams(updateUserBodySchema, addressParamsSchema), updateUser);

      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(mockUser);

      const response = await request(testApp)
        .put(`/user/${mockUser.address}`)
        .send({
          name: "NewName",
          imageUrl: "https://example.com/newimage.jpg",
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toEqual("Unauthorized");
    });

    it("should return 404 if user is not found", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);

      const response = await request(app).put("/user/0x1234567890123456789012345678901234567890").send({
        name: "NewName",
        imageUrl: "https://example.com/newimage.jpg",
      });

      expect(response.status).toBe(404);
      expect(response.body.message).toEqual("User not found");
    });

    it("should return 200 and the user if found", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(mockUser);

      const updatedUser = {
        ...mockUser,
        name: "NewName",
        imageUrl: "https://example.com/newimage.jpg",
        updatedAt: new Date(), // simulate update timestamp
      };

      vi.spyOn(prisma.user, "update").mockResolvedValue(updatedUser);

      const response = await request(app).put("/user/0x1234567890123456789012345678901234567890").send({
        name: "NewName",
        imageUrl: "https://example.com/newimage.jpg",
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: updatedUser.id,
        address: updatedUser.address,
        name: "NewName",
        nonce: updatedUser.nonce,
        imageUrl: "https://example.com/newimage.jpg",
        createdAt: updatedUser.createdAt.toISOString(),
        updatedAt: updatedUser.updatedAt.toISOString(),
      });
    });

    it("should return 500 if an error occurs", async () => {
      vi.spyOn(prisma.user, "findUnique").mockRejectedValue(new Error("Error"));

      const response = await request(app).put("/user/0x1234567890123456789012345678901234567890").send({
        name: "NewName",
        imageUrl: "https://example.com/newimage.jpg",
      });

      expect(response.status).toBe(500);
      expect(response.body.message).toEqual(
        "Internal server error has occured"
      );
    });
  });

  describe("getAllUsers", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should return 200 and paginated users data", async () => {
      const totalUsers = 20;
      const page = 1;
      const limit = 10;

      vi.spyOn(prisma.user, "findMany").mockResolvedValue(mockUsers);
      vi.spyOn(prisma.user, "count").mockResolvedValue(totalUsers);

      const response = await request(app)
        .get(`/?page=${page}&limit=${limit}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        users: mockUsers.map((user) => ({
          ...user,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        })),
        totalUsers,
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
      });
    });

    it("should return 500 if an error occurs", async () => {
      vi.spyOn(prisma.user, "findMany").mockRejectedValue(new Error("Error"));

      const response = await request(app).get("/").send();

      expect(response.status).toBe(500);
      expect(response.body.message).toEqual(
        "Internal server error has occured"
      );
    });
  });

  describe("searchUser", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should return 400 if neither name nor address is provided", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);

      const response = await request(app).get("/search").send({
        address: "",
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Invalid query parameters");
      expect(response.body.message).toContain("Either name or address must be provided");
    });

    it("should return 200 and matched users", async () => {
      vi.spyOn(prisma.user, "findMany").mockResolvedValue(mockUsers);

      const response = await request(app)
        .get("/search")
        .query({ address: "0x1111111111111111111111111111111111111111" });

      const expectedUsers = mockUsers.map((user) => ({
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      }));

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        users: expectedUsers,
      });
    });

    it("should rerturn 500 if an error occurs", async () => {
      vi.spyOn(prisma.user, "findMany").mockRejectedValue(new Error("Error"));

      const response = await request(app)
        .get("/search")
        .query({ address: "0x1111111111111111111111111111111111111111" });

      expect(response.status).toBe(500);
      expect(response.body.message).toEqual(
        "Internal server error has occured"
      );
    });
  });
});
