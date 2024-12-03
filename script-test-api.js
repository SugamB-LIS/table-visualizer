const tableContainer = document.getElementById("table-container");
const sqlQueryContainer = document.getElementById("sql-query-container");

// Clear previous states, including popups and table
function clearPreviousState() {
  tableContainer.innerHTML = "";
  sqlQueryContainer.innerHTML = "";
  closeExistingPopup();
}

// Close existing popup if any
function closeExistingPopup() {
  const existingPopup = document.querySelector(".popup");
  if (existingPopup) existingPopup.remove();
}

// Show loading indicator
function showLoadingIndicator() {
  tableContainer.innerHTML = `<div class="loading-indicator"><br><br>Loading...</div>`;
}

// Hide loading indicator
function hideLoadingIndicator() {
  tableContainer.innerHTML = "";
}

// Process user query
async function processQuery(userQuery) {
  if (!userQuery.trim()) {
    alert("Please enter a valid query.");
    return;
  }

  clearPreviousState();

  try {
    console.log("Processing query:", userQuery);
    await initialTableVisualizer(userQuery);
  } catch (error) {
    console.error("Error processing query:", error);
  }
}

// Visualize initial table
async function initialTableVisualizer(userQuery) {
  const jsonData = await fetchInitialData(userQuery);
  visualizeTable(jsonData);
}

// Fetch initial data
async function fetchInitialData(userQuery) {
  showLoadingIndicator();
  try {
    const response = await fetch("http://127.0.0.1:8000/fetch-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_query: userQuery }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  } finally {
    hideLoadingIndicator();
  }
}

// Visualize table data
async function visualizeTable(jsonData) {
  const {
    user_query: userQuery,
    sql_query: sqlQuery,
    results: tableData,
    metadata_info: metadataInfo,
  } = jsonData;

  const parsedTableData = JSON.parse(tableData);

  sqlQueryContainer.innerHTML = `<pre>${sqlQuery}</pre>`;

  let tableHtml = "<table><thead><tr>";
  parsedTableData.schema.fields.forEach((col) => {
    const isClickable = checkIfColumnIsDrillable(col.name, metadataInfo);
    tableHtml += `<th>
      ${
        isClickable
          ? `<a href="javascript:void(0);" class="clickable" onclick="handleColumnClick(event, '${userQuery}', '${
              col.name
            }', '${encodeURIComponent(
              JSON.stringify(metadataInfo)
            )}','${encodeURIComponent(sqlQuery)}')">${col.name}</a>`
          : col.name
      }
    </th>`;
  });

  tableHtml += "</tr></thead><tbody>";
  parsedTableData.data.forEach((row) => {
    tableHtml +=
      "<tr>" +
      parsedTableData.schema.fields
        .map((col) => `<td>${row[col.name]}</td>`)
        .join("") +
      "</tr>";
  });

  tableHtml += "</tbody></table>";
  tableContainer.innerHTML = tableHtml;
}

// Handle column click
function handleColumnClick(
  event,
  userQuery,
  columnName,
  metadataInfo,
  sqlQuery
) {
  event.preventDefault();

  try {
    metadataInfo = JSON.parse(decodeURIComponent(metadataInfo));
  } catch (err) {
    console.error("Error parsing metadataInfo:", err);
    return;
  }

  const options = getDrillOptions(columnName, metadataInfo);
  if (!options.length) {
    console.warn("No drill options available for column:", columnName);
    return;
  }

  createPopup(
    event.pageX,
    event.pageY,
    userQuery,
    columnName,
    sqlQuery,
    options
  );
}

// Create popup
// todo: make the popup div rounded corner
function createPopup(x, y, userQuery, columnName, sqlQuery, options) {
  closeExistingPopup();

  const popup = document.createElement("div");
  popup.className = "popup";
  popup.style.cssText = `
    position: absolute; top: ${y}px; left: ${x}px; padding: 10px;
    background: #fff; border: 1px solid #ccc; box-shadow: 0px 4px 6px rgba(0,0,0,0.1);
    z-index: 1000; width: 200px; display: flex; flex-direction: column;
    border-radius: 8px;
  `;

  const closeButton = document.createElement("button");
  closeButton.textContent = "X";
  closeButton.style.cssText = `
    align-self: flex-end; margin-bottom: 5px; border: none; background: transparent; cursor: pointer;
  `;
  closeButton.onclick = () => popup.remove();

  popup.appendChild(closeButton);

  options.forEach((option) => {
    const button = document.createElement("button");
    button.textContent = option;
    button.style.marginTop = "5px"; // Ensure space between buttons
    button.onclick = async () => {
      drilledTableVisualizer(
        userQuery,
        option,
        columnName,
        decodeURIComponent(sqlQuery)
      );
      popup.remove();
    };
    popup.appendChild(button);
  });

  document.body.appendChild(popup);

  const outsideClickHandler = (e) => {
    if (!popup.contains(e.target)) {
      popup.remove();
      document.removeEventListener("click", outsideClickHandler);
    }
  };

  setTimeout(() => {
    document.addEventListener("click", outsideClickHandler);
  }, 0);
}

// Check if column is drillable
function checkIfColumnIsDrillable(columnName, metadataInfo) {
  if (!metadataInfo) return false;
  return Object.values(metadataInfo).some((group) =>
    group.some((col) => col.column_name === columnName)
  );
}

// Get drill options
function getDrillOptions(columnName, metadataInfo) {
  const column = Object.values(metadataInfo)
    .flat()
    .find((col) => col.column_name === columnName);

  return column
    ? column.drill_across
      ? ["Drill Down", "Drill Across"]
      : ["Drill Down"]
    : [];
}

// Visualize drilled table
async function drilledTableVisualizer(
  userQuery,
  buttonName,
  columnName,
  sqlQuery
) {
  const jsonData = await fetchDrilledData(
    userQuery,
    buttonName,
    columnName,
    sqlQuery
  );
  visualizeTable(jsonData);
}

// Fetch drilled data
async function fetchDrilledData(userQuery, buttonName, columnName, sqlQuery) {
  console.log("drill across: ", buttonName === "Drill Across");
  showLoadingIndicator();
  try {
    const response = await fetch("http://127.0.0.1:8000/perform-drilling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_query: userQuery,
        sql_query: sqlQuery,
        drilling_metadata: {
          column_name: columnName,
          column_value: "", // Future functionality for row-specific drilling
          drill_across: buttonName === "Drill Across",
        },
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching drilled data:", error);
    throw error;
  } finally {
    hideLoadingIndicator();
  }
}
