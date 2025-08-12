# BSG Logistics Management System

A comprehensive logistics management system built with React, Vite, TypeScript, and Supabase. Features multi-tenant architecture, route optimization, real-time tracking, and financial management.

## 🚀 Quick Start

### Prerequisites

- **Node.js**: 18.x or higher ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- **Supabase Account**: For backend services ([sign up free](https://supabase.com))
- **Google Maps API Key**: For geocoding services ([get API key](https://developers.google.com/maps/documentation/javascript/get-api-key))

### Local Development Setup

1. **Clone and install dependencies**:
   ```bash
   git clone <YOUR_GIT_URL>
   cd <YOUR_PROJECT_NAME>
   npm install
   ```

2. **Supabase Configuration**:
   - The app is pre-configured with project ID: `wvjehbozyxhmgdljwsiz`
   - Database schema and RLS policies are already set up
   - Edge functions are deployed automatically

3. **Configure Secrets** (Required for full functionality):
   ```bash
   # In Supabase Dashboard -> Settings -> Edge Functions
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

5. **Access the application**:
   - Local: `http://localhost:8080`
   - Create account or use demo mode (see Authentication section)

## 🏗️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Framework**: shadcn/ui, Radix UI, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Real-time)
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router DOM
- **Forms**: React Hook Form + Zod validation
- **Maps**: Google Maps JavaScript API
- **Deployment**: Lovable (or any static host)

## 🔐 Authentication & Multi-tenancy

### Demo Mode (Development)
```typescript
// In src/contexts/AuthContext.tsx
const DISABLE_AUTH = true; // Set to false for production
```

### Production Authentication
1. **Sign up** for a new account
2. **Complete onboarding** (organization setup)
3. **Invite team members** with appropriate roles

### Organization Switching
```typescript
// Switch organizations (admin users only)
const { switchOrganization } = useAuth();
switchOrganization('new-org-slug');
```

### User Roles
- **Admin**: Full system access, user management
- **Manager**: Client/route management, reporting
- **Driver**: Route execution, pickup completion

## 📊 Pricing Configuration

### Pricing Tier Hierarchy
1. **Location-specific**: Override for individual locations
2. **Client default**: Default for all client locations
3. **Organization default**: System-wide fallback rates

### Rate Configuration
```typescript
// Default rates (configurable per organization)
const defaultRates = {
  pte_rate: 25.00,      // Per tire equivalent
  otr_rate: 45.00,      // Off-the-road tires
  tractor_rate: 35.00,  // Tractor tires
  tax_rate: 0.0825      // 8.25% tax
};
```

### Creating Pricing Tiers
```sql
INSERT INTO pricing_tiers (name, pte_rate, otr_rate, tractor_rate, organization_id)
VALUES ('Premium', 30.00, 50.00, 40.00, '<organization_id>');
```

## 🚛 Route Planning

### Daily Workflow
1. **Import pickups** (CSV or manual entry)
2. **Run route optimization** for available vehicles
3. **Assign drivers** to optimized routes
4. **Track progress** with real-time updates
5. **Complete assignments** and update client records

### Route Optimization Features
- **Vehicle capacity constraints**
- **Time window preferences**
- **Geographic clustering**
- **Minimize total travel time**
- **Real-time traffic consideration** (future)

## 📋 CSV Data Management

### Bulk Import Format
```csv
company_name,contact_name,email,phone,address,type,pricing_tier,pte_count,otr_count,tractor_count,pickup_date,preferred_window,notes
"ABC Company","John Doe","john@abc.com","555-0123","123 Main St, Austin, TX","commercial","Standard",5,2,1,"2024-01-15","AM","Gate code: 1234"
```

### Export Capabilities
- **Clients**: Full client database with contact information
- **Pickups**: Date-range filtered pickup history
- **Invoices**: Financial records for accounting

## 🔧 Available Scripts

- `npm run dev` - Start development server (port 8080)
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode (with debug info)
- `npm run start` - Preview production build locally
- `npm run preview` - Alias for start
- `npm run lint` - Run ESLint code quality checks

## 🌐 Deployment Guide

### 1. Lovable Hosting (Recommended)

**Simplest deployment option with zero configuration:**

1. Visit your [Lovable Project](https://lovable.dev/projects/9afe9a8a-0280-4803-b6c2-3c5497b7f0eb)
2. Click **Share → Publish**
3. Your app deploys automatically with SSL certificate
4. Custom domains available on paid plans

### 2. Vercel Deployment

**For teams preferring Vercel's platform:**

1. **Connect repository**:
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy from project root
   vercel
   ```

2. **Configure build settings**:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Node.js Version: `18.x`

3. **Environment variables** (optional):
   ```bash
   # Vercel dashboard or CLI
   vercel env add VITE_CUSTOM_SETTING production
   ```

### 3. Netlify Deployment

**Popular for JAMstack applications:**

1. **Connect repository** in Netlify dashboard
2. **Build settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. **Deploy**: Automatic on git push

### 4. Railway Deployment

**For full-stack applications (if adding Node.js backend):**

1. **Connect repository** to Railway
2. **Add environment variables**:
   ```env
   NODE_ENV=production
   PORT=3000
   ```
3. **Deploy**: Automatic via git push

### 5. Self-hosted (VPS/Docker)

**For custom infrastructure:**

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["npx", "serve", "-s", "dist", "-l", "3000"]
```

```bash
# Build and deploy
npm run build
docker build -t logistics-app .
docker run -p 3000:3000 logistics-app
```

## 🔒 Security Configuration

### Content Security Policy
```html
<!-- Recommended CSP headers -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' https://maps.googleapis.com; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data: https:;">
```

### Environment Security
- **API Keys**: Store in Supabase Edge Function secrets
- **Database**: Protected by Row Level Security (RLS)
- **Authentication**: Supabase handles JWT tokens securely
- **HTTPS**: Enforced on all production deployments

## 📱 Features Overview

### Core Management
- **Multi-tenant Client Management**: Organize clients by company
- **Location Tracking**: GPS coordinates and service history
- **Vehicle Fleet Management**: Capacity tracking and assignments
- **Driver Workflow**: Mobile-friendly route completion

### Route Optimization
- **Smart Routing**: Minimize travel time and fuel costs
- **Capacity Planning**: Optimize vehicle utilization
- **Time Windows**: Respect customer preferences
- **Real-time Updates**: Track progress throughout the day

### Financial Management
- **Dynamic Pricing**: Tier-based rate structures
- **Invoice Generation**: Automated billing from completed pickups
- **Payment Tracking**: Record and reconcile payments
- **Revenue Analytics**: Client lifetime value and profitability

### Data Import/Export
- **CSV Bulk Operations**: Import client data and export reports
- **Validation Engine**: Prevent data quality issues
- **Audit Trail**: Track all data modifications

## 🧪 Testing

### Manual Testing Checklist
- [ ] User registration and organization setup
- [ ] Client creation and location geocoding
- [ ] Pickup scheduling and route optimization
- [ ] Driver workflow (assignment completion)
- [ ] Invoice generation and payment recording
- [ ] CSV import/export functionality
- [ ] Multi-tenant data isolation

### Accessibility Testing
- [ ] Keyboard navigation throughout app
- [ ] Screen reader compatibility
- [ ] Color contrast compliance (WCAG AA)
- [ ] Focus management in modals/dialogs

## 🔍 Troubleshooting

### Common Issues

**"Invalid API Key" errors**:
- Verify Google Maps API key in Supabase secrets
- Check API key restrictions and billing setup

**Route optimization not working**:
- Ensure locations have valid coordinates
- Check vehicle capacity vs. pickup requirements
- Verify time window constraints

**Authentication issues**:
- Check Supabase URL configuration in auth settings
- Verify email confirmation settings
- Review RLS policies for data access

**Performance issues**:
- Enable database indexes for large datasets
- Implement pagination for client lists
- Use React Query caching effectively

### Development Mode
```typescript
// Enable detailed error logging
const isDevelopment = process.env.NODE_ENV === 'development';

// Access development tools
if (isDevelopment) {
  // Component debugging available
  // Detailed error stacks shown
  // Hot reload enabled
}
```

## 📧 Support & Documentation

- **Implementation Details**: See [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md)
- **Lovable Project**: [Project Dashboard](https://lovable.dev/projects/9afe9a8a-0280-4803-b6c2-3c5497b7f0eb)
- **Supabase Dashboard**: [Database & Auth Management](https://supabase.com/dashboard/project/wvjehbozyxhmgdljwsiz)
- **API Documentation**: Auto-generated from Supabase schema

## 🚀 Next Steps

After successful deployment:

1. **Configure pricing tiers** for your market
2. **Import existing client data** via CSV
3. **Set up vehicle fleet** and driver accounts
4. **Train team** on daily workflow
5. **Monitor performance** and optimize routes

## 📄 License

This project is proprietary software. Contact your development team for licensing information.
