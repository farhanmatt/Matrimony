import { prisma } from "@/lib/prisma";
import {
  GENDER_LABELS,
  MARITAL_STATUS_LABELS,
  calculateAge,
  cmToFeetInches,
  formatDate,
} from "@/lib/utils/helpers";

export const supportIssueCategories = [
  {
    value: "technical_issue",
    label: "Technical Issue",
    description: "Page errors, broken UI, slow loading, or unexpected behavior.",
  },
  {
    value: "account_login",
    label: "Account & Login",
    description: "Sign-in problems, password reset, email access, or account issues.",
  },
  {
    value: "profile_photos",
    label: "Profile & Photos",
    description: "Profile updates, image upload problems, blur, or verification issues.",
  },
  {
    value: "likes_matches",
    label: "Likes, Matches & Shortlist",
    description: "Interest, mutual match, shortlist, or section visibility issues.",
  },
  {
    value: "chat_notifications",
    label: "Chat & Notifications",
    description: "Message requests, chat visibility, or notification behavior.",
  },
  {
    value: "payments_unlocks",
    label: "Payments & Unlocks",
    description: "Premium, unlocks, payment confirmation, or order issues.",
  },
  {
    value: "safety_privacy",
    label: "Safety & Privacy",
    description: "Fake profiles, harassment, abuse reports, or privacy concerns.",
  },
  {
    value: "other",
    label: "Other",
    description: "Any other question that does not fit the categories above.",
  },
] as const;

export type SupportIssueCategory = (typeof supportIssueCategories)[number]["value"];

type SupportAssistantResult = {
  category: SupportIssueCategory;
  blocked: boolean;
  message: string;
};

const supportAssistantProfileSelect = {
  fullName: true,
  gender: true,
  dateOfBirth: true,
  height: true,
  maritalStatus: true,
  phone: true,
  education: true,
  course: true,
  profession: true,
  employedIn: true,
  income: true,
  location: true,
  city: true,
  state: true,
  bio: true,
  religion: true,
  caste: true,
  subCaste: true,
  language: true,
} as const;

type SupportAssistantProfile = {
  fullName: string;
  gender: string;
  dateOfBirth: Date;
  height: number | null;
  maritalStatus: string;
  phone: string | null;
  education: string | null;
  course: string | null;
  profession: string | null;
  employedIn: string | null;
  income: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  bio: string | null;
  religion: string | null;
  caste: string | null;
  subCaste: string | null;
  language: string | null;
};

type SupportAssistantUserContext = {
  profile: SupportAssistantProfile | null;
  counts: {
    likesGiven: number;
    likesReceived: number;
    matches: number;
    shortlist: number | null;
  };
};

type SupportAssistantPersonalMetric =
  | "likesGiven"
  | "likesReceived"
  | "matches"
  | "shortlist";

type SupportAssistantPersonalField =
  | "name"
  | "age"
  | "dateOfBirth"
  | "phone"
  | "education"
  | "profession"
  | "location"
  | "religion"
  | "caste"
  | "language"
  | "maritalStatus"
  | "height"
  | "bio";

const supportCategoryValueSet = new Set<SupportIssueCategory>(
  supportIssueCategories.map((category) => category.value)
);

const categoryKeywordMap: Record<SupportIssueCategory, string[]> = {
  technical_issue: [
    "website",
    "site",
    "app",
    "dashboard",
    "error",
    "bug",
    "issue",
    "broken",
    "lag",
    "lags",
    "laggy",
    "delay",
    "delayed",
    "loading",
    "load",
    "slow",
    "glitch",
    "glitches",
    "crash",
    "freeze",
    "freezing",
    "stuck",
    "blank",
    "empty",
    "missing",
    "data",
    "refresh",
    "not working",
    "not showing",
    "not displayed",
    "not visible",
    "page",
    "section",
  ],
  account_login: [
    "login",
    "sign in",
    "signin",
    "sign up",
    "signout",
    "sign out",
    "password",
    "reset",
    "otp",
    "email",
    "account",
    "register",
    "registration",
    "verification",
    "verify email",
    "verify otp",
    "locked out",
  ],
  profile_photos: [
    "profile",
    "photo",
    "image",
    "upload",
    "blur",
    "edit",
    "update profile",
    "edit profile",
    "profile update",
    "save profile",
    "verify",
    "completion",
    "details",
    "primary photo",
    "preview card",
  ],
  likes_matches: [
    "like",
    "interest",
    "match",
    "mutual",
    "mutual interest",
    "shortlist",
    "saved profile",
    "save profile",
    "recent interest",
    "recent interests",
    "received like",
    "received likes",
    "duplicate profile",
  ],
  chat_notifications: [
    "chat",
    "message",
    "messages",
    "notification",
    "bell",
    "accept",
    "reject",
    "sender",
    "receiver",
    "request",
    "message request",
    "unread",
    "inbox",
  ],
  payments_unlocks: [
    "payment",
    "paid",
    "premium",
    "unlock",
    "unlock profile",
    "unlocked profile",
    "unlocked profiles",
    "order",
    "transaction",
    "razorpay",
    "amount",
    "receipt",
    "subscription",
    "plan",
  ],
  safety_privacy: [
    "report",
    "fake",
    "abuse",
    "harass",
    "privacy",
    "unsafe",
    "block",
    "threat",
    "scam",
  ],
  other: [],
};

