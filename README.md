# Congressional Recall Amendment Website

This project is a website for promoting a constitutional amendment to establish federal recall elections for members of Congress.

## Setup Instructions

### Quick Start
The website is currently using Tailwind CSS via CDN for immediate development. To view the website, simply open `index.html` in your browser.

### Setting Up Tailwind CSS for Production

For a production environment, follow these steps to set up Tailwind CSS properly:

1. Install Node.js and npm if you haven't already.

2. Install the project dependencies:
   ```
   npm install
   ```

3. Build the CSS:
   ```
   npm run build:css
   ```

4. For development with auto-reload:
   ```
   npm run watch:css
   ```

5. Once you've built the CSS properly, you can switch from the CDN version to the local version by updating the `<head>` section in `index.html`:
   ```html
   <!-- Replace this line -->
   <script src="https://cdn.tailwindcss.com"></script>
   
   <!-- With this line -->
   <link href="./dist/output.css" rel="stylesheet">
   ```

## Project Structure

- `index.html` - Main HTML file
- `script.js` - JavaScript functionality
- `styles.css` - Custom CSS styles
- `src/input.css` - Tailwind CSS input file
- `dist/output.css` - Generated Tailwind CSS output
- `tailwind.config.js` - Tailwind CSS configuration
- `package.json` - Project dependencies and scripts

## Features

- Interactive UI with draggable hero section
- Legislator lookup by ZIP code
- Contact information for state representatives
- Share functionality for social media
- Mobile-responsive design
- Animated elements for better user engagement

## Recent Updates

- Added draggable hero section that can be moved around the page
- Enhanced text visibility with improved glow and shadow effects
- Fixed mobile layout issues with proper button sizing
- Improved background image loading and overlay for better text readability

## Running the Project

To run the project locally:

```
npm install
npm run build:css
npm run start
```

This will start a local server at http://localhost:9000

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
