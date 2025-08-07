import axios from 'axios';

class HTTPTool {
  constructor(config) {
    this.name = config.name;
    this.type = config.type || 'http';
    this.baseUrl = config.baseUrl || config.serverUrl || '';
    this.description = config.description;
    this.operations = config.operations || {};
    this.headers = config.headers || {};
    this.credentials = config.credentials || {};
    this.keywords = config.keywords || [];
    this.isHealthy = true; // Assume healthy by default
  }

  getPrimaryCredential() {
    return this.credentials.apiKey || this.credentials.accessToken;
  }

  canHandle(intent, input) {
    if (!this.keywords.length) return false;
    const lower = input.toLowerCase();
    return this.keywords.some(k => lower.includes(k.toLowerCase()));
  }

  buildUrl(path = '') {
    if (!path.startsWith('http')) {
      const base = this.baseUrl.replace(/\/$/, '');
      path = path.replace(/^\//, '');
      return `${base}/${path}`;
    }
    return path;
  }

  // Replace template variables in object values
  substitute(template = {}, params = {}) {
    const result = {};
    for (const [key, value] of Object.entries(template)) {
      if (typeof value === 'string') {
        result[key] = value.replace(/\{\{(.*?)\}\}/g, (_, p1) => params[p1.trim()] ?? '');
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  async execute(operation, params = {}) {
    const op = this.operations[operation];
    if (!op) {
      throw new Error(`Operation ${operation} not configured`);
    }

    const method = (op.method || 'GET').toUpperCase();
    const url = this.buildUrl(op.url || op.path || '');
    const headers = { ...this.headers, ...(op.headers || {}) };

    const credential = this.getPrimaryCredential();
    if (credential && op.authHeader) {
      headers[op.authHeader] = credential;
    }

    const config = { method, url, headers };

    if (method === 'GET') {
      config.params = { ...this.substitute(op.params, params), ...params };
    } else {
      config.data = { ...this.substitute(op.data, params), ...params };
    }

    const response = await axios(config);
    return response.data;
  }
}

export { HTTPTool };
