# Telegram Auto-Posting System

## Overview

This is a full-stack web application for automating Telegram channel content posting. The system allows users to set up source and target channel pairs, automatically monitor source channels for new posts, and repost them to target channels with customizable filters, branding, and scheduling options. Built with React, Express, and PostgreSQL, it provides a comprehensive dashboard for managing multiple channel pairs, content filtering, and performance analytics.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: Shadcn/UI components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **State Management**: TanStack Query for server state and data fetching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite with React plugin and development tooling

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful endpoints for CRUD operations
- **Validation**: Zod schemas shared between frontend and backend
- **Error Handling**: Centralized error middleware with structured responses
- **Logging**: Custom request/response logging with timing metrics
- **Development**: Hot reload with Vite integration in development mode

### Data Layer
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Management**: Drizzle Kit for migrations and schema generation
- **Connection**: Neon Database serverless adapter for PostgreSQL
- **Storage Pattern**: Repository pattern with in-memory fallback for development
- **Data Models**: Channel pairs, posts, activity logs, and global settings

### Core Services
- **Telegram Integration**: Node Telegram Bot API for channel monitoring and posting
- **Scheduler Service**: Cron-based job scheduling for automated posting and cleanup
- **Image Processing**: Sharp library for image optimization and watermarking
- **Content Filtering**: Configurable filters for content moderation
- **Activity Logging**: Comprehensive audit trail for all system operations

### Security & Configuration
- **Environment Variables**: Database URL and bot token configuration
- **CORS**: Configured for development and production environments
- **Session Management**: PostgreSQL session store for user sessions
- **Input Validation**: Schema validation on all API endpoints

### Deployment Architecture
- **Development**: Local development with Vite dev server and Express backend
- **Build Process**: Vite build for frontend, ESBuild for backend bundling
- **Production**: Node.js server serving built React app with API endpoints
- **Database**: PostgreSQL with connection pooling for production workloads

## External Dependencies

- **Neon Database**: Serverless PostgreSQL hosting for data persistence
- **Telegram Bot API**: Official Telegram API for bot operations and channel access
- **Radix UI**: Headless UI components for accessible interface elements
- **Sharp**: High-performance image processing library for media optimization
- **Drizzle ORM**: Type-safe database toolkit with PostgreSQL dialect
- **TanStack Query**: Server state management with caching and synchronization
- **Node Cron**: Task scheduling for automated posting and maintenance jobs