const inappropriatePatterns = [
  /\b(fuck|fucking|shit|bitch|asshole|bastard|slut|whore)\b/i,
  /\b(porn|nude|naked|sexual|sex chat)\b/i,
  /\b(kill you|rape|terrorist|bomb)\b/i,
  /\b(hate you|racial slur|caste slur)\b/i,
];

const greetingOnlyPatterns = [
  /^(hi|hii+|hello|hey)[!. ]*$/i,
  /^(good morning|good afternoon|good evening)[!. ]*$/i,
];

const courtesyOnlyPatterns = [
  /^(ok|okay|sure|alright|all right|fine)[!. ]*$/i,
  /^(thanks|thank you|thank you so much|thanks a lot)[!. ]*$/i,
];

const unrelatedTopicPatterns = [
  /\b(weather|movie|movies|song|songs|music|recipe|recipes|cricket|football|politics|news|poem|joke|jokes)\b/i,
];

const supportIntentKeywords = [
  "help",
  "support",
  "website",
  "site",
  "app",
  "dashboard",
  "section",
  "data",
  "issue",
  "problem",
  "error",
  "wrong",
  "failed",
  "fail",
  "lag",
  "lags",
  "laggy",
  "delay",
  "delayed",
  "slow",
  "glitch",
  "glitches",
  "freeze",
  "freezing",
  "missing",
  "blank",
  "empty",
  "unable",
  "cannot",
  "can't",
  "not working",
  "not shown",
  "not showing",
  "not displayed",
  "not visible",
  "not loading",
  "page",
  "profile",
  "photo",
  "image",
  "login",
  "account",
  "password",
  "register",
  "registration",
  "match",
  "like",
  "shortlist",
  "notification",
  "message",
  "chat",
  "payment",
  "unlock",
  "privacy",
  "report",
  "bug",
];

const supportContextKeywords = [
  "website",
  "site",
  "app",
  "dashboard",
  "page",
  "section",
  "screen",
  "tab",
  "button",
  "data",
  "profile",
  "photo",
  "image",
  "login",
  "account",
  "match",
  "like",
  "shortlist",
  "notification",
  "message",
  "chat",
  "payment",
  "unlock",
  "premium",
  "privacy",
  "registration",
  "register",
];

const supportIssueSignalKeywords = [
  "issue",
  "problem",
  "error",
  "bug",
  "wrong",
  "failed",
  "fail",
  "unable",
  "cannot",
  "can't",
  "not working",
  "not shown",
  "not showing",
  "not displayed",
  "not visible",
  "not loading",
  "slow",
  "lag",
  "lags",
  "laggy",
  "delay",
  "delayed",
  "loading",
  "missing",
  "blank",
  "empty",
  "freeze",
  "freezing",
  "glitch",
  "glitches",
  "stuck",
  "crash",
  "crashed",
];

const explicitFeatureCategoryKeywords: Record<
  Exclude<SupportIssueCategory, "technical_issue" | "other">,
  string[]
> = {
  account_login: [
    "login",
    "sign in",
    "signin",
    "sign up",
    "password",
    "reset",
    "otp",
    "email verification",
    "verify otp",
    "register",
    "registration",
    "account",
  ],
  profile_photos: [
    "photo",
    "image",
    "upload",
    "blur",
    "primary photo",
    "preview card",
    "edit profile",
    "update profile",
    "save profile",
    "profile completion",
    "profile details",
  ],
  likes_matches: [
    "shortlist",
    "match",
    "mutual interest",
    "recent interests",
    "received likes",
    "interest",
    "like",
  ],
  chat_notifications: [
    "notification",
    "notifications",
    "bell",
    "message request",
    "message",
    "messages",
    "chat",
    "accept",
    "reject",
    "unread",
    "inbox",
  ],
  payments_unlocks: [
    "payment",
    "paid",
    "premium",
    "unlock",
    "unlocked",
    "unlock profile",
    "unlock a profile",
    "unlocked profiles",
    "subscription",
    "plan",
    "transaction",
    "order",
    "receipt",
    "razorpay",
  ],
  safety_privacy: [
    "report",
    "fake",
    "abuse",
    "harass",
    "privacy",
    "unsafe",
    "block",
    "threat",
    "scam",
  ],
};

