// CRUD Members using Prisma Client
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { isWalletAddressValid } from "../utils/validators/walletValidatorUtil";
const prisma = new PrismaClient();

//insert new members
const addMembers = async (req: Request, res: Response) => {
  /* 
  #swagger.tags = ['Members']
  */
  const { id } = req.params;
  const membersData = req.body;

  try {
    const membersToCreate = membersData.map(
      (member: { name: string; walletAddress: string }) => {
        if (!isWalletAddressValid(member.walletAddress)) {
          throw new Error(`Invalid wallet address for member: ${member.name}`);
        }

        return {
          name: member.name,
          walletAddress: member.walletAddress,
          teamId: Number(id), // team ID
        };
      }
    );

    const createdMembers = await prisma.member.createMany({
      data: membersToCreate,
    });

    res.status(201).json(createdMembers);
  } catch (error: any) {
    console.error("Error adding members:", error);
    res.status(500).json({ error: `${error.message}` });
  }
};

//update member
const updateMember = async (req: Request, res: Response) => {
  /* 
  #swagger.tags = ['Members']
  */
  const { id } = req.params;
  const { name, walletAddress } = req.body;
  try {
    if (!isWalletAddressValid(walletAddress)) {
      throw new Error(`Invalid wallet address for member: ${name}`);
    }
    const member = await prisma.member.update({
      where: { id: Number(id) },
      data: {
        name: name,
        walletAddress: walletAddress,
      },
    });
    res.status(200).json(member);
  } catch (error: any) {
    console.log("Error updating", error);
    res.status(500).json({ error: `${error.message}` });
  }
};

//delete members
const deleteMembers = async (req: Request, res: Response) => {
  /* 
  #swagger.tags = ['Members']
  */
  const { id } = req.params;

  try {
    const member = await prisma.member.deleteMany({
      where: { id: Number(id) },
    });
    res.status(200).json(member);
  } catch (error) {
    console.error("Error deleting member:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
export { updateMember, deleteMembers, addMembers };
