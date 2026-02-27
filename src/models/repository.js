import { randomUUID } from 'node:crypto';

function cloneRecord(record) {
  return JSON.parse(JSON.stringify(record));
}

export function createInMemoryRepository({ idGenerator = randomUUID } = {}) {
  const state = {
    userAccounts: [],
    confirmationTokens: [],
    registrationAttempts: [],
    emailDeliveryJobs: [],
    securityNotifications: [],
    securityAuditEntries: []
  };

  function addId(record) {
    if (record.id) {
      return record;
    }

    return {
      ...record,
      id: idGenerator()
    };
  }

  return {
    state,

    reset() {
      state.userAccounts = [];
      state.confirmationTokens = [];
      state.registrationAttempts = [];
      state.emailDeliveryJobs = [];
      state.securityNotifications = [];
      state.securityAuditEntries = [];
    },

    createUserAccount(account) {
      const persisted = addId(account);
      state.userAccounts.push(cloneRecord(persisted));
      return cloneRecord(persisted);
    },

    updateUserAccount(id, account) {
      const index = state.userAccounts.findIndex((item) => item.id === id);
      if (index === -1) {
        return null;
      }

      state.userAccounts[index] = cloneRecord(account);
      return cloneRecord(state.userAccounts[index]);
    },

    findUserById(id) {
      const account = state.userAccounts.find((item) => item.id === id);
      return account ? cloneRecord(account) : null;
    },

    findUserByNormalizedEmail(emailNormalized) {
      const account = state.userAccounts.find((item) => item.emailNormalized === emailNormalized);
      return account ? cloneRecord(account) : null;
    },

    listUserAccounts() {
      return state.userAccounts.map((item) => cloneRecord(item));
    },

    createConfirmationToken(token) {
      const persisted = addId(token);
      state.confirmationTokens.push(cloneRecord(persisted));
      return cloneRecord(persisted);
    },

    updateConfirmationToken(id, token) {
      const index = state.confirmationTokens.findIndex((item) => item.id === id);
      if (index === -1) {
        return null;
      }

      state.confirmationTokens[index] = cloneRecord(token);
      return cloneRecord(state.confirmationTokens[index]);
    },

    findConfirmationTokenByHash(tokenHash) {
      const token = state.confirmationTokens.find((item) => item.tokenHash === tokenHash);
      return token ? cloneRecord(token) : null;
    },

    listConfirmationTokens() {
      return state.confirmationTokens.map((item) => cloneRecord(item));
    },

    createRegistrationAttempt(attempt) {
      const persisted = addId(attempt);
      state.registrationAttempts.push(cloneRecord(persisted));
      return cloneRecord(persisted);
    },

    listRegistrationAttemptsByEmail(emailNormalized) {
      return state.registrationAttempts
        .filter((item) => item.emailNormalized === emailNormalized)
        .map((item) => cloneRecord(item));
    },

    listRegistrationAttempts() {
      return state.registrationAttempts.map((item) => cloneRecord(item));
    },

    createEmailDeliveryJob(job) {
      const persisted = addId(job);
      state.emailDeliveryJobs.push(cloneRecord(persisted));
      return cloneRecord(persisted);
    },

    updateEmailDeliveryJob(id, job) {
      const index = state.emailDeliveryJobs.findIndex((item) => item.id === id);
      if (index === -1) {
        return null;
      }

      state.emailDeliveryJobs[index] = cloneRecord(job);
      return cloneRecord(state.emailDeliveryJobs[index]);
    },

    listEmailDeliveryJobs() {
      return state.emailDeliveryJobs.map((item) => cloneRecord(item));
    },

    listEmailDeliveryJobsDue(now) {
      const nowMs = now instanceof Date ? now.getTime() : now;
      return state.emailDeliveryJobs
        .filter((item) => new Date(item.nextAttemptAt).getTime() <= nowMs)
        .map((item) => cloneRecord(item));
    },

    createSecurityNotification(notification) {
      const persisted = addId(notification);
      state.securityNotifications.push(cloneRecord(persisted));
      return cloneRecord(persisted);
    },

    listSecurityNotifications() {
      return state.securityNotifications.map((item) => cloneRecord(item));
    },

    createSecurityAuditEntry(entry) {
      const persisted = addId(entry);
      state.securityAuditEntries.push(cloneRecord(persisted));
      return cloneRecord(persisted);
    },

    listSecurityAuditEntries() {
      return state.securityAuditEntries.map((item) => cloneRecord(item));
    }
  };
}
