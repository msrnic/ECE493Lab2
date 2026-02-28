import { createApp } from '../src/app.js';

export function createDeterministicClock(start = '2026-01-01T00:00:00.000Z') {
  let tick = 0;
  const startMs = Date.parse(start);
  return () => new Date(startMs + tick++ * 1000).toISOString();
}

export function createDeterministicIds(prefix = 'id') {
  let sequence = 0;
  return () => `${prefix}-${++sequence}`;
}

export function createTestServer(options = {}) {
  const now = options.now ?? createDeterministicClock();
  const idFactory = options.idFactory ?? createDeterministicIds('draft');
  const app = createApp({
    nowFn: () => new Date(now()),
    now,
    idFactory,
    internalServiceToken: 'internal-token'
  });

  const api = {
    state: app.locals.draftState,
    draftController: app.locals.draftController,
    draftVersionController: app.locals.draftVersionController
  };

  return { app: api, state: api.state, now, idFactory };
}

function resolveRoute(api, method, path) {
  const saveOrLatest = path.match(/^\/api\/submissions\/([^/]+)\/draft$/);
  if (saveOrLatest) {
    return {
      params: { submissionId: saveOrLatest[1] },
      handler: method === 'PUT' ? api.draftController.saveDraft : api.draftController.getLatestDraft
    };
  }

  const versions = path.match(/^\/api\/submissions\/([^/]+)\/draft\/versions$/);
  if (versions && method === 'GET') {
    return {
      params: { submissionId: versions[1] },
      handler: api.draftVersionController.listDraftVersions
    };
  }

  const versionDetail = path.match(/^\/api\/submissions\/([^/]+)\/draft\/versions\/([^/]+)$/);
  if (versionDetail && method === 'GET') {
    return {
      params: { submissionId: versionDetail[1], versionId: versionDetail[2] },
      handler: api.draftVersionController.getDraftVersion
    };
  }

  const restore = path.match(/^\/api\/submissions\/([^/]+)\/draft\/versions\/([^/]+)\/restore$/);
  if (restore && method === 'POST') {
    return {
      params: { submissionId: restore[1], versionId: restore[2] },
      handler: api.draftVersionController.restoreDraftVersion
    };
  }

  const prune = path.match(/^\/api\/submissions\/([^/]+)\/draft\/retention\/prune$/);
  if (prune && method === 'POST') {
    return {
      params: { submissionId: prune[1] },
      handler: api.draftController.pruneRetention
    };
  }

  throw new Error(`Route not implemented in test harness: ${method} ${path}`);
}

async function dispatchRequest(api, method, path, headers, body) {
  const { handler, params } = resolveRoute(api, method, path);
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  );

  const req = {
    params,
    body,
    get(name) {
      return normalizedHeaders[name.toLowerCase()];
    }
  };

  const res = {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };

  await handler(req, res);
  return { status: res.statusCode, body: res.body };
}

function createRequestBuilder(api, method, path) {
  const headers = {};
  let body = {};
  let execution;

  const run = () => {
    if (!execution) {
      execution = dispatchRequest(api, method, path, headers, body);
    }

    return execution;
  };

  return {
    set(name, value) {
      headers[name] = value;
      return this;
    },
    send(payload) {
      body = payload;
      return run();
    },
    then(onFulfilled, onRejected) {
      return run().then(onFulfilled, onRejected);
    },
    catch(onRejected) {
      return run().catch(onRejected);
    },
    finally(onFinally) {
      return run().finally(onFinally);
    }
  };
}

export function requestFor(app) {
  return {
    get(path) {
      return createRequestBuilder(app, 'GET', path);
    },
    put(path) {
      return createRequestBuilder(app, 'PUT', path);
    },
    post(path) {
      return createRequestBuilder(app, 'POST', path);
    }
  };
}

export function withActor(req, actor) {
  return req.set('x-user-id', actor.userId).set('x-user-role', actor.role ?? 'author');
}

export async function saveDraft(api, submissionId, actor, payload = {}, extraHeaders = {}) {
  let req = api.put(`/api/submissions/${submissionId}/draft`);
  req = withActor(req, actor);
  for (const [key, value] of Object.entries(extraHeaders)) {
    req = req.set(key, value);
  }

  return req.send({
    baseRevision: payload.baseRevision ?? 0,
    metadata: payload.metadata ?? { title: 'Untitled' },
    files: payload.files ?? []
  });
}
