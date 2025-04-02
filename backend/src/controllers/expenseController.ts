import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { errorResponse } from "../utils/utils";
import { isUserMemberOfTeam, isOwnerOfTeam } from "./wageController";

const prisma = new PrismaClient();

import { Expense, Prisma } from "@prisma/client";
import exp from "constants";

// type expenseBodyRequest = Pick<Expens
type expenseBodyRequest = Pick<Expense, "signature" | "data"> & {
  teamId: string;
};
export const addExpense = async (req: Request, res: Response) => {
  const callerAddress = (req as any).address;
  const body = req.body as expenseBodyRequest;
  const teamId = Number(body.teamId);
  const signature = body.signature as string;
  const data = body.data as string;

  // Validating the expense data
  let parametersError: string[] = [];
  if (!body.teamId) parametersError.push("Missing teamId");
  if (!signature) parametersError.push("Missing signature");
  if (!data) parametersError.push("Missing data");
  if (isNaN(teamId)) parametersError.push("Invalid teamId");

  if (parametersError.length > 0) {
    return errorResponse(400, parametersError.join(", "), res);
  }

  try {
    // TODO: should be only one expense active for the user
    const expense = await prisma.expense.create({
      data: {
        teamId,
        signature,
        data,
        userAddress: callerAddress,
        status: "signed",
      },
    });
    return res.status(201).json(expense);
  } catch (error) {
    return errorResponse(500, "Failed to create expense", res);
  }
};

export const getExpenses = async (req: Request, res: Response) => {
  const callerAddress = (req as any).address;
  const teamId = Number(req.query.teamId);

  if (isNaN(teamId)) {
    return errorResponse(400, "Invalid teamId", res);
  }

  try {
    // Check if the user is a member of the provided team
    if (!(await isUserMemberOfTeam(callerAddress, teamId))) {
      return errorResponse(403, "Caller is not a member of the team", res);
    }

    const expenses = await prisma.expense.findMany({
      where: { teamId },
    });

    // TODO: for each expense, check the status and update it
    // expenses.forEach(async (expense) => {
    //   if (expense.status === "pending") {
    //     await synExpenseStatus(expense.id);
    //   }
    // });
    return res.status(200).json(expenses);
  } catch (error) {
    return errorResponse(500, "Failed to fetch expenses", res);
  }
};

const synExpenseStatus = async (expenseId: number) => {
  // TODO: implement the logic to get the current status of the expense

  const expenseStatus = "pending"; // update the status based on the logic
  await prisma.expense.update({
    where: { id: expenseId },
    data: { status: expenseStatus },
  });
};

export const updateExpense = async (req: Request, res: Response) => {
  const expenseId = Number(req.params.id);
  const callerAddress = (req as any).address;
  const { status } = req.body as {
    status: "disable" | "expired" | "limitReached";
  };

  if (isNaN(expenseId)) {
    return errorResponse(400, "Invalid expense ID", res);
  }

  if (!status) {
    return errorResponse(400, "Missing status", res);
  }

  if (
    status !== "disable" &&
    status !== "expired" &&
    status !== "limitReached"
  ) {
    return errorResponse(400, "Invalid status", res);
  }

  // TODO: logic to check if the status is readly expired or limit reached

  // check if the user is the owner of the team

  if (status === "disable") {
    const expense = await prisma.expense.findUnique({
      where: {
        id: expenseId,
        team: {
          ownerAddress: callerAddress,
        },
      },
    });

    if (!expense) {
      return errorResponse(403, "Caller is not the owner of the team", res);
    }
  }

  try {
    const updatedExpense = await prisma.expense.update({
      where: { id: expenseId },
      data: { status: status },
    });
    return res.status(200).json(updatedExpense);
  } catch (error) {
    return errorResponse(500, "Failed to update expense", res);
  }
};
