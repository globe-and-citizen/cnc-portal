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
app.use(setAddressMiddleware("0xOwnerAddress"));
app.get("/nonce/:address", getNonce);
app.get("/user/:address", getUser);
app.put("/user/:address", updateUser);
app.get("/", getAllUsers);
app.get("/search", searchUser);

const mockUser: User = {
  id: 1,
  address: "0xMemberAddress",
  name: "MemberName",
  nonce: "nonce123",
  imageUrl: "hhtps://example.com/image.jpg",
  createdAt: new Date(),
  updatedAt: new Date(),
} as User;

const mockUsers = [
  {
    id: 1,
    name: "Alice",
    address: "0xAliceAddress",
    nonce: "nonce123",
    imageUrl: "https://example.com/image.jpg",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  { id: 2,
    name: "Bob",
    address: "0xBobAddress",
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

    it("should return 401 if address is missing", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);

      const response = await request(app).get("/nonce/bla").send({});

      expect(response.status).toBe(401);
      expect(response.body.message).toEqual(
        "Get nonce error: Invalid user address"
      );
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

    it.skip("should return 401 if address is missing", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);

      const response = await request(app).get("/user/1").send({
        address: "",
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toEqual(
        "Get user error: Missing user address"
      );
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

      const response = await request(app).get("/user/1").send({
        address: "0xMemberAddress",
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

    it.skip("should return 401 if address is missing", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);
      const response = await request(app).put("/user/1").send({
        address: "",
        name: "NewName",
        imageUrl: "https://example.com/newimage.jpg",
      });
      expect(response.status).toBe(401);
      expect(response.body.message).toEqual(
        "Update user error: Missing user address"
      );
    });

    it("should return 403 if caller is not the user", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(mockUser);

      const response = await request(app)
        .put(`/user/${mockUser.address}`)
        .send({
          name: "NewName",
          imageUrl: "https://example.com/newimage.jpg",
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toEqual("Unauthorized");
    });

    it.skip("should return 404 if user is not found", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(mockUser);

      const response = await request(app).put("/user/0xMemberAddress").send({
        name: "NewName",
        imageUrl: "https://example.com/newimage.jpg",
      });

      expect(response.status).toBe(404);
      expect(response.body.message).toEqual("User not found");
    });

    it.skip("should return 200 and the user if found", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(mockUser);

      const response = await request(app)
        .put(`/user/${mockUser.address}`)
        .set("address", mockUser.address)
        .send({
          name: "NewName",
          imageUrl: "https://example.com/newimage.jpg",
        });
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: mockUser.id,
        address: mockUser.address,
        name: "NewName",
        nonce: mockUser.nonce,
        imageUrl: "https://example.com/newimage.jpg",
        createdAt: mockUser.createdAt.toISOString(),
        updatedAt: mockUser.updatedAt.toISOString(),
      });
    });

    it.skip("should return 500 if an error occurs", async () => {
      vi.spyOn(prisma.user, "findUnique").mockRejectedValue(new Error("Error"));

      const response = await request(app)
        .put("/user/0xMemberAddress")
        .set("address", "0xMemberAddress")
        .send({
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
        users: mockUsers.map(user => ({
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

    it("should return 401 if address is missing", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);

      const response = await request(app).get("/search").send({
        address: "",
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toEqual(
        "Search error: Missing name and address"
      );
    });

    it.skip("should return 200 and all users", async () => {
      const mockUsers = [mockUser, { ...mockUser, id: 1 }];
      vi.spyOn(prisma.user, "findMany").mockResolvedValue(mockUsers);

      const response = await request(app)
        .get("/search")
        .query({ address: "0xMemberAddress" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUsers);
    });

    it("should rerturn 500 if an error occurs", async () => {
      vi.spyOn(prisma.user, "findMany").mockRejectedValue(new Error("Error"));

      const response = await request(app)
        .get("/search")
        .query({ address: "0xMemberAddress" });

      expect(response.status).toBe(500);
      expect(response.body.message).toEqual(
        "Internal server error has occured"
      );
    });
  });
});