function normalizeMessage(message: string) {
  return message.trim().replace(/\s+/g, " ");
}

function getTrimmedValue(value: string | null | undefined) {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : null;
}

function getProfileLocation(profile: SupportAssistantProfile) {
  const directLocation = getTrimmedValue(profile.location);
  if (directLocation) {
    return directLocation;
  }

  const parts = [getTrimmedValue(profile.city), getTrimmedValue(profile.state)].filter(
    Boolean
  );
  return parts.length > 0 ? parts.join(", ") : null;
}

function getProfileEducation(profile: SupportAssistantProfile) {
  const education = getTrimmedValue(profile.education);
  const course = getTrimmedValue(profile.course);

  if (education && course) {
    return `${education} - ${course}`;
  }

  return education ?? course;
}

function getProfileProfession(profile: SupportAssistantProfile) {
  const profession = getTrimmedValue(profile.profession);
  const employedIn = getTrimmedValue(profile.employedIn);

  if (profession && employedIn) {
    return `${profession} (${employedIn})`;
  }

  return profession ?? employedIn;
}

function formatProfileFieldValue(
  profile: SupportAssistantProfile,
  field: SupportAssistantPersonalField
) {
  switch (field) {
    case "name":
      return getTrimmedValue(profile.fullName);
    case "age":
      return `${calculateAge(profile.dateOfBirth)} years`;
    case "dateOfBirth":
      return formatDate(profile.dateOfBirth);
    case "phone":
      return getTrimmedValue(profile.phone);
    case "education":
      return getProfileEducation(profile);
    case "profession":
      return getProfileProfession(profile);
    case "location":
      return getProfileLocation(profile);
    case "religion":
      return getTrimmedValue(profile.religion);
    case "caste": {
      const caste = getTrimmedValue(profile.caste);
      const subCaste = getTrimmedValue(profile.subCaste);

      if (caste && subCaste) {
        return `${caste} (${subCaste})`;
      }

      return caste ?? subCaste;
    }
    case "language":
      return getTrimmedValue(profile.language);
    case "maritalStatus":
      return MARITAL_STATUS_LABELS[profile.maritalStatus] ?? profile.maritalStatus;
    case "height":
      return profile.height ? `${cmToFeetInches(profile.height)} (${profile.height} cm)` : null;
    case "bio":
      return getTrimmedValue(profile.bio);
    default:
      return null;
  }
}

function getProfileFieldLabel(field: SupportAssistantPersonalField) {
  switch (field) {
    case "name":
      return "name";
    case "age":
      return "age";
    case "dateOfBirth":
      return "date of birth";
    case "phone":
      return "phone number";
    case "education":
      return "education";
    case "profession":
      return "profession";
    case "location":
      return "location";
    case "religion":
      return "religion";
    case "caste":
      return "caste";
    case "language":
      return "language";
    case "maritalStatus":
      return "marital status";
    case "height":
      return "height";
    case "bio":
      return "bio";
    default:
      return "profile field";
  }
}

function formatProfileSummary(profile: SupportAssistantProfile) {
  const summaryLines = [
    `Name: ${profile.fullName}`,
    `Gender: ${GENDER_LABELS[profile.gender] ?? profile.gender}`,
    `Age: ${calculateAge(profile.dateOfBirth)} years`,
    `Date of birth: ${formatDate(profile.dateOfBirth)}`,
    formatProfileFieldValue(profile, "maritalStatus")
      ? `Marital status: ${formatProfileFieldValue(profile, "maritalStatus")}`
      : null,
    formatProfileFieldValue(profile, "education")
      ? `Education: ${formatProfileFieldValue(profile, "education")}`
      : null,
    formatProfileFieldValue(profile, "profession")
      ? `Profession: ${formatProfileFieldValue(profile, "profession")}`
      : null,
    formatProfileFieldValue(profile, "location")
      ? `Location: ${formatProfileFieldValue(profile, "location")}`
      : null,
    formatProfileFieldValue(profile, "religion")
      ? `Religion: ${formatProfileFieldValue(profile, "religion")}`
      : null,
    formatProfileFieldValue(profile, "caste")
      ? `Caste: ${formatProfileFieldValue(profile, "caste")}`
      : null,
    formatProfileFieldValue(profile, "language")
      ? `Language: ${formatProfileFieldValue(profile, "language")}`
      : null,
    formatProfileFieldValue(profile, "phone")
      ? `Phone: ${formatProfileFieldValue(profile, "phone")}`
      : null,
    formatProfileFieldValue(profile, "bio")
      ? `Bio: ${formatProfileFieldValue(profile, "bio")}`
      : null,
  ].filter((line): line is string => Boolean(line));

  return summaryLines.join("\n");
}

