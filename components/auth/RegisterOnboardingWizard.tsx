"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Heart,
  Loader2,
  Sparkles,
} from "lucide-react";
import ImageUpload from "@/components/common/ImageUpload";
import { NAKSHATRA_OPTIONS, RASI_OPTIONS } from "@/lib/constants/astrology";
import { MOTHER_TONGUE_OPTIONS } from "@/lib/constants/languages";
import { MUSLIM_SECTS, MUSLIM_COMMUNITIES } from "@/lib/constants/religion";
import { profileSchema, preferenceSchema } from "@/lib/validations/profile";
import { registerSchema } from "@/lib/validations/auth";
import {
  formatOtpRemainingTime,
  getOtpRemainingSeconds,
} from "@/lib/utils/otp-timer";
import { MARITAL_STATUS_LABELS } from "@/lib/utils/helpers";

const genderOptions = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
];

const maritalStatusOptions = Object.entries(MARITAL_STATUS_LABELS).map(
  ([value, label]) => ({
    value,
    label,
  })
);

const religionOptions = [
  "Hindu",
  "Muslim",
  "Christian",
  "Sikh",
  "Jain",
  "Buddhist",
  "Parsi",
  "Other",
];

const dietOptions = ["Vegetarian", "Non-Vegetarian", "Vegan", "Eggetarian"];
const smokingOptions = ["Never", "Occasionally", "Regularly"];
const drinkingOptions = ["Never", "Occasionally", "Regularly"];

const onboardingSteps = [
  {
    title: "Personal Details",
    description: "Tell us who you are and how you want your profile to appear.",
  },
  {
    title: "Education & Career",
    description: "Share your academic background and current work details.",
  },
  {
    title: "Cultural Background",
    description: "Add the community and language details that matter to you.",
  },
  {
    title: "Your Horoscope",
    description: "Fill in your horoscope details if you want them shown.",
  },
  {
    title: "Lifestyle",
    description: "Let others know about your day-to-day habits and lifestyle.",
  },
  {
    title: "Add Profile Photo",
    description: "Upload a profile photo so your account feels complete.",
  },
  {
    title: "Partner Preference",
    description: "Set the type of partner you would like to discover first.",
  },
] as const;

const OTP_STEP_INDEX = onboardingSteps.length;

type PendingRegistrationState = {
  email: string;
  password: string;
  verificationCodeExpiresAt: string;
};

type WizardFormValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  gender: "" | "MALE" | "FEMALE" | "OTHER";
  dateOfBirth: string;
  height: string;
  maritalStatus:
    | ""
    | "NEVER_MARRIED"
    | "DIVORCED"
    | "WIDOWED"
    | "AWAITING_DIVORCE";
  location: string;
  bio: string;
  education: string;
  profession: string;
  income: string;
  religion: string;
  caste: string;
  subCaste: string;
  language: string;
  star: string;
  rasi: string;
  diet: string;
  smoking: string;
  drinking: string;
  profileImage: string;
  horoscopeImage: string;
  prefAgeMin: string;
  prefAgeMax: string;
  prefHeightMin: string;
  prefHeightMax: string;
  prefReligion: string;
  prefCaste: string;
  prefEducation: string;
  prefProfession: string;
  prefLocation: string;
  prefMaritalStatus: string;
  prefLanguage: string;
};

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function optionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const numberValue = Number(trimmed);
  return Number.isNaN(numberValue) ? null : numberValue;
}

function getStepForProfileField(field: string) {
  if (
    [
      "fullName",
      "gender",
      "dateOfBirth",
      "height",
      "maritalStatus",
      "location",
      "bio",
    ].includes(field)
  ) {
    return 0;
  }

  if (["education", "profession", "income"].includes(field)) {
    return 1;
  }

  if (["religion", "caste", "subCaste", "language"].includes(field)) {
    return 2;
  }

  if (["star", "rasi", "horoscopeImage"].includes(field)) {
    return 3;
  }

  if (["diet", "smoking", "drinking", "exercise"].includes(field)) {
    return 4;
  }

  if (["profileImage"].includes(field)) {
    return 5;
  }

  return 6;
}

