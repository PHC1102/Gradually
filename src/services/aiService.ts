/**
 * AI Service for generating subtasks with strict date validation
 * 
 * IMPORTANT: This service is configured to ABSOLUTELY PREVENT past dates in AI-generated subtasks.
 * - The AI prompt explicitly instructs to avoid past dates
 * - The conversion logic validates and adjusts any past dates to be in the future
 * - If users manually create tasks with past dates, that's allowed (user choice)
 * - But AI will never generate subtasks with past dates, even if the parent task has a past date
 */

import type { Subtask } from '../types';

interface AISubtaskRequest {
  taskName: string;
  taskDeadline: string;
}

interface AISubtaskResponse {
  name: string;
  dueTime: string;
  dueDate: string;
  completed: boolean;
}

// Pre-configured API key for the application
// In production, this should be loaded from environment variables
// For development, you can set your OpenRouter API key here
const DEFAULT_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || 'your-openrouter-api-key-here';

// API key management - now uses pre-configured key
const getApiKey = (): string => {
  // First try to get from environment variable (production)
  if (import.meta.env.VITE_OPENROUTER_API_KEY) {
    return import.meta.env.VITE_OPENROUTER_API_KEY;
  }
  
  // Fallback to default key (you should replace this with your actual key)
  if (DEFAULT_API_KEY && DEFAULT_API_KEY !== 'your-openrouter-api-key-here') {
    return DEFAULT_API_KEY;
  }
  
  throw new Error('AI service is currently unavailable. Please try again later or contact support.');
};

