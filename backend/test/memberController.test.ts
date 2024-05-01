import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import {
  addMembers,
  updateMember,
  deleteMembers,
} from "../src/controllers/memberController";

const prisma = new PrismaClient();

describe("Member Controller", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("addMembers", () => {
    it("should add a new member", async () => {
      const req: Request = {
        params: {
          id: "12345", // Replace with the desired id
        },
        body: {
          members: [
            {
              name: "Dasarath",
              walletAddress: "0x4b6Bf5cD91446408290725879F5666dcd9785F62",
            },
            {
              name: "Sita",
              walletAddress: "0x4b6Bf5cD91446408290725879F5666dcd9785F63",
            },
          ],
        },
      } as unknown as Request;
      const res: Response = {} as Response;

      // Call the addMembers function
      await addMembers(req, res);
      console.log(res);
      expect(res.status).toBe(201);
    });
  });

  describe("updateMember", () => {
    it("should update an existing member", async () => {
      const req: Request = {
        /* Mock request object */
      } as Request;
      const res: Response = {
        /* Mock response object */
      } as Response;

      // Call the updateMember function
      await updateMember(req, res);

      // Assert the expected behavior or response
      // ...
    });
  });

  describe("deleteMembers", () => {
    it("should delete members", async () => {
      const req: Request = {
        /* Mock request object */
      } as Request;
      const res: Response = {
        /* Mock response object */
      } as Response;

      // Call the deleteMembers function
      await deleteMembers(req, res);

      // Assert the expected behavior or response
      // ...
    });
  });
});
