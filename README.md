# EndTimes

A simple web app to calculate when your movie will end, including buffer time for previews and credits.

## Features

- **Movie Search**: Searches The Movie Database (TMDB) for movies by title
- **Smart Matching**: Finds the closest match prioritizing recent releases  
- **Time Calculation**: Calculates end time based on start time + trailer duration + runtime
- **Responsive Design**: Works on both mobile and desktop devices
- **Trailer Duration**: Configurable trailer time from 0-30 minutes (defaults to 20)
- **URL Parameters**: Shareable/bookmarkable searches with automatic form pre-filling

## Setup

1. **Get a TMDB API Key**:
   - Visit [The Movie Database](https://www.themoviedb.org/settings/api)
   - Create an account and request an API key
   - Copy your API key

2. **Configure the App**:
   - Set the `TMDB_API_KEY` environment variable with your API key:
     ```bash
     export TMDB_API_KEY=your_actual_api_key_here
     ```

3. **Run the App**:
   - Open `index.html` in your web browser
   - Or serve it using a local web server

## Usage

### Basic Usage
1. Enter a movie title in the search field
2. Set your desired start time using the time picker
3. Choose trailer duration from the dropdown (defaults to 20 minutes)
4. Click "Go" 
5. View the estimated start time and end time for the movie

### URL Parameters
You can pre-fill the form and auto-search using URL parameters:

**Available parameters:**
- `movie` - Movie title to search for
- `time` - Start time in HH:MM format (e.g., "19:30")
- `buffer` - Trailer duration in minutes (0, 5, 10, 15, 20, 25, or 30)
- `auto` - Set to "true" to automatically search on page load

**Examples:**
```
index.html?movie=Dune&time=20:00&buffer=25
index.html?movie=Oppenheimer&time=19:30&buffer=20&auto=true
```

After searching, the URL automatically updates so you can bookmark or share your searches.

## How It Works

- Searches TMDB for movies matching your title
- Prioritizes movies with recent release dates for better accuracy
- Calculates estimated start time (your time + trailer duration)
- Calculates estimated end time (start time + trailer duration + movie runtime)
- Updates URL parameters for easy bookmarking and sharing
- Displays times in an easy-to-read format