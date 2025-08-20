// Validation constants
const VALID_BUFFER_VALUES = ['0', '5', '10', '15', '20', '25', '30'];

class MovieEndTimeCalculator {
    constructor() {
        // API calls now go through our Worker, no need for direct TMDB API key
        this.apiKey = null;
        this.baseUrl = '/api';
        
        this.movieTitleInput = document.getElementById('movie-title');
        this.startTimeInput = document.getElementById('start-time');
        this.bufferTimeSelect = document.getElementById('buffer-time');
        this.calculateBtn = document.getElementById('calculate-btn');
        this.resultsDiv = document.getElementById('results');
        this.loadingDiv = document.getElementById('loading');
        this.errorDiv = document.getElementById('error');
        
        this.populateBufferOptions();
        this.init();
        this.movieTitleInput.focus();
    }
    
    populateBufferOptions() {
        VALID_BUFFER_VALUES.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            if (value === '20') {
                option.selected = true;
            }
            this.bufferTimeSelect.appendChild(option);
        });
    }
    
    init() {
        this.calculateBtn.addEventListener('click', () => this.handleCalculate());
        
        // Handle Enter key on any form field
        const formFields = [this.movieTitleInput, this.startTimeInput, this.bufferTimeSelect];
        formFields.forEach(field => {
            field.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleCalculate();
                }
            });
        });
        
        this.setCurrentTime();
        this.initializeAsync();
    }
    
    setCurrentTime() {
        this.startTimeInput.value = '12:30';
    }
    
    async initializeAsync() {
        await this.loadFromUrlParams();
    }
    
    async loadFromUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        
        const movie = urlParams.get('movie');
        const time = urlParams.get('time');
        const buffer = urlParams.get('buffer');
        const auto = urlParams.get('auto');
        
        if (movie) {
            this.movieTitleInput.value = movie;
        }
        
        // Add time format validation
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (time && timeRegex.test(time)) {
            this.startTimeInput.value = time;
        }
        
        if (buffer && VALID_BUFFER_VALUES.includes(buffer)) {
            this.bufferTimeSelect.value = buffer;
        }
        
        if (movie && auto === 'true') {
            await this.handleCalculate();
        }
    }
    
    updateUrlParams(movieTitle, startTime, bufferMinutes) {
        const url = new URL(window.location);
        url.searchParams.set('movie', movieTitle);
        url.searchParams.set('time', startTime);
        url.searchParams.set('buffer', bufferMinutes.toString());
        url.searchParams.delete('auto');
        
        window.history.replaceState({}, '', url);
    }
    
    async handleCalculate() {
        const movieTitle = this.movieTitleInput.value.trim();
        const startTime = this.startTimeInput.value;
        const bufferMinutes = parseInt(this.bufferTimeSelect.value);
        
        if (!movieTitle) {
            this.showError('Please enter a movie title');
            return;
        }
        
        if (!startTime) {
            this.showError('Please select a start time');
            return;
        }
        
        this.showLoading();
        this.updateUrlParams(movieTitle, startTime, bufferMinutes);
        
        try {
            const movie = await this.searchMovie(movieTitle);
            const movieDetails = await this.getMovieDetails(movie.id);
            this.calculateAndDisplayTimes(movieDetails, startTime, bufferMinutes);
        } catch (error) {
            this.showError(error.message || 'Failed to find movie information');
        }
    }
    
    async searchMovie(title) {
        const searchUrl = `${this.baseUrl}/search?query=${encodeURIComponent(title)}`;
        const response = await fetch(searchUrl);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to search for movies');
        }
        
        const data = await response.json();
        
        if (!data.results || data.results.length === 0) {
            throw new Error('No movies found with that title');
        }
        
        const currentYear = new Date().getFullYear();
        const recentMovies = data.results
            .filter(movie => movie.release_date)
            .map(movie => ({
                ...movie,
                releaseYear: parseInt(movie.release_date.split('-')[0])
            }))
            .sort((a, b) => {
                const aDiff = Math.abs(currentYear - a.releaseYear);
                const bDiff = Math.abs(currentYear - b.releaseYear);
                if (aDiff !== bDiff) {
                    return aDiff - bDiff;
                }
                return b.releaseYear - a.releaseYear;
            });
        
        return recentMovies[0];
    }
    
    async getMovieDetails(movieId) {
        const detailsUrl = `${this.baseUrl}/movie/${movieId}`;
        const response = await fetch(detailsUrl);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to get movie details');
        }
        
        return await response.json();
    }
    
    calculateAndDisplayTimes(movie, startTime, bufferMinutes) {
        const runtime = movie.runtime;
        
        if (!runtime) {
            throw new Error('Runtime information not available for this movie');
        }
        
        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const startDate = new Date();
        startDate.setHours(startHours, startMinutes, 0, 0);
        
        const estStartDate = new Date(startDate.getTime() + bufferMinutes * 60000);
        const estEndDate = new Date(estStartDate.getTime() + runtime * 60000);
        
        this.displayResults(movie, estStartDate, estEndDate, runtime);
    }
    
    displayResults(movie, estStartTime, estEndTime, runtime) {
        const movieNameEl = document.getElementById('movie-name');
        // Safely set movie title and metadata to prevent XSS
        movieNameEl.textContent = movie.title;
        
        const metaSpan = document.createElement('span');
        metaSpan.className = 'movie-meta';
        metaSpan.textContent = `(${movie.release_date ? movie.release_date.split('-')[0] : 'Unknown year'}) • ${runtime} min`;
        movieNameEl.appendChild(document.createTextNode(' '));
        movieNameEl.appendChild(metaSpan);
        document.getElementById('movie-details').textContent = '';
        
        document.getElementById('est-start-time').textContent = 
            this.formatTime(estStartTime);
        document.getElementById('est-end-time').textContent = 
            this.formatTime(estEndTime);
        
        this.hideLoading();
        this.hideError();
        this.resultsDiv.style.display = 'block';
    }
    
    formatTime(date) {
        return date.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
    }
    
    showLoading() {
        this.loadingDiv.style.display = 'block';
        this.resultsDiv.style.display = 'none';
        this.hideError();
        this.calculateBtn.disabled = true;
    }
    
    hideLoading() {
        this.loadingDiv.style.display = 'none';
        this.calculateBtn.disabled = false;
    }
    
    showError(message) {
        document.getElementById('error-message').textContent = message;
        this.errorDiv.style.display = 'block';
        this.resultsDiv.style.display = 'none';
        this.hideLoading();
    }
    
    hideError() {
        this.errorDiv.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MovieEndTimeCalculator();
});
