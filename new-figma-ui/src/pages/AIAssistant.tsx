import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import { mockConversations } from '../data/mockData';
import { Send, Plus, Search, Sparkles } from 'lucide-react';
import { Message } from '../types';

export function AIAssistant() {
  const [conversations] = useState(mockConversations);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: `I understand you're asking about: "${input}". In a production environment, I would provide detailed guidance based on your question. For now, this is a demo response showing how the AI assistant interface works.`,
      timestamp: new Date().toISOString()
    };

    setMessages([userMessage, assistantMessage]);
    setInput('');
  };

  const startNewConversation = () => {
    setSelectedConversation(null);
    setMessages([]);
    setInput('');
  };

  return (
    <div className="h-[calc(100vh-60px)] flex" style={{ background: 'var(--c-bacPri)' }}>
      {/* Sidebar */}
      <div className="w-64 flex flex-col border-r" style={{ borderColor: 'var(--border-color-regular)' }}>
        {/* Sidebar Header */}
        <div className="p-3 space-y-2">
          <Button 
            onClick={startNewConversation}
            variant="outline"
            className="w-full justify-start gap-2 h-9"
            style={{
              background: 'white',
              borderColor: 'var(--border-color-regular)'
            }}
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm">New chat</span>
          </Button>
          
          {/* Search */}
          <div className="relative">
            <Search 
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" 
              style={{ color: 'var(--c-texSec)' }}
            />
            <Input
              placeholder="Search chats"
              className="pl-9 h-9 text-sm"
              style={{
                background: 'white',
                border: '1px solid var(--border-color-regular)'
              }}
            />
          </div>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          <div className="px-2 py-2">
            <div className="space-y-1">
              {conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv.id)}
                  className="w-full text-left px-3 py-2 rounded-lg transition-colors"
                  style={{
                    background: selectedConversation === conv.id ? 'var(--c-bacSec)' : 'transparent',
                  }}
                >
                  <p className="text-sm truncate" style={{ color: 'var(--c-texPri)' }}>
                    {conv.title}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {messages.length === 0 ? (
          /* Empty State - Centered */
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-2xl">
              {/* Centered Title */}
              <div className="text-center mb-8">
                <h1 className="text-2xl" style={{ color: 'var(--c-texPri)' }}>
                  What's on your mind today?
                </h1>
              </div>

              {/* Input Box */}
              <form onSubmit={handleSend}>
                <div 
                  className="flex items-center gap-3 px-4 py-3 rounded-full"
                  style={{ 
                    background: 'white',
                    border: '1px solid var(--border-color-regular)',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <button
                    type="button"
                    className="flex-shrink-0"
                  >
                    <Plus className="h-5 w-5" style={{ color: 'var(--c-texSec)' }} />
                  </button>
                  
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask anything"
                    className="border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm flex-1"
                    style={{
                      background: 'transparent',
                      color: 'var(--c-texPri)'
                    }}
                  />
                  
                  <Button 
                    type="submit" 
                    size="sm"
                    className="h-8 w-8 p-0 rounded-full flex-shrink-0"
                    style={{ 
                      background: input.trim() ? 'var(--c-texPri)' : 'var(--c-bacSec)',
                      color: input.trim() ? 'white' : 'var(--c-texSec)'
                    }}
                    disabled={!input.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* Conversation View */
          <>
            {/* Messages */}
            <ScrollArea className="flex-1">
              <div className="px-6 py-8">
                <div className="max-w-3xl mx-auto space-y-8">
                  {messages.map((message) => (
                    <div key={message.id} className="space-y-4">
                      {message.role === 'user' ? (
                        <div className="flex justify-end">
                          <div 
                            className="max-w-[80%] px-4 py-3 rounded-2xl"
                            style={{
                              background: 'var(--c-bacSec)',
                              color: 'var(--c-texPri)'
                            }}
                          >
                            <p className="text-sm">{message.content}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-4">
                          <div 
                            className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: 'var(--c-palUiBlu100)' }}
                          >
                            <Sparkles className="h-4 w-4" style={{ color: 'var(--c-palUiBlu600)' }} />
                          </div>
                          <div className="flex-1 space-y-2 pt-1">
                            <p className="text-sm" style={{ color: 'var(--c-texPri)', lineHeight: '1.6' }}>
                              {message.content}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>

            {/* Input at bottom */}
            <div 
              className="px-6 py-4"
              style={{ 
                background: 'var(--c-bacPri)'
              }}
            >
              <form onSubmit={handleSend}>
                <div className="max-w-3xl mx-auto">
                  <div 
                    className="flex items-center gap-3 px-4 py-3 rounded-3xl"
                    style={{ 
                      background: 'white',
                      border: '1px solid var(--border-color-regular)',
                    }}
                  >
                    <button
                      type="button"
                      className="flex-shrink-0"
                    >
                      <Plus className="h-5 w-5" style={{ color: 'var(--c-texSec)' }} />
                    </button>
                    
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask anything"
                      className="border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm flex-1"
                      style={{
                        background: 'transparent',
                        color: 'var(--c-texPri)'
                      }}
                    />
                    
                    <Button 
                      type="submit" 
                      size="sm"
                      className="h-8 w-8 p-0 rounded-full flex-shrink-0"
                      style={{ 
                        background: input.trim() ? 'var(--c-texPri)' : 'var(--c-bacSec)',
                        color: input.trim() ? 'white' : 'var(--c-texSec)'
                      }}
                      disabled={!input.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
