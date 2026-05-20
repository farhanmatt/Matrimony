type AuthErrorMessageOptions = {
  admin?: boolean;
};

export function getAuthPageErrorMessage(error?: string | null) {
  switch (error) {
    case "OAuthAccountNotLinked":
      return "This email already has an account. Google sign-in is now supported for the same email, so please try again.";
    case "AccessDenied":
      return "Access was denied. Please try signing in again.";
    case "Callback":
    case "OAuthCallbackError":
    case "OAuthSignin":
      return "Google sign-in could not be completed. Please try again.";
    default:
      return null;
  }
}

export function getCredentialsErrorMessage(
  code?: string,
  options: AuthErrorMessageOptions = {}
) {
  if (code === "database_unavailable") {
    return "Database is unavailable. Update the database URL in .env and try again.";
  }

  return options.admin
    ? "Invalid admin credentials"
    : "Invalid email, name, or password";
}
