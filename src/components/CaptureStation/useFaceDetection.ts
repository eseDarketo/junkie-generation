'use client';

import * as tf from '@tensorflow/tfjs';
import * as faceapi from 'face-api.js';
import { RefObject, useEffect, useState } from 'react';

export interface DetectionData {
  box: faceapi.Box;
  landmarks: faceapi.FaceLandmarks68;
  confidence: number;
  descriptor: Float32Array | null;
}

export function useFaceDetection(
  videoRef: RefObject<HTMLVideoElement | null>,
  isActive: boolean,
) {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [detections, setDetections] = useState<DetectionData[]>([]);
  const [samples, setSamples] = useState(0);

  // 1. Load models once
  useEffect(() => {
    const loadModels = async () => {
      if (typeof window === 'undefined' || !tf) return;

      try {
        if (tf.getBackend() !== 'webgl') {
          await tf.setBackend('webgl');
        }

        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error('Error loading face-api models:', err);
      }
    };
    loadModels();
  }, []);

  // 2. Multi-face detection loop with descriptor extraction
  useEffect(() => {
    if (!modelsLoaded || !isActive) {
      setDetections([]);
      return;
    }

    let timerId: NodeJS.Timeout;

    const runDetection = async () => {
      if (!isActive || !modelsLoaded) return;
      if (
        !videoRef.current ||
        videoRef.current.paused ||
        videoRef.current.ended
      ) {
        timerId = setTimeout(runDetection, 100);
        return;
      }

      const videoEl = videoRef.current;
      if (videoEl.videoWidth === 0 || videoEl.videoHeight === 0) {
        timerId = setTimeout(runDetection, 100);
        return;
      }

      try {
        const allDetections = await faceapi
          .detectAllFaces(
            videoEl,
            new faceapi.TinyFaceDetectorOptions({
              inputSize: 320,
              scoreThreshold: 0.3,
            }),
          )
          .withFaceLandmarks()
          .withFaceDescriptors();

        if (allDetections && allDetections.length > 0) {
          const formatted = allDetections
            .map((d) => {
              const { landmarks, detection, descriptor } = d;

              // Calculate symmetry for frontal face estimation
              const leftEye = landmarks.getLeftEye()[0];
              const rightEye = landmarks.getRightEye()[3];
              const noseTip = landmarks.getNose()[6];

              const distToLeft = Math.abs(noseTip.x - leftEye.x);
              const distToRight = Math.abs(rightEye.x - noseTip.x);

              const symmetryRatio =
                Math.abs(distToLeft - distToRight) /
                Math.max(distToLeft, distToRight);
              const isLookingFront = symmetryRatio < 0.25;

              if (!isLookingFront) return null;

              return {
                box: detection.box,
                landmarks: landmarks,
                confidence: detection.score,
                descriptor: descriptor,
              };
            })
            .filter((d): d is DetectionData => d !== null);

          setDetections(formatted);
          if (formatted.length > 0) setSamples((prev) => prev + 1);
        } else {
          setDetections([]);
        }
      } catch (err) {
        console.error('Detection loop error:', err);
      }

      timerId = setTimeout(runDetection, 100);
    };

    runDetection();

    return () => clearTimeout(timerId);
  }, [modelsLoaded, isActive, videoRef]);

  return { modelsLoaded, detections, samples };
}
