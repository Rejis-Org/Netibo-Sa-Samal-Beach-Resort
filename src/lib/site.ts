export const RESORT_PHONE = "0927 485 2412";
export const RESORT_PHONE_TEL = "09274852412";
export const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61577566485558";

// Exact pin from Google Maps ("Netibo Beach Resort", plus code 4MFH+RC Samal).
export const RESORT_COORDS = { lat: 7.1245766, lng: 125.6786152 } as const;
export const RESORT_MAPS_URL = `https://www.google.com/maps/dir/?api=1&destination=${RESORT_COORDS.lat},${RESORT_COORDS.lng}`;