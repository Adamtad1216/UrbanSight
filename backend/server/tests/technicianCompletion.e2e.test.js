import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../src/app.js";
import { User } from "../src/models/User.js";
import { NewConnectionRequest } from "../src/models/NewConnectionRequest.js";
import { roles } from "../src/utils/constants.js";

describe("Technician completion workflow", () => {
  let mongoServer;
  let citizen;
  let branchOfficer;
  let technicianOne;
  let technicianTwo;
  let technicianOneToken;
  let technicianTwoToken;

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
      name: "Citizen",
      email: "citizen.tech@test.com",
      password: "password123",
      phone: "0911000300",
      role: roles.CITIZEN,
      status: "active",
      firstLogin: false,
    });

    branchOfficer = await User.create({
      name: "Coordinator",
      email: "coordinator.tech@test.com",
      password: "password123",
      phone: "0911000301",
      role: roles.COORDINATOR,
      branch: "Sikela Branch",
      status: "active",
      firstLogin: false,
    });

    technicianOne = await User.create({
      name: "Tech One",
      email: "tech1@test.com",
      password: "password123",
      phone: "0911000302",
      role: roles.TECHNICIAN,
      branch: "Sikela Branch",
      status: "active",
      firstLogin: false,
    });

    technicianTwo = await User.create({
      name: "Tech Two",
      email: "tech2@test.com",
      password: "password123",
      phone: "0911000303",
      role: roles.TECHNICIAN,
      branch: "Sikela Branch",
      status: "active",
      firstLogin: false,
    });

    const loginOne = await request(app).post("/api/auth/login-staff").send({
      email: "tech1@test.com",
      password: "password123",
    });
    technicianOneToken = loginOne.body.token;

    const loginTwo = await request(app).post("/api/auth/login-staff").send({
      email: "tech2@test.com",
      password: "password123",
    });
    technicianTwoToken = loginTwo.body.token;
  });

  it("keeps workflow at approved after first completion and marks ready only after second", async () => {
    const requestDoc = await NewConnectionRequest.create({
      citizen: citizen._id,
      customerName: "Citizen",
      customerNameAmharic: "አበበ ተስፋ",
      email: citizen.email,
      tinNumber: "1234567890",
      phoneNumber: "0911000300",
      numberOfFamily: 4,
      address: "Sikela",
      houseNumberZone: "HZ-1",
      readingZone: "Water Source Kebele",
      meterSize: "20mm",
      customerGroup: "Domestic",
      type: "Private",
      serviceType: "New Water Connection",
      description: "Technician completion test",
      branch: "Sikela Branch",
      location: { latitude: 6.03, longitude: 37.55 },
      housePlan: "https://example.com/plan.pdf",
      idCard: "https://example.com/id.pdf",
      status: "approved",
      branchApprovalStage: 2,
      assignedBranchOfficer: branchOfficer._id,
      assignedTechnicians: [technicianOne._id, technicianTwo._id],
      implementationCompletion: { technicianCompletions: [] },
    });

    const firstCompletion = await request(app)
      .patch(`/api/requests/request/${requestDoc._id}/complete`)
      .set("Authorization", `Bearer ${technicianOneToken}`)
      .send({ note: "Tech one done" });

    expect(firstCompletion.status).toBe(200);
    expect(firstCompletion.body.request.status).toBe("approved");

    const afterFirst = await NewConnectionRequest.findById(requestDoc._id).lean();
    expect(afterFirst.implementationCompletion.technicianCompletions).toHaveLength(1);

    const duplicateCompletion = await request(app)
      .patch(`/api/requests/request/${requestDoc._id}/complete`)
      .set("Authorization", `Bearer ${technicianOneToken}`)
      .send({ note: "Tech one duplicate" });

    expect(duplicateCompletion.status).toBe(200);
    expect(duplicateCompletion.body.message).toContain("Waiting for");

    const afterDuplicate = await NewConnectionRequest.findById(requestDoc._id).lean();
    expect(afterDuplicate.implementationCompletion.technicianCompletions).toHaveLength(1);

    const secondCompletion = await request(app)
      .patch(`/api/requests/request/${requestDoc._id}/complete`)
      .set("Authorization", `Bearer ${technicianTwoToken}`)
      .send({ note: "Tech two done" });

    expect(secondCompletion.status).toBe(200);

    const afterSecond = await NewConnectionRequest.findById(requestDoc._id).lean();
    expect(afterSecond.status).toBe("approved");
    expect(afterSecond.implementationCompletion.technicianCompletions).toHaveLength(2);
    expect(
      afterSecond.workflowLogs.some(
        (log) => log.action === "implementation_ready_for_final_branch_approval",
      ),
    ).toBe(true);
  });
});
