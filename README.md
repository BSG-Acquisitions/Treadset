# BSG Logistics Management System

A comprehensive logistics management system built with React, Vite, TypeScript, and Supabase.

## 🚀 Quick Start

### Development Setup

```sh
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Setup

This project uses Supabase for backend services. The Supabase configuration is already set up in `src/integrations/supabase/client.ts`.

## 🏗️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Components**: shadcn/ui, Radix UI
- **Styling**: Tailwind CSS
- **Backend**: Supabase (Database, Auth, Edge Functions)
- **State Management**: TanStack Query
- **Routing**: React Router DOM
- **Forms**: React Hook Form + Zod validation

## 📦 Deployment

### Lovable Hosting (Recommended)

1. Visit your [Lovable Project](https://lovable.dev/projects/9afe9a8a-0280-4803-b6c2-3c5497b7f0eb)
2. Click Share → Publish
3. Your app will be deployed automatically

### Manual Deployment (Any Static Host)

1. **Build the project**:
   ```sh
   npm run build
   ```

2. **Deploy the `dist` folder** to your hosting provider:
   - Vercel: Connect your GitHub repo
   - Netlify: Drag and drop the `dist` folder
   - GitHub Pages: Use GitHub Actions
   - Any static hosting service

3. **Configure your hosting**:
   - Set build command: `npm run build`
   - Set publish directory: `dist`
   - Set Node.js version: `18.x` or higher

### Supabase Configuration

The app is pre-configured with Supabase. If you need to modify the Supabase setup:

1. **Database**: All tables and RLS policies are already configured
2. **Authentication**: Email/password auth is enabled
3. **Edge Functions**: Located in `supabase/functions/`
4. **Secrets**: Configure in Supabase Dashboard → Settings → Edge Functions

#### Required Supabase Secrets
- `GOOGLE_MAPS_API_KEY` (for geocoding in bookings)

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## 🔐 Authentication

The app includes multi-tenant authentication with organization support:

- **Demo Mode**: Set `DISABLE_AUTH=true` in `src/contexts/AuthContext.tsx`
- **Production**: Users must sign up and be assigned to an organization

### First-Time Setup

1. Sign up for an account
2. Complete the onboarding process
3. You'll be automatically assigned to the "BSG" organization

## 📱 Features

- **Client Management**: Add, edit, and manage clients with locations
- **Route Planning**: Optimize pickup routes with vehicle assignments
- **Booking System**: Public booking interface for customers
- **Vehicle Management**: Track vehicle capacity and schedules
- **Financial Management**: Invoice generation and payment tracking
- **CSV Import/Export**: Bulk data operations
- **Real-time Updates**: Live route and assignment updates

## 📧 Support

For issues or questions, visit your [Lovable Project](https://lovable.dev/projects/9afe9a8a-0280-4803-b6c2-3c5497b7f0eb) and use the chat interface.
