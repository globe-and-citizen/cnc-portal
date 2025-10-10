import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Mock environment variables before importing the module
const mockEnv = {
  GCP_KEY: undefined as string | undefined,
  GCS_BUCKET_NAME: "test-bucket",
};

vi.stubEnv("GCS_BUCKET_NAME", mockEnv.GCS_BUCKET_NAME);

// Mock @google-cloud/storage
const mockBucket = {
  name: "test-bucket",
};

const mockStorage = vi.fn(() => ({
  bucket: vi.fn(() => mockBucket),
}));

vi.mock("@google-cloud/storage", () => ({
  Storage: mockStorage,
}));

vi.mock("dotenv", () => ({
  config: vi.fn(),
}));

describe("storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the module cache to reimport with new env
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should create storage with credentials from GCP_KEY env variable", async () => {
    const mockCredentials = { project_id: "test-project", client_email: "test@test.com" };
    vi.stubEnv("GCP_KEY", JSON.stringify(mockCredentials));
    vi.stubEnv("GCS_BUCKET_NAME", "test-bucket");

    // Re-import the module to get the new environment
    const { bucket } = await import("../storage");

    expect(bucket).toBeDefined();
    expect(bucket.name).toBe("test-bucket");
  });

  it("should create storage without credentials if GCP_KEY is not set", async () => {
    vi.stubEnv("GCS_BUCKET_NAME", "test-bucket");

    // Re-import the module
    const { bucket } = await import("../storage");

    expect(bucket).toBeDefined();
    expect(bucket.name).toBe("test-bucket");
  });

  it("should throw error if GCS_BUCKET_NAME is missing", async () => {
    vi.unstubAllEnvs();
    
    // This should throw an error during module import
    await expect(async () => {
      // Clear the module and reimport without GCS_BUCKET_NAME
      vi.resetModules();
      await import("../storage");
    }).rejects.toThrow();
  });
});