function mentionsIssueSignal(message: string) {
  return containsAnyKeyword(message, supportIssueSignalKeywords);
}

function looksLikeOwnDataLookup(message: string) {
  return (
    /\bwhat(?:'s| is| are)?\b/.test(message) ||
    /\bshow\b/.test(message) ||
    /\btell me\b/.test(message) ||
    /\bgive me\b/.test(message) ||
    /\bhow many\b/.test(message) ||
    /\bcount\b/.test(message) ||
    /\bnumber of\b/.test(message) ||
    /\bdetails\b/.test(message) ||
    /\bdata\b/.test(message) ||
    /\babout\b/.test(message) ||
    /\bview\b/.test(message) ||
    /\bsee\b/.test(message) ||
    /^my\b/.test(message)
  );
}

function detectPersonalFieldRequest(
  message: string
): SupportAssistantPersonalField | null {
  if (!looksLikeOwnDataLookup(message)) {
    return null;
  }

  if (
    message.includes("my name") ||
    message.includes("my full name") ||
    message.includes("profile name")
  ) {
    return "name";
  }

  if (
    message.includes("my age") ||
    message.includes("date of birth") ||
    message.includes("dob") ||
    message.includes("birthday")
  ) {
    return message.includes("age") ? "age" : "dateOfBirth";
  }

  if (message.includes("phone")) {
    return "phone";
  }

  if (message.includes("education") || message.includes("course")) {
    return "education";
  }

  if (message.includes("profession") || message.includes("job") || message.includes("work")) {
    return "profession";
  }

  if (message.includes("location") || message.includes("city") || message.includes("state")) {
    return "location";
  }

  if (message.includes("religion")) {
    return "religion";
  }

  if (message.includes("caste") || message.includes("sub caste") || message.includes("subcaste")) {
    return "caste";
  }

  if (message.includes("language")) {
    return "language";
  }

  if (message.includes("marital status")) {
    return "maritalStatus";
  }

  if (message.includes("height")) {
    return "height";
  }

  if (message.includes("bio") || message.includes("about me")) {
    return "bio";
  }

  return null;
}

function isProfileSummaryRequest(message: string) {
  if (!looksLikeOwnDataLookup(message)) {
    return false;
  }

  return (
    message.includes("profile details") ||
    message.includes("profile detail") ||
    message.includes("profile data") ||
    message.includes("my details") ||
    message.includes("my data") ||
    message.includes("details entered") ||
    message.includes("data entered") ||
    message.includes("saved in my profile") ||
    message.includes("show my profile") ||
    message.includes("about my profile")
  );
}

function extractRequestedPersonalMetrics(
  message: string
): SupportAssistantPersonalMetric[] {
  const metrics = new Set<SupportAssistantPersonalMetric>();
  const wantsCount =
    looksLikeOwnDataLookup(message) ||
    message.includes("like count") ||
    message.includes("match count") ||
    message.includes("shortlist count");

  if (!wantsCount) {
    return [];
  }

  const mentionsReceivedLikes =
    message.includes("received like") ||
    message.includes("received likes") ||
    message.includes("who liked me") ||
    message.includes("likes received");
  const mentionsMatches =
    message.includes("mutual") ||
    message.includes("match") ||
    message.includes("matches");
  const mentionsShortlist =
    message.includes("shortlist") || message.includes("shortlisted");
  const mentionsLikes = message.includes("like") || message.includes("likes");
  const mentionsSentLikes =
    message.includes("likes given") ||
    message.includes("liked profiles") ||
    message.includes("i liked") ||
    message.includes("profiles i liked") ||
    message.includes("sent like");

  if (mentionsReceivedLikes) {
    metrics.add("likesReceived");
  }

  if (mentionsMatches) {
    metrics.add("matches");
  }

  if (mentionsShortlist) {
    metrics.add("shortlist");
  }

  if (mentionsSentLikes) {
    metrics.add("likesGiven");
  } else if (mentionsLikes && !mentionsReceivedLikes) {
    metrics.add("likesGiven");
    metrics.add("likesReceived");
  }

  return Array.from(metrics);
}

function buildMetricReply(
  counts: SupportAssistantUserContext["counts"],
  metrics: SupportAssistantPersonalMetric[]
) {
  const lines = metrics.map((metric) => {
    switch (metric) {
      case "likesGiven":
        return `Likes given: ${counts.likesGiven}`;
      case "likesReceived":
        return `Received likes: ${counts.likesReceived}`;
      case "matches":
        return `Mutual matches: ${counts.matches}`;
      case "shortlist":
        return counts.shortlist === null
          ? "Shortlisted profiles: unavailable right now"
          : `Shortlisted profiles: ${counts.shortlist}`;
      default:
        return null;
    }
  });

  return lines.filter((line): line is string => Boolean(line)).join("\n");
}

function buildPersonalDataReply(
  context: SupportAssistantUserContext,
  message: string
): SupportAssistantResult | null {
  if (mentionsIssueSignal(message)) {
    return null;
  }

  const requestedField = detectPersonalFieldRequest(message);
  const requestedMetrics = extractRequestedPersonalMetrics(message);
  const wantsProfileSummary = isProfileSummaryRequest(message);

  if (!requestedField && requestedMetrics.length === 0 && !wantsProfileSummary) {
    return null;
  }

  if (!context.profile) {
    if (requestedMetrics.length > 0) {
      return {
        category: "likes_matches",
        blocked: false,
        message: [
          "I could not find a saved profile for your account yet.",
          buildMetricReply(context.counts, requestedMetrics),
        ]
          .filter(Boolean)
          .join("\n\n"),
      };
    }

    return {
      category: "profile_photos",
      blocked: false,
      message:
        "I could not find a saved profile for your account yet. Please create or complete your profile first, and then I can show your saved details here.",
    };
  }

  const replyParts: string[] = [];

  if (requestedField) {
    const value = formatProfileFieldValue(context.profile, requestedField);

    replyParts.push(
      value
        ? `Your ${getProfileFieldLabel(requestedField)} is ${value}.`
        : `I could not find your ${getProfileFieldLabel(requestedField)} in the saved profile yet.`
    );
  }

  if (wantsProfileSummary) {
    replyParts.push(
      `Here are the details currently saved on your profile:\n${formatProfileSummary(
        context.profile
      )}`
    );
  }

  if (requestedMetrics.length > 0) {
    replyParts.push(
      `Here are your current counts:\n${buildMetricReply(
        context.counts,
        requestedMetrics
      )}`
    );
  }

  return {
    category:
      requestedField || wantsProfileSummary ? "profile_photos" : "likes_matches",
    blocked: false,
    message: replyParts.join("\n\n"),
  };
}

async function getSupportAssistantUserContext(
  userId: string,
  shortlistCount: number | null
): Promise<SupportAssistantUserContext> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: {
      id: true,
      ...supportAssistantProfileSelect,
    },
  });

  if (!profile) {
    return {
      profile: null,
      counts: {
        likesGiven: 0,
        likesReceived: 0,
        matches: 0,
        shortlist: shortlistCount,
      },
    };
  }

  const [likesGiven, likesReceived, matches] = await Promise.all([
    prisma.like.count({
      where: { fromProfileId: profile.id },
    }),
    prisma.like.count({
      where: { toProfileId: profile.id },
    }),
    prisma.match.count({
      where: {
        OR: [{ profileAId: profile.id }, { profileBId: profile.id }],
      },
    }),
  ]);

  const { id: _profileId, ...profileData } = profile;

  return {
    profile: profileData,
    counts: {
      likesGiven,
      likesReceived,
      matches,
      shortlist: shortlistCount,
    },
  };
}

