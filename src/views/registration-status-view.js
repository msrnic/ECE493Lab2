export function getRegistrationStatusMessage(emailDelivery) {
  if (emailDelivery === 'sent') {
    return 'Registration successful. Please check your email to confirm your account.';
  }

  return 'Registration successful. Email delivery is pending and a retry has been queued.';
}
