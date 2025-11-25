import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { errorResponse } from '../utils/utils';
import { isUserMemberOfTeam, isOwnerOfTeam } from './wageController';

import { prisma } from '../utils';
import { Address, formatEther, keccak256, zeroAddress } from 'viem';
import publicClient from '../utils/viem.config';

import { Expense, Prisma } from '@prisma/client';
import ABI from '../artifacts/expense-account-eip712.json';
import { BudgetLimit } from '../types';

// type expenseBodyRequest = Pick<Expens
type expenseBodyRequest = Pick<Expense, 'signature' | 'data'> & {
  teamId: string;
};

export const addExpense = async (req: Request, res: Response) => {
  const callerAddress = (req as any).address;
  const body = req.body as expenseBodyRequest;
  const teamId = Number(body.teamId);
  const signature = body.signature as string;
  const data: BudgetLimit = typeof body.data === 'string' ? JSON.parse(body.data) : body.data;

  const expenseAccountEip712Address = await prisma.teamContract.findFirst({
    where: {
      teamId: teamId,
      type: 'ExpenseAccountEIP712',
    },
  });

  const owner = (await publicClient.readContract({
    address: expenseAccountEip712Address?.address as Address,
    abi: ABI,
    functionName: 'owner',
  })) as unknown as string;

  try {
    // Check if the caller is the owner of the team
    if (callerAddress != owner) {
      return errorResponse(403, 'Caller is not the owner of the team', res);
    }

    console.log('Adding expense: ', data, 'signature: ', signature)
    // TODO: should be only one expense active for the user
    const expense = await prisma.expense.create({
      data: {
        teamId,
        signature,
        data: data,
        userAddress: data.approvedAddress,
        status: 'signed',
      },
    });
    return res.status(201).json(expense);
  } catch (error) {
    console.error(error);
    return errorResponse(500, error, res);
  }
};

export const getExpenses = async (req: Request, res: Response) => {
  const callerAddress = (req as any).address;
  const teamId = Number(req.query.teamId);
  const status = String(req.query.status || 'all');

  try {
    // Check if the user is a member of the provided team
    if (!(await isUserMemberOfTeam(callerAddress, teamId))) {
      return errorResponse(403, 'Caller is not a member of the team', res);
    }

    // Build where clause based on status
    const whereClause: { teamId: number; status?: string } = { teamId };
    if (status !== 'all') {
      whereClause.status = status;
    }

    const expenses = await prisma.expense.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            address: true,
            imageUrl: true,
          },
        },
      },
    });

    const _expenses = await Promise.all(
      expenses.map(async (expense) => await syncExpenseStatus(expense))
    );
    // TODO: for each expense, check the status and update it

    return res.status(200).json(_expenses);
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

const syncExpenseStatus = async (expense: Expense) => {
  // TODO: implement the logic to get the current status of the expense
  if (
    (expense.status === 'expired' || expense.status === 'limit-reached') &&
    'balances' in (expense.data as BudgetLimit)
  ) {
    return {
      ...expense,
      status: expense.status,
      balances: (expense.data as BudgetLimit)?.balances,
    };
  }

  const expenseAccountEip712Address = await prisma.teamContract.findFirst({
    where: {
      teamId: expense.teamId,
      type: 'ExpenseAccountEIP712',
    },
  });

  const data = expense.data as BudgetLimit;

  const balances = (await publicClient.readContract({
    address: expenseAccountEip712Address?.address as Address,
    abi: ABI,
    functionName: 'expenseBalances',
    args: [keccak256(expense.signature as Address)],
  })) as unknown as [bigint, bigint, bigint, 0 | 1 | 2];

  const isExpired = data.endDate/* expiry */ <= Math.floor(new Date().getTime() / 1000);

  const amountTransferred =
    data.tokenAddress === zeroAddress
      ? `${formatEther(balances[1])}`
      : `${Number(balances[1]) / 1e6}`;

  const isLimitReached =
    (Number(data.amount)/* budgetData.find((item) => item.budgetType === 1)?.value */ ?? Number.MAX_VALUE) <=
      Number(amountTransferred) /* ||
    (data.budgetData.find((item) => item.budgetType === 0)?.value ?? Number.MAX_VALUE) <=
      Number(balances[0] )*/;

  const formattedExpense = {
    ...expense,
    balances: {
      0: `${balances[0]}`,
      1: amountTransferred,
    },
    status: isExpired
      ? 'expired'
      : isLimitReached
        ? 'limit-reached'
        : balances[3] === 2
          ? 'disabled'
          : 'enabled',
  };

  const updateData: { status: string; data?: BudgetLimit } = {
    status: formattedExpense.status,
  };

  if (isLimitReached || isExpired) {
    updateData.data = {
      ...(formattedExpense.data as BudgetLimit),
      balances: {
        1: amountTransferred,
        0: `${balances[0]}`,
      },
    };
  }

  await prisma.expense.update({
    where: { id: expense.id },
    data: updateData,
  });

  return formattedExpense;
};

export const updateExpense = async (req: Request, res: Response) => {
  const expenseId = Number(req.params.id);
  const callerAddress = (req as any).address;
  const { status } = req.body as {
    status: 'disable' | 'expired' | 'limitReached';
  };

  // TODO: logic to check if the status is already expired or limit reached

  // check if the user is the owner of the team

  try {
    if (status === 'disable') {
      const expense = await prisma.expense.findUnique({
        where: {
          id: expenseId,
          team: {
            ownerAddress: callerAddress,
          },
        },
      });

      if (!expense) {
        return errorResponse(403, 'Caller is not the owner of the team', res);
      }
    }
    const updatedExpense = await prisma.expense.update({
      where: { id: expenseId },
      data: { status: status },
    });
    return res.status(200).json(updatedExpense);
  } catch (error) {
    return errorResponse(500, 'Failed to update expense', res);
  }
};