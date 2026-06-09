// API client for the Cortez CRM frontend.
// Leads, messages, automations and users are all persisted server-side through
// Netlify Functions backed by Netlify Database (Postgres). Visibility is enforced
// on the server: attendants only receive their own clients, admins receive all.

// Server API helper — always sends/receives the session cookie and surfaces a
// useful error message from the JSON body.
const apiFetch = async (path, options = {}) => {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    throw new Error(data?.error || `Erro ${res.status}`);
  }
  return data;
};

// Order helper: applies the same "-field" / "field" ordering the app used before,
// over the rows returned by the server.
const sortByOrder = (items, order) => {
  if (!order) return items;
  const desc = order.startsWith('-');
  const key = desc ? order.slice(1) : order;
  return [...items].sort((a, b) => {
    const aValue = a[key] || 0;
    const bValue = b[key] || 0;
    const aDate = new Date(aValue).getTime();
    const bDate = new Date(bValue).getTime();
    return desc ? bDate - aDate : aDate - bDate;
  });
};

const filterItems = (items, criteria = {}) => {
  return items.filter((item) => {
    return Object.entries(criteria).every(([key, value]) => String(item[key]) === String(value));
  });
};

const buildMockResponse = (input) => {
  if (!input || typeof input.prompt !== 'string') {
    return { text: 'Resposta mock da IA' };
  }

  const prompt = input.prompt.toLowerCase();
  if (prompt.includes('envie uma mensagem de whatsapp') || prompt.includes('send a whatsapp')) {
    return { sent: true, status_code: 200, response_body: 'Mock enviado', error: '', url_used: input.url || 'mock://url' };
  }

  if (prompt.includes('verifique o status da api') || prompt.includes('status da api')) {
    return { ok: true, status_code: 200, message: 'Mock de status OK' };
  }

  return { text: 'Resposta mock da IA' };
};

export const base44 = {
  entities: {
    Lead: {
      list: async (order) => {
        const leads = await apiFetch('/api/leads', { method: 'GET' });
        return sortByOrder(leads, order);
      },
      create: async (data) => {
        return apiFetch('/api/leads', { method: 'POST', body: JSON.stringify(data) });
      },
      update: async (id, data) => {
        return apiFetch(`/api/leads/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
      },
      delete: async (id) => {
        return apiFetch(`/api/leads/${id}`, { method: 'DELETE' });
      },
      filter: async (criteria = {}, order) => {
        const leads = await apiFetch('/api/leads', { method: 'GET' });
        return sortByOrder(filterItems(leads, criteria), order);
      },
    },
    Message: {
      create: async (data) => {
        return apiFetch('/api/messages', { method: 'POST', body: JSON.stringify(data) });
      },
      filter: async (criteria = {}, order) => {
        const leadId = criteria.lead_id;
        if (!leadId) return [];
        const messages = await apiFetch(`/api/messages?lead_id=${encodeURIComponent(leadId)}`, { method: 'GET' });
        return sortByOrder(filterItems(messages, criteria), order);
      },
    },
    Automation: {
      list: async (order) => {
        const items = await apiFetch('/api/automations', { method: 'GET' });
        return sortByOrder(items, order);
      },
      create: async (data) => {
        return apiFetch('/api/automations', { method: 'POST', body: JSON.stringify(data) });
      },
      update: async (id, data) => {
        return apiFetch(`/api/automations/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
      },
      delete: async (id) => {
        return apiFetch(`/api/automations/${id}`, { method: 'DELETE' });
      },
    },
    User: {
      list: async () => {
        return apiFetch('/api/users', { method: 'GET' });
      },
      // Active attendants only — used to populate the "responsible attendant"
      // pickers on leads and conversations. Available to any logged-in user.
      listAttendants: async () => {
        return apiFetch('/api/users?scope=attendants', { method: 'GET' });
      },
      update: async (id, data) => {
        return apiFetch(`/api/users/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
      },
      delete: async (id) => {
        return apiFetch(`/api/users/${id}`, { method: 'DELETE' });
      },
    },
  },

  auth: {
    me: async () => {
      const data = await apiFetch('/api/auth/me', { method: 'GET' });
      return data.user;
    },
    logout: async () => {
      try {
        await apiFetch('/api/auth/logout', { method: 'POST' });
      } catch {
        // ignore
      }
    },
    redirectToLogin: () => {
      window.location.href = '/login';
    },
  },

  integrations: {
    Core: {
      // Uploads the file to Netlify Blobs (via /api/upload) so attachments persist
      // across devices and users, returning a stable URL stored alongside the message.
      UploadFile: async ({ file }) => {
        if (!file) return { file_url: '' };
        const form = new FormData();
        form.append('file', file);
        const res = await fetch('/api/upload', {
          method: 'POST',
          credentials: 'include',
          body: form,
        });
        if (!res.ok) {
          let message = `Erro ${res.status}`;
          try {
            const data = await res.json();
            message = data?.error || message;
          } catch {
            // ignore
          }
          throw new Error(message);
        }
        return res.json();
      },
      InvokeLLM: async (input) => buildMockResponse(input),
    },
  },

  users: {
    inviteUser: async (email, role = 'atendente') => {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) throw new Error('Email inválido');
      return apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify({ email: normalizedEmail, role }),
      });
    },
  },
};

export default base44;
