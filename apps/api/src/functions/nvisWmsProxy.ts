import '../setup.js';
/**
 * WMS proxy for NVIS vegetation map services.
 *
 * The NVIS WMS server at gis.environment.gov.au does NOT send
 * Access-Control-Allow-Origin headers, so browsers block direct
 * cross-origin requests from any frontend origin. This lightweight
 * proxy forwards WMS requests (GetMap tiles, GetFeatureInfo, etc.)
 * through our Azure Functions API, sidestepping CORS entirely.
 *
 * Data source: Australian Government DCCEEW NVIS 6.0 (CC-BY 4.0)
 * Landing page: https://www.dcceew.gov.au/environment/environment-information-australia/national-vegetation-information-system/data-products
 * MVS REST: https://gis.environment.gov.au/gispubmap/rest/services/ogc_services/NVIS_ext_mvs/MapServer
 * MVG REST: https://gis.environment.gov.au/gispubmap/rest/services/ogc_services/NVIS_ext_mvg/MapServer
 */

import functions from '@azure/functions';
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { NVIS_WMS_MVS_URL, NVIS_WMS_MVG_URL } from '@fire-sim/shared';

const { app } = functions;

/** Allowed upstream WMS base URLs to prevent open-proxy abuse. */
const ALLOWED_UPSTREAMS: Record<string, string> = {
  mvs: NVIS_WMS_MVS_URL,
  mvg: NVIS_WMS_MVG_URL,
};

/** Default upstream if no dataset parameter is provided. */
const DEFAULT_UPSTREAM = 'mvs';

/** Timeout for upstream WMS requests (ms). */
const UPSTREAM_TIMEOUT_MS = 15_000;

/**
 * Proxy handler: forwards the incoming query string to the chosen NVIS
 * WMS endpoint and returns the upstream response to the caller.
 *
 * Query parameters:
 *   - dataset: 'mvs' | 'mvg' (default: 'mvs')
 *   - All other params are forwarded verbatim to the WMS server.
 *
 * GET /api/nvis-wms-proxy?service=WMS&request=GetMap&layers=0&...
 */
export async function nvisWmsProxy(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const url = new URL(request.url);

  // Determine which upstream to use
  const dataset = (url.searchParams.get('dataset') ?? DEFAULT_UPSTREAM).toLowerCase();
  const upstream = ALLOWED_UPSTREAMS[dataset];

  if (!upstream) {
    return {
      status: 400,
      jsonBody: { error: `Invalid dataset '${dataset}'. Use 'mvs' or 'mvg'.` },
    };
  }

  // Remove our custom 'dataset' param before forwarding
  const forwardParams = new URLSearchParams(url.searchParams);
  forwardParams.delete('dataset');

  const upstreamUrl = `${upstream}?${forwardParams}`;

  // Retry for transient failures (DNS, connection reset, TLS errors)
  const MAX_RETRIES = 2;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

      const upstreamResponse = await fetch(upstreamUrl, {
        signal: controller.signal,
        headers: {
          // Identify ourselves politely to the government server
          'User-Agent': 'FireSimImages/1.0 (Azure Functions WMS proxy)',
        },
      });

      clearTimeout(timeout);

      if (!upstreamResponse.ok) {
        // 5xx from upstream — retry if attempts remain
        if (upstreamResponse.status >= 500 && attempt < MAX_RETRIES) {
          context.warn('nvis-wms-proxy upstream 5xx, retrying', {
            status: upstreamResponse.status,
            attempt: attempt + 1,
          });
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
          continue;
        }
        context.warn('nvis-wms-proxy upstream error', {
          status: upstreamResponse.status,
          url: upstreamUrl.substring(0, 200),
        });
        return {
          status: upstreamResponse.status,
          body: `Upstream WMS error: ${upstreamResponse.status} ${upstreamResponse.statusText}`,
        };
      }

      // Read the upstream body as a buffer so we can return it as-is
      const body = Buffer.from(await upstreamResponse.arrayBuffer());
      const contentType =
        upstreamResponse.headers.get('content-type') ?? 'application/octet-stream';

      // Determine cache duration: tiles (GetMap) can be cached longer
      const wmsRequest = (url.searchParams.get('request') ?? '').toLowerCase();
      const cacheControl =
        wmsRequest === 'getmap'
          ? 'public, max-age=3600, s-maxage=86400' // Tiles: 1h client, 24h CDN
          : 'public, max-age=60'; // FeatureInfo etc.: 1 min

      return {
        status: 200,
        body,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': cacheControl,
          // CORS headers so the frontend can consume the response
          'Access-Control-Allow-Origin': '*',
        },
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const isAbort = err instanceof DOMException && err.name === 'AbortError';

      if (isAbort) {
        context.warn('nvis-wms-proxy upstream timeout', {
          url: upstreamUrl.substring(0, 200),
          attempt: attempt + 1,
        });
        // Timeouts are unlikely to resolve with immediate retry
        return { status: 504, body: 'Upstream WMS request timed out' };
      }

      if (attempt < MAX_RETRIES) {
        context.warn('nvis-wms-proxy transient error, retrying', {
          error: lastError.message,
          attempt: attempt + 1,
        });
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }
    }
  }

  context.error('nvis-wms-proxy error after retries', {
    error: lastError?.message ?? 'Unknown error',
  });
  return { status: 502, body: 'Failed to reach upstream WMS server' };
}

app.http('nvisWmsProxy', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'nvis-wms-proxy',
  handler: nvisWmsProxy,
});
