import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 100,
  duration: '1m',
  thresholds: {
    http_req_failed: ['rate<0.05'], // Failure rate must be under 5%
    http_req_duration: ['p(95)<1500'], // 95% of requests must complete in under 1.5 seconds
  },
};

export default function () {
  const backendUrl = __ENV.BACKEND_URL || 'http://localhost:3001';
  const url = `${backendUrl.replace(/\/$/, '')}/api/health`;

  const res = http.get(url);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 1500ms': (r) => r.timings.duration < 1500,
  });

  // Short pause between iterations to simulate real user behavior
  sleep(0.1);
}
