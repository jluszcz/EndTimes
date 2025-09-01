class AuthService {
    constructor() {
        this.auth0Client = null;
        this.isInitialized = false;
        this.config = null;
        this.initializationPromise = null; // Cache the initialization promise
        this.configPromise = null; // Cache the config fetch promise
    }

    async fetchAuth0Config() {
        // If config is already loaded, return it immediately
        if (this.config) {
            return this.config;
        }

        // If config fetch is in progress, return the existing promise
        if (this.configPromise) {
            return await this.configPromise;
        }

        // Start config fetch and cache the promise
        this.configPromise = this._performConfigFetch();

        try {
            const config = await this.configPromise;
            return config;
        } catch (error) {
            // Clear the cached promise on error so fetch can be retried
            this.configPromise = null;
            throw error;
        }
    }

    async _performConfigFetch() {
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
        // If already initialized, return the client immediately
        if (this.isInitialized) {
            return this.auth0Client;
        }

        // If initialization is in progress, return the existing promise
        if (this.initializationPromise) {
            return await this.initializationPromise;
        }

        // Start initialization and cache the promise
        this.initializationPromise = this._performInitialization();

        try {
            const client = await this.initializationPromise;
            return client;
        } catch (error) {
            // Clear the cached promise on error so initialization can be retried
            this.initializationPromise = null;
            throw error;
        }
    }

    async _performInitialization() {
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