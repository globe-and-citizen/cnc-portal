import { Request, Response } from 'express';
import { errorResponse } from '../utils/utils';

import {
  Address,
  Hex,
  formatEther,
  isAddress,
  isHex,
  keccak256,
  parseEther,
  parseUnits,
  recoverTypedDataAddress,
  zeroAddress,
} from 'viem';
import { prisma } from '../utils';
import publicClient from '../utils/viem.config';

import { Expense } from '@prisma/client';
import ABI from '../artifacts/expense-account-eip712.json';
import { BudgetLimit } from '../types';
import { getCurrentExpenseAccountContract } from '../utils/expenseAccountUtil';
import {
  addExpenseBodySchema,
  getExpensesQuerySchema,
  updateExpenseBodySchema,
  updateExpenseParamsSchema,
  z,
} from '../validation';

type AddExpenseBody = z.infer<typeof addExpenseBodySchema>;
type GetExpensesQuery = z.infer<typeof getExpensesQuerySchema>;
type UpdateExpenseBody = z.infer<typeof updateExpenseBodySchema>;
type UpdateExpenseParams = z.infer<typeof updateExpenseParamsSchema>;

const BUDGET_LIMIT_TYPES = {
  BudgetLimit: [
    { name: 'amount', type: 'uint256' },
    { name: 'frequencyType', type: 'uint8' },
    { name: 'customFrequency', type: 'uint256' },
    { name: 'startDate', type: 'uint256' },
    { name: 'endDate', type: 'uint256' },
    { name: 'tokenAddress', type: 'address' },
    { name: 'approvedAddress', type: 'address' },
  ],
} as const;

const buildContractBudgetLimit = (data: BudgetLimit) => ({
  amount:
    data.tokenAddress === zeroAddress
      ? parseEther(`${data.amount}`)
      : parseUnits(`${data.amount}`, 6),
  frequencyType: Number(data.frequencyType),
  customFrequency: BigInt(Number(data.customFrequency)),
  startDate: BigInt(Number(data.startDate)),
  endDate: BigInt(Number(data.endDate)),
  tokenAddress: data.tokenAddress as Address,
  approvedAddress: data.approvedAddress as Address,
});

export const addExpense = async (req: Request, res: Response) => {
  const callerAddress = req.address;
  const { teamId, signature, data, signedAgainstContractAddress, chainId } =
    req.body as AddExpenseBody;

  const expenseAccountEip712Address = await getCurrentExpenseAccountContract(teamId);

  if (
    !expenseAccountEip712Address ||
    expenseAccountEip712Address.address.toLowerCase() !== signedAgainstContractAddress.toLowerCase()
  ) {
    return errorResponse(
      400,
      'signedAgainstContractAddress does not match the team current ExpenseAccountEIP712',
      res
    );
  }

  const owner = (await publicClient.readContract({
    address: expenseAccountEip712Address?.address as Address,
    abi: ABI,
    functionName: 'owner',
  })) as unknown as string;

  try {
    // Check if the caller is the owner of the team (on-chain owner, not DB team owner)
    if (callerAddress != owner) {
      return errorResponse(403, 'Caller is not the owner of the team', res);
    }

    if (!isHex(signature) || !isAddress(callerAddress)) {
      return errorResponse(400, 'Missing or invalid signature', res);
    }

    let recovered: Address;
    try {
      recovered = await recoverTypedDataAddress({
        domain: {
          name: 'CNCExpenseAccount',
          version: '1',
          chainId,
          verifyingContract: signedAgainstContractAddress as Address,
        },
        types: BUDGET_LIMIT_TYPES,
        primaryType: 'BudgetLimit',
        message: buildContractBudgetLimit(data as BudgetLimit),
        signature: signature as Hex,
      });
    } catch (error) {
      console.error('Failed to recover signer for expense approval:', error);
      return errorResponse(400, 'Failed to verify signature', res);
    }

    if (recovered.toLowerCase() !== callerAddress.toLowerCase()) {
      return errorResponse(400, 'Recovered signer does not match the caller', res);
    }

    // TODO: should be only one expense active for the user
    const expense = await prisma.expense.create({
      data: {
        teamId,
        signature,
        data: { ...data, signedAgainstContractAddress, chainId },
        userAddress: data.approvedAddress,
        status: 'signed',
      },
    });
    return res.status(201).json(expense);
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

export const getExpenses = async (req: Request, res: Response) => {
  const { teamId, status } = req.query as unknown as GetExpensesQuery;

  try {
    // authz enforced by requireTeamMember middleware

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
    expense.status === 'expired' ||
    (expense.status === 'limit-reached' && (expense.data as BudgetLimit)?.frequencyType === 0)
  ) {
    return {
      ...expense,
      status: expense.status,
      balances: (expense.data as BudgetLimit)?.balances,
    };
  }

  const expenseAccountEip712Address = await getCurrentExpenseAccountContract(expense.teamId);

  const data = expense.data as BudgetLimit;

  const balance = (await publicClient.readContract({
    address: expenseAccountEip712Address?.address as Address,
    abi: ABI,
    functionName: 'getExpenseBalance',
    args: [keccak256(expense.signature as Address)],
  })) as unknown as {
    lastWithdrawnDate: bigint;
    totalWithdrawn: bigint;
    lastWithdrawnPeriod: bigint;
    state: 0 | 1 | 2;
  };

  const isNewPeriod = await publicClient.readContract({
    address: expenseAccountEip712Address?.address as Address,
    abi: ABI,
    functionName: 'isNewPeriod',
    args: [buildContractBudgetLimit(data), keccak256(expense.signature as Address)],
  });

  // 2. Fetch the latest block
  const block = await publicClient.getBlock();

  // 3. Access the timestamp
  const isExpired = data.endDate <= Number(block.timestamp);

  const amountTransferred = isNewPeriod
    ? '0'
    : data.tokenAddress === zeroAddress
      ? `${formatEther(balance.totalWithdrawn)}`
      : `${Number(balance.totalWithdrawn) / 1e6}`;

  const isLimitReached =
    !isNewPeriod &&
    (Number(data.amount || Number.MAX_VALUE) <= Number(amountTransferred) ||
      ((expense.data as BudgetLimit).frequencyType === 0 && balance.totalWithdrawn > 0));

  const formattedExpense = {
    ...expense,
    balances: {
      0: `${balance.lastWithdrawnDate}`,
      1: amountTransferred,
    },
    status: isExpired
      ? 'expired'
      : isLimitReached
        ? 'limit-reached'
        : balance.state === 2
          ? 'disabled'
          : 'enabled',
  };

  const updateData: { status: string; data?: BudgetLimit } = {
    status: formattedExpense.status,
  };

  if (((expense.data as BudgetLimit).frequencyType === 0 && isLimitReached) || isExpired) {
    updateData.data = {
      ...(formattedExpense.data as BudgetLimit),
      balances: {
        1: amountTransferred,
        0: `${balance.lastWithdrawnDate}`,
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
  const { id: expenseId } = req.params as unknown as UpdateExpenseParams;
  const callerAddress = req.address;
  const { status } = req.body as UpdateExpenseBody;

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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return errorResponse(500, message, res);
  }
};
