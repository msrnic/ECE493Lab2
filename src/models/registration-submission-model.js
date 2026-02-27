export function parseRegistrationSubmission(input) {
  const source = input && typeof input === 'object' ? input : {};

  return {
    fullName: typeof source.fullName === 'string' ? source.fullName : '',
    email: typeof source.email === 'string' ? source.email : '',
    password: typeof source.password === 'string' ? source.password : '',
    confirmPassword: typeof source.confirmPassword === 'string' ? source.confirmPassword : ''
  };
}

export function buildValidationErrorResponse(errors) {
  return {
    code: 'VALIDATION_FAILED',
    message: 'One or more fields are invalid.',
    errors
  };
}
