import { MadeWithDyad } from "@/components/made-with-dyad";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-gray-50">Welcome to Your AI Job Assistant</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-6">
          Let's refine your job application with the help of an AI.
        </p>
        <Link to="/chatbot">
          <Button size="lg" className="px-8 py-4 text-lg">
            Start AI Chat
          </Button>
        </Link>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;