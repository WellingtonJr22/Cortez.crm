// Lightweight mock replacement for Base44 SDK for local testing.
// Stores leads, messages, automations and users in browser localStorage.

const STORAGE_KEYS = {
  leads: 'mock_leads_v1',
  messages: 'mock_messages_v1',
  automations: 'mock_automations_v1',
  users: 'mock_users_v1',
  auth: 'local_auth_user',
};

const nowISO = () => new Date().toISOString();
const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const readStorage = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const writeStorage = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const getCurrentUser = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.auth);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const ensureUsers = () => {
  const users = readStorage(STORAGE_KEYS.users);
  if (users.length === 0) {
    const defaultAdmin = {
      id: 'local_admin',
      email: 'admin@local',
      full_name: 'Admin Local',
      role: 'admin',
      created_date: nowISO(),
    };
    writeStorage(STORAGE_KEYS.users, [defaultAdmin]);
    return [defaultAdmin];
  }
  return users;
};

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
        const leads = readStorage(STORAGE_KEYS.leads);
        return sortByOrder(leads, order);
      },
      create: async (data) => {
        const leads = readStorage(STORAGE_KEYS.leads);
        const id = generateId();
        const now = nowISO();
        const currentUser = getCurrentUser();
        const newLead = {
          id,
          created_date: now,
          updated_date: now,
          resolved: false,
          last_message_preview: '',
          attendant_type: 'ia',
          source: 'whatsapp',
          tags: [],
          needs_human: false,
          ...data,
          created_by: data.created_by || currentUser?.email || 'admin@local',
        };
        leads.unshift(newLead);
        writeStorage(STORAGE_KEYS.leads, leads);
        return newLead;
      },
      update: async (id, data) => {
        const leads = readStorage(STORAGE_KEYS.leads);
        const idx = leads.findIndex((l) => String(l.id) === String(id));
        if (idx === -1) throw new Error('Lead not found');
        leads[idx] = { ...leads[idx], ...data, updated_date: nowISO() };
        writeStorage(STORAGE_KEYS.leads, leads);
        return leads[idx];
      },
      delete: async (id) => {
        const leads = readStorage(STORAGE_KEYS.leads);
        const idx = leads.findIndex((l) => String(l.id) === String(id));
        if (idx === -1) throw new Error('Lead not found');
        const [removed] = leads.splice(idx, 1);
        writeStorage(STORAGE_KEYS.leads, leads);
        return removed;
      },
      filter: async (criteria = {}, order) => {
        let leads = readStorage(STORAGE_KEYS.leads);
        leads = filterItems(leads, criteria);
        return sortByOrder(leads, order);
      },
    },
    Message: {
      create: async (data) => {
        const messages = readStorage(STORAGE_KEYS.messages);
        const id = generateId();
        const now = nowISO();
        const message = {
          id,
          created_date: now,
          ...data,
        };
        messages.push(message);
        writeStorage(STORAGE_KEYS.messages, messages);
        return message;
      },
      filter: async (criteria = {}, order) => {
        let messages = readStorage(STORAGE_KEYS.messages);
        messages = filterItems(messages, criteria);
        return sortByOrder(messages, order);
      },
    },
    Automation: {
      list: async (order) => {
        const items = readStorage(STORAGE_KEYS.automations);
        return sortByOrder(items, order);
      },
      create: async (data) => {
        const items = readStorage(STORAGE_KEYS.automations);
        const id = generateId();
        const now = nowISO();
        const automation = {
          id,
          created_date: now,
          status: 'pending',
          ...data,
        };
        items.unshift(automation);
        writeStorage(STORAGE_KEYS.automations, items);
        return automation;
      },
      update: async (id, data) => {
        const items = readStorage(STORAGE_KEYS.automations);
        const idx = items.findIndex((i) => String(i.id) === String(id));
        if (idx === -1) throw new Error('Automation not found');
        items[idx] = { ...items[idx], ...data, updated_date: nowISO() };
        writeStorage(STORAGE_KEYS.automations, items);
        return items[idx];
      },
      delete: async (id) => {
        const items = readStorage(STORAGE_KEYS.automations);
        const idx = items.findIndex((i) => String(i.id) === String(id));
        if (idx === -1) throw new Error('Automation not found');
        const [removed] = items.splice(idx, 1);
        writeStorage(STORAGE_KEYS.automations, items);
        return removed;
      },
    },
    User: {
      list: async () => {
        return ensureUsers();
      },
      update: async (id, data) => {
        const users = ensureUsers();
        const idx = users.findIndex((user) => String(user.id) === String(id));
        if (idx === -1) throw new Error('User not found');
        users[idx] = { ...users[idx], ...data, updated_date: nowISO() };
        writeStorage(STORAGE_KEYS.users, users);
        return users[idx];
      },
      delete: async (id) => {
        const users = ensureUsers();
        const idx = users.findIndex((user) => String(user.id) === String(id));
        if (idx === -1) throw new Error('User not found');
        const [removed] = users.splice(idx, 1);
        writeStorage(STORAGE_KEYS.users, users);
        return removed;
      },
    },
  },

  auth: {
    me: async () => {
      const currentUser = getCurrentUser();
      if (currentUser) return currentUser;
      const users = ensureUsers();
      return users[0];
    },
    logout: () => {
      localStorage.removeItem(STORAGE_KEYS.auth);
    },
    redirectToLogin: () => {
      window.location.href = '/login';
    },
  },

  integrations: {
    Core: {
      UploadFile: async ({ file }) => {
        if (!file) return { file_url: '' };
        return { file_url: URL.createObjectURL(file) };
      },
      InvokeLLM: async (input) => buildMockResponse(input),
    },
  },

  users: {
    inviteUser: async (email, role = 'user') => {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) throw new Error('Email inválido');
      const users = ensureUsers();
      if (users.some((u) => u.email?.toLowerCase() === normalizedEmail)) {
        throw new Error('Usuário já convidado');
      }
      const newUser = {
        id: generateId(),
        email: normalizedEmail,
        full_name: normalizedEmail.split('@')[0],
        role,
        invited_date: nowISO(),
        status: 'invited',
      };
      users.push(newUser);
      writeStorage(STORAGE_KEYS.users, users);
      return newUser;
    },
  },
};

export default base44;
