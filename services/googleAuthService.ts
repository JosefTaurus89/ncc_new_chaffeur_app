
import { UserProfile } from '../types';

// This service simulates the Google Identity Services SDK interaction.
// In a real production app, you would use `window.google.accounts.oauth2.initTokenClient`.

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'mock-client-id';

export const signInWithGoogle = async (): Promise<UserProfile> => {
    console.log("Initiating Google Sign-In...");
    
    // SIMULATION: In a real app, this would open the Google Popup
    return new Promise((resolve) => {
        setTimeout(() => {
            const mockUser: UserProfile = {
                id: 'google-user-123',
                name: 'Demo Google User',
                email: 'user@example.com',
                picture: 'https://lh3.googleusercontent.com/a/ACg8ocIq8d_8z_...=s96-c', // Generic Google-like avatar
                accessToken: 'mock-access-token-' + Date.now(),
            };
            
            // Save to session storage to persist across reloads (basic session management)
            sessionStorage.setItem('ncc_user_session', JSON.stringify(mockUser));
            resolve(mockUser);
        }, 1500); // Simulate network delay
    });
};

export const signOutGoogle = async (): Promise<void> => {
    console.log("Signing out...");
    return new Promise((resolve) => {
        sessionStorage.removeItem('ncc_user_session');
        resolve();
    });
};

export const getStoredSession = (): UserProfile | null => {
    try {
        const stored = sessionStorage.getItem('ncc_user_session');
        return stored ? JSON.parse(stored) : null;
    } catch (e) {
        return null;
    }
};
