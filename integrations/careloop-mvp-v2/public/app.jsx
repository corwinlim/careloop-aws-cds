const { useState, useEffect, useCallback, useMemo } = React;

// ============================================================
// API HELPERS
// ============================================================

const API_BASE = '/api';

function api(path, options = {}) {
  const merchantType = localStorage.getItem('careloop_merchant') || 'boarding_groomer';
  const headers = {
    'Content-Type': 'application/json',
    'x-merchant-type': merchantType,
    'x-user-name': 'Jamie (Staff)',
    ...options.headers,
  };
  return fetch(API_BASE + path, { ...options, headers }).then(r => r.json());
}

// ============================================================
// MERCHANT TYPE CONFIG
// ============================================================

const MERCHANT_CONFIG = {
  boarding_groomer: {
    id: 'boarding_groomer',
    name: 'Paw Seasons Pet Hotel & Spa',
    subtitle: 'Boarding & Grooming Care',
    icon: '🏨',
    accent: 'from-emerald-500 to-teal-600',
    accentLight: 'bg-emerald-50 text-emerald-700',
    accentBorder: 'border-emerald-200',
    navColor: 'bg-emerald-900',
    primaryButton: 'bg-emerald-600 hover:bg-emerald-700',
    roleLabel: 'Pet Care Associate',
  },
  vet_clinic: {
    id: 'vet_clinic',
    name: 'Riverton Veterinary Clinic',
    subtitle: 'Veterinary Care',
    icon: '🏥',
    accent: 'from-blue-500 to-indigo-600',
    accentLight: 'bg-blue-50 text-blue-700',
    accentBorder: 'border-blue-200',
    navColor: 'bg-blue-900',
    primaryButton: 'bg-blue-600 hover:bg-blue-700',
    roleLabel: 'Veterinary Technician',
  },
  pet_store: {
    id: 'pet_store',
    name: 'PawPrima Pet Nutrition',
    subtitle: 'Pet Food & Supplies',
    icon: '🛒',
    accent: 'from-amber-500 to-orange-600',
    accentLight: 'bg-amber-50 text-amber-700',
    accentBorder: 'border-amber-200',
    navColor: 'bg-amber-900',
    primaryButton: 'bg-amber-600 hover:bg-amber-700',
    roleLabel: 'Nutrition Advisor',
  },
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFullDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleString('en-US', { 
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

const STATUS_STYLES = {
  draft: 'bg-gray-100 text-gray-700',
  pending_approval: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
  sending: 'bg-purple-100 text-purple-700',
  sent: 'bg-green-100 text-green-700',
  send_failed: 'bg-red-100 text-red-700',
  send_blocked: 'bg-red-100 text-red-700',
  awaiting_response: 'bg-teal-100 text-teal-700',
  responded: 'bg-indigo-100 text-indigo-700',
  resolved: 'bg-gray-100 text-gray-700',
  active: 'bg-green-100 text-green-700',
  disabled: 'bg-gray-100 text-gray-500',
  not_found: 'bg-red-100 text-red-600',
  high: 'bg-red-100 text-red-700',
  normal: 'bg-gray-100 text-gray-600',
};

const STATUS_LABELS = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  sending: 'Sending...',
  sent: 'Sent',
  send_failed: 'Send Failed',
  send_blocked: 'Blocked',
  awaiting_response: 'Awaiting Response',
  responded: 'Responded',
  resolved: 'Resolved',
  active: 'Active',
  disabled: 'Disabled',
  not_found: 'Not on Whitelist',
};

function StatusBadge({ status, size = 'sm' }) {
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'} ${sizeClass}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

// ============================================================
// LOGIN PAGE
// ============================================================

function LoginPage({ onLogin }) {
  const [hoveredCard, setHoveredCard] = useState(null);

  const handleDemoLogin = () => {
    localStorage.setItem('careloop_merchant', 'boarding_groomer');
    onLogin('boarding_groomer');
  };

  const handleMerchantLogin = (type) => {
    localStorage.setItem('careloop_merchant', type);
    onLogin(type);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 flex flex-col">
      {/* Header */}
      <div className="px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xl shadow-lg">
            🔄
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">CareLoop</h1>
            <p className="text-xs text-gray-500">Follow-up Care Platform</p>
          </div>
        </div>
      </div>

      {/* Hero + Login Cards */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-5xl w-full">
          {/* Hero Text */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-100/60 text-emerald-700 rounded-full text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Hackathon MVP v2
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">
              The safe way to follow up with pet owners
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Approval-gated, whitelist-secured, fully audited follow-up messaging 
              for pet care businesses. Non-diagnostic, compliant, and kind.
            </p>
          </div>

          {/* Demo Login — Primary */}
          <div className="mb-8">
            <button
              onClick={handleDemoLogin}
              className="w-full group relative overflow-hidden bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl p-6 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.01]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl">
                    🚀
                  </div>
                  <div className="text-left">
                    <div className="text-xl font-bold">Demo Login</div>
                    <div className="text-emerald-100 text-sm">Quick access — Boarding / Groomer demo (primary scenario)</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium bg-white/20 px-4 py-2 rounded-lg backdrop-blur">
                  Enter Demo <span>→</span>
                </div>
              </div>
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-sm text-gray-500 font-medium">Or select a merchant type</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          {/* Merchant Type Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {Object.values(MERCHANT_CONFIG).map((m) => (
              <button
                key={m.id}
                onClick={() => handleMerchantLogin(m.id)}
                onMouseEnter={() => setHoveredCard(m.id)}
                onMouseLeave={() => setHoveredCard(null)}
                className={`group text-left bg-white rounded-2xl p-6 border-2 transition-all duration-200 ${
                  hoveredCard === m.id 
                    ? 'border-emerald-300 shadow-lg scale-[1.02]' 
                    : 'border-gray-100 shadow-sm hover:border-gray-200'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${m.accent} flex items-center justify-center text-2xl mb-4 shadow-md`}>
                  {m.icon}
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{m.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{m.subtitle}</p>
                <div className={`text-sm font-medium flex items-center gap-1 transition-all ${
                  hoveredCard === m.id ? 'text-emerald-600' : 'text-gray-400'
                }`}>
                  Login as {m.roleLabel} 
                  <span className={hoveredCard === m.id ? 'translate-x-1 transition-transform' : 'transition-transform'}>→</span>
                </div>
              </button>
            ))}
          </div>

          {/* Security badges */}
          <div className="mt-12 flex flex-wrap justify-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100">
              <span className="text-green-500">✓</span>
              <span className="text-sm text-gray-600">Approval-gated</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100">
              <span className="text-green-500">✓</span>
              <span className="text-sm text-gray-600">Whitelist-secured</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100">
              <span className="text-green-500">✓</span>
              <span className="text-sm text-gray-600">Append-only audit</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100">
              <span className="text-green-500">✓</span>
              <span className="text-sm text-gray-600">Non-diagnostic</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-6 text-center text-sm text-gray-400">
        CareLoop MVP v2.0.0 — Hackathon Demo — Built with ❤️ for pet care
      </div>
    </div>
  );
}

// ============================================================
// SIDEBAR NAVIGATION
// ============================================================

function Sidebar({ currentPage, setCurrentPage, merchantType, onLogout }) {
  const config = MERCHANT_CONFIG[merchantType];
  
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'care-contexts', label: 'Care Contexts', icon: '🐾' },
    { id: 'approval-queue', label: 'Approval Queue', icon: '✅' },
    { id: 'timelines', label: 'Timelines / Audit', icon: '📋' },
    { id: 'mock-outbox', label: 'Mock Outbox', icon: '📧' },
    { id: 'whitelist', label: 'Whitelist', icon: '🛡️' },
  ];

  return (
    <aside className={`w-64 ${config.navColor} text-white flex flex-col h-screen fixed left-0 top-0 z-40`}>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center text-lg">
            🔄
          </div>
          <div>
            <h1 className="text-base font-bold">CareLoop</h1>
            <p className="text-xs text-white/50">{config.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Merchant info */}
      <div className="px-5 py-4 border-b border-white/10">
        <div className="text-xs text-white/50 uppercase tracking-wider font-semibold mb-1.5">
          {config.icon} Current Merchant
        </div>
        <div className="text-sm font-semibold text-white">{config.name}</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              currentPage === item.id
                ? 'bg-white/15 text-white'
                : 'text-white/60 hover:bg-white/5 hover:text-white/90'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
            {item.id === 'approval-queue' && (
              <span className="ml-auto bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                Pending
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 py-3 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-semibold">
            J
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">Jamie Rivera</div>
            <div className="text-xs text-white/50 truncate">{config.roleLabel} · demo</div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/60 hover:bg-white/5 hover:text-white/90 transition-all"
        >
          <span>🚪</span>
          Switch merchant type
        </button>
      </div>
    </aside>
  );
}

// ============================================================
// DASHBOARD
// ============================================================

function DashboardPage({ merchantType }) {
  const [stats, setStats] = useState(null);
  const [recentContexts, setRecentContexts] = useState([]);
  const [auditIntegrity, setAuditIntegrity] = useState(null);

  const config = MERCHANT_CONFIG[merchantType];

  useEffect(() => {
    api('/dashboard/stats').then(r => setStats(r.data));
    api('/care-contexts').then(r => setRecentContexts(r.data.slice(0, 3)));
    api('/audit/integrity').then(r => setAuditIntegrity(r.data));
  }, [merchantType]);

  if (!stats) return <div className="p-8 text-gray-500">Loading...</div>;

  const statCards = [
    { label: 'Total Care Contexts', value: stats.total_care_contexts, icon: '🐾', color: 'bg-blue-50 text-blue-600' },
    { label: 'Pending Approval', value: stats.pending_approval, icon: '⏳', color: 'bg-amber-50 text-amber-600' },
    { label: 'Messages Sent', value: stats.messages_sent, icon: '✉️', color: 'bg-green-50 text-green-600' },
    { label: 'Awaiting Response', value: stats.awaiting_response, icon: '💬', color: 'bg-teal-50 text-teal-600' },
    { label: 'High Risk', value: stats.high_risk_contexts, icon: '⚠️', color: 'bg-red-50 text-red-600' },
    { label: 'Whitelist Active', value: stats.whitelist_entries, icon: '🛡️', color: 'bg-purple-50 text-purple-600' },
  ];

  return (
    <div className="fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard</h1>
        <p className="text-gray-500 text-sm">
          {config.icon} {config.name} — overview of your care follow-ups
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {statCards.map(card => (
          <div key={card.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className={`w-9 h-9 rounded-lg ${card.color} flex items-center justify-center text-lg mb-3`}>
              {card.icon}
            </div>
            <div className="text-2xl font-bold text-gray-900">{card.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Care Contexts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Recent Care Contexts</h3>
            <span className="text-xs text-gray-400">latest</span>
          </div>
          <div className="divide-y divide-gray-50">
            {recentContexts.map(ctx => (
              <div key={ctx.id} className="px-5 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-lg">
                  🐾
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 text-sm truncate">{ctx.pet_name}</span>
                    <StatusBadge status={ctx.risk_level} size="sm" />
                  </div>
                  <div className="text-xs text-gray-500 truncate">{ctx.context_type} · {ctx.owner_name}</div>
                </div>
                <StatusBadge status={ctx.whitelist_status} size="sm" />
              </div>
            ))}
          </div>
        </div>

        {/* Security Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Security Gates Status</h3>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
              <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">✓</div>
              <div className="flex-1">
                <div className="text-sm font-medium text-green-900">Approval Gate</div>
                <div className="text-xs text-green-600">All sends require approval</div>
              </div>
              <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded">Active</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
              <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">✓</div>
              <div className="flex-1">
                <div className="text-sm font-medium text-green-900">Whitelist Check</div>
                <div className="text-xs text-green-600">Dual check: intake + send time</div>
              </div>
              <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded">Active</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
              <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">✓</div>
              <div className="flex-1">
                <div className="text-sm font-medium text-green-900">Append-only Audit</div>
                <div className="text-xs text-green-600">{auditIntegrity?.total_entries || 0} events, no update/delete API</div>
              </div>
              <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded">Verified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CARE CONTEXTS LIST
// ============================================================

function CareContextsPage({ merchantType, onSelectContext }) {
  const [contexts, setContexts] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCtx, setNewCtx] = useState({ petName: '', petType: '', ownerName: '', ownerEmail: '', contextType: '', contextDetails: '' });
  const [addError, setAddError] = useState(null);
  const [addSuccess, setAddSuccess] = useState(false);

  const loadContexts = useCallback(() => {
    api('/care-contexts').then(r => setContexts(r.data));
  }, [merchantType]);

  useEffect(() => { loadContexts(); }, [loadContexts]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setAddError(null);
    setAddSuccess(false);
    try {
      const res = await api('/care-contexts', {
        method: 'POST',
        body: JSON.stringify(newCtx),
      });
      if (res.error) {
        setAddError(res.error);
      } else {
        setAddSuccess(true);
        setNewCtx({ petName: '', petType: '', ownerName: '', ownerEmail: '', contextType: '', contextDetails: '' });
        loadContexts();
        setTimeout(() => setShowAddModal(false), 1000);
      }
    } catch (err) {
      setAddError('Failed to create care context');
    }
  };

  return (
    <div className="fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Care Contexts</h1>
          <p className="text-gray-500 text-sm">All active care journeys and their status</p>
        </div>
        <button
          onClick={() => { setShowAddModal(true); setAddError(null); setAddSuccess(false); }}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          + New Context
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Pet</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Owner</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Type</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Risk</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Whitelist</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {contexts.map(ctx => (
              <tr
                key={ctx.id}
                onClick={() => onSelectContext(ctx.id)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-base">🐾</div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{ctx.pet_name}</div>
                      <div className="text-xs text-gray-500">{ctx.pet_type}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="text-sm text-gray-900">{ctx.owner_name}</div>
                  <div className="text-xs text-gray-500 font-mono">{ctx.owner_email}</div>
                </td>
                <td className="px-5 py-4 text-sm text-gray-600">{ctx.context_type}</td>
                <td className="px-5 py-4">
                  <StatusBadge status={ctx.risk_level} size="sm" />
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={ctx.whitelist_status} size="sm" />
                </td>
                <td className="px-5 py-4 text-sm text-gray-500">{formatDate(ctx.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 slide-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">New Care Context</h3>
            {addError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                ⚠️ {addError}
                <div className="text-xs text-red-500 mt-1">The owner email must be on the active whitelist before creating a care context.</div>
              </div>
            )}
            {addSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                ✓ Care context created successfully!
              </div>
            )}
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Pet Name</label>
                  <input
                    type="text" value={newCtx.petName}
                    onChange={e => setNewCtx({...newCtx, petName: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Pet Type</label>
                  <input
                    type="text" value={newCtx.petType}
                    onChange={e => setNewCtx({...newCtx, petType: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    placeholder="e.g. Golden Retriever, 4y F"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Owner Name</label>
                  <input
                    type="text" value={newCtx.ownerName}
                    onChange={e => setNewCtx({...newCtx, ownerName: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Owner Email</label>
                  <input
                    type="email" value={newCtx.ownerEmail}
                    onChange={e => setNewCtx({...newCtx, ownerEmail: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono"
                    placeholder="must be on whitelist"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Context Type</label>
                <input
                  type="text" value={newCtx.contextType}
                  onChange={e => setNewCtx({...newCtx, contextType: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="e.g. grooming_appointment"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Details</label>
                <textarea
                  value={newCtx.contextDetails}
                  onChange={e => setNewCtx({...newCtx, contextDetails: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  rows={2}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Create Context
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// CARE CONTEXT DETAIL
// ============================================================

function CareContextDetailPage({ contextId, onBack }) {
  const [ctx, setCtx] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionMessage, setActionMessage] = useState(null);
  const [actionError, setActionError] = useState(null);

  const loadContext = useCallback(() => {
    api(`/care-contexts/${contextId}`).then(r => setCtx(r.data));
  }, [contextId]);

  useEffect(() => { loadContext(); }, [loadContext]);

  const handleApprove = async (msgId) => {
    setActionMessage(null);
    setActionError(null);
    const res = await api(`/messages/${msgId}/approve`, { method: 'POST', body: JSON.stringify({ note: 'Approved' }) });
    if (res.error) {
      setActionError(res.error);
    } else {
      setActionMessage('Message approved. Sending...');
      // Auto-send after approval for demo
      setTimeout(async () => {
        const sendRes = await api(`/messages/${msgId}/send`, { method: 'POST' });
        if (sendRes.error) {
          setActionError(`Send blocked: ${sendRes.error}`);
        } else {
          setActionMessage('Message approved and sent successfully!');
        }
        loadContext();
      }, 800);
    }
    loadContext();
  };

  const handleReject = async (msgId) => {
    setActionMessage(null);
    setActionError(null);
    const res = await api(`/messages/${msgId}/reject`, { 
      method: 'POST', 
      body: JSON.stringify({ reason: rejectReason || 'No reason provided' }) 
    });
    if (res.error) {
      setActionError(res.error);
    } else {
      setActionMessage('Message rejected.');
      setShowRejectModal(false);
      setRejectReason('');
    }
    loadContext();
  };

  const handleSubmit = async (msgId) => {
    const res = await api(`/messages/${msgId}/submit`, { method: 'POST' });
    loadContext();
  };

  if (!ctx) return <div className="p-8 text-gray-500">Loading...</div>;

  const messages = ctx.messages || [];
  const timeline = ctx.timeline || [];
  const hasHighRisk = ctx.risk_level === 'high';
  const hasConcerningResponse = (ctx.responses || []).some(r => r.sentiment === 'concerning');
  const shouldShowDanger = hasHighRisk || hasConcerningResponse;

  return (
    <div className="fade-in">
      <button onClick={onBack} className="mb-4 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
        ← Back to Care Contexts
      </button>

      {/* Danger Banner */}
      {shouldShowDanger && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 pulse-red">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-xl flex-shrink-0">
            ⚠️
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-red-900">Danger Signals Detected</h3>
            <p className="text-sm text-red-700 mt-1">
              This care context has been flagged with concerning signals. 
              <span className="font-semibold"> Recommend immediate veterinary contact.</span>
            </p>
            <div className="mt-2 flex gap-2">
              <button className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">
                📞 Contact Veterinarian
              </button>
              <button className="px-3 py-1.5 bg-white text-red-700 text-sm font-medium rounded-lg border border-red-200 hover:bg-red-50 transition-colors">
                View Red Flags
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Context header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-2xl">
              🐾
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900">{ctx.pet_name}</h1>
                <StatusBadge status={ctx.risk_level} size="sm" />
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{ctx.pet_type}</p>
              <div className="flex items-center gap-4 mt-2">
                <div>
                  <span className="text-xs text-gray-400">Owner:</span>
                  <span className="text-sm text-gray-700 ml-1.5 font-medium">{ctx.owner_name}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400">Email:</span>
                  <span className="text-sm font-mono text-gray-600 ml-1.5">{ctx.owner_email}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400">Whitelist:</span>
                  <span className="ml-1.5"><StatusBadge status={ctx.whitelist_status} size="sm" /></span>
                </div>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400 uppercase">Context Type</div>
            <div className="text-sm font-medium text-gray-700 mt-0.5">{ctx.context_type}</div>
            <div className="text-xs text-gray-400 mt-2">Created {formatDate(ctx.created_at)}</div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="text-xs font-medium text-gray-400 uppercase mb-1">Context Details</div>
          <p className="text-sm text-gray-600">{ctx.context_details}</p>
        </div>
      </div>

      {/* Action feedback */}
      {actionMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 fade-in">
          ✓ {actionMessage}
        </div>
      )}
      {actionError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 fade-in">
          ⚠️ {actionError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Follow-up Messages</h2>
          {messages.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
              <div className="text-3xl mb-2">💌</div>
              <p className="text-gray-500 text-sm">No messages yet</p>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={msg.status} size="sm" />
                    <span className="text-xs text-gray-500">{formatDate(msg.created_at)}</span>
                  </div>
                  {msg.status === 'pending_approval' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApprove(msg.id)}
                        className="px-3 py-1 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => { setShowRejectModal(true); /* store msg id */ window._rejectMsgId = msg.id; }}
                        className="px-3 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                      >
                        ✕ Reject
                      </button>
                    </div>
                  )}
                  {msg.status === 'draft' && (
                    <button
                      onClick={() => handleSubmit(msg.id)}
                      className="px-3 py-1 text-xs font-medium bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors"
                    >
                      Submit for Approval
                    </button>
                  )}
                  {msg.status === 'rejected' && msg.rejection_reason && (
                    <span className="text-xs text-red-500">
                      Reason: {msg.rejection_reason}
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-2">{msg.title}</h3>
                  <div className="text-sm text-gray-600 whitespace-pre-line leading-relaxed bg-gray-50 rounded-lg p-4">
                    {msg.body}
                  </div>
                  {msg.risk_flags && msg.risk_flags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {msg.risk_flags.map(flag => (
                        <span key={flag} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100">
                          ⚠️ {flag.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {/* Responses */}
                {msg.responses && msg.responses.length > 0 && (
                  <div className="border-t border-gray-100 px-5 py-4 bg-teal-50/30">
                    <div className="text-xs font-semibold text-teal-700 uppercase tracking-wider mb-2">
                      Owner Response
                    </div>
                    {msg.responses.map(resp => (
                      <div key={resp.id} className="bg-white rounded-lg p-3 border border-teal-100">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs text-gray-500">{resp.from}</span>
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                            resp.sentiment === 'concerning' ? 'bg-red-100 text-red-700' :
                            resp.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {resp.sentiment}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{resp.response_text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Timeline */}
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline / Audit</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="space-y-4">
              {timeline.length === 0 ? (
                <p className="text-gray-500 text-sm">No events yet</p>
              ) : (
                timeline.map((event, idx) => (
                  <div key={event.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${
                        event.event_type.includes('reject') || event.event_type.includes('blocked') || event.event_type.includes('fail')
                          ? 'bg-red-400'
                          : event.event_type.includes('approve') || event.event_type.includes('sent')
                          ? 'bg-green-400'
                          : event.event_type.includes('response')
                          ? 'bg-teal-400'
                          : 'bg-gray-300'
                      }`}></div>
                      {idx < timeline.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1"></div>}
                    </div>
                    <div className="flex-1 pb-3">
                      <div className="text-sm font-medium text-gray-800">
                        {event.event_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {formatFullDate(event.timestamp)} · by {event.actor}
                      </div>
                      {event.metadata && event.metadata.reason && (
                        <div className="text-xs text-gray-500 mt-1 bg-gray-50 rounded px-2 py-1">
                          Reason: {event.metadata.reason}
                        </div>
                      )}
                      {event.metadata && event.metadata.from_state && event.metadata.to_state && (
                        <div className="text-xs text-gray-400 mt-1">
                          {event.metadata.from_state} → <span className="font-medium text-gray-600">{event.metadata.to_state}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-xs text-gray-400 flex items-center gap-1.5">
                <span>🔒</span>
                Append-only audit log — entries cannot be modified or deleted
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowRejectModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 slide-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Reject Message</h3>
            <p className="text-sm text-gray-600 mb-4">Please provide a reason for rejecting this follow-up message.</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
              rows={3}
              placeholder="e.g. Owner opted out of follow-up communications"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(window._rejectMsgId)}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// APPROVAL QUEUE
// ============================================================

function ApprovalQueuePage({ merchantType, onSelectMessage }) {
  const [messages, setMessages] = useState([]);
  const [actionMsg, setActionMsg] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadMessages = useCallback(() => {
    api('/messages?status=pending_approval').then(r => setMessages(r.data));
  }, [merchantType]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  const handleApprove = async (msgId) => {
    setActionMsg(`Approving message ${msgId}...`);
    setActionError(null);
    try {
      const res = await api(`/messages/${msgId}/approve`, { method: 'POST', body: JSON.stringify({ note: 'Approved' }) });
      if (res.error) {
        setActionError(res.error);
      } else {
        setActionMsg('Approved! Sending message...');
        setTimeout(async () => {
          const sendRes = await api(`/messages/${msgId}/send`, { method: 'POST' });
          if (sendRes.error) {
            setActionError(`Send blocked: ${sendRes.error}`);
            setActionMsg(null);
          } else {
            setActionMsg('Message approved and sent successfully!');
            setTimeout(() => setActionMsg(null), 2000);
          }
          loadMessages();
        }, 800);
      }
    } catch (err) {
      setActionError('Failed to approve message');
    }
    loadMessages();
  };

  const handleReject = async (msgId) => {
    const reason = rejectReason || 'No reason provided';
    const res = await api(`/messages/${msgId}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
    if (res.error) {
      setActionError(res.error);
    } else {
      setActionMsg('Message rejected.');
      setTimeout(() => setActionMsg(null), 2000);
    }
    setRejectingId(null);
    setRejectReason('');
    loadMessages();
  };

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Approval Queue</h1>
        <p className="text-gray-500 text-sm">Review and approve follow-up messages before they are sent</p>
      </div>

      {actionMsg && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 fade-in">
          ✓ {actionMsg}
        </div>
      )}
      {actionError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 fade-in">
          ⚠️ {actionError}
        </div>
      )}

      {/* Queue stats */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center text-xl">⏳</div>
        <div className="flex-1">
          <div className="font-bold text-amber-900">{messages.length} drafts awaiting approval</div>
          <div className="text-sm text-amber-700">All messages must be reviewed before they can be sent to pet owners</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-amber-600">{messages.length}</div>
          <div className="text-xs text-amber-500">pending</div>
        </div>
      </div>

      {messages.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <h3 className="font-semibold text-gray-900 mb-1">All caught up!</h3>
          <p className="text-gray-500 text-sm">No messages awaiting approval</p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden fade-in">
              <div className="px-5 py-4 flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <StatusBadge status={msg.status} size="sm" />
                    <span className="text-xs text-gray-400">for {msg.pet_name}</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-400 font-mono">{msg.owner_email}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900">{msg.title}</h3>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleApprove(msg.id)}
                    className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5"
                  >
                    <span>✓</span> Approve
                  </button>
                  <button
                    onClick={() => setRejectingId(msg.id)}
                    className="px-4 py-2 text-sm font-medium bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1.5"
                  >
                    <span>✕</span> Reject
                  </button>
                </div>
              </div>
              <div className="px-5 pb-4">
                <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 line-clamp-3 whitespace-pre-line">
                  {msg.body}
                </div>
              </div>

              {/* Reject input */}
              {rejectingId === msg.id && (
                <div className="px-5 py-3 bg-red-50 border-t border-red-100 fade-in">
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-red-700 mb-1">Rejection Reason</label>
                      <input
                        type="text"
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                        placeholder="e.g. Owner opted out, inappropriate content, etc."
                        autoFocus
                      />
                    </div>
                    <button
                      onClick={() => handleReject(msg.id)}
                      className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Confirm Reject
                    </button>
                    <button
                      onClick={() => { setRejectingId(null); setRejectReason(''); }}
                      className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Approval gate info */}
      <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <div className="flex items-start gap-3">
          <div className="text-xl">🔒</div>
          <div>
            <h4 className="font-medium text-gray-900 text-sm">Approval Gate — Server-Enforced</h4>
            <p className="text-xs text-gray-500 mt-0.5">
              The message send endpoint checks for a valid approval_id before sending. Messages cannot be sent 
              without going through the approval flow. This is enforced in the backend service layer, 
              not just in the UI.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TIMELINES / AUDIT
// ============================================================

function TimelinesPage({ merchantType }) {
  const [auditLogs, setAuditLogs] = useState([]);
  const [integrity, setIntegrity] = useState(null);

  useEffect(() => {
    api('/audit?limit=50').then(r => setAuditLogs(r.data));
    api('/audit/integrity').then(r => setIntegrity(r.data));
  }, [merchantType]);

  const getEventIcon = (eventType) => {
    if (eventType.includes('created')) return '➕';
    if (eventType.includes('approved') || eventType.includes('submit')) return '✅';
    if (eventType.includes('rejected')) return '❌';
    if (eventType.includes('sent') || eventType.includes('sending')) return '📧';
    if (eventType.includes('blocked')) return '🚫';
    if (eventType.includes('response')) return '💬';
    if (eventType.includes('whitelist')) return '🛡️';
    return '📋';
  };

  const getEventColor = (eventType) => {
    if (eventType.includes('reject') || eventType.includes('blocked') || eventType.includes('fail')) return 'bg-red-50 border-red-100 text-red-700';
    if (eventType.includes('approve') || eventType.includes('sent')) return 'bg-green-50 border-green-100 text-green-700';
    if (eventType.includes('response')) return 'bg-teal-50 border-teal-100 text-teal-700';
    if (eventType.includes('whitelist')) return 'bg-purple-50 border-purple-100 text-purple-700';
    return 'bg-gray-50 border-gray-100 text-gray-700';
  };

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Timelines / Audit Log</h1>
        <p className="text-gray-500 text-sm">Complete, append-only record of all system events</p>
      </div>

      {/* Integrity panel */}
      {integrity && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-lg">🔒</div>
              <div>
                <h3 className="font-semibold text-gray-900">Append-only Audit Log</h3>
                <p className="text-sm text-gray-500">
                  {integrity.total_entries} total entries · 
                  No update or delete API endpoints exist · 
                  Entries can only be appended
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium">
              <span>✓</span> Verified
            </div>
          </div>
        </div>
      )}

      {/* Event list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">All Events</h3>
          <span className="text-xs text-gray-400">latest 50</span>
        </div>
        <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
          {auditLogs.map(entry => (
            <div key={entry.id} className="px-5 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${getEventColor(entry.event_type)}`}>
                {getEventIcon(entry.event_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 text-sm capitalize">
                    {entry.event_type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">{entry.entity_id}</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {formatFullDate(entry.timestamp)} · by {entry.actor}
                </div>
                {entry.metadata && entry.metadata.reason && (
                  <div className="text-xs text-red-600 mt-1">
                    Reason: {entry.metadata.reason}
                  </div>
                )}
                {entry.metadata && entry.metadata.from_state && entry.metadata.to_state && (
                  <div className="text-xs text-gray-400 mt-0.5">
                    {entry.metadata.from_state} → <span className="font-medium text-gray-600">{entry.metadata.to_state}</span>
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-400 font-mono">
                {entry.entity_type}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MOCK OUTBOX
// ============================================================

function MockOutboxPage({ merchantType }) {
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);

  useEffect(() => {
    api('/mock-outbox').then(r => setEmails(r.data));
  }, [merchantType]);

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Mock Outbox</h1>
        <p className="text-gray-500 text-sm">All sent messages captured by Mock SES (demo mode)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Email list */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <span className="font-semibold text-gray-700 text-sm">Sent Emails</span>
              <span className="text-xs text-gray-500">{emails.length} total</span>
            </div>
            <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
              {emails.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-2xl mb-2">📭</div>
                  <p className="text-gray-500 text-sm">No emails sent yet</p>
                </div>
              ) : (
                emails.map(email => (
                  <button
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                      selectedEmail?.id === email.id ? 'bg-teal-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 text-sm truncate">{email.subject}</span>
                    </div>
                    <div className="text-xs text-gray-500 font-mono truncate">{email.to}</div>
                    <div className="text-xs text-gray-400 mt-1">{formatDate(email.sent_at)}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Email preview */}
        <div className="lg:col-span-2">
          {selectedEmail ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                    {selectedEmail.status}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">{selectedEmail.message_id}</span>
                </div>
                <h3 className="font-bold text-gray-900">{selectedEmail.subject}</h3>
              </div>
              <div className="px-5 py-3 border-b border-gray-100 text-sm space-y-1">
                <div className="flex gap-2">
                  <span className="text-gray-400 w-16 flex-shrink-0">From:</span>
                  <span className="text-gray-700 font-mono">{selectedEmail.from}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-400 w-16 flex-shrink-0">To:</span>
                  <span className="text-gray-700 font-mono">{selectedEmail.to}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-400 w-16 flex-shrink-0">Sent:</span>
                  <span className="text-gray-700">{formatFullDate(selectedEmail.sent_at)}</span>
                </div>
              </div>
              <div className="p-5">
                <div className="bg-white border border-gray-200 rounded-lg p-6 whitespace-pre-line text-sm text-gray-700 leading-relaxed">
                  {selectedEmail.body}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center h-80 flex flex-col items-center justify-center">
              <div className="text-4xl mb-3">📧</div>
              <h3 className="font-medium text-gray-700 mb-1">Select an email to view</h3>
              <p className="text-gray-400 text-sm">Click on an email from the list to see its contents</p>
            </div>
          )}
        </div>
      </div>

      {/* Consistency note */}
      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
        <div className="flex items-start gap-3">
          <span className="text-xl">✓</span>
          <div>
            <h4 className="font-medium text-green-900 text-sm">Data Consistency Verified</h4>
            <p className="text-xs text-green-700 mt-0.5">
              Dashboard's "Messages Sent" count is sourced directly from the mock outbox. 
              Every message that passes through the send API is recorded here and the 
              dashboard stats are computed from the same source of truth.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// WHITELIST
// ============================================================

function WhitelistPage({ merchantType }) {
  const [entries, setEntries] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntry, setNewEntry] = useState({ email: '', notes: '' });
  const [addError, setAddError] = useState(null);
  const [addSuccess, setAddSuccess] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const loadEntries = useCallback(() => {
    api('/whitelist').then(r => setEntries(r.data));
  }, [merchantType]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setAddError(null);
    setAddSuccess(false);
    const res = await api('/whitelist', {
      method: 'POST',
      body: JSON.stringify(newEntry),
    });
    if (res.error) {
      setAddError(res.error);
    } else {
      setAddSuccess(true);
      setNewEntry({ email: '', notes: '' });
      loadEntries();
      setTimeout(() => setShowAddModal(false), 800);
    }
  };

  const handleDisable = async (id) => {
    await api(`/whitelist/${id}/disable`, { method: 'POST' });
    loadEntries();
  };

  const runNegativeTest = async () => {
    setTestResult({ status: 'loading' });
    const res = await api('/test/whitelist-blocked');
    setTestResult(res);
  };

  const activeCount = entries.filter(e => e.status === 'active').length;
  const disabledCount = entries.filter(e => e.status === 'disabled').length;

  return (
    <div className="fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Whitelist</h1>
          <p className="text-gray-500 text-sm">Approved recipient email addresses. Every send is checked here first.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runNegativeTest}
            className="px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            🧪 Test Whitelist Block
          </button>
          <button
            onClick={() => { setShowAddModal(true); setAddError(null); setAddSuccess(false); }}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            + Add Email
          </button>
        </div>
      </div>

      {/* Negative test result */}
      {testResult && testResult.status !== 'loading' && (
        <div className={`mb-6 p-4 rounded-xl border fade-in ${
          testResult.result === 'PASS' 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
              testResult.result === 'PASS' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}>
              {testResult.result === 'PASS' ? '✓' : '✕'}
            </div>
            <div className="flex-1">
              <h4 className={`font-bold ${testResult.result === 'PASS' ? 'text-green-900' : 'text-red-900'}`}>
                Whitelist Block Test: {testResult.result}
              </h4>
              <p className={`text-sm mt-1 ${testResult.result === 'PASS' ? 'text-green-700' : 'text-red-700'}`}>
                {testResult.description}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className={`p-2 rounded ${testResult.result === 'PASS' ? 'bg-green-100/50' : 'bg-red-100/50'}`}>
                  <div className="font-medium">Error Code</div>
                  <div className="font-mono mt-0.5">{testResult.error_code}</div>
                </div>
                <div className={`p-2 rounded ${testResult.result === 'PASS' ? 'bg-green-100/50' : 'bg-red-100/50'}`}>
                  <div className="font-medium">HTTP Status</div>
                  <div className="font-mono mt-0.5">{testResult.http_status}</div>
                </div>
              </div>
              {testResult.audit_entry && (
                <div className="mt-2 text-xs">
                  <div className="font-medium mb-1">Audit Entry Written:</div>
                  <div className="font-mono bg-white/50 p-2 rounded border border-green-200">
                    <div>event: {testResult.audit_entry.event_type}</div>
                    <div>id: {testResult.audit_entry.id}</div>
                    <div>check_point: {testResult.audit_entry.metadata.check_point}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {testResult && testResult.status === 'loading' && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <div className="flex items-center gap-2 text-gray-600">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
            Running whitelist block test...
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">Active</div>
          <div className="text-2xl font-bold text-green-600">{activeCount}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">Disabled</div>
          <div className="text-2xl font-bold text-gray-500">{disabledCount}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">Total</div>
          <div className="text-2xl font-bold text-gray-900">{entries.length}</div>
        </div>
      </div>

      {/* Whitelist table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">Allowed Recipients</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-white border-b border-gray-100">
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Email</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Added</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Notes</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {entries.map(entry => (
              <tr key={entry.id}>
                <td className="px-5 py-3">
                  <span className="text-sm font-mono text-gray-800">{entry.email}</span>
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={entry.status} size="sm" />
                </td>
                <td className="px-5 py-3 text-sm text-gray-500">{formatDate(entry.added_at)}</td>
                <td className="px-5 py-3 text-sm text-gray-500 max-w-xs truncate">{entry.notes || '—'}</td>
                <td className="px-5 py-3 text-right">
                  {entry.status === 'active' && (
                    <button
                      onClick={() => handleDisable(entry.id)}
                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      Disable
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Security info */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="text-xl">🛡️</span>
            <div>
              <h4 className="font-medium text-blue-900 text-sm">Dual Check Points</h4>
              <p className="text-xs text-blue-700 mt-0.5">
                Whitelist is checked at two points: (1) when creating a care context (intake), 
                and (2) right before sending a message (send time). Both enforced server-side.
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="text-xl">📝</span>
            <div>
              <h4 className="font-medium text-purple-900 text-sm">Audit Trail</h4>
              <p className="text-xs text-purple-700 mt-0.5">
                Every whitelist check that results in a block writes an audit entry with 
                the reason, checkpoint, and blocked action. Nothing passes silently.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 slide-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add to Whitelist</h3>
            {addError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                ⚠️ {addError}
              </div>
            )}
            {addSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                ✓ Email added to whitelist!
              </div>
            )}
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email Address</label>
                <input
                  type="email" value={newEntry.email}
                  onChange={e => setNewEntry({...newEntry, email: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono"
                  placeholder="owner@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
                <input
                  type="text" value={newEntry.notes}
                  onChange={e => setNewEntry({...newEntry, notes: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="e.g. Regular boarding guest"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                >
                  Add to Whitelist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================

function App() {
  const [merchantType, setMerchantType] = useState(() => localStorage.getItem('careloop_merchant'));
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedContextId, setSelectedContextId] = useState(null);
  const [key, setKey] = useState(0); // Force re-render on merchant change

  const config = MERCHANT_CONFIG[merchantType] || MERCHANT_CONFIG.boarding_groomer;

  const handleLogin = (type) => {
    setMerchantType(type);
    localStorage.setItem('careloop_merchant', type);
    setCurrentPage('dashboard');
    setSelectedContextId(null);
    setKey(k => k + 1);
  };

  const handleLogout = () => {
    setMerchantType(null);
    localStorage.removeItem('careloop_merchant');
  };

  if (!merchantType) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const renderPage = () => {
    if (currentPage === 'care-contexts' && selectedContextId) {
      return (
        <CareContextDetailPage
          contextId={selectedContextId}
          onBack={() => setSelectedContextId(null)}
        />
      );
    }

    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage key={`dash-${key}`} merchantType={merchantType} />;
      case 'care-contexts':
        return (
          <CareContextsPage
            key={`ctx-${key}`}
            merchantType={merchantType}
            onSelectContext={(id) => setSelectedContextId(id)}
          />
        );
      case 'approval-queue':
        return <ApprovalQueuePage key={`appr-${key}`} merchantType={merchantType} />;
      case 'timelines':
        return <TimelinesPage key={`tl-${key}`} merchantType={merchantType} />;
      case 'mock-outbox':
        return <MockOutboxPage key={`out-${key}`} merchantType={merchantType} />;
      case 'whitelist':
        return <WhitelistPage key={`wl-${key}`} merchantType={merchantType} />;
      default:
        return <DashboardPage merchantType={merchantType} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={(page) => { setCurrentPage(page); setSelectedContextId(null); }}
        merchantType={merchantType}
        onLogout={handleLogout}
      />
      <main className="ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