function isSupportIssueCategory(value: string): value is SupportIssueCategory {
  return supportCategoryValueSet.has(value as SupportIssueCategory);
}

export function normalizeSupportIssueCategory(value: string | null | undefined) {
  return value && isSupportIssueCategory(value) ? value : "other";
}

function containsInappropriateContent(message: string) {
  return inappropriatePatterns.some((pattern) => pattern.test(message));
}

function containsAnyKeyword(message: string, keywords: readonly string[]) {
  return keywords.some((keyword) => message.includes(keyword));
}

function containsSupportIntent(message: string) {
  const normalizedMessage = normalizeMessage(message).toLowerCase();
  return containsAnyKeyword(normalizedMessage, supportIntentKeywords);
}

function isGreetingOnlyMessage(message: string) {
  return greetingOnlyPatterns.some((pattern) => pattern.test(message));
}

function isCourtesyOnlyMessage(message: string) {
  return courtesyOnlyPatterns.some((pattern) => pattern.test(message));
}

function hasLikelySupportContext(message: string) {
  const normalizedMessage = normalizeMessage(message).toLowerCase();
  const mentionsSupportContext = containsAnyKeyword(
    normalizedMessage,
    supportContextKeywords
  );
  const mentionsIssueSignal = containsAnyKeyword(
    normalizedMessage,
    supportIssueSignalKeywords
  );

  return mentionsSupportContext && mentionsIssueSignal;
}

