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

interface Message {
  role: "user" | "assistant";
  content: string;
}

const LLM_WEBHOOK_URL = "https://BoranC-n8n-free.hf.space/webhook/d05757c2-2919-43f6-86f1-74b92334da60";

const Chatbot = () => {
  const [resume, setResume] = useState<string>("");
  const [jobDescription, setJobDescription] = useState<string>("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInitialInputPhase, setIsInitialInputPhase] = useState<boolean>(true);

  const handleStartChat = async () => {
    if (!resume.trim() || !jobDescription.trim()) {
      showError("Please provide both your resume and the job description to start.");
      return;
    }
    setIsInitialInputPhase(false);
    setIsLoading(true);
    setAiResponse(null);

    try {
      const payload = {
        resume: resume,
        job_description: jobDescription,
        chat_history: [],
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
        setAiResponse(`**HTTP Error:** Status ${response.status}\n\n\`\`\`\n${errorText}\n\`\`\``);
        return; // Stop here if HTTP error
      }

      const contentType = response.headers.get("Content-Type");
      let rawContent: string;

      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        rawContent = `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
      } else {
        rawContent = await response.text();
      }
      
      console.log("Raw AI response received:", rawContent);
      setAiResponse(rawContent);

    } catch (error) {
      console.error("Error sending initial data to LLM:", error);
      showError("I apologize, but I encountered an error. Please try again later.");
      setAiResponse(`**Application Error:**\n\n\`\`\`\n${error instanceof Error ? error.message : String(error)}\n\`\`\``);
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
              <Button onClick={handleStartChat} className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Get AI Feedback
              </Button>
            </div>
          ) : (
            <div className="flex flex-col h-[600px]">
              {isLoading ? (
                <div className="flex items-center justify-center flex-1">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-2 text-gray-600 dark:text-gray-300">Getting AI Feedback...</span>
                </div>
              ) : (
                <ScrollArea className="flex-1 p-4 border rounded-md bg-gray-50 dark:bg-gray-800 mb-4">
                  {aiResponse ? (
                    <div className="flex items-start gap-3 justify-start">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="/placeholder.svg" alt="AI" />
                        <AvatarFallback className="bg-blue-500 text-white"><Bot size={16} /></AvatarFallback>
                      </Avatar>
                      <div className="max-w-[90%] p-3 rounded-lg prose dark:prose-invert bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100">
                        <ReactMarkdown>{aiResponse}</ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 dark:text-gray-400">
                      No AI response received. Please check your AI webhook configuration.
                    </div>
                  )}
                </ScrollArea>
              )}
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