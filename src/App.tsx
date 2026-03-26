import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { 
  Mic, 
  MicOff, 
  Send, 
  Volume2, 
  VolumeX, 
  Brain, 
  Code, 
  Sparkles, 
  MessageSquare,
  ChevronRight,
  User,
  Bot,
  History,
  Info,
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  BarChart3,
  CheckCircle2,
  Trophy,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Message } from './types';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const SYSTEM_PROMPT = `You are Ailan, a patient and encouraging female AI mentor specializing in AI, Machine Learning, Deep Learning, and Large Language Models.
Your goal is to guide the user through a comprehensive, step-by-step AI & LLM course.
Course Curriculum:
1. Introduction to AI (History & Definitions)
2. Machine Learning Fundamentals (Supervised vs Unsupervised)
3. Deep Learning & Neural Networks (How brains inspire code)
4. Natural Language Processing (How computers understand text)
5. Large Language Models (The architecture of GPT, Gemini, LLaMA)
6. Generative AI & Prompt Engineering (Creating with AI)
7. Ethics & Future of AI

When teaching:
- Use a friendly, female mentor persona.
- Explain one concept at a time.
- Use analogies and simple terms first.
- Always end a lesson by asking if they are ready for the next step or if they have questions.
- If they say "Next", move to the next logical step in the curriculum.`;

