// Server-side storage for Google Photos tokens
// Uses Firestore for persistent storage with encryption

import { getDb } from './firebase-admin';
import { refreshAccessToken } from './google-photos-client';

export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiryDate?: number;
  userId?: string;
  createdAt?: number;
  lastUsed?: number;
}

const TOKENS_COLLECTION = 'googlePhotosTokens';

// Fallback in-memory storage for development or if Firestore fails
const tokenStore = new Map<string, TokenData>();

// Helper to encrypt/decrypt tokens (basic XOR encryption - replace with stronger encryption in production)
function encryptToken(token: string, key: string): string {
  const keyBuffer = Buffer.from(key.padEnd(32, '0').slice(0, 32));
  const tokenBuffer = Buffer.from(token);
  const encrypted = Buffer.alloc(tokenBuffer.length);
  
  for (let i = 0; i < tokenBuffer.length; i++) {
    encrypted[i] = tokenBuffer[i] ^ keyBuffer[i % keyBuffer.length];
  }
  
  return encrypted.toString('base64');
}

function decryptToken(encryptedToken: string, key: string): string {
  const keyBuffer = Buffer.from(key.padEnd(32, '0').slice(0, 32));
  const encryptedBuffer = Buffer.from(encryptedToken, 'base64');
  const decrypted = Buffer.alloc(encryptedBuffer.length);
  
  for (let i = 0; i < encryptedBuffer.length; i++) {
    decrypted[i] = encryptedBuffer[i] ^ keyBuffer[i % keyBuffer.length];
  }
  
  return decrypted.toString();
}

const ENCRYPTION_KEY = process.env.GOOGLE_PHOTOS_ENCRYPTION_KEY || 'default-dev-key-change-in-production';

export async function storeTokens(sessionId: string, tokens: TokenData): Promise<void> {
  try {
    // Encrypt sensitive tokens
    const encryptedData: any = {
      accessToken: encryptToken(tokens.accessToken, ENCRYPTION_KEY),
      refreshToken: tokens.refreshToken ? encryptToken(tokens.refreshToken, ENCRYPTION_KEY) : undefined,
      expiryDate: tokens.expiryDate,
      createdAt: tokens.createdAt || Date.now(),
      lastUsed: Date.now(),
    };
    
    // Only add userId if it exists (Firestore doesn't allow undefined)
    if (tokens.userId) {
      encryptedData.userId = tokens.userId;
    }

    // Store in Firestore
    await getDb().collection(TOKENS_COLLECTION).doc(sessionId).set(encryptedData);
    
    // Also store in memory for quick access
    tokenStore.set(sessionId, tokens);
  } catch (error) {
    console.error('Error storing tokens in Firestore, using memory fallback:', error);
    // Fallback to in-memory storage
    tokenStore.set(sessionId, tokens);
  }
}

export async function getTokens(sessionId: string): Promise<TokenData | null> {
  try {
    // Check memory first (fast path and Firestore fallback)
    const memoryTokens = tokenStore.get(sessionId);
    if (memoryTokens) {
      console.log('✅ Found tokens in memory for session:', sessionId.substring(0, 20) + '...');
      // Try to update last used timestamp (best effort, don't fail if Firestore is down)
      updateLastUsed(sessionId).catch(() => {});
      return memoryTokens;
    }

    console.log('🔍 Tokens not in memory, checking Firestore...');

    // Fetch from Firestore
    const doc = await getDb().collection(TOKENS_COLLECTION).doc(sessionId).get();
    
    if (!doc.exists) {
      console.log('❌ No tokens found in Firestore for session:', sessionId.substring(0, 20) + '...');
      return null;
    }

    console.log('✅ Found tokens in Firestore, decrypting...');

    const data = doc.data() as any;
    
    // Decrypt tokens
    const tokens: TokenData = {
      accessToken: decryptToken(data.accessToken, ENCRYPTION_KEY),
      refreshToken: data.refreshToken ? decryptToken(data.refreshToken, ENCRYPTION_KEY) : undefined,
      expiryDate: data.expiryDate,
      userId: data.userId,
      createdAt: data.createdAt,
      lastUsed: data.lastUsed,
    };

    // Check if token is expired and we have a refresh token
    if (tokens.expiryDate && tokens.expiryDate < Date.now() && tokens.refreshToken) {
      try {
        // Attempt to refresh the access token
        const newTokens = await refreshAccessToken(tokens.refreshToken);
        
        const refreshedTokens: TokenData = {
          accessToken: newTokens.access_token || tokens.accessToken,
          refreshToken: newTokens.refresh_token || tokens.refreshToken,
          expiryDate: newTokens.expiry_date || undefined,
          userId: tokens.userId,
          createdAt: tokens.createdAt,
        };

        // Store the refreshed tokens
        await storeTokens(sessionId, refreshedTokens);
        
        return refreshedTokens;
      } catch (error) {
        console.error('Error refreshing token:', error);
        // Return expired token, let the caller handle it
      }
    }

    // Cache in memory
    tokenStore.set(sessionId, tokens);
    
    // Update last used timestamp
    await updateLastUsed(sessionId);
    
    return tokens;
  } catch (error) {
    console.error('Error getting tokens from Firestore, checking memory:', error);
    // Fallback to memory
    return tokenStore.get(sessionId) || null;
  }
}

export async function deleteTokens(sessionId: string): Promise<void> {
  try {
    // Delete from Firestore
    await getDb().collection(TOKENS_COLLECTION).doc(sessionId).delete();
    
    // Delete from memory
    tokenStore.delete(sessionId);
  } catch (error) {
    console.error('Error deleting tokens from Firestore:', error);
    // Still delete from memory
    tokenStore.delete(sessionId);
  }
}

export async function hasValidTokens(sessionId: string): Promise<boolean> {
  const tokens = await getTokens(sessionId);
  if (!tokens) return false;
  
  // If we have a refresh token, we can always get a new access token
  if (tokens.refreshToken) return true;
  
  // Otherwise check if access token is still valid
  if (tokens.expiryDate && tokens.expiryDate < Date.now()) {
    return false;
  }
  
  return !!tokens.accessToken;
}

async function updateLastUsed(sessionId: string): Promise<void> {
  try {
    await getDb().collection(TOKENS_COLLECTION).doc(sessionId).update({
      lastUsed: Date.now(),
    });
  } catch (error) {
    // Ignore errors for lastUsed updates
  }
}

// Generate a secure session ID
export function generateSessionId(): string {
  return `gp_${Date.now()}_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
}

// Get or create session ID for a user
export async function getOrCreateSessionId(userId?: string): Promise<string> {
  try {
    if (userId) {
      // Check if user already has a session
      const snapshot = await getDb().collection(TOKENS_COLLECTION)
        .where('userId', '==', userId)
        .limit(1)
        .get();
      
      if (!snapshot.empty) {
        return snapshot.docs[0].id;
      }
    }
    
    // Create new session
    return generateSessionId();
  } catch (error) {
    console.error('Error getting/creating session ID:', error);
    return generateSessionId();
  }
}

// Clean up old/expired tokens (call this periodically)
export async function cleanupExpiredTokens(): Promise<void> {
  try {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    const snapshot = await getDb().collection(TOKENS_COLLECTION)
      .where('lastUsed', '<', thirtyDaysAgo)
      .get();
    
    const batch = getDb().batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`Cleaned up ${snapshot.size} expired token records`);
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
  }
}
