class AuthService {
    constructor() {
        this.auth0Client = null;
        this.isInitialized = false;
        this.config = {
            domain: window.AUTH0_DOMAIN,
            clientId: window.AUTH0_CLIENT_ID,
            authorizationParams: {
                redirect_uri: window.location.origin,
                audience: window.AUTH0_AUDIENCE
            },
            useRefreshTokens: true,
            cacheLocation: 'localstorage'
        };
    }

    async initialize() {
        if (this.isInitialized) {
            return this.auth0Client;
        }

        try {
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