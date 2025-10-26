"use client";

import React, { useState, useRef, useEffect, ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Bot, User, FileText, X } from "lucide-react";
import { showError } from "@/utils/toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const LLM_WEBHOOK_URL = "https://BoranC-n8n-free.hf.space/webhook/d05757c2-2919-43f6-86f1-74b92334da60"; // Updated URL

const Chatbot = () => {
  const [resume, setResume] = useState<string>("");
  const [jobDescription, setJobDescription] = useState<string>("");
  const [customPrompt, setCustomPrompt] = useState<string>(""); // New state for custom prompt
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInitialInputPhase, setIsInitialInputPhase] = useState<boolean>(true);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleResumeFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedExtensions = [".txt", ".md", ".pdf", ".docx"];
      const fileExtension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

      if (!allowedExtensions.includes(fileExtension)) {
        showError("Please upload a plain text (.txt), Markdown (.md), PDF (.pdf), or DOCX (.docx) file for your resume.");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setResume("");
        setResumeFileName(null);
        return;
      }

      setResumeFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setResume(content);
      };
      reader.onerror = () => {
        showError("Failed to read resume file. Please ensure it's a readable text, Markdown, PDF, or DOCX file.");
        setResume("");
        setResumeFileName(null);
      };
      reader.readAsText(file);
    } else {
      setResume("");
      setResumeFileName(null);
    }
  };

  const clearResumeFile = () => {
    setResume("");
    setResumeFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleStartChat = async () => {
    if (!resume.trim() || !jobDescription.trim()) {
      showError("Please provide both your resume and the job description to start the chat.");
      return;
    }
    setIsInitialInputPhase(false);
    setIsLoading(true);
    setMessages([]); // Clear any previous messages

    try {
      const payload = {
        resume: resume,
        job_description: jobDescription,
        custom_prompt: customPrompt, // Include custom prompt
        chat_history: [], // Initial call, no chat history yet
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const llmResponseContent = data.response || "Sorry, I couldn't get a response from the LLM.";
      setMessages([{ role: "assistant", content: llmResponseContent }]); // Set the LLM's response as the first message
    } catch (error) {
      console.error("Error sending initial data to LLM:", error);
      showError("I apologize, but I encountered an error during the initial conversation. Please try again later.");
      setMessages([{ role: "assistant", content: "I apologize, but I encountered an error. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: currentMessage };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setCurrentMessage("");
    setIsLoading(true);

    try {
      const payload = {
        resume: resume,
        job_description: jobDescription,
        custom_prompt: customPrompt, // Include custom prompt in subsequent messages
        chat_history: updatedMessages.map(msg => ({ role: msg.role, content: msg.content })),
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const llmResponseContent = data.response || "Sorry, I couldn't get a response from the LLM.";
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: "assistant", content: llmResponseContent },
      ]);
    } catch (error) {
      console.error("Error sending message to LLM:", error);
      showError("I apologize, but I encountered an error. Please try again later.");
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: "assistant", content: "I apologize, but I encountered an error. Please try again later." },
      ]);
    } finally {
      setIsLoading(false);
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
                <label htmlFor="resume-upload" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upload Your Resume (TXT, Markdown, PDF, or DOCX)
                </label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="resume-upload"
                    type="file"
                    accept=".txt,.md,.pdf,.docx"
                    onChange={handleResumeFileUpload}
                    ref={fileInputRef}
                    className="flex-1"
                  />
                  {resumeFileName && (
                    <Button variant="outline" size="icon" onClick={clearResumeFile} aria-label="Clear resume file">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {resumeFileName && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 flex items-center">
                    <FileText className="h-4 w-4 mr-1" /> {resumeFileName}
                  </p>
                )}
                {!resumeFileName && resume.trim() && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Resume content manually pasted.
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="custom-prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Custom Prompt (Optional)
                </label>
                <Textarea
                  id="custom-prompt"
                  placeholder="Enter a custom prompt to guide the AI (e.g., 'Act as a career coach and help me tailor my resume.')."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={5}
                  className="min-h-[100px]"
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
              <Button onClick={handleStartChat} className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Start Conversation
              </Button>
            </div>
          ) : (
            <div className="flex flex-col h-[600px]">
              <ScrollArea className="flex-1 p-4 border rounded-md bg-gray-50 dark:bg-gray-800 mb-4">
                <div className="space-y-4">
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-3 ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {msg.role === "assistant" && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="/placeholder.svg" alt="AI" />
                          <AvatarFallback className="bg-blue-500 text-white"><Bot size={16} /></AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`max-w-[70%] p-3 rounded-lg ${
                          msg.role === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                      </div>
                      {msg.role === "user" && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="/placeholder.svg" alt="User" />
                          <AvatarFallback className="bg-gray-400 text-white"><User size={16} /></AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex items-start gap-3 justify-start">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="/placeholder.svg" alt="AI" />
                        <AvatarFallback className="bg-blue-500 text-white"><Bot size={16} /></AvatarFallback>
                      </Avatar>
                      <div className="max-w-[70%] p-3 rounded-lg bg-gray-200 dark:bg-gray-700">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-600 dark:text-gray-300" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              <div className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button onClick={sendMessage} disabled={isLoading}>
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