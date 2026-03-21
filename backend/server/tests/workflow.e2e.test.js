import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { jest } from "@jest/globals";
import app from "../src/app.js";
import { User } from "../src/models/User.js";
import { NewConnectionRequest } from "../src/models/NewConnectionRequest.js";
import { IssueReport } from "../src/models/IssueReport.js";
import { Notification } from "../src/models/Notification.js";
import cloudinary from "../src/config/cloudinary.js";
import { roles } from "../src/utils/constants.js";

jest.setTimeout(30000);

describe("Branch-based new connection workflow", () => {
  let mongoServer;

  const state = {
    users: {},
    tokens: {},
  };

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

    state.users.admin = await User.create({
      name: "Admin User",
      email: "admin@test.com",
      password: "password123",
      phone: "0911000000",
      role: roles.ADMIN,
      branch: "Sikela Branch",
      status: "active",
      firstLogin: false,
    });

    state.users.citizen = await User.create({
      name: "Citizen User",
      email: "citizen@test.com",
      password: "password123",
      phone: "0911000001",
      role: roles.CITIZEN,
      status: "active",
      firstLogin: false,
    });

    state.users.directorSikela = await User.create({
      name: "Director Sikela",
      email: "director.sikela@test.com",
      password: "password123",
      phone: "0911000002",
      role: roles.DIRECTOR,
      branch: "Sikela Branch",
      status: "active",
      firstLogin: false,
    });

    state.users.directorSecha = await User.create({
      name: "Director Secha",
      email: "director.secha@test.com",
      password: "password123",
      phone: "0911000003",
      role: roles.DIRECTOR,
      branch: "Secha Branch",
      status: "active",
      firstLogin: false,
    });

    state.users.surveyorSikela = await User.create({
      name: "Surveyor Sikela",
      email: "surveyor.sikela@test.com",
      password: "password123",
      phone: "0911000004",
      role: roles.SURVEYOR,
      branch: "Sikela Branch",
      status: "active",
      firstLogin: false,
    });

    state.users.surveyorSecha = await User.create({
      name: "Surveyor Secha",
      email: "surveyor.secha@test.com",
      password: "password123",
      phone: "0911000005",
      role: roles.SURVEYOR,
      branch: "Secha Branch",
      status: "active",
      firstLogin: false,
    });

    state.users.surveyorSikelaBackup = await User.create({
      name: "Surveyor Sikela Backup",
      email: "surveyor.sikela.backup@test.com",
      password: "password123",
      phone: "0911000007",
      role: roles.SURVEYOR,
      branch: "Sikela Branch",
      status: "active",
      firstLogin: false,
    });

    state.users.coordinatorSecha = await User.create({
      name: "Coordinator Secha",
      email: "coordinator.secha@test.com",
      password: "password123",
      phone: "0911000006",
      role: roles.COORDINATOR,
      branch: "Secha Branch",
      status: "active",
      firstLogin: false,
    });

    state.users.coordinatorSikela = await User.create({
      name: "Coordinator Sikela",
      email: "coordinator.sikela@test.com",
      password: "password123",
      phone: "0911000011",
      role: roles.COORDINATOR,
      branch: "Sikela Branch",
      status: "active",
      firstLogin: false,
    });

    state.users.technicianSikela = await User.create({
      name: "Technician Sikela",
      email: "technician.sikela@test.com",
      password: "password123",
      phone: "0911000012",
      role: roles.TECHNICIAN,
      branch: "Sikela Branch",
      status: "active",
      firstLogin: false,
    });

    state.users.financeSikela = await User.create({
      name: "Finance Sikela",
      email: "finance.sikela@test.com",
      password: "password123",
      phone: "0911000008",
      role: roles.FINANCE,
      branch: "Sikela Branch",
      status: "active",
      firstLogin: false,
    });

    const loginAs = async (email) => {
      const response = await request(app).post("/api/auth/login").send({
        email,
        password: "password123",
      });

      return response.body.token;
    };

    state.tokens.admin = await loginAs("admin@test.com");
    state.tokens.citizen = await loginAs("citizen@test.com");
    state.tokens.directorSikela = await loginAs("director.sikela@test.com");
    state.tokens.directorSecha = await loginAs("director.secha@test.com");
    state.tokens.surveyorSikela = await loginAs("surveyor.sikela@test.com");
    state.tokens.surveyorSecha = await loginAs("surveyor.secha@test.com");
    state.tokens.surveyorSikelaBackup = await loginAs(
      "surveyor.sikela.backup@test.com",
    );
    state.tokens.financeSikela = await loginAs("finance.sikela@test.com");
    state.tokens.coordinatorSecha = await loginAs("coordinator.secha@test.com");
    state.tokens.coordinatorSikela = await loginAs(
      "coordinator.sikela@test.com",
    );
    state.tokens.technicianSikela = await loginAs("technician.sikela@test.com");

    jest
      .spyOn(cloudinary.uploader, "upload_stream")
      .mockImplementation((_options, callback) => ({
        end: () => {
          callback(null, {
            secure_url: "https://cloudinary.test/receipt.pdf",
            public_id: "receipt-public-id",
            format: "pdf",
            bytes: 1024,
          });
        },
      }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function submitRequest(branch = "Sikela Branch") {
    const response = await request(app)
      .post("/api/requests/new-connection")
      .set("Authorization", `Bearer ${state.tokens.citizen}`)
      .send({
        customerName: "Citizen User",
        email: "citizen@test.com",
        tinNumber: "TIN-100",
        phoneNumber: "0911000001",
        numberOfFamily: 5,
        address: "Arba Minch",
        houseNumberZone: "HZ-1",
        readingZone: "RZ-1",
        meterSize: "20mm",
        customerGroup: "Domestic",
        type: "Private",
        serviceType: "New Water Connection",
        description: "Branch assignment test request",
        branch,
        location: { latitude: 6.032, longitude: 37.55 },
        housePlan: "https://cdn.example.com/plan.pdf",
        idCard: "https://cdn.example.com/id.pdf",
      });

    return response;
  }

  async function approveRequestByDirector(
    requestId,
    token = state.tokens.directorSikela,
  ) {
    return request(app)
      .patch(`/api/requests/request/${requestId}/approve`)
      .set("Authorization", `Bearer ${token}`)
      .send({ note: "Approve and assign surveyor" });
  }

  it("creates staff user with required branch", async () => {
    const response = await request(app)
      .post("/api/admin/create-staff")
      .set("Authorization", `Bearer ${state.tokens.admin}`)
      .send({
        name: "Finance Sikela",
        email: "finance.sikela.new@test.com",
        phone: "0911000010",
        role: roles.FINANCE,
        branch: "Sikela Branch",
        status: "active",
      });

    expect(response.status).toBe(201);
    expect(response.body.user.branch).toBe("Sikela Branch");
  });

  it("saves citizen request with selected branch", async () => {
    const response = await submitRequest("Sikela Branch");

    expect(response.status).toBe(201);
    expect(response.body.request.branch).toBe("Sikela Branch");

    const persisted = await NewConnectionRequest.findById(
      response.body.request._id,
    ).lean();
    expect(persisted.branch).toBe("Sikela Branch");
  });

  it("does not assign surveyor at director approval stage", async () => {
    const submitResponse = await submitRequest("Sikela Branch");
    const requestId = submitResponse.body.request._id;

    const approveResponse = await approveRequestByDirector(requestId);

    expect(approveResponse.status).toBe(200);
    expect(approveResponse.body.request.assignedSurveyor).toBeFalsy();
  });

  it("allows director to act on submitted request regardless of branch", async () => {
    const submitResponse = await submitRequest("Sikela Branch");
    const requestId = submitResponse.body.request._id;

    const approveResponse = await approveRequestByDirector(
      requestId,
      state.tokens.directorSecha,
    );

    expect(approveResponse.status).toBe(200);
    expect(approveResponse.body.request.status).toBe("under_review");
  });

  it("filters request list by staff branch", async () => {
    await submitRequest("Sikela Branch");
    const sechaRequest = await submitRequest("Secha Branch");
    await approveRequestByDirector(
      sechaRequest.body.request._id,
      state.tokens.directorSecha,
    );

    const response = await request(app)
      .get("/api/requests")
      .set("Authorization", `Bearer ${state.tokens.coordinatorSecha}`);

    expect(response.status).toBe(200);
    expect(response.body.requests.length).toBeGreaterThan(0);
    expect(
      response.body.requests.every((doc) => doc.branch === "Secha Branch"),
    ).toBe(true);
  });

  it("surveyor submits inspection, saves tools, calculates totals, updates status, and creates notification", async () => {
    const submitResponse = await submitRequest("Sikela Branch");
    const requestId = submitResponse.body.request._id;
    await approveRequestByDirector(requestId);

    const inspectionPayload = {
      notes: "Site inspection details with required materials",
      toolsRequired: [
        {
          code: "PVC-001",
          description: "PVC Pipe",
          source: "Warehouse",
          quantity: 10,
          measurement: "meters",
          stockPrice: 100,
          customerUnitPrice: 150,
        },
        {
          code: "VALVE-002",
          description: "Control Valve",
          source: "Warehouse",
          quantity: 2,
          measurement: "pieces",
          stockPrice: 250,
          customerUnitPrice: 300,
        },
      ],
    };

    const inspectionResponse = await request(app)
      .patch(`/api/requests/request/${requestId}/inspection`)
      .set("Authorization", `Bearer ${state.tokens.surveyorSikela}`)
      .send(inspectionPayload);

    expect(inspectionResponse.status).toBe(200);
    expect(inspectionResponse.body.request.status).toBe("waiting_payment");

    const persisted = await NewConnectionRequest.findById(requestId).lean();
    expect(persisted.toolsRequired).toHaveLength(2);
    expect(persisted.toolsRequired[0].totalPrice).toBe(1500);
    expect(persisted.toolsRequired[1].totalPrice).toBe(600);
    expect(persisted.totalEstimatedCost).toBe(2100);
    expect(String(persisted.inspection.surveyor)).toBe(
      String(state.users.surveyorSikela._id),
    );
    expect(persisted.inspection.notes).toBe(inspectionPayload.notes);

    const notification = await Notification.findOne({
      userId: state.users.citizen._id,
      requestId,
    }).lean();
    expect(notification).toBeTruthy();
    expect(notification.read).toBe(false);
    expect(notification.message).toContain("Inspection completed");
  });

  it("blocks unauthorized role from submitting inspection", async () => {
    const submitResponse = await submitRequest("Sikela Branch");
    const requestId = submitResponse.body.request._id;
    await approveRequestByDirector(requestId);

    const response = await request(app)
      .patch(`/api/requests/request/${requestId}/inspection`)
      .set("Authorization", `Bearer ${state.tokens.coordinatorSecha}`)
      .send({
        notes: "Unauthorized attempt",
        toolsRequired: [
          {
            code: "PVC-001",
            description: "PVC Pipe",
            source: "Warehouse",
            quantity: 1,
            measurement: "meters",
            stockPrice: 100,
            customerUnitPrice: 150,
          },
        ],
      });

    expect(response.status).toBe(403);
  });

  it("blocks surveyor who is not assigned to the request", async () => {
    const submitResponse = await submitRequest("Sikela Branch");
    const requestId = submitResponse.body.request._id;
    await approveRequestByDirector(requestId);

    const response = await request(app)
      .patch(`/api/requests/request/${requestId}/inspection`)
      .set("Authorization", `Bearer ${state.tokens.surveyorSikelaBackup}`)
      .send({
        notes: "Wrong surveyor attempt",
        toolsRequired: [
          {
            code: "PVC-001",
            description: "PVC Pipe",
            source: "Warehouse",
            quantity: 1,
            measurement: "meters",
            stockPrice: 100,
            customerUnitPrice: 150,
          },
        ],
      });

    expect(response.status).toBe(403);
    expect(response.body.message).toContain("assigned surveyor");
  });

  it("rejects invalid inspection payload", async () => {
    const submitResponse = await submitRequest("Sikela Branch");
    const requestId = submitResponse.body.request._id;
    await approveRequestByDirector(requestId);

    const response = await request(app)
      .patch(`/api/requests/request/${requestId}/inspection`)
      .set("Authorization", `Bearer ${state.tokens.surveyorSikela}`)
      .send({
        notes: "Invalid payload",
        toolsRequired: [
          {
            code: "",
            description: "",
            source: "Warehouse",
            quantity: 0,
            measurement: "meters",
            stockPrice: -10,
            customerUnitPrice: 0,
          },
        ],
      });

    expect(response.status).toBe(400);
  });

  it("citizen uploads receipt and submits payment for verification", async () => {
    const submitResponse = await submitRequest("Sikela Branch");
    const requestId = submitResponse.body.request._id;

    await approveRequestByDirector(requestId);

    await request(app)
      .patch(`/api/requests/request/${requestId}/inspection`)
      .set("Authorization", `Bearer ${state.tokens.surveyorSikela}`)
      .send({
        notes: "Inspection complete",
        toolsRequired: [
          {
            code: "PVC-001",
            description: "PVC Pipe",
            source: "Warehouse",
            quantity: 2,
            measurement: "meters",
            stockPrice: 100,
            customerUnitPrice: 150,
          },
        ],
      });

    const paymentResponse = await request(app)
      .post(`/api/requests/request/${requestId}/payment`)
      .set("Authorization", `Bearer ${state.tokens.citizen}`)
      .field("transactionId", "TXN-100")
      .field("paymentMethod", "Telebirr")
      .attach("receipt", Buffer.from("sample pdf"), {
        filename: "receipt.pdf",
        contentType: "application/pdf",
      });

    expect(paymentResponse.status).toBe(200);
    expect(paymentResponse.body.request.status).toBe("payment_submitted");
    expect(cloudinary.uploader.upload_stream).toHaveBeenCalled();

    const persisted = await NewConnectionRequest.findById(requestId).lean();
    expect(persisted.payment.transactionId).toBe("TXN-100");
    expect(persisted.payment.paymentMethod).toBe("Telebirr");
    expect(persisted.payment.receiptUrl).toContain("cloudinary.test");
    expect(persisted.payment.status).toBe("pending");
  });

  it("finance verifies submitted payment", async () => {
    const submitResponse = await submitRequest("Sikela Branch");
    const requestId = submitResponse.body.request._id;

    await approveRequestByDirector(requestId);

    await request(app)
      .patch(`/api/requests/request/${requestId}/inspection`)
      .set("Authorization", `Bearer ${state.tokens.surveyorSikela}`)
      .send({
        notes: "Inspection complete",
        toolsRequired: [
          {
            code: "PVC-001",
            description: "PVC Pipe",
            source: "Warehouse",
            quantity: 2,
            measurement: "meters",
            stockPrice: 100,
            customerUnitPrice: 150,
          },
        ],
      });

    await request(app)
      .post(`/api/requests/request/${requestId}/payment`)
      .set("Authorization", `Bearer ${state.tokens.citizen}`)
      .field("transactionId", "TXN-101")
      .field("paymentMethod", "Bank")
      .attach("receipt", Buffer.from("sample pdf"), {
        filename: "receipt.pdf",
        contentType: "application/pdf",
      });

    const verifyResponse = await request(app)
      .patch(`/api/requests/request/${requestId}/payment/verify`)
      .set("Authorization", `Bearer ${state.tokens.financeSikela}`)
      .send({ note: "Payment verified" });

    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.request.status).toBe("under_review");

    const persisted = await NewConnectionRequest.findById(requestId).lean();
    expect(persisted.payment.status).toBe("verified");
    expect(String(persisted.payment.verifiedBy)).toBe(
      String(state.users.financeSikela._id),
    );
    expect(String(persisted.assignedFinanceOfficer)).toBe(
      String(state.users.financeSikela._id),
    );
    expect(String(persisted.assignedBranchOfficer)).toBe(
      String(state.users.directorSikela._id),
    );
  });

  it("rejects payment submission when receipt is missing", async () => {
    const submitResponse = await submitRequest("Sikela Branch");
    const requestId = submitResponse.body.request._id;

    await approveRequestByDirector(requestId);

    await request(app)
      .patch(`/api/requests/request/${requestId}/inspection`)
      .set("Authorization", `Bearer ${state.tokens.surveyorSikela}`)
      .send({
        notes: "Inspection complete",
        toolsRequired: [
          {
            code: "PVC-001",
            description: "PVC Pipe",
            source: "Warehouse",
            quantity: 2,
            measurement: "meters",
            stockPrice: 100,
            customerUnitPrice: 150,
          },
        ],
      });

    const response = await request(app)
      .post(`/api/requests/request/${requestId}/payment`)
      .set("Authorization", `Bearer ${state.tokens.citizen}`)
      .field("transactionId", "TXN-102")
      .field("paymentMethod", "Telebirr");

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("Receipt");
  });

  it("blocks unauthorized user from verifying payment", async () => {
    const submitResponse = await submitRequest("Sikela Branch");
    const requestId = submitResponse.body.request._id;

    await approveRequestByDirector(requestId);

    await request(app)
      .patch(`/api/requests/request/${requestId}/inspection`)
      .set("Authorization", `Bearer ${state.tokens.surveyorSikela}`)
      .send({
        notes: "Inspection complete",
        toolsRequired: [
          {
            code: "PVC-001",
            description: "PVC Pipe",
            source: "Warehouse",
            quantity: 2,
            measurement: "meters",
            stockPrice: 100,
            customerUnitPrice: 150,
          },
        ],
      });

    await request(app)
      .post(`/api/requests/request/${requestId}/payment`)
      .set("Authorization", `Bearer ${state.tokens.citizen}`)
      .field("transactionId", "TXN-103")
      .field("paymentMethod", "Bank")
      .attach("receipt", Buffer.from("sample pdf"), {
        filename: "receipt.pdf",
        contentType: "application/pdf",
      });

    const response = await request(app)
      .patch(`/api/requests/request/${requestId}/payment/verify`)
      .set("Authorization", `Bearer ${state.tokens.surveyorSikela}`)
      .send({ note: "Attempt" });

    expect(response.status).toBe(403);
  });

  it("blocks payment submission from invalid status", async () => {
    const submitResponse = await submitRequest("Sikela Branch");
    const requestId = submitResponse.body.request._id;

    const response = await request(app)
      .post(`/api/requests/request/${requestId}/payment`)
      .set("Authorization", `Bearer ${state.tokens.citizen}`)
      .field("transactionId", "TXN-104")
      .field("paymentMethod", "Bank")
      .attach("receipt", Buffer.from("sample pdf"), {
        filename: "receipt.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("waiting for payment");
  });

  it("issue workflow supports receipt upload and finance verification", async () => {
    const issueResponse = await request(app)
      .post("/api/issues")
      .set("Authorization", `Bearer ${state.tokens.citizen}`)
      .send({
        title: "Pipe leakage",
        description: "Leakage near meter box",
        category: "leakage",
        location: {
          latitude: 6.032,
          longitude: 37.55,
          address: "Sikela",
        },
      });

    expect(issueResponse.status).toBe(201);
    const issueId = issueResponse.body.issue._id;

    const approveResponse = await request(app)
      .patch(`/api/issues/${issueId}/approve`)
      .set("Authorization", `Bearer ${state.tokens.coordinatorSikela}`)
      .send({ note: "Approve issue" });

    expect(approveResponse.status).toBe(200);

    const assignedIssue = await IssueReport.findById(issueId).lean();
    expect(String(assignedIssue.assignedTechnician)).toBe(
      String(state.users.technicianSikela._id),
    );

    const updateResponse = await request(app)
      .patch(`/api/issues/${issueId}/technician-update`)
      .set("Authorization", `Bearer ${state.tokens.technicianSikela}`)
      .send({
        toolsRequired: [
          {
            code: "JOINT-001",
            description: "Pipe Joint",
            source: "Warehouse",
            quantity: 2,
            unitPrice: 120,
          },
        ],
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.issue.status).toBe("waiting_payment");

    const payResponse = await request(app)
      .post(`/api/issues/${issueId}/payment`)
      .set("Authorization", `Bearer ${state.tokens.citizen}`)
      .field("transactionId", "ISS-100")
      .field("paymentMethod", "Bank")
      .attach("receipt", Buffer.from("sample pdf"), {
        filename: "receipt.pdf",
        contentType: "application/pdf",
      });

    expect(payResponse.status).toBe(200);
    expect(payResponse.body.issue.status).toBe("payment_submitted");

    const verifyResponse = await request(app)
      .patch(`/api/issues/${issueId}/payment/verify`)
      .set("Authorization", `Bearer ${state.tokens.financeSikela}`)
      .send({ note: "Issue payment verified" });

    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.issue.status).toBe("payment_verified");
  });
});
