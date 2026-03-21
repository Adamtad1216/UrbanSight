import { AuthExperience } from "@/components/auth/AuthExperience";

export default function StaffLoginPage() {
  return (
    <AuthExperience
      initialMode="login"
      allowRegister={false}
      showSocialLogin={false}
    />
  );
}
