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
  return `user:email:${normalizeEmail(email)}`;
}

// Function to get user profile key
function getUserProfileKey(userId: string): string {
  return `user:${userId}`;
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
        const userEmailKey = getUserDataKeyByEmail(normalizedEmail);
        console.log("[Auth Debug] Checking email mapping:", userEmailKey);
        const existingUserIdByEmail = await redis.get(userEmailKey);
        console.log("[Auth Debug] Existing user ID for email:", existingUserIdByEmail);
        
        // If no user exists yet with this email
        if (!existingUserIdByEmail) {
          console.log("[Auth Debug] No existing user found for email, creating new user");
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
          const userProfileKey = getUserProfileKey(userId);
          console.log("[Auth Debug] Saving new user profile:", userProfileKey);
          await redis.set(userProfileKey, JSON.stringify(newUser));
          
          // Create email to ID mapping
          console.log("[Auth Debug] Creating email mapping:", userEmailKey, "->", userId);
          await redis.set(userEmailKey, userId);
        } else {
          console.log("[Auth Debug] Found existing user:", existingUserIdByEmail);
          // User exists by email, get their data
          const userProfileKey = getUserProfileKey(existingUserIdByEmail);
          console.log("[Auth Debug] Getting user profile:", userProfileKey);
          const userData = await redis.get(userProfileKey);
          
          if (userData) {
            // User exists, get role from Redis
            const user = JSON.parse(userData as string) as User;
            token.role = user.role;
            
            // If ID has changed, use the existing ID instead of creating a new one
            if (existingUserIdByEmail !== userId) {
              console.log("[Auth Debug] Different Google ID provided, keeping original user ID:", existingUserIdByEmail);
              // Update the token's sub to use our existing user ID
              token.sub = existingUserIdByEmail;
            }
          } else {
            console.log("[Auth Debug] Email mapping exists but no profile found, recreating");
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
            const userProfileKey = getUserProfileKey(userId);
            console.log("[Auth Debug] Saving recreated profile:", userProfileKey);
            await redis.set(userProfileKey, JSON.stringify(newUser));
            console.log("[Auth Debug] Updating email mapping for recreated user");
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
  const userId = await redis.get(getUserDataKeyByEmail(normalizedEmail));
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