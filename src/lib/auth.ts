import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { redis } from "./redis";

// Define user interface with role
export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: "user" | "admin";
}

// Function to normalize email for use as a key
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

// Function to get user-specific data key based on email
export function getUserDataKeyByEmail(email: string): string {
  return `userData:email:${normalizeEmail(email)}`;
}

// Create configuration for NextAuth
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  callbacks: {
    // Add user role to token
    async jwt({ token, account, profile }) {
      // If this is the first sign-in
      if (account && profile) {
        const userId = token.sub as string;
        const userEmail = token.email as string;
        
        if (!userEmail) {
          console.error("No email provided by Google OAuth");
          return token;
        }
        
        // Check if user exists by email first
        const normalizedEmail = normalizeEmail(userEmail);
        const userEmailKey = `user:email:${normalizedEmail}`;
        const existingUserIdByEmail = await redis.get(userEmailKey);
        
        // If no user exists yet with this email
        if (!existingUserIdByEmail) {
          // Create or update user info
          const isAdmin = userEmail === process.env.ADMIN_EMAIL;
          
          // Add role to token
          token.role = isAdmin ? "admin" : "user";
          
          // Create new user for Redis
          const newUser: User = {
            id: userId,
            name: token.name as string || "",
            email: userEmail,
            image: token.picture as string || "",
            role: isAdmin ? "admin" : "user",
          };
          
          // Save user by ID
          await redis.set(`user:${userId}`, JSON.stringify(newUser));
          
          // Create email to ID mapping
          await redis.set(userEmailKey, userId);
        } else {
          // User exists by email, get their data
          const userData = await redis.get(`user:${existingUserIdByEmail}`);
          
          if (userData) {
            // User exists, get role from Redis
            const user = JSON.parse(userData as string) as User;
            token.role = user.role;
            
            // If ID has changed, update the user
            if (existingUserIdByEmail !== userId) {
              user.id = userId; // Update the ID
              
              // Update user data with new ID
              await redis.set(`user:${userId}`, JSON.stringify(user));
              // Update email mapping to new ID
              await redis.set(userEmailKey, userId);
            }
          } else {
            // Email mapping exists but user data doesn't - recreate
            const isAdmin = userEmail === process.env.ADMIN_EMAIL;
            token.role = isAdmin ? "admin" : "user";
            
            // Create new user for Redis
            const newUser: User = {
              id: userId,
              name: token.name as string || "",
              email: userEmail,
              image: token.picture as string || "",
              role: isAdmin ? "admin" : "user",
            };
            
            // Save user by ID and update email mapping
            await redis.set(`user:${userId}`, JSON.stringify(newUser));
            await redis.set(userEmailKey, userId);
          }
        }
      }
      
      return token;
    },
    
    // Add custom user data to session
    async session({ session, token }) {
      // Add token data to session
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as "admin" | "user";
      }
      
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});

// Helper to check if user is admin
export const isAdmin = async (userId: string): Promise<boolean> => {
  const userData = await redis.get(`user:${userId}`);
  if (!userData) return false;
  
  const user = JSON.parse(userData as string) as User;
  return user.role === "admin";
};

// Helper to get user ID from email
export const getUserIdByEmail = async (email: string): Promise<string | null> => {
  if (!email) return null;
  const normalizedEmail = normalizeEmail(email);
  const userId = await redis.get(`user:email:${normalizedEmail}`);
  return userId;
};

// Declare module augmentation for next-auth to include custom properties
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
      role: "user" | "admin";
    };
  }
} 