function detectExplicitFeatureCategory(message: string) {
  const normalizedMessage = normalizeMessage(message).toLowerCase();

  for (const [category, keywords] of Object.entries(
    explicitFeatureCategoryKeywords
  ) as [Exclude<SupportIssueCategory, "technical_issue" | "other">, string[]][]) {
    if (containsAnyKeyword(normalizedMessage, keywords)) {
      return category;
    }
  }

  return null;
}

function detectSupportCategory(message: string) {
  const normalizedMessage = normalizeMessage(message).toLowerCase();
  const explicitCategory = detectExplicitFeatureCategory(normalizedMessage);

  if (explicitCategory) {
    return explicitCategory;
  }

  let bestCategory: SupportIssueCategory | null = null;
  let bestScore = 0;

  for (const category of supportIssueCategories) {
    const score = categoryKeywordMap[category.value].reduce((total, keyword) => {
      if (!normalizedMessage.includes(keyword)) {
        return total;
      }

      return total + (keyword.includes(" ") ? 3 : 1);
    }, 0);

    if (score > bestScore) {
      bestScore = score;
      bestCategory = category.value;
    }
  }

  return bestCategory;
}

function isClearlyUnrelatedToSupport(message: string) {
  const normalizedMessage = normalizeMessage(message);

  if (!normalizedMessage) {
    return true;
  }

  if (unrelatedTopicPatterns.some((pattern) => pattern.test(normalizedMessage))) {
    return true;
  }

  const detectedCategory = detectSupportCategory(normalizedMessage);
  if (detectedCategory) {
    return false;
  }

  if (containsSupportIntent(normalizedMessage)) {
    return false;
  }

  return !hasLikelySupportContext(normalizedMessage);
}

function buildGreetingReply(message: string) {
  const normalizedMessage = normalizeMessage(message).toLowerCase();

  if (normalizedMessage.includes("good morning")) {
    return "Good morning. I am here to help with any website-related question, including your account, profile, matches, payments, notifications, or technical issues.";
  }

  if (normalizedMessage.includes("good afternoon")) {
    return "Good afternoon. I am here to help with any website-related question, including your account, profile, matches, payments, notifications, or technical issues.";
  }

  if (normalizedMessage.includes("good evening")) {
    return "Good evening. I am here to help with any website-related question, including your account, profile, matches, payments, notifications, or technical issues.";
  }

  if (normalizedMessage.includes("thank")) {
    return "You are welcome. If you need help with any website feature or account-related issue, please type your question here and I will assist you.";
  }

  if (
    normalizedMessage === "ok" ||
    normalizedMessage === "okay" ||
    normalizedMessage === "sure" ||
    normalizedMessage === "alright" ||
    normalizedMessage === "all right" ||
    normalizedMessage === "fine"
  ) {
    return "Sure. Please share your website-related question whenever you are ready, and I will help you.";
  }

  return "Hello. I am here to help with your account, profile, matches, payments, notifications, and other website-related questions. Please tell me what you need assistance with.";
}

