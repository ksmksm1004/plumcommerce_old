const { PAYMENT } = require('../config/env');

async function mockCharge({ amount, orderId }) {
  // Migration note: Replace mock call with real payment gateway integration.
  // BASE_URL: endpoint root for external PG API.
  // TIMEOUT: network timeout for PG requests.
  // ALLOWLISTED_EGRESS_IP: fixed outbound IP to allowlist on PG side.
  await new Promise((resolve) => setTimeout(resolve, 150));
  return {
    status: 'APPROVED',
    transactionId: `MOCK-${Date.now()}`,
    orderId,
    amount,
    endpoint: PAYMENT.BASE_URL,
    timeout: PAYMENT.TIMEOUT,
    egressIp: PAYMENT.ALLOWLISTED_EGRESS_IP
  };
}

module.exports = { mockCharge };
