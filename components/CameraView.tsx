// components/CameraView.tsx
import React, { useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { LiveSession } from '@google/genai';
import { sendImageInput } from '../services/geminiService';

interface CameraViewProps {
    onClose: () => void;
    sessionPromise: Promise<LiveSession> | null;
}

const FRAME_RATE = 1; // 1 frame per second
const JPEG_QUALITY = 0.7;

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64data = reader.result as string;
            // remove the "data:image/jpeg;base64," part
            resolve(base64data.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

export const CameraView: React.FC<CameraViewProps> = ({ onClose, sessionPromise }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const frameIntervalRef = useRef<number | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);

    const captureFrame = useCallback(() => {
        if (videoRef.current && canvasRef.current && sessionPromise) {
            const videoEl = videoRef.current;
            const canvasEl = canvasRef.current;
            const ctx = canvasEl.getContext('2d');

            if (ctx) {
                canvasEl.width = videoEl.videoWidth;
                canvasEl.height = videoEl.videoHeight;
                ctx.drawImage(videoEl, 0, 0, videoEl.videoWidth, videoEl.videoHeight);
                canvasEl.toBlob(
                    async (blob) => {
                        if (blob) {
                            const base64Data = await blobToBase64(blob);
                            // NOTE: This is important to ensure data is streamed only after the session promise resolves.
                            sendImageInput(sessionPromise, base64Data);
                        }
                    },
                    'image/jpeg',
                    JPEG_QUALITY
                );
            }
        }
    }, [sessionPromise]);

    useEffect(() => {
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                mediaStreamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                if (frameIntervalRef.current) {
                    window.clearInterval(frameIntervalRef.current);
                }
                frameIntervalRef.current = window.setInterval(captureFrame, 1000 / FRAME_RATE);
            } catch (err) {
                console.error("Error accessing camera:", err);
                onClose(); // Close if camera access fails
            }
        };

        startCamera();

        return () => {
            // Cleanup
            if (frameIntervalRef.current) {
                window.clearInterval(frameIntervalRef.current);
            }
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [captureFrame, onClose]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
            <div className="relative w-full h-full max-w-4xl max-h-[80vh]">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full rounded-lg object-cover"></video>
                <canvas ref={canvasRef} className="hidden"></canvas>
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-gray-800 bg-opacity-50 rounded-full text-white hover:bg-opacity-75"
                >
                    <X size={24} />
                </button>
            </div>
        </div>
    );
};
