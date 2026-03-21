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
  const [currentDetection, setCurrentDetection] = useState<DetectionData | null>(null);
  const [samples, setSamples] = useState(0);

  // 1. Load models once
  useEffect(() => {
    const loadModels = async () => {
      // Ensure we are in browser and tf is present
      if (typeof window === 'undefined' || !tf) return;

      try {
        // v0.22 face-api internal tf initialization
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

  // 2. Detection loop
  useEffect(() => {
    if (!modelsLoaded || !isActive) {
      setCurrentDetection(null);
      return;
    }

    const intervalId = setInterval(async () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

      const videoEl = videoRef.current;
      
      // We use tinyFaceDetector per spec
      const detectionWithLandmarks = await faceapi
        .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.8 }))
        .withFaceLandmarks();

      if (detectionWithLandmarks) {
        const { detection, landmarks } = detectionWithLandmarks;
        setCurrentDetection({
          box: detection.box,
          landmarks: landmarks,
          confidence: detection.score
        });
        setSamples((prev) => prev + 1);
      } else {
        setCurrentDetection(null);
      }
    }, 500); // 500ms loop as per spec

    return () => clearInterval(intervalId);
  }, [modelsLoaded, isActive, videoRef]);

  return { modelsLoaded, currentDetection, samples };
}
