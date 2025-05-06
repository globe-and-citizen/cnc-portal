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
app.get("/nonce", getNonce);
app.get("/user/1", getUser);
app.put("/user/1", updateUser);
app.get("/users", getAllUsers);
app.get("/search", searchUser);

const mockUser = {
  id: 1,
  address: "0xMemberAddress",
  name: "MemberName",
  nonce: "nonce123",
  imageUrl: "hhtps://example.com/image.jpg",
  createdAt: new Date(),
  updatedAt: new Date(),
} as User;

describe("User Controller", () => {
  describe("GET: /nonce", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should return 401 if address is missing", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);

      const response = await request(app).get("/nonce").send({});

      expect(response.status).toBe(401);
      expect(response.body.message).toEqual(
        "Get nonce error: Missing user address"
      );
    });

    it.skip("should return a nonce if user does not exist", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);
      const mockAddress = faker.finance.ethereumAddress();
      const response = await request(app)
        .get("/nonce")
        .set("address", mockAddress)
        .send();

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        nonce: expect.any(String),
      });
    });

    it.skip("should return the user's nonce if user exists", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(mockUser);
      const response = await request(app)
        .get("/nonce")
        .set("address", "0xMemberAddress")
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.nonce).toBe(mockUser.nonce);
    });

    it.skip("should return 500 if an error occurs", async () => {
      vi.spyOn(prisma.user, "findUnique").mockRejectedValue(new Error("Error"));

      const response = await request(app)
        .get("/nonce")
        .set("address", "0xMemberAddress")
        .send();

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

    it("should return 401 if address is missing", async () => {
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

      const mockAddress = "0xNonExistentAddress";

      const response = await request(app).get(`/user/${mockAddress}`).send();

      expect(response.status).toBe(404);
      expect(response.body.message).toEqual(undefined);
    });
  });
});