function buildSupportReply(category: SupportIssueCategory, message: string) {
  const normalizedMessage = normalizeMessage(message).toLowerCase();

  if (category === "technical_issue") {
    const hasLoadingIssue =
      normalizedMessage.includes("loading") ||
      normalizedMessage.includes("slow") ||
      normalizedMessage.includes("blank");
    const hasPerformanceIssue =
      normalizedMessage.includes("lag") ||
      normalizedMessage.includes("lags") ||
      normalizedMessage.includes("laggy") ||
      normalizedMessage.includes("delay") ||
      normalizedMessage.includes("delayed") ||
      normalizedMessage.includes("freeze") ||
      normalizedMessage.includes("freezing") ||
      normalizedMessage.includes("glitch");
    const hasMissingDataIssue =
      normalizedMessage.includes("no data") ||
      normalizedMessage.includes("data") ||
      normalizedMessage.includes("not shown") ||
      normalizedMessage.includes("not showing") ||
      normalizedMessage.includes("not displayed") ||
      normalizedMessage.includes("missing") ||
      normalizedMessage.includes("empty");

    if (hasPerformanceIssue) {
      return "This looks like a website performance issue. Please refresh the page once, try the same action again, and check whether the lag happens on one specific page or across the whole site. If it continues, mention the page name and the exact action that feels slow so support can narrow it down faster.";
    }

    if (hasMissingDataIssue) {
      return "This looks like a page data or visibility issue. Please refresh the page, sign out and sign back in once, and then reopen the same section. If the data is still missing, mention which page or section is affected and what information you expected to see.";
    }

    return hasLoadingIssue
      ? "This looks like a page-loading issue. Please refresh the page once, sign out and sign back in, and then retry the same action. If the problem continues, note the exact page and what you clicked just before the issue started."
      : "This looks like a technical issue. Please retry the same action after refreshing the page. If it still fails, mention the exact page name, what you expected, and what happened instead so support can trace it faster.";
  }

  if (category === "account_login") {
    const hasRegistrationIssue =
      normalizedMessage.includes("register") ||
      normalizedMessage.includes("registration") ||
      normalizedMessage.includes("sign up");
    const hasCredentialIssue =
      normalizedMessage.includes("password") ||
      normalizedMessage.includes("reset") ||
      normalizedMessage.includes("otp");
    const hasVerificationIssue =
      normalizedMessage.includes("verification") ||
      normalizedMessage.includes("verify");

    if (hasRegistrationIssue) {
      return "This looks like a registration issue. Please make sure all required fields were completed correctly, then try signing up again. If registration still does not complete, mention whether the problem happens during form submission, OTP verification, or the first login after signup.";
    }

    if (hasCredentialIssue || hasVerificationIssue) {
      return "This looks like an account access issue. Please confirm that you are using the same email or phone number linked to your account, then retry the reset or OTP flow. If the code or link does not arrive, check your spam folder and mention whether the problem is with login, password reset, or verification.";
    }

    return "This looks like an account or login issue. Please confirm that you are using the same email you registered with. If you still cannot access your account, mention whether the problem is with sign in, sign up, verification, or account details so support can guide you correctly.";
  }

  if (category === "profile_photos") {
    const mentionsBlur =
      normalizedMessage.includes("blur") || normalizedMessage.includes("blurred");
    const mentionsUpload =
      normalizedMessage.includes("upload") ||
      normalizedMessage.includes("photo") ||
      normalizedMessage.includes("image");
    const mentionsProfileUpdate =
      normalizedMessage.includes("edit profile") ||
      normalizedMessage.includes("update profile") ||
      normalizedMessage.includes("save profile") ||
      normalizedMessage.includes("details") ||
      normalizedMessage.includes("completion");

    return mentionsBlur
      ? "This looks like a profile-photo visibility issue. Blurred profile images usually stay protected until the related access or unlock condition is met. If the blur should already be removed, refresh the page and reopen the profile once to sync the latest access state."
      : mentionsUpload
        ? "This looks like a photo upload or display issue. Please save the profile again, make sure the image upload completed fully, and then reopen the same page. If the photo still does not appear, mention whether the problem is with the primary photo, preview card, or uploaded gallery image."
        : mentionsProfileUpdate
          ? "This looks like a profile update issue. Please save the profile again and reopen the same section to confirm the latest details were stored correctly. If the update is still missing, mention which profile field or section is not updating."
          : "This looks like a profile or photo issue. Please save the profile again, make sure the image upload completed, and then reopen the page. If the update still does not appear, mention whether the problem is with the profile form, primary photo, or preview card.";
  }

  if (category === "likes_matches") {
    if (normalizedMessage.includes("shortlist")) {
      return "This looks like a shortlist-related question. Shortlist is your saved profile list, and profiles can stay there even after they become a mutual match. If something looks wrong, refresh the Shortlist section and check whether the correct profile appears only once.";
    }

    if (
      normalizedMessage.includes("mutual") ||
      normalizedMessage.includes("match")
    ) {
      return "This looks like a mutual-interest question. A profile should appear in Mutual Interest only after both users have liked each other. If a matched profile is also appearing in the wrong section, refresh the related pages and check whether the profile placement updates correctly.";
    }

    return "This looks like a likes or interest issue. Please refresh the Recent Interests, Received Likes, or related section and recheck whether the same profile appears in the correct place only once. If the issue continues, mention which section is affected and what you expected to happen.";
  }

  if (category === "chat_notifications") {
    if (
      normalizedMessage.includes("notification") ||
      normalizedMessage.includes("bell") ||
      normalizedMessage.includes("unread")
    ) {
      return "This looks like a notification issue. Please refresh the notification panel and reopen the related page once. Notification items should remain consistent with the latest action state, so if something still looks wrong, mention which notification type is affected and what you expected to see.";
    }

    return "This looks like a chat or message-request issue. Message request notifications should remain until accepted or rejected, and those actions should update the related shortlist or sender-notification flow correctly. Please refresh both the chat page and notification panel, then recheck the same conversation.";
  }

  if (category === "payments_unlocks") {
    if (
      normalizedMessage.includes("unlock") ||
      normalizedMessage.includes("premium") ||
      normalizedMessage.includes("subscription") ||
      normalizedMessage.includes("plan")
    ) {
      return "This looks like an unlock or premium-access question. After a successful payment, please reopen the Unlocked Profiles section and check whether the related access has updated. If access is still missing, mention whether the issue is with premium activation, unlocked profiles, or a specific profile unlock.";
    }

    return "This looks like a payment issue. First confirm whether the payment completed successfully in your bank or payment app. Then reopen the related page and check whether the payment status updated. If the payment succeeded but the website still does not reflect it, keep the order or transaction details ready when contacting support.";
  }

  if (category === "safety_privacy") {
    return "This looks like a safety or privacy concern. Please avoid sharing personal information, stop responding to the profile if needed, and report the issue with the profile name and a short description of what happened so the support team can review it safely.";
  }

  return "Please share the exact page or feature name, what action you tried, and what happened instead. You can ask about account access, profile updates, likes, matches, shortlist, notifications, payments, unlocked profiles, or any other website feature, and I will guide you.";
}