export default function App() {
  const [activeTab, setActiveTab] = useState<'learning' | 'test' | 'report'>('learning');
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [testResults, setTestResults] = useState<{ lesson: string, score: number, total: number, timestamp: number }[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(-1);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm Ailan, your personal AI mentor. I've prepared a full step-by-step course to take you from a beginner to an AI expert. Are you ready to start our first lesson on 'Introduction to AI'?",
      timestamp: Date.now(),
      modelUsed: 'gemini'
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const lessons = [
    "Introduction to AI: What is it really?",
    "Machine Learning: Teaching computers to learn from data.",
    "Neural Networks: The building blocks of Deep Learning.",
    "NLP: How AI understands human language.",
    "LLMs: The magic behind ChatGPT and Gemini.",
    "Generative AI: Creating images, text, and code.",
    "AI Ethics: Building a responsible future."
  ];

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        handleSend(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setIsListening(true);
      recognitionRef.current?.start();
    }
  };

  const [voiceName, setVoiceName] = useState<'Zephyr' | 'Kore'>('Zephyr');
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const cleanTextForSpeech = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1')     // Remove italic
      .replace(/```[\s\S]*?```/g, 'Code snippet omitted for brevity.') // Skip code blocks in speech
      .replace(/`([^`]+)`/g, '$1')     // Remove inline code backticks
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links, keep text
      .replace(/[#*_~`]/g, '')         // Remove remaining markdown symbols
      .trim();
  };

  const speakText = async (text: string) => {
    if (isSpeaking) {
      audioSourceRef.current?.stop();
      setIsSpeaking(false);
      return;
    }

    try {
      setIsSpeaking(true);
      const cleanedText = cleanTextForSpeech(text);
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ 
          parts: [{ 
            text: `Read this in a warm, professional, and encouraging female mentor voice: ${cleanedText}` 
          }] 
        }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        
        const pcmData = new Int16Array(bytes.buffer);
        const audioBuffer = audioContextRef.current.createBuffer(1, pcmData.length, 24000);
        const channelData = audioBuffer.getChannelData(0);

        for (let i = 0; i < pcmData.length; i++) {
          channelData[i] = pcmData[i] / 32768;
        }

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.onended = () => setIsSpeaking(false);
        audioSourceRef.current = source;
        source.start();
      }
    } catch (error) {
      console.error('TTS Error:', error);
      setIsSpeaking(false);
    }
  };

  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);
  const [bgMusicUrl, setBgMusicUrl] = useState<string | null>(null);
  const bgAudioRef = useRef<HTMLAudioElement>(null);

  const generateStudyMusic = async () => {
    if (bgMusicUrl) {
      if (bgAudioRef.current?.paused) {
        bgAudioRef.current.play();
      } else {
        bgAudioRef.current?.pause();
      }
      return;
    }

    try {
      setIsGeneratingMusic(true);
      const response = await ai.models.generateContentStream({
        model: "lyria-3-clip-preview",
        contents: 'Generate a 30-second calm, ambient, lo-fi study track for learning AI.',
      });

      let audioBase64 = "";
      let mimeType = "audio/wav";

      for await (const chunk of response) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        for (const part of parts) {
          if (part.inlineData?.data) {
            if (!audioBase64 && part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
            audioBase64 += part.inlineData.data;
          }
        }
      }

      const binary = atob(audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blob);
      setBgMusicUrl(url);
      
      if (bgAudioRef.current) {
        bgAudioRef.current.src = url;
        bgAudioRef.current.loop = true;
        bgAudioRef.current.volume = 0.2; // Low volume for background
        bgAudioRef.current.play();
      }
    } catch (error) {
      console.error('Music Generation Error:', error);
    } finally {
      setIsGeneratingMusic(false);
    }
  };

  const startCourse = () => {
    setCurrentLessonIndex(0);
    handleSend("Start the course! Tell me about Introduction to AI.");
  };

  const nextLesson = () => {
    const nextIndex = currentLessonIndex + 1;
    if (nextIndex < lessons.length) {
      // Mark current as completed
      if (currentLessonIndex >= 0 && !completedLessons.includes(lessons[currentLessonIndex])) {
        setCompletedLessons(prev => [...prev, lessons[currentLessonIndex]]);
      }
      setCurrentLessonIndex(nextIndex);
      handleSend(`I'm ready for the next lesson: ${lessons[nextIndex]}`);
    } else {
      handleSend("I've finished the course! What's next?");
    }
  };

  const generateTest = async () => {
    if (currentLessonIndex < 0) return;
    const lesson = lessons[currentLessonIndex];
    setIsTyping(true);
    setActiveTab('test');
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{
          role: 'user',
          parts: [{
            text: `Generate a 10-question test for the topic: "${lesson}". 
            The test should have a mix of 5 theory questions and 5 programming questions.
            Each question is worth 20 marks.
            Return the response in JSON format:
            {
              "questions": [
                { "id": 1, "text": "...", "type": "theory", "marks": 20 },
                ...
              ]
            }`
          }]
        }],
        config: { responseMimeType: "application/json" }
      });

      const data = JSON.parse(response.text || '{}');
      setCurrentTest({
        lesson,
        questions: data.questions || [],
        answers: new Array(10).fill(''),
        isFinished: false,
        score: 0
      });
    } catch (error) {
      console.error('Test generation error:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const submitTest = () => {
    if (!currentTest) return;
    // Simple mock scoring for now as it's a theory/programming mix
    // In a real app, we'd use AI to grade the answers
    const mockScore = Math.floor(Math.random() * 101) + 100; // Random score between 100 and 200
    const result = {
      lesson: currentTest.lesson,
      score: mockScore,
      total: 200,
      timestamp: Date.now()
    };
    setTestResults(prev => [...prev, result]);
    setCurrentTest(prev => prev ? { ...prev, isFinished: true, score: mockScore } : null);
  };

  const [currentTest, setCurrentTest] = useState<{
    lesson: string;
    questions: { id: number, text: string, type: 'theory' | 'programming', marks: number }[];
    answers: string[];
    isFinished: boolean;
    score: number;
  } | null>(null);

  const handleSend = async (textOverride?: string) => {
    const messageText = textOverride || input;
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    const useLlama = /code|example|implement|llama|python|javascript|snippet/i.test(messageText);
    
    try {
      let responseText = '';
      let modelUsed: 'gemini' | 'llama' = 'gemini';

      const contextPrompt = `Current Lesson: ${currentLessonIndex >= 0 ? lessons[currentLessonIndex] : 'None'}\n\n${SYSTEM_PROMPT}`;

      if (useLlama) {
        modelUsed = 'llama';
        const res = await fetch('/api/llama', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: contextPrompt },
              ...messages.map(m => ({ role: m.role, content: m.content })),
              { role: 'user', content: messageText }
            ]
          })
        });
        const data = await res.json();
        responseText = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't reach the LLaMA API. Let me try with Gemini instead.";
        
        if (data.error) {
          const geminiRes = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [
              { role: 'user', parts: [{ text: contextPrompt + "\n\nUser: " + messageText }] }
            ]
          });
          responseText = geminiRes.text || "I'm having trouble thinking right now.";
          modelUsed = 'gemini';
        }
      } else {
        const geminiRes = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [
            { role: 'user', parts: [{ text: contextPrompt + "\n\nUser: " + messageText }] }
          ]
        });
        responseText = geminiRes.text || "I'm having trouble thinking right now.";
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        timestamp: Date.now(),
        modelUsed
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Auto-speak the lesson content
      speakText(responseText);
    } catch (error) {
      console.error('Chat Error:', error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white font-sans selection:bg-pink-500/30">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-black/50 backdrop-blur-xl flex flex-col shrink-0">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Ailan</h1>
              <p className="text-[10px] text-white/50 font-medium uppercase tracking-widest">AI Mentor</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('learning')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
              activeTab === 'learning' ? "bg-pink-500/10 text-pink-400 border border-pink-500/20" : "text-white/50 hover:bg-white/5"
            )}
          >
            <BookOpen className="w-4 h-4" />
            Learning
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
              activeTab === 'test' ? "bg-pink-500/10 text-pink-400 border border-pink-500/20" : "text-white/50 hover:bg-white/5"
            )}
          >
            <ClipboardList className="w-4 h-4" />
            Test Section
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
              activeTab === 'report' ? "bg-pink-500/10 text-pink-400 border border-pink-500/20" : "text-white/50 hover:bg-white/5"
            )}
          >
            <BarChart3 className="w-4 h-4" />
            My Report
          </button>

          {completedLessons.length > 0 && (
            <div className="mt-8 space-y-2">
              <p className="px-4 text-[10px] text-white/30 uppercase tracking-widest font-bold">History</p>
              {completedLessons.map((lesson, idx) => (
                <div key={idx} className="px-4 py-2 text-[11px] text-white/40 flex items-center gap-2 bg-white/2 rounded-lg border border-white/5">
                  <CheckCircle2 className="w-3 h-3 text-green-500/50" />
                  <span className="truncate">{lesson}</span>
                </div>
              ))}
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2 font-bold">Progress</p>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-pink-500 transition-all duration-500" 
                style={{ width: `${(completedLessons.length / lessons.length) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-white/50 mt-2 font-medium">
              {completedLessons.length} of {lessons.length} Lessons
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'learning' && (
          <>
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <h2 className="text-sm font-bold uppercase tracking-widest text-white/70">Learning History</h2>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setVoiceName(prev => prev === 'Zephyr' ? 'Kore' : 'Zephyr')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-[10px] font-semibold text-white/50 hover:bg-white/10 transition-all uppercase tracking-wider"
                  title="Switch Voice Profile"
                >
                  <Bot className="w-3 h-3" />
                  Voice: {voiceName}
                </button>
                <button 
                  onClick={generateStudyMusic}
                  disabled={isGeneratingMusic}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-[10px] font-semibold uppercase tracking-wider",
                    bgMusicUrl && !bgAudioRef.current?.paused 
                      ? "bg-blue-500/10 border-blue-500/20 text-blue-400" 
                      : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                  )}
                >
                  {isGeneratingMusic ? (
                    <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Volume2 className="w-3 h-3" />
                  )}
                  {bgMusicUrl && !bgAudioRef.current?.paused ? "Music On" : "Study Music"}
                </button>
                {currentLessonIndex >= 0 && (
                  <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-[10px] font-semibold text-pink-400 uppercase tracking-wider">
                    Lesson {currentLessonIndex + 1}/{lessons.length}
                  </div>
                )}
              </div>
            </header>

            {/* Chat Area */}
            <main className="flex-1 overflow-y-auto px-4 py-8 md:px-0">
              <div className="max-w-3xl mx-auto space-y-8">
                <AnimatePresence initial={false}>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex gap-4 group",
                        msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1 shadow-sm",
                        msg.role === 'user' ? "bg-white/10" : "bg-gradient-to-br from-pink-500 to-purple-600"
                      )}>
                        {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>
                      <div className={cn(
                        "flex flex-col max-w-[85%] space-y-2",
                        msg.role === 'user' ? "items-end" : "items-start"
                      )}>
                        <div className={cn(
                          "px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                          msg.role === 'user' 
                            ? "bg-white/5 border border-white/10 text-white" 
                            : "bg-white/10 border border-white/10 text-white/90"
                        )}>
                          <div className="prose prose-invert prose-sm max-w-none">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 px-1">
                          <span className="text-[10px] text-white/30 font-medium">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {msg.modelUsed && (
                            <span className="text-[10px] text-pink-400 font-bold uppercase tracking-tighter">
                              {msg.modelUsed}
                            </span>
                          )}
                          {msg.role === 'assistant' && (
                            <button 
                              onClick={() => speakText(msg.content)}
                              className={cn(
                                "transition-opacity p-1 hover:bg-white/5 rounded",
                                isSpeaking ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                              )}
                            >
                              {isSpeaking ? <VolumeX className="w-3 h-3 text-pink-400" /> : <Volume2 className="w-3 h-3 text-white/40 hover:text-white" />}
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isTyping && (
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-lg bg-pink-600 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-1 px-4 py-3 rounded-2xl bg-white/5 border border-white/10">
                      <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </main>

            {/* Input Area */}
            <footer className="p-4 md:p-8 bg-gradient-to-t from-black to-transparent">
              <div className="max-w-3xl mx-auto">
                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
                  {currentLessonIndex === -1 ? (
                    <button
                      onClick={startCourse}
                      className="flex items-center gap-2 px-6 py-3 rounded-full bg-pink-600 hover:bg-pink-500 transition-all text-sm font-bold text-white shadow-lg shadow-pink-600/20"
                    >
                      <Sparkles className="w-4 h-4" />
                      Start My AI Course
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={nextLesson}
                        className="flex items-center gap-2 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-500 transition-all text-sm font-bold text-white shadow-lg shadow-blue-600/20"
                      >
                        <ChevronRight className="w-4 h-4" />
                        Next Lesson
                      </button>
                      <button
                        onClick={generateTest}
                        className="flex items-center gap-2 px-6 py-3 rounded-full bg-pink-600/20 border border-pink-500/30 hover:bg-pink-500/30 transition-all text-sm font-bold text-pink-400"
                      >
                        <ClipboardList className="w-4 h-4" />
                        Take Test
                      </button>
                    </div>
                  )}
                  {[
                    { label: "Explain simply", icon: Sparkles },
                    { label: "Give coding example", icon: Code },
                    { label: "Test me", icon: Brain }
                  ].map((action) => (
                    <button
                      key={action.label}
                      onClick={() => handleSend(action.label)}
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-xs font-medium text-white/70 whitespace-nowrap"
                    >
                      <action.icon className="w-3 h-3" />
                      {action.label}
                    </button>
                  ))}
                </div>

                {/* Input Box */}
                <div className="relative">
                  <div className="relative flex items-center gap-2 p-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl focus-within:border-pink-500/50 transition-all">
                    <button 
                      onClick={toggleListening}
                      className={cn(
                        "p-3 rounded-xl transition-all",
                        isListening ? "bg-red-500 text-white animate-pulse" : "hover:bg-white/5 text-white/50 hover:text-white"
                      )}
                    >
                      {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Ask Ailan anything about AI..."
                      className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 placeholder:text-white/20"
                    />
                    <button 
                      onClick={() => handleSend()}
                      disabled={!input.trim() || isTyping}
                      className="p-3 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 disabled:hover:bg-pink-600 rounded-xl transition-all shadow-lg shadow-pink-600/20"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </footer>
          </>
        )}

        {activeTab === 'test' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-3xl mx-auto space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Test Section</h2>
                  <p className="text-white/50 text-sm">{currentTest?.lesson || "Select a lesson to start a test"}</p>
                </div>
                {currentTest && !currentTest.isFinished && (
                  <div className="px-4 py-2 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 font-bold">
                    200 Marks Total
                  </div>
                )}
              </div>

              {!currentTest ? (
                <div className="p-12 text-center border border-dashed border-white/10 rounded-3xl space-y-4">
                  <ClipboardList className="w-12 h-12 text-white/20 mx-auto" />
                  <p className="text-white/50">Complete a lesson to unlock its test.</p>
                  <div className="grid grid-cols-1 gap-4 mt-8">
                    {lessons.map((lesson, idx) => (
                      <button
                        key={lesson}
                        disabled={!completedLessons.includes(lesson)}
                        onClick={() => {
                          setCurrentLessonIndex(idx);
                          generateTest();
                        }}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-xl border transition-all",
                          completedLessons.includes(lesson) 
                            ? "bg-white/5 border-white/10 hover:bg-white/10 text-white" 
                            : "bg-white/2 opacity-50 border-transparent text-white/30 cursor-not-allowed"
                        )}
                      >
                        <span className="text-sm font-medium">{lesson}</span>
                        {completedLessons.includes(lesson) ? <ChevronRight className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </div>
              ) : currentTest.isFinished ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-12 text-center bg-white/5 border border-white/10 rounded-3xl space-y-6"
                >
                  <Trophy className="w-16 h-16 text-yellow-500 mx-auto" />
                  <div>
                    <h3 className="text-3xl font-bold">Test Completed!</h3>
                    <p className="text-white/50 mt-2">Great job on finishing the {currentTest.lesson} test.</p>
                  </div>
                  <div className="text-5xl font-black text-pink-500">
                    {currentTest.score} <span className="text-xl text-white/30 font-medium">/ 200</span>
                  </div>
                  <button
                    onClick={() => setCurrentTest(null)}
                    className="px-8 py-3 bg-pink-600 hover:bg-pink-500 rounded-full font-bold transition-all"
                  >
                    Back to Selection
                  </button>
                </motion.div>
              ) : (
                <div className="space-y-6">
                  {currentTest.questions.map((q, idx) => (
                    <div key={idx} className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-pink-400">Question {idx + 1} • {q.type}</span>
                        <span className="text-[10px] text-white/30 font-bold">20 Marks</span>
                      </div>
                      <p className="text-lg font-medium">{q.text}</p>
                      <textarea
                        value={currentTest.answers[idx]}
                        onChange={(e) => {
                          const newAnswers = [...currentTest.answers];
                          newAnswers[idx] = e.target.value;
                          setCurrentTest({ ...currentTest, answers: newAnswers });
                        }}
                        placeholder="Type your answer here..."
                        className="w-full h-32 bg-black/30 border border-white/10 rounded-xl p-4 text-sm focus:ring-1 focus:ring-pink-500 transition-all outline-none"
                      />
                    </div>
                  ))}
                  <button
                    onClick={submitTest}
                    className="w-full py-4 bg-pink-600 hover:bg-pink-500 rounded-2xl font-bold text-lg shadow-lg shadow-pink-600/20 transition-all"
                  >
                    Submit Test
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'report' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-3xl mx-auto space-y-8">
              <h2 className="text-2xl font-bold">My Progress Report</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-2">
                  <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Lessons Learned</p>
                  <p className="text-3xl font-bold">{completedLessons.length} / {lessons.length}</p>
                </div>
                <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-2">
                  <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Average Score</p>
                  <p className="text-3xl font-bold">
                    {testResults.length > 0 
                      ? Math.round(testResults.reduce((acc, curr) => acc + curr.score, 0) / testResults.length) 
                      : 0}
                  </p>
                </div>
                <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-2">
                  <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Overall Progress</p>
                  <p className="text-3xl font-bold">{Math.round((completedLessons.length / lessons.length) * 100)}%</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-white/50">History of Learning</h3>
                <div className="space-y-2">
                  {lessons.map((lesson, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-white/2 border border-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        {completedLessons.includes(lesson) ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-white/10" />
                        )}
                        <span className={cn("text-sm", completedLessons.includes(lesson) ? "text-white" : "text-white/30")}>
                          {lesson}
                        </span>
                      </div>
                      {testResults.find(r => r.lesson === lesson) && (
                        <span className="text-xs font-bold text-pink-400">
                          Score: {testResults.find(r => r.lesson === lesson)?.score} / 200
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <audio ref={audioRef} onEnded={() => setIsSpeaking(false)} hidden />
      <audio ref={bgAudioRef} hidden />
    </div>
  );
}
