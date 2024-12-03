# Table Visualizer

## Overview

This project is a dynamic table visualization tool that fetches data based on user queries and displays it in a structured, interactive table format. Users can input a query, view the resulting table and SQL query, and drill down or drill across specific columns for deeper insights.

## Features

- Input user queries to generate a table.
- Display the corresponding SQL query.
- Interactive table with drill-down and drill-across capabilities.
- Popup options for columns with contextual actions.
- Loading indicator for a better user experience during data fetch.

## Files

- **`index.html`**: The main UI structure with an input field and table display containers.
- **`styles.css`**: Styling for the page layout, table.
- **`script-test-api.js`**: Core JavaScript logic for:
  - Fetching initial and drilled data.
  - Visualizing the table and SQL query.
  - Handling column clicks and popup interactions.
- **`script-local-api.js`**: JavaScript logic for local json data.
  - Used for local debugging when api is not available

## How to Use

1. Open "index.html" with Live Server and also make sure the backend server is live.
2. Enter a query (e.g., "Sales Data for Electronics in New York") in the input field.
3. Click **Generate Table** to fetch and display the data.
4. Interact with the table by clicking on columns for drill-down or drill-across options.

## Important Notes

- The backend API endpoints (`fetch-data` and `perfom-drilling`) must be running and accessible at `http://127.0.0.1:8000`.
