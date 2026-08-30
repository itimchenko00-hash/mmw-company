const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'leads.json');

function ensureDatabase() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, '[]\n', 'utf8');
    }
}

function readLeads() {
    ensureDatabase();

    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch {
        return [];
    }
}

function writeLeads(leads) {
    ensureDatabase();

    const tempFile = DB_FILE + '.tmp';

    fs.writeFileSync(
        tempFile,
        JSON.stringify(leads, null, 2),
        'utf8'
    );

    fs.renameSync(tempFile, DB_FILE);
}

function generateLeadNumber(leads) {
    const year = new Date().getFullYear();

    const currentYear = leads.filter(
        lead => lead.number && lead.number.startsWith(`MMW-${year}-`)
    );

    const next = currentYear.length + 1;

    return `MMW-${year}-${String(next).padStart(4, '0')}`;
}

function createLead(data) {
    const leads = readLeads();

    const now = new Date();

    const lead = {
        accessToken: crypto.randomBytes(32).toString('hex'),
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,

        number: generateLeadNumber(leads),

        createdAt: now.toISOString(),

        status: 'new',

        client: {
            name: data.name || '',
            phone: data.phone || '',
            email: data.email || '',
            company: data.company || ''
        },

        project: {
            name: data.project || '',
            region: data.region || ''
        },

        package: {
            name: data.packageName || '',
            price: data.packagePrice || ''
        },

        extras: Array.isArray(data.extras)
            ? data.extras
            : [],

        budget: data.budget || '',

        message: data.message || '',

        notifications: {
            email: false,
            telegram: false
        },

        history: [
            {
                status: 'new',
                date: now.toISOString(),
                comment: 'Заявка создана'
            }
        ]
    };

    leads.unshift(lead);

    writeLeads(leads);

    return lead;
}

function updateNotifications(id, notifications) {
    const leads = readLeads();

    const lead = leads.find(item => item.id === id);

    if (!lead) {
        return null;
    }

    lead.notifications = {
        ...lead.notifications,
        ...notifications
    };

    writeLeads(leads);

    return lead;
}

function updateStatus(id, status, comment = '') {
    const allowedStatuses = [
        'new',
        'review',
        'contacted',
        'working',
        'completed',
        'cancelled'
    ];

    if (!allowedStatuses.includes(status)) {
        return null;
    }

    const leads = readLeads();

    const lead = leads.find(item => item.id === id);

    if (!lead) {
        return null;
    }

    lead.status = status;

    lead.history.push({
        status,
        date: new Date().toISOString(),
        comment
    });

    writeLeads(leads);

    return lead;
}

function getLead(id) {
    const leads = readLeads();

    return leads.find(item => item.id === id) || null;
}

function getLeads(filters = {}) {
    let leads = readLeads();

    if (filters.status && filters.status !== 'all') {
        leads = leads.filter(
            lead => lead.status === filters.status
        );
    }

    if (filters.search) {
        const search = String(filters.search).toLowerCase();

        leads = leads.filter(lead =>
            JSON.stringify(lead)
                .toLowerCase()
                .includes(search)
        );
    }

    return leads;
}

module.exports = {
    createLead,
    updateNotifications,
    updateStatus,
    getLead,
    getLeads
};
