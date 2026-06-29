import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "@/app";
import { Admin } from "@/infrastructure/database/models/Admin";
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from "../helpers/db";
import { getCsrfHeaderFromResponse, TEST_ADMIN } from "../helpers/auth";

const loginAdmin = async (agent: request.SuperAgentTest) => {
  const loginResponse = await agent.post("/api/admin/auth/login").send({
    email: TEST_ADMIN.email,
    password: TEST_ADMIN.password,
  });

  expect(loginResponse.status).toBe(200);

  return {
    csrf: getCsrfHeaderFromResponse(loginResponse),
  };
};

const createCategory = async (
  agent: request.SuperAgentTest,
  csrf: Record<string, string>,
  payload: Record<string, unknown> = {}
) => {
  const response = await agent
    .post("/api/admin/vehicle-categories")
    .set(csrf)
    .send({
      name: "Executive Sedan",
      description: "Premium saloon",
      passengerCapacity: 3,
      luggageCapacity: 2,
      sortOrder: 1,
      status: "active",
      ...payload,
    });

  expect(response.status).toBe(200);
  return response.body.data;
};

describe("Vehicle domain integration", () => {
  let agent: request.SuperAgentTest;
  let csrf: Record<string, string>;

  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    await Admin.create(TEST_ADMIN);
    agent = request.agent(app);
    ({ csrf } = await loginAdmin(agent));
  });

  describe("VehicleCategory admin routes", () => {
    it("creates a category", async () => {
      const category = await createCategory(agent, csrf, { name: "Standard Saloon" });

      expect(category.name).toBe("Standard Saloon");
      expect(category.slug).toBe("standard-saloon");
      expect(category.status).toBe("active");
    });

    it("updates a category", async () => {
      const category = await createCategory(agent, csrf, { name: "SUV" });
      const response = await agent
        .patch(`/api/admin/vehicle-categories/${category._id}`)
        .set(csrf)
        .send({ description: "Updated description" });

      expect(response.status).toBe(200);
      expect(response.body.data.description).toBe("Updated description");
    });

    it("deletes a category", async () => {
      const category = await createCategory(agent, csrf, { name: "Luxury" });
      const response = await agent
        .delete(`/api/admin/vehicle-categories/${category._id}`)
        .set(csrf);

      expect(response.status).toBe(200);
    });

    it("cascade deletes vehicles when category is deleted", async () => {
      const category = await createCategory(agent, csrf, { name: "Fleet Cascade" });
      const vehicleResponse = await agent.post("/api/admin/vehicles").set(csrf).send({
        categoryId: category._id,
        registrationNumber: "AB12CDE",
        make: "Toyota",
        model: "Prius",
      });

      expect(vehicleResponse.status).toBe(200);

      const deleteResponse = await agent
        .delete(`/api/admin/vehicle-categories/${category._id}`)
        .set(csrf);

      expect(deleteResponse.status).toBe(200);

      const vehicleLookup = await agent
        .get(`/api/admin/vehicles/${vehicleResponse.body.data._id}`)
        .set(csrf);

      expect(vehicleLookup.status).toBe(404);
    });

    it("cascade deletes pricing slabs when category is deleted", async () => {
      const category = await createCategory(agent, csrf, { name: "Pricing Cascade" });
      const pricingResponse = await agent
        .post(`/api/admin/vehicle-categories/${category._id}/pricing`)
        .set(csrf)
        .send({
          minDistance: 0,
          maxDistance: null,
          pricingType: "fixed",
          priceAmount: 45,
        });

      expect(pricingResponse.status).toBe(200);

      const deleteResponse = await agent
        .delete(`/api/admin/vehicle-categories/${category._id}`)
        .set(csrf);

      expect(deleteResponse.status).toBe(200);

      const pricingLookup = await agent
        .get(`/api/admin/vehicle-pricing/${pricingResponse.body.data._id}`)
        .set(csrf);

      expect(pricingLookup.status).toBe(404);
    });
  });

  describe("VehiclePricing admin routes", () => {
    it("creates a pricing slab", async () => {
      const category = await createCategory(agent, csrf, { name: "Pricing Create" });
      const response = await agent
        .post(`/api/admin/vehicle-categories/${category._id}/pricing`)
        .set(csrf)
        .send({
          minDistance: 0,
          maxDistance: 50,
          pricingType: "fixed",
          priceAmount: 45,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.priceAmount).toBe(45);
    });

    it("rejects overlapping active slabs", async () => {
      const category = await createCategory(agent, csrf, { name: "Overlap Test" });
      await agent
        .post(`/api/admin/vehicle-categories/${category._id}/pricing`)
        .set(csrf)
        .send({
          minDistance: 0,
          maxDistance: 50,
          pricingType: "fixed",
          priceAmount: 45,
        });

      const response = await agent
        .post(`/api/admin/vehicle-categories/${category._id}/pricing`)
        .set(csrf)
        .send({
          minDistance: 40,
          maxDistance: 100,
          pricingType: "per_unit",
          priceAmount: 1.2,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("overlaps");
    });

    it("rejects a second open-ended active slab", async () => {
      const category = await createCategory(agent, csrf, { name: "Open Ended Test" });
      await agent
        .post(`/api/admin/vehicle-categories/${category._id}/pricing`)
        .set(csrf)
        .send({
          minDistance: 0,
          maxDistance: null,
          pricingType: "per_unit",
          priceAmount: 1.2,
        });

      const response = await agent
        .post(`/api/admin/vehicle-categories/${category._id}/pricing`)
        .set(csrf)
        .send({
          minDistance: 100,
          maxDistance: null,
          pricingType: "per_unit",
          priceAmount: 0.95,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/overlaps|open-ended/i);
    });

    it("reports pricing gaps for active slabs only", async () => {
      const category = await createCategory(agent, csrf, { name: "Gap Test" });
      await agent
        .post(`/api/admin/vehicle-categories/${category._id}/pricing`)
        .set(csrf)
        .send({
          minDistance: 0,
          maxDistance: 50,
          pricingType: "fixed",
          priceAmount: 45,
        });
      await agent
        .post(`/api/admin/vehicle-categories/${category._id}/pricing`)
        .set(csrf)
        .send({
          minDistance: 70,
          maxDistance: null,
          pricingType: "per_unit",
          priceAmount: 1.2,
        });
      await agent
        .post(`/api/admin/vehicle-categories/${category._id}/pricing`)
        .set(csrf)
        .send({
          minDistance: 60,
          maxDistance: null,
          pricingType: "per_unit",
          priceAmount: 1.1,
          status: "inactive",
        });

      const response = await agent
        .post(`/api/admin/vehicle-categories/${category._id}/pricing/validate`)
        .set(csrf)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.data.isComplete).toBe(false);
      expect(response.body.data.gaps).toEqual([{ fromDistance: 50, toDistance: 70 }]);
    });

    it("returns admin quote results for a distance", async () => {
      const category = await createCategory(agent, csrf, { name: "Quote Admin" });
      await agent
        .post(`/api/admin/vehicle-categories/${category._id}/pricing`)
        .set(csrf)
        .send({
          minDistance: 0,
          maxDistance: null,
          pricingType: "fixed",
          priceAmount: 85,
        });

      const response = await agent.get("/api/admin/vehicle-pricing/quotes?distance=50").set(csrf);

      expect(response.status).toBe(200);
      expect(response.body.data.distance).toBe(50);
      expect(response.body.data.items.length).toBeGreaterThan(0);
    });
  });

  describe("Vehicle admin routes", () => {
    it("creates a vehicle with category validation", async () => {
      const category = await createCategory(agent, csrf, { name: "Vehicle Create" });
      const response = await agent.post("/api/admin/vehicles").set(csrf).send({
        categoryId: category._id,
        registrationNumber: "XY99 ZZZ",
        make: "Mercedes-Benz",
        model: "E-Class",
      });

      expect(response.status).toBe(200);
      expect(response.body.data.categoryId).toBe(category._id);
      expect(response.body.data.passengerCapacity).toBe(3);
      expect(response.body.data.luggageCapacity).toBe(2);
      expect(response.body.data.pricingCategory).toBeUndefined();
    });

    it("ignores client capacity values and uses category capacities", async () => {
      const category = await createCategory(agent, csrf, {
        name: "Capacity Sync",
        passengerCapacity: 5,
        luggageCapacity: 4,
      });

      const response = await agent.post("/api/admin/vehicles").set(csrf).send({
        categoryId: category._id,
        registrationNumber: "CS01 TAL",
        make: "Ford",
        model: "Galaxy",
        passengerCapacity: 2,
        luggageCapacity: 1,
      });

      expect(response.status).toBe(200);
      expect(response.body.data.passengerCapacity).toBe(5);
      expect(response.body.data.luggageCapacity).toBe(4);
    });

    it("updates a vehicle", async () => {
      const category = await createCategory(agent, csrf, { name: "Vehicle Update" });
      const created = await agent.post("/api/admin/vehicles").set(csrf).send({
        categoryId: category._id,
        registrationNumber: "UP01 DAT",
        make: "BMW",
        model: "5 Series",
      });

      const response = await agent
        .patch(`/api/admin/vehicles/${created.body.data._id}`)
        .set(csrf)
        .send({ color: "Black" });

      expect(response.status).toBe(200);
      expect(response.body.data.color).toBe("Black");
    });
  });

  describe("Public vehicle routes", () => {
    it("GET /api/vehicle-categories returns active categories only", async () => {
      await createCategory(agent, csrf, { name: "Public Active", status: "active" });
      await createCategory(agent, csrf, { name: "Public Inactive", status: "inactive" });

      const response = await request(app).get("/api/vehicle-categories");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe("Public Active");
      expect(response.body.data[0].id).toBeDefined();
      expect(response.body.data[0].slug).toBe("public-active");
      expect(response.body.data[0].passengerCapacity).toBe(3);
    });

    it("GET /api/vehicle-categories/:slug returns category details", async () => {
      const category = await createCategory(agent, csrf, {
        name: "Detail Category",
        description: "Fleet detail page category",
      });

      await agent.post("/api/admin/vehicles").set(csrf).send({
        categoryId: category._id,
        registrationNumber: "DT01 TAL",
        make: "Audi",
        model: "A6",
      });

      await agent
        .post(`/api/admin/vehicle-categories/${category._id}/pricing`)
        .set(csrf)
        .send({
          minDistance: 0,
          maxDistance: null,
          pricingType: "fixed",
          priceAmount: 60,
        });

      const response = await request(app).get("/api/vehicle-categories/detail-category");

      expect(response.status).toBe(200);
      expect(response.body.data.slug).toBe("detail-category");
      expect(response.body.data.vehicleCount).toBe(1);
      expect(response.body.data.hasActivePricing).toBe(true);
      expect(response.body.data.activePricingSlabCount).toBe(1);
      expect(response.body.data.registrationNumber).toBeUndefined();
    });

    it("GET /api/vehicle-pricing/quotes returns public quote data", async () => {
      const category = await createCategory(agent, csrf, { name: "Public Quote" });
      await agent.post("/api/admin/vehicles").set(csrf).send({
        categoryId: category._id,
        registrationNumber: "PQ01 TAL",
        make: "Toyota",
        model: "Camry",
      });
      await agent
        .post(`/api/admin/vehicle-categories/${category._id}/pricing`)
        .set(csrf)
        .send({
          minDistance: 0,
          maxDistance: null,
          pricingType: "fixed",
          priceAmount: 85,
        });

      const response = await request(app).get(
        "/api/vehicle-pricing/quote?distance=50&passengers=2"
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].category.name).toBe("Public Quote");
      expect(response.body.data[0].category.vehicles).toEqual(["Toyota Camry"]);
      expect(response.body.data[0].priceBreakdown.totalPrice).toBe(85);
      expect(response.body.data[0].passengers).toBe(3);
      expect(response.body.data[0].luggage).toBe(2);
      expect(response.body.data[0].bag).toBeUndefined();
      expect(response.body.data[0].categoryName).toBeUndefined();
      expect(response.body.data[0].vehicles).toBeUndefined();
    });

    it("GET /api/vehicle-pricing/quote filters categories by passenger capacity", async () => {
      const saloon = await createCategory(agent, csrf, {
        name: "Filter Saloon",
        passengerCapacity: 3,
      });
      const minivan = await createCategory(agent, csrf, {
        name: "Filter Minivan",
        passengerCapacity: 7,
      });

      for (const category of [saloon, minivan]) {
        await agent
          .post(`/api/admin/vehicle-categories/${category._id}/pricing`)
          .set(csrf)
          .send({
            minDistance: 0,
            maxDistance: null,
            pricingType: "fixed",
            priceAmount: 60,
          });
      }

      const response = await request(app).get(
        "/api/vehicle-pricing/quote?distance=50&passengers=4"
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].category.name).toBe("Filter Minivan");
      expect(response.body.data[0].passengers).toBe(7);
    });

    it("GET /api/vehicle-pricing/quote doubles total for return-trip category", async () => {
      const category = await createCategory(agent, csrf, { name: "Return Quote" });
      await agent
        .post(`/api/admin/vehicle-categories/${category._id}/pricing`)
        .set(csrf)
        .send({
          minDistance: 0,
          maxDistance: null,
          pricingType: "fixed",
          priceAmount: 50,
        });

      const response = await request(app).get(
        "/api/vehicle-pricing/quote?distance=50&passengers=2&category=return-trip"
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].priceBreakdown.totalPrice).toBe(100);
      expect(response.body.data[0].priceBreakdown.returnPrice).toBeUndefined();
    });
  });
});
