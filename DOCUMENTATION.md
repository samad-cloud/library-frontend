# GeneraPix Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Application Architecture](#application-architecture)
4. [API Routes Reference](#api-routes-reference)
5. [Component Structure](#component-structure)
6. [Active vs Inactive Components](#active-vs-inactive-components)
7. [Page Routes](#page-routes)
8. [Authentication System](#authentication-system)
9. [Database Integration](#database-integration)
10. [Key Features](#key-features)

---

## Project Overview

GeneraPix is an AI-powered image generation calendar application built with Next.js 15. It provides a comprehensive platform for managing AI-generated images with calendar scheduling, bulk generation capabilities, and integration with various third-party services.

### Core Capabilities
- **AI Image Generation**: Integration with OpenAI DALL-E and Google Imagen for image creation
- **Calendar Management**: Event scheduling with image generation triggers
- **Bulk Operations**: CSV-based batch image generation
- **Knowledge Base**: Vector store integration for context-aware generation
- **Library Management**: Comprehensive image library with metadata and search
- **Third-party Integrations**: Jira, Google Calendar, and Outlook support

---

## Technology Stack

### Frontend Framework
- **Next.js 15.2.4**: React framework with App Router
- **React 19**: Latest React version with server components
- **TypeScript 5**: Type-safe development

### UI Libraries
- **Radix UI**: Headless component library (extensive usage)
- **Tailwind CSS 3.4**: Utility-first CSS framework
- **shadcn/ui**: Component library built on Radix UI
- **Framer Motion 12.23**: Animation library
- **Lucide React**: Icon library

### Data Management
- **Supabase**: Backend as a Service for authentication and database
- **React Hook Form**: Form state management
- **Zod 3.24**: Schema validation

### AI/ML Integration
- **@openai/agents 0.0.14**: OpenAI agent framework
- **@google/genai 1.12.0**: Google Generative AI SDK

### Utilities
- **date-fns 4.1.0**: Date manipulation
- **csv-parse 5.6.0**: CSV file parsing
- **xlsx 0.18.5**: Excel file handling
- **react-dropzone 14.3.8**: File upload handling
- **react-virtuoso 4.14.0**: Virtual scrolling for performance

---

## Application Architecture

### Directory Structure

```
GeneraPix/
├── app/                      # Next.js App Router pages
│   ├── api/                 # API routes
│   ├── auth/                # Authentication pages
│   ├── bulk-generator/      # Bulk generation page
│   ├── calendar/            # Calendar page
│   ├── dashboard/           # Dashboard page
│   ├── editor/              # Image editor page
│   ├── generator/           # Single image generator
│   ├── library/             # Image library page
│   ├── settings/            # Settings page
│   └── upload/              # File upload page
├── components/              # React components
│   ├── auth/               # Authentication components
│   ├── bulk-generator/     # Bulk generation components
│   ├── calendar/           # Calendar components
│   ├── dashboard/          # Dashboard components
│   ├── editor/             # Editor components
│   ├── generator/          # Generator components
│   ├── library/            # Library components
│   ├── modals/             # Modal components
│   ├── settings/           # Settings components
│   ├── shared/             # Shared/layout components
│   ├── ui/                 # shadcn/ui components
│   └── upload/             # Upload components
├── hooks/                   # Custom React hooks
├── lib/                     # Library code and utilities
├── public/                  # Static assets
├── styles/                  # Global styles
├── supabase/               # Supabase functions and migrations
├── types/                   # TypeScript type definitions
└── utils/                   # Utility functions
```

---

## API Routes Reference

### Active API Endpoints

#### 1. **Calendar Events** (`/api/calendar-events`)
- **GET**: Fetch calendar events with filters (date range, status, calendar ID)
- **PATCH**: Update event status and metadata
- **Authentication**: Required (Supabase auth)
- **Database**: Interacts with `calendar_events` and `calendars` tables

#### 2. **Generate Social Media** (`/api/generate-social-media`)
- **POST**: Generate AI-enhanced social media images with captions
- **Features**:
  - Uses OpenAI agents for prompt enhancement
  - Google Gemini integration for image generation
  - Automatic caption generation
  - Multiple aspect ratio support (1:1, 4:5)
- **Dependencies**: OpenAI API, Google GenAI API

#### 3. **CSV Operations** 
- **Upload** (`/api/csv/upload`): Process CSV files for batch operations
- **Template Upload** (`/api/csv/templates/upload`): Upload CSV templates
- **Template Download** (`/api/csv/templates/[id]/download`): Download specific templates
- **Authentication**: Required

#### 4. **Vector Store** (`/api/vector-store`)
- **Root** (`/api/vector-store`): Manage vector stores
- **Store Operations** (`/api/vector-store/[id]`): CRUD operations on specific stores
- **File Management** (`/api/vector-store/[id]/files`): Upload/manage files in vector store
- **File Content** (`/api/vector-store/[id]/files/[fileId]/content`): Retrieve file content
- **Purpose**: Knowledge base for context-aware AI generation

#### 5. **Image Groups** (`/api/image-groups`)
- **GET/POST**: Manage collections of related images
- **Features**: Grouping, tagging, metadata management

#### 6. **Events** (`/api/events`)
- **Purpose**: General event management (separate from calendar events)
- **Operations**: CRUD for application events

#### 7. **Connect Jira** (`/api/connect-jira`)
- **POST**: Establish Jira integration
- **Features**: Calendar sync, task import

#### 8. **Echo** (`/api/echo`)
- **Purpose**: Testing endpoint for API connectivity
- **GET/POST**: Echo back request data

---

## Component Structure

### Core Layout Components

#### AppLayout (`components/shared/AppLayout.tsx`)
- **Status**: ACTIVE
- **Purpose**: Main application layout wrapper
- **Features**: Sidebar navigation, header, responsive design
- **Used by**: All authenticated pages

#### Sidebar (`components/shared/Sidebar.tsx`)
- **Status**: ACTIVE
- **Navigation Items**:
  - Dashboard ✅
  - Calendar ✅
  - Generator ✅
  - Bulk Generator ✅
  - Editor ✅
  - Library ✅
  - Upload ✅
  - Settings ✅
- **Integration Indicators**: Google Calendar, Jira, Outlook

#### Header (`components/shared/Header.tsx`)
- **Status**: ACTIVE
- **Features**: User profile, notifications, search

### Feature Components

#### Calendar Components (`components/calendar/`)
- **CalendarPage**: Main calendar container ✅
- **CalendarGrid**: Grid layout for calendar ✅
- **CalendarHeader**: Navigation and view controls ✅
- **MonthView**: Monthly calendar display ✅
- **WeekView**: Weekly calendar display ✅
- **DayView**: Daily calendar display ✅
- **YearView**: Yearly overview ✅
- **CreateEventModal**: Event creation interface ✅
- **EditEventModal**: Event editing interface ✅
- **EventDetailsModal**: Event details display ✅
- **Enhanced Versions**: EnhancedCreateEventModal, EnhancedEditEventModal, EnhancedEventDetailsModal ✅

#### Library Components (`components/library/`)
- **Library**: Basic library view ⚠️ (Deprecated)
- **EnhancedLibrary**: Advanced library with filtering ✅
- **LibraryHeader**: Library controls ⚠️ (Deprecated)
- **EnhancedLibraryHeader**: Advanced library controls ✅
- **ImageGrid**: Basic image grid ⚠️ (Deprecated)
- **OptimizedImageGrid**: Performance-optimized grid ✅
- **DatabaseImageGrid**: Database-connected grid ✅
- **ImagePreviewModal**: Full-size image preview ✅
- **ProgressiveImage**: Progressive loading component ✅

#### Generator Components (`components/generator/`)
- **Generator**: Single image generation interface ✅
- **Features**: Prompt input, model selection, style presets

#### Bulk Generator Components (`components/bulk-generator/`)
- **BulkGenerator**: Main bulk generation interface ✅
- **CsvUploadSection**: CSV file upload handler ✅
- **BatchProgressSection**: Batch processing progress ✅

#### Upload Components (`components/upload/`)
- **Upload**: Main upload interface ✅
- **FileUploadSection**: File upload handler ✅
- **KnowledgeBaseUpload**: Vector store upload ✅

#### Settings Components (`components/settings/`)
- **Settings**: Main settings container ✅
- **ApiIntegrations**: Third-party API configuration ✅
- **CreativePreferences**: AI generation preferences ✅
- **TechPreferences**: Technical settings ✅

#### Modal Components (`components/modals/`)
- **CampaignModal**: Campaign creation/editing ✅
- **FileContentModal**: File content viewer ✅
- **JiraModal**: Jira integration setup ✅
- **ProductSelector**: Product selection interface ✅
- **StyleSelector**: Style preset selector ✅

---

## Active vs Inactive Components

### ✅ Active Components (Currently in Use)

#### UI Components (shadcn/ui) - Actively Used:
- `accordion`, `alert`, `alert-dialog`, `button`, `calendar`, `card`
- `carousel`, `checkbox`, `command`, `dialog`, `dropdown-menu`
- `form`, `input`, `label`, `pagination`, `popover`, `progress`
- `scroll-area`, `select`, `separator`, `sheet`, `sidebar`
- `skeleton`, `switch`, `table`, `tabs`, `textarea`, `toast`
- `toaster`, `toggle`, `toggle-group`, `tooltip`

#### Layout Components:
- AppLayout, ResponsiveAppLayout, ResponsiveNav
- Sidebar, Header

#### Feature Components:
- All Calendar components (enhanced versions preferred)
- EnhancedLibrary, OptimizedImageGrid
- Generator, BulkGenerator
- Settings and sub-components
- All Modal components

### ⚠️ Deprecated/Inactive Components

#### UI Components (Not Currently Used):
- `aspect-ratio`, `avatar`, `badge`, `breadcrumb`, `chart`
- `collapsible`, `context-menu`, `drawer`, `hover-card`
- `input-otp`, `menubar`, `navigation-menu`, `radio-group`
- `resizable`, `slider`, `sonner`

#### Deprecated Feature Components:
- Basic Library (replaced by EnhancedLibrary)
- Basic LibraryHeader (replaced by EnhancedLibraryHeader)
- Basic ImageGrid (replaced by OptimizedImageGrid)
- ActualImageGrid (experimental, not in production)

#### Unused Pages:
- `/demo-nav` - Navigation demo page
- `/api-test` - API testing page

---

## Page Routes

### Authentication Routes
- `/auth/login` - User login ✅
- `/auth/signup` - User registration ✅
- `/auth/forgot-password` - Password reset request ✅
- `/auth/reset-password` - Password reset form ✅
- `/auth/verify-email` - Email verification ✅
- `/auth/check-email` - Email check notification ✅
- `/auth/error` - Authentication error page ✅
- `/auth/confirm` - Confirmation callback ✅

### Application Routes
- `/` - Redirects to `/dashboard` ✅
- `/dashboard` - Main dashboard (default landing) ✅
- `/calendar` - Calendar view with events ✅
- `/generator` - Single image generation ✅
- `/bulk-generator` - Batch image generation ✅
- `/editor` - Image editing interface ✅
- `/library` - Image library and management ✅
- `/upload` - File upload interface ✅
- `/settings` - Application settings ✅

---

## Authentication System

### Supabase Integration
- **Authentication**: Email/password with verification
- **Session Management**: Server-side session handling
- **Protected Routes**: Middleware-based route protection
- **User Context**: Available throughout authenticated pages

### Auth Flow
1. User signs up → Email verification sent
2. Email verified → User can log in
3. Login successful → Redirected to dashboard
4. Session maintained → Access to all features
5. Logout → Session cleared, redirected to login

---

## Database Integration

### Supabase Tables (Inferred from API usage)
- **users**: User accounts and profiles
- **calendar_events**: Calendar event data
- **calendars**: Calendar configurations
- **image_groups**: Image collections
- **vector_stores**: Knowledge base stores
- **files**: Uploaded file metadata

### Storage Buckets
- Image storage for generated content
- File storage for uploads
- Thumbnail generation via edge functions

---

## Key Features

### 1. AI-Powered Image Generation
- Multiple AI provider support (OpenAI, Google)
- Prompt enhancement and optimization
- Style presets and customization
- Batch generation capabilities

### 2. Calendar Integration
- Visual calendar interface with multiple views
- Event-triggered image generation
- Third-party calendar sync (Google, Outlook, Jira)
- Event status tracking and management

### 3. Knowledge Base System
- Vector store for contextual information
- File upload and processing
- Content retrieval for AI context
- Template management

### 4. Image Library
- Optimized grid display with virtual scrolling
- Progressive image loading
- Metadata and tagging system
- Search and filter capabilities
- Preview modal with full-size viewing

### 5. Batch Processing
- CSV upload for bulk operations
- Template system for consistent generation
- Progress tracking and monitoring
- Batch status management

### 6. User Preferences
- Creative preferences for AI generation
- Technical preferences for performance
- API integration settings
- Customizable workflows

---

## Performance Optimizations

### Implemented Optimizations
- **Virtual Scrolling**: React Virtuoso for large lists
- **Progressive Image Loading**: Lazy loading with placeholders
- **Optimized Components**: Performance-focused component versions
- **Database Query Optimization**: Indexed queries, pagination
- **CDN Integration**: Supabase CDN for image delivery
- **Code Splitting**: Dynamic imports for route-based splitting

### Caching Strategy
- Browser caching for static assets
- API response caching where applicable
- Image thumbnail generation and caching
- Session-based preference caching

---

## Development Considerations

### Environment Variables Required
```env
OPENAI_API_KEY=            # OpenAI API access
GEMINI_API_KEY=            # Google AI API access
NEXT_PUBLIC_SUPABASE_URL=  # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY= # Supabase anonymous key
```

### Development Commands
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Migration Files
- `002_image_grid_optimization.sql`: Database optimizations for image grid performance

### Edge Functions
- `generate-thumbnail`: Serverless function for thumbnail generation

---

## Future Considerations

### Potential Improvements
1. Complete migration from deprecated components to enhanced versions
2. Implement remaining unused UI components as needed
3. Add more comprehensive error handling
4. Expand test coverage
5. Implement real-time collaboration features
6. Add more AI provider integrations

### Technical Debt
1. Remove deprecated component files
2. Consolidate similar components (Basic vs Enhanced versions)
3. Standardize API response formats
4. Improve TypeScript type coverage
5. Optimize bundle size by removing unused dependencies

---

## Conclusion

GeneraPix is a mature, feature-rich application with a well-structured codebase. The majority of components are actively used, with clear patterns for layout, data management, and user interaction. The application successfully integrates multiple AI services and provides a comprehensive platform for AI-powered image generation and management.

Key strengths include:
- Modern tech stack with latest versions
- Performance-optimized components
- Comprehensive feature set
- Good separation of concerns
- Extensive UI component library

Areas for improvement:
- Remove deprecated components
- Expand documentation
- Increase test coverage
- Further performance optimizations