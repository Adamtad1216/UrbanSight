import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../src/app.js";
import { User } from "../src/models/User.js";
import { Tool } from "../src/models/Tool.js";
import { roles } from "../src/utils/constants.js";

describe("Tools import endpoint", () => {
  let mongoServer;
  let adminToken;
  let surveyorToken;

  beforeAll(async () => {
    process.env.JWT_SECRET = "test-secret";
    process.env.JWT_EXPIRES_IN = "1d";

    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();

    await User.create({
      name: "Admin User",
      email: "admin.import@test.com",
      password: "password123",
      phone: "0911000100",
      role: roles.ADMIN,
      branch: "Sikela Branch",
      status: "active",
      firstLogin: false,
    });

    await User.create({
      name: "Surveyor User",
      email: "surveyor.import@test.com",
      password: "password123",
      phone: "0911000101",
      role: roles.SURVEYOR,
      branch: "Sikela Branch",
      status: "active",
      firstLogin: false,
    });

    const adminLogin = await request(app).post("/api/auth/login-staff").send({
      email: "admin.import@test.com",
      password: "password123",
    });
    adminToken = adminLogin.body.token;

    const surveyorLogin = await request(app).post("/api/auth/login-staff").send({
      email: "surveyor.import@test.com",
      password: "password123",
    });
    surveyorToken = surveyorLogin.body.token;
  });

  it("uploads a valid CSV file and imports all rows", async () => {
    const csv = [
      "Code,Description,Source,Qty,Measurement,Stock Price,Customer Price",
      "PVC-001,PVC Pipe,Warehouse,10,meters,100,150",
      "VALVE-002,Control Valve,Store,2,piece,250,300",
    ].join("\n");

    const response = await request(app)
      .post("/api/tools/import")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from(csv), {
        filename: "tools.csv",
        contentType: "text/csv",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.successCount).toBe(2);
    expect(response.body.failedCount).toBe(0);

    const tools = await Tool.find({}).sort({ code: 1 }).lean();
    expect(tools).toHaveLength(2);
    expect(tools[0].code).toBe("PVC-001");
    expect(tools[1].code).toBe("VALVE-002");
  });

  it("accepts normalized header variants and trailing empty header columns", async () => {
    const csv = [
      " code , DESCRIPTION , source , qty , measurement , stock_price , customer price ,",
      "PVC-001,PVC Pipe,Warehouse,10,meters,100,150,",
    ].join("\n");

    const response = await request(app)
      .post("/api/tools/import")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from(csv), {
        filename: "tools.csv",
        contentType: "text/csv",
      });

    expect(response.status).toBe(200);
    expect(response.body.successCount).toBe(1);
    expect(response.body.failedCount).toBe(0);
  });

  it("skips invalid rows and returns summary with row-level errors", async () => {
    const csv = [
      "Code,Description,Source,Qty,Measurement,Stock Price,Customer Price",
      "PIPE-001,Valid Pipe,Warehouse,5,meters,100,120",
      "PIPE-002,,Warehouse,3,meters,100,120",
      "PIPE-003,Invalid Price,Warehouse,1,meters,abc,120",
    ].join("\n");

    const response = await request(app)
      .post("/api/tools/import")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from(csv), {
        filename: "tools.csv",
        contentType: "text/csv",
      });

    expect(response.status).toBe(200);
    expect(response.body.successCount).toBe(1);
    expect(response.body.failedCount).toBe(2);
    expect(response.body.errors).toHaveLength(2);

    const codes = (await Tool.find({}).lean()).map((tool) => tool.code);
    expect(codes).toEqual(["PIPE-001"]);
  });

  it("updates existing tools when duplicate codes are imported", async () => {
    await Tool.create({
      code: "PVC-001",
      description: "Old Description",
      source: "Warehouse",
      measurement: "piece",
      stockPrice: 10,
      customerPrice: 20,
      isActive: false,
    });

    const csv = [
      "Code,Description,Source,Qty,Measurement,Stock Price,Customer Price",
      "PVC-001,Updated PVC Pipe,Store,12,meters,110,155",
    ].join("\n");

    const response = await request(app)
      .post("/api/tools/import")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from(csv), {
        filename: "tools.csv",
        contentType: "text/csv",
      });

    expect(response.status).toBe(200);
    expect(response.body.successCount).toBe(1);
    expect(response.body.failedCount).toBe(0);

    const updated = await Tool.findOne({ code: "PVC-001" }).lean();
    expect(updated.description).toBe("Updated PVC Pipe");
    expect(updated.source).toBe("Store");
    expect(updated.stockPrice).toBe(110);
    expect(updated.customerPrice).toBe(155);
    expect(updated.isActive).toBe(true);
  });

  it("allows only admins to import tools", async () => {
    const csv = [
      "Code,Description,Source,Qty,Measurement,Stock Price,Customer Price",
      "PVC-001,PVC Pipe,Warehouse,10,meters,100,150",
    ].join("\n");

    const response = await request(app)
      .post("/api/tools/import")
      .set("Authorization", `Bearer ${surveyorToken}`)
      .attach("file", Buffer.from(csv), {
        filename: "tools.csv",
        contentType: "text/csv",
      });

    expect(response.status).toBe(403);
  });
});
