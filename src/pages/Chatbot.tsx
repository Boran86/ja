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

  const processAIResponse = async (response: Response) => {
    let data;
    const contentType = response.headers.get("Content-Type");

    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const textResponse = await response.text();
      try {
        data = JSON.parse(textResponse);
      } catch (parseError) {
        console.error("Failed to parse response as JSON:", parseError, "Raw response:", textResponse);
        showError("Received an unparseable response from the AI. Please check the backend.");
        throw new Error("Unparseable AI response");
      }
    }
    return data;
  };

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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await processAIResponse(response);
      console.log("Full LLM response data received:", data); // Existing log
      
      const llmResponseContent = data.response;
      console.log("Extracted llmResponseContent:", llmResponseContent); // New log for extracted content

      if (llmResponseContent) {
        let finalContent = llmResponseContent;
        try {
          const innerParsed = JSON.parse(llmResponseContent);
          if (typeof innerParsed === 'object' && innerParsed !== null && 'message' in innerParsed) {
            finalContent = `**AI Message:**\n\n${innerParsed.message}`;
            showError(innerParsed.message);
          } else if (typeof innerParsed === 'object' && innerParsed !== null && 'feedback' in innerParsed) {
            finalContent = innerParsed.feedback;
          }
        } catch (e) {
          // If parsing fails, it's not a JSON string, so treat it as plain Markdown.
        }
        setAiResponse(finalContent);
      } else {
        // More specific error messages based on whether 'response' key exists
        if (data.hasOwnProperty('response')) {
          console.error("LLM response data contained an empty or null 'response' field:", llmResponseContent);
          showError("The AI responded, but the 'response' content was empty. Please check your AI workflow's output.");
          setAiResponse("I apologize, but the AI provided an empty response. Please try again later or check your backend configuration.");
        } else {
          console.error("LLM response data did not contain a 'response' field:", data);
          showError("The AI responded, but the expected 'response' content was missing. Please check the backend's output format.");
          setAiResponse("I apologize, but I received an unexpected response format from the AI. Please try again later.");
        }
      }
    } catch (error) {
      console.error("Error sending initial data to LLM:", error);
      if (error instanceof Error && error.message !== "Unparseable AI response") {
        showError("I apologize, but I encountered an error. Please try again later.");
        setAiResponse("I apologize, but I encountered an error. Please try again later.");
      }
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