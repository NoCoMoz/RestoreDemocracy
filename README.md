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

- Information about the proposed amendment
- Representative lookup by ZIP code or geolocation
- Modal for displaying the amendment text
- Responsive design for all device sizes