export default function RegisterOnboardingWizard() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [pendingRegistration, setPendingRegistration] =
    useState<PendingRegistrationState | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpRemainingSeconds, setOtpRemainingSeconds] = useState(0);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const isOtpExpired = Boolean(pendingRegistration) && otpRemainingSeconds <= 0;

  const {
    register,
    handleSubmit,
    control,
    trigger,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<WizardFormValues>({
    defaultValues: {
      gender: "",
      maritalStatus: "",
      religion: "",
      language: "",
      star: "",
      rasi: "",
      diet: "",
      smoking: "",
      drinking: "",
      profileImage: "",
      horoscopeImage: "",
      prefReligion: "",
      prefCaste: "",
      prefEducation: "",
      prefProfession: "",
      prefLocation: "",
      prefMaritalStatus: "",
      prefLanguage: "",
    },
    mode: "onTouched",
  });

  const religionValue = useWatch({ control, name: "religion" });
  const isAccountStep = currentStep === -1;
  const isOtpStep = currentStep === OTP_STEP_INDEX;
  const stepMeta = useMemo(
    () => (isAccountStep || isOtpStep ? null : onboardingSteps[currentStep]),
    [currentStep, isAccountStep, isOtpStep]
  );

  useEffect(() => {
    if (!pendingRegistration) {
      setOtpRemainingSeconds(0);
      return;
    }

    const updateRemainingSeconds = () => {
      setOtpRemainingSeconds(
        getOtpRemainingSeconds(pendingRegistration.verificationCodeExpiresAt)
      );
    };

    updateRemainingSeconds();
    const intervalId = window.setInterval(updateRemainingSeconds, 1000);

    return () => window.clearInterval(intervalId);
  }, [pendingRegistration]);

  const inputClass =
    "w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all";
  const selectClass = inputClass;
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";
  const errorClass = "text-rose-500 text-xs mt-1";

  const handleGoogle = async () => {
    setIsGoogleLoading(true);
    await signIn("google", { callbackUrl: "/dashboard" });
  };

  const handleAccountNext = async () => {
    const isValid = await trigger([
      "name",
      "email",
      "password",
      "confirmPassword",
    ]);

    if (!isValid) return;

    const values = getValues();
    const accountResult = registerSchema.safeParse({
      name: values.name,
      email: values.email,
      password: values.password,
      confirmPassword: values.confirmPassword,
    });

    if (!accountResult.success) {
      toast.error(accountResult.error.issues[0]?.message ?? "Please check your details.");
      return;
    }

    if (!getValues("fullName").trim()) {
      setValue("fullName", values.name.trim(), { shouldValidate: false });
    }

    setCurrentStep(0);
  };

  const handleStepNext = async () => {
    if (currentStep === 0) {
      const isValid = await trigger([
        "fullName",
        "gender",
        "dateOfBirth",
        "maritalStatus",
      ]);

      if (!isValid) return;
    }

    setCurrentStep((step) => Math.min(step + 1, onboardingSteps.length - 1));
  };

  const handleStepBack = () => {
    if (isOtpStep) {
      setCurrentStep(onboardingSteps.length - 1);
      return;
    }

    setCurrentStep((step) => step - 1);
  };

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isAccountStep) {
      await handleAccountNext();
      return;
    }

    if (isOtpStep) {
      await handleVerifyOtp();
      return;
    }

    if (currentStep < onboardingSteps.length - 1) {
      await handleStepNext();
      return;
    }

    await handleSubmit(onSubmit)(event);
  };

  const handleVerifyOtp = async () => {
    if (!pendingRegistration) {
      toast.error("Please submit the registration form again.");
      setCurrentStep(-1);
      return;
    }

    const code = otpCode.trim();
    if (!/^\d{6}$/.test(code)) {
      toast.error("Enter the 6-digit OTP sent to your email.");
      return;
    }

    if (
      getOtpRemainingSeconds(pendingRegistration.verificationCodeExpiresAt) <= 0
    ) {
      toast.error("This OTP has expired. Please request a new OTP.");
      return;
    }

    setIsVerifyingOtp(true);

    try {
      const res = await fetch("/api/auth/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "OTP verification failed");
        return;
      }

      toast.success("Email verified! Signing you in...");

      await signIn("credentials", {
        email: pendingRegistration.email,
        password: pendingRegistration.password,
        redirect: false,
      });

      router.push("/dashboard");
      router.refresh();
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingRegistration) {
      toast.error("Please submit the registration form again.");
      setCurrentStep(-1);
      return;
    }

    if (getOtpRemainingSeconds(pendingRegistration.verificationCodeExpiresAt) > 0) {
      toast.error("You can request a new OTP after the current OTP expires.");
      return;
    }

    setIsResendingOtp(true);

    try {
      const res = await fetch("/api/auth/register/resend", {
        method: "POST",
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Unable to resend OTP");
        return;
      }

      const verificationCodeExpiresAt =
        json.verificationCodeExpiresAt ??
        new Date(Date.now() + 2 * 60 * 1000).toISOString();

      setOtpCode("");
      setOtpRemainingSeconds(getOtpRemainingSeconds(verificationCodeExpiresAt));
      setPendingRegistration((current) =>
        current
          ? {
              ...current,
              verificationCodeExpiresAt,
            }
          : current
      );
      toast.success(json.message ?? "A new OTP has been sent.");
    } finally {
      setIsResendingOtp(false);
    }
  };

  const onSubmit = async (values: WizardFormValues) => {
    const accountResult = registerSchema.safeParse({
      name: values.name,
      email: values.email,
      password: values.password,
      confirmPassword: values.confirmPassword,
    });

    if (!accountResult.success) {
      toast.error(accountResult.error.issues[0]?.message ?? "Please review your account details.");
      setCurrentStep(-1);
      return;
    }

    const profilePayload = {
      fullName: values.fullName.trim() || values.name.trim(),
      gender: values.gender,
      dateOfBirth: values.dateOfBirth,
      height: optionalNumber(values.height),
      maritalStatus: values.maritalStatus,
      education: optionalText(values.education),
      profession: optionalText(values.profession),
      income: optionalText(values.income),
      location: optionalText(values.location),
      country: "India",
      bio: optionalText(values.bio),
      religion: optionalText(values.religion),
      caste: optionalText(values.caste),
      subCaste: optionalText(values.subCaste),
      language: optionalText(values.language),
      star: optionalText(values.star),
      rasi: optionalText(values.rasi),
      diet: optionalText(values.diet),
      smoking: optionalText(values.smoking),
      drinking: optionalText(values.drinking),
      profileImage: optionalText(values.profileImage),
      horoscopeImage: optionalText(values.horoscopeImage),
    };

    const preferencePayload = {
      ageMin: optionalNumber(values.prefAgeMin),
      ageMax: optionalNumber(values.prefAgeMax),
      heightMin: optionalNumber(values.prefHeightMin),
      heightMax: optionalNumber(values.prefHeightMax),
      religion: optionalText(values.prefReligion),
      caste: optionalText(values.prefCaste),
      education: optionalText(values.prefEducation),
      profession: optionalText(values.prefProfession),
      location: optionalText(values.prefLocation),
      maritalStatus: optionalText(values.prefMaritalStatus),
      language: optionalText(values.prefLanguage),
    };

    const profileResult = profileSchema.safeParse(profilePayload);
    if (!profileResult.success) {
      const issue = profileResult.error.issues[0];
      toast.error(issue?.message ?? "Please review your profile details.");
      setCurrentStep(getStepForProfileField(String(issue?.path?.[0] ?? "")));
      return;
    }

    const preferenceResult = preferenceSchema.safeParse(preferencePayload);
    if (!preferenceResult.success) {
      toast.error(
        preferenceResult.error.issues[0]?.message ??
          "Please review your partner preference details."
      );
      setCurrentStep(6);
      return;
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...accountResult.data,
        profile: profileResult.data,
        preference: preferenceResult.data,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      toast.error(json.error ?? "Registration failed");
      return;
    }

    const verificationCodeExpiresAt =
      json.verificationCodeExpiresAt ??
      new Date(Date.now() + 2 * 60 * 1000).toISOString();

    setOtpRemainingSeconds(getOtpRemainingSeconds(verificationCodeExpiresAt));
    setPendingRegistration({
      email: json.email ?? values.email,
      password: values.password,
      verificationCodeExpiresAt,
    });
    setOtpCode("");
    setCurrentStep(OTP_STEP_INDEX);
    toast.success(json.message ?? "Verification OTP sent to your email.");
  };

  return (
    <div className="w-full max-w-5xl">
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="w-11 h-11 bg-gradient-to-br from-rose-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg">
            <Heart className="w-6 h-6 text-white fill-white" />
          </div>
          <span className="font-display text-2xl font-bold">
            <span className="text-rose-600">Vivah</span>
            <span className="text-gray-800"> Bandhan</span>
          </span>
        </Link>
        <h1 className="text-3xl font-display font-bold text-gray-900 mt-5 mb-1">
          {isAccountStep
            ? "Create your account"
            : isOtpStep
              ? "Verify your email"
              : stepMeta?.title}
        </h1>
        <p className="text-gray-500 text-sm max-w-2xl mx-auto">
          {isAccountStep
            ? "Register first, then complete your 7-step profile onboarding."
            : isOtpStep
              ? "Enter the OTP sent to your email to create your account."
            : stepMeta?.description}
        </p>
      </div>

      {!isAccountStep && !isOtpStep ? (
        <div className="mb-6 rounded-3xl border border-rose-100 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-500">
                Step {currentStep + 1} of {onboardingSteps.length}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                  <Sparkles className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="font-display text-lg font-bold text-gray-900">
                    {stepMeta?.title}
                  </p>
                  <p className="text-sm text-gray-500">{stepMeta?.description}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {onboardingSteps.map((step, index) => (
                <div key={step.title} className="flex flex-col items-center gap-1">
                  <div
                    className={`h-2.5 w-12 rounded-full transition-colors ${
                      index <= currentStep ? "bg-rose-500" : "bg-rose-100"
                    }`}
                  />
                  <span className="text-[10px] font-medium text-gray-400 hidden sm:block">
                    {index + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="bg-white rounded-3xl shadow-xl p-8 sm:p-10">
        {isAccountStep ? (
          <>
            <button
              onClick={handleGoogle}
              disabled={isGoogleLoading}
              className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 rounded-xl py-3 px-4 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all mb-6 disabled:opacity-60"
            >
              {isGoogleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              Continue with Google
            </button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-gray-400 font-medium">
                  OR REGISTER WITH EMAIL
                </span>
              </div>
            </div>
          </>
        ) : null}

        <form onSubmit={handleFormSubmit} className="space-y-6">
          {isOtpStep ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
                <p className="text-sm font-semibold text-gray-900">
                  Check your email
                </p>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  We sent a 6-digit OTP to{" "}
                  <span className="font-semibold text-gray-900">
                    {pendingRegistration?.email}
                  </span>
                  .
                </p>
                <p
                  className={`mt-3 text-sm font-semibold ${
                    isOtpExpired ? "text-rose-600" : "text-gray-700"
                  }`}
                >
                  {isOtpExpired
                    ? "This OTP has expired. Please request a new OTP."
                    : `OTP expires in ${formatOtpRemainingTime(
                        otpRemainingSeconds
                      )}`}
                </p>
              </div>

              <div>
                <label className={labelClass} htmlFor="onb-otp">
                  Email OTP
                </label>
                <input
                  id="onb-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otpCode}
                  onChange={(event) =>
                    setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className={`${inputClass} tracking-[0.3em]`}
                  placeholder="000000"
                />
                {isOtpExpired ? (
                  <p className={errorClass}>This OTP is no longer valid.</p>
                ) : null}
              </div>
            </div>
          ) : null}

          {isAccountStep ? (
            <div className="grid gap-5">
              <div>
                <label className={labelClass} htmlFor="reg-name">
                  Full Name
                </label>
                <input
                  id="reg-name"
                  type="text"
                  autoComplete="name"
                  {...register("name", {
                    required: "Name must be at least 2 characters",
                    minLength: {
                      value: 2,
                      message: "Name must be at least 2 characters",
                    },
                    maxLength: {
                      value: 100,
                      message: "Name must be at most 100 characters",
                    },
                  })}
                  className={inputClass}
                  placeholder="Arjun Sharma"
                />
                {errors.name ? <p className={errorClass}>{errors.name.message}</p> : null}
              </div>

              <div>
                <label className={labelClass} htmlFor="reg-email">
                  Email Address
                </label>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  {...register("email", {
                    required: "Please enter a valid email address",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Please enter a valid email address",
                    },
                  })}
                  className={inputClass}
                  placeholder="you@example.com"
                />
                {errors.email ? <p className={errorClass}>{errors.email.message}</p> : null}
              </div>

              <div>
                <label className={labelClass} htmlFor="reg-password">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    {...register("password", {
                      required: "Password must be at least 8 characters",
                      minLength: {
                        value: 8,
                        message: "Password must be at least 8 characters",
                      },
                      validate: (value) =>
                        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value) ||
                        "Password must contain uppercase, lowercase, and a number",
                    })}
                    className={`${inputClass} pr-11`}
                    placeholder="Min. 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.password ? (
                  <p className={errorClass}>{errors.password.message}</p>
                ) : null}
              </div>

              <div>
                <label className={labelClass} htmlFor="reg-confirm">
                  Confirm Password
                </label>
                <input
                  id="reg-confirm"
                  type="password"
                  autoComplete="new-password"
                  {...register("confirmPassword", {
                    required: "Passwords do not match",
                    validate: (value) =>
                      value === getValues("password") || "Passwords do not match",
                  })}
                  className={inputClass}
                  placeholder="Repeat your password"
                />
                {errors.confirmPassword ? (
                  <p className={errorClass}>{errors.confirmPassword.message}</p>
                ) : null}
              </div>
            </div>
          ) : null}

          {currentStep === 0 ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="onb-fullName">
                  Full Name
                </label>
                <input
                  id="onb-fullName"
                  type="text"
                  {...register("fullName", {
                    required: "Full name is required",
                    minLength: {
                      value: 2,
                      message: "Full name is required",
                    },
                  })}
                  className={inputClass}
                  placeholder="Arjun Sharma"
                />
                {errors.fullName ? (
                  <p className={errorClass}>{errors.fullName.message}</p>
                ) : null}
              </div>

              <div>
                <label className={labelClass} htmlFor="onb-gender">
                  Gender
                </label>
                <select
                  id="onb-gender"
                  {...register("gender", { required: "Gender is required" })}
                  className={selectClass}
                >
                  <option value="">Select gender</option>
                  {genderOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.gender ? (
                  <p className={errorClass}>{errors.gender.message}</p>
                ) : null}
              </div>

              <div>
                <label className={labelClass} htmlFor="onb-dob">
                  Date of Birth
                </label>
                <input
                  id="onb-dob"
                  type="date"
                  {...register("dateOfBirth", {
                    required: "Date of birth is required",
                  })}
                  className={inputClass}
                />
                {errors.dateOfBirth ? (
                  <p className={errorClass}>{errors.dateOfBirth.message}</p>
                ) : null}
              </div>

              <div>
                <label className={labelClass} htmlFor="onb-maritalStatus">
                  Marital Status
                </label>
                <select
                  id="onb-maritalStatus"
                  {...register("maritalStatus", {
                    required: "Marital status is required",
                  })}
                  className={selectClass}
                >
                  <option value="">Select marital status</option>
                  {maritalStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.maritalStatus ? (
                  <p className={errorClass}>{errors.maritalStatus.message}</p>
                ) : null}
              </div>

              <div>
                <label className={labelClass} htmlFor="onb-height">
                  Height (cm)
                </label>
                <input
                  id="onb-height"
                  type="number"
                  min={100}
                  max={250}
                  {...register("height")}
                  className={inputClass}
                  placeholder="175"
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="onb-location">
                  Location
                </label>
                <input
                  id="onb-location"
                  type="text"
                  {...register("location")}
                  className={inputClass}
                  placeholder="City or state"
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="onb-bio">
                  About You
                </label>
                <textarea
                  id="onb-bio"
                  rows={4}
                  {...register("bio")}
                  className={inputClass}
                  placeholder="Tell potential partners about yourself."
                />
              </div>
            </div>
          ) : null}

          {currentStep === 1 ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="onb-education">
                  Education
                </label>
                <input
                  id="onb-education"
                  type="text"
                  {...register("education")}
                  className={inputClass}
                  placeholder="B.Tech Computer Science"
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="onb-profession">
                  Profession
                </label>
                <input
                  id="onb-profession"
                  type="text"
                  {...register("profession")}
                  className={inputClass}
                  placeholder="Software Engineer"
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="onb-income">
                  Annual Income
                </label>
                <input
                  id="onb-income"
                  type="text"
                  {...register("income")}
                  className={inputClass}
                  placeholder="10-15 LPA"
                />
              </div>
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="onb-religion">
                  Religion
                </label>
                <select id="onb-religion" {...register("religion")} className={selectClass}>
                  <option value="">Select religion</option>
                  {religionOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass} htmlFor="onb-language">
                  Mother Tongue
                </label>
                <select id="onb-language" {...register("language")} className={selectClass}>
                  <option value="">Select mother tongue</option>
                  {MOTHER_TONGUE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass} htmlFor="onb-caste">
                  {religionValue === "Muslim" ? "Sect *" : religionValue === "Christian" ? "Denomination *" : "Caste *"}
                </label>
                <input
                  id="onb-caste"
                  type="text"
                  {...register("caste")}
                  className={inputClass}
                  placeholder={
                    religionValue === "Muslim"
                      ? "e.g. Sunni, Shia"
                      : religionValue === "Christian"
                        ? "e.g. Catholic, Protestant"
                        : "e.g. Brahmin, Patel"
                  }
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="onb-subCaste">
                  {religionValue === "Muslim" ? "Community" : religionValue === "Christian" ? "Church" : "Sub Caste"}
                </label>
                {religionValue === "Muslim" ? (
                  <select id="onb-subCaste" {...register("subCaste")} className={selectClass}>
                    <option value="">Select Community</option>
                    {MUSLIM_COMMUNITIES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="onb-subCaste"
                    type="text"
                    {...register("subCaste")}
                    className={inputClass}
                    placeholder="Optional"
                  />
                )}
              </div>
            </div>
          ) : null}

          {currentStep === 3 ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="onb-star">
                  Nakshatra
                </label>
                <select id="onb-star" {...register("star")} className={selectClass}>
                  <option value="">Select Nakshatra</option>
                  {NAKSHATRA_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass} htmlFor="onb-rasi">
                  Rasi / Star Sign
                </label>
                <select id="onb-rasi" {...register("rasi")} className={selectClass}>
                  <option value="">Select Rasi</option>
                  {RASI_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <Controller
                  name="horoscopeImage"
                  control={control}
                  render={({ field }) => (
                    <ImageUpload
                      label="Horoscope Image"
                      value={field.value}
                      onChange={field.onChange}
                      onRemove={() => field.onChange("")}
                    />
                  )}
                />
              </div>
            </div>
          ) : null}

          {currentStep === 4 ? (
            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <label className={labelClass} htmlFor="onb-diet">
                  Diet
                </label>
                <select id="onb-diet" {...register("diet")} className={selectClass}>
                  <option value="">Select diet</option>
                  {dietOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass} htmlFor="onb-smoking">
                  Smoking
                </label>
                <select id="onb-smoking" {...register("smoking")} className={selectClass}>
                  <option value="">Select</option>
                  {smokingOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass} htmlFor="onb-drinking">
                  Drinking
                </label>
                <select id="onb-drinking" {...register("drinking")} className={selectClass}>
                  <option value="">Select</option>
                  {drinkingOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          {currentStep === 5 ? (
            <div className="space-y-5">
              <Controller
                name="profileImage"
                control={control}
                render={({ field }) => (
                  <ImageUpload
                    label="Profile Picture"
                    value={field.value}
                    onChange={field.onChange}
                    onRemove={() => field.onChange("")}
                  />
                )}
              />
              <p className="text-sm text-gray-500">
                Adding a profile picture makes your account feel more complete and helps
                other members recognize you faster.
              </p>
            </div>
          ) : null}

          {currentStep === 6 ? (
            <div className="space-y-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="pref-age-min">
                    Minimum Age
                  </label>
                  <input
                    id="pref-age-min"
                    type="number"
                    min={18}
                    max={100}
                    {...register("prefAgeMin")}
                    className={inputClass}
                    placeholder="24"
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="pref-age-max">
                    Maximum Age
                  </label>
                  <input
                    id="pref-age-max"
                    type="number"
                    min={18}
                    max={100}
                    {...register("prefAgeMax")}
                    className={inputClass}
                    placeholder="32"
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="pref-height-min">
                    Minimum Height (cm)
                  </label>
                  <input
                    id="pref-height-min"
                    type="number"
                    min={100}
                    max={250}
                    {...register("prefHeightMin")}
                    className={inputClass}
                    placeholder="155"
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="pref-height-max">
                    Maximum Height (cm)
                  </label>
                  <input
                    id="pref-height-max"
                    type="number"
                    min={100}
                    max={250}
                    {...register("prefHeightMax")}
                    className={inputClass}
                    placeholder="185"
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="pref-religion">
                    Religion
                  </label>
                  <select
                    id="pref-religion"
                    {...register("prefReligion")}
                    className={selectClass}
                  >
                    <option value="">Any</option>
                    {religionOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass} htmlFor="pref-marital-status">
                    Marital Status
                  </label>
                  <select
                    id="pref-marital-status"
                    {...register("prefMaritalStatus")}
                    className={selectClass}
                  >
                    <option value="">Any</option>
                    {maritalStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass} htmlFor="pref-location">
                    Preferred Location
                  </label>
                  <input
                    id="pref-location"
                    type="text"
                    {...register("prefLocation")}
                    className={inputClass}
                    placeholder="City or state"
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="pref-language">
                    Mother Tongue
                  </label>
                  <select
                    id="pref-language"
                    {...register("prefLanguage")}
                    className={selectClass}
                  >
                    <option value="">Any</option>
                    {MOTHER_TONGUE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass} htmlFor="pref-education">
                    Education
                  </label>
                  <input
                    id="pref-education"
                    type="text"
                    {...register("prefEducation")}
                    className={inputClass}
                    placeholder="Graduate, MBA, B.Tech..."
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="pref-profession">
                    Profession
                  </label>
                  <input
                    id="pref-profession"
                    type="text"
                    {...register("prefProfession")}
                    className={inputClass}
                    placeholder="Doctor, engineer, business..."
                  />
                </div>
              </div>

              <p className="text-sm text-gray-500">
                These preferences are optional. You can keep them open-ended and update
                them later from your dashboard.
              </p>
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-500">
              Already have an account?{" "}
              <Link href="/login" className="text-rose-600 font-semibold hover:text-rose-700">
                Sign In
              </Link>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {!isAccountStep ? (
                <button
                  type="button"
                  onClick={handleStepBack}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition-colors hover:border-rose-200 hover:text-rose-600"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              ) : null}

              {isOtpStep ? (
                <>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isResendingOtp || !isOtpExpired}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 px-5 py-3 text-sm font-semibold text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50 disabled:opacity-60"
                  >
                    {isResendingOtp
                      ? "Sending..."
                      : isOtpExpired
                        ? "Resend OTP"
                        : `Resend in ${formatOtpRemainingTime(
                            otpRemainingSeconds
                          )}`}
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifyingOtp || isOtpExpired}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-70"
                  >
                    {isVerifyingOtp ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify OTP & Create Account"
                    )}
                  </button>
                </>
              ) : isAccountStep ? (
                <button
                  type="button"
                  onClick={handleAccountNext}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : currentStep < onboardingSteps.length - 1 ? (
                <button
                  type="button"
                  onClick={handleStepNext}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </button>
              )}
            </div>
          </div>
        </form>

        <p className="text-center text-xs text-gray-500 mt-5 leading-relaxed">
          By registering, you agree to our{" "}
          <Link href="/terms" className="text-rose-500 hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-rose-500 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
