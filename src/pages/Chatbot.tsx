"use client";

import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Bot } from "lucide-react";
import { showError } from "@/utils/toast";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils"; // Import cn for conditional class names

interface Message {
  role: "user" | "assistant";
  content: string;
}

const LLM_WEBHOOK_URL = "https://BoranC-n8n-free.hf.space/webhook/d05757c2-2919-43f6-86f1-74b92334da60";

const Chatbot = () => {
  const [resume, setResume] = useState<string>("");
  const [jobDescription, setJobDescription] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInitialInputPhase, setIsInitialInputPhase] = useState<boolean>(true);

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const processAiResponse = (rawContent: string | object): string => {
    let finalContent: string;

    if (typeof rawContent === 'object' && rawContent !== null) {
      // Handle the new array format: [ { "output": "..." } ]
      if (Array.isArray(rawContent) && rawContent.length > 0 && typeof rawContent[0] === 'object' && rawContent[0] !== null && 'output' in rawContent[0] && typeof rawContent[0].output === 'string') {
        return rawContent[0].output; // Directly return the output string
      }

      let messageToDisplay: string | undefined;

      // Prioritize 'response' field
      if ('response' in rawContent && typeof rawContent.response === 'string') {
        messageToDisplay = rawContent.response;
      } else if ('response' in rawContent && typeof rawContent.response === 'object') {
        messageToDisplay = `\`\`\`json\n${JSON.stringify(rawContent.response, null, 2)}\n\`\`\``;
      } else if ('message' in rawContent && typeof rawContent.message === 'string') {
        messageToDisplay = rawContent.message;
      } else if ('error' in rawContent && typeof rawContent.error === 'string') {
        messageToDisplay = `**AI Error:**\n\n${rawContent.error}`;
      } else if ('feedback' in rawContent && typeof rawContent.feedback === 'string') {
        messageToDisplay = rawContent.feedback;
      }

      if (messageToDisplay) {
        try {
          const innerParsed = JSON.parse(messageToDisplay);
          if (typeof innerParsed === 'object' && innerParsed !== null) {
            if (innerParsed.status === 'error' && 'message' in innerParsed) {
              messageToDisplay = `**AI Error:**\n\n${innerParsed.message}`;
            } else if ('error' in innerParsed) {
              messageToDisplay = `**AI Error:**\n\n${innerParsed.error}`;
            } else if ('feedback' in innerParsed) {
              messageToDisplay = innerParsed.feedback;
            } else if ('message' in innerParsed) {
              messageToDisplay = innerParsed.message;
            } else {
              messageToDisplay = `\`\`\`json\n${JSON.stringify(innerParsed, null, 2)}\n\`\`\``;
            }
          }
        } catch (e) {
          // Not a nested JSON string, use messageToDisplay as is (likely markdown)
        }
      }
      
      finalContent = messageToDisplay || `\`\`\`json\n${JSON.stringify(rawContent, null, 2)}\n\`\`\``;

    } else if (typeof rawContent === 'string') {
      finalContent = rawContent;
    } else {
      finalContent = "No AI response received or response was uninterpretable.";
    }
    return finalContent;
  };

  const sendToLLM = async (currentMessages: Message[]) => {
    setIsLoading(true);
    try {
      const payload = {
        resume: resume,
        job_description: jobDescription,
        chat_history: currentMessages, // Send the entire chat history
      };

      const response = await fetch(LLM_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error! status: ${response.status}, response: ${errorText}`);
        showError(`Failed to get a response from the AI. Status: ${response.status}`);
        setMessages((prev) => [...prev, { role: "assistant", content: `**HTTP Error:** Status ${response.status}\n\n\`\`\`\n${errorText}\n\`\`\`` }]);
        return;
      }

      const contentType = response.headers.get("Content-Type");
      let rawContent: string | object;

      if (contentType && contentType.includes("application/json")) {
        rawContent = await response.json();
      } else {
        rawContent = await response.text();
      }
      
      console.log("Raw AI response received:", rawContent);
      const finalContent = processAiResponse(rawContent);
      setMessages((prev) => [...prev, { role: "assistant", content: finalContent }]);

    } catch (error) {
      console.error("Error sending data to LLM:", error);
      showError("I apologize, but I encountered an error. Please try again later.");
      setMessages((prev) => [...prev, { role: "assistant", content: `**Application Error:**\n\n\`\`\`\n${error instanceof Error ? error.message : String(error)}\n\`\`\`` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitialSubmit = async () => {
    if (!resume.trim() || !jobDescription.trim()) {
      showError("Please provide both your resume and the job description to start.");
      return;
    }
    setIsInitialInputPhase(false);
    setIsLoading(true);
    
    // Send initial data, chat_history will be empty for the first call
    await sendToLLM([]); 
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) {
      return;
    }

    const newUserMessage: Message = { role: "user", content: inputMessage };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInputMessage(""); // Clear input immediately

    await sendToLLM(updatedMessages);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-3xl shadow-lg">
        <CardHeader className="border-b">
          <CardTitle className="text-2xl font-bold text-center">AI Job Assistant</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {isInitialInputPhase ? (
            <div className="space-y-6">
              <div>
                <label htmlFor="resume-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Paste Your Resume
                </label>
                <Textarea
                  id="resume-text"
                  placeholder="Paste your resume text here..."
                  value={resume}
                  onChange={(e) => setResume(e.target.value)}
                  rows={10}
                  className="min-h-[150px]"
                />
              </div>
              <div>
                <label htmlFor="job-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Job Description (paste text here)
                </label>
                <Textarea
                  id="job-description"
                  placeholder="Paste the job description text here..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={10}
                  className="min-h-[150px]"
                />
              </div>
              <Button onClick={handleInitialSubmit} className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Get AI Feedback
              </Button>
            </div>
          ) : (
            <div className="flex flex-col h-[600px]">
              <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 border rounded-md bg-gray-50 dark:bg-gray-800 mb-4">
                {messages.length > 0 ? (
                  messages.map((msg, index) => (
                    <div key={index} className={cn("flex items-start gap-3 mb-4", msg.role === "user" ? "justify-end" : "justify-start")}>
                      {msg.role === "assistant" && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="/placeholder.svg" alt="AI" />
                          <AvatarFallback className="bg-blue-500 text-white"><Bot size={16} /></AvatarFallback>
                        </Avatar>
                      )}
                      <div className={cn(
                        "max-w-[85%] p-3 rounded-lg prose dark:prose-invert shadow-sm break-words", // Changed max-w to 85% and added break-words
                        msg.role === "user"
                          ? "bg-blue-600 text-white dark:bg-blue-700 dark:text-gray-100"
                          : "bg-blue-50 dark:bg-blue-950 text-gray-800 dark:text-gray-200 border border-blue-200 dark:border-blue-800"
                      )}>
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                      {msg.role === "user" && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="/placeholder.svg" alt="User" />
                          <AvatarFallback className="bg-gray-500 text-white">U</AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    Start the conversation by providing your resume and job description.
                  </div>
                )}
              </ScrollArea>
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type your message here..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  rows={1}
                  className="flex-1 min-h-[40px]"
                  disabled={isLoading}
                />
                <Button onClick={handleSendMessage} disabled={isLoading || !inputMessage.trim()}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center border-t pt-4">
          <Link to="/" className="text-sm text-blue-500 hover:underline">
            Back to Home
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Chatbot;