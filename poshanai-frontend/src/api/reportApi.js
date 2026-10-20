import client, { payloadFrom } from './client.js';

export async function getReports() {
  const data = payloadFrom(await client.get('/reports'));
  return Array.isArray(data) ? data : (data?.reports ?? []);
}

export async function getReportsPage(page = 1, limit = 50) {
  const response = await client.get('/reports', { params: { page, limit } });
  const data = payloadFrom(response);
  return {
    reports: Array.isArray(data) ? data : (data?.reports ?? []),
    pagination: response.data?.pagination ?? data?.pagination ?? null,
  };
}

export async function uploadReport(fileOrFormData) {
  let body = fileOrFormData;
  if (!(typeof FormData !== 'undefined' && fileOrFormData instanceof FormData)) {
    body = new FormData();
    body.append('file', fileOrFormData);
  }
  return payloadFrom(await client.post('/reports', body));
}

export async function deleteReport(id) {
  await client.delete(`/reports/${encodeURIComponent(id)}`);
  return id;
}

export async function getReport(id) {
  return payloadFrom(await client.get(`/reports/${encodeURIComponent(id)}`));
}

export async function reviewReport(id, reviewStatus, extractedValues) {
  return payloadFrom(await client.patch(`/reports/${encodeURIComponent(id)}/review`, {
    reviewStatus,
    ...(reviewStatus === 'corrected' ? { extractedValues } : {}),
  }));
}

const reportApi = { getReports, uploadReport, deleteReport, getReport, reviewReport };
export default reportApi;
