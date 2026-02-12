import { useState, useRef, useEffect } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, MessageCircle, Users, Phone, Video, MoreVertical } from 'lucide-react';

interface Chat {
  _id: string;
  participants: any[];
  lastMessage?: {
    content: string;
    createdAt: string;
  };
  unreadCount: number;
}

export default function ChatPage() {
  const { chats, currentChat, setCurrentChat, messages, sendMessage, isTyping } = useChat();
  const { user } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue);
    setInputValue('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    }
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    }
    return date.toLocaleDateString('pt-BR');
  };

  const getOtherParticipant = (chat: Chat) => {
    return chat.participants.find((p) => p._id !== user?.id);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex h-[calc(100vh-140px)] gap-4">
      <Card className="w-80 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Mensagens
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0 px-2">
          {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <MessageCircle className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma conversa ainda</p>
              <p className="text-xs text-muted-foreground mt-1">
                Inicie um chat com um agente pelo ticket
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {chats.map((chat) => {
                const otherParticipant = getOtherParticipant(chat);
                return (
                  <div
                    key={chat._id}
                    onClick={() => setCurrentChat(chat)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      currentChat?._id === chat._id ? 'bg-primary/10' : 'hover:bg-muted'
                    }`}
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={otherParticipant?.avatar} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {otherParticipant ? getInitials(otherParticipant.name) : '??'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">
                          {otherParticipant?.name || 'Usuário'}
                        </span>
                        {chat.lastMessage && (
                          <span className="text-xs text-muted-foreground">
                            {formatTime(chat.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      {chat.lastMessage ? (
                        <p className="text-sm text-muted-foreground truncate">
                          {chat.lastMessage.content}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          Inicie a conversa
                        </p>
                      )}
                      {chat.unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-xs text-primary-foreground mt-1">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="flex-1 flex flex-col">
        {currentChat ? (
          <>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {currentChat.participants
                        .filter((p) => p._id !== user?.id)
                        .map((p) => p.name)
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">
                      {currentChat.participants
                        .filter((p) => p._id !== user?.id)
                        .map((p) => p.name)
                        .join(', ')}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      Online
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message, index) => {
                    const isOwnMessage = message.sender._id === user?.id;
                    return (
                      <div
                        key={message._id || index}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                            isOwnMessage
                              ? 'bg-primary text-primary-foreground rounded-br-md'
                              : 'bg-muted rounded-bl-md'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <div
                            className={`flex items-center gap-2 mt-1 ${
                              isOwnMessage ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            <span className={`text-xs ${isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                              {formatTime(message.createdAt)}
                            </span>
                            {isOwnMessage && message.readBy.length > 1 && (
                              <span className="text-xs text-primary-foreground/70">✓✓</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2">
                        <div className="flex gap-1">
                          <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Digite sua mensagem..."
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col gap-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <MessageCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h3 className="font-medium">Selecione uma conversa</h3>
              <p className="text-sm text-muted-foreground">
                Escolha uma conversa à esquerda para começar a bater papo
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
