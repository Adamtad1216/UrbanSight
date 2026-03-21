import { describe, expect, it } from "vitest";
import {
  getDashboardPathByRole,
  roleDashboardPath,
} from "@/lib/role-dashboard";

describe("role dashboard path mapping", () => {
  it("returns expected dashboard paths for all roles", () => {
    expect(roleDashboardPath.citizen).toBe("/citizen/dashboard");
    expect(roleDashboardPath.director).toBe("/director/dashboard");
    expect(roleDashboardPath.coordinator).toBe("/coordinator/dashboard");
    expect(roleDashboardPath.surveyor).toBe("/surveyor/dashboard");
    expect(roleDashboardPath.technician).toBe("/technician/dashboard");
    expect(roleDashboardPath.meter_reader).toBe("/meter-reader/dashboard");
    expect(roleDashboardPath.finance).toBe("/finance/dashboard");
    expect(roleDashboardPath.admin).toBe("/admin/dashboard");
  });

  it("falls back to root for empty role", () => {
    expect(getDashboardPathByRole(null)).toBe("/");
    expect(getDashboardPathByRole(undefined)).toBe("/");
  });
});
