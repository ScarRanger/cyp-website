'use client';

import React from 'react';
import type { GooglePhotosConnectionProps } from '@/app/types/google-photos';

/**
 * GooglePhotosConnection Component
 * 
 * Responsibilities:
 * - Display current connection status (Not Connected, Connected, Connection Error)
 * - Provide action buttons based on state (Connect, Reconnect, Disconnect)
 * - Show basic account info when connected (display name, email)
 * - Handle connection state transitions
 * - Never expose sensitive tokens in UI
 * 
 * States:
 * - Not Connected: Show "Connect Google Photos" button
 * - Connected: Show account info and "Disconnect" button
 * - Connection Error: Show error message with "Reconnect" button
 */
export default function GooglePhotosConnection({
  connectionState,
  onConnect,
  onDisconnect,
  onReconnect,
}: GooglePhotosConnectionProps) {
  const [loading, setLoading] = React.useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      await onConnect();
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await onDisconnect();
    } finally {
      setLoading(false);
    }
  };

  const handleReconnect = async () => {
    setLoading(true);
    try {
      await onReconnect();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900">Google Photos Connection</h2>
          
          {connectionState.status === 'not-connected' && (
            <div className="mt-2">
              <p className="text-sm text-gray-600">
                Connect your Google Photos account to import photos and videos directly into your gallery.
              </p>
            </div>
          )}

          {connectionState.status === 'connected' && connectionState.displayName && (
            <div className="mt-3 space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-700">Connected</span>
              </div>
              <p className="text-sm text-gray-900">
                <span className="font-medium">Account:</span> {connectionState.displayName}
              </p>
              {connectionState.email && (
                <p className="text-xs text-gray-600">{connectionState.email}</p>
              )}
              {connectionState.connectedAt && (
                <p className="text-xs text-gray-500">
                  Connected on {new Date(connectionState.connectedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {connectionState.status === 'connection-error' && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-sm font-medium text-red-700">Connection Error</span>
              </div>
              {connectionState.errorMessage && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-800">{connectionState.errorMessage}</p>
                </div>
              )}
              <p className="text-sm text-gray-600">
                Please reconnect your Google Photos account to continue.
              </p>
            </div>
          )}
        </div>

        <div className="ml-6">
          {connectionState.status === 'not-connected' && (
            <button
              onClick={handleConnect}
              disabled={loading}
              className="px-5 py-3 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm font-medium"
            >
              {loading ? 'Connecting...' : 'Connect Google Photos'}
            </button>
          )}

          {connectionState.status === 'connected' && (
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="px-5 py-3 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm font-medium"
            >
              {loading ? 'Disconnecting...' : 'Disconnect'}
            </button>
          )}

          {connectionState.status === 'connection-error' && (
            <button
              onClick={handleReconnect}
              disabled={loading}
              className="px-5 py-3 rounded-md bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm font-medium"
            >
              {loading ? 'Reconnecting...' : 'Reconnect'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
