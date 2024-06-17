import { afterAll, beforeAll, describe, expect, it, vitest } from "vitest";

import request from "supertest";
import server from "../src/config/serverConfig";

describe("User Controller", () => {
  it("Should get Nonce", async () => {
    // TODO: Write test cases for getNonce: Calling the endpoint
    expect(1).toBe(1);

    // TODO: Should trhow an error for an invalid address
    const response = await request(server.getApp()).get(
      "/api/user/nonce/Myaddress"
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toMatchInlineSnapshot(`true`);
  });
});
