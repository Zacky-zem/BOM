'use client';

import React, { useState, useEffect } from 'react';

interface ExportProgressModalProps {
  isOpen: boolean;
  progress: number;
  status: string;
  onCancel: () => void;
  downloadUrl?: string;
  error?: string;
}

const font = "'DM Sans', system-ui, sans-serif";

export function ExportProgressModal({
  isOpen,
  progress,
  status,
  onCancel,
  downloadUrl,
  error,
}: ExportProgressModalProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      fontFamily: font,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: 32,
        width: '90%',
        maxWidth: 420,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 700, color: '#1f2937' }}>
            Mengekspor Data
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
            {status || 'Mempersiapkan...'}
          </p>
        </div>

        {error ? (
          // Error state
          <div style={{
            background: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            padding: 12,
            marginBottom: 24,
          }}>
            <p style={{ margin: 0, fontSize: 13, color: '#991b1b', fontWeight: 500 }}>
              {error}
            </p>
          </div>
        ) : downloadUrl ? (
          // Success state
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 8,
            padding: 12,
            marginBottom: 24,
          }}>
            <p style={{ margin: 0, fontSize: 13, color: '#166534', fontWeight: 500 }}>
              ✓ Selesai! File siap diunduh.
            </p>
          </div>
        ) : null}

        {/* Progress Bar */}
        {!downloadUrl && !error && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{
                background: '#f3f4f6',
                borderRadius: 8,
                height: 8,
                overflow: 'hidden',
              }}>
                <div style={{
                  background: '#10b981',
                  height: '100%',
                  width: `${progress}%`,
                  transition: 'width 0.3s ease',
                }}></div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
            }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#10b981 ' }}>
                {progress}%
              </span>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>
                Waktu: {formatTime(elapsedTime)}
              </span>
            </div>
          </>
        )}

        {/* Buttons */}
        <div style={{
          display: 'flex',
          gap: 12,
          justifyContent: downloadUrl ? 'flex-end' : 'space-between',
        }}>
          {!downloadUrl && (
            <button
              onClick={onCancel}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1.5px solid #e5e7eb',
                background: '#fff',
                color: '#374151',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: font,
                transition: 'all 0.2s',
              }}
              onMouseOver={e => {
                (e.target as HTMLButtonElement).style.background = '#f3f4f6';
              }}
              onMouseOut={e => {
                (e.target as HTMLButtonElement).style.background = '#fff';
              }}
            >
              Batal
            </button>
          )}

          {downloadUrl && (
            <a
              href={downloadUrl}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: '#10b981',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: font,
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Unduh File
            </a>
          )}

          {(downloadUrl || error) && (
            <button
              onClick={onCancel}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: '#6b7280',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: font,
              }}
            >
              Tutup
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
