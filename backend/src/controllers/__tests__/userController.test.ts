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
import { de } from "@faker-js/faker";

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
app.get("/user/:id", getUser);
app.put("/user/:id", updateUser);
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

