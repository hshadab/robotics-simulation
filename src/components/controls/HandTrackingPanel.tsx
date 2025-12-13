import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Hand, Camera, CameraOff, RefreshCw } from 'lucide-react';
import { Button } from '../common';
import { useAppStore } from '../../stores/useAppStore';
import type { MediaPipeVision} from '../../lib/mediaPipeVision';
import { getMediaPipeVision } from '../../lib/mediaPipeVision';

export const HandTrackingPanel: React.FC = () => {
  const { setJoints, activeRobotType } = useAppStore();
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gestureStatus, setGestureStatus] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visionRef = useRef<MediaPipeVision | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopTracking = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (visionRef.current) {
      visionRef.current.dispose();
      visionRef.current = null;
    }
    setIsActive(false);
    setGestureStatus('');
  }, []);

  const startTracking = async () => {
    if (activeRobotType !== 'arm') {
      setError('Hand tracking is only available for robot arms');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Initialize MediaPipe
      visionRef.current = getMediaPipeVision();
      await visionRef.current.initialize();

      setIsActive(true);
      setIsLoading(false);

      // Start tracking loop
      const trackFrame = () => {
        if (!visionRef.current?.initialized || !videoRef.current || !canvasRef.current) {
          animationRef.current = requestAnimationFrame(trackFrame);
          return;
        }

        const timestamp = performance.now();
        const results = visionRef.current.detectHands(videoRef.current, timestamp);

        if (results && results.landmarks && results.landmarks.length > 0) {
          // Draw landmarks
          visionRef.current.drawHandLandmarks(canvasRef.current, results);

          // Convert hand to arm angles
          const landmarks = results.landmarks[0];
          const armAngles = visionRef.current.handToArmAngles(landmarks);

          // Update robot joints
          setJoints(armAngles);

          // Detect gestures
          const isPinching = visionRef.current.detectPinch(landmarks).isPinching;
          const isPointing = visionRef.current.detectPointing(landmarks).isPointing;
          const isOpen = visionRef.current.detectOpenHand(landmarks);
          const isFist = visionRef.current.detectFist(landmarks);

          if (isPinching) setGestureStatus('Pinching (Gripper closed)');
          else if (isPointing) setGestureStatus('Pointing');
          else if (isOpen) setGestureStatus('Open hand (Gripper open)');
          else if (isFist) setGestureStatus('Fist');
          else setGestureStatus('Tracking...');
        } else {
          // Clear canvas when no hands detected
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }
          setGestureStatus('No hands detected');
        }

        animationRef.current = requestAnimationFrame(trackFrame);
      };

      animationRef.current = requestAnimationFrame(trackFrame);
    } catch (err) {
      console.error('Hand tracking error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start hand tracking');
      setIsLoading(false);
      stopTracking();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  if (activeRobotType !== 'arm') {
    return null;
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <Hand className="w-4 h-4 text-pink-400" />
        Hand Tracking Control
      </h3>

      {/* Video Preview */}
      <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden mb-3">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
          style={{ transform: 'scaleX(-1)' }}
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="absolute inset-0 w-full h-full"
          style={{ transform: 'scaleX(-1)' }}
        />
        {!isActive && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
            <CameraOff className="w-8 h-8 text-slate-600" />
          </div>
        )}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
            <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 mb-2">
        {!isActive ? (
          <Button
            variant="primary"
            size="sm"
            onClick={startTracking}
            disabled={isLoading}
            leftIcon={<Camera className="w-4 h-4" />}
          >
            {isLoading ? 'Starting...' : 'Start'}
          </Button>
        ) : (
          <Button
            variant="danger"
            size="sm"
            onClick={stopTracking}
            leftIcon={<CameraOff className="w-4 h-4" />}
          >
            Stop
          </Button>
        )}
      </div>

      {/* Status */}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
      {isActive && gestureStatus && (
        <p className="text-xs text-green-400">{gestureStatus}</p>
      )}
      <p className="text-xs text-slate-500 mt-1">
        Move your hand to control the robot arm
      </p>
    </div>
  );
};
