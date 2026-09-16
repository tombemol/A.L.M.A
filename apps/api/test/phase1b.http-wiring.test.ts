import request from "supertest";
import { describe, it } from "vitest";
import { app } from "../src/app.js";

describe("wiring HTTP da Fase 1B", () => {
  it("protege as rotas principais do catálogo", async () => {
    await request(app).get("/api/categories").expect(401);
    await request(app).get("/api/units").expect(401);
    await request(app).get("/api/products").expect(401);
    await request(app).get("/api/products/demo/locations").expect(401);
  });

  it("protege as rotas principais de localizações", async () => {
    await request(app).get("/api/warehouses").expect(401);
    await request(app).get("/api/warehouses/demo/locations").expect(401);
  });
});
