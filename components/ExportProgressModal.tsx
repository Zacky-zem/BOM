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

export function ExportProgressModal({
  isOpen,
  progress,
  status,
  onCancel,
  downloadUrl,
  error,
}: ExportProgressModalProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setElapsedTime(0);
      setEstimatedTime(null);
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);

      // Calculate estimated time remaining
      if (progress > 0 && progress < 100) {
        const rate = progress / elapsedTime; // % per second
        const remainingPercent = 100 - progress;
        const estimatedRemaining = Math.ceil(remainingPercent / rate);
        setEstimatedTime(estimatedRemaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, progress, elapsedTime]);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (!isOpen) return null;

  const isComplete = progress === 100;
  const hasError = !!error;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 32,
          maxWidth: 420,
          width: '90%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: 4,
            }}
          >
            Mengekspor Data
          </h2>
          <p
            style={{
              fontSize: 13,
              color: '#6b7280',
              margin: 0,
            }}
          >
            {status || 'Memproses...'}
          </p>
        </div>

        {/* Progress Bar */}
        <div
          style={{
            background: '#e5e7eb',
            borderRadius: 8,
            height: 8,
            overflow: 'hidden',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              background: hasError ? '#ef4444' : '#10b981',
              height: '100%',
              width: `${progress}%`,
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        {/* Progress Text and Time Info */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}
        >
          <div>
            <span
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: hasError ? '#ef4444' : '#0f172a',
              }}
            >
              {progress}%
            </span>
          </div>

          {!hasError && !isComplete && (
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              <span style={{ display: 'block' }}>⏱ {formatTime(elapsedTime)}</span>
              {estimatedTime && estimatedTime > 0 && (
                <span style={{ display: 'block', marginTop: 2 }}>
                  Est: {formatTime(estimatedTime)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Error Message */}
        {hasError && (
          <div
            style={{
              background: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              fontSize: 13,
              color: '#991b1b',
            }}
          >
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12 }}>
          {isComplete && downloadUrl ? (
            <>
              <a
                href={downloadUrl}
                download
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 8,
                  background: '#10b981',
                  color: '#fff',
                  textAlign: 'center',
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                ⬇️ Unduh File
              </a>
              <button
                onClick={onCancel}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 8,
                  background: '#f3f4f6',
                  color: '#374151',
                  textAlign: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                Tutup
              </button>
            </>
          ) : (
            <button
              onClick={onCancel}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: 8,
                background: hasError ? '#ef4444' : '#f3f4f6',
                color: hasError ? '#fff' : '#374151',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
              }}
            >
              {hasError ? '❌ Tutup' : '✕ Batalkan'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
