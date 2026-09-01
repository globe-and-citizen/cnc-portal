import { hardhat, mainnet, polygon, polygonAmoy, sepolia } from 'viem/chains';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the createPublicClient, http and fallback functions
vi.mock('viem', () => ({
  createPublicClient: vi.fn(),
  http: vi.fn(),
  fallback: vi.fn(),
}));

// Import the module after mocking
import { http, fallback } from 'viem';
import { getChain, getTransport } from '../viem.config';

describe('viem.config', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    // Reset environment variables
    process.env.CHAIN_ID = undefined;
  });

  describe('getChain', () => {
    it('should return sepolia as default when chainId is undefined', () => {
      expect(getChain(undefined)).toBe(sepolia);
    });

    it('should return sepolia as default for unknown chain ID', () => {
      expect(getChain('999999')).toBe(sepolia);
    });

    it('should correctly identify mainnet', () => {
      expect(getChain(mainnet.id.toString())).toBe(mainnet);
    });

    it('should correctly identify sepolia', () => {
      expect(getChain(sepolia.id.toString())).toBe(sepolia);
    });

    it('should correctly identify polygon', () => {
      expect(getChain(polygon.id.toString())).toBe(polygon);
    });

    it('should correctly identify hardhat', () => {
      expect(getChain(hardhat.id.toString())).toBe(hardhat);
    });

    it('should correctly identify polygonAmoy', () => {
      expect(getChain(polygonAmoy.id.toString())).toBe(polygonAmoy);
    });

    it('should handle hex chain IDs', () => {
      expect(getChain('0x1')).toBe(mainnet); // mainnet hex ID
      expect(getChain('0x89')).toBe(polygon); // polygon hex ID
    });
  });

  describe('getTransport', () => {
    it('keeps a single transport for chains without public peers (hardhat)', () => {
      getTransport(hardhat);
      expect(fallback).not.toHaveBeenCalled();
    });

    it('wraps polygon reads in a fallback across public endpoints', () => {
      getTransport(polygon);
      expect(fallback).toHaveBeenCalledTimes(1);
      expect(http).toHaveBeenCalledWith('https://polygon.drpc.org');
      expect(http).toHaveBeenCalledWith('https://polygon-bor-rpc.publicnode.com');
    });

    it('wraps mainnet reads in a fallback across public endpoints', () => {
      getTransport(mainnet);
      expect(fallback).toHaveBeenCalledTimes(1);
      expect(http).toHaveBeenCalledWith('https://eth.drpc.org');
      expect(http).toHaveBeenCalledWith('https://ethereum-rpc.publicnode.com');
    });
  });
});
