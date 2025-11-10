[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/YHSq4TPZ)
# To-Do App – Preliminary Assignment Submission
⚠️ Please complete **all sections marked with the ✍️ icon** — these are required for your submission.

👀 Please Check ASSIGNMENT.md file in this repository for assignment requirements.

## 🚀 Project Setup & Usage
**How to install and run your project:**  

### Setup Instructions
#### Step 1: Install Required Files
Open your terminal/command prompt and run:
`npm install`

#### Step 2: Enable AI Features (Optional but Recommended)
1. Copy `.env.example` to `.env`** (remove the `.example` part)
2. Get a free AI key from [OpenRouter.ai](https://openrouter.ai)**
3. Open `.env` file and replace `your-openrouter-api-key-here` with your key**

#### Step 3: Start the App
`npm run dev`

🎉 *Your app will open in your web browser automatically!*

> **📝 Note:** The application works completely without the API key! All core features (task management, calendar, analysis) are fully functional. The AI subtask generation is an optional enhancement.

## 🔗 Deployed Web URL or APK file
**📝 Note:** For the best experience, set your browser Zoom to 80% 
✍️ https://phc1102-web-track-naver-vietnam-ai-hackatho-flame.vercel.app/


## 🎥 Demo Video
**Demo video link (≤ 2 minutes):**  
📌 **Video Upload Guideline:** when uploading your demo video to YouTube, please set the visibility to **Unlisted**.  
- “Unlisted” videos can only be viewed by users who have the link.  
- The video will not appear in search results or on your channel.  
- Share the link in your README so mentors can access it.  

✍️ https://www.youtube.com/watch?v=--lTz0VeESY


## 💻 Project Introduction

### a. Overview

**GRADUALLY** is an intelligent task management application specifically designed to help students combat the cramming problem by efficiently organizing, tracking, and completing their academic tasks. Built as a submission for the Naver Vietnam AI Hackathon, this application combines modern web technologies with AI-powered features to create a comprehensive anti-cramming productivity solution.

The app directly addresses the critical issue of **student cramming** - the tendency to leave tasks until the last minute, leading to stress and poor performance. GRADUALLY solves this through **AI-generated subtask breakdown** that transforms overwhelming assignments into manageable daily actions, and **intelligent cram risk alerts** that warn students before they fall into cramming patterns. Users can create tasks with deadlines, let AI automatically break them down into manageable subtasks with optimal scheduling, and track their progress through various visual interfaces including calendar and analysis views that promote consistent study habits.

### b. Key Features & Function Manual

🎯 **Core Task Management**
- **Create, Edit, Delete Tasks**: Full CRUD operations with intuitive forms
- **Task Completion Tracking**: Simple checkbox interface for marking tasks done
- **Deadline Management**: Set and track task deadlines with color-coded warnings
- **Persistent Storage**: All data saved locally using localStorage

🤖 **AI-Powered Features**
- **Smart Subtask Generation**: AI automatically creates 3-6 relevant subtasks based on main task context
- **Date Validation**: AI ensures no past dates in generated subtasks
- **Contextual Suggestions**: AI considers task titles and deadlines for intelligent recommendations

📅 **Multiple Views**
- **Active Tasks View**: Main dashboard showing current tasks in organized grid layout
- **Completed Tasks View**: Archive of finished tasks with completion timestamps
- **Calendar View**: Visual calendar interface showing tasks by due date
- **Analysis Dashboard**: Charts and metrics showing productivity trends and task completion rates

⚡ **Advanced Features**
- **Subtask Management**: Create, edit, and track progress on subtasks
- **Real-time Notifications**: Bell icon system for task updates and reminders
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Task Sorting**: Sort by creation time or deadline
- **Progress Tracking**: Visual indicators for task and subtask completion rates

### c. Unique Features (What's special about this app?) 

🌟 **AI Integration Without Barriers**: Unlike other task apps, our AI features work immediately with pre-configured setup, making AI-powered productivity accessible to everyone.

🧠 **Smart Anti-Cramming AI**: Our AI doesn't just generate subtasks - it intelligently calculates optimal tasks per day based on your deadline, preventing last-minute cramming. For example, a 10-day project gets broken into 2-3 manageable tasks per day rather than 10 overwhelming tasks on the final day. This smart distribution ensures consistent progress and reduces academic stress.

🎨 **Four Distinct Data Views**: Most task apps offer 1-2 views, but GRADUALLY provides 4 unique perspectives (Active, Completed, Calendar, Analysis) of the same data, helping users understand their productivity from multiple angles.

🔒 **Privacy-First Design**: All data stays local in your browser - no cloud storage required, ensuring complete privacy and offline functionality.

⚡ **Instant Responsiveness**: Built with React 19 and Vite for lightning-fast performance and smooth interactions.

🎯 **Smart Date Handling**: AI automatically prevents past dates in subtasks while respecting user autonomy for manual task creation.

### d. Technology Stack and Implementation Methods

**Frontend Framework**
- **React 19.1.1**: Latest React version for modern component-based architecture
- **TypeScript 5.8.3**: Type safety and improved developer experience
- **CSS3**: Custom styling with responsive design principles

**Build Tools & Development**
- **Vite 7.1.2**: Fast build tool with hot module replacement (HMR)
- **npm**: Package management and dependency handling
- **ESLint**: Code quality and consistency enforcement

**AI Integration**
- **OpenRouter API**: AI service integration for subtask generation
- **GPT-OSS-20B**: Language model for intelligent task breakdown
- **Environment Variables**: Secure API key management

**Data Management**
- **localStorage**: Client-side persistence for offline functionality
- **TypeScript Interfaces**: Strongly typed data models (Task, Subtask, TaskFormData)
- **Immutable State Updates**: React best practices for state management

**Architecture Patterns**
- **Component Composition**: Modular, reusable React components
- **Service Layer**: Dedicated services for AI, notifications, and task sorting
- **Separation of Concerns**: Clear division between UI, business logic, and data layers

### e. Service Architecture & Database structure (when used)

**Client-Side Architecture**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   UI Components │    │   Service Layer  │    │  Data Storage   │
│  - TaskItem     │◄──►│  - aiService     │◄──►│  - localStorage │
│  - TaskForm     │    │  - notification  │    │  - Types/Models │
│  - Calendar     │    │  - taskSorting   │    │  - StateManager │
│  - Analysis     │    │  - cramRiskGauge │    │  - Persistence  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

**Component Flow & State Management**
- **React State Management**: useState and useEffect hooks for local component state
- **Props Drilling**: Parent-to-child communication via props for data and callbacks
- **Event Handling**: User interactions trigger state updates through callback functions
- **Immutable Updates**: State modifications use spread operators for React best practices
- **Service Integration**: Components consume services through dedicated utility functions

**Data Models**
- **Task Interface**: `{id, title, deadline, subtasks[], done, createdTime}`
- **Subtask Interface**: `{id, title, deadline, done}`
- **CompletedTask Interface**: `{task, completedAt}`

**Storage Strategy**
- **Active Tasks**: Stored in localStorage as `tasks` array
- **Completed Tasks**: Separate storage with 30-day retention policy
- **Notifications**: Persistent notification history in localStorage
- **User Preferences**: App settings and configurations

**External Integrations**
- **OpenRouter API**: RESTful API calls for AI subtask generation
- **Environment Variables**: Secure configuration management via `.env` files
- **Error Handling**: Graceful degradation when AI services are unavailable

## 🧠 Reflection

### a. If you had more time, what would you expand?

If I had more time, I would focus on **cross-platform expansion and real-time sync**. Currently the app runs on web, but the next step would be to build a mobile app using React Native or Flutter, so students can access it anytime, anywhere. Alongside this, I would integrate a cloud database like Firebase or Supabase to enable seamless real-time synchronization across devices. This would bring the user experience closer to tools like Microsoft To Do or Todoist.


### b. If you integrate AI APIs more for your app, what would you do?

On top of the cross-platform foundation, I would integrate **AI-powered voice recognition** to allow students to create tasks directly through speech (e.g., saying "Math homework tomorrow 8pm" would automatically generate a task). This makes the app faster and more intuitive, especially for mobile users. In the longer term, additional AI features such as automatic subtask generation, personalized study plans, and smart reminders could transform the app into a true AI-powered study assistant rather than just a task manager.


## ✅ Checklist
- [✅] Code runs without errors  
- [✅] All required features implemented (add/edit/delete/complete tasks)  
- [✅] All ✍️ sections are filled  
