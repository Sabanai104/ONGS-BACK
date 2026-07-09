import request from "supertest";
import app from "../app";

describe("Health Check", () => {
  it("should return API status OK", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "OK" });
  });
});