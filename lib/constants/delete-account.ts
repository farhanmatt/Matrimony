export const deleteAccountReasonOptions = [
  "Found a match",
  "Not getting enough matches",
  "Taking a break",
  "Privacy concerns",
  "Created by mistake",
  "Other",
] as const;

export type DeleteAccountReason = (typeof deleteAccountReasonOptions)[number];
