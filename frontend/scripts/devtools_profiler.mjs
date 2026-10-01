import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

async function runDevToolsAudit() {
  console.log("================================================================================");
  console.log("   ONEHEALTH ID — CHROME DEVTOOLS PROTOCOL (CDP) PERFORMANCE & API AUDITOR      ");
  console.log("================================================================================\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // Attach Chrome DevTools Protocol (CDP) session
  const client = await context.newCDPSession(page);
  await client.send("Performance.enable");
  await client.send("Network.enable");
  await client.send("Console.enable");

  const networkLogs = [];
  const consoleLogs = [];

  // Track Network via CDP
  client.on("Network.requestWillBeSent", (params) => {
    if (params.request.url.includes("/api/")) {
      networkLogs.push({
        type: "REQUEST",
        url: params.request.url,
        method: params.request.method,
        timestamp: params.wallTime,
      });
    }
  });

  client.on("Network.responseReceived", (params) => {
    if (params.response.url.includes("/api/")) {
      networkLogs.push({
        type: "RESPONSE",
        url: params.response.url,
        status: params.response.status,
        mimeType: params.response.mimeType,
        timing: params.response.timing,
      });
    }
  });

  // Track Console via CDP
  client.on("Console.messageAdded", (params) => {
    consoleLogs.push({
      level: params.message.level,
      text: params.message.text,
      source: params.message.source,
      line: params.message.line,
    });
  });

  // 1. Authenticate
  console.log("[CDP] Authenticating into OneHealth ID Hospital Portal...");
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.locator('input[type="text"]').fill("admin");
  await page.locator('input[type="password"]').fill("admin123");
  await page.locator('button[type="submit"]').click();
  await page.waitForURL("**/dashboard");
  console.log("[CDP] Authentication complete. Session initialized.\n");

  // Routes to profile
  const routes = [
    { name: "Live Clinical Dashboard", path: "/dashboard" },
    { name: "Patient Registry (vw_patient_registry)", path: "/patients" },
    { name: "Live OPD Queue (vw_live_queue)", path: "/queue" },
    { name: "Appointments & Schedulers", path: "/appointments" },
    { name: "Billing & GST Revenue Operations", path: "/billing" },
    { name: "Hospital Administration & Governance", path: "/admin" },
  ];

  const auditResults = [];

  for (const r of routes) {
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`[CDP Profiling Route] ${r.name} (${r.path})`);
    console.log(`--------------------------------------------------------------------------------`);

    const routeNetwork = [];
    const onResponse = (response) => {
      if (response.url().includes("/api/")) {
        routeNetwork.push({
          url: response.url(),
          status: response.status(),
          ok: response.ok(),
        });
      }
    };
    page.on("response", onResponse);

    const startNav = Date.now();
    await page.goto(`http://localhost:3000${r.path}`, { waitUntil: "networkidle" });
    const endNav = Date.now();
    const navDuration = endNav - startNav;

    page.off("response", onResponse);

    // Fetch Performance Metrics via CDP
    const perfMetrics = await client.send("Performance.getMetrics");
    const metricsMap = {};
    for (const m of perfMetrics.metrics) {
      metricsMap[m.name] = m.value;
    }

    // Evaluate Navigation Timing & Web Vitals
    const timing = await page.evaluate(() => {
      const navEntry = performance.getEntriesByType("navigation")[0] || {};
      const paintEntries = performance.getEntriesByType("paint");
      let fcp = 0;
      for (const p of paintEntries) {
        if (p.name === "first-contentful-paint") fcp = p.startTime;
      }
      return {
        dnsTime: (navEntry.domainLookupEnd || 0) - (navEntry.domainLookupStart || 0),
        tcpTime: (navEntry.connectEnd || 0) - (navEntry.connectStart || 0),
        ttfb: (navEntry.responseStart || 0) - (navEntry.requestStart || 0),
        domContentLoaded: (navEntry.domContentLoadedEventEnd || 0) - (navEntry.startTime || 0),
        loadComplete: (navEntry.loadEventEnd || 0) - (navEntry.startTime || 0),
        fcp: Math.round(fcp),
      };
    });

    const result = {
      route: r.name,
      path: r.path,
      navDurationMs: navDuration,
      domContentLoadedMs: Math.round(timing.domContentLoaded),
      loadCompleteMs: Math.round(timing.loadComplete),
      fcpMs: timing.fcp,
      jsHeapUsedMB: ((metricsMap["JSHeapUsedSize"] || 0) / (1024 * 1024)).toFixed(2),
      jsHeapTotalMB: ((metricsMap["JSHeapTotalSize"] || 0) / (1024 * 1024)).toFixed(2),
      domNodes: metricsMap["Nodes"] || 0,
      apiCalls: routeNetwork,
    };

    auditResults.push(result);

    console.log(`  ✓ Navigation Duration:    ${result.navDurationMs} ms`);
    console.log(`  ✓ DOM Content Loaded:     ${result.domContentLoadedMs} ms`);
    console.log(`  ✓ First Contentful Paint:  ${result.fcpMs} ms`);
    console.log(`  ✓ JS Heap Memory:         ${result.jsHeapUsedMB} MB / ${result.jsHeapTotalMB} MB`);
    console.log(`  ✓ Live DOM Nodes:         ${result.domNodes}`);
    console.log(`  ✓ API Calls Captured:     ${result.apiCalls.length}`);
    for (const call of result.apiCalls) {
      console.log(`      → [HTTP ${call.status}] ${call.url}`);
    }
    console.log("");
  }

  await browser.close();

  // Summary Report
  console.log("================================================================================");
  console.log("   CHROME DEVTOOLS PROTOCOL (CDP) AUDIT TELEMETRY SUMMARY                       ");
  console.log("================================================================================");
  console.table(
    auditResults.map((r) => ({
      Route: r.route,
      "Load (ms)": r.navDurationMs,
      "FCP (ms)": r.fcpMs,
      "Heap (MB)": r.jsHeapUsedMB,
      "DOM Nodes": r.domNodes,
      "API Count": r.apiCalls.length,
    }))
  );

  const errors = consoleLogs.filter((c) => c.level === "error");
  console.log(`\nConsole Error Count: ${errors.length}`);
  if (errors.length > 0) {
    console.log("Errors:", JSON.stringify(errors, null, 2));
  } else {
    console.log("✓ Zero Console Errors recorded during multi-route execution.");
  }

  // Save report to JSON for artifact inclusion
  const reportPath = path.resolve("./e2e-devtools-report.json");
  fs.writeFileSync(reportPath, JSON.stringify({ auditResults, consoleLogs }, null, 2));
  console.log(`\nDetailed CDP report exported to: ${reportPath}`);
}

runDevToolsAudit().catch(console.error);
