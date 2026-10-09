const API = "https://urbanpulse-x-backend.onrender.com";

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.detail || `Request failed (${response.status})`);
  }
  return payload;
}

export const getIncidents = () => request("/api/incidents");
export const getPlan = () => request("/api/planner/plan");
export const getVisionStatus = () => request("/api/vision/status");
export const replan = () => request("/api/planner/replan");
export const resolveIncident = (code) => request(`/api/incidents/${code}/resolve`, { method: "POST" });
export const createIncident = (data) => request("/api/incidents", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
});
export async function detectImage(file) {
  const form = new FormData();
  form.append("file", file);
  return request("/api/vision/image", { method: "POST", body: form });
}
