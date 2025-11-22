import React, { useState, useEffect, useRef } from 'react';
import { Mic, Play, Pause, CheckCircle, Trash2, Plus, Clock, Send, DollarSign, User, ShieldCheck, ArrowLeft, FileText, Mail, Image as ImageIcon, Edit2, X, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { extractInvoiceItemsWithAI } from '@/lib/openai-agent';
import { sendWebhookUpdate, sendJobSummary } from '@/lib/webhook-service';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const Agent = () => {
  // App States: 'start', 'working', 'summary', 'invoice-sent'
  const [view, setView] = useState('start');
  const [isListening, setIsListening] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const [transcriptError, setTranscriptError] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [showAddLaborDialog, setShowAddLaborDialog] = useState(false);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [showEditLaborDialog, setShowEditLaborDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const navigate = useNavigate();
  
  // Data States
  const [transcript, setTranscript] = useState([]);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [customerStatus, setCustomerStatus] = useState("Waiting to start...");

  // Audio recording refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const transcriptionIntervalRef = useRef(null);
  const wsRef = useRef(null);
  const isRecordingRef = useRef(false); // Use ref to avoid closure issues

  // Scroll refs to auto-scroll lists
  const transcriptEndRef = useRef(null);
  const invoiceEndRef = useRef(null);

  const scrollToBottom = () => {
    // Use setTimeout to ensure DOM is updated
    setTimeout(() => {
      if (transcriptEndRef.current) {
        transcriptEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      }
      if (invoiceEndRef.current) {
        invoiceEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [transcript, invoiceItems]);

  // Cleanup audio recording on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (transcriptionIntervalRef.current) {
        clearInterval(transcriptionIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Convert WebM blob to WAV format (simplified - for production, use a proper audio converter library)
  const convertToWav = async (webmBlob) => {
    // For now, try sending WebM directly - ElevenLabs may accept it
    // If not, we'll need to use AudioContext to convert
    try {
      // Create an audio context to convert if needed
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await webmBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Convert to WAV
      const wavBuffer = audioBufferToWav(audioBuffer);
      return new Blob([wavBuffer], { type: 'audio/wav' });
    } catch (error) {
      console.warn('Could not convert to WAV, sending WebM:', error);
      // Fallback: send as WebM or MP3
      return webmBlob;
    }
  };

  // Helper to convert AudioBuffer to WAV
  const audioBufferToWav = (buffer) => {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);
    
    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return arrayBuffer;
  };

  // Transcribe audio using ElevenLabs STT API
  const transcribeAudio = async (audioBlob) => {
    const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error('ElevenLabs API key not found. Please set VITE_ELEVENLABS_API_KEY in your environment variables.');
    }

    setIsTranscribing(true);
    setTranscriptError(null);
    
    try {
      // Try to convert to WAV, but fallback to original format
      let audioFile = audioBlob;
      try {
        audioFile = await convertToWav(audioBlob);
      } catch (conversionError) {
        console.warn('Using original audio format:', conversionError);
      }

      const formData = new FormData();
      formData.append('file', audioFile, audioFile.type === 'audio/wav' ? 'recording.wav' : 'recording.webm');
      formData.append('model_id', 'scribe_v1');
      formData.append('language_code', 'eng');
      // Note: diarize and tag_audio_events might need to be boolean or omitted
      // formData.append('diarize', 'false');
      // formData.append('tag_audio_events', 'false');

      console.log('Sending audio to STT API, size:', audioFile.size, 'type:', audioFile.type);

      const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { detail: errorText || `HTTP ${response.status}: ${response.statusText}` };
        }
        console.error('STT API Error:', errorData);
        
        // Handle nested error objects (like {detail: {status: ..., message: ...}})
        let errorMessage = '';
        if (errorData.detail) {
          if (typeof errorData.detail === 'object' && errorData.detail.message) {
            errorMessage = errorData.detail.message;
          } else if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          } else {
            errorMessage = JSON.stringify(errorData.detail);
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('STT Response:', data);

      // Parse the transcription response - ElevenLabs STT returns text directly or in a text field
      const transcriptionText = data.text || data.transcription || data.transcript || JSON.stringify(data);
      
      if (transcriptionText && transcriptionText.trim().length > 0) {
        // Clean the transcription to remove audio annotations
        const cleanedText = cleanTranscription(transcriptionText);
        
        // Skip if cleaned text is empty or too short
        if (!cleanedText || cleanedText.length < 2) {
          console.log('⏭️ Skipping transcription (noise/annotation only):', transcriptionText);
          return transcriptionText;
        }
        
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const newTranscriptEntry = {
          text: cleanedText,
          timestamp: timestamp,
        };
        
        setTranscript(prev => [...prev, newTranscriptEntry]);
        parseInvoiceItemsFromTranscript([newTranscriptEntry]).catch(error => {
          console.error('Error parsing invoice items:', error);
        });
        updateCustomerStatusFromTranscript([newTranscriptEntry]);
        
        return transcriptionText;
      } else {
        throw new Error('No transcription text in response. Response: ' + JSON.stringify(data));
      }
    } catch (error) {
      console.error('STT Error:', error);
      let errorMessage = 'Unknown transcription error';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        errorMessage = JSON.stringify(error);
      }
      
      setTranscriptError(`Transcription error: ${errorMessage}\n\nPossible issues:\n- API key may be invalid or account restricted\n- Free tier may be disabled (upgrade to paid plan)\n- Microphone permission not granted\n- Audio file too small or invalid format\n\nCheck browser console for details.`);
      throw error;
    } finally {
      setIsTranscribing(false);
    }
  };

  // Real-time transcription using chunked recording
  const startRealTimeTranscription = async () => {
    const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
    if (!apiKey) {
      setTranscriptError('ElevenLabs API key not found. Please set VITE_ELEVENLABS_API_KEY in your environment variables.');
      return;
    }

    try {
      console.log('🎤 Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      console.log('✅ Microphone access granted');
      streamRef.current = stream;

      // Create audio context for processing
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      });
      audioContextRef.current = audioContext;
      console.log('🎵 Audio context created, sample rate:', audioContext.sampleRate);

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      let audioBuffer = [];
      const CHUNK_DURATION_MS = 1500; // Transcribe every 1.5 seconds for faster response
      let lastTranscriptionTime = Date.now();
      let chunkCount = 0;
      const audioBufferRef = { current: audioBuffer }; // Use ref to access from stop function
      const lastTranscriptionTimeRef = { current: lastTranscriptionTime }; // Store for cleanup

      processor.onaudioprocess = async (e) => {
        // Use ref instead of state to avoid closure issues
        if (!isRecordingRef.current) {
          return;
        }

        const inputData = e.inputBuffer.getChannelData(0);
        const audioLevel = Math.max(...Array.from(inputData).map(Math.abs));
        
        // Only buffer if there's actual audio (not just silence)
        if (audioLevel > 0.01) {
          audioBuffer.push(...Array.from(inputData));
          audioBufferRef.current = audioBuffer; // Keep ref in sync
          
          // Log less frequently to avoid console spam
          if (audioBuffer.length % 16384 === 0) {
            console.log(`🔊 Audio detected, level: ${audioLevel.toFixed(3)}, buffer size: ${audioBuffer.length}`);
          }
        }

        const now = Date.now();
        const timeSinceLastTranscription = now - lastTranscriptionTime;
        
        if (timeSinceLastTranscription >= CHUNK_DURATION_MS && audioBuffer.length > 0) {
          chunkCount++;
          const samplesCount = audioBuffer.length;
          const duration = (samplesCount / audioContext.sampleRate).toFixed(2);
          console.log(`📤 Sending chunk #${chunkCount} for transcription (${samplesCount} samples, ${duration}s)`);
          
          lastTranscriptionTime = now;
          lastTranscriptionTimeRef.current = now;
          
          // Convert Float32Array to WAV blob
          const wavBlob = float32ArrayToWav([...audioBuffer], audioContext.sampleRate);
          console.log(`📦 Created WAV blob: ${wavBlob.size} bytes`);
          
          // Clear buffer AFTER copying
          audioBuffer = [];
          audioBufferRef.current = audioBuffer;

          // Transcribe in background (don't await to keep real-time)
          transcribeAudioChunk(wavBlob).catch(error => {
            console.error('❌ Chunk transcription error:', error);
          });
        }
      };
      
      // Store buffer ref and context for cleanup
      processorRef.current.audioBufferRef = audioBufferRef;
      processorRef.current.audioContext = audioContext;
      processorRef.current.lastTranscriptionTime = lastTranscriptionTimeRef;
      processorRef.current.CHUNK_DURATION_MS = CHUNK_DURATION_MS;

      source.connect(processor);
      processor.connect(audioContext.destination);
      console.log('🔗 Audio processor connected');

      // Set recording state BEFORE setting up processor to avoid closure issues
      isRecordingRef.current = true;
      setIsRecording(true);
      setIsListening(true);
      setTranscriptError(null);
      console.log('✅ Real-time transcription started');
    } catch (error) {
      console.error('❌ Error starting real-time transcription:', error);
      setTranscriptError(`Recording error: ${error.message}. Please allow microphone access.`);
      isRecordingRef.current = false;
      setIsRecording(false);
      setIsListening(false);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  // Convert Float32Array to WAV blob
  const float32ArrayToWav = (float32Array, sampleRate) => {
    const length = float32Array.length;
    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);
    
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
    
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  };

  // Transcribe a single audio chunk (non-blocking)
  const transcribeAudioChunk = async (audioBlob) => {
    const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ No API key found');
      return;
    }
    
    if (audioBlob.size < 100) {
      console.warn('⚠️ Audio blob too small:', audioBlob.size);
      return; // Skip if too small
    }

    console.log(`🚀 Starting transcription for chunk (${audioBlob.size} bytes)`);
    setIsTranscribing(true);

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'chunk.wav');
      formData.append('model_id', 'scribe_v1');
      formData.append('language_code', 'eng');

      console.log('📡 Sending to ElevenLabs API...');
      const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { detail: errorText };
        }
        
        console.error('❌ Transcription failed:', response.status, errorData);
        
        // Only show error if it's not the account restriction (to avoid spam)
        if (response.status === 401 && errorData.detail?.message?.includes('Free Tier')) {
          setTranscriptError(`Account restriction: ${errorData.detail.message}`);
          return;
        }
        
        // Show first error, then just log subsequent ones
        if (!transcriptError) {
          setTranscriptError(`Transcription error: ${errorData.detail?.message || errorData.detail || 'Unknown error'}`);
        }
        return;
      }

      const data = await response.json();
      console.log('✅ Transcription response:', data);
      
      const transcriptionText = data.text || data.transcription || data.transcript;
      
      if (transcriptionText && transcriptionText.trim().length > 0) {
        // Clean the transcription to remove audio annotations
        const cleanedText = cleanTranscription(transcriptionText);
        
        // Skip if cleaned text is empty or too short
        if (!cleanedText || cleanedText.length < 2) {
          console.log('⏭️ Skipping transcription (noise/annotation only):', transcriptionText);
          return;
        }
        
        console.log(`📝 Got transcription: "${cleanedText}"`);
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const newTranscriptEntry = {
          text: cleanedText,
          timestamp: timestamp,
        };
        
        setTranscript(prev => {
          // Avoid duplicate entries
          const lastEntry = prev[prev.length - 1];
          if (lastEntry && lastEntry.text === newTranscriptEntry.text) {
            console.log('⏭️ Skipping duplicate transcription');
            return prev;
          }
          const updated = [...prev, newTranscriptEntry];
          console.log(`✅ Added transcription. Total entries: ${updated.length}`);
          
          // Parse invoice items from the updated transcript (async, don't await)
          parseInvoiceItemsFromTranscript(updated).catch(error => {
            console.error('Error parsing invoice items:', error);
          });
          updateCustomerStatusFromTranscript(updated);
          
          return updated;
        });
      } else {
        console.warn('⚠️ No transcription text in response:', data);
      }
    } catch (error) {
      console.error('❌ Chunk transcription error:', error);
      if (!transcriptError) {
        setTranscriptError(`Transcription error: ${error.message}`);
      }
    } finally {
      setIsTranscribing(false);
    }
  };

  // Start audio recording (legacy - now uses real-time)
  const startRecording = async () => {
    await startRealTimeTranscription();
  };

  // Stop audio recording
  const stopRecording = () => {
    console.log('🛑 Stopping recording...');
    isRecordingRef.current = false;
    
    // Send any remaining audio buffer before stopping
    if (processorRef.current && processorRef.current.audioBufferRef) {
      const remainingBuffer = processorRef.current.audioBufferRef.current;
      const context = processorRef.current.audioContext || audioContextRef.current;
      const lastTime = processorRef.current.lastTranscriptionTime?.current || 0;
      const chunkDuration = processorRef.current.CHUNK_DURATION_MS || 1500;
      
      // Send if we have at least 0.5 seconds of audio OR if enough time has passed since last transcription
      const minSamples = (context?.sampleRate || 16000) * 0.5; // 0.5 seconds minimum
      const timeSinceLast = Date.now() - lastTime;
      
      if (remainingBuffer && remainingBuffer.length > minSamples && context) {
        console.log(`📤 Sending final chunk (${remainingBuffer.length} samples, ${(remainingBuffer.length / context.sampleRate).toFixed(2)}s)`);
        const wavBlob = float32ArrayToWav([...remainingBuffer], context.sampleRate);
        transcribeAudioChunk(wavBlob).catch(error => {
          console.error('❌ Final chunk transcription error:', error);
        });
      } else if (timeSinceLast >= chunkDuration && remainingBuffer && remainingBuffer.length > 0 && context) {
        // Even if short, send it if enough time has passed
        console.log(`📤 Sending final short chunk (${remainingBuffer.length} samples)`);
        const wavBlob = float32ArrayToWav([...remainingBuffer], context.sampleRate);
        transcribeAudioChunk(wavBlob).catch(error => {
          console.error('❌ Final chunk transcription error:', error);
        });
      }
    }
    
    // Stop audio processing
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
        processorRef.current = null;
        console.log('✅ Processor disconnected');
      } catch (error) {
        console.error('Error disconnecting processor:', error);
      }
    }

    // Close audio context (check state first)
    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().then(() => {
            console.log('✅ Audio context closed');
          }).catch(error => {
            console.error('Error closing audio context:', error);
          });
        }
        audioContextRef.current = null;
      } catch (error) {
        console.error('Error closing audio context:', error);
      }
    }

    // Stop media recorder if it exists
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      } catch (error) {
        console.error('Error stopping MediaRecorder:', error);
      }
      mediaRecorderRef.current = null;
    }

    // Clear transcription interval
    if (transcriptionIntervalRef.current) {
      clearInterval(transcriptionIntervalRef.current);
      transcriptionIntervalRef.current = null;
    }

    // Close WebSocket if open
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsRecording(false);
    setIsListening(false);
    
    // Stop all tracks when explicitly stopping
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Toggle recording
  const toggleRecording = async () => {
    // Prevent rapid toggling
    if (isTranscribing) {
      console.log('Transcription in progress, please wait...');
      return;
    }

    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  // Fetch transcript from ElevenLabs API (legacy - keeping for backward compatibility)
  const fetchTranscript = async () => {
    setIsLoadingTranscript(true);
    try {
      const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
      if (!apiKey) {
        setTranscriptError('ElevenLabs API key not found. Please set VITE_ELEVENLABS_API_KEY in your environment variables.');
        setIsLoadingTranscript(false);
        return;
      }
      
      setTranscriptError(null);

      // Try alternative endpoint paths - ElevenLabs API might use different paths
      // Based on ElevenLabs API docs, transcripts can be accessed via different endpoints
      const possibleEndpoints = [
        `https://api.elevenlabs.io/v1/speech-to-text/${TRANSCRIPT_ID}`,
        `https://api.elevenlabs.io/v1/speech-to-text/transcripts/${TRANSCRIPT_ID}`,
        `https://api.elevenlabs.io/v1/speech-to-text/transcriptions/${TRANSCRIPT_ID}`,
        `https://api.elevenlabs.io/v1/conversational-ai/transcripts/${TRANSCRIPT_ID}`,
        `https://api.elevenlabs.io/v1/conversational-ai/conversations/${TRANSCRIPT_ID}/transcript`,
        `https://api.elevenlabs.io/v1/conversational-ai/conversations/${TRANSCRIPT_ID}`,
      ];

      let response;
      let lastError;
      
      for (const endpoint of possibleEndpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);
          response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'xi-api-key': apiKey,
              'Content-Type': 'application/json',
            },
          });

          console.log(`Response status: ${response.status} for ${endpoint}`);
          
          if (response.ok) {
            console.log(`Success! Using endpoint: ${endpoint}`);
            break; // Success, use this response
          } else {
            // Always log the error response body for debugging
            try {
              const errorBody = await response.clone().text();
              console.log(`Error (${response.status}) for ${endpoint}:`, errorBody);
              try {
                const errorJson = JSON.parse(errorBody);
                console.log('Parsed error JSON:', errorJson);
              } catch (e) {
                // Not JSON, that's fine
              }
            } catch (e) {
              console.error('Could not read error body:', e);
            }
            
            if (response.status !== 404) {
              // If it's not a 404, this might be the right endpoint but there's another error
              break;
            }
            // If 404, try next endpoint
            console.log(`404 for ${endpoint}, trying next...`);
          }
        } catch (err) {
          console.error(`Error fetching from ${endpoint}:`, err);
          lastError = err;
          continue;
        }
      }

      // If all endpoints returned 404, try to get more info from the last response
      if (!response || !response.ok) {
        let errorText = 'Unknown error';
        let errorData = null;
        
        if (response) {
          try {
            errorText = await response.text();
            if (errorText && errorText.trim().startsWith('{')) {
              errorData = JSON.parse(errorText);
              console.log('Error response data:', errorData);
            }
          } catch (e) {
            console.error('Could not parse error response:', e);
          }
        }
        
        // Try one more thing - maybe we need to list conversations first to find the right one
        console.log('All transcript endpoints failed. Trying to list conversations...');
        
        try {
          const listResponse = await fetch(
            'https://api.elevenlabs.io/v1/conversational-ai/conversations',
            {
              method: 'GET',
              headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
              },
            }
          );
          
          if (listResponse.ok) {
            const conversations = await listResponse.json();
            console.log('Available conversations:', conversations);
            
            // Try to find our conversation ID in the list
            const foundConversation = conversations.conversations?.find(
              conv => conv.conversation_id === TRANSCRIPT_ID || conv.id === TRANSCRIPT_ID
            );
            
            if (foundConversation) {
              console.log('Found conversation:', foundConversation);
              // Try to get this conversation's transcript
              const convResponse = await fetch(
                `https://api.elevenlabs.io/v1/conversational-ai/conversations/${foundConversation.conversation_id || foundConversation.id}`,
                {
                  method: 'GET',
                  headers: {
                    'xi-api-key': apiKey,
                    'Content-Type': 'application/json',
                  },
                }
              );
              
              if (convResponse.ok) {
                const convData = await convResponse.json();
                console.log('Conversation data:', convData);
                
                // Parse transcript from conversation data
                if (convData.transcript || convData.messages || convData.history) {
                  response = convResponse;
                  // Continue to data parsing below
                }
              }
            }
          }
        } catch (listErr) {
          console.error('Failed to list conversations:', listErr);
        }
        
        // If we still don't have a successful response, throw error
        if (!response || !response.ok) {
          let errorMessage = `Failed to fetch transcript: ${response?.status || 'Network Error'} ${response?.statusText || ''}`;
          
          if (errorData) {
            if (errorData.detail || errorData.message) {
              errorMessage += ` - ${errorData.detail || errorData.message}`;
            }
          } else if (errorText && errorText !== 'Unknown error') {
            errorMessage += ` - ${errorText.substring(0, 200)}`;
          }
          
          // Add helpful debugging info
          console.error('Failed endpoints:', possibleEndpoints);
          console.error('API Key present:', !!apiKey);
          console.error('Transcript ID:', TRANSCRIPT_ID);
          console.error('Error details:', { errorData, errorText });
          
          throw new Error(`${errorMessage}\n\nTried endpoints:\n${possibleEndpoints.map((e, i) => `${i + 1}. ${e}`).join('\n')}\n\nPlease check:\n1. Your API key has access to this transcript\n2. The transcript ID is correct\n3. The transcript exists in your ElevenLabs account\n4. Check browser console for detailed logs`);
        }
      }

      const data = await response.json();
      console.log('Successfully fetched data:', data);
      
      // Parse the transcript data - handle different response formats
      let transcriptData = data;
      
      // If it's a conversation response, extract transcript/messages
      if (data.messages && !data.words) {
        console.log('Parsing messages from conversation:', data.messages);
        // Convert messages to transcript format
        const messages = Array.isArray(data.messages) ? data.messages : [];
        const transcriptText = messages
          .map(msg => msg.text || msg.content || msg.message || msg.transcript_text)
          .filter(Boolean)
          .join(' ');
        
        if (transcriptText) {
          transcriptData = {
            text: transcriptText,
            words: messages
              .filter(msg => msg.text || msg.content || msg.message || msg.transcript_text)
              .flatMap((msg, idx) => {
                const text = msg.text || msg.content || msg.message || msg.transcript_text;
                // Split into words if needed
                const words = text.split(/\s+/).filter(w => w.length > 0);
                const startTime = msg.timestamp || msg.start_time || msg.created_at || idx;
                return words.map((word, wordIdx) => ({
                  text: word.replace(/[.,!?]/g, ''),
                  start: startTime + (wordIdx * 0.5),
                  end: startTime + ((wordIdx + 1) * 0.5),
                }));
              })
          };
        }
      } else if (data.transcript && typeof data.transcript === 'string') {
        // If transcript is just a string
        transcriptData = {
          text: data.transcript,
          words: data.transcript.split(/\s+/).map((word, idx) => ({
            text: word.replace(/[.,!?]/g, ''),
            start: idx * 0.5,
            end: (idx + 1) * 0.5,
          }))
        };
      } else if (data.history && Array.isArray(data.history)) {
        // If transcript is in history array
        const transcriptText = data.history
          .map(item => item.text || item.content || item.message)
          .filter(Boolean)
          .join(' ');
        
        transcriptData = {
          text: transcriptText,
          words: data.history
            .filter(item => item.text || item.content || item.message)
            .flatMap((item, idx) => {
              const text = item.text || item.content || item.message;
              const words = text.split(/\s+/).filter(w => w.length > 0);
              const startTime = item.timestamp || item.start_time || idx;
              return words.map((word, wordIdx) => ({
                text: word.replace(/[.,!?]/g, ''),
                start: startTime + (wordIdx * 0.5),
                end: startTime + ((wordIdx + 1) * 0.5),
              }));
            })
        };
      }
      
      // Parse the transcript data
      if (transcriptData.words && transcriptData.words.length > 0) {
        // Group words into sentences/phrases by time gaps or pauses
        const parsedTranscript = [];
        let currentPhrase = [];
        let lastEndTime = 0;

        transcriptData.words.forEach((word, index) => {
          // If there's a significant gap (>1 second), start a new phrase
          if (currentPhrase.length > 0 && word.start - lastEndTime > 1.0) {
            parsedTranscript.push({
              text: currentPhrase.map(w => w.text).join(' '),
              timestamp: formatTimestamp(currentPhrase[0].start),
            });
            currentPhrase = [];
          }

          currentPhrase.push(word);
          lastEndTime = word.end;

          // Also create a phrase if we hit a sentence-ending punctuation
          if (word.text.match(/[.!?]$/) && index < data.words.length - 1) {
            parsedTranscript.push({
              text: currentPhrase.map(w => w.text).join(' '),
              timestamp: formatTimestamp(currentPhrase[0].start),
            });
            currentPhrase = [];
          }
        });

        // Add remaining words
        if (currentPhrase.length > 0) {
          parsedTranscript.push({
            text: currentPhrase.map(w => w.text).join(' '),
            timestamp: formatTimestamp(currentPhrase[0].start),
          });
        }

        setTranscript(parsedTranscript);
        
        // Auto-parse invoice items from transcript
        parseInvoiceItemsFromTranscript(parsedTranscript).catch(error => {
          console.error('Error parsing invoice items:', error);
        });
        
        // Update customer status based on transcript content
        updateCustomerStatusFromTranscript(parsedTranscript);
      } else if (transcriptData.text) {
        // Fallback: if no words array, use the full text as a single entry
        const fallbackTranscript = [{
          text: transcriptData.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }];
        setTranscript(fallbackTranscript);
        parseInvoiceItemsFromTranscript(fallbackTranscript).catch(error => {
          console.error('Error parsing invoice items:', error);
        });
        updateCustomerStatusFromTranscript(fallbackTranscript);
      } else {
        // If we got data but can't parse it, log it and show error
        console.error('Could not parse transcript data. Received:', transcriptData);
        setTranscriptError(
          `Received data but could not parse transcript format.\n` +
          `Please check browser console for the received data structure.\n` +
          `Received data type: ${typeof transcriptData}\n` +
          `Keys: ${Object.keys(transcriptData || {}).join(', ')}`
        );
      }
    } catch (error) {
      console.error('Error fetching transcript:', error);
      const errorMsg = error.message || 'Unknown error';
      setTranscriptError(
        `Failed to load transcript: ${errorMsg}\n\n` +
        `Troubleshooting steps:\n` +
        `1. Open browser console (F12) to see detailed endpoint attempts\n` +
        `2. Verify your API key is correct: ${import.meta.env.VITE_ELEVENLABS_API_KEY ? 'Key is set (check if valid)' : 'Key is NOT set'}\n` +
        `3. Verify transcript ID exists in your ElevenLabs account\n` +
        `4. Check ElevenLabs API docs for the correct endpoint format\n` +
        `5. Ensure your API key has permission to access this transcript`
      );
    } finally {
      setIsLoadingTranscript(false);
    }
  };

  // Auto-parse invoice items from transcript text using OpenAI
  const parseInvoiceItemsFromTranscript = async (transcriptItems) => {
    const text = transcriptItems.map(t => t.text).join(' ');
    
    // Only process if we have meaningful content
    if (!text || text.trim().length < 10) {
      return;
    }

    // Debounce: Only process every 5 seconds to avoid too many API calls
    const now = Date.now();
    if (parseInvoiceItemsFromTranscript.lastProcessed && 
        now - parseInvoiceItemsFromTranscript.lastProcessed < 5000) {
      return;
    }
    parseInvoiceItemsFromTranscript.lastProcessed = now;

    setIsProcessingAI(true);
    
    try {
      console.log('🤖 Processing transcript with OpenAI (extraction)...', { 
        textLength: text.length, 
        itemsCount: transcriptItems.length 
      });
      
      // Extract items with OpenAI (main task - fast)
      const items = await extractInvoiceItemsWithAI(text, undefined, transcriptItems);
      
      if (items && items.length > 0) {
        console.log('✅ Extracted items:', items);
        
        // Merge with existing items, avoiding duplicates
        setInvoiceItems(prev => {
          const existingNames = new Set(prev.map(item => item.name.toLowerCase()));
          const newItems = items.filter(item => !existingNames.has(item.name.toLowerCase()));
          
          if (newItems.length > 0) {
            // Send webhook updates in parallel (Gemini will handle explanations)
            const transcriptText = transcriptItems.map(t => t.text).join(' ');
            
            // Send all webhook updates in parallel for speed
            Promise.all(
              newItems.map(item => 
                sendWebhookUpdate('item_added', item, {
                  jobNumber: '4092',
                  customer: 'John Doe',
                  vehicle: '2018 Ford Focus'
                }, transcriptText).catch(err => {
                  console.error('Webhook error for item:', item.name, err);
                  return null; // Don't fail all if one fails
                })
              )
            ).then(() => {
              console.log('✅ All webhook updates sent');
            });
            
            return [...prev, ...newItems];
          }
          return prev;
        });
      } else {
        console.log('ℹ️ No items extracted from transcript');
      }
    } catch (error) {
      console.error('❌ Error processing with AI:', error);
      // Fallback to basic parsing if AI fails
      parseInvoiceItemsBasic(transcriptItems);
    } finally {
      setIsProcessingAI(false);
    }
  };

  // Fallback basic parsing (original logic)
  const parseInvoiceItemsBasic = (transcriptItems) => {
    const items = [];
    const text = transcriptItems.map(t => t.text).join(' ').toLowerCase();
    
    // Look for price patterns: $XX, $XX.XX, or "XX dollars"
    const pricePattern = /\$?(\d+)(?:\.(\d{2}))?/g;
    const priceMatches = [...text.matchAll(pricePattern)];
    
    // Look for common part/service mentions
    const partKeywords = ['mount', 'part', 'component', 'filter', 'belt', 'brake', 'tire', 'battery'];
    const laborKeywords = ['labor', 'hour', 'hr', 'service', 'work', 'time'];
    
    priceMatches.forEach((match, index) => {
      const price = parseFloat(match[1] + (match[2] ? '.' + match[2] : '.00'));
      const matchIndex = text.indexOf(match[0]);
      const contextBefore = text.substring(Math.max(0, matchIndex - 50), matchIndex);
      const contextAfter = text.substring(matchIndex, Math.min(text.length, matchIndex + 50));
      const context = contextBefore + contextAfter;
      
      // Check if it's labor
      if (laborKeywords.some(keyword => context.includes(keyword))) {
        items.push({
          id: Date.now() + index,
          name: 'Labor (1 Hour)',
          price: price || 85,
          type: 'labor'
        });
      } else if (partKeywords.some(keyword => context.includes(keyword))) {
        // Try to extract part name from context
        const partNameMatch = context.match(/new\s+([a-z\s]+?)(?:\s+\$|\s+price|\s+cost|$)/i);
        const partName = partNameMatch ? partNameMatch[1].trim() : 'Part';
        items.push({
          id: Date.now() + index,
          name: partName.charAt(0).toUpperCase() + partName.slice(1),
          price: price,
          type: 'part'
        });
      } else if (price > 10 && price < 1000) {
        // Generic item if price is reasonable
        items.push({
          id: Date.now() + index,
          name: 'Service Item',
          price: price,
          type: 'part'
        });
      }
    });
    
    // Remove duplicates and set invoice items
    if (items.length > 0) {
      setInvoiceItems(prev => {
        const existingNames = new Set(prev.map(item => item.name.toLowerCase()));
        const newItems = items.filter(item => !existingNames.has(item.name.toLowerCase()));
        return newItems.length > 0 ? [...prev, ...newItems] : prev;
      });
    }
  };

  // Update customer status based on transcript content
  const updateCustomerStatusFromTranscript = (transcriptItems) => {
    const fullText = transcriptItems.map(t => t.text).join(' ').toLowerCase();
    
    if (fullText.includes('checking') || fullText.includes('diagnosing')) {
      setCustomerStatus("Technician is diagnosing the issue...");
    } else if (fullText.includes('installing') || fullText.includes('replacing')) {
      setCustomerStatus("Technician is replacing parts...");
    } else if (fullText.includes('done') || fullText.includes('finished') || fullText.includes('complete')) {
      setCustomerStatus("Job completed");
    } else if (transcriptItems.length > 0) {
      setCustomerStatus("Technician is working...");
    }
  };

  // Helper function to format timestamp from seconds
  const formatTimestamp = (seconds) => {
    const date = new Date(0);
    date.setSeconds(seconds);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Clean transcription text by removing audio annotations and noise
  const cleanTranscription = (text) => {
    if (!text || typeof text !== 'string') {
      return '';
    }

    let cleaned = text.trim();

    // Remove common audio annotation patterns (case-insensitive)
    const audioAnnotations = [
      /\s*\(footsteps?\)\s*/gi,
      /\s*\(music\)\s*/gi,
      /\s*\(techno music\)\s*/gi,
      /\s*\(slow music plays?\)\s*/gi,
      /\s*\(background music\)\s*/gi,
      /\s*\(background chatter\)\s*/gi,
      /\s*\(people chattering\)\s*/gi,
      /\s*\(people talking in the background\)\s*/gi,
      /\s*\(voices? in background\)\s*/gi,
      /\s*\(people talking\)\s*/gi,
      /\s*\(glasses clinking\)\s*/gi,
      /\s*\(laughs?\)\s*/gi,
      /\s*\(screams?\)\s*/gi,
      /\s*\(.*?\)\s*/g, // Remove any remaining parenthetical annotations
    ];

    // Remove all audio annotations
    audioAnnotations.forEach(pattern => {
      cleaned = cleaned.replace(pattern, ' ');
    });

    // Remove multiple spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // Filter out very short or meaningless entries
    if (cleaned.length < 2) {
      return '';
    }

    // Filter out entries that are just punctuation or filler
    const meaninglessPatterns = [
      /^[\.\,\!\?\;\:\-\s]+$/, // Only punctuation
      /^(uh|um|ah|eh|oh|hmm|huh|yeah|yes|no|ok|okay|ya|yep|nope|yup)$/i, // Just filler words
      /^[""]+$/, // Just quotes
    ];

    if (meaninglessPatterns.some(pattern => pattern.test(cleaned))) {
      return '';
    }

    return cleaned;
  };

  // Auto-start recording when entering working view (optional - can be removed if manual start preferred)
  // useEffect(() => {
  //   if (view === 'working' && !isRecording && !streamRef.current) {
  //     setTimeout(() => startRecording(), 500);
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [view]);

  // --- SIMULATION LOGIC (The "AI" Brain) ---
  const handleVoiceInput = (text, actionType, data) => {
    // 1. Update Transcript
    setTranscript(prev => [...prev, { text, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    
    // 2. Update Customer Status (Simulated transparency)
    if (text.toLowerCase().includes("checking") || text.toLowerCase().includes("diagnosing")) {
      setCustomerStatus("Technician is diagnosing the issue...");
    } else if (text.toLowerCase().includes("installing") || text.toLowerCase().includes("replacing")) {
      setCustomerStatus("Technician is replacing parts...");
    }

    // 3. Update Invoice Logic
    if (actionType === 'add_item') {
      setInvoiceItems(prev => [...prev, { id: Date.now(), ...data }]);
    } 
    else if (actionType === 'add_labor') {
      // Open dialog to add labor with description
      setShowAddLaborDialog(true);
    }
    else if (actionType === 'remove_last') {
       setInvoiceItems(prev => prev.slice(0, -1)); // Removes last item
    }
    else if (actionType === 'make_free') {
       setInvoiceItems(prev => {
         const newItems = [...prev];
         if(newItems.length > 0) {
           const lastItem = newItems[newItems.length - 1];
           newItems[newItems.length - 1] = { ...lastItem, price: 0 };
           
           // Send webhook update
           sendWebhookUpdate('item_made_free', newItems[newItems.length - 1], {
             jobNumber: '4092',
             customer: 'John Doe',
             vehicle: '2018 Ford Focus'
           }).catch(err => console.error('Webhook error:', err));
         }
         return newItems;
       });
    }
    else if (actionType === 'add_manual_item') {
      // Open dialog to manually add item
      setShowAddItemDialog(true);
    }
    else if (actionType === 'finish') {
      // Send job summary to webhook
      const currentTotal = invoiceItems.reduce((sum, item) => sum + item.price, 0);
      sendJobSummary(invoiceItems, currentTotal, {
        jobNumber: '4092',
        customer: 'John Doe',
        vehicle: '2018 Ford Focus'
      }).catch(err => console.error('Webhook error:', err));
      
      setTimeout(() => setView('summary'), 1000);
    }
  };

  // Calculate Total
  const total = invoiceItems.reduce((sum, item) => sum + item.price, 0);

  // --- VIEW: 1. START JOB ---
  if (view === 'start') {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 sm:p-6 font-sans max-w-md mx-auto relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#7c4dff]/20 to-background z-0"></div>
        
        <div className="z-10 flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-[#7c4dff] rounded-full flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(124,77,255,0.5)] animate-pulse">
            <Mic size={40} className="text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Job #4092</h1>
          <p className="text-muted-foreground mb-8 text-sm sm:text-base">Customer: John Doe • 2018 Ford Focus</p>
          
          <button 
            onClick={() => { 
              setView('working'); 
              // Start recording automatically when entering working view
              setTimeout(() => startRecording(), 500);
            }}
            className="bg-foreground text-background px-8 py-4 rounded-2xl font-bold text-base sm:text-lg flex items-center gap-2 hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoadingTranscript}
          >
            <Play size={20} fill="currentColor" />
            {isLoadingTranscript ? 'Loading...' : 'Start Real-Time Transcription'}
          </button>
        </div>
      </div>
    );
  }

  // --- VIEW: 3. SUMMARY (FINISH) ---
  if (view === 'summary') {
    return (
      <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 font-sans max-w-md mx-auto flex flex-col">
        <header className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-[#00E096] flex items-center gap-2">
            <CheckCircle /> Job Complete
          </h1>
          <p className="text-muted-foreground text-sm">Review Invoice Draft</p>
        </header>

        <div className="flex-1 bg-card rounded-2xl p-4 sm:p-6 mb-4 overflow-y-auto border border-border">
          <h2 className="text-base sm:text-lg font-semibold mb-4 border-b border-border pb-2">Invoice Summary</h2>
          
          {invoiceItems.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-xl h-32 flex items-center justify-center text-muted-foreground text-sm">
              No items recorded.
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-6">
                {invoiceItems.map((item) => (
                  <div key={item.id} className="bg-background border border-border p-4 rounded-xl">
                    <div className="flex items-start gap-3">
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded-lg border border-border shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className={`p-2 rounded-lg shrink-0 ${item.type === 'part' ? 'bg-[#7c4dff]/20 text-[#7c4dff]' : 'bg-orange-500/20 text-orange-400'}`}>
                        {item.type === 'part' ? <Plus size={18}/> : <Clock size={18}/>}
                      </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm sm:text-base">{item.name}</h4>
                            {item.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                            )}
                            {item.laborDescription && (
                              <p className="text-xs text-muted-foreground mt-0.5 italic">Work: {item.laborDescription}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground capitalize">{item.type}</p>
                              {item.category && (
                                <span className="text-xs text-muted-foreground">• {item.category}</span>
                              )}
                              {item.hours && item.hours > 0 && (
                                <span className="text-xs text-muted-foreground">• {item.hours}hr{item.hours > 1 ? 's' : ''}</span>
                              )}
                      </div>
                    </div>
                          <div className="text-right shrink-0">
                      <span className="font-bold text-lg">
                        {item.price === 0 ? (
                          <span className="text-[#00E096] text-sm">FREE</span>
                        ) : (
                                `$${item.price.toFixed(2)}`
                        )}
                      </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="pt-4 border-t border-border">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground text-sm">Items: {invoiceItems.length}</span>
                  <span className="text-muted-foreground text-sm">Subtotal: ${total}</span>
                </div>
                <div className="flex justify-between items-end pt-2">
                  <span className="text-muted-foreground text-base sm:text-lg font-semibold">Total Due</span>
                  <span className="text-2xl sm:text-3xl font-bold text-[#7c4dff]">${total}</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button className="bg-card border border-border py-3 rounded-xl font-medium text-sm sm:text-base hover:bg-accent hover:text-accent-foreground transition-colors" onClick={() => setView('working')}>Resume Work</button>
          <button 
            className="bg-[#7c4dff] py-3 rounded-xl font-medium text-sm sm:text-base flex items-center justify-center gap-2 hover:bg-[#6d3fef] transition-colors text-white"
            onClick={() => {
              // Send final invoice summary to webhook
              sendJobSummary(invoiceItems, total, {
                jobNumber: '4092',
                customer: 'John Doe',
                vehicle: '2018 Ford Focus'
              }).catch(err => console.error('Webhook error:', err));
              
              setIsAnimating(true);
              setTimeout(() => {
                setView('invoice-sent');
                setIsAnimating(false);
              }, 500);
            }}
          >
            <Send size={18} /> Approve & Send
          </button>
        </div>
      </div>
    );
  }

  // --- VIEW: 4. INVOICE SENT (SUCCESS) ---
  if (view === 'invoice-sent') {
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    return (
      <div className={`min-h-screen bg-background text-foreground p-4 sm:p-6 font-sans max-w-md mx-auto flex flex-col ${isAnimating ? 'animate-fade-out' : 'animate-fade-in'}`}>
        {/* Success Animation Header */}
        <div className="flex flex-col items-center justify-center mb-8 mt-8">
          <div className="relative mb-6">
            <div className="w-24 h-24 bg-[#00E096] rounded-full flex items-center justify-center animate-scale-in shadow-[0_0_40px_rgba(0,224,150,0.5)]">
              <CheckCircle size={48} className="text-background" />
            </div>
            <div className="absolute inset-0 bg-[#00E096] rounded-full animate-ping opacity-20"></div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#00E096] mb-2">Invoice Sent!</h1>
          <p className="text-muted-foreground text-sm sm:text-base text-center">Invoice #{invoiceNumber} has been sent to the customer</p>
        </div>

        {/* Invoice Details Card */}
        <div className="flex-1 bg-card rounded-2xl p-4 sm:p-6 mb-6 animate-slide-up border border-border">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border">
            <FileText className="text-[#7c4dff]" size={20} />
            <h2 className="text-lg sm:text-xl font-bold">Invoice Details</h2>
          </div>

          {/* Invoice Info */}
          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Invoice Number</span>
              <span className="font-mono font-semibold">{invoiceNumber}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Date</span>
              <span className="font-medium">{currentDate}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Customer</span>
              <span className="font-medium">John Doe</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Vehicle</span>
              <span className="font-medium">2018 Ford Focus</span>
            </div>
          </div>

          {/* Items List */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase">Items</h3>
            <div className="space-y-2">
              {invoiceItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground uppercase">{item.type}</p>
                  </div>
                  <span className="font-mono font-semibold">
                    {item.price === 0 ? <span className="text-[#00E096] text-xs">FREE</span> : `$${item.price}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="pt-4 border-t border-border">
            <div className="flex justify-between items-end mb-2">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono">${total}</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-2xl sm:text-3xl font-bold text-[#7c4dff]">${total}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-full bg-[#7c4dff] py-4 rounded-xl font-medium text-base flex items-center justify-center gap-2 hover:bg-[#6d3fef] transition-colors text-white"
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>
          <button 
            onClick={() => {
              setView('start');
              setTranscript([]);
              setInvoiceItems([]);
              setCustomerStatus("Waiting to start...");
            }}
            className="w-full bg-card border border-border py-3 rounded-xl font-medium text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Start New Job
          </button>
        </div>
      </div>
    );
  }

  // --- VIEW: 2. LIVE WORK SCREEN (MAIN UI) ---
  return (
    <div className="h-screen max-h-screen bg-background text-foreground font-sans flex flex-col relative max-w-md mx-auto overflow-hidden">
      
      {/* Header & Customer Status */}
      <header className="bg-card/80 backdrop-blur-lg p-3 sm:p-4 border-b border-border z-20 sticky top-0 flex-shrink-0">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/50' : 'bg-gray-400'}`}></div>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
              {isRecording ? 'Live Transcribing...' : isTranscribing ? 'Processing...' : 'Ready'}
            </span>
            </div>
          <button 
            onClick={() => handleVoiceInput("I'm done.", 'finish')} 
            className="text-[11px] sm:text-xs bg-card hover:bg-accent hover:text-accent-foreground px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-border transition-colors font-medium min-h-[44px] touch-manipulation"
          >
            End Job
        </button>
        </div>
        <div className="flex items-center gap-1.5 text-[#00E096] text-[11px] sm:text-xs bg-[#00E096]/10 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full border border-[#00E096]/20 w-fit">
          <ShieldCheck size={12} className="sm:w-[14px] sm:h-[14px]" />
          <span className="font-medium">{customerStatus}</span>
        </div>
      </header>

      {/* TOP SECTION: TRANSCRIPT (35% Height) */}
      <div className="flex-none h-[35%] min-h-[200px] max-h-[35vh] bg-gradient-to-b from-background to-background/95 overflow-hidden border-b border-border flex flex-col">
        <div className="flex items-center justify-between p-3 sm:p-4 pb-2 bg-background/95 backdrop-blur-sm border-b border-border/50 flex-shrink-0">
          <h3 className="text-muted-foreground text-[10px] sm:text-xs uppercase font-bold tracking-wider">Live Transcript</h3>
          {transcript.length > 0 && (
            <span className="text-[10px] sm:text-xs text-muted-foreground">{transcript.length} entries</span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 pt-2" data-scroll-container>
          <div className="space-y-2 sm:space-y-3">
          {isTranscribing && (
            <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm py-3 sm:py-4">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#7c4dff] rounded-full animate-pulse"></div>
              <span>Transcribing audio with ElevenLabs STT...</span>
            </div>
          )}
          {transcriptError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 sm:p-4">
              <p className="text-red-400 text-[11px] sm:text-xs whitespace-pre-wrap leading-relaxed">{transcriptError}</p>
              <button 
                onClick={() => setTranscriptError(null)} 
                className="text-[11px] sm:text-xs text-red-400 hover:text-red-300 underline mt-2 font-medium min-h-[44px] touch-manipulation"
              >
                Dismiss
              </button>
            </div>
          )}
          {!isTranscribing && !transcriptError && transcript.length === 0 && (
            <div className="text-center py-8 sm:py-12">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#7c4dff]/10 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                <Mic className="w-7 h-7 sm:w-8 sm:h-8 text-[#7c4dff] opacity-60" />
              </div>
              <p className="text-muted-foreground text-xs sm:text-sm font-medium">Ready to transcribe</p>
              <p className="text-muted-foreground text-[10px] sm:text-xs mt-1">Tap the button below to start</p>
            </div>
          )}
          {transcript.map((t, i) => (
            <div key={i} className="animate-fade-in-up bg-card/50 border border-border/50 rounded-lg p-2.5 sm:p-3 hover:bg-card/80 transition-colors">
              <p className="text-foreground text-xs sm:text-sm leading-relaxed mb-1">"{t.text}"</p>
              <span className="text-[9px] sm:text-[10px] text-muted-foreground font-mono">{t.timestamp}</span>
            </div>
          ))}
            <div ref={transcriptEndRef} />
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: INVOICE CARDS (Remaining Height) */}
      <div className="flex-1 min-h-0 bg-gradient-to-b from-background to-background/95 overflow-hidden flex flex-col">
        <div className="flex-shrink-0 bg-background/95 backdrop-blur-sm border-b border-border p-3 sm:p-4 pb-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
              <h3 className="text-muted-foreground text-[10px] sm:text-xs uppercase font-bold tracking-wider">
                Invoice Items
              </h3>
              {isProcessingAI && (
                <span className="text-[#7c4dff] text-[10px] sm:text-xs animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#7c4dff] rounded-full"></span>
                  <span className="hidden sm:inline">AI Processing...</span>
                </span>
              )}
            </div>
            <span className="text-[#7c4dff] text-sm sm:text-base font-bold ml-2">${total.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddItemDialog(true)}
              className="flex-1 text-[11px] sm:text-xs bg-[#7c4dff] hover:bg-[#6d3fef] text-white px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 font-medium shadow-sm min-h-[44px] touch-manipulation"
            >
              <Plus size={14} className="sm:w-[14px] sm:h-[14px]" />
              <span>Add Item</span>
            </button>
            <button
              onClick={() => setShowAddLaborDialog(true)}
              className="flex-1 text-[11px] sm:text-xs bg-orange-600 hover:bg-orange-500 text-white px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 font-medium shadow-sm min-h-[44px] touch-manipulation"
            >
              <Clock size={14} className="sm:w-[14px] sm:h-[14px]" />
              <span>Add Labor</span>
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 pt-2" data-scroll-container>
          <div className="space-y-2 sm:space-y-3 pb-32 sm:pb-36"> 
          {invoiceItems.length === 0 && (
             <div className="border-2 border-dashed border-border rounded-xl h-32 sm:h-40 flex flex-col items-center justify-center text-muted-foreground p-4 sm:p-6">
               <Plus className="w-6 h-6 sm:w-8 sm:h-8 mb-2 opacity-40" />
               <p className="text-xs sm:text-sm font-medium">No items yet</p>
               <p className="text-[10px] sm:text-xs mt-1 text-center">Items will appear here as you speak or add them manually</p>
             </div>
          )}
          
          {invoiceItems.map((item) => (
            <div key={item.id} className="bg-card border border-border p-3 sm:p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow animate-slide-in-right">
              <div className="flex items-start gap-2.5 sm:gap-3">
                {/* Image or Icon */}
                {item.imageUrl ? (
                  <img 
                    src={item.imageUrl} 
                    alt={item.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-border shrink-0"
                    onError={(e) => {
                      // Fallback to icon if image fails to load
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className={`p-2.5 sm:p-3 rounded-lg shrink-0 ${item.type === 'part' ? 'bg-[#7c4dff]/20 text-[#7c4dff]' : item.type === 'labor' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {item.type === 'part' ? <Plus size={18} className="sm:w-5 sm:h-5"/> : item.type === 'labor' ? <Clock size={18} className="sm:w-5 sm:h-5"/> : <FileText size={18} className="sm:w-5 sm:h-5"/>}
                </div>
                )}
                
                {/* Item Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1.5 sm:mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-xs sm:text-sm leading-tight">{item.name}</h4>
                      {item.description && (
                        <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 leading-relaxed">{item.description}</p>
                      )}
                      {item.laborDescription && (
                        <div className="mt-1 sm:mt-1.5 p-1.5 sm:p-2 bg-orange-500/5 border border-orange-500/20 rounded-md">
                          <p className="text-[10px] sm:text-xs text-orange-400 font-medium mb-0.5">Work Performed:</p>
                          <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">{item.laborDescription}</p>
                </div>
                      )}
              </div>
                    <div className="text-right shrink-0 ml-1.5 sm:ml-2">
                      <span className="font-bold text-base sm:text-lg">
                        {item.price === 0 ? (
                          <span className="text-[#00E096] text-sm sm:text-base font-bold">FREE</span>
                        ) : (
                          `$${item.price.toFixed(2)}`
                        )}
                </span>
                    </div>
                  </div>
                  
                  {/* Metadata */}
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize font-medium">
                      {item.type}
                    </span>
                    {item.category && (
                      <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {item.category}
                      </span>
                    )}
                    {item.quantity && item.quantity > 1 && (
                      <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        Qty: {item.quantity}
                      </span>
                    )}
                    {item.hours && item.hours > 0 && (
                      <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 font-medium">
                        {item.hours}hr{item.hours > 1 ? 's' : ''}
                      </span>
                    )}
                    {item.partNumber && (
                      <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">
                        #{item.partNumber}
                      </span>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 sm:gap-2 pt-1.5 sm:pt-2 mt-1.5 sm:mt-2 border-t border-border">
                    {item.type === 'labor' && (
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setShowEditLaborDialog(true);
                        }}
                        className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-2 sm:py-1.5 rounded-md hover:bg-accent transition-colors font-medium min-h-[40px] sm:min-h-[36px] touch-manipulation"
                      >
                        <Edit2 size={12} className="sm:w-[13px] sm:h-[13px]" />
                        <span>Edit</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setInvoiceItems(prev => prev.map(i => {
                          if (i.id === item.id) {
                            const originalPrice = i.type === 'labor' ? (i.hours || 1) * 85 : (i.price || 0);
                            const updated = { ...i, price: i.price === 0 ? originalPrice : 0 };
                            
                            // Send webhook update
                            sendWebhookUpdate('item_made_free', updated, {
                              jobNumber: '4092',
                              customer: 'John Doe',
                              vehicle: '2018 Ford Focus'
                            }).catch(err => console.error('Webhook error:', err));
                            
                            return updated;
                          }
                          return i;
                        }));
                      }}
                      className="text-[10px] sm:text-xs text-muted-foreground hover:text-[#00E096] flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-2 sm:py-1.5 rounded-md hover:bg-accent transition-colors font-medium min-h-[40px] sm:min-h-[36px] touch-manipulation"
                    >
                      <Gift size={12} className="sm:w-[13px] sm:h-[13px]" />
                      <span>{item.price === 0 ? 'Restore' : 'Make Free'}</span>
                    </button>
                    <button
                      onClick={() => {
                        // Send webhook update before removing
                        sendWebhookUpdate('item_removed', item, {
                          jobNumber: '4092',
                          customer: 'John Doe',
                          vehicle: '2018 Ford Focus'
                        }).catch(err => console.error('Webhook error:', err));
                        
                        setInvoiceItems(prev => prev.filter(i => i.id !== item.id));
                      }}
                      className="text-[10px] sm:text-xs text-red-400 hover:text-red-500 flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-2 sm:py-1.5 rounded-md hover:bg-red-500/10 transition-colors font-medium ml-auto min-h-[40px] sm:min-h-[36px] touch-manipulation"
                    >
                      <X size={12} className="sm:w-[13px] sm:h-[13px]" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
            <div ref={invoiceEndRef} />
          </div>
        </div>
      </div>

      {/* Floating Record/Stop Button Overlay - Centered */}
      <button
        onClick={toggleRecording}
        disabled={isTranscribing}
        className={`fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 touch-manipulation ${
          isRecording
            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
            : 'bg-[#7c4dff] hover:bg-[#6d3fef] text-white'
        } ${isTranscribing ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {isRecording ? (
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75"></div>
            <Pause size={24} className="relative z-10 sm:w-7 sm:h-7" fill="currentColor" />
          </div>
        ) : (
          <Mic size={24} className="sm:w-7 sm:h-7" />
        )}
      </button>

      {/* Add Labor Dialog */}
      <Dialog open={showAddLaborDialog} onOpenChange={setShowAddLaborDialog}>
        <DialogContent className="max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>Add Labor Hours</DialogTitle>
            <DialogDescription>
              Add labor time with a description of the work performed
            </DialogDescription>
          </DialogHeader>
          <AddLaborForm
            onSave={(hours, description, price) => {
              const laborItem = {
                id: Date.now(),
                name: `Labor (${hours} ${hours === 1 ? 'Hour' : 'Hours'})`,
                price: price || hours * 85,
                type: 'labor' as const,
                hours: hours,
                laborDescription: description,
                description: description || `Labor for ${hours} ${hours === 1 ? 'hour' : 'hours'}`,
                category: 'labor'
              };
              setInvoiceItems(prev => [...prev, laborItem]);
              
              // Send webhook update with transcript context
              const transcriptText = transcript.map(t => t.text).join(' ');
              sendWebhookUpdate('item_added', laborItem, {
                jobNumber: '4092',
                customer: 'John Doe',
                vehicle: '2018 Ford Focus'
              }, transcriptText).catch(err => console.error('Webhook error:', err));
              
              setShowAddLaborDialog(false);
            }}
            onCancel={() => setShowAddLaborDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Labor Dialog */}
      <Dialog open={showEditLaborDialog} onOpenChange={setShowEditLaborDialog}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Edit Labor Entry</DialogTitle>
            <DialogDescription>
              Update the labor description or add more context
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <EditLaborForm
              item={editingItem}
              onSave={(description) => {
                setInvoiceItems(prev => prev.map(i => {
                  if (i.id === editingItem.id) {
                    const updated = { ...i, laborDescription: description, description: description || i.description };
                    // Send webhook update with transcript context
                    const transcriptText = transcript.map(t => t.text).join(' ');
                    sendWebhookUpdate('labor_updated', updated, {
                      jobNumber: '4092',
                      customer: 'John Doe',
                      vehicle: '2018 Ford Focus'
                    }, transcriptText).catch(err => console.error('Webhook error:', err));
                    return updated;
                  }
                  return i;
                }));
                setShowEditLaborDialog(false);
                setEditingItem(null);
              }}
              onCancel={() => {
                setShowEditLaborDialog(false);
                setEditingItem(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Add Manual Item Dialog */}
      <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Add Item to Invoice</DialogTitle>
            <DialogDescription>
              Manually add a part, service, or other item
            </DialogDescription>
          </DialogHeader>
          <AddItemForm
            onSave={(itemData) => {
              const newItem = {
                id: Date.now(),
                ...itemData,
                type: itemData.type || 'part',
              };
              setInvoiceItems(prev => [...prev, newItem]);
              
              // Send webhook update with transcript context
              const transcriptText = transcript.map(t => t.text).join(' ');
              sendWebhookUpdate('item_added', newItem, {
                jobNumber: '4092',
                customer: 'John Doe',
                vehicle: '2018 Ford Focus'
              }, transcriptText).catch(err => console.error('Webhook error:', err));
              
              setShowAddItemDialog(false);
            }}
            onCancel={() => setShowAddItemDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Add Labor Form Component
const AddLaborForm = ({ onSave, onCancel }: { onSave: (hours: number, description: string, price?: number) => void; onCancel: () => void }) => {
  const [hours, setHours] = useState(1);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(85);

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="hours">Hours</Label>
        <Input
          id="hours"
          type="number"
          min="0.5"
          step="0.5"
          value={hours}
          onChange={(e) => {
            const val = parseFloat(e.target.value) || 1;
            setHours(val);
            setPrice(val * 85);
          }}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Work Description</Label>
        <Textarea
          id="description"
          placeholder="Describe what work was performed (e.g., 'Replaced engine mount and installed new brake pads')"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="price">Price per Hour</Label>
        <Input
          id="price"
          type="number"
          min="0"
          step="1"
          value={price / hours}
          onChange={(e) => {
            const rate = parseFloat(e.target.value) || 85;
            setPrice(hours * rate);
          }}
        />
        <p className="text-xs text-muted-foreground">Total: ${price.toFixed(2)}</p>
        </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(hours, description, price)}>Add Labor</Button>
      </DialogFooter>
    </div>
  );
};

// Edit Labor Form Component
const EditLaborForm = ({ item, onSave, onCancel }: { item: any; onSave: (description: string) => void; onCancel: () => void }) => {
  const [description, setDescription] = useState(item.laborDescription || item.description || '');

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="edit-description">Work Description</Label>
        <Textarea
          id="edit-description"
          placeholder="Describe what work was performed..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          Add or update the description of work performed during this labor entry
        </p>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(description)}>Save Changes</Button>
      </DialogFooter>
    </div>
  );
};

// Add Item Form Component
const AddItemForm = ({ onSave, onCancel }: { onSave: (item: any) => void; onCancel: () => void }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [type, setType] = useState<'part' | 'labor' | 'service'>('part');
  const [description, setDescription] = useState('');

    return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="item-name">Item Name</Label>
        <Input
          id="item-name"
          placeholder="e.g., Engine Mount, Oil Change, Diagnostic"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="item-type">Type</Label>
        <select
          id="item-type"
          value={type}
          onChange={(e) => setType(e.target.value as 'part' | 'labor' | 'service')}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="part">Part</option>
          <option value="service">Service</option>
          <option value="labor">Labor</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="item-price">Price</Label>
        <Input
          id="item-price"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={price}
          onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="item-description">Description (Optional)</Label>
        <Textarea
          id="item-description"
          placeholder="Additional details about this item"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button 
          onClick={() => onSave({ name, price, type, description: description || undefined })}
          disabled={!name || price < 0}
        >
          Add Item
        </Button>
      </DialogFooter>
    </div>
  );
};

export default Agent;
