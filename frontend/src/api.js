import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Inject logged-in user token into headers if present (unless an explicit Authorization header like admin auth header was already provided)
api.interceptors.request.use(config => {
  const hasAuthHeader = config.headers?.Authorization || config.headers?.authorization
  if (!hasAuthHeader) {
    const token = localStorage.getItem('jobshield_user_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Anonymous per-browser session id - no login required for normal users.
// Used only to scope "search history" to this browser.
export function getSessionId() {
  let id = localStorage.getItem('jobshield_session_id')
  if (!id) {
    id = 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem('jobshield_session_id', id)
  }
  return id
}

export function friendlyError(err) {
  if (err?.response?.data?.detail) return err.response.data.detail
  if (err?.message === 'Network Error') return 'Could not reach the JobShield server. Please check your connection and try again.'
  return 'Something went wrong. Please try again.'
}

export const analyzeText = (text, category_hint) =>
  api.post('/analyze/text', { text, category_hint, session_id: getSessionId() }).then(r => r.data)

export const analyzeUrl = (url, category_hint) =>
  api.post('/analyze/url', { url, category_hint, session_id: getSessionId() }).then(r => r.data)

export const analyzeUpload = (file, category_hint) => {
  const form = new FormData()
  form.append('file', file)
  if (category_hint) form.append('category_hint', category_hint)
  form.append('session_id', getSessionId())
  return api.post('/analyze/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
}

export const getAnalysis = (id) => api.get(`/analyze/${id}`).then(r => r.data)

export const correctEntities = (id, entities) =>
  api.patch(`/analyze/${id}/entities`, { analysis_id: id, entities }).then(r => r.data)

export const getHistory = () => api.get('/history', { params: { session_id: getSessionId() } }).then(r => r.data)

export const deleteHistoryItem = (id) =>
  api.delete(`/history/${id}`, { params: { session_id: getSessionId() } }).then(r => r.data)

export const submitReport = (payload) =>
  api.post('/reports', { ...payload, session_id: getSessionId() }).then(r => r.data)

export const submitCommunityReport = (payload) =>
  api.post('/reports/community', { ...payload, session_id: getSessionId() }).then(r => r.data)

export const getPublicScamPatterns = (params) =>
  api.get('/reports/scam-patterns', { params }).then(r => r.data)

export const getDashboardStats = () => api.get('/dashboard/stats').then(r => r.data)

// --- Verification APIs ---
export const verifyWebsite = (url) =>
  api.post('/website/verify', { url }).then(r => r.data)

export const verifyCertificate = (cert_id, file) => {
  const form = new FormData()
  if (cert_id) form.append('cert_id', cert_id)
  if (file) form.append('file', file)
  return api.post('/certificate/verify', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
}

export const verifyUpi = (upi_id) =>
  api.get('/upi/verify', { params: { upi_id } }).then(r => r.data)

// --- User Auth APIs ---
export const registerUser = (email, password) =>
  api.post('/auth/register', { email, password }).then(r => r.data)

export const loginUser = (email, password) =>
  api.post('/auth/login', { email, password }).then(r => r.data)

// --- Admin ---
export const adminLogin = (username, password) =>
  api.post('/admin/login', { username, password }).then(r => r.data)

export const adminAuthHeader = () => {
  const token = localStorage.getItem('jobshield_admin_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const adminStats = () => api.get('/admin/stats', { headers: adminAuthHeader() }).then(r => r.data)
export const adminListReports = (status) => api.get('/admin/reports', { params: status ? { status } : {}, headers: adminAuthHeader() }).then(r => r.data)
export const adminReviewReport = (id, status, admin_notes) =>
  api.patch(`/admin/reports/${id}`, { status, admin_notes }, { headers: adminAuthHeader() }).then(r => r.data)
export const adminListCommunityReports = (status) =>
  api.get('/admin/community-reports', { params: status ? { status } : {}, headers: adminAuthHeader() }).then(r => r.data)
export const adminReviewCommunityReport = (id, status, admin_notes) =>
  api.patch(`/admin/community-reports/${id}`, { status, admin_notes }, { headers: adminAuthHeader() }).then(r => r.data)
export const adminListPatterns = (status) => api.get('/admin/scam-patterns', { params: status ? { status } : {}, headers: adminAuthHeader() }).then(r => r.data)
export const adminAddPattern = (payload) => api.post('/admin/scam-patterns', payload, { headers: adminAuthHeader() }).then(r => r.data)
export const adminDeletePattern = (id) => api.delete(`/admin/scam-patterns/${id}`, { headers: adminAuthHeader() }).then(r => r.data)
export const adminRejectPattern = (id) => api.patch(`/admin/scam-patterns/${id}/reject`, {}, { headers: adminAuthHeader() }).then(r => r.data)
export const adminGetLogs = () => api.get('/dashboard/admin-logs', { headers: adminAuthHeader() }).then(r => r.data)
export const adminSearchIntel = (value, type) => api.get('/intel/search', { params: { value, type } }).then(r => r.data)
export const adminCreateIntel = (payload) => api.post('/intel/', payload, { headers: adminAuthHeader() }).then(r => r.data)
export const adminDeleteIntel = (id) => api.delete(`/intel/${id}`, { headers: adminAuthHeader() }).then(r => r.data)
export const checkHealth = () => api.get('/health').then(r => r.data)

export default api

