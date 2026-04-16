import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Chrome, Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthInputField } from "@/components/auth/AuthInputField";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/api";
import { getDashboardPathByRole } from "@/lib/role-dashboard";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "register";
const etPhoneRegex = /^(?:\+2519\d{8}|09\d{8}|07\d{8})$/;
const phoneErrorMessage =
  "Phone number must be +2519XXXXXXXX, 09XXXXXXXX, or 07XXXXXXXX";
const normalizePhoneNumber = (value: string) =>
  value.replace(/\s+/g, "").trim();

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

const registerSchema = z
  .object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    email: z.string().email("Enter a valid email address"),
    phone: z
      .string()
      .transform(normalizePhoneNumber)
      .refine((value) => etPhoneRegex.test(value), phoneErrorMessage),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

interface AuthExperienceProps {
  initialMode: AuthMode;
  allowRegister?: boolean;
  registerSuccessPath?: string;
  showSocialLogin?: boolean;
}

export function AuthExperience({
  initialMode,
  allowRegister = true,
  registerSuccessPath,
  showSocialLogin = true,
}: AuthExperienceProps) {
  const reduceMotion = useReducedMotion();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [shake, setShake] = useState(false);
  const [successPulse, setSuccessPulse] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { login, portal, register: registerUser } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const registrationEnabled = allowRegister && portal !== "backoffice";

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: true },
    mode: "onChange",
  });

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
  });

  useEffect(() => {
    setMode(registrationEnabled ? initialMode : "login");
  }, [registrationEnabled, initialMode]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const hasOAuthError = params.get("oauthError");

    if (!hasOAuthError) {
      return;
    }

    toast({
      title: "Social login failed",
      description:
        "Unable to sign in with the selected provider. Please try again.",
      variant: "destructive",
    });
  }, [location.search, toast]);

  const switchMode = (nextMode: AuthMode) => {
    if (submitting) return;
    if (nextMode === "register" && !registrationEnabled) return;
    setMode(nextMode);
    navigate(nextMode === "login" ? "/login" : "/register", { replace: true });
  };

  const switchToOppositeMode = () => {
    if (!registrationEnabled) return;
    switchMode(mode === "login" ? "register" : "login");
  };

  const triggerErrorFeedback = (message: string) => {
    setShake(true);
    window.setTimeout(() => setShake(false), 400);
    toast({
      title: "Authentication failed",
      description: message,
      variant: "destructive",
    });
  };

  const triggerSuccessFeedback = (title: string, description: string) => {
    setSuccessPulse(true);
    window.setTimeout(() => setSuccessPulse(false), 500);
    toast({ title, description });
  };

  const startGoogleLogin = () => {
    window.location.assign(`${API_BASE_URL}/auth/google`);
  };

  const onLoginSubmit = async (values: LoginValues) => {
    try {
      setSubmitting(true);
      const authenticatedUser = await login({
        email: values.email,
        password: values.password,
      });
      triggerSuccessFeedback("Welcome back", "You are now signed in.");
      const redirectTo =
        portal === "citizen"
          ? "/dashboard"
          : getDashboardPathByRole(authenticatedUser.role);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      triggerErrorFeedback(
        error instanceof Error ? error.message : "Unable to sign in",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onRegisterSubmit = async (values: RegisterValues) => {
    try {
      setSubmitting(true);
      const registeredUser = await registerUser({
        name: values.name,
        email: values.email,
        phone: values.phone,
        password: values.password,
      });
      triggerSuccessFeedback(
        "Registration successful",
        "Your citizen account has been created.",
      );
      navigate(
        registerSuccessPath ??
          (portal === "citizen"
            ? "/dashboard"
            : getDashboardPathByRole(registeredUser.role)),
        { replace: true },
      );
    } catch (error) {
      triggerErrorFeedback(
        error instanceof Error ? error.message : "Unable to register",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0.01 : 0.45, ease: "easeOut" }}
        className="relative w-full max-w-xl"
      >
        <motion.div
          aria-hidden="true"
          animate={
            reduceMotion
              ? undefined
              : { backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }
          }
          transition={
            reduceMotion
              ? undefined
              : {
                  duration: 10,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                }
          }
          className="absolute -inset-px rounded-3xl bg-[linear-gradient(120deg,rgba(34,211,238,0.45),rgba(59,130,246,0.25),rgba(16,185,129,0.35))] bg-[length:250%_250%] blur-xl"
        />

        <motion.div
          animate={shake ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
          transition={{ duration: reduceMotion ? 0.01 : 0.35 }}
          className={cn(
            "relative rounded-3xl border border-white/15 bg-slate-900/70 p-6 shadow-2xl backdrop-blur-2xl sm:p-8",
            successPulse && "ring-2 ring-emerald-400/70",
          )}
        >
          <div className="mb-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src="/image.png"
                alt="UrbanSight logo"
                className="h-10 w-10 rounded-xl border border-white/20 object-cover"
              />
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                  {t("auth.title", "UrbanSight Access")}
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-white">
                  {mode === "login"
                    ? t("auth.signIn", "Sign in")
                    : t("auth.createAccount", "Create account")}
                </h2>
              </div>
            </div>
            <Sparkles className="h-5 w-5 text-cyan-300" />
          </div>

          <div
            className={cn(
              "relative mb-6 rounded-2xl border border-white/10 bg-white/5 p-1",
              registrationEnabled ? "grid grid-cols-2 gap-2" : "",
            )}
          >
            {registrationEnabled ? (
              <>
                <motion.div
                  layoutId="auth-mode-pill"
                  transition={{ duration: reduceMotion ? 0.01 : 0.2 }}
                  className={cn(
                    "absolute h-[calc(100%-8px)] w-[calc(50%-8px)] rounded-xl bg-cyan-500/20",
                    mode === "login" ? "left-1" : "left-[calc(50%+4px)]",
                  )}
                />
                <ModeButton
                  active={mode === "login"}
                  onClick={() => switchMode("login")}
                  disabled={submitting}
                >
                  {t("auth.login", "Login")}
                </ModeButton>
                <ModeButton
                  active={mode === "register"}
                  onClick={() => switchMode("register")}
                  disabled={submitting}
                >
                  {t("auth.register", "Register")}
                </ModeButton>
              </>
            ) : (
              <div className="rounded-xl bg-cyan-500/20 px-4 py-2 text-center text-sm font-medium text-cyan-200">
                {t("auth.staffLogin", "Staff Login")}
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {mode === "login" ? (
              <motion.form
                key="login-form"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: reduceMotion ? 0.01 : 0.24 }}
                className="space-y-4"
                onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                noValidate
              >
                <AuthInputField
                  id="login-email"
                  type="email"
                  label={t("auth.workEmail", "Work email")}
                  autoComplete="email"
                  error={loginForm.formState.errors.email?.message}
                  {...loginForm.register("email")}
                />

                <AuthInputField
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  label={t("auth.password", "Password")}
                  autoComplete="current-password"
                  error={loginForm.formState.errors.password?.message}
                  rightAdornment={
                    <PasswordToggleButton
                      shown={showPassword}
                      onToggle={() => setShowPassword((prev) => !prev)}
                    />
                  }
                  {...loginForm.register("password")}
                />

                <div className="flex items-center justify-between text-sm">
                  <label className="flex cursor-pointer items-center gap-2 text-slate-300">
                    <Checkbox
                      checked={Boolean(loginForm.watch("rememberMe"))}
                      onCheckedChange={(checked) =>
                        loginForm.setValue("rememberMe", Boolean(checked), {
                          shouldValidate: true,
                        })
                      }
                      aria-label={t("auth.rememberMe", "Remember me")}
                    />
                    {t("auth.rememberMe", "Remember me")}
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      toast({
                        title: "Password reset",
                        description:
                          "Password reset flow can be connected to your email provider.",
                      })
                    }
                    className="text-cyan-300 transition hover:text-cyan-200"
                  >
                    {t("auth.forgotPassword", "Forgot password?")}
                  </button>
                </div>

                <SubmitButton
                  disabled={!loginForm.formState.isValid || submitting}
                  loading={submitting}
                  reduceMotion={Boolean(reduceMotion)}
                >
                  {t("auth.signInButton", "Sign in to UrbanSight")}
                </SubmitButton>
              </motion.form>
            ) : (
              <motion.form
                key="register-form"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: reduceMotion ? 0.01 : 0.24 }}
                className="space-y-4"
                onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                noValidate
              >
                <AuthInputField
                  id="register-name"
                  label={t("auth.fullName", "Full name")}
                  autoComplete="name"
                  error={registerForm.formState.errors.name?.message}
                  {...registerForm.register("name")}
                />

                <AuthInputField
                  id="register-email"
                  type="email"
                  label={t("auth.email", "Email")}
                  autoComplete="email"
                  error={registerForm.formState.errors.email?.message}
                  {...registerForm.register("email")}
                />

                <AuthInputField
                  id="register-phone"
                  type="tel"
                  label={t("auth.phoneEthiopia", "Phone (Ethiopia)")}
                  placeholder="+251 94 741 4313"
                  autoComplete="tel"
                  error={registerForm.formState.errors.phone?.message}
                  {...registerForm.register("phone", {
                    setValueAs: (value: string) =>
                      normalizePhoneNumber(String(value ?? "")),
                  })}
                />

                <AuthInputField
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  label={t("auth.password", "Password")}
                  autoComplete="new-password"
                  error={registerForm.formState.errors.password?.message}
                  rightAdornment={
                    <PasswordToggleButton
                      shown={showPassword}
                      onToggle={() => setShowPassword((prev) => !prev)}
                    />
                  }
                  {...registerForm.register("password")}
                />

                <AuthInputField
                  id="register-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  label={t("auth.confirmPassword", "Confirm password")}
                  autoComplete="new-password"
                  error={registerForm.formState.errors.confirmPassword?.message}
                  rightAdornment={
                    <PasswordToggleButton
                      shown={showConfirmPassword}
                      onToggle={() => setShowConfirmPassword((prev) => !prev)}
                      shownLabel="Hide confirm password"
                      hiddenLabel="Show confirm password"
                    />
                  }
                  {...registerForm.register("confirmPassword")}
                />

                <SubmitButton
                  disabled={!registerForm.formState.isValid || submitting}
                  loading={submitting}
                  reduceMotion={Boolean(reduceMotion)}
                >
                  {t("auth.createCitizenAccount", "Create citizen account")}
                </SubmitButton>
              </motion.form>
            )}
          </AnimatePresence>

          {showSocialLogin ? (
            <>
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {t("auth.orContinueWith", "or continue with")}
                </span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <SocialButton
                  icon={Chrome}
                  label="Google"
                  onClick={startGoogleLogin}
                  reduceMotion={Boolean(reduceMotion)}
                />
              </div>
            </>
          ) : null}

          {registrationEnabled ? (
            <p className="mt-5 text-center text-sm text-slate-300">
              {mode === "login"
                ? "No account yet?"
                : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={switchToOppositeMode}
                disabled={submitting}
                className="font-medium text-cyan-300 transition hover:text-cyan-200"
              >
                {mode === "login" ? "Create one" : "Sign in"}
              </button>
            </p>
          ) : null}
        </motion.div>
      </motion.div>
    </AuthLayout>
  );
}

function PasswordToggleButton({
  shown,
  onToggle,
  shownLabel = "Hide password",
  hiddenLabel = "Show password",
}: {
  shown: boolean;
  onToggle: () => void;
  shownLabel?: string;
  hiddenLabel?: string;
}) {
  return (
    <button
      type="button"
      aria-label={shown ? shownLabel : hiddenLabel}
      className="text-slate-400 transition hover:text-cyan-300"
      onClick={onToggle}
    >
      {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}

function ModeButton({
  children,
  active,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative z-10 rounded-xl px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
        active ? "text-cyan-200" : "text-slate-300 hover:bg-white/5",
      )}
    >
      {children}
    </button>
  );
}

function SocialButton({
  icon: Icon,
  label,
  onClick,
  reduceMotion,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  reduceMotion: boolean;
}) {
  return (
    <motion.div
      whileHover={reduceMotion ? undefined : { y: -2 }}
      whileTap={reduceMotion ? undefined : { scale: 0.99 }}
    >
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full rounded-xl border-white/15 bg-white/5 text-slate-100 hover:bg-white/10"
        onClick={onClick}
      >
        <Icon className="h-4 w-4" />
        Continue with {label}
      </Button>
    </motion.div>
  );
}

function SubmitButton({
  children,
  disabled,
  loading,
  reduceMotion,
}: {
  children: React.ReactNode;
  disabled: boolean;
  loading: boolean;
  reduceMotion?: boolean;
}) {
  return (
    <motion.div
      whileHover={reduceMotion ? undefined : { scale: disabled ? 1 : 1.01 }}
      whileTap={reduceMotion ? undefined : { scale: disabled ? 1 : 0.99 }}
    >
      <Button
        type="submit"
        disabled={disabled}
        className={cn(
          "h-12 w-full rounded-xl border-0 bg-gradient-to-r from-cyan-500 to-blue-500 font-semibold text-white",
          "shadow-[0_10px_30px_rgba(6,182,212,0.25)] transition-all hover:from-cyan-400 hover:to-blue-400",
        )}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {children}
      </Button>
    </motion.div>
  );
}
