'use client';

import { useEffect, useState, RefObject } from 'react';
import * as faceapi from 'face-api.js';
import * as tf from '@tensorflow/tfjs';

interface DetectionData {
  box: faceapi.Box;
  landmarks: faceapi.FaceLandmarks68;
  confidence: number;
}

export function useFaceDetection(videoRef: RefObject<HTMLVideoElement | null>, isActive: boolean) {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [detections, setDetections] = useState<DetectionData[]>([]);
  const [samples, setSamples] = useState(0);

  // 1. Load models once
  useEffect(() => {
    const loadModels = async () => {
      // Ensure we are in browser and tf is present
      if (typeof window === 'undefined' || !tf) return;

      try {
        // v1.7.0 tf.ready() equivalent: check if backends are here
        if (tf.getBackend() !== 'webgl') {
          await tf.setBackend('webgl');
        }
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models')
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error('Error loading face-api models:', err);
      }
    };
    loadModels();
  }, []);

  // 2. Detection loop (Multi-face)
  useEffect(() => {
    if (!modelsLoaded || !isActive) {
      setDetections([]);
      return;
    }

    let timerId: NodeJS.Timeout;

    const runDetection = async () => {
      if (!isActive || !modelsLoaded) return;
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) {
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
          .detectAllFaces(videoEl, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.3 }))
          .withFaceLandmarks();

        if (allDetections && allDetections.length > 0) {
          const formatted = allDetections.map(d => ({
            box: d.detection.box,
            landmarks: d.landmarks,
            confidence: d.detection.score
          }));
          setDetections(formatted);
          setSamples((prev) => prev + 1);
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
