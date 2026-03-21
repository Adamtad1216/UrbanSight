import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../src/app.js";
import { User } from "../src/models/User.js";
import { Tool } from "../src/models/Tool.js";
import { NewConnectionRequest } from "../src/models/NewConnectionRequest.js";
import { roles } from "../src/utils/constants.js";

describe("Inspection submit endpoint", () => {
  let mongoServer;
  let surveyorToken;
  let surveyor;
  let citizen;

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

    citizen = await User.create({
      name: "Citizen User",
      email: "citizen.inspect@test.com",
      password: "password123",
      phone: "0911000200",
      role: roles.CITIZEN,
      status: "active",
      firstLogin: false,
    });

    surveyor = await User.create({
      name: "Surveyor User",
      email: "surveyor.inspect@test.com",
      password: "password123",
      phone: "0911000201",
      role: roles.SURVEYOR,
      branch: "Sikela Branch",
      status: "active",
      firstLogin: false,
    });

    const staffLogin = await request(app).post("/api/auth/login-staff").send({
      email: "surveyor.inspect@test.com",
      password: "password123",
    });
    surveyorToken = staffLogin.body.token;
  });

  it("accepts surveyor submit payload with toolId and quantity", async () => {
    const tool = await Tool.create({
      code: "PVC-001",
      description: "PVC Pipe",
      source: "Warehouse",
      measurement: "meters",
      stockPrice: 100,
      customerPrice: 150,
      isActive: true,
    });

    const requestDoc = await NewConnectionRequest.create({
      citizen: citizen._id,
      customerName: "Citizen User",
      customerNameAmharic: "አበበ ተስፋ",
      email: "citizen.inspect@test.com",
      tinNumber: "1234567890",
      phoneNumber: "0911000200",
      numberOfFamily: 4,
      address: "Sikela area",
      houseNumberZone: "HZ-1",
      readingZone: "Water Source Kebele",
      meterSize: "20mm",
      customerGroup: "Domestic",
      type: "Private",
      serviceType: "New Water Connection",
      description: "Inspection submission test",
      branch: "Sikela Branch",
      location: { latitude: 6.03, longitude: 37.55 },
      housePlan: "https://example.com/plan.pdf",
      idCard: "https://example.com/id.pdf",
      status: "inspection",
      branchApprovalStage: 1,
      assignedSurveyor: surveyor._id,
    });

    const response = await request(app)
      .patch(`/api/requests/request/${requestDoc._id}/inspection`)
      .set("Authorization", `Bearer ${surveyorToken}`)
      .send({
        notes: "Site checked and materials are required",
        toolsRequired: [
          {
            toolId: String(tool._id),
            quantity: 2,
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.request.status).toBe("waiting_payment");

    const persisted = await NewConnectionRequest.findById(requestDoc._id).lean();
    expect(persisted.toolsRequired).toHaveLength(1);
    expect(String(persisted.toolsRequired[0].toolId)).toBe(String(tool._id));
    expect(persisted.toolsRequired[0].quantity).toBe(2);
    expect(persisted.toolsRequired[0].customerUnitPrice).toBe(150);
    expect(persisted.totalEstimatedCost).toBe(300);
  });
});
