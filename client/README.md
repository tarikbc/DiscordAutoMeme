# Discord Auto Meme Frontend

This is the frontend application for Discord Auto Meme, built with React, Vite, and TypeScript.

## Features

- Authentication and user management
- Discord account management
- Content delivery configuration
- Real-time status monitoring
- Admin dashboard with system statistics

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Navigate to the client directory: `cd client`
3. Install dependencies: `npm install` or `yarn install`
4. Create a `.env` file based on `.env.example`

### Development

To start the development server:

```bash
npm run dev
# or
yarn dev
```

### Building for Production

To build the application for production:

```bash
npm run build
# or
yarn build
```

## Project Structure

```
client/
├── public/              # Static assets
├── src/
│   ├── assets/          # Images, fonts, etc.
│   │   ├── common/      # Buttons, inputs, etc.
│   │   ├── layout/      # Page layouts
│   │   ├── dashboard/   # Dashboard components
│   │   ├── accounts/    # Account management components
│   │   ├── content/     # Content management components
│   │   └── admin/       # Admin dashboard components
│   ├── context/         # React context providers
│   ├── hooks/           # Custom React hooks
│   ├── pages/           # Page components
│   │   ├── auth/        # Authentication pages
│   │   ├── dashboard/   # Dashboard pages
│   │   ├── accounts/    # Account pages
│   │   ├── content/     # Content pages
│   │   └── admin/       # Admin pages
│   ├── services/        # API services
│   ├── store/           # Redux store (if used)
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   ├── App.tsx          # Main app component
│   └── main.tsx         # Entry point
```

## Tech Stack

- React 18
- TypeScript
- Vite
- React Router
- Redux Toolkit (or Context API)
- Tailwind CSS
- Axios for API requests
- Socket.io for real-time updates
