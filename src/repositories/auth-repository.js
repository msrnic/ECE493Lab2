import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { createJsonFileStore } from './json-file-store.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function initialState() {
  return {
    userAccounts: [],
    confirmationTokens: [],
    registrationAttempts: [],
    emailDeliveryJobs: [],
    securityNotifications: [],
    securityAuditEntries: []
  };
}

function addId(record, idFactory) {
  if (record.id) {
    return record;
  }

  return {
    ...record,
    id: idFactory()
  };
}

export function createAuthRepository({
  databaseFilePath = path.join(process.cwd(), 'database', 'auth.json'),
  idFactory = () => randomUUID()
} = {}) {
  const store = createJsonFileStore({
    filePath: databaseFilePath,
    initialState: initialState()
  });

  function readState() {
    const state = store.read();
    return {
      userAccounts: Array.isArray(state.userAccounts) ? state.userAccounts : [],
      confirmationTokens: Array.isArray(state.confirmationTokens) ? state.confirmationTokens : [],
      registrationAttempts: Array.isArray(state.registrationAttempts) ? state.registrationAttempts : [],
      emailDeliveryJobs: Array.isArray(state.emailDeliveryJobs) ? state.emailDeliveryJobs : [],
      securityNotifications: Array.isArray(state.securityNotifications) ? state.securityNotifications : [],
      securityAuditEntries: Array.isArray(state.securityAuditEntries) ? state.securityAuditEntries : []
    };
  }

  function writeState(nextState) {
    store.write(nextState);
  }

  return {
    reset() {
      writeState(initialState());
    },

    createUserAccount(account) {
      const state = readState();
      const persisted = addId(account, idFactory);
      state.userAccounts.push(clone(persisted));
      writeState(state);
      return clone(persisted);
    },

    updateUserAccount(id, account) {
      const state = readState();
      const index = state.userAccounts.findIndex((item) => item.id === id);
      if (index === -1) {
        return null;
      }

      state.userAccounts[index] = clone(account);
      writeState(state);
      return clone(state.userAccounts[index]);
    },

    findUserById(id) {
      const state = readState();
      const account = state.userAccounts.find((item) => item.id === id);
      return account ? clone(account) : null;
    },

    findUserByNormalizedEmail(emailNormalized) {
      const state = readState();
      const account = state.userAccounts.find((item) => item.emailNormalized === emailNormalized);
      return account ? clone(account) : null;
    },

    listUserAccounts() {
      const state = readState();
      return state.userAccounts.map((item) => clone(item));
    },

    createConfirmationToken(token) {
      const state = readState();
      const persisted = addId(token, idFactory);
      state.confirmationTokens.push(clone(persisted));
      writeState(state);
      return clone(persisted);
    },

    updateConfirmationToken(id, token) {
      const state = readState();
      const index = state.confirmationTokens.findIndex((item) => item.id === id);
      if (index === -1) {
        return null;
      }

      state.confirmationTokens[index] = clone(token);
      writeState(state);
      return clone(state.confirmationTokens[index]);
    },

    findConfirmationTokenByHash(tokenHash) {
      const state = readState();
      const token = state.confirmationTokens.find((item) => item.tokenHash === tokenHash);
      return token ? clone(token) : null;
    },

    listConfirmationTokens() {
      const state = readState();
      return state.confirmationTokens.map((item) => clone(item));
    },

    createRegistrationAttempt(attempt) {
      const state = readState();
      const persisted = addId(attempt, idFactory);
      state.registrationAttempts.push(clone(persisted));
      writeState(state);
      return clone(persisted);
    },

    listRegistrationAttemptsByEmail(emailNormalized) {
      const state = readState();
      return state.registrationAttempts
        .filter((item) => item.emailNormalized === emailNormalized)
        .map((item) => clone(item));
    },

    listRegistrationAttempts() {
      const state = readState();
      return state.registrationAttempts.map((item) => clone(item));
    },

    createEmailDeliveryJob(job) {
      const state = readState();
      const persisted = addId(job, idFactory);
      state.emailDeliveryJobs.push(clone(persisted));
      writeState(state);
      return clone(persisted);
    },

    updateEmailDeliveryJob(id, job) {
      const state = readState();
      const index = state.emailDeliveryJobs.findIndex((item) => item.id === id);
      if (index === -1) {
        return null;
      }

      state.emailDeliveryJobs[index] = clone(job);
      writeState(state);
      return clone(state.emailDeliveryJobs[index]);
    },

    listEmailDeliveryJobs() {
      const state = readState();
      return state.emailDeliveryJobs.map((item) => clone(item));
    },

    listEmailDeliveryJobsDue(now) {
      const state = readState();
      const nowMs = now instanceof Date ? now.getTime() : now;
      return state.emailDeliveryJobs
        .filter((item) => new Date(item.nextAttemptAt).getTime() <= nowMs)
        .map((item) => clone(item));
    },

    createSecurityNotification(notification) {
      const state = readState();
      const persisted = addId(notification, idFactory);
      state.securityNotifications.push(clone(persisted));
      writeState(state);
      return clone(persisted);
    },

    listSecurityNotifications() {
      const state = readState();
      return state.securityNotifications.map((item) => clone(item));
    },

    createSecurityAuditEntry(entry) {
      const state = readState();
      const persisted = addId(entry, idFactory);
      state.securityAuditEntries.push(clone(persisted));
      writeState(state);
      return clone(persisted);
    },

    listSecurityAuditEntries() {
      const state = readState();
      return state.securityAuditEntries.map((item) => clone(item));
    }
  };
}
