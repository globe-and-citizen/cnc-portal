// CRUD Members using Prisma Client
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

const prisma = new PrismaClient();

//insert new members
const addMembers = async (req: Request, res: Response) => {
  const { id } = req.params;
  const membersData = req.body;

  try {
    const membersToCreate = membersData.map(
      (member: { name: string; walletAddress: string }) => ({
        name: member.name,
        walletAddress: member.walletAddress,
        teamId: Number(id), // team ID
      }),
    );

    const createdMembers = await prisma.member.createMany({
      data: membersToCreate,
    });

    res.status(201).json(createdMembers);
  } catch (error) {
    console.error("Error adding members:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

//update member
const updateMember = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, walletAddress } = req.body;
  try {
    const member = await prisma.member.update({
      where: { id: Number(id) },
      data: {
        name: name,
        walletAddress: walletAddress,
      },
    });
    res.status(200).json(member);
  } catch (error) {
    console.log("Error updating", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

//delete members
const deleteMembers = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const member = await prisma.member.delete({
      where: { id: Number(id) },
    });
    res.status(200).json(member);
  } catch (error) {
    console.error("Error deleting member:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
export { updateMember, deleteMembers, addMembers };
