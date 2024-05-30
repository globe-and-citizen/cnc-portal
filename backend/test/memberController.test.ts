import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import {
  addMembers,
  deleteMembers,
  updateMember,
} from "../src/controllers/memberController";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

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
      const membersData = [
        {
          name: "Dasarath",
          walletAddress: "0x4b6Bf5cD91446408290725879F5666dcd9785F62",
        },
      ];
      const req = {
        params: {
          id: "2", // Replace with the desired id
        },
        body: {
          membersData,
        },
      } as unknown as Request;

      const res: any = {
        status: () => res,
        json: (data: any) => {
          res.data = data;
          return res;
        },
        data: undefined,
      } as unknown as Response;
      await addMembers(req, res);
      expect(res.data.success).toBe(true);
    });
    it("should not add a new member (validation)", async () => {
      const membersData = [
        {
          name: "Dasarath",
          walletAddress: "0xaFeF48F8c51fb7C1B314B3991D2e1d8421E", // provide wrong format address
        },
        {
          name: "Sita",
          walletAddress: "0xaFeF48F7718c51fC6d1B314B3991D2e1d8421E",
        },
      ];
      const req = {
        params: {
          id: "1",
        },
        body: {
          membersData,
        },
      } as unknown as Request;

      const res: any = {
        status: () => res,
        json: (data: any) => {
          res.data = data;
          return res;
        },
        data: undefined,
      } as unknown as Response;
      await addMembers(req, res);
      expect(res.data.success).toBe(false);
    });
  });
  describe("updateMember", () => {
    it("should update a member", async () => {
      const req = {
        params: {
          id: "2", // Replace with the desired id
        },
        body: {
          name: "Ramaxxx",
          walletAddress: "0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E",
        },
      } as unknown as Request;

      const res: any = {
        status: () => res,
        json: (data: any) => {
          res.data = data;
          return res;
        },
        data: undefined,
      } as unknown as Response;

      await updateMember(req, res);
      expect(res.data.success).toBe(true);
    });
    it("should not update member (validation)", async () => {
      const membersData = [
        {
          name: "Dasarath",
          walletAddress: "0xaFeF48F8c51fb7C1B314B3991D2e1d8421E", // provide wrong format address
        },
        {
          name: "Sita",
          walletAddress: "0xaFeF48F7718c51fC6d1B314B3991D2e1d8421E",
        },
      ];
      const req = {
        params: {
          id: "1",
        },
        body: {
          membersData,
        },
      } as unknown as Request;

      const res: any = {
        status: () => res,
        json: (data: any) => {
          res.data = data;
          return res;
        },
        data: undefined,
      } as unknown as Response;
      await addMembers(req, res);
      expect(res.data.success).toBe(false);
    });
  });
  describe("deleteMembers", () => {
    it("should delete a member", async () => {
      const req = {
        params: {
          id: "1", // Replace with the desired id
        },
      } as unknown as Request;

      const res: any = {
        status: () => res,
        json: (data: any) => {
          res.data = data;
          return res;
        },
        data: undefined,
      } as unknown as Response;

      await deleteMembers(req, res);
      expect(res.data.success).toBe(true);
    });
  });
  it("should not delete member (validation)", async () => {
    const membersData = [
      {
        name: "Dasarath",
        walletAddress: "0xaFeF48F8c51fb7C1B314B3991D2e1d8421E", // provide wrong format address
      },
      {
        name: "Sita",
        walletAddress: "0xaFeF48F7718c51fC6d1B314B3991D2e1d8421E",
      },
    ];
    const req = {
      params: {
        id: "1",
      },
      body: {
        membersData,
      },
    } as unknown as Request;

    const res: any = {
      status: () => res,
      json: (data: any) => {
        res.data = data;
        return res;
      },
      data: undefined,
    } as unknown as Response;
    await addMembers(req, res);
    expect(res.data.success).toBe(false);
  });
});
