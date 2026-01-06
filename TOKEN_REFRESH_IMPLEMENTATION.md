# Token Refresh and Error Handling Implementation

## Overview
This document describes the implementation of automatic token refresh and user-friendly error notifications for token expiration issues in the EsportTournament application.

## Problem Statement
The application had the following issues:
1. Token did not refresh automatically in the background
2. When tokens expired, users received no error messages
3. API calls didn't consistently handle token expiration
4. Users could lose in-progress work when tokens expired silently

## Solution

### 1. Enhanced Authentication Service (`auth-service.ts`)
**Improvements:**
- Added user-friendly toast notifications for token refresh events
- Added error notification when token refresh fails
- Enhanced `getToken()` method to update Redux store when token is refreshed
- Improved `setupTokenRefresh()` to show notifications on token expiration
- Added 401 error handling in `syncUserWithBackend()` to detect expired tokens

**Key Changes:**
```typescript
// Token refresh now shows user feedback
toast.warning('A munkamenet hamarosan lejár, frissítés...', { duration: 3000 });

// Failed refresh shows error and logs user out
toast.error('A munkamenet lejárt. Kérjük, jelentkezz be újra.', { duration: 5000 });

// Token updates are synced to Redux store
store.dispatch(setCredentials({
    user: state.auth.user,
    token: this._keycloak.token,
    refreshToken: this._keycloak.refreshToken
}));
```

### 2. New API Client Wrapper (`api-client.ts`)
**Purpose:** Centralized API request handling with automatic token refresh and error notifications

**Features:**
- Automatic token refresh before each API request via `authService.getToken()`
- Automatic addition of Authorization header with fresh token
- Global 401 (Unauthorized) error handling with user notification
- Global 403 (Forbidden) error handling with user notification
- Type-safe JSON response parsing with `apiFetchJson()`

**Usage Example:**
```typescript
// Before (manual token handling)
const token = getToken(state);
const response = await fetch(`${API_URL}/teams`, {
    headers: { Authorization: `Bearer ${token}` }
});

// After (automatic token handling)
const response = await apiFetch(`${API_URL}/teams`);
```

### 3. Updated Redux Slices
**Modified:** `teamsSlice.ts` as an example implementation

**Changes:**
- Removed manual token retrieval from Redux state
- Replaced `fetch()` calls with `apiFetch()`
- Simplified async thunks by removing token management code
- Automatic token refresh and error handling for all team operations

**Benefits:**
- Cleaner, more maintainable code
- Consistent error handling across all API calls
- Reduced code duplication
- Better user experience with clear error messages

### 4. Updated UI Components
**Modified:** `Settings.tsx` as an example

**Changes:**
- Replaced direct `fetch()` calls with `apiFetch()`
- Removed manual token retrieval
- Fixed React Hooks linting issue by moving all `useState` calls before conditional returns

## User Experience Improvements

### Before
- Silent failures when token expires
- Lost work with no warning
- No indication of authentication issues
- Unpredictable behavior

### After
- Clear notification when token is about to expire: "A munkamenet hamarosan lejár, frissítés..."
- Success message after refresh: "Munkamenet frissítve"
- Clear error when token cannot be refreshed: "A munkamenet lejárt. Kérjük, jelentkezz be újra."
- Automatic logout and cleanup on token expiration
- All API calls show "Nincs jogosultságod ehhez a művelethez" for 403 errors

## Token Refresh Mechanisms

### 1. Proactive Refresh (Before Expiration)
- `getToken()` method refreshes tokens expiring in < 30 seconds
- Called automatically by `apiFetch()` before every API request
- Ensures fresh tokens for all authenticated requests

### 2. Reactive Refresh (On Expiration Event)
- Keycloak's `onTokenExpired` event handler
- Attempts refresh when token expires
- Shows warning notification during refresh
- Shows error and logs out if refresh fails

### 3. Periodic Refresh (Background)
- Interval check every 5 minutes
- Refreshes tokens expiring in < 70 seconds
- Updates Redux store with new tokens
- Logs out on failure

### 4. Request-Level Refresh (Per API Call)
- `apiFetch()` gets fresh token before each request
- Handles 401 responses by showing error and logging out
- Prevents failed requests due to expired tokens

## Migration Guide

To migrate existing code to use the new API client:

1. **Import the API client:**
```typescript
import { apiFetch } from '../lib/api-client';
```

2. **Replace fetch calls:**
```typescript
// Before
const token = getToken(state);
const response = await fetch(url, {
    headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
    }
});

// After
const response = await apiFetch(url, {
    headers: { 
        'Content-Type': 'application/json'
    }
});
```

3. **Remove token management:**
- Remove `getToken(state)` calls
- Remove `getState` and `RootState` imports if only used for token
- Remove manual Authorization header setting

4. **Error handling is automatic:**
- 401 errors show notification and logout automatically
- 403 errors show notification automatically
- No need for manual error handling for auth issues

## Testing Recommendations

1. **Token Expiration:**
   - Wait for token to expire naturally
   - Verify warning notification appears
   - Verify successful refresh notification
   - Verify continued functionality

2. **Failed Refresh:**
   - Simulate refresh token expiration
   - Verify error notification appears
   - Verify automatic logout
   - Verify redirect to login

3. **API Calls:**
   - Make authenticated API calls
   - Verify automatic token refresh
   - Verify Authorization header is added
   - Verify 401/403 errors show notifications

4. **Background Refresh:**
   - Leave application idle for 5+ minutes
   - Verify periodic refresh occurs
   - Verify Redux store is updated
   - Verify no interruption to user

## Security Considerations

- Tokens are always refreshed before making API calls (30-second threshold)
- Failed refresh attempts result in immediate logout
- 401 responses trigger automatic logout
- No token information is logged to console in production
- Refresh tokens are stored securely in Redux state

## Future Enhancements

1. Migrate all remaining fetch() calls to use apiFetch()
2. Add retry logic for failed API calls
3. Implement request queuing during token refresh
4. Add offline mode detection
5. Implement token refresh countdown notification
6. Add session timeout warnings with action to extend

## Files Modified

1. `frontend/src/lib/api-client.ts` (NEW)
2. `frontend/src/lib/auth-service.ts`
3. `frontend/src/store/slices/teamsSlice.ts`
4. `frontend/src/pages/Settings.tsx`

## Dependencies

- `keycloak-js`: ^26.2.2 (already installed)
- `sonner`: ^2.0.7 (already installed for toast notifications)
- `@reduxjs/toolkit`: ^2.11.2 (already installed)
