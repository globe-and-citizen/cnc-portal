import { Address, isAddress } from 'viem';
import publicClient from './viem.config';
import ABI from '../artifacts/expense-account-eip712.json';
import { prisma } from '.';

export const getCurrentExpenseAccountContract = (teamId: number) =>
  prisma.teamContract.findFirst({
    where: {
      teamId,
      type: 'ExpenseAccountEIP712',
      officer: { nextOfficer: { is: null } },
    },
  });

export const getExpenseAccountOwner = async (teamId: number): Promise<Address | null> => {
  try {
    const contract = await getCurrentExpenseAccountContract(teamId);

    if (!contract || !isAddress(contract.address)) return null;

    return (await publicClient.readContract({
      address: contract.address as Address,
      abi: ABI,
      functionName: 'owner',
    })) as Address;
  } catch (error) {
    console.error('Error getting Expense Account owner:', error);
    return null;
  }
};
