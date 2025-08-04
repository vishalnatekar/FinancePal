# Personal Finance Hub

## Overview

Personal Finance Hub is a modern web application designed as an MVP personal finance aggregator that helps users track their financial life in one secure dashboard. The application connects to bank accounts via Open Banking APIs, calculates net worth, automatically categorizes transactions, and enables budgeting and financial goal tracking.

The system is built as a single-user application (initially) targeting finance-savvy individuals who want full visibility and control over their personal financial data without relying on third-party opaque tools.

## User Preferences

Preferred communication style: Simple, everyday language.
Geographic focus: UK banking and financial institutions
Currency: British Pound (GBP) for all financial displays
Target market: UK residents using Open Banking standards

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Radix UI primitives with shadcn/ui component library for consistent, accessible design
- **Styling**: Tailwind CSS with CSS variables for theming (supports light/dark modes)
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Authentication**: Firebase Authentication with Google OAuth integration
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for full-stack type safety
- **API Design**: RESTful API structure with organized route handlers
- **Session Management**: Express sessions with PostgreSQL session store
- **Error Handling**: Centralized error handling middleware with proper HTTP status codes
- **Development**: Hot module replacement and live reload capabilities

### Data Storage Solutions
- **Primary Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Database Provider**: Neon serverless PostgreSQL for scalable cloud hosting
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection**: Connection pooling with @neondatabase/serverless

### Database Schema Design
The system uses a relational schema with the following core entities:
- **Users**: Authentication and profile information with Google OAuth integration
- **Accounts**: Financial account aggregation with external provider mapping
- **Transactions**: Detailed transaction records with automatic categorization
- **Budgets**: User-defined spending budgets with progress tracking
- **Goals**: Financial goals with progress monitoring
- **Net Worth History**: Time-series data for net worth tracking and visualization

### Authentication and Authorization
- **Primary Method**: Firebase Authentication with Google OAuth
- **Session Management**: Server-side sessions stored in PostgreSQL
- **Security**: Secure HTTP-only cookies with proper CORS configuration
- **User Flow**: OAuth-based registration and login with automatic user provisioning

### Transaction Categorization System
- **Rule-Based Engine**: Keyword matching and merchant pattern recognition
- **Machine Learning Ready**: Confidence scoring system for future ML integration
- **User Override**: Manual categorization with learning capabilities
- **Categories**: Predefined categories (Groceries, Transportation, Entertainment, etc.) with extensibility

### API Architecture
The backend exposes RESTful endpoints for:
- Authentication and user management
- Account aggregation and synchronization
- Transaction retrieval and categorization
- Budget creation and monitoring
- Goal setting and progress tracking
- Net worth calculation and historical data

## External Dependencies

### Banking Integration (TrueLayer Implementation)
- **Provider**: TrueLayer - Market leader with 99% UK bank coverage
- **Current Status**: Sandbox integration implemented and functional
- **Client ID**: sandbox-financepal-415037 (configured for development)
- **Redirect URI**: https://finance-pal-vishalnatekar.replit.app/api/banking/callback
- **Auth Flow**: OAuth 2.0 with PKCE support for secure bank connections
- **Supported Banks**: All major UK banks including Lloyds, Barclays, HSBC, NatWest, Santander, Halifax, Nationwide, Monzo, Starling, Revolut
- **Data Types**: Account balances, transaction history, and account metadata
- **Compliance**: FCA regulated Open Banking standards and PSD2
- **Setup Note**: Redirect URI must be whitelisted in TrueLayer Console App Settings

### Authentication Services
- **Firebase Authentication**: Google OAuth integration for secure user authentication
- **Configuration**: Environment-based Firebase project configuration

### Database Services
- **Neon PostgreSQL**: Serverless PostgreSQL database with automatic scaling
- **Connection**: WebSocket-based connections for optimal performance

### UI and Styling Dependencies
- **Radix UI**: Comprehensive set of accessible UI primitives
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **Lucide Icons**: Consistent icon library for UI elements
- **Recharts**: Data visualization library for financial charts and graphs

### Development and Build Tools
- **Vite**: Fast build tool with hot module replacement
- **TypeScript**: Static type checking across the entire stack
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Tailwind integration

### Additional Service Integrations
- **Date Handling**: date-fns for consistent date manipulation
- **Form Management**: React Hook Form with Zod validation
- **Error Monitoring**: Replit-specific error overlay for development
- **Session Storage**: connect-pg-simple for PostgreSQL session management