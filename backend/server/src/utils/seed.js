import { User } from "../models/User.js";
import { roles } from "./constants.js";

const seedAdminUser = {
  name: "System Admin",
  email: "admin@urbansight.local",
  password: "admin123",
  phone: "+251911111111",
  role: roles.ADMIN,
  branch: "Sikela Branch",
  firstLogin: false,
};

const seedDataUsers = [
  {
    ...seedAdminUser,
  },
];

async function createStaffUserIfMissing(staff) {
  const existingUser = await User.findOne({ email: staff.email });
  if (existingUser) {
    return;
  }

  await User.create(staff);
}

export async function seedDefaultStaffUsers() {
  for (const staff of seedDataUsers) {
    await createStaffUserIfMissing(staff);
  }
}
