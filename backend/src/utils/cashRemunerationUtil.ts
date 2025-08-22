import { Address, isAddress } from "viem";
import publicClient from "./viem.config";
import CASH_REMUNERATION_ABI from "../artifacts/cash_remuneration_eip712_abi.json";
import { prisma } from ".";

/**
 * Get the owner address of the Cash Remuneration contract for a specific team
 * @param teamId The team ID
 * @returns The owner address of the Cash Remuneration contract or null if not found
 */
export const getCashRemunerationOwner = async (
  teamId: number
): Promise<Address | null> => {
  try {
    // Find the Cash Remuneration contract for the team
    const contract = await prisma.teamContract.findFirst({
      where: {
        teamId: teamId,
        type: "CashRemunerationEIP712",
      },
    });

    if (!contract || !isAddress(contract.address)) {
      return null;
    }

    // Get the owner of the contract from the blockchain
    const owner = await publicClient.readContract({
      address: contract.address as `0x${string}`,
      abi: CASH_REMUNERATION_ABI,
      functionName: "owner",
    });

    return owner as Address;
  } catch (error) {
    console.error("Error getting Cash Remuneration owner:", error);
    return null;
  }
};

/**
 * Check if a user is the Cash Remuneration owner for a team
 * @param userAddress The user address to check
 * @param teamId The team ID
 * @returns True if the user is the Cash Remuneration owner, false otherwise
 */
export const isCashRemunerationOwner = async (
  userAddress: Address,
  teamId: number
): Promise<boolean> => {
  try {
    const owner = await getCashRemunerationOwner(teamId);
    return owner === userAddress;
  } catch (error) {
    console.error("Error checking if user is Cash Remuneration owner:", error);
    return false;
  }
};
