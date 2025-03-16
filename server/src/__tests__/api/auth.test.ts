import request from "supertest";
import app from "../../app";

describe("Auth API", () => {
  describe("POST /api/auth/register", () => {
    it("should return 501 Not Implemented", async () => {
      const response = await request(app).post("/api/auth/register").send({
        email: "test@example.com",
        password: "password123",
      });

      expect(response.status).toBe(501);
      expect(response.body).toEqual({
        error: "Not implemented",
        message: "User registration will be implemented in Phase 2",
      });
    });
  });

  describe("POST /api/auth/login", () => {
    it("should return 501 Not Implemented", async () => {
      const response = await request(app).post("/api/auth/login").send({
        email: "test@example.com",
        password: "password123",
      });

      expect(response.status).toBe(501);
      expect(response.body).toEqual({
        error: "Not implemented",
        message: "User authentication will be implemented in Phase 2",
      });
    });
  });
});
