import http from 'node:http';
import { Duplex } from 'node:stream';

function toQueryString(query) {
  if (!query || Object.keys(query).length === 0) {
    return '';
  }

  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    params.append(key, String(value));
  });

  return `?${params.toString()}`;
}

function normalizeHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers ?? {}).map(([key, value]) => [key.toLowerCase(), String(value)])
  );
}

class MockSocket extends Duplex {
  constructor() {
    super();
    this.writable = true;
    this.readable = true;
    this.remoteAddress = '127.0.0.1';
    this.encrypted = false;
  }

  _read() {}

  _write(_chunk, _encoding, callback) {
    callback();
  }

  destroy(error) {
    if (error) {
      this.emit('error', error);
    }
    this.emit('close');
    return this;
  }
}

export async function invokeApp(app, { method = 'GET', path = '/', headers = {}, body, query } = {}) {
  const queryString = toQueryString(query);
  const url = `${path}${queryString}`;

  const normalizedHeaders = normalizeHeaders(headers);
  let payload = null;

  if (typeof body !== 'undefined') {
    payload = JSON.stringify(body);
    if (!normalizedHeaders['content-type']) {
      normalizedHeaders['content-type'] = 'application/json';
    }
    normalizedHeaders['content-length'] = String(Buffer.byteLength(payload));
  }

  const socket = new MockSocket();
  const req = new http.IncomingMessage(socket);
  req.method = method.toUpperCase();
  req.url = url;
  req.originalUrl = url;
  req.headers = normalizedHeaders;

  if (payload) {
    req.push(payload);
  }
  req.push(null);

  const res = new http.ServerResponse(req);
  const chunks = [];

  const originalWrite = res.write.bind(res);
  const originalEnd = res.end.bind(res);

  res.write = (chunk, encoding, callback) => {
    if (chunk) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
    }
    return originalWrite(chunk, encoding, callback);
  };

  res.end = (chunk, encoding, callback) => {
    if (chunk) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
    }
    return originalEnd(chunk, encoding, callback);
  };

  res.assignSocket(socket);

  return new Promise((resolve, reject) => {
    res.on('finish', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      let parsedBody = text;

      try {
        parsedBody = text ? JSON.parse(text) : null;
      } catch {
        // Keep text response for HTML/CSS assets.
      }

      resolve({
        status: res.statusCode,
        headers: res.getHeaders(),
        body: parsedBody,
        text
      });
    });

    res.on('error', reject);

    app(req, res, (error) => {
      if (error) {
        reject(error);
      } else if (!res.writableEnded) {
        res.end();
      }
    });
  });
}

export function requestAs(role, userId = `${role}-1`) {
  return {
    'x-user-role': role,
    'x-user-id': userId
  };
}
