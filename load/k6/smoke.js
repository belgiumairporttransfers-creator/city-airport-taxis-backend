import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 10,
  duration: "30s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
  },
};

const baseUrl = __ENV.BASE_URL || "http://127.0.0.1:5000";

export default function () {
  const live = http.get(`${baseUrl}/health/live`);
  check(live, {
    "live status 200": (response) => response.status === 200,
  });

  const root = http.get(`${baseUrl}/`);
  check(root, {
    "root status 200": (response) => response.status === 200,
    "root operational": (response) => response.json("status") === "operational",
  });

  sleep(0.2);
}
