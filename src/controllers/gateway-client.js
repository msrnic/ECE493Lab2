function defaultOutcomeFromToken(paymentToken) {
  if (paymentToken.startsWith('tok_approve')) {
    return { outcome: 'approved', gatewayReference: `gw_${paymentToken.slice(4)}` };
  }
  if (paymentToken.startsWith('tok_decline')) {
    return {
      outcome: 'declined',
      declineReasonCode: 'declined_by_issuer',
      gatewayReference: `gw_${paymentToken.slice(4)}`
    };
  }
  return { outcome: 'pending', gatewayReference: `gw_${paymentToken.slice(4)}` };
}

export function createGatewayClient({
  submitPayment = async ({ paymentToken }) => defaultOutcomeFromToken(paymentToken),
  verifySignature = (signature) => signature === 'valid-signature'
} = {}) {
  return {
    submitPayment,
    verifySignature
  };
}

