// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SolarEdge API proxy — runs on Netlify's servers
// so CORS never blocks the request.
//
// Your HTML page calls:
//   /.netlify/functions/solaredge?endpoint=overview
//   /.netlify/functions/solaredge?endpoint=week
//   /.netlify/functions/solaredge?endpoint=year
//
// This function adds your API key and fetches from
// SolarEdge, then returns the data to your page.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const API_KEY = "HJU79XX3OIBOLD9IPA0SPEJC3VTJ3QUE";
const SITE_ID = "344470";
const BASE    = "https://monitoringapi.solaredge.com";

exports.handler = async function(event) {
  const endpoint = event.queryStringParameters?.endpoint;
  const now      = new Date();

  // Helper: format date for SolarEdge  "YYYY-MM-DD HH:MM:SS"
  const fmt = d =>
    d.toISOString().slice(0, 16).replace("T", " ") + ":00";

  // Helper: date string only  "YYYY-MM-DD"
  const fmtDate = d => d.toISOString().slice(0, 10);

  let url;

  if (endpoint === "overview") {
    // Current power, today, month, lifetime totals
    url = `${BASE}/site/${SITE_ID}/overview?api_key=${API_KEY}`;

  } else if (endpoint === "week") {
    // Last 7 days of 15-min power readings
    // We go back 6 full days + today so the final day updates live
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    url = `${BASE}/site/${SITE_ID}/power` +
          `?startTime=${encodeURIComponent(fmt(start))}` +
          `&endTime=${encodeURIComponent(fmt(now))}` +
          `&api_key=${API_KEY}`;

  } else if (endpoint === "year") {
    // Monthly energy totals for the current year
    const yearStart = new Date(now.getFullYear(), 0, 1);
    url = `${BASE}/site/${SITE_ID}/energy` +
          `?timeUnit=MONTH` +
          `&startDate=${fmtDate(yearStart)}` +
          `&endDate=${fmtDate(now)}` +
          `&api_key=${API_KEY}`;

  } else {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Unknown endpoint. Use: overview, week, or year" }),
    };
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: "SolarEdge API error", detail: text }),
      };
    }

    const data = await response.json();
    return {
      statusCode: 200,
      headers: {
        "Content-Type":                "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(data),
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Proxy fetch failed", detail: err.message }),
    };
  }
};
