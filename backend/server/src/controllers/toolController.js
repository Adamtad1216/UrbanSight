import { Tool } from "../models/Tool.js";
import { sendError, sendOk } from "../utils/response.js";
import * as XLSX from "xlsx";

const EXPECTED_TOOL_IMPORT_HEADERS = [
  "Code",
  "Description",
  "Source",
  "Qty",
  "Measurement",
  "Stock Price",
  "Customer Price",
];

const NORMALIZED_EXPECTED_HEADERS = EXPECTED_TOOL_IMPORT_HEADERS.map((header) =>
  normalizeHeader(header),
);

const ALLOWED_TOOL_SOURCES = new Set(["Warehouse", "Store", "Local", "Service"]);

function parsePrice(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/[^0-9.-]/g, "").trim();
    if (!normalized) {
      return Number.NaN;
    }
    return Number(normalized);
  }

  return Number.NaN;
}

function toText(value) {
  return String(value ?? "").trim();
}

function normalizeHeader(value) {
  return toText(value)
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function isEmptyRow(values) {
  return values.every((value) => toText(value) === "");
}

export async function createTool(req, res) {
  try {
    const existing = await Tool.findOne({ code: req.body.code.toUpperCase() }).lean();
    if (existing) {
      return sendError(res, 400, "Tool code already exists");
    }

    const tool = await Tool.create({
      ...req.body,
      code: req.body.code.toUpperCase(),
    });

    return sendOk(res, { tool }, 201);
  } catch (error) {
    return sendError(res, 500, error?.message || "Failed to create tool");
  }
}

export async function listTools(req, res) {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 100);
    const skip = (page - 1) * limit;
    const query = String(req.query.q || "").trim();
    const includeInactiveRequested =
      String(req.query.includeInactive || "false") === "true";
    const includeInactive = includeInactiveRequested && req.user?.role === "admin";

    const filter = {};

    if (!includeInactive) {
      filter.isActive = true;
    }

    if (query) {
      filter.$or = [
        { code: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { source: { $regex: query, $options: "i" } },
        { measurement: { $regex: query, $options: "i" } },
      ];
    }

    const [tools, total] = await Promise.all([
      Tool.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Tool.countDocuments(filter),
    ]);

    return sendOk(res, {
      tools,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    return sendError(res, 500, error?.message || "Failed to list tools");
  }
}

export async function updateTool(req, res) {
  try {
    const tool = await Tool.findById(req.params.id);
    if (!tool) {
      return sendError(res, 404, "Tool not found");
    }

    if (req.body.code) {
      const normalizedCode = req.body.code.toUpperCase();
      const duplicate = await Tool.findOne({
        _id: { $ne: tool._id },
        code: normalizedCode,
      }).lean();

      if (duplicate) {
        return sendError(res, 400, "Tool code already exists");
      }

      tool.code = normalizedCode;
    }

    if (req.body.description !== undefined) tool.description = req.body.description;
    if (req.body.source !== undefined) tool.source = req.body.source;
    if (req.body.measurement !== undefined) tool.measurement = req.body.measurement;
    if (req.body.stockPrice !== undefined) tool.stockPrice = req.body.stockPrice;
    if (req.body.customerPrice !== undefined) tool.customerPrice = req.body.customerPrice;
    if (req.body.isActive !== undefined) tool.isActive = req.body.isActive;

    await tool.save();

    return sendOk(res, { tool });
  } catch (error) {
    return sendError(res, 500, error?.message || "Failed to update tool");
  }
}

export async function deleteTool(req, res) {
  try {
    const tool = await Tool.findById(req.params.id);
    if (!tool) {
      return sendError(res, 404, "Tool not found");
    }

    tool.isActive = false;
    await tool.save();

    return sendOk(res, { tool });
  } catch (error) {
    return sendError(res, 500, error?.message || "Failed to delete tool");
  }
}

export async function importTools(req, res) {
  if (!req.file) {
    return sendError(res, 400, "Import file is required");
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames?.[0];

    if (!firstSheetName) {
      return sendError(res, 400, "Import file does not contain a worksheet");
    }

    const sheet = workbook.Sheets[firstSheetName];
    const grid = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      blankrows: false,
      raw: false,
    });

    if (!Array.isArray(grid) || grid.length === 0) {
      return sendError(res, 400, "Import file is empty");
    }

    const headerRow = Array.isArray(grid[0]) ? grid[0] : [];
    const normalizedHeaders = headerRow.map((header) => normalizeHeader(header));
    const requiredHeaders = normalizedHeaders.slice(0, NORMALIZED_EXPECTED_HEADERS.length);
    const trailingHeaders = normalizedHeaders.slice(NORMALIZED_EXPECTED_HEADERS.length);

    const hasValidRequiredHeaders = NORMALIZED_EXPECTED_HEADERS.every(
      (expected, index) => requiredHeaders[index] === expected,
    );

    const hasUnexpectedExtraHeaders = trailingHeaders.some((header) => header !== "");

    if (!hasValidRequiredHeaders || hasUnexpectedExtraHeaders) {
      return sendError(
        res,
        400,
        `Invalid import headers. Expected: ${EXPECTED_TOOL_IMPORT_HEADERS.join(", ")}`,
      );
    }

    let successCount = 0;
    const errors = [];

    for (let rowIndex = 1; rowIndex < grid.length; rowIndex += 1) {
      const rowValues = Array.isArray(grid[rowIndex]) ? grid[rowIndex] : [];
      const excelRowNumber = rowIndex + 1;

      if (isEmptyRow(rowValues)) {
        continue;
      }

      const code = toText(rowValues[0]).toUpperCase();
      const description = toText(rowValues[1]);
      const source = toText(rowValues[2]);
      const measurement = toText(rowValues[4]);
      const stockPrice = parsePrice(rowValues[5]);
      const customerPrice = parsePrice(rowValues[6]);

      if (!code || !description || !source || !measurement) {
        errors.push({
          row: excelRowNumber,
          message: "Code, Description, Source, and Measurement are required",
        });
        continue;
      }

      if (!ALLOWED_TOOL_SOURCES.has(source)) {
        errors.push({
          row: excelRowNumber,
          message: "Source must be one of: Warehouse, Store, Local, Service",
        });
        continue;
      }

      if (!Number.isFinite(stockPrice) || !Number.isFinite(customerPrice)) {
        errors.push({
          row: excelRowNumber,
          message: "Stock Price and Customer Price must be valid numbers",
        });
        continue;
      }

      try {
        await Tool.findOneAndUpdate(
          { code },
          {
            $set: {
              code,
              description,
              source,
              measurement,
              stockPrice,
              customerPrice,
              isActive: true,
            },
          },
          {
            upsert: true,
            returnDocument: "after",
            runValidators: true,
            setDefaultsOnInsert: true,
          },
        );
        successCount += 1;
      } catch (error) {
        errors.push({
          row: excelRowNumber,
          message: error?.message || "Failed to import row",
        });
      }
    }

    return sendOk(res, {
      successCount,
      failedCount: errors.length,
      errors,
    });
  } catch (error) {
    return sendError(res, 400, error?.message || "Failed to parse import file");
  }
}
