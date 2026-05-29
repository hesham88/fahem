import { getAnalytics, logEvent, setUserId, setUserProperties, isSupported } from "firebase/analytics";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth, app } from "./firebase";

export interface GeoInfo {
  ip?: string;
  userAgent?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  isp?: string;
}

let analyticsInstance: any = null;
let cachedGeo: GeoInfo | null = null;
let geoFetchingPromise: Promise<GeoInfo | null> | null = null;

// Initialize Firebase Analytics Client-side
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      try {
        analyticsInstance = getAnalytics(app);
        console.log("[Analytics] Firebase Google Analytics initialized");
      } catch (err) {
        console.warn("[Analytics] Error initializing Analytics:", err);
      }
    } else {
      console.log("[Analytics] Analytics is not supported in this environment");
    }
  });
}

/**
 * Fetches geolocation and client IP address dynamically.
 * Combines our lightweight `/api/user-info` route with the ipapi.co client-side fallback.
 */
export async function getClientGeoInfo(): Promise<GeoInfo | null> {
  if (typeof window === "undefined") return null;
  if (cachedGeo) return cachedGeo;

  // If a fetch is already in progress, wait for it
  if (geoFetchingPromise) return geoFetchingPromise;

  geoFetchingPromise = (async () => {
    try {
      // 1. Check Session Storage first
      const stored = sessionStorage.getItem("fahem_geo_cache");
      if (stored) {
        cachedGeo = JSON.parse(stored);
        return cachedGeo;
      }

      // 2. Fetch IP and simple headers from local API
      let localData: any = {};
      try {
        const res = await fetch("/api/user-info");
        if (res.ok) {
          localData = await res.json();
        }
      } catch (e) {
        console.warn("[Logger] Error fetching local user-info:", e);
      }

      // 3. Query client-side geolocation API for high-fidelity information (with fallback)
      let ipapiData: any = {};
      try {
        const res = await fetch("https://ipapi.co/json/");
        if (res.ok) {
          ipapiData = await res.json();
        }
      } catch (e) {
        console.warn("[Logger] ipapi.co fallback bypassed or blocked:", e);
      }

      // Merge results
      const ip = localData.ip || ipapiData.ip || "127.0.0.1";
      const userAgent = localData.userAgent || (typeof navigator !== "undefined" ? navigator.userAgent : "unknown");
      const country = ipapiData.country_name || localData.country || "unknown";
      
      const geo: GeoInfo = {
        ip,
        userAgent,
        country,
        countryCode: ipapiData.country_code || null,
        region: ipapiData.region || null,
        city: ipapiData.city || null,
        latitude: ipapiData.latitude || null,
        longitude: ipapiData.longitude || null,
        isp: ipapiData.org || null,
      };

      // Set user properties in Google Analytics if initialized
      if (analyticsInstance) {
        setUserProperties(analyticsInstance, {
          user_ip: geo.ip,
          user_country: geo.country,
          user_region: geo.region || "unknown",
          user_city: geo.city || "unknown",
          user_isp: geo.isp || "unknown",
        });
      }

      cachedGeo = geo;
      sessionStorage.setItem("fahem_geo_cache", JSON.stringify(geo));
      return geo;
    } catch (err) {
      console.warn("[Logger] Failed to resolve client geolocation:", err);
      return null;
    } finally {
      geoFetchingPromise = null;
    }
  })();

  return geoFetchingPromise;
}

// Subscribe to Auth state to automatically sync Analytics user properties
if (typeof window !== "undefined") {
  auth.onAuthStateChanged((user) => {
    if (user && analyticsInstance) {
      setUserId(analyticsInstance, user.uid);
      setUserProperties(analyticsInstance, {
        email: user.email || "none",
        display_name: user.displayName || "none",
        role: "user",
      });
      console.log(`[Analytics] Sync completed for User ID: ${user.uid}`);
    }
  });
}

/**
 * Centralized logging function that persists entries to Firestore and logs events to Google Analytics.
 */
export async function logCentral(
  level: "info" | "warning" | "error" | "click" | "page_view",
  message: string,
  details: Record<string, any> = {}
) {
  if (typeof window === "undefined") return;

  try {
    // 1. Resolve active user details
    const user = auth.currentUser;
    const userId = user ? user.uid : "anonymous";
    const userEmail = user ? user.email : "anonymous";
    const displayName = user ? user.displayName : "anonymous";

    // 2. Resolve client connection parameters
    const geo = await getClientGeoInfo();

    // 3. Format complete log document
    const logDoc = {
      level,
      message,
      pathname: window.location.pathname,
      search: window.location.search,
      userId,
      userEmail,
      displayName,
      userAgent: geo?.userAgent || navigator.userAgent,
      sessionIp: geo?.ip || "127.0.0.1",
      geo: geo ? {
        country: geo.country || "unknown",
        countryCode: geo.countryCode || null,
        region: geo.region || null,
        city: geo.city || null,
        isp: geo.isp || null,
        coordinates: geo.latitude && geo.longitude ? `${geo.latitude},${geo.longitude}` : null
      } : null,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      language: navigator.language,
      timestamp: serverTimestamp(),
      details: {
        ...details,
        client_time: new Date().toISOString()
      }
    };

    // 4. Record event to Google Analytics
    if (analyticsInstance) {
      const gaEventName = `app_${level}`;
      logEvent(analyticsInstance, gaEventName, {
        message,
        pathname: logDoc.pathname,
        userId,
        country: geo?.country || "unknown",
        city: geo?.city || "unknown",
        ...details,
      });
    }

    // 5. Write to Firestore 'web_logs' database
    const logsCol = collection(db, "web_logs");
    await addDoc(logsCol, logDoc);

    // Print to browser console in developer-friendly styles
    const styles = {
      info: "color: #2563eb; font-weight: bold;",
      warning: "color: #d97706; font-weight: bold;",
      error: "color: #dc2626; font-weight: bold;",
      click: "color: #059669; font-weight: bold;",
      page_view: "color: #7c3aed; font-weight: bold;"
    };
    console.log(
      `%c[Central Log - ${level.toUpperCase()}]%c ${message}`,
      styles[level] || "font-weight: bold;",
      "color: inherit;",
      details
    );

  } catch (err) {
    // Fail-safe error print to ensure logger never crashes the host website
    console.error("[Logger Critical Fail] Failed to record log central:", err);
  }
}

// Individual structured exports
export const logInfo = (message: string, details?: any) => logCentral("info", message, details);
export const logWarning = (message: string, details?: any) => logCentral("warning", message, details);
export const logError = (message: string, details?: any) => logCentral("error", message, details);
export const logClick = (elementId: string, label: string, details?: any) => 
  logCentral("click", `Click: ${label} (${elementId})`, { elementId, label, ...details });
export const logPageView = (url: string, details?: any) => 
  logCentral("page_view", `PageView: ${url}`, { url, ...details });