export function analyzeSupportIssue(
  selectedCategory: string | null | undefined,
  message: string
): SupportAssistantResult {
  const normalizedCategory = normalizeSupportIssueCategory(selectedCategory);
  const normalizedMessage = normalizeMessage(message);

  if (
    containsInappropriateContent(normalizedMessage)
  ) {
    return {
      category: normalizedCategory,
      blocked: true,
      message: "Sorry, this question is inappropriate.",
    };
  }

  if (
    isGreetingOnlyMessage(normalizedMessage) ||
    isCourtesyOnlyMessage(normalizedMessage)
  ) {
    return {
      category: "other",
      blocked: false,
      message: buildGreetingReply(normalizedMessage),
    };
  }

  if (isClearlyUnrelatedToSupport(normalizedMessage)) {
    return {
      category: normalizedCategory,
      blocked: true,
      message: "Sorry, this question is inappropriate.",
    };
  }

  const detectedCategory = detectSupportCategory(normalizedMessage);
  const resolvedCategory =
    detectedCategory && detectedCategory !== "other"
      ? detectedCategory
      : normalizedCategory;

  return {
    category: resolvedCategory,
    blocked: false,
    message: buildSupportReply(resolvedCategory, normalizedMessage),
  };
}

export async function analyzeSupportIssueForUser(
  userId: string,
  message: string,
  shortlistCount: number | null
): Promise<SupportAssistantResult> {
  const normalizedMessage = normalizeMessage(message);

  if (containsInappropriateContent(normalizedMessage)) {
    return {
      category: "other",
      blocked: true,
      message: "Sorry, this question is inappropriate.",
    };
  }

  if (
    isGreetingOnlyMessage(normalizedMessage) ||
    isCourtesyOnlyMessage(normalizedMessage)
  ) {
    return {
      category: "other",
      blocked: false,
      message: buildGreetingReply(normalizedMessage),
    };
  }

  if (
    detectPersonalFieldRequest(normalizedMessage) ||
    isProfileSummaryRequest(normalizedMessage) ||
    extractRequestedPersonalMetrics(normalizedMessage).length > 0
  ) {
    const context = await getSupportAssistantUserContext(userId, shortlistCount);
    const personalDataReply = buildPersonalDataReply(context, normalizedMessage);

    if (personalDataReply) {
      return personalDataReply;
    }
  }

  return analyzeSupportIssue(null, normalizedMessage);
}