export const aiService = {
  async generateSubtasks(request: AISubtaskRequest): Promise<Subtask[]> {
    const apiKey = getApiKey();
    
    const currentDate = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().slice(0, 5);
    
    const prompt = `You are an AI assistant for a To-Do application.
Current task: ${request.taskName}, deadline: ${request.taskDeadline}
Today's date: ${currentDate}
Current time: ${currentTime}

IMPORTANT RULES:
1. Generate 3-6 subtasks for this task (no more, no less - quality over quantity).
2. Focus on the most essential and impactful subtasks only.
3. Each subtask must include:
   - name: the subtask name (be specific and actionable)
   - dueTime: time in HH:MM format (24-hour)
   - dueDate: deadline (yyyy-mm-dd), must be today or in the future and before the task deadline
   - completed: false (default)

CRITICAL DATE REQUIREMENTS:
- ABSOLUTELY NO PAST DATES: All dueDate values must be today (${currentDate}) or later
- ABSOLUTELY NO PAST TIMES: If dueDate is today, dueTime must be current time (${currentTime}) or later
- All subtask deadlines must be before the main task deadline: ${request.taskDeadline}
- When in doubt, set dates to tomorrow or later to avoid any past date issues
- Double-check: today is ${currentDate}, do not use any date before this

4. Return only a JSON array, without any explanation or extra text.
5. Prioritize the most important steps - avoid creating too many small tasks.

Start returning only JSON.`;

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'GRADUALLY Task Manager'
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b:free',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content;

      if (!aiResponse) {
        throw new Error('No response from AI');
      }

      // Parse the JSON response
      const parsedSubtasks = this.parseAIResponse(aiResponse);
      
      // Convert to our Subtask format
      return this.convertToSubtasks(parsedSubtasks, request.taskDeadline);
    } catch (error) {
      console.error('AI Service Error:', error);
      throw error;
    }
  },

  parseAIResponse(aiResponse: string): AISubtaskResponse[] {
    try {
      // Try to extract JSON from the response
      // The AI might include extra text, so we need to find the JSON array
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in AI response');
      }
      
      const jsonString = jsonMatch[0];
      const parsed = JSON.parse(jsonString);
      
      if (!Array.isArray(parsed)) {
        throw new Error('AI response is not an array');
      }
      
      // Validate each subtask has required fields
      const validatedSubtasks = parsed.map((item, index) => {
        if (!item.name || typeof item.name !== 'string') {
          throw new Error(`Subtask ${index + 1}: Missing or invalid 'name' field`);
        }
        if (!item.dueDate || typeof item.dueDate !== 'string') {
          throw new Error(`Subtask ${index + 1}: Missing or invalid 'dueDate' field`);
        }
        if (!item.dueTime || typeof item.dueTime !== 'string') {
          throw new Error(`Subtask ${index + 1}: Missing or invalid 'dueTime' field`);
        }
        
        return {
          name: item.name.trim(),
          dueDate: item.dueDate.trim(),
          dueTime: item.dueTime.trim(),
          completed: false
        };
      });
      
      return validatedSubtasks;
    } catch (error) {
      console.error('JSON Parse Error:', error);
      throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  convertToSubtasks(aiSubtasks: AISubtaskResponse[], taskDeadline: string): Subtask[] {
    const taskDeadlineDate = new Date(taskDeadline);
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of today
    
    return aiSubtasks.map((aiSubtask, index) => {
      try {
        // Combine date and time to create deadline string
        const deadlineDateTime = `${aiSubtask.dueDate}T${aiSubtask.dueTime}`;
        const subtaskDeadline = new Date(deadlineDateTime);
        
        // STRICT CHECK: Absolutely no past dates or times
        if (subtaskDeadline <= now) {
          console.warn(`AI generated subtask "${aiSubtask.name}" with past deadline (${deadlineDateTime}), adjusting to prevent past dates...`);
          
          // Set to at least 1 hour from now to ensure it's definitely in the future
          const safeDeadline = new Date(now.getTime() + (60 * 60 * 1000)); // 1 hour from now
          
          // If that puts us past the task deadline, set to 1 hour before task deadline
          if (safeDeadline >= taskDeadlineDate) {
            const adjustedDeadline = new Date(Math.max(
              taskDeadlineDate.getTime() - (60 * 60 * 1000), // 1 hour before task deadline
              now.getTime() + (30 * 60 * 1000) // or 30 minutes from now, whichever is later
            ));
            
            return {
              id: Date.now() + index, // Unique ID
              title: aiSubtask.name,
              deadline: adjustedDeadline.toISOString().slice(0, 16), // Format for datetime-local input
              done: false
            };
          }
          
          return {
            id: Date.now() + index, // Unique ID
            title: aiSubtask.name,
            deadline: safeDeadline.toISOString().slice(0, 16), // Format for datetime-local input
            done: false
          };
        }
        
        // Validate that subtask deadline is before task deadline
        if (subtaskDeadline >= taskDeadlineDate) {
          console.warn(`Subtask "${aiSubtask.name}" deadline is after task deadline, adjusting...`);
          // Adjust to be 1 hour before task deadline
          const adjustedDeadline = new Date(taskDeadlineDate.getTime() - (60 * 60 * 1000));
          
          // But make sure it's still in the future
          if (adjustedDeadline <= now) {
            const safeDeadline = new Date(now.getTime() + (30 * 60 * 1000)); // 30 minutes from now
            return {
              id: Date.now() + index,
              title: aiSubtask.name,
              deadline: safeDeadline.toISOString().slice(0, 16),
              done: false
            };
          }
          
          return {
            id: Date.now() + index, // Unique ID
            title: aiSubtask.name,
            deadline: adjustedDeadline.toISOString().slice(0, 16), // Format for datetime-local input
            done: false
          };
        }
        
        return {
          id: Date.now() + index, // Unique ID
          title: aiSubtask.name,
          deadline: deadlineDateTime,
          done: false
        };
      } catch (error) {
        console.error(`Error converting subtask "${aiSubtask.name}":`, error);
        // Return a fallback subtask (1 hour from now)
        const fallbackDeadline = new Date(Date.now() + (60 * 60 * 1000));
        
        // If that's past the task deadline, set to 30 minutes from now
        if (fallbackDeadline >= taskDeadlineDate) {
          fallbackDeadline.setTime(Math.min(
            Date.now() + (30 * 60 * 1000),
            taskDeadlineDate.getTime() - (30 * 60 * 1000)
          ));
        }
        
        return {
          id: Date.now() + index,
          title: aiSubtask.name || `Subtask ${index + 1}`,
          deadline: fallbackDeadline.toISOString().slice(0, 16),
          done: false
        };
      }
    });
  }
};

export default aiService;