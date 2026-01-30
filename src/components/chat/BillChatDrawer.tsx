import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { FAQSuggestions } from "./FAQSuggestions";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface BillChatDrawerProps {
  analysisId: string;
  distributor?: string | null;
  referenceMonth?: number;
  referenceYear?: number;
}

const CHAT_URL = "https://uhuodcdbvtbrhovkyywp.supabase.co/functions/v1/bill-chat";

export function BillChatDrawer({
  analysisId,
  distributor,
  referenceMonth,
  referenceYear,
}: BillChatDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const streamChat = useCallback(async (allMessages: Message[]) => {
    setIsLoading(true);
    let assistantContent = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVodW9kY2RidnRicmhvdmt5eXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwODAxOTAsImV4cCI6MjA4NDY1NjE5MH0.XfktuBGoyMjPpUxVQDCs5QtG8wDqn9N-XWsSTo7dSQU`,
        },
        body: JSON.stringify({ analysisId, messages: allMessages }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      // Add empty assistant message to start streaming into
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const updateAssistant = (content: string) => {
        assistantContent = content;
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastIdx = newMessages.length - 1;
          if (newMessages[lastIdx]?.role === "assistant") {
            newMessages[lastIdx] = { ...newMessages[lastIdx], content };
          }
          return newMessages;
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        // Process line by line
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              updateAssistant(assistantContent + delta);
            }
          } catch {
            // Incomplete JSON, put back and wait for more
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              updateAssistant(assistantContent + delta);
            }
          } catch {
            // ignore
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Erro no chat",
        description: error instanceof Error ? error.message : "Não foi possível enviar sua mensagem",
        variant: "destructive",
      });
      // Remove the empty assistant message if error
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && !last.content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsLoading(false);
    }
  }, [analysisId, toast]);

  const handleSend = useCallback((content: string) => {
    const userMessage: Message = { role: "user", content };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    streamChat(newMessages);
  }, [messages, streamChat]);

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="gradient"
          size="lg"
          className="fixed bottom-6 right-6 h-14 px-5 shadow-lg z-50 gap-2 rounded-full"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="hidden sm:inline">Pergunte sobre sua conta</span>
          <span className="sm:hidden">Chat</span>
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-left">Assistente Solo</SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {distributor} • {referenceMonth && monthNames[referenceMonth - 1]} {referenceYear}
              </p>
            </div>
          </div>
        </SheetHeader>

        {/* Messages area */}
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="py-4">
            {messages.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-medium text-foreground mb-1">
                  Olá! Sou o assistente Solo 👋
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Posso responder qualquer dúvida sobre sua conta de energia.
                  Escolha uma pergunta frequente ou digite a sua:
                </p>
                <FAQSuggestions onSelect={handleSend} disabled={isLoading} />
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <ChatMessage
                    key={idx}
                    role={msg.role}
                    content={msg.content}
                    isStreaming={isLoading && idx === messages.length - 1 && msg.role === "assistant"}
                  />
                ))}
              </>
            )}
          </div>
        </ScrollArea>

        {/* FAQ suggestions when there are messages */}
        {messages.length > 0 && !isLoading && (
          <div className="border-t border-border bg-muted/30">
            <FAQSuggestions onSelect={handleSend} disabled={isLoading} />
          </div>
        )}

        {/* Input */}
        <ChatInput onSend={handleSend} disabled={isLoading} />
      </SheetContent>
    </Sheet>
  );
}
