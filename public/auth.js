class AuthService {
    constructor() {
        this.auth0Client = null;
        this.isInitialized = false;
        this.config = null;
    }

    async fetchAuth0Config() {
        if (this.config) {
            return this.config;
        }

        try {
            const response = await fetch('/api/config/auth0');
            if (!response.ok) {
                throw new Error(`Failed to fetch Auth0 config: ${response.status}`);
            }
            
            const configData = await response.json();
            this.config = {
                domain: configData.domain,
                clientId: configData.clientId,
                authorizationParams: {
                    redirect_uri: window.location.origin,
                    audience: configData.audience
                },
                useRefreshTokens: true,
                cacheLocation: 'localstorage'
            };
            
            return this.config;
        } catch (error) {
            console.error('Failed to fetch Auth0 configuration:', error);
            throw error;
        }
    }

    async initialize() {
        if (this.isInitialized) {
            return this.auth0Client;
        }

        try {
            // Fetch configuration first
            await this.fetchAuth0Config();
            
            this.auth0Client = await auth0.createAuth0Client(this.config);
            this.isInitialized = true;
            
            // Handle the callback if we're returning from Auth0
            if (window.location.search.includes('code=') || window.location.search.includes('error=')) {
                await this.handleCallback();
            }
            
            return this.auth0Client;
        } catch (error) {
            console.error('Failed to initialize Auth0:', error);
            throw error;
        }
    }

    async handleCallback() {
        try {
            await this.auth0Client.handleRedirectCallback();
            // Clean up the URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
            console.error('Error handling Auth0 callback:', error);
            throw error;
        }
    }

    async isAuthenticated() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        return await this.auth0Client.isAuthenticated();
    }

    async getUser() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        return await this.auth0Client.getUser();
    }

    async getAccessToken() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        try {
            return await this.auth0Client.getTokenSilently();
        } catch (error) {
            console.error('Failed to get access token:', error);
            // If we can't get a token silently, user needs to log in
            throw error;
        }
    }

    async login() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        try {
            await this.auth0Client.loginWithRedirect();
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }

    async logout() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        try {
            await this.auth0Client.logout({
                logoutParams: {
                    returnTo: window.location.origin
                }
            });
        } catch (error) {
            console.error('Logout failed:', error);
            throw error;
        }
    }

    // Helper method to make authenticated API calls
    async makeAuthenticatedRequest(url, options = {}) {
        try {
            const token = await this.getAccessToken();
            
            const authOptions = {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            };
            
            const response = await fetch(url, authOptions);
            
            if (response.status === 401) {
                // Token might be expired, try to refresh
                throw new Error('Authentication required');
            }
            
            return response;
        } catch (error) {
            if (error.message.includes('login_required') || error.message.includes('Authentication required')) {
                // Force login if token is invalid
                await this.login();
                return null;
            }
            throw error;
        }
    }
}

// Create a global instance
window.authService = new AuthService();