import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Hash, MessageCircle, MessagesSquare, MoreVertical, Phone, Plus, Search, Send, Video } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { usersApi, type UserListItem } from '@/api/users';
import { chatApi } from '@/api/chat';

type ChatItem = {
  _id: string;
  participants: any[];
  lastMessage?: { content: string; createdAt: string };
  unreadCount: number;
  ticket?: string;
  scope?: 'ticket' | 'internal';
  type?: 'dm' | 'channel';
  name?: string;
  channelKey?: string;
  isDefault?: boolean;
  updatedAt?: string;
};

type TabKey = 'tickets' | 'internal';

export default function ChatPage() {
  const {
    chats,
    currentChat,
    setCurrentChat,
    messages,
    sendMessage,
    isTyping,
    startTyping,
    stopTyping,
    markAsRead,
    onlineUsers,
    setScope,
    refreshChats,
    isLoadingChats,
    isLoadingMessages,
  } = useChat();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [dmOpen, setDmOpen] = useState(false);
  const [dmSearch, setDmSearch] = useState('');
  const [staff, setStaff] = useState<UserListItem[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [startingDmId, setStartingDmId] = useState<string | null>(null);

  const isStaff = (user?.role || 'client') !== 'client';

  const tab: TabKey = useMemo(() => {
    const raw = searchParams.get('tab');
    if (isStaff && raw === 'internal') return 'internal';
    return 'tickets';
  }, [searchParams, isStaff]);

  const chatIdParam = useMemo(() => {
    const raw = searchParams.get('chatId');
    return raw ? String(raw) : null;
  }, [searchParams]);

  const [inputValue, setInputValue] = useState('');
  const messageInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [unseenCount, setUnseenCount] = useState(0);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const tag = (t?.tagName || '').toLowerCase();
      const isTypingTarget =
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        (t as any)?.isContentEditable;

      if (isTypingTarget) return;

      if (e.key === '/') {
        if (!currentChat) return;
        e.preventDefault();
        messageInputRef.current?.focus();
        return;
      }

      if (e.key === 'Escape') {
        if (!inputValue.trim()) return;
        setInputValue('');
        stopTyping();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentChat, inputValue, stopTyping]);

  useEffect(() => {
    const desiredScope = chatIdParam ? 'all' : (tab === 'internal' ? 'internal' : 'ticket');
    setScope(desiredScope);

    if (chatIdParam) {
      refreshChats('all');
      return;
    }

    if (desiredScope !== 'all' && currentChat) {
      const c: any = currentChat;
      const isInternalChat = c.scope === 'internal' || (!c.ticket && (c.type === 'channel' || c.channelKey));
      const isTicketChat = c.scope === 'ticket' || !!c.ticket;

      const mismatch = (desiredScope === 'internal' && !isInternalChat) || (desiredScope === 'ticket' && !isTicketChat);
      if (mismatch) {
        setCurrentChat(null);
      }
    }
  }, [tab, chatIdParam, setScope, setCurrentChat, refreshChats, currentChat]);

  useEffect(() => {
    if (!chatIdParam) return;
    const match = (chats as any[]).find((c: any) => String(c._id) === String(chatIdParam));
    if (!match) return;

    if (!currentChat || String((currentChat as any)._id) !== String(chatIdParam)) {
      setCurrentChat(match as any);
    }

    const isInternalChat = match.scope === 'internal' || (!match.ticket && (match.type === 'channel' || match.channelKey));
    const nextTab: TabKey = isStaff && isInternalChat ? 'internal' : 'tickets';

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('chatId');
    if (nextTab === 'internal') nextParams.set('tab', 'internal');
    else nextParams.delete('tab');
    setSearchParams(nextParams, { replace: true });
  }, [chatIdParam, chats, currentChat, isStaff, searchParams, setCurrentChat, setSearchParams]);

  useEffect(() => {
    if (!shouldAutoScrollRef.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!currentChat) {
      setShowJumpToBottom(false);
      setUnseenCount(0);
      return;
    }

    if (!shouldAutoScrollRef.current) {
      setShowJumpToBottom(true);
      setUnseenCount((c) => Math.min(99, c + 1));
    } else {
      setShowJumpToBottom(false);
      setUnseenCount(0);
    }
  }, [currentChat, messages.length]);

  useEffect(() => {
    // When switching chats, always jump to bottom.
    shouldAutoScrollRef.current = true;
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [currentChat?._id]);

  useEffect(() => {
    if (currentChat) markAsRead();
  }, [currentChat, markAsRead]);

  useEffect(() => {
    const t = window.setTimeout(() => stopTyping(), 600);
    return () => window.clearTimeout(t);
  }, [inputValue, stopTyping]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatUnread = (n: number) => (n > 9 ? '9+' : String(n));

  const getInitials = (name: string) => {
    return String(name || '')
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getOtherParticipant = (chat: ChatItem) => {
    return (chat.participants || []).find((p: any) => p?._id !== user?.id);
  };

  const activeTitle = useMemo(() => {
    if (!currentChat) return '';
    const c: any = currentChat;
    if (c.type === 'channel' || c.channelKey) return c.name || `#${c.channelKey}`;
    const others = (c.participants || []).filter((p: any) => p?._id !== user?.id);
    if (others.length) return others.map((p: any) => p.name).join(', ');
    return 'Conversa';
  }, [currentChat, user?.id]);

  const internalChannels = useMemo(() => {
    if (tab !== 'internal') return [];
    return (chats as any[])
      .filter((c: any) => c.type === 'channel' || c.channelKey)
      .sort((a: any, b: any) => {
        const ad = a.isDefault ? 0 : 1;
        const bd = b.isDefault ? 0 : 1;
        if (ad !== bd) return ad - bd;

        const aTs = a.lastMessage?.createdAt || a.updatedAt;
        const bTs = b.lastMessage?.createdAt || b.updatedAt;
        const at = aTs ? new Date(aTs).getTime() : 0;
        const bt = bTs ? new Date(bTs).getTime() : 0;
        if (at !== bt) return bt - at;

        return String(a.name || a.channelKey).localeCompare(String(b.name || b.channelKey));
      });
  }, [chats, tab]);

  const internalDms = useMemo(() => {
    if (tab !== 'internal') return [];
    return (chats as any[])
      .filter((c: any) => !(c.type === 'channel' || c.channelKey))
      .sort((a: any, b: any) => {
        const aTs = a.lastMessage?.createdAt || a.updatedAt;
        const bTs = b.lastMessage?.createdAt || b.updatedAt;
        const at = aTs ? new Date(aTs).getTime() : 0;
        const bt = bTs ? new Date(bTs).getTime() : 0;
        return bt - at;
      });
  }, [chats, tab]);

  const setTab = (next: TabKey) => {
    if (!isStaff) return;
    const p = new URLSearchParams(searchParams);
    if (next === 'internal') p.set('tab', 'internal');
    else p.delete('tab');
    setSearchParams(p, { replace: true });
  };

  const loadStaff = async () => {
    if (!isStaff) return;
    setStaffLoading(true);
    try {
      const res = await usersApi.listStaff();
      setStaff(res.data.users || []);
    } catch {
      setStaff([]);
    } finally {
      setStaffLoading(false);
    }
  };

  const startInternalDm = async (u: UserListItem) => {
    setStartingDmId(u.id);
    try {
      const res = await chatApi.create({ participantId: u.id });
      const chat = res.data.chat;
      if (chat?._id) {
        setDmOpen(false);
        setDmSearch('');
        setSearchParams({ tab: 'internal', chatId: String(chat._id) }, { replace: false });
      }
    } finally {
      setStartingDmId(null);
    }
  };

  const filteredStaff = useMemo(() => {
    const q = dmSearch.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((u) =>
      String(u.name || '').toLowerCase().includes(q) || String(u.email || '').toLowerCase().includes(q)
    );
  }, [dmSearch, staff]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue);
    setInputValue('');
  };

  const typingActive = !!isTyping;

  return (
    <div className="flex h-[calc(100vh-140px)] gap-4">
      <Card className="w-80 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              {tab === 'internal' ? <MessagesSquare className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
              {tab === 'internal' ? 'Chat Interno' : 'Mensagens'}
            </CardTitle>

            {isStaff ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                {tab === 'internal' ? (
                  <Dialog
                    open={dmOpen}
                    onOpenChange={(v) => {
                      setDmOpen(v);
                      if (v) loadStaff();
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button type="button" size="sm" variant="outline" className="h-8 px-2">
                        <Plus className="h-4 w-4" />
                        <span className="ml-2 hidden sm:inline">Novo DM</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Novo chat direto</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={dmSearch}
                            onChange={(e) => setDmSearch(e.target.value)}
                            placeholder="Buscar por nome ou email"
                            className="pl-9"
                          />
                        </div>
                        <div className="max-h-72 overflow-auto rounded-md border">
                          {staffLoading ? (
                            <div className="p-4 text-sm text-muted-foreground">Carregando...</div>
                          ) : filteredStaff.length === 0 ? (
                            <div className="p-4 text-sm text-muted-foreground">Nenhum membro encontrado</div>
                          ) : (
                            <div className="divide-y">
                              {filteredStaff.map((m) => (
                                <button
                                  key={m.id}
                                  type="button"
                                  className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-muted/50"
                                  onClick={() => startInternalDm(m)}
                                  disabled={startingDmId === m.id}
                                >
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-medium">{m.name}</div>
                                    <div className="truncate text-xs text-muted-foreground">{m.email}</div>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {startingDmId === m.id ? 'Abrindo...' : 'Iniciar'}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : null}

                <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={tab === 'tickets' ? 'secondary' : 'ghost'}
                    className="h-8"
                    onClick={() => setTab('tickets')}
                  >
                    Clientes
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={tab === 'internal' ? 'secondary' : 'ghost'}
                    className="h-8"
                    onClick={() => setTab('internal')}
                  >
                    Interno
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-0 px-2">
          {tab === 'tickets' ? (
            isLoadingChats ? (
              <div className="p-4 text-sm text-muted-foreground">Carregando conversas...</div>
            ) : chats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <MessageCircle className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma conversa ainda</p>
                <p className="text-xs text-muted-foreground mt-1">Inicie um chat pelo ticket</p>
              </div>
            ) : (
              <div className="space-y-1">
                {(chats as any[]).map((chat: ChatItem) => {
                  const other = getOtherParticipant(chat);
                  const isOnline = !!other && onlineUsers.includes(other._id);
                  const isActive = currentChat?._id === chat._id;
                  return (
                    <div
                      key={chat._id}
                      onClick={() => setCurrentChat(chat as any)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setCurrentChat(chat as any);
                        }
                      }}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        isActive ? 'bg-primary/10' : 'hover:bg-muted'
                      }`}
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={other?.avatar} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {other?.name ? getInitials(other.name) : '??'}
                          </AvatarFallback>
                        </Avatar>
                        {isOnline ? (
                          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                        ) : null}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">{other?.name || 'Usuário'}</span>
                          {chat.lastMessage?.createdAt ? (
                            <span className="text-xs text-muted-foreground">{formatTime(chat.lastMessage.createdAt)}</span>
                          ) : null}
                        </div>
                        <p className={`text-sm truncate ${chat.lastMessage ? 'text-muted-foreground' : 'text-muted-foreground italic'}`}>
                          {chat.lastMessage?.content || 'Inicie a conversa'}
                        </p>
                        {chat.unreadCount > 0 ? (
                          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-xs text-primary-foreground mt-1">
                            {formatUnread(chat.unreadCount)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="space-y-4">
              <div>
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Canais</div>
                <div className="space-y-1">
                  {isLoadingChats ? (
                    <div className="p-4 text-sm text-muted-foreground">Carregando canais...</div>
                  ) : internalChannels.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">Nenhum canal ainda</div>
                  ) : internalChannels.map((c: any) => {
                    const isActive = currentChat?._id === c._id;
                    const title = c.name || `#${c.channelKey}`;
                    const channelKeyLabel = c.channelKey ? `#${c.channelKey}` : null;
                    return (
                      <div
                        key={c._id}
                        onClick={() => setCurrentChat(c as any)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setCurrentChat(c as any);
                          }
                        }}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          isActive ? 'bg-primary/10' : 'hover:bg-muted'
                        }`}
                      >
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <Hash className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-medium truncate">{title}</span>
                              {c.isDefault ? (
                                <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                                  Padrão
                                </span>
                              ) : null}
                            </div>
                            {c.lastMessage?.createdAt ? (
                              <span className="text-xs text-muted-foreground">{formatTime(c.lastMessage.createdAt)}</span>
                            ) : null}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {c.lastMessage?.content || (channelKeyLabel ? `Canal ${channelKeyLabel}` : 'Sem mensagens ainda')}
                          </p>
                          {c.unreadCount > 0 ? (
                            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-xs text-primary-foreground mt-1">
                              {formatUnread(c.unreadCount)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {internalDms.length ? (
                <div>
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Direto</div>
                  <div className="space-y-1">
                    {internalDms.map((c: any) => {
                      const isActive = currentChat?._id === c._id;
                      const other = (c.participants || []).find((p: any) => p?._id !== user?.id);
                      const title = other?.name || 'Conversa';
                      const isOnline = other?._id ? onlineUsers.includes(other._id) : false;
                      return (
                        <div
                          key={c._id}
                          onClick={() => setCurrentChat(c as any)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setCurrentChat(c as any);
                            }
                          }}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            isActive ? 'bg-primary/10' : 'hover:bg-muted'
                          }`}
                        >
                          <div className="relative h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <MessageCircle className="h-5 w-5" />
                            {isOnline ? (
                              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                            ) : null}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium truncate">{title}</span>
                              {c.lastMessage?.createdAt ? (
                                <span className="text-xs text-muted-foreground">{formatTime(c.lastMessage.createdAt)}</span>
                              ) : null}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{c.lastMessage?.content || 'Sem mensagens'}</p>
                            {c.unreadCount > 0 ? (
                              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-xs text-primary-foreground mt-1">
                                {formatUnread(c.unreadCount)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-4 text-sm text-muted-foreground">
                  Use <span className="font-medium">Novo DM</span> para iniciar uma conversa direta.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="flex-1 flex flex-col">
        {currentChat ? (
          <>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {tab === 'tickets' ? (
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(activeTitle)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      {((currentChat as any).type === 'channel' || (currentChat as any).channelKey) ? (
                        <Hash className="h-5 w-5" />
                      ) : (
                        <MessageCircle className="h-5 w-5" />
                      )}
                    </div>
                  )}

                  <div>
                    <CardTitle className="text-base">{activeTitle}</CardTitle>
                    {tab === 'tickets' ? (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {(() => {
                          const other = getOtherParticipant(currentChat as any);
                          const isOnline = other?._id ? onlineUsers.includes(other._id) : false;
                          return (
                            <>
                              <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                              {isOnline ? 'Online' : 'Offline'}
                            </>
                          );
                        })()}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {(() => {
                          const c: any = currentChat;
                          const isChannel = c?.type === 'channel' || c?.channelKey;
                          if (isChannel) {
                            const key = c?.channelKey ? `#${c.channelKey}` : 'canal';
                            return c?.isDefault ? `Canal padrão ${key}` : `Canal interno ${key}`;
                          }
                          return 'Conversa direta interna';
                        })()}
                      </p>
                    )}
                  </div>
                </div>

                {tab === 'tickets' ? (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" type="button">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" type="button">
                      <Video className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" type="button">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0">
              <div className="relative flex-1">
                <ScrollArea
                  ref={scrollRef}
                  className="h-full p-4"
                  onScroll={() => {
                    const el = scrollRef.current;
                    if (!el) return;
                    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
                    shouldAutoScrollRef.current = remaining < 120;
                    if (shouldAutoScrollRef.current) {
                      setShowJumpToBottom(false);
                      setUnseenCount(0);
                    } else {
                      setShowJumpToBottom(true);
                    }
                  }}
                >
                <div className="space-y-4">
                  {isLoadingMessages ? (
                    <div className="text-sm text-muted-foreground">Carregando mensagens...</div>
                  ) : null}
                  {!isLoadingMessages && messages.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                      Nenhuma mensagem ainda. Envie a primeira mensagem.
                    </div>
                  ) : null}
                  {messages.map((m: any, idx: number) => {
                    const isOwn = m.sender?._id === user?.id;
                    const showSender = tab === 'internal' && !isOwn;
                    return (
                      <div key={m._id || idx} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                            isOwn ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted rounded-bl-md'
                          }`}
                        >
                          {showSender ? (
                            <div className="text-xs opacity-70 mb-1">{m.sender?.name || 'Usuário'}</div>
                          ) : null}
                          <p className="text-sm">{m.content}</p>
                          <div className={`flex items-center gap-2 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            <span className={`text-xs ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                              {formatTime(m.createdAt)}
                            </span>
                            {tab === 'tickets' && isOwn && Array.isArray(m.readBy) && m.readBy.length > 1 ? (
                              <span className="text-xs text-primary-foreground/70">✓✓</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {typingActive ? (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2">
                        {tab === 'internal' ? (
                          <div className="text-xs text-muted-foreground">Digitando...</div>
                        ) : (
                          <div className="flex gap-1">
                            <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}

                  <div ref={messagesEndRef} />
                </div>
                </ScrollArea>

                {showJumpToBottom ? (
                  <div className="absolute bottom-4 right-4">
                    <Button
                      type="button"
                      variant="secondary"
                      className="shadow"
                      onClick={() => {
                        shouldAutoScrollRef.current = true;
                        setShowJumpToBottom(false);
                        setUnseenCount(0);
                        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      Ir para o fim{unseenCount > 0 ? ` (${unseenCount > 9 ? '9+' : unseenCount})` : ''}
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Digite sua mensagem..."
                    ref={messageInputRef}
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      startTyping();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSend}
                    size="icon"
                    type="button"
                    disabled={!inputValue.trim()}
                    aria-label="Enviar mensagem"
                    title="Enviar"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col gap-3">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              {tab === 'internal' ? (
                <MessagesSquare className="h-8 w-8 text-muted-foreground" />
              ) : (
                <MessageCircle className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="text-center">
              <h3 className="font-medium">Selecione uma conversa</h3>
              <p className="text-sm text-muted-foreground">
                {tab === 'internal'
                  ? 'Escolha um canal ou conversa direta para começar'
                  : 'Escolha uma conversa à esquerda para começar'}
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
