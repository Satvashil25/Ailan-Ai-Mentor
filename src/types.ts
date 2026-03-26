export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  modelUsed?: 'gemini' | 'llama';
}

export interface ChatState {
  messages: Message[];
  isTyping: boolean;
  isListening: boolean;
  isSpeaking: boolean;
